import { NextResponse } from "next/server";
import { isAllowed } from "../../_auth";
import { listInstagramPosts } from "@/lib/server/adminDb";

export const runtime = "nodejs";

export async function GET(req: Request) {
  if (!isAllowed(req)) return new Response("Unauthorized", { status: 401 });
  try {
    const posts = listInstagramPosts();
    return NextResponse.json({ posts });
  } catch {
    return NextResponse.json({ posts: [] });
  }
}
