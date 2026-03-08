import Anthropic from "@anthropic-ai/sdk";

export class ClaudeClient {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async chat(
    system: string,
    user: string,
    model: string = "claude-sonnet-4-20250514",
    max_tokens: number = 4096
  ): Promise<string> {
    try {
      const message = await this.client.messages.create({
        model,
        max_tokens,
        system,
        messages: [{ role: "user", content: user }],
      });

      const firstBlock = message.content[0];
      return firstBlock && firstBlock.type === "text" ? firstBlock.text : "";
    } catch (error: unknown) {
      if (error instanceof Anthropic.AuthenticationError) {
        throw new Error(
          "Invalid Anthropic API key. Check ANTHROPIC_API_KEY in your .env file."
        );
      }

      if (error instanceof Anthropic.BadRequestError) {
        const msg = String(error.message || error);
        if (msg.toLowerCase().includes("credit balance")) {
          throw new Error(
            "Anthropic API credits exhausted. Add credits at https://console.anthropic.com -> Plans & Billing."
          );
        }
        throw new Error(`Anthropic bad request: ${msg}`);
      }

      if (error instanceof Anthropic.RateLimitError) {
        throw new Error("Anthropic API rate limit hit. Wait a moment and try again.");
      }

      if (error instanceof Anthropic.APIConnectionError) {
        throw new Error(
          "Could not reach the Anthropic API. Check your internet connection."
        );
      }

      if (error instanceof Error) {
        throw error;
      }

      throw new Error("Unknown Anthropic API error.");
    }
  }

  async chatJson(
    system: string,
    user: string,
    options: { model?: string; max_tokens?: number } = {}
  ): Promise<Record<string, unknown> | Array<unknown>> {
    let text = await this.chat(
      system,
      `${user}\n\nRespond with valid JSON only. No markdown fences.`,
      options.model,
      options.max_tokens
    );

    text = text.trim();
    if (text.startsWith("```")) {
      text = text.split("\n", 2)[1] || "";
    }
    if (text.endsWith("```")) {
      text = text.slice(0, text.lastIndexOf("```"));
    }

    return JSON.parse(text.trim()) as Record<string, unknown> | Array<unknown>;
  }
}
