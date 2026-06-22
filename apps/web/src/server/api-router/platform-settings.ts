import type { NextRequest } from "next/server";
import { z } from "zod";
import { Prisma, prisma } from "@zook/db";
import { getRequestContext, requirePlatformAdmin } from "../access";
import { writeAuditLog } from "../audit";
import { pricingFromPlanCatalog } from "../domains/billing/saas-plans";
import { ok, readJson } from "../response";
import {
  getSaasPlanCatalog,
  pathMatches,
  platformReferralPolicySchema,
  platformSaasPricingSchema,
} from "./core";

export async function handlePlatformSettings(request: NextRequest, path: string[]) {
  if (request.method === "GET" && pathMatches(path, ["platform", "saas-pricing"])) {
    const ctx = await getRequestContext(request);
    requirePlatformAdmin(ctx);
    const planCatalog = await getSaasPlanCatalog();
    return ok({ pricing: pricingFromPlanCatalog(planCatalog), planCatalog });
  }

  if (request.method === "PATCH" && pathMatches(path, ["platform", "saas-pricing"])) {
    const ctx = await getRequestContext(request);
    const actorUserId = requirePlatformAdmin(ctx);
    const body = platformSaasPricingSchema.parse(await readJson(request));
    const setting = await prisma.platformSetting.upsert({
      where: { key: "saas.pricing" },
      create: {
        key: "saas.pricing",
        value: body as Prisma.InputJsonValue,
        updatedById: actorUserId,
      },
      update: {
        value: body as Prisma.InputJsonValue,
        updatedById: actorUserId,
      },
    });
    await writeAuditLog({
      request,
      actorUserId,
      action: "platform.saas_pricing_updated",
      entityType: "platform_setting",
      entityId: setting.id,
      riskLevel: "HIGH",
      metadata: { key: setting.key },
    });
    const planCatalog = await getSaasPlanCatalog();
    return ok({ pricing: pricingFromPlanCatalog(planCatalog), planCatalog, setting });
  }

  if (request.method === "GET" && pathMatches(path, ["platform", "referral-policy"])) {
    const ctx = await getRequestContext(request);
    requirePlatformAdmin(ctx);
    const setting = await prisma.platformSetting.findUnique({
      where: { key: "platform.referralPolicy" },
    });
    return ok({
      policy:
        setting?.value ??
        ({
          enabled: true,
          referrerRewardType: "TRIAL_DAYS",
          referrerRewardValue: 30,
          referredRewardType: "TRIAL_DAYS",
          referredRewardValue: 30,
          nonOwnerSemiannualRewardPaise: 250_000,
          nonOwnerYearlyRewardPaise: 500_000,
          ownerRewardDays: 30,
          qualifyingCycles: ["SEMIANNUAL", "YEARLY"],
          clawbackWindowDays: 14,
          minWithdrawalPaise: 100_000,
          maxRewardsPerUserPerMonth: 10,
          maxRedemptionsPerOrg: 25,
          expiresInDays: 180,
        } satisfies z.infer<typeof platformReferralPolicySchema>),
    });
  }

  if (request.method === "PATCH" && pathMatches(path, ["platform", "referral-policy"])) {
    const ctx = await getRequestContext(request);
    const actorUserId = requirePlatformAdmin(ctx);
    const body = platformReferralPolicySchema.parse(await readJson(request));
    const setting = await prisma.platformSetting.upsert({
      where: { key: "platform.referralPolicy" },
      create: {
        key: "platform.referralPolicy",
        value: body as Prisma.InputJsonValue,
        updatedById: actorUserId,
      },
      update: {
        value: body as Prisma.InputJsonValue,
        updatedById: actorUserId,
      },
    });
    await writeAuditLog({
      request,
      actorUserId,
      action: "platform.referral_policy_updated",
      entityType: "platform_setting",
      entityId: setting.id,
      riskLevel: "HIGH",
      metadata: body,
    });
    return ok({ policy: body, setting });
  }

  return undefined;
}
