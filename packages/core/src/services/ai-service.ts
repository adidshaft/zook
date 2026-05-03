import type { AIProvider } from "../providers/ai";
import { estimateTokens, isImageRequest } from "../providers/ai";
import type { AIQuotaState, AIRequestType, Role, UserSafetyState } from "../types";

const defaultQuotaByRole: Record<Exclude<Role, "PLATFORM_ADMIN">, Pick<AIQuotaState, "textDailyLimit" | "textMonthLimit" | "imageMonthLimit">> = {
  OWNER: { textDailyLimit: 25, textMonthLimit: 500, imageMonthLimit: 20 },
  ADMIN: { textDailyLimit: 25, textMonthLimit: 500, imageMonthLimit: 20 },
  RECEPTIONIST: { textDailyLimit: 5, textMonthLimit: 50, imageMonthLimit: 0 },
  TRAINER: { textDailyLimit: 25, textMonthLimit: 300, imageMonthLimit: 10 },
  MEMBER: { textDailyLimit: 5, textMonthLimit: 50, imageMonthLimit: 0 }
};

export class AIGuardError extends Error {
  readonly reason: string;
  readonly safetyFlags: string[];

  constructor(reason: string, message: string, safetyFlags: string[] = []) {
    super(message);
    this.name = "AIGuardError";
    this.reason = reason;
    this.safetyFlags = safetyFlags;
  }
}

export function defaultAIQuotaForRole(role: Exclude<Role, "PLATFORM_ADMIN">): AIQuotaState {
  const limits = defaultQuotaByRole[role];
  return { ...limits, usedTextDaily: 0, usedTextMonth: 0, usedImagesMonth: 0 };
}

export function buildAIQuotaState(
  role: Exclude<Role, "PLATFORM_ADMIN">,
  usage?: Partial<Pick<AIQuotaState, "usedTextDaily" | "usedTextMonth" | "usedImagesMonth">>
): AIQuotaState {
  return {
    ...defaultAIQuotaForRole(role),
    ...(usage ?? {})
  };
}

export function assertAIAllowed(input: {
  role: Exclude<Role, "PLATFORM_ADMIN">;
  requestType: AIRequestType;
  quota: AIQuotaState;
  user: UserSafetyState;
}): void {
  if (input.user.isMinor && !input.user.guardianConsentGranted) {
    throw new AIGuardError("guardian_consent_required", "Guardian consent required for AI", ["minor_guardian_consent"]);
  }
  if (!input.user.aiConsent) {
    throw new AIGuardError("ai_consent_required", "AI personalization consent required", ["ai_consent_required"]);
  }
  if (isImageRequest(input.requestType) && input.role === "MEMBER") {
    throw new AIGuardError("image_generation_not_allowed", "Members cannot generate images", ["member_image_blocked"]);
  }
  if (isImageRequest(input.requestType) && input.quota.usedImagesMonth >= input.quota.imageMonthLimit) {
    throw new AIGuardError("quota_exceeded", "Image quota exceeded", ["image_quota_exceeded"]);
  }
  if (!isImageRequest(input.requestType) && input.quota.usedTextDaily >= input.quota.textDailyLimit) {
    throw new AIGuardError("quota_exceeded", "Daily text quota exceeded", ["daily_text_quota_exceeded"]);
  }
  if (!isImageRequest(input.requestType) && input.quota.usedTextMonth >= input.quota.textMonthLimit) {
    throw new AIGuardError("quota_exceeded", "Monthly text quota exceeded", ["monthly_text_quota_exceeded"]);
  }
}

export async function runAIGuardedRequest(input: {
  provider: AIProvider;
  prompt: string;
  role: Exclude<Role, "PLATFORM_ADMIN">;
  requestType: AIRequestType;
  quota: AIQuotaState;
  user: UserSafetyState;
  resources?: string[];
}): Promise<{ response: string | Record<string, unknown>; tokenEstimate: number; safetyFlags: string[]; quotaConsumed: number }> {
  assertAIAllowed(input);
  const [scope, safety] = await Promise.all([
    input.provider.classifyScope(input.prompt),
    input.provider.classifySafety(input.prompt)
  ]);
  if (!scope.inScope) {
    throw new AIGuardError("out_of_scope", scope.reason ?? "AI request out of scope", ["out_of_scope"]);
  }
  if (!safety.allowed) {
    throw new AIGuardError("safety_blocked", safety.redirect ?? "AI request blocked for safety", safety.flags);
  }
  if (input.requestType === "IMAGE") {
    const image = await input.provider.generateImage({ prompt: input.prompt });
    return { response: image, tokenEstimate: 0, safetyFlags: safety.flags, quotaConsumed: 1 };
  }
  if (input.requestType === "STRUCTURED_PLAN") {
    const response = await input.provider.generateStructuredPlan({
      prompt: input.prompt,
      safeMode: input.user.isMinor
    });
    return { response, tokenEstimate: estimateTokens(input.prompt, JSON.stringify(response)), safetyFlags: safety.flags, quotaConsumed: 1 };
  }
  const response = await input.provider.generateText({
    prompt: input.prompt,
    safeMode: input.user.isMinor,
    ...(input.resources ? { resources: input.resources } : {})
  });
  return { response, tokenEstimate: estimateTokens(input.prompt, response), safetyFlags: safety.flags, quotaConsumed: 1 };
}
