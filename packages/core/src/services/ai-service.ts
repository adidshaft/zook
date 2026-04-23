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

export function defaultAIQuotaForRole(role: Exclude<Role, "PLATFORM_ADMIN">): AIQuotaState {
  const limits = defaultQuotaByRole[role];
  return { ...limits, usedTextDaily: 0, usedTextMonth: 0, usedImagesMonth: 0 };
}

export function assertAIAllowed(input: {
  role: Exclude<Role, "PLATFORM_ADMIN">;
  requestType: AIRequestType;
  quota: AIQuotaState;
  user: UserSafetyState;
}): void {
  if (input.user.isMinor && !input.user.guardianConsentGranted) {
    throw new Error("Guardian consent required for AI");
  }
  if (!input.user.aiConsent) {
    throw new Error("AI personalization consent required");
  }
  if (isImageRequest(input.requestType) && input.role === "MEMBER") {
    throw new Error("Members cannot generate images");
  }
  if (isImageRequest(input.requestType) && input.quota.usedImagesMonth >= input.quota.imageMonthLimit) {
    throw new Error("Image quota exceeded");
  }
  if (!isImageRequest(input.requestType) && input.quota.usedTextDaily >= input.quota.textDailyLimit) {
    throw new Error("Daily text quota exceeded");
  }
  if (!isImageRequest(input.requestType) && input.quota.usedTextMonth >= input.quota.textMonthLimit) {
    throw new Error("Monthly text quota exceeded");
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
    throw new Error(scope.reason ?? "AI request out of scope");
  }
  if (!safety.allowed) {
    throw new Error(safety.redirect ?? "AI request blocked for safety");
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
