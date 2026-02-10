import type { MetadataRoute } from "next";

export const dynamic = "force-dynamic";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.SITE_URL || "https://thinksy.ai";

  let videoEntries: MetadataRoute.Sitemap = [];
  try {
    const { getVideos } = require("@/lib/db");
    const videos = getVideos();
    videoEntries = videos.map((v: { id: number; created_at: string }) => ({
      url: `${baseUrl}/videos/${v.id}`,
      lastModified: new Date(v.created_at),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    }));
  } catch {
    // DB might not exist yet
  }

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    ...videoEntries,
  ];
}
