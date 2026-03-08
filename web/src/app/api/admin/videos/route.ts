import { NextResponse } from "next/server";
import { isAllowed } from "../_auth";
import { listVideos, type ContentStatus } from "@/lib/server/adminDb";

export const runtime = "nodejs";

export async function GET(req: Request) {
  if (!isAllowed(req)) return new Response("Unauthorized", { status: 401 });

  const url = new URL(req.url);
  const statusParam = url.searchParams.get("status");
  const allowed: ReadonlySet<ContentStatus> = new Set([
    "video_generating",
    "video_ready",
    "video_approved",
    "failed",
  ]);
  const status =
    statusParam && allowed.has(statusParam as ContentStatus)
      ? (statusParam as ContentStatus)
      : undefined;
  try {
    const videos = listVideos(status);
    return NextResponse.json({ videos });
  } catch {
    return NextResponse.json({ videos: [] });
  }
}
