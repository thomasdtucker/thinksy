from pathlib import Path

from pydantic_settings import BaseSettings


class Config(BaseSettings):
    anthropic_api_key: str = ""
    heygen_api_key: str = ""
    heygen_avatar_id: str = ""       # Primary avatar ID (fallback when no look IDs are set)
    heygen_avatar_look_ids: str = "" # Comma-separated avatar IDs for different outfits/looks;
                                     # create each look in HeyGen and paste its ID here.
                                     # Videos will cycle through them in order.
    heygen_avatar_group_id: str = "" # Photo avatar group ID used for still image generation
    heygen_voice_id: str = ""
    heygen_video_width: int = 0      # Output width in pixels. 0 = let HeyGen decide (default 16:9).
    heygen_video_height: int = 0     # Output height in pixels. For portrait set 1080 x 1920,
                                     # but also increase heygen_avatar_scale so the avatar
                                     # fills the frame (try 1.5–2.0).
    heygen_avatar_scale: float = 1.0 # Avatar scale within the frame. Increase when using portrait
                                     # dimensions to prevent the avatar appearing small.
    heygen_video_mode: str = "agent"  # "agent" (AI video agent v1, default) or "avatar" (structured v2)
    instagram_user_id: str = ""
    instagram_access_token: str = ""
    graph_api_version: str = "v25.0"   # Facebook Graph API version (instagram/engagement)
    youtube_client_id: str = ""
    youtube_client_secret: str = ""
    youtube_refresh_token: str = ""
    db_path: str = "./data/thinksy.db"
    approval_mode: str = "human"
    public_video_host: str = "https://thinksy.ai"
    video_storage_dir: str = "./data/videos"
    avatar_storage_dir: str = "./data/avatars"
    google_indexing_key_path: str = ""

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}

    def avatar_look_id_list(self) -> list[str]:
        """Parsed list of avatar look IDs. Falls back to heygen_avatar_id if none set."""
        ids = [i.strip() for i in self.heygen_avatar_look_ids.split(",") if i.strip()]
        return ids if ids else ([self.heygen_avatar_id] if self.heygen_avatar_id else [])

    def ensure_dirs(self) -> None:
        Path(self.db_path).parent.mkdir(parents=True, exist_ok=True)
        Path(self.video_storage_dir).mkdir(parents=True, exist_ok=True)
        Path(self.avatar_storage_dir).mkdir(parents=True, exist_ok=True)
