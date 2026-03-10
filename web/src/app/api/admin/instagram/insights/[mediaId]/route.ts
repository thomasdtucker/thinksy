import { NextResponse } from "next/server";
import { isAllowed } from "../../../_auth";
import { loadRootEnv } from "@/lib/server/loadRootEnv";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ mediaId: string }> }
) {
  loadRootEnv();
  if (!isAllowed(req)) return new Response("Unauthorized", { status: 401 });

  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "INSTAGRAM_ACCESS_TOKEN not configured" },
      { status: 400 }
    );
  }

  const { mediaId } = await params;
  if (!/^[0-9]+$/.test(mediaId)) {
    return new Response("Invalid media id", { status: 400 });
  }

  const url = new URL(req.url);
  const metric = url.searchParams.get("metric") || "views,reach,total_interactions";

  const apiVersion = process.env.GRAPH_API_VERSION || "v25.0";
  const insightsUrl = new URL(`https://graph.facebook.com/${apiVersion}/${mediaId}/insights`);
  insightsUrl.searchParams.set("metric", metric);
  insightsUrl.searchParams.set("access_token", token);

  const resp = await fetch(insightsUrl.toString(), { cache: "no-store" });
  const json = await resp.json().catch(() => ({ error: "Invalid response" }));
  if (!resp.ok) {
    return NextResponse.json({ error: json }, { status: resp.status });
  }

  return NextResponse.json(json);
}
