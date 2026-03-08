import type { MetadataRoute } from "next";
import { getAllGeoPages, getVideos } from "@/lib/db";

export const dynamic = "force-dynamic";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.SITE_URL || "https://thinksy.ai";

  let videoEntries: MetadataRoute.Sitemap = [];
  let geoEntries: MetadataRoute.Sitemap = [];

  try {
    const videos = getVideos();
    videoEntries = videos.map((v) => ({
      url: `${baseUrl}/videos/${v.id}`,
      lastModified: new Date(v.created_at),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    }));

    const geoPages = getAllGeoPages();
    geoEntries = geoPages.map((p) => ({
      url: `${baseUrl}/${p.slug}`,
      lastModified: new Date(p.created_at),
      changeFrequency: "weekly" as const,
      priority: 0.9,
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
    ...geoEntries,
    ...videoEntries,
  ];
}
