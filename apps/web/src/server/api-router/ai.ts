import {
  type AIRequestType,
  type OrgRole,
} from "@zook/core";
import {
  getAIProvider,
  getAIProviderDiagnostics,
} from "@zook/core/providers";
import {
  AIGuardError,
  buildAIQuotaState,
  createPlanVersionSnapshot,
  runAIGuardedRequest,
} from "@zook/core/services";
import { Prisma, prisma } from "@zook/db";
import type { NextRequest } from "next/server";
import { z } from "zod";

import {
  getRequestContext,
  requireAuth,
  requireOrgAnyPermission,
  requireOrgPermission,
} from "../access";
import { writeAuditLog } from "../audit";
import {
  featureUnavailableError,
  forbiddenError,
  serviceUnavailableError,
  validationError,
} from "../errors";
import { assertRateLimit } from "../rate-limit";
import { ok, readJson } from "../response";
import {
  aiStructuredPlanContentSchema,
  assertLimitAvailable,
  clean,
  getOrgSaasEntitlements,
  getOrgSaasUsage,
  isFeatureFlagEnabled,
  pathMatches,
  sanitizeJsonRichText,
} from "./core";

const aiChatSchema = z.object({
  prompt: z.string().trim().min(2).max(2_000),
  orgId: z.string().optional(),
  conversationId: z.string().optional(),
});

const aiGenerateSchema = z.object({
  prompt: z.string().trim().min(2).max(2_000),
  orgId: z.string(),
  targetUserId: z.string().optional(),
  title: z.string().trim().min(2).max(120).optional(),
  type: z
    .enum([
      "WORKOUT",
      "DIET",
      "EXERCISE_ROUTINE",
      "TRANSFORMATION_PROGRAM",
      "TRAINER_NOTE",
      "GYM_ADVISORY",
      "MACHINE_GUIDE",
      "RECOVERY",
    ])
    .optional(),
  persistDraft: z.boolean().default(true),
});

function startOfDay(date = new Date()) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getAIProviderOrThrow() {
  const diagnostics = getAIProviderDiagnostics();
  if (
    diagnostics.status === "misconfigured" ||
    diagnostics.status === "unsupported" ||
    diagnostics.status === "disabled"
  ) {
    throw validationError("The assistant is not available right now.");
  }
  return getAIProvider();
}

function currentAIProviderType(): "MOCK" | "OPENAI" {
  return getAIProviderDiagnostics().activeProvider === "openai" ? "OPENAI" : "MOCK";
}

function assertAiLaunchEnabled() {
  if (process.env.AI_FEATURES_ENABLED !== "true") {
    throw featureUnavailableError("AI features are unavailable in this environment.", {
      feature: "ai",
      flag: "AI_FEATURES_ENABLED",
    });
  }
}

function summarizeAIResponse(response: string | Record<string, unknown>) {
  return (typeof response === "string" ? response : JSON.stringify(response)).slice(0, 120);
}

function aiConsentAllowed(user: { aiConsent: boolean }) {
  return user.aiConsent || process.env.NODE_ENV === "development";
}

function normalizedStructuredPlanContent(response: string | Record<string, unknown>) {
  if (typeof response === "string") {
    return {
      title: "Trainer plan",
      type: "WORKOUT",
      days: [
        {
          name: "Draft notes",
          exercises: response
            .split(/\n+/)
            .map((line) => line.trim())
            .filter(Boolean)
            .slice(0, 8)
            .map((line) => ({ name: line })),
        },
      ],
      notes: "Generated text was normalized into a trainer-reviewed draft.",
    };
  }
  if (Array.isArray(response.days) || Array.isArray(response.exercises)) {
    return response;
  }
  if (Array.isArray(response.sections)) {
    const exercises = response.sections
      .flatMap((section) => {
        if (!section || typeof section !== "object") {
          return [];
        }
        const record = section as Record<string, unknown>;
        const body = typeof record.body === "string" ? record.body : "";
        return body
          .split(/\n+|[.;]/)
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => ({ name: line.slice(0, 120) }));
      })
      .slice(0, 12);
    return exercises.length
      ? {
          ...response,
          days: [{ name: "Draft session", exercises }],
        }
      : response;
  }
  return response;
}

async function assertSaasAiAllowance(orgId: string, requestType: AIRequestType) {
  const [{ tier, entitlements }, usage] = await Promise.all([
    getOrgSaasEntitlements(orgId),
    getOrgSaasUsage(orgId),
  ]);
  if (requestType === "IMAGE") {
    assertLimitAvailable({
      limit: entitlements.aiImageMonthlyLimit,
      used: usage.aiImageMonthlyCount,
      label: "Monthly AI image",
      tier,
    });
    return;
  }
  assertLimitAvailable({
    limit: entitlements.aiTextMonthlyLimit,
    used: usage.aiTextMonthlyCount,
    label: "Monthly AI text",
    tier,
  });
}

async function resolveAIQuotaState(input: { userId: string; role: OrgRole }) {
  const today = startOfDay();
  const monthStart = startOfMonth();
  const [usedTextDaily, usedTextMonth, usedImagesMonth] = await Promise.all([
    prisma.aIUsageLog.count({
      where: {
        userId: input.userId,
        requestType: { in: ["CHAT", "STRUCTURED_PLAN"] },
        createdAt: { gte: today },
      },
    }),
    prisma.aIUsageLog.count({
      where: {
        userId: input.userId,
        requestType: { in: ["CHAT", "STRUCTURED_PLAN"] },
        createdAt: { gte: monthStart },
      },
    }),
    prisma.aIUsageLog.count({
      where: {
        userId: input.userId,
        requestType: "IMAGE",
        createdAt: { gte: monthStart },
      },
    }),
  ]);
  return buildAIQuotaState(input.role, { usedTextDaily, usedTextMonth, usedImagesMonth });
}

async function persistAiConversation(input: {
  conversationId?: string;
  userId: string;
  orgId?: string;
  prompt: string;
  response: string | Record<string, unknown>;
  safetyFlags?: Prisma.InputJsonValue;
}) {
  const conversation =
    (input.conversationId
      ? await prisma.aIConversation.findFirst({
          where: { id: input.conversationId, userId: input.userId },
        })
      : null) ??
    (await prisma.aIConversation.create({
      data: clean({
        userId: input.userId,
        orgId: input.orgId,
        title: input.prompt.slice(0, 80),
      }),
    }));

  await prisma.aIMessage.createMany({
    data: [
      {
        conversationId: conversation.id,
        role: "user",
        content: input.prompt,
      },
      clean({
        conversationId: conversation.id,
        role: "assistant",
        content:
          typeof input.response === "string" ? input.response : JSON.stringify(input.response),
        safetyFlags: input.safetyFlags,
      }),
    ],
  });

  return conversation;
}

async function persistBlockedAiAttempt(input: {
  request: NextRequest;
  orgId?: string;
  userId: string;
  role: OrgRole;
  requestType: AIRequestType;
  prompt: string;
  error: AIGuardError;
}) {
  await prisma.aIUsageLog.create({
    data: clean({
      orgId: input.orgId,
      userId: input.userId,
      role: input.role,
      provider: currentAIProviderType(),
      requestType: input.requestType,
      promptSummary: input.prompt.slice(0, 120),
      responseSummary: input.error.message.slice(0, 120),
      quotaConsumed: 0,
      safetyFlags: input.error.safetyFlags as Prisma.InputJsonValue,
    }),
  });
  if (input.orgId) {
    await writeAuditLog({
      request: input.request,
      orgId: input.orgId,
      actorUserId: input.userId,
      action: "ai.request_blocked",
      entityType: "ai_usage",
      metadata: {
        reason: input.error.reason,
        requestType: input.requestType,
        flags: input.error.safetyFlags,
      },
    });
  }
}

export async function handleAi(request: NextRequest, path: string[]) {
  if (request.method === "POST" && pathMatches(path, ["ai", "chat"])) {
    assertAiLaunchEnabled();
    const body = aiChatSchema.parse(await readJson(request));
    const ctx = await getRequestContext(request, body.orgId ? { orgId: body.orgId } : {});
    if (!(await isFeatureFlagEnabled("ai.assistant", body.orgId ?? ctx.orgId))) {
      throw serviceUnavailableError("AI assistant is disabled by platform controls.");
    }
    const userId = requireAuth(ctx);
    await assertRateLimit(
      "aiRequestByUser",
      userId,
      "Too many assistant requests. Please slow down and try again shortly.",
    );
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (body.orgId) {
      requireOrgPermission(ctx, body.orgId, "AI_USE_TEXT");
      await assertSaasAiAllowance(body.orgId, "CHAT");
    }
    const role = (ctx.roles[0] ?? "MEMBER") as OrgRole;
    const quota = await resolveAIQuotaState({ userId, role });
    let result: Awaited<ReturnType<typeof runAIGuardedRequest>>;
    try {
      result = await runAIGuardedRequest({
        provider: getAIProviderOrThrow(),
        prompt: body.prompt,
        role,
        requestType: "CHAT",
        quota,
        user: {
          isMinor: user.isMinor,
          guardianConsentGranted: !user.guardianPending,
          marketingOptIn: user.marketingOptIn,
          aiConsent: aiConsentAllowed(user),
          hasProfilePhoto: Boolean(user.profilePhotoUrl),
        },
      });
    } catch (error) {
      if (error instanceof AIGuardError) {
        await persistBlockedAiAttempt({
          request,
          ...(body.orgId ? { orgId: body.orgId } : {}),
          userId,
          role,
          requestType: "CHAT",
          prompt: body.prompt,
          error,
        });
        throw validationError(error.message, {
          reason: error.reason,
          flags: error.safetyFlags,
        });
      }
      throw error;
    }
    const conversation = await persistAiConversation({
      userId,
      prompt: body.prompt,
      response: result.response,
      ...(body.conversationId ? { conversationId: body.conversationId } : {}),
      ...(body.orgId ? { orgId: body.orgId } : {}),
      safetyFlags: result.safetyFlags as Prisma.InputJsonValue,
    });
    await prisma.aIUsageLog.create({
      data: clean({
        orgId: body.orgId,
        userId,
        role,
        provider: currentAIProviderType(),
        requestType: "CHAT",
        promptSummary: body.prompt.slice(0, 120),
        responseSummary: summarizeAIResponse(result.response),
        tokenEstimate: result.tokenEstimate,
        quotaConsumed: result.quotaConsumed,
        safetyFlags: result.safetyFlags,
      }),
    });
    await writeAuditLog({
      request,
      ...(body.orgId ? { orgId: body.orgId } : {}),
      actorUserId: userId,
      action: "ai.request.completed",
      entityType: "ai_conversation",
      entityId: conversation.id,
      metadata: {
        requestType: "CHAT",
        prompt: body.prompt,
        completion: result.response,
        safetyFlags: result.safetyFlags,
      },
    });
    return ok({ ...result, conversationId: conversation.id });
  }
  if (
    request.method === "POST" &&
    (pathMatches(path, ["ai", "generate-plan"]) || pathMatches(path, ["ai", "generate-image"]))
  ) {
    assertAiLaunchEnabled();
    const body = aiGenerateSchema.parse(await readJson(request));
    const ctx = await getRequestContext(request, body.orgId ? { orgId: body.orgId } : {});
    const userId = requireAuth(ctx);
    await assertRateLimit(
      "aiRequestByUser",
      userId,
      "Too many assistant requests. Please slow down and try again shortly.",
    );
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const requestType: AIRequestType = path[1] === "generate-image" ? "IMAGE" : "STRUCTURED_PLAN";
    requireOrgPermission(
      ctx,
      body.orgId,
      requestType === "IMAGE" ? "AI_GENERATE_IMAGE" : "AI_GENERATE_PLAN",
    );
    await assertSaasAiAllowance(body.orgId, requestType);
    const role = (ctx.roles[0] ?? "MEMBER") as OrgRole;
    if (requestType === "STRUCTURED_PLAN" && !ctx.roles.includes("TRAINER")) {
      throw forbiddenError("Trainer plan generation requires a trainer role.");
    }
    if (requestType === "STRUCTURED_PLAN" && body.persistDraft && !body.targetUserId) {
      throw validationError("Choose a member before creating a trainer draft.");
    }
    if (requestType === "STRUCTURED_PLAN" && body.targetUserId) {
      const assignment = await prisma.trainerAssignment.findFirst({
        where: {
          orgId: body.orgId,
          trainerUserId: userId,
          memberUserId: body.targetUserId,
          active: true,
        },
      });
      if (!assignment) {
        throw forbiddenError("Trainer drafts can only target assigned clients.");
      }
    }
    const quota = await resolveAIQuotaState({ userId, role });
    let result: Awaited<ReturnType<typeof runAIGuardedRequest>>;
    try {
      result = await runAIGuardedRequest({
        provider: getAIProviderOrThrow(),
        prompt: body.prompt,
        role,
        requestType,
        quota,
        user: {
          isMinor: user.isMinor,
          guardianConsentGranted: !user.guardianPending,
          marketingOptIn: user.marketingOptIn,
          aiConsent: user.aiConsent,
          hasProfilePhoto: Boolean(user.profilePhotoUrl),
        },
      });
    } catch (error) {
      if (error instanceof AIGuardError) {
        await persistBlockedAiAttempt({
          request,
          orgId: body.orgId,
          userId,
          role,
          requestType,
          prompt: body.prompt,
          error,
        });
        throw validationError(error.message, {
          reason: error.reason,
          flags: error.safetyFlags,
        });
      }
      throw error;
    }
    let createdPlan: Prisma.PlanContentGetPayload<object> | undefined;
    if (requestType === "STRUCTURED_PLAN" && body.orgId && body.persistDraft) {
      const planType = body.type ?? "WORKOUT";
      const title = body.title ?? `${planType === "DIET" ? "Nutrition" : "Workout"} draft`;
      const content = aiStructuredPlanContentSchema.parse(
        sanitizeJsonRichText(normalizedStructuredPlanContent(result.response)),
      );
      createdPlan = await prisma.planContent.create({
        data: {
          orgId: body.orgId,
          creatorUserId: userId,
          type: planType as never,
          title,
          description: "Assisted draft. Review before publishing.",
          content: content as Prisma.InputJsonValue,
          aiGenerated: true,
          visibility: "assigned",
        },
      });
      await prisma.planVersion.create({
        data: {
          orgId: body.orgId,
          planId: createdPlan.id,
          versionNo: 1,
          content: createPlanVersionSnapshot({
            title,
            description: "Assisted draft. Review before publishing.",
            aiGenerated: true,
            visibility: "assigned",
            content: content as Record<string, unknown>,
          }) as Prisma.InputJsonValue,
          createdById: userId,
        },
      });
      await writeAuditLog({
        request,
        orgId: body.orgId,
        actorUserId: userId,
        action: "plan.ai_draft_created",
        entityType: "plan_content",
        entityId: createdPlan.id,
        metadata: { type: planType, targetUserId: body.targetUserId },
      });
    }
    await prisma.aIUsageLog.create({
      data: clean({
        orgId: body.orgId,
        userId,
        role,
        provider: currentAIProviderType(),
        requestType,
        promptSummary: body.prompt.slice(0, 120),
        responseSummary: summarizeAIResponse(result.response),
        tokenEstimate: result.tokenEstimate,
        quotaConsumed: result.quotaConsumed,
        imageCount: requestType === "IMAGE" ? 1 : 0,
        createdPlanId: createdPlan?.id,
        safetyFlags: result.safetyFlags,
      }),
    });
    await writeAuditLog({
      request,
      orgId: body.orgId,
      actorUserId: userId,
      action: "ai.request.completed",
      entityType: createdPlan ? "plan_content" : "ai_request",
      ...(createdPlan?.id ? { entityId: createdPlan.id } : {}),
      metadata: {
        requestType,
        prompt: body.prompt,
        completion: result.response,
        safetyFlags: result.safetyFlags,
      },
    });
    return ok({ ...result, ...(createdPlan ? { createdPlan } : {}) });
  }
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "ai", "usage"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgAnyPermission(ctx, orgId, ["AI_MANAGE_SETTINGS", "ORG_VIEW_REPORTS"]);
    return ok({
      usage: await prisma.aIUsageLog.findMany({
        where: { orgId },
        take: 50,
        orderBy: { createdAt: "desc" },
      }),
    });
  }
  return undefined;
}
