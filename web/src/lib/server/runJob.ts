import { getConfig } from "./pipeline/config";
import { Database } from "./pipeline/db";
import { exportSiteData } from "./pipeline/export";
import { Orchestrator } from "./pipeline/orchestrator";
import { SoftwareCategory } from "./pipeline/models";
import {
  appendJobLog,
  JobRecord,
  newJobId,
  readJob,
  writeJob,
} from "./jobStore";
import { loadRootEnv } from "./loadRootEnv";

function parseCount(value: unknown, fallback: number): number {
  if (typeof value !== "number") {
    return fallback;
  }
  return Number.isFinite(value) ? value : fallback;
}

function parseOptionalCount(value: unknown): number | undefined {
  if (typeof value !== "number") {
    return undefined;
  }
  return Number.isFinite(value) ? value : undefined;
}

function parsePlatform(value: unknown): "both" | "instagram" | "youtube" {
  if (value === "instagram" || value === "youtube" || value === "both") {
    return value;
  }
  return "both";
}

function parseCategory(value: unknown): SoftwareCategory | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  const categories = Object.values(SoftwareCategory);
  if (categories.includes(normalized as SoftwareCategory)) {
    return normalized as SoftwareCategory;
  }
  return undefined;
}

function formatLogChunk(args: unknown[]): string {
  return args
    .map((arg) => {
      if (typeof arg === "string") return arg;
      if (arg instanceof Error) return arg.stack || arg.message;
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    })
    .join(" ");
}

export async function startJob(type: string, args: Record<string, unknown>): Promise<JobRecord> {
  loadRootEnv();
  const id = newJobId();
  const record: JobRecord = {
    id,
    type,
    args,
    status: "queued",
    createdAt: new Date().toISOString(),
  };
  await writeJob(record);

  const startedAt = new Date().toISOString();
  await writeJob({ ...record, status: "running", startedAt });

  runJobAsync(id, type, args).catch(() => {});

  return { ...record, status: "running", startedAt };
}

async function runJobAsync(id: string, type: string, args: Record<string, unknown>): Promise<void> {
  const log = async (msg: string) => appendJobLog(id, `${msg}\n`);
  const baseLog = console.log;
  const baseError = console.error;

  console.log = (...logArgs: unknown[]) => {
    void appendJobLog(id, `${formatLogChunk(logArgs)}\n`);
    baseLog(...logArgs);
  };
  console.error = (...logArgs: unknown[]) => {
    void appendJobLog(id, `${formatLogChunk(logArgs)}\n`);
    baseError(...logArgs);
  };

  const config = getConfig();
  const db = new Database(config.db_path);
  const orchestrator = new Orchestrator(config, db);

  try {
    switch (type) {
      case "scripts_generate": {
        const instruction = String(args.instruction ?? "").trim();
        const count = parseCount(args.count, 3);
        const category = parseCategory(args.category);
        await log(`Starting scripts generation (count=${count}${category ? `, category=${category}` : ""})`);
        await orchestrator.generateScripts(instruction, count, category);
        await log("Finished scripts generation");
        break;
      }

      case "videos_produce": {
        const limit = parseOptionalCount(args.limit);
        await log(`Starting video production${typeof limit === "number" ? ` (limit=${limit})` : ""}`);
        await orchestrator.produceVideos(limit);
        await log("Finished video production");
        break;
      }

      case "post": {
        const platform = parsePlatform(args.platform);
        const limit = parseOptionalCount(args.limit);
        await log(`Starting posting (platform=${platform}${typeof limit === "number" ? `, limit=${limit}` : ""})`);
        await orchestrator.postApprovedVideos(platform, limit);
        await log("Finished posting");
        break;
      }

      case "seo_update": {
        await log("Starting SEO update");
        await orchestrator.seoUpdate();
        await log("Finished SEO update");
        break;
      }

      case "export": {
        await log("Starting site data export");
        const counts = exportSiteData(db);
        await log(`Exported site data (${counts.videos} videos, ${counts.geoPages} geo pages)`);
        break;
      }

      case "geo": {
        const category = parseCategory(args.category);
        const cities = parseCount(args.cities, 20);
        await log(`Starting geo page generation (cities=${cities}${category ? `, category=${category}` : ""})`);
        await orchestrator.generateGeoPages(category, cities);
        await log("Finished geo page generation");
        break;
      }

      default:
        throw new Error(`Unknown job type: ${type}`);
    }

    const current = (await readJob(id))!;
    await writeJob({
      ...current,
      status: "success",
      finishedAt: new Date().toISOString(),
      exitCode: 0,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await log(`Error: ${msg}`);
    const current = (await readJob(id))!;
    await writeJob({
      ...current,
      status: "error",
      finishedAt: new Date().toISOString(),
      exitCode: 1,
      error: msg,
    });
  } finally {
    db.close();
    console.log = baseLog;
    console.error = baseError;
  }
}
