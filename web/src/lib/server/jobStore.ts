import fs from "fs";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";

export type JobStatus = "queued" | "running" | "success" | "error";

export interface JobRecord {
  id: string;
  type: string;
  args: Record<string, unknown>;
  status: JobStatus;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  exitCode?: number;
  error?: string;
}

function getJobsDir(): string {
  return process.env.THINKSY_JOBS_DIR || path.join(process.cwd(), "..", "data", "jobs");
}

export async function ensureJobsDir(): Promise<string> {
  const dir = getJobsDir();
  await mkdir(dir, { recursive: true });
  return dir;
}

export function newJobId(): string {
  return crypto.randomBytes(16).toString("hex");
}

function jobJsonPath(id: string): string {
  return path.join(getJobsDir(), `${id}.json`);
}

export function jobLogPath(id: string): string {
  return path.join(getJobsDir(), `${id}.log`);
}

export async function writeJob(record: JobRecord): Promise<void> {
  await ensureJobsDir();
  await writeFile(jobJsonPath(record.id), JSON.stringify(record, null, 2), "utf8");
}

export async function readJob(id: string): Promise<JobRecord | null> {
  try {
    const txt = await readFile(jobJsonPath(id), "utf8");
    return JSON.parse(txt) as JobRecord;
  } catch {
    return null;
  }
}

export async function appendJobLog(id: string, chunk: string): Promise<void> {
  await ensureJobsDir();
  fs.appendFileSync(jobLogPath(id), chunk);
}

export async function readJobLogTail(id: string, maxBytes: number = 64_000): Promise<string> {
  try {
    const buf = await readFile(jobLogPath(id));
    if (buf.byteLength <= maxBytes) return buf.toString("utf8");
    return buf.subarray(buf.byteLength - maxBytes).toString("utf8");
  } catch {
    return "";
  }
}
