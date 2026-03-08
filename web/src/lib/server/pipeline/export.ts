import fs from "node:fs";
import path from "node:path";

import { Database } from "./db";

export function exportSiteData(db: Database): { videos: number; geoPages: number } {
  const repoRoot = path.join(process.cwd(), "..");
  const outputDir = path.join(repoRoot, "web", "src", "data");
  fs.mkdirSync(outputDir, { recursive: true });

  const videosPath = path.join(outputDir, "videos.json");
  const geoPagesPath = path.join(outputDir, "geo-pages.json");

  const rawVideos = db.get_all_posted_videos();
  const videos = rawVideos.map((video: Record<string, unknown>) => {
    const videoId = typeof video.id === "number" ? video.id : 0;
    const seo = db.get_seo_metadata(videoId);
    const getString = (key: string): string =>
      key in video && typeof video[key] === "string" ? video[key] : "";
    const getNumber = (key: string): number =>
      key in video && typeof video[key] === "number" ? video[key] : 0;

    return {
      id: videoId,
      content_id: getNumber("content_id"),
      video_path: getString("video_path") || null,
      thumbnail_path: getString("thumbnail_path") || null,
      duration_seconds: getNumber("duration_seconds"),
      created_at: getString("created_at"),
      hook: getString("hook"),
      script: getString("script"),
      cta: getString("cta"),
      category: getString("category") || null,
      youtube_video_id: getString("youtube_video_id") || null,
      title: getString("title") || null,
      yt_description: getString("yt_description") || null,
      instagram_media_id: getString("instagram_media_id") || null,
      seo_title: seo?.page_title ?? null,
      seo_description: seo?.meta_description ?? null,
      og_title: seo?.og_title ?? null,
      og_description: seo?.og_description ?? null,
    };
  });

  const geoPages = db.get_all_geo_pages();

  fs.writeFileSync(videosPath, JSON.stringify(videos, null, 2), "utf-8");
  fs.writeFileSync(geoPagesPath, JSON.stringify(geoPages, null, 2), "utf-8");

  return { videos: videos.length, geoPages: geoPages.length };
}
