export const ContentStatus = {
  IDEA: "idea",
  SCRIPT_DRAFT: "script_draft",
  SCRIPT_APPROVED: "script_approved",
  VIDEO_GENERATING: "video_generating",
  VIDEO_READY: "video_ready",
  VIDEO_APPROVED: "video_approved",
  POSTING: "posting",
  POSTED_INSTAGRAM: "posted_instagram",
  POSTED_YOUTUBE: "posted_youtube",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;

export type ContentStatus = (typeof ContentStatus)[keyof typeof ContentStatus];

export const SoftwareCategory = {
  HR: "hr",
  ACCOUNTING: "accounting",
  PROJECT_MANAGEMENT: "project_management",
} as const;

export type SoftwareCategory = (typeof SoftwareCategory)[keyof typeof SoftwareCategory];

export const Scene = {
  HOME_OFFICE: "home_office",
  NEIGHBORHOOD_WALK: "neighborhood_walk",
  LIVING_ROOM: "living_room",
  KITCHEN_MORNING: "kitchen_morning",
  BACKYARD_GARDEN: "backyard_garden",
  COFFEE_SHOP: "coffee_shop",
} as const;

export type Scene = (typeof Scene)[keyof typeof Scene];

export interface ContentItem {
  id?: number;
  category: SoftwareCategory;
  scene?: string | null;
  outfit?: string | null;
  script_type?: string | null;
  scriptType?: string | null;
  hook: string;
  script: string;
  cta: string;
  visual_direction: string;
  visualDirection?: string;
  target_url: string;
  targetUrl?: string;
  status: ContentStatus;
  created_at: string;
  createdAt?: string;
  approved_at?: string | null;
  approvedAt?: string | null;
  approved_by?: string | null;
  approvedBy?: string | null;
}

export interface Video {
  id?: number;
  content_id: number;
  contentId?: number;
  heygen_video_id?: string | null;
  heygenVideoId?: string | null;
  video_path?: string | null;
  videoPath?: string | null;
  thumbnail_path?: string | null;
  thumbnailPath?: string | null;
  duration_seconds: number;
  durationSeconds?: number;
  s3_url?: string | null;
  s3Url?: string | null;
  status: ContentStatus;
  created_at: string;
  createdAt?: string;
}

export interface InstagramPost {
  id?: number;
  video_id: number;
  videoId?: number;
  instagram_media_id?: string | null;
  instagramMediaId?: string | null;
  caption: string;
  hashtags: string[];
  posted_at?: string | null;
  postedAt?: string | Date | null;
  permalink?: string | null;
}

export interface YouTubeUpload {
  id?: number;
  video_id: number;
  videoId?: number;
  youtube_video_id?: string | null;
  youtubeVideoId?: string | null;
  title: string;
  description: string;
  tags: string[];
  posted_at?: string | null;
  postedAt?: string | Date | null;
}
