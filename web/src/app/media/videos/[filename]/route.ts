import fs from "fs";
import { stat } from "fs/promises";
import path from "path";
import { Readable } from "stream";
import { NextRequest } from "next/server";
import { loadRootEnv } from "@/lib/server/loadRootEnv";

export const runtime = "nodejs";

function getVideosDir(): string {
  const envDir = process.env.VIDEO_STORAGE_DIR;
  if (!envDir) return path.join(process.cwd(), "..", "data", "videos");
  if (path.isAbsolute(envDir)) return envDir;
  return path.resolve(process.cwd(), "..", envDir);
}

function isSafeVideoFilename(filename: string): boolean {
  return /^content_\d+\.mp4$/.test(filename);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  loadRootEnv();
  const { filename } = await params;

  if (!isSafeVideoFilename(filename)) {
    return new Response("Not found", { status: 404 });
  }

  const filePath = path.join(getVideosDir(), filename);

  let size: number;
  try {
    size = (await stat(filePath)).size;
  } catch {
    return new Response("Not found", { status: 404 });
  }

  const range = req.headers.get("range");
  if (!range) {
    const stream = fs.createReadStream(filePath);
    return new Response(Readable.toWeb(stream) as ReadableStream, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": String(size),
        "Accept-Ranges": "bytes",
      },
    });
  }

  const m = /^bytes=(\d+)-(\d*)$/.exec(range);
  if (!m) {
    return new Response("Invalid range", { status: 416 });
  }

  const start = Number(m[1]);
  const end = m[2] ? Number(m[2]) : size - 1;

  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || end >= size) {
    return new Response("Invalid range", { status: 416 });
  }

  const chunkSize = end - start + 1;
  const stream = fs.createReadStream(filePath, { start, end });
  return new Response(Readable.toWeb(stream) as ReadableStream, {
    status: 206,
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": String(chunkSize),
      "Accept-Ranges": "bytes",
      "Content-Range": `bytes ${start}-${end}/${size}`,
      "Cache-Control": "no-store",
    },
  });
}
