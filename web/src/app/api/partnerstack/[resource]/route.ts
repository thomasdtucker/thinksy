import { NextResponse } from "next/server";
import { loadRootEnv } from "@/lib/server/loadRootEnv";

export const runtime = "nodejs";

const ALLOWED_RESOURCES = new Set(["actions", "transactions", "rewards"]);

export async function GET(
  req: Request,
  { params }: { params: Promise<{ resource: string }> }
) {
  loadRootEnv();
  const { resource } = await params;
  if (!ALLOWED_RESOURCES.has(resource)) {
    return new Response("Not found", { status: 404 });
  }

  const pub = process.env.PARTNERSTACK_PUBLIC_KEY;
  const sec = process.env.PARTNERSTACK_SECRET_KEY;
  if (!pub || !sec) {
    return NextResponse.json(
      { error: "PARTNERSTACK_PUBLIC_KEY / PARTNERSTACK_SECRET_KEY not configured" },
      { status: 400 }
    );
  }

  const upstream = new URL(`https://api.partnerstack.com/api/v2/${resource}`);
  const inUrl = new URL(req.url);
  inUrl.searchParams.forEach((v, k) => upstream.searchParams.set(k, v));

  const auth = Buffer.from(`${pub}:${sec}`).toString("base64");
  const resp = await fetch(upstream.toString(), {
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  const json = await resp.json().catch(() => ({ error: "Invalid JSON" }));
  return NextResponse.json(json, { status: resp.status });
}
