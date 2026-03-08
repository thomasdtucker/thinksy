import fs from "fs";
import path from "path";
import { loadRootEnv } from "@/lib/server/loadRootEnv";

export interface PipelineConfig {
  anthropic_api_key: string;
  heygen_api_key: string;
  heygen_avatar_id: string;
  heygen_avatar_look_ids: string;
  heygen_avatar_group_id: string;
  heygen_voice_id: string;
  heygen_video_width: number;
  heygen_video_height: number;
  heygen_avatar_scale: number;
  heygen_video_mode: string;
  instagram_user_id: string;
  instagram_access_token: string;
  graph_api_version: string;
  youtube_client_id: string;
  youtube_client_secret: string;
  youtube_refresh_token: string;
  db_path: string;
  approval_mode: string;
  public_video_host: string;
  video_storage_dir: string;
  avatar_storage_dir: string;
  google_indexing_key_path: string;
  avatar_look_id_list: () => string[];
  anthropicApiKey: string;
  heygenApiKey: string;
  heygenAvatarId: string;
  heygenAvatarLookIds: string;
  heygenAvatarGroupId: string;
  heygenVoiceId: string;
  heygenVideoWidth: number;
  heygenVideoHeight: number;
  heygenAvatarScale: number;
  heygenVideoMode: string;
  instagramUserId: string;
  instagramAccessToken: string;
  graphApiVersion: string;
  youtubeClientId: string;
  youtubeClientSecret: string;
  youtubeRefreshToken: string;
  dbPath: string;
  approvalMode: string;
  publicVideoHost: string;
  videoStorageDir: string;
  avatarStorageDir: string;
  googleIndexingKeyPath: string;
  avatarLookIdList: () => string[];
}

let cachedConfig: PipelineConfig | null = null;

function parseIntEnv(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseFloatEnv(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function resolvePath(pathValue: string): string {
  if (path.isAbsolute(pathValue)) return pathValue;

  const fromCwd = path.resolve(process.cwd(), pathValue);
  const fromRepoRoot = path.resolve(process.cwd(), "..", pathValue);
  if (fs.existsSync(fromCwd)) return fromCwd;
  if (fs.existsSync(fromRepoRoot)) return fromRepoRoot;

  return fromRepoRoot;
}

function resolveOptionalPath(pathValue: string): string {
  if (!pathValue) return "";
  return resolvePath(pathValue);
}

export function getConfig(): PipelineConfig {
  if (cachedConfig) return cachedConfig;

  loadRootEnv();

  const config: PipelineConfig = {
    anthropic_api_key: process.env.ANTHROPIC_API_KEY || "",
    heygen_api_key: process.env.HEYGEN_API_KEY || "",
    heygen_avatar_id: process.env.HEYGEN_AVATAR_ID || "",
    heygen_avatar_look_ids: process.env.HEYGEN_AVATAR_LOOK_IDS || "",
    heygen_avatar_group_id: process.env.HEYGEN_AVATAR_GROUP_ID || "",
    heygen_voice_id: process.env.HEYGEN_VOICE_ID || "",
    heygen_video_width: parseIntEnv(process.env.HEYGEN_VIDEO_WIDTH, 0),
    heygen_video_height: parseIntEnv(process.env.HEYGEN_VIDEO_HEIGHT, 0),
    heygen_avatar_scale: parseFloatEnv(process.env.HEYGEN_AVATAR_SCALE, 1.0),
    heygen_video_mode: process.env.HEYGEN_VIDEO_MODE || "agent",
    instagram_user_id: process.env.INSTAGRAM_USER_ID || "",
    instagram_access_token: process.env.INSTAGRAM_ACCESS_TOKEN || "",
    graph_api_version: process.env.GRAPH_API_VERSION || "v25.0",
    youtube_client_id: process.env.YOUTUBE_CLIENT_ID || "",
    youtube_client_secret: process.env.YOUTUBE_CLIENT_SECRET || "",
    youtube_refresh_token: process.env.YOUTUBE_REFRESH_TOKEN || "",
    db_path: resolvePath(process.env.DB_PATH || "./data/thinksy.db"),
    approval_mode: process.env.APPROVAL_MODE || "human",
    public_video_host: process.env.PUBLIC_VIDEO_HOST || "https://thinksy.us",
    video_storage_dir: resolvePath(process.env.VIDEO_STORAGE_DIR || "./data/videos"),
    avatar_storage_dir: resolvePath(process.env.AVATAR_STORAGE_DIR || "./data/avatars"),
    google_indexing_key_path: resolveOptionalPath(process.env.GOOGLE_INDEXING_KEY_PATH || ""),
    avatar_look_id_list: () => {
      const ids = config.heygen_avatar_look_ids
        .split(",")
        .map((id) => id.trim())
        .filter((id) => id.length > 0);
      if (ids.length > 0) return ids;
      return config.heygen_avatar_id ? [config.heygen_avatar_id] : [];
    },
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || "",
    heygenApiKey: process.env.HEYGEN_API_KEY || "",
    heygenAvatarId: process.env.HEYGEN_AVATAR_ID || "",
    heygenAvatarLookIds: process.env.HEYGEN_AVATAR_LOOK_IDS || "",
    heygenAvatarGroupId: process.env.HEYGEN_AVATAR_GROUP_ID || "",
    heygenVoiceId: process.env.HEYGEN_VOICE_ID || "",
    heygenVideoWidth: parseIntEnv(process.env.HEYGEN_VIDEO_WIDTH, 0),
    heygenVideoHeight: parseIntEnv(process.env.HEYGEN_VIDEO_HEIGHT, 0),
    heygenAvatarScale: parseFloatEnv(process.env.HEYGEN_AVATAR_SCALE, 1.0),
    heygenVideoMode: process.env.HEYGEN_VIDEO_MODE || "agent",
    instagramUserId: process.env.INSTAGRAM_USER_ID || "",
    instagramAccessToken: process.env.INSTAGRAM_ACCESS_TOKEN || "",
    graphApiVersion: process.env.GRAPH_API_VERSION || "v25.0",
    youtubeClientId: process.env.YOUTUBE_CLIENT_ID || "",
    youtubeClientSecret: process.env.YOUTUBE_CLIENT_SECRET || "",
    youtubeRefreshToken: process.env.YOUTUBE_REFRESH_TOKEN || "",
    dbPath: resolvePath(process.env.DB_PATH || "./data/thinksy.db"),
    approvalMode: process.env.APPROVAL_MODE || "human",
    publicVideoHost: process.env.PUBLIC_VIDEO_HOST || "https://thinksy.us",
    videoStorageDir: resolvePath(process.env.VIDEO_STORAGE_DIR || "./data/videos"),
    avatarStorageDir: resolvePath(process.env.AVATAR_STORAGE_DIR || "./data/avatars"),
    googleIndexingKeyPath: resolveOptionalPath(process.env.GOOGLE_INDEXING_KEY_PATH || ""),
    avatarLookIdList: () => {
      const ids = config.heygenAvatarLookIds
        .split(",")
        .map((id) => id.trim())
        .filter((id) => id.length > 0);
      if (ids.length > 0) return ids;
      return config.heygenAvatarId ? [config.heygenAvatarId] : [];
    },
  };

  cachedConfig = config;
  return config;
}

export function ensureConfigDirs(config: PipelineConfig = getConfig()): void {
  fs.mkdirSync(path.dirname(config.db_path), { recursive: true });
  fs.mkdirSync(config.video_storage_dir, { recursive: true });
  fs.mkdirSync(config.avatar_storage_dir, { recursive: true });
}
