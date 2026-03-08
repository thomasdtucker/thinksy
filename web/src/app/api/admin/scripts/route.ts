import { NextResponse } from "next/server";
import { isAllowed } from "../_auth";
import { listScripts, type ContentStatus } from "@/lib/server/adminDb";

export const runtime = "nodejs";

export async function GET(req: Request) {
  if (!isAllowed(req)) return new Response("Unauthorized", { status: 401 });

  const url = new URL(req.url);
  const statusParam = url.searchParams.get("status");
  const allowed: ReadonlySet<ContentStatus> = new Set([
    "idea",
    "script_draft",
    "script_approved",
    "video_generating",
    "video_ready",
    "video_approved",
    "posting",
    "posted_instagram",
    "posted_youtube",
    "completed",
    "failed",
  ]);
  const status =
    statusParam && allowed.has(statusParam as ContentStatus)
      ? (statusParam as ContentStatus)
      : undefined;
  try {
    const scripts = listScripts(status);
    return NextResponse.json({ scripts });
  } catch {
    return NextResponse.json({ scripts: [] });
  }
}
