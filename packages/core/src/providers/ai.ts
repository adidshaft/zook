import { z } from "zod";
import type { AIRequestType, DiagnosticProvider, ProviderInstanceDiagnostics } from "../types";

const optionalStructuredText = (maxLength: number) =>
  z.preprocess((value) => (value === null ? undefined : value), z.string().trim().max(maxLength).optional());

const structuredPlanSchema = z.object({
  title: z.string().trim().min(2).max(120),
  type: z
    .enum([
      "WORKOUT",
      "DIET",
      "EXERCISE_ROUTINE",
      "TRANSFORMATION_PROGRAM",
      "TRAINER_NOTE",
      "GYM_ADVISORY",
      "MACHINE_GUIDE",
      "RECOVERY"
    ])
    .default("WORKOUT"),
  goal: optionalStructuredText(240),
  days: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(80),
        exercises: z
          .array(
            z.object({
              name: z.string().trim().min(1).max(120),
              sets: optionalStructuredText(40),
              reps: optionalStructuredText(40),
              equipment: optionalStructuredText(80),
              notes: optionalStructuredText(240)
            })
          )
          .min(1)
      })
    )
    .min(1),
  notes: optionalStructuredText(1000)
});

export type StructuredPlanContent = z.infer<typeof structuredPlanSchema>;

export interface AIProvider extends DiagnosticProvider {
  generateText(input: { prompt: string; safeMode?: boolean; resources?: string[] }): Promise<string>;
  generateStructuredPlan(input: { prompt: string; safeMode?: boolean }): Promise<Record<string, unknown>>;
  generateImage(input: { prompt: string }): Promise<{ imageUrl: string; prompt: string }>;
  classifyScope(prompt: string): Promise<{ inScope: boolean; reason?: string }>;
  classifySafety(prompt: string): Promise<{ allowed: boolean; flags: string[]; redirect?: string }>;
}

const risky = [
  "anabolic",
  "body dysmorphia",
  "chest pain",
  "cutting weight fast",
  "diagnose",
  "eating disorder",
  "500 calories",
  "faint",
  "fainting",
  "injury treatment",
  "laxative",
  "purge",
  "skip meals",
  "steroid",
  "steroids",
  "testosterone cycle",
  "train through pain",
  "treatment"
];

export class MockAIProvider implements AIProvider {
  getDiagnostics(): ProviderInstanceDiagnostics {
    return {
      provider: "mock",
      mode: "mock",
      configured: true,
      metadata: {
        deterministic: true,
        supportsText: true,
        supportsStructuredPlan: true,
        supportsImage: true
      }
    };
  }

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
        {
          name: "Day 1",
          exercises: [
            { name: "Warm-up", sets: "1", reps: "8 min", equipment: "Bodyweight" },
            { name: "Goblet squat", sets: "3", reps: "10", equipment: "Dumbbell" },
            { name: "Push-up", sets: "3", reps: "8", equipment: "Bodyweight" }
          ]
        },
        {
          name: "Day 2",
          exercises: [
            { name: "Mobility flow", sets: "1", reps: "8 min", equipment: "Mat" },
            { name: "Hinge pattern", sets: "3", reps: "8", equipment: "Kettlebell" },
            { name: "Row", sets: "3", reps: "12", equipment: "Cable" }
          ]
        }
      ],
      notes: "Human review required before publishing.",
      promptSummary: input.prompt.slice(0, 90)
    };
  }

  async generateImage(input: { prompt: string }): Promise<{ imageUrl: string; prompt: string }> {
    return { imageUrl: `/mock-ai/images/${encodeURIComponent(input.prompt.slice(0, 40))}.png`, prompt: input.prompt };
  }

  async classifyScope(prompt: string): Promise<{ inScope: boolean; reason?: string }> {
    const normalized = prompt.toLowerCase();
    const inScope = /(gym|fitness|workout|diet|nutrition|exercise|recovery|membership|attendance|trainer|plan)/.test(
      normalized
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
    private readonly imageModel = process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1",
    private readonly timeoutMs = Number(process.env.OPENAI_TIMEOUT_MS ?? 20_000)
  ) {}

  getDiagnostics(): ProviderInstanceDiagnostics {
    return {
      provider: "openai",
      mode: "live",
      configured: Boolean(this.apiKey),
      metadata: {
        model: this.model,
        imageModel: this.imageModel,
        supportsText: true,
        supportsStructuredPlan: true,
        supportsImage: true
      }
    };
  }

  async generateText(input: { prompt: string; safeMode?: boolean; resources?: string[] }): Promise<string> {
    const resourceLine = input.resources?.length ? `Approved resources: ${input.resources.join(", ")}.` : "";
    const instruction = input.safeMode
      ? "Respond with minor-safe fitness guidance only. Avoid aggressive dieting, body shaming, or supplement advice."
      : "Respond with concise gym and fitness guidance only.";
    const payload = await this.createResponse({
      input: `${instruction}\n${resourceLine}\n${input.prompt}`
    });
    return extractResponseText(payload)?.trim() || "OpenAI provider returned no text.";
  }

  async generateStructuredPlan(input: { prompt: string; safeMode?: boolean }): Promise<Record<string, unknown>> {
    const instruction = input.safeMode
      ? "Create a minor-safe trainer-reviewed fitness plan. Avoid aggressive dieting, body shaming, supplement cycles, or medical treatment."
      : "Create a safe trainer-reviewed fitness plan for a gym member.";
    const payload = await this.createResponse({
      input: `${instruction}\n${input.prompt}`,
      text: {
        format: {
          type: "json_schema",
          name: "zook_trainer_plan",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["title", "type", "goal", "days", "notes"],
            properties: {
              title: { type: "string", minLength: 2, maxLength: 120 },
              type: {
                type: "string",
                enum: [
                  "WORKOUT",
                  "DIET",
                  "EXERCISE_ROUTINE",
                  "TRANSFORMATION_PROGRAM",
                  "TRAINER_NOTE",
                  "GYM_ADVISORY",
                  "MACHINE_GUIDE",
                  "RECOVERY"
                ]
              },
              goal: { anyOf: [{ type: "string", maxLength: 240 }, { type: "null" }] },
              days: {
                type: "array",
                minItems: 1,
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["name", "exercises"],
                  properties: {
                    name: { type: "string", minLength: 1, maxLength: 80 },
                    exercises: {
                      type: "array",
                      minItems: 1,
                      items: {
                        type: "object",
                        additionalProperties: false,
                        required: ["name", "sets", "reps", "equipment", "notes"],
                        properties: {
                          name: { type: "string", minLength: 1, maxLength: 120 },
                          sets: { anyOf: [{ type: "string", maxLength: 40 }, { type: "null" }] },
                          reps: { anyOf: [{ type: "string", maxLength: 40 }, { type: "null" }] },
                          equipment: { anyOf: [{ type: "string", maxLength: 80 }, { type: "null" }] },
                          notes: { anyOf: [{ type: "string", maxLength: 240 }, { type: "null" }] }
                        }
                      }
                    }
                  }
                }
              },
              notes: { anyOf: [{ type: "string", maxLength: 1000 }, { type: "null" }] }
            }
          }
        }
      }
    });
    const text = extractResponseText(payload);
    if (!text) {
      throw new Error("OpenAI provider returned no structured plan.");
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error("OpenAI provider returned malformed structured plan JSON.");
    }
    return structuredPlanSchema.parse(parsed);
  }

  async generateImage(input: { prompt: string }): Promise<{ imageUrl: string; prompt: string }> {
    const payload = await this.openAIRequest("https://api.openai.com/v1/images/generations", {
      model: this.imageModel,
      prompt: input.prompt,
      n: 1,
      size: "1024x1024"
    });
    const image = Array.isArray(payload.data) ? payload.data[0] : null;
    const b64 = image && typeof image === "object" && "b64_json" in image ? image.b64_json : null;
    const url = image && typeof image === "object" && "url" in image ? image.url : null;
    if (typeof b64 === "string" && b64.length) {
      return { imageUrl: `data:image/png;base64,${b64}`, prompt: input.prompt };
    }
    if (typeof url === "string" && url.length) {
      return { imageUrl: url, prompt: input.prompt };
    }
    throw new Error("OpenAI provider returned no image data.");
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

  private async createResponse(body: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.openAIRequest("https://api.openai.com/v1/responses", {
      model: this.model,
      ...body
    });
  }

  private async openAIRequest(url: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body),
      signal: controller.signal
    }).finally(() => clearTimeout(timeout));
    if (!response.ok) {
      throw new Error(`OpenAI request failed with status ${response.status}`);
    }
    return (await response.json()) as Record<string, unknown>;
  }
}

function extractResponseText(payload: Record<string, unknown>): string | undefined {
  if (typeof payload.output_text === "string") {
    return payload.output_text;
  }
  const output = Array.isArray(payload.output) ? payload.output : [];
  for (const item of output) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const content = Array.isArray((item as { content?: unknown }).content)
      ? (item as { content: unknown[] }).content
      : [];
    for (const contentItem of content) {
      if (!contentItem || typeof contentItem !== "object") {
        continue;
      }
      const text = (contentItem as { text?: unknown }).text;
      if (typeof text === "string") {
        return text;
      }
    }
  }
  return undefined;
}
