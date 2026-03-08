import { spawn } from "child_process";
import path from "path";
import {
  appendJobLog,
  JobRecord,
  newJobId,
  readJob,
  writeJob,
} from "./jobStore";
import { loadRootEnv } from "./loadRootEnv";

function repoRoot(): string {
  return path.join(process.cwd(), "..");
}

function getPython(): string {
  return process.env.THINKSY_PYTHON || "python3";
}

function toCliArgs(type: string, args: Record<string, unknown>): string[] {
  if (type === "scripts_generate") {
    const instruction = String(args.instruction || "");
    const count = Number(args.count || 3);
    const category = args.category ? String(args.category) : "";
    const out: string[] = ["-m", "pipeline.cli", "scripts", instruction, "--count", String(count)];
    if (category) out.push("--category", category);
    return out;
  }

  if (type === "videos_produce") {
    const limit = args.limit == null ? null : Number(args.limit);
    const mode = args.mode ? String(args.mode) : "";
    const out: string[] = ["-m", "pipeline.cli", "produce", "--no-review", "--skip-post"];
    if (limit != null && Number.isFinite(limit)) out.push("--limit", String(limit));
    if (mode) out.push("--mode", mode);
    return out;
  }

  if (type === "post") {
    const platform = args.platform ? String(args.platform) : "both";
    const limit = args.limit == null ? null : Number(args.limit);
    const out: string[] = ["-m", "pipeline.cli", "post", "--platform", platform];
    if (limit != null && Number.isFinite(limit)) out.push("--limit", String(limit));
    return out;
  }

  if (type === "seo_update") {
    return ["-m", "pipeline.cli", "seo-update"];
  }

  if (type === "geo") {
    const category = args.category ? String(args.category) : "";
    const cities = args.cities == null ? null : Number(args.cities);
    const out: string[] = ["-m", "pipeline.cli", "geo"];
    if (category) out.push("--category", category);
    if (cities != null && Number.isFinite(cities)) out.push("--cities", String(cities));
    return out;
  }

  throw new Error(`Unknown job type: ${type}`);
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

  const cliArgs = toCliArgs(type, args);
  const proc = spawn(getPython(), cliArgs, {
    cwd: repoRoot(),
    env: process.env,
  });

  const startedAt = new Date().toISOString();
  await writeJob({ ...record, status: "running", startedAt });

  proc.stdout.on("data", async (d) => {
    await appendJobLog(id, d.toString("utf8"));
  });
  proc.stderr.on("data", async (d) => {
    await appendJobLog(id, d.toString("utf8"));
  });

  proc.on("close", async (code) => {
    const current = (await readJob(id)) || record;
    const finishedAt = new Date().toISOString();
    const next: JobRecord = {
      ...current,
      status: code === 0 ? "success" : "error",
      finishedAt,
      exitCode: code == null ? undefined : code,
    };
    await writeJob(next);
  });

  return { ...record, status: "running", startedAt };
}
