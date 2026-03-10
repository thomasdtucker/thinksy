import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { isAllowed } from "../_auth";
import { getCompletedVideosForSite } from "@/lib/server/adminDb";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!isAllowed(req)) return new Response("Unauthorized", { status: 401 });
  try {
    const videos = getCompletedVideosForSite();
    const dataDir = path.join(process.cwd(), "src", "data");
    const filePath = path.join(dataDir, "videos.json");

    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    fs.writeFileSync(filePath, JSON.stringify(videos, null, 2) + "\n");

    return NextResponse.json({
      synced: true,
      count: videos.length,
      path: filePath,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
