import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { isAllowed } from "../../_auth";
import { getConfig } from "@/lib/server/pipeline/config";
import { Database } from "@/lib/server/pipeline/db";
import { ContentStatus, type Video } from "@/lib/server/pipeline/models";
import { isS3Configured, uploadVideoToS3 } from "@/lib/server/pipeline/s3";

export const runtime = "nodejs";

function resolveVideoStorageDir(): string {
  const config = getConfig();
  const dir = config.video_storage_dir;
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

async function downloadFile(url: string, dest: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Download failed (${response.status}) for ${url}`);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(dest, bytes);
}

export async function POST(req: Request) {
  if (!isAllowed(req)) return new Response("Unauthorized", { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    contentId?: unknown;
    heygenVideoId?: unknown;
    localPath?: unknown;
  } | null;

  if (!body || typeof body.contentId !== "number") {
    return NextResponse.json({ error: "contentId (number) is required" }, { status: 400 });
  }

  const contentId = body.contentId;
  const heygenVideoId = typeof body.heygenVideoId === "string" ? body.heygenVideoId.trim() : "";
  const localPath = typeof body.localPath === "string" ? body.localPath.trim() : "";

  if (!heygenVideoId && !localPath) {
    return NextResponse.json(
      { error: "Provide either heygenVideoId or localPath" },
      { status: 400 },
    );
  }

  const config = getConfig();
  const db = new Database(config.db_path);

  try {
    // Verify content item exists
    const content = db.get_content_item(contentId);
    if (!content) {
      return NextResponse.json({ error: `Content item #${contentId} not found` }, { status: 404 });
    }

    const storageDir = resolveVideoStorageDir();
    let videoPath: string;
    let thumbnailPath: string | null = null;
    let resolvedHeygenId: string | null = null;

    if (heygenVideoId) {

      // Poll HeyGen until video is completed (or fail on terminal/draft states)
      const heygenHeaders = { "X-Api-Key": config.heygen_api_key, "Content-Type": "application/json" };
      const maxPollMs = 10 * 60 * 1000; // 10 minutes
      const pollInterval = 10_000; // 10 seconds
      const startedAt = Date.now();
      let videoUrl: string | undefined;
      let thumbUrl: string | undefined;

      while (true) {
        const statusResp = await fetch(
          `https://api.heygen.com/v1/video_status.get?video_id=${encodeURIComponent(heygenVideoId)}`,
          { headers: heygenHeaders },
        );

        if (!statusResp.ok) {
          const detail = await statusResp.text().catch(() => "");
          return NextResponse.json(
            { error: `HeyGen status check failed (${statusResp.status}): ${detail}` },
            { status: 502 },
          );
        }

        const statusBody = (await statusResp.json()) as Record<string, unknown>;
        const data = statusBody.data as Record<string, unknown> | undefined;
        const heygenStatus = (data?.status as string) ?? "unknown";

        if (heygenStatus === "completed") {
          videoUrl = data?.video_url as string | undefined;
          thumbUrl = data?.thumbnail_url as string | undefined;
          break;
        }

        if (heygenStatus === "draft") {
          return NextResponse.json(
            { error: "This video is still a draft in HeyGen. Open it in the HeyGen editor and click Generate/Export to render it, then try importing again." },
            { status: 400 },
          );
        }

        if (heygenStatus === "failed") {
          const errMsg = (data?.error as Record<string, unknown>)?.message ?? "Unknown error";
          return NextResponse.json(
            { error: `HeyGen video generation failed: ${errMsg}` },
            { status: 400 },
          );
        }

        // Still processing — poll if within timeout
        if (Date.now() - startedAt > maxPollMs) {
          return NextResponse.json(
            { error: `HeyGen video still ${heygenStatus} after 10 minutes. Try again later.` },
            { status: 408 },
          );
        }

        await new Promise((r) => setTimeout(r, pollInterval));
      }

      if (!videoUrl) {
        return NextResponse.json({ error: "HeyGen video completed but has no video_url" }, { status: 502 });
      }

      const filename = `content_${contentId}.mp4`;
      videoPath = path.join(storageDir, filename);
      await downloadFile(videoUrl, videoPath);

      if (thumbUrl) {
        const thumbFilename = `content_${contentId}_thumb.jpg`;
        thumbnailPath = path.join(storageDir, thumbFilename);
        await downloadFile(thumbUrl, thumbnailPath);
      }

      resolvedHeygenId = heygenVideoId;
    } else {
      // Local file — resolve path relative to repo root
      const repoRoot = path.join(process.cwd(), "..");
      const resolved = path.isAbsolute(localPath)
        ? localPath
        : path.resolve(repoRoot, localPath);

      if (!fs.existsSync(resolved)) {
        return NextResponse.json({ error: `File not found: ${resolved}` }, { status: 400 });
      }

      // Copy to standard location
      const filename = `content_${contentId}.mp4`;
      videoPath = path.join(storageDir, filename);
      if (resolved !== videoPath) {
        fs.copyFileSync(resolved, videoPath);
      }
    }
    // Upload to S3 if configured
    let s3Url: string | null = null;
    if (isS3Configured(config)) {
      s3Url = await uploadVideoToS3(config, videoPath, `content_${contentId}.mp4`);
      if (thumbnailPath) {
        await uploadVideoToS3(config, thumbnailPath, `content_${contentId}_thumb.jpg`);
      }
    }

    const video: Video = {
      content_id: contentId,
      heygen_video_id: resolvedHeygenId,
      video_path: videoPath,
      thumbnail_path: thumbnailPath,
      s3_url: s3Url,
      duration_seconds: 5,
      status: ContentStatus.VIDEO_READY,
      created_at: new Date().toISOString(),
    };

    const videoId = db.insert_video(video);
    db.update_content_status(contentId, ContentStatus.VIDEO_READY);
    db.log_action(contentId, "AdminImport", "video_imported", {
      videoId,
      source: heygenVideoId ? "heygen" : "local",
      heygenVideoId: resolvedHeygenId,
      localPath: localPath || null,
    });

    return NextResponse.json({ ok: true, videoId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  } finally {
    db.close();
  }
}
