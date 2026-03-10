export interface VideoItem {
  id: number;
  content_id: number;
  video_path: string | null;
  thumbnail_path: string | null;
  duration_seconds: number;
  created_at: string;
  hook: string;
  script: string;
  cta: string;
  category: "hr" | "accounting" | "project_management";
  youtube_video_id: string | null;
  title: string | null;
  yt_description: string | null;
  instagram_media_id: string | null;
  instagram_permalink: string | null;
  seo_title: string | null;
  seo_description: string | null;
  og_title: string | null;
  og_description: string | null;
}

export const CATEGORY_LABELS: Record<string, string> = {
  hr: "HR Software",
  accounting: "Accounting Software",
  project_management: "Project Management",
};
