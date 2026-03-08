import { NextResponse } from "next/server";
import { isAllowed } from "../../_auth";
import {
  setContentStatus,
  setVideoStatus,
  type ContentStatus,
} from "@/lib/server/adminDb";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAllowed(req)) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const videoId = Number(id);
  if (!Number.isFinite(videoId)) return new Response("Invalid id", { status: 400 });

  const body = (await req.json().catch(() => null)) as
    | { action?: unknown; status?: unknown; contentId?: unknown }
    | null;
  if (!body || typeof body.action !== "string") {
    return new Response("Invalid request", { status: 400 });
  }

  if (body.action === "set_status") {
    if (typeof body.status !== "string") return new Response("Invalid status", { status: 400 });
    const status = body.status as ContentStatus;
    const allowed: ReadonlySet<ContentStatus> = new Set([
      "video_ready",
      "video_approved",
      "failed",
    ]);
    if (!allowed.has(status)) return new Response("Invalid status", { status: 400 });
    setVideoStatus(videoId, status);

    const contentId = typeof body.contentId === "number" ? body.contentId : Number(body.contentId);
    if (Number.isFinite(contentId)) {
      const contentStatus: ContentStatus = status;
      setContentStatus(contentId, contentStatus, "web");
    }

    return NextResponse.json({ ok: true });
  }

  return new Response("Unknown action", { status: 400 });
}
