import { NextResponse } from "next/server";
import { isAllowed } from "../../_auth";
import {
  setContentStatus,
  updateScript,
  type ContentStatus,
} from "@/lib/server/adminDb";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAllowed(req)) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  const scriptId = Number(id);
  if (!Number.isFinite(scriptId)) return new Response("Invalid id", { status: 400 });

  const body = (await req.json().catch(() => null)) as
    | {
        action?: unknown;
        status?: unknown;
        approvedBy?: unknown;
        patch?: unknown;
      }
    | null;
  if (!body || typeof body.action !== "string") {
    return new Response("Invalid request", { status: 400 });
  }

  const allowedStatus: ReadonlySet<ContentStatus> = new Set([
    "idea",
    "script_draft",
    "script_approved",
    "failed",
    "video_generating",
    "video_ready",
    "video_approved",
    "posting",
    "posted_instagram",
    "posted_youtube",
    "completed",
  ]);

  if (body.action === "set_status") {
    if (typeof body.status !== "string") return new Response("Invalid status", { status: 400 });
    const status = body.status as ContentStatus;
    if (!allowedStatus.has(status)) return new Response("Invalid status", { status: 400 });
    const approvedBy = typeof body.approvedBy === "string" ? body.approvedBy : undefined;
    setContentStatus(scriptId, status, approvedBy);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "patch") {
    if (!body.patch || typeof body.patch !== "object" || Array.isArray(body.patch)) {
      return new Response("Invalid patch", { status: 400 });
    }

    const p = body.patch as Record<string, unknown>;
    const patch: {
      hook?: string;
      script?: string;
      cta?: string;
      visual_direction?: string;
      target_url?: string;
      script_type?: string | null;
    } = {};

    if (typeof p.hook === "string") patch.hook = p.hook;
    if (typeof p.script === "string") patch.script = p.script;
    if (typeof p.cta === "string") patch.cta = p.cta;
    if (typeof p.visual_direction === "string") patch.visual_direction = p.visual_direction;
    if (typeof p.target_url === "string") patch.target_url = p.target_url;
    if (typeof p.script_type === "string" || p.script_type === null) patch.script_type = p.script_type;

    updateScript(scriptId, patch);
    return NextResponse.json({ ok: true });
  }

  return new Response("Unknown action", { status: 400 });
}
