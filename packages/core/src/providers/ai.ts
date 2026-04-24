import type { AIRequestType } from "../types";

export interface AIProvider {
  generateText(input: { prompt: string; safeMode?: boolean; resources?: string[] }): Promise<string>;
  generateStructuredPlan(input: { prompt: string; safeMode?: boolean }): Promise<Record<string, unknown>>;
  generateImage(input: { prompt: string }): Promise<{ imageUrl: string; prompt: string }>;
  classifyScope(prompt: string): Promise<{ inScope: boolean; reason?: string }>;
  classifySafety(prompt: string): Promise<{ allowed: boolean; flags: string[]; redirect?: string }>;
}

const risky = [
  "chest pain",
  "faint",
  "steroids",
  "anabolic",
  "eating disorder",
  "500 calories",
  "diagnose",
  "treatment",
  "injury treatment"
];

export class MockAIProvider implements AIProvider {
  async generateText(input: { prompt: string; safeMode?: boolean; resources?: string[] }): Promise<string> {
    const prefix = input.safeMode ? "Minor-safe guidance: " : "";
    const resourceLine = input.resources?.length ? ` Approved resource used: ${input.resources[0]}.` : "";
    return `${prefix}Focus on consistent training, safe technique, hydration, sleep, and trainer review. ${input.prompt.slice(0, 90)}${resourceLine}`;
  }

  async generateStructuredPlan(input: { prompt: string; safeMode?: boolean }): Promise<Record<string, unknown>> {
    return {
      title: input.safeMode ? "Safe Foundation Plan" : "Zook Strength Starter",
      type: "WORKOUT",
      days: [
        { name: "Day 1", blocks: ["Warm-up 8 min", "Goblet squat 3x10", "Push-up 3x8"] },
        { name: "Day 2", blocks: ["Mobility 8 min", "Hinge pattern 3x8", "Row 3x12"] }
      ],
      notes: "Human review required before publishing."
    };
  }

  async generateImage(input: { prompt: string }): Promise<{ imageUrl: string; prompt: string }> {
    return { imageUrl: `/mock-ai/images/${encodeURIComponent(input.prompt.slice(0, 40))}.png`, prompt: input.prompt };
  }

  async classifyScope(prompt: string): Promise<{ inScope: boolean; reason?: string }> {
    const normalized = prompt.toLowerCase();
    const inScope = /(gym|fitness|workout|diet|nutrition|exercise|recovery|membership|attendance|trainer|plan)/.test(
      normalized,
    );
    return inScope ? { inScope } : { inScope: false, reason: "Zook AI is limited to gym, fitness, and operations topics." };
  }

  async classifySafety(prompt: string): Promise<{ allowed: boolean; flags: string[]; redirect?: string }> {
    const normalized = prompt.toLowerCase();
    const flags = risky.filter((term) => normalized.includes(term));
    if (flags.length) {
      return {
        allowed: false,
        flags,
        redirect: "This needs a qualified professional. For severe symptoms, seek urgent medical help."
      };
    }
    return { allowed: true, flags: [] };
  }
}

export function estimateTokens(prompt: string, response = ""): number {
  return Math.ceil((prompt.length + response.length) / 4);
}

export function isImageRequest(type: AIRequestType): boolean {
  return type === "IMAGE";
}

export class OpenAIProvider implements AIProvider {
  constructor(
    private readonly apiKey: string,
    private readonly model = process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
  ) {}

  async generateText(input: { prompt: string; safeMode?: boolean; resources?: string[] }): Promise<string> {
    const resourceLine = input.resources?.length ? `Approved resources: ${input.resources.join(", ")}.` : "";
    const instruction = input.safeMode
      ? "Respond with minor-safe fitness guidance only. Avoid aggressive dieting, body shaming, or supplement advice."
      : "Respond with concise gym and fitness guidance only.";
    const payload = await this.createResponse(`${instruction}\n${resourceLine}\n${input.prompt}`);
    return payload.output_text?.trim() || "OpenAI provider returned no text.";
  }

  async generateStructuredPlan(input: { prompt: string; safeMode?: boolean }): Promise<Record<string, unknown>> {
    const text = await this.generateText({
      prompt: `${input.prompt}\nReturn a JSON-ready workout or nutrition draft with title, type, days, and notes.`,
      ...(input.safeMode !== undefined ? { safeMode: input.safeMode } : {})
    });
    return {
      title: "OpenAI Draft",
      type: "WORKOUT",
      source: "openai",
      notes: text
    };
  }

  async generateImage(input: { prompt: string }): Promise<{ imageUrl: string; prompt: string }> {
    return {
      imageUrl: `https://api.openai.com/v1/images?prompt=${encodeURIComponent(input.prompt)}`,
      prompt: input.prompt
    };
  }

  async classifyScope(prompt: string): Promise<{ inScope: boolean; reason?: string }> {
    return /(gym|fitness|workout|diet|nutrition|exercise|recovery|membership|attendance|trainer|plan)/i.test(prompt)
      ? { inScope: true }
      : { inScope: false, reason: "Query is outside gym, fitness, or gym-ops scope." };
  }

  async classifySafety(prompt: string): Promise<{ allowed: boolean; flags: string[]; redirect?: string }> {
    const normalized = prompt.toLowerCase();
    const flags = risky.filter((term) => normalized.includes(term));
    return flags.length
      ? {
          allowed: false,
          flags,
          redirect: "This request needs a qualified professional."
        }
      : { allowed: true, flags: [] };
  }

  private async createResponse(input: string): Promise<{ output_text?: string }> {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: this.model,
        input
      })
    });
    if (!response.ok) {
      throw new Error(`OpenAI request failed with status ${response.status}`);
    }
    return (await response.json()) as { output_text?: string };
  }
}
