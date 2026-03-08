import { NextResponse } from "next/server";
import { startJob } from "@/lib/server/runJob";
import { isAllowed } from "../admin/_auth";

export const runtime = "nodejs";

export async function POST(req: Request) {

  if (!isAllowed(req)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as
    | { type?: unknown; args?: unknown }
    | null;
  if (!body || typeof body.type !== "string") {
    return new Response("Invalid request", { status: 400 });
  }

  const args =
    body.args && typeof body.args === "object" && !Array.isArray(body.args)
      ? (body.args as Record<string, unknown>)
      : {};

  try {
    const record = await startJob(body.type, args);
    return NextResponse.json(record);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Job start failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
