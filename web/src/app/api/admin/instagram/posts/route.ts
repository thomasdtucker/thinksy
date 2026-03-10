import { NextResponse } from "next/server";
import { isAllowed } from "../../_auth";
import { listInstagramPosts, deleteInstagramPost } from "@/lib/server/adminDb";

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

export async function DELETE(req: Request) {
  if (!isAllowed(req)) return new Response("Unauthorized", { status: 401 });
  try {
    const body = await req.json();
    const { id, deleteFromInstagram } = body as {
      id: number;
      deleteFromInstagram?: boolean;
    };

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    let instagramDeleted = false;
    let instagramError: string | null = null;

    if (deleteFromInstagram) {
      // Look up the instagram_media_id from the post list
      const posts = listInstagramPosts();
      const post = posts.find((p) => p.id === id);
      const mediaId = post?.instagram_media_id;

      if (mediaId) {
        try {
          const version = process.env.GRAPH_API_VERSION || "v25.0";
          const token = process.env.INSTAGRAM_ACCESS_TOKEN;
          const res = await fetch(
            `https://graph.facebook.com/${version}/${mediaId}?access_token=${token}`,
            { method: "DELETE" }
          );
          if (res.ok) {
            instagramDeleted = true;
          } else {
            const data = await res.json();
            instagramError = data?.error?.message || `HTTP ${res.status}`;
          }
        } catch (e: unknown) {
          instagramError = e instanceof Error ? e.message : String(e);
        }
      } else {
        instagramError = "No instagram_media_id found for this post";
      }
    }

    // Always delete from DB regardless of Instagram result
    deleteInstagramPost(id);

    return NextResponse.json({
      deleted: true,
      instagramDeleted,
      instagramError,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
