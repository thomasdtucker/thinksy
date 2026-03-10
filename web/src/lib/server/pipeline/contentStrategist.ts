import { getConfig, type PipelineConfig } from "@/lib/server/pipeline/config";
import { Database } from "@/lib/server/pipeline/db";
import { ClaudeClient } from "@/lib/server/pipeline/llm";
import {
  ContentItem,
  ContentStatus,
  Scene,
  SoftwareCategory,
} from "@/lib/server/pipeline/models";
import {
  CLASSIFY_CATEGORY_PROMPT,
  EVELYN_BIO,
  GENERATE_PROMPT,
  SCENE_DETAILS,
  SCENE_OUTFITS,
  SYSTEM_PROMPT,
  SYSTEM_PROMPT_SCENE_APPENDIX,
  pickTopics,
} from "@/lib/server/pipeline/prompts";

interface GeneratedScript {
  script_type?: string;
  hook: string;
  script: string;
  cta: string;
  visual_direction?: string;
}

function isGeneratedScript(value: unknown): value is GeneratedScript {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.hook !== "string") return false;
  if (typeof candidate.script !== "string") return false;
  if (typeof candidate.cta !== "string") return false;
  if (
    candidate.script_type !== undefined &&
    candidate.script_type !== null &&
    typeof candidate.script_type !== "string"
  ) {
    return false;
  }
  if (
    candidate.visual_direction !== undefined &&
    candidate.visual_direction !== null &&
    typeof candidate.visual_direction !== "string"
  ) {
    return false;
  }
  return true;
}

export class ContentStrategistAgent {
  private config: PipelineConfig;
  private db: Database;
  private llm: ClaudeClient;

  constructor(config: PipelineConfig, db: Database);
  constructor(db: Database);
  constructor(configOrDb: PipelineConfig | Database, maybeDb?: Database) {
    if (maybeDb) {
      this.config = configOrDb as PipelineConfig;
      this.db = maybeDb;
    } else {
      this.config = getConfig();
      this.db = configOrDb as Database;
    }

    this.llm = new ClaudeClient(this.config.anthropic_api_key);
  }

  async classify_category(instruction: string): Promise<SoftwareCategory> {
    const response = await this.llm.chat(
      "You classify user instructions into software categories.",
      CLASSIFY_CATEGORY_PROMPT.replace("{instruction}", instruction)
    );

    const cat = response.trim().toLowerCase().replace(/\s+/g, "_");
    const values = Object.values(SoftwareCategory);
    if (values.includes(cat as SoftwareCategory)) {
      return cat as SoftwareCategory;
    }

    return SoftwareCategory.PROJECT_MANAGEMENT;
  }

  async classifyCategory(instruction: string): Promise<SoftwareCategory> {
    return this.classify_category(instruction);
  }

  async generate(
    instruction: string,
    count: number = 3,
    category?: SoftwareCategory
  ): Promise<ContentItem[]> {
    const resolvedCategory = category ?? (await this.classify_category(instruction));

    // Pick random topics for diversity
    const topics = pickTopics(resolvedCategory, count);
    const sceneCycle = Object.values(Scene);
    const topicAssignments = topics.map((topic, i) => {
      const scene = sceneCycle[i % sceneCycle.length];
      const outfits = SCENE_OUTFITS[scene] || [];
      const outfit = outfits.length > 0
        ? outfits[Math.floor(Math.random() * outfits.length)]
        : SCENE_DETAILS[scene].wardrobe;
      return {
        topic,
        scene,
        outfit,
        sceneDetails: SCENE_DETAILS[scene],
      };
    });
    const sceneContext =
      "For each script, follow its assigned scene details exactly. This script takes place in [setting]. " +
      "Evelyn is wearing [wardrobe]. Time of day: [time]. Visual direction should reflect: [visual_notes].";
    const topicsSection = topicAssignments
      .map(
        (assignment, i) =>
          `  ${i + 1}. ${assignment.topic} — SCENE: ${assignment.sceneDetails.label}. This script takes place in ${assignment.sceneDetails.setting} Evelyn is wearing ${assignment.outfit}. Time of day: ${assignment.sceneDetails.time_of_day} Visual direction should reflect: ${assignment.sceneDetails.visual_notes}`
      )
      .join("\n");

    // Fetch recent hooks to avoid repeats
    const recentHooks = this.db.get_recent_hooks(resolvedCategory, 50);
    const recentHooksSection = recentHooks.length > 0
      ? `AVOID REPEATING these hooks from previous scripts (use completely different angles):\n${recentHooks.map((h) => `  - "${h}"`).join("\n")}`
      : "";

    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const scripts = await this.llm.chatJson(
          `${SYSTEM_PROMPT.replace("{bio}", EVELYN_BIO).replaceAll("{category}", resolvedCategory)}\n\n${SYSTEM_PROMPT_SCENE_APPENDIX}`,
          GENERATE_PROMPT.replaceAll("{count}", String(count))
            .replaceAll("{category}", resolvedCategory)
            .replace("{instruction}", instruction)
            .replace("{scene_context}", sceneContext)
            .replace("{topics}", topicsSection)
            .replace("{recent_hooks_section}", recentHooksSection)
        );

        if (!Array.isArray(scripts)) {
          throw new Error("Claude returned non-array response for generated scripts.");
        }

        const items: ContentItem[] = [];
        for (const [index, script] of scripts.entries()) {
          if (!isGeneratedScript(script)) {
            throw new Error("Claude returned invalid script shape.");
          }

          const fallbackScene = sceneCycle[index % sceneCycle.length];
          const assignedScene = topicAssignments[index]?.scene ?? fallbackScene;
          const assignedOutfit = topicAssignments[index]?.outfit ?? null;

          const item: ContentItem = {
            category: resolvedCategory,
            scene: assignedScene,
            outfit: assignedOutfit,
            script_type: script.script_type ?? null,
            hook: script.hook,
            script: script.script,
            cta: script.cta,
            visual_direction: script.visual_direction ?? "",
            target_url: this.config.affiliate_link || "https://www.softwareadvice.com",
            status: ContentStatus.SCRIPT_DRAFT,
            created_at: new Date().toISOString(),
            approved_at: null,
            approved_by: null,
          };

          const id = this.db.insert_content_item(item);
          item.id = id;

          this.db.log_action(id, "ContentStrategistAgent", "generated_script", {
            scene: assignedScene,
            script_type: script.script_type ?? null,
            hook: script.hook,
            script: script.script,
            cta: script.cta,
            visual_direction: script.visual_direction ?? "",
          });

          items.push(item);
        }

        return items;
      } catch (error: unknown) {
        if (error instanceof Error) {
          lastError = error;
        } else {
          lastError = new Error("Unknown script generation error.");
        }
      }
    }

    throw lastError || new Error("Failed to generate scripts.");
  }
}
