import { readFile } from "fs/promises";
import path from "path";
import { loadRootEnv } from "@/lib/server/loadRootEnv";

export const runtime = "nodejs";

function getVideosDir(): string {
  const envDir = process.env.VIDEO_STORAGE_DIR;
  if (!envDir) return path.join(process.cwd(), "..", "data", "videos");
  if (path.isAbsolute(envDir)) return envDir;
  return path.resolve(process.cwd(), "..", envDir);
}

function isSafeThumbFilename(filename: string): boolean {
  return /^content_\d+_thumb\.jpg$/.test(filename);
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  loadRootEnv();
  const { filename } = await params;
  if (!isSafeThumbFilename(filename)) {
    return new Response("Not found", { status: 404 });
  }

  const filePath = path.join(getVideosDir(), filename);
  try {
    const buf = await readFile(filePath);
    return new Response(buf, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
