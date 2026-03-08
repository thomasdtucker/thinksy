import videosData from "@/data/videos.json";
import geoPagesData from "@/data/geo-pages.json";
import type { VideoItem } from "./types";

export interface GeoPage {
  id: number;
  slug: string;
  category: string;
  city: string;
  state: string;
  h1: string;
  meta_title: string;
  meta_description: string;
  intro: string;
  benefits: { title: string; description: string }[];
  cta_text: string;
  local_stat: string;
  created_at: string;
}

const videos = videosData as VideoItem[];
const geoPages = geoPagesData as GeoPage[];

export function getVideos(): VideoItem[] {
  return videos;
}

export function getVideoBySlug(slug: string): VideoItem | undefined {
  const id = Number.parseInt(slug, 10);
  if (Number.isNaN(id)) return undefined;
  return videos.find((video) => video.id === id);
}

export function getGeoPage(slug: string): GeoPage | undefined {
  return geoPages.find((page) => page.slug === slug);
}

export function getAllGeoPages(): GeoPage[] {
  return geoPages;
}

export function getVideosByCategory(category: string): VideoItem[] {
  return videos.filter((video) => video.category === category);
}
