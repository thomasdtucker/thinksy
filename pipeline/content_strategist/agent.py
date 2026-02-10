from __future__ import annotations

import logging
from typing import Optional

from ..config import Config
from ..db import Database
from ..models import ContentItem, ContentStatus, SoftwareCategory
from ..shared.llm import ClaudeClient
from ..shared.retry import retry
from .prompts import CLASSIFY_CATEGORY_PROMPT, GENERATE_PROMPT, SYSTEM_PROMPT

logger = logging.getLogger(__name__)


class ContentStrategistAgent:
    def __init__(self, config: Config, db: Database) -> None:
        self.config = config
        self.db = db
        self.llm = ClaudeClient(config.anthropic_api_key)

    def classify_category(self, instruction: str) -> SoftwareCategory:
        response = self.llm.chat(
            system="You classify user instructions into software categories.",
            user=CLASSIFY_CATEGORY_PROMPT.format(instruction=instruction),
        )
        cat = response.strip().lower().replace(" ", "_")
        try:
            return SoftwareCategory(cat)
        except ValueError:
            logger.warning("Could not classify '%s', defaulting to project_management", cat)
            return SoftwareCategory.PROJECT_MANAGEMENT

    @retry(max_attempts=3, exceptions=(Exception,))
    def generate(
        self,
        instruction: str,
        count: int = 3,
        category: Optional[SoftwareCategory] = None,
    ) -> list[ContentItem]:
        if category is None:
            category = self.classify_category(instruction)

        logger.info("Generating %d scripts for category: %s", count, category.value)

        scripts = self.llm.chat_json(
            system=SYSTEM_PROMPT.format(category=category.value),
            user=GENERATE_PROMPT.format(
                count=count,
                category=category.value,
                instruction=instruction,
            ),
        )

        items: list[ContentItem] = []
        for script in scripts:
            item = ContentItem(
                category=category,
                hook=script["hook"],
                script=script["script"],
                cta=script["cta"],
                visual_direction=script.get("visual_direction", ""),
                status=ContentStatus.SCRIPT_DRAFT,
            )
            item.id = self.db.insert_content_item(item)
            self.db.log_action(
                item.id,
                "ContentStrategistAgent",
                "generated_script",
                script,
            )
            items.append(item)
            logger.info("Generated script #%d: %s", item.id, item.hook[:60])

        return items
