from pathlib import Path

from pydantic_settings import BaseSettings


class Config(BaseSettings):
    anthropic_api_key: str = ""
    runway_api_key: str = ""
    instagram_user_id: str = ""
    instagram_access_token: str = ""
    youtube_client_id: str = ""
    youtube_client_secret: str = ""
    youtube_refresh_token: str = ""
    db_path: str = "./data/thinksy.db"
    approval_mode: str = "human"
    public_video_host: str = "https://thinksy.ai"
    video_storage_dir: str = "./data/videos"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

    def ensure_dirs(self) -> None:
        Path(self.db_path).parent.mkdir(parents=True, exist_ok=True)
        Path(self.video_storage_dir).mkdir(parents=True, exist_ok=True)
