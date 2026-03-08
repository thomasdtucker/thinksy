import { NextResponse } from "next/server";
import { readJob, readJobLogTail } from "@/lib/server/jobStore";

export const runtime = "nodejs";

function isAllowed(req: Request): boolean {
  const token = process.env.THINKSY_ADMIN_TOKEN;
  if (!token) return true;
  return req.headers.get("x-admin-token") === token;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAllowed(req)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  const job = await readJob(id);
  if (!job) return new Response("Not found", { status: 404 });
  const logTail = await readJobLogTail(id);
  return NextResponse.json({ ...job, logTail });
}
