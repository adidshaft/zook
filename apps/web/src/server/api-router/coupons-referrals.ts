import type { NextRequest } from "next/server";
import {
  couponSchema,
  offerSchema,
  referralCodeManageSchema,
  referralPolicySchema,
  type OrgRole,
} from "@zook/core";
import { prisma } from "@zook/db";
import { getRequestContext, requireAuth, requireOrgPermission } from "../access";
import { forbiddenError, notFoundError, validationError } from "../errors";
import { fail, ok, readJson } from "../response";
import { writeAuditLog } from "../audit";
import { assertRateLimit } from "../rate-limit";
import { getPublicCouponPreview } from "../public-gym-read-models";
import {
  ADMIN_DETAIL_LIST_LIMIT,
  ANALYTICS_SUMMARY_LIST_LIMIT,
  clean,
  flagReferralAbuseIfNeeded,
  generateUniqueReferralCode,
  pathMatches,
  publicCouponValidateSchema,
  redeemReferralCodeForUser,
  referralRedeemSchema,
} from "./core";

export async function handleCouponsReferrals(request: NextRequest, path: string[]) {
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "offers"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgPermission(ctx, orgId, "COUPONS_MANAGE");
    return ok({
      offers: await prisma.offer.findMany({
        where: { orgId },
        orderBy: [{ active: "desc" }, { startsAt: "desc" }],
      }),
    });
  }
  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "offers"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "COUPONS_MANAGE");
    const body = offerSchema.parse(await readJson(request));
    const startsAt = new Date(body.startsAt);
    const endsAt = new Date(body.endsAt);
    if (endsAt <= startsAt) {
      throw validationError("Offer end date must be after the start date.");
    }
    if (body.discountType === "PERCENTAGE" && body.discountValue > 10_000) {
      throw validationError("Percentage offers cannot exceed 100%.");
    }
    if (body.applicablePlanIds?.length) {
      const planCount = await prisma.membershipPlan.count({
        where: { orgId, id: { in: body.applicablePlanIds } },
      });
      if (planCount !== body.applicablePlanIds.length) {
        throw notFoundError("One or more offer plans were not found.");
      }
    }
    const offer = await prisma.offer.create({
      data: clean({
        orgId,
        name: body.name,
        description: body.description,
        discountType: body.discountType,
        discountValue: body.discountValue,
        applicablePlans: body.applicablePlanIds?.length ? body.applicablePlanIds : undefined,
        startsAt,
        endsAt,
        maxRedemptions: body.maxRedemptions,
        active: body.active,
        stackable: body.stackable,
        createdById: userId,
      }),
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "offer.created",
      entityType: "offer",
      entityId: offer.id,
      metadata: { name: offer.name, active: offer.active },
    });
    return ok({ offer });
  }
  if (request.method === "PATCH" && pathMatches(path, ["orgs", /.+/, "offers", /.+/])) {
    const orgId = path[1]!;
    const offerId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "COUPONS_MANAGE");
    const body = offerSchema.partial().parse(await readJson(request));
    const existingOffer = await prisma.offer.findFirst({ where: { id: offerId, orgId } });
    if (!existingOffer) {
      throw notFoundError("Offer not found");
    }
    const startsAt = body.startsAt ? new Date(body.startsAt) : existingOffer.startsAt;
    const endsAt = body.endsAt ? new Date(body.endsAt) : existingOffer.endsAt;
    if (endsAt <= startsAt) {
      throw validationError("Offer end date must be after the start date.");
    }
    if (body.discountType === "PERCENTAGE" && body.discountValue && body.discountValue > 10_000) {
      throw validationError("Percentage offers cannot exceed 100%.");
    }
    if (body.applicablePlanIds?.length) {
      const planCount = await prisma.membershipPlan.count({
        where: { orgId, id: { in: body.applicablePlanIds } },
      });
      if (planCount !== body.applicablePlanIds.length) {
        throw notFoundError("One or more offer plans were not found.");
      }
    }
    const offer = await prisma.offer.update({
      where: { id: existingOffer.id },
      data: clean({
        name: body.name,
        description: body.description,
        discountType: body.discountType,
        discountValue: body.discountValue,
        applicablePlans: body.applicablePlanIds ? body.applicablePlanIds : undefined,
        startsAt: body.startsAt ? startsAt : undefined,
        endsAt: body.endsAt ? endsAt : undefined,
        maxRedemptions: body.maxRedemptions,
        active: body.active,
        stackable: body.stackable,
      }),
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "offer.updated",
      entityType: "offer",
      entityId: offer.id,
      metadata: { name: offer.name, active: offer.active },
    });
    return ok({ offer });
  }
  if (request.method === "DELETE" && pathMatches(path, ["orgs", /.+/, "offers", /.+/])) {
    const orgId = path[1]!;
    const offerId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "COUPONS_MANAGE");
    const existingOffer = await prisma.offer.findFirst({ where: { id: offerId, orgId } });
    if (!existingOffer) {
      throw notFoundError("Offer not found");
    }
    const offer = await prisma.offer.update({
      where: { id: existingOffer.id },
      data: { active: false },
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "offer.deactivated",
      entityType: "offer",
      entityId: offer.id,
      metadata: { name: offer.name },
    });
    return ok({ offer });
  }
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "referral-policy"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgPermission(ctx, orgId, "REFERRALS_MANAGE");
    const policy = await prisma.referralPolicy.upsert({
      where: { orgId },
      update: {},
      create: { orgId },
    });
    return ok({ policy });
  }
  if (request.method === "PATCH" && pathMatches(path, ["orgs", /.+/, "referral-policy"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "REFERRALS_MANAGE");
    const body = referralPolicySchema.partial().parse(await readJson(request));
    const policyDefaults = {
      enabled: true,
      referrerRewardType: "DAYS" as const,
      referrerRewardValue: 7,
      referredDiscountType: "PERCENTAGE" as const,
      referredDiscountValue: 1000,
      maxDiscountCapBps: 3000,
      maxReferralsPerMonth: 10,
      referralCodeExpiryDays: 90,
      trainerReferralEnabled: true,
      staffReferralEnabled: false,
    };
    const policy = await prisma.referralPolicy.upsert({
      where: { orgId },
      update: clean({ ...body, updatedById: userId }),
      create: {
        orgId,
        enabled: body.enabled ?? policyDefaults.enabled,
        referrerRewardType: body.referrerRewardType ?? policyDefaults.referrerRewardType,
        referrerRewardValue: body.referrerRewardValue ?? policyDefaults.referrerRewardValue,
        referredDiscountType: body.referredDiscountType ?? policyDefaults.referredDiscountType,
        referredDiscountValue: body.referredDiscountValue ?? policyDefaults.referredDiscountValue,
        maxDiscountCapBps: body.maxDiscountCapBps ?? policyDefaults.maxDiscountCapBps,
        maxReferralsPerMonth: body.maxReferralsPerMonth ?? policyDefaults.maxReferralsPerMonth,
        referralCodeExpiryDays:
          body.referralCodeExpiryDays ?? policyDefaults.referralCodeExpiryDays,
        trainerReferralEnabled:
          body.trainerReferralEnabled ?? policyDefaults.trainerReferralEnabled,
        staffReferralEnabled: body.staffReferralEnabled ?? policyDefaults.staffReferralEnabled,
        updatedById: userId,
      },
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "referral_policy.updated",
      entityType: "referral_policy",
      entityId: policy.id,
      metadata: {
        enabled: policy.enabled,
        referrerRewardType: policy.referrerRewardType,
        referredDiscountType: policy.referredDiscountType,
      },
    });
    return ok({ policy });
  }
  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "coupons", "validate"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    await assertRateLimit(
      "couponValidateByIp",
      `${orgId}:${ctx.ipAddress ?? "unknown"}`,
      "Too many coupon validation attempts. Please try again shortly.",
    );
    const body = publicCouponValidateSchema.parse(await readJson(request));
    const plan = await prisma.membershipPlan.findFirst({
      where: { id: body.planId, orgId, active: true, publicVisible: true },
      select: { id: true, pricePaise: true },
    });
    if (!plan) {
      throw notFoundError("Plan not found");
    }
    try {
      const preview = await getPublicCouponPreview({
        orgId,
        planId: plan.id,
        couponCode: body.code,
        amountPaise: plan.pricePaise,
        ...(ctx.userId ? { userId: ctx.userId } : {}),
      });
      if (!preview) {
        return fail("coupon_invalid", "Coupon code is not valid for this gym.", 404);
      }
      return ok({
        coupon: { code: preview.code },
        discountPaise: preview.discountPaise,
        finalAmountPaise: preview.finalAmountPaise,
      });
    } catch (error) {
      return fail(
        "coupon_invalid",
        error instanceof Error ? error.message : "Coupon code is not valid for this gym.",
        400,
      );
    }
  }
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "coupons"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgPermission(ctx, orgId, "COUPONS_MANAGE");
    return ok({
      coupons: await prisma.coupon.findMany({
        where: { orgId },
        orderBy: { createdAt: "desc" },
        take: ADMIN_DETAIL_LIST_LIMIT,
      }),
    });
  }
  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "coupons"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "COUPONS_MANAGE");
    const body = couponSchema.parse(await readJson(request));
    const coupon = await prisma.coupon.create({
      data: clean({
        orgId,
        code: body.code,
        type: body.type,
        valuePaise: body.valuePaise,
        valuePercentBps: body.valuePercentBps,
        maxRedemptions: body.maxRedemptions,
        perUserLimit: body.perUserLimit,
        applicablePlanId: body.applicablePlanId,
        active: body.active,
        validFrom: body.validFrom ? new Date(body.validFrom) : undefined,
        validUntil: body.validUntil ? new Date(body.validUntil) : undefined,
        createdById: userId,
      }),
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "coupon.created",
      entityType: "coupon",
      entityId: coupon.id,
      metadata: { code: coupon.code },
    });
    return ok({ coupon });
  }
  if (request.method === "PATCH" && pathMatches(path, ["orgs", /.+/, "coupons", /.+/])) {
    const orgId = path[1]!;
    const couponId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "COUPONS_MANAGE");
    const body = couponSchema.partial().parse(await readJson(request));
    const existingCoupon = await prisma.coupon.findFirst({ where: { id: couponId, orgId } });
    if (!existingCoupon) {
      throw notFoundError("Coupon not found");
    }
    const coupon = await prisma.coupon.update({
      where: { id: existingCoupon.id },
      data: clean({
        code: body.code,
        type: body.type,
        valuePaise: body.valuePaise,
        valuePercentBps: body.valuePercentBps,
        maxRedemptions: body.maxRedemptions,
        perUserLimit: body.perUserLimit,
        applicablePlanId: body.applicablePlanId,
        active: body.active,
        validFrom: body.validFrom ? new Date(body.validFrom) : undefined,
        validUntil: body.validUntil ? new Date(body.validUntil) : undefined,
      }),
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "coupon.updated",
      entityType: "coupon",
      entityId: coupon.id,
      metadata: { code: coupon.code, active: coupon.active },
    });
    return ok({ coupon });
  }
  if (request.method === "DELETE" && pathMatches(path, ["orgs", /.+/, "coupons", /.+/])) {
    const orgId = path[1]!;
    const couponId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "COUPONS_MANAGE");
    const existingCoupon = await prisma.coupon.findFirst({ where: { id: couponId, orgId } });
    if (!existingCoupon) {
      throw notFoundError("Coupon not found");
    }
    const coupon = await prisma.coupon.update({
      where: { id: existingCoupon.id },
      data: { active: false },
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "coupon.deactivated",
      entityType: "coupon",
      entityId: coupon.id,
      metadata: { code: coupon.code },
    });
    return ok({ coupon });
  }
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "referrals"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgPermission(ctx, orgId, "REFERRALS_MANAGE");
    const referrals = await prisma.referralCode.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    const [users, coupons] = await Promise.all([
      prisma.user.findMany({
        where: { id: { in: referrals.map((referral) => referral.referrerUserId) } },
      }),
      prisma.coupon.findMany({
        where: {
          id: { in: referrals.map((referral) => referral.couponId).filter(Boolean) as string[] },
        },
      }),
    ]);
    return ok({ referrals, users, coupons });
  }
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "referral-analytics"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgPermission(ctx, orgId, "REFERRALS_MANAGE");
    const startOfMonth = new Date();
    startOfMonth.setUTCDate(1);
    startOfMonth.setUTCHours(0, 0, 0, 0);
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [codes, redemptions, rewards, recentRedemptions, openFlags] = await Promise.all([
      prisma.referralCode.findMany({
        where: { orgId },
        orderBy: { redemptionCount: "desc" },
        take: 25,
      }),
      prisma.referralRedemption.findMany({
        where: { orgId, createdAt: { gte: startOfMonth } },
        orderBy: { createdAt: "desc" },
        take: ANALYTICS_SUMMARY_LIST_LIMIT,
      }),
      prisma.referralReward.findMany({
        where: { orgId, createdAt: { gte: startOfMonth } },
        orderBy: { createdAt: "desc" },
        take: ANALYTICS_SUMMARY_LIST_LIMIT,
      }),
      prisma.referralRedemption.findMany({
        where: { orgId, createdAt: { gte: last24h } },
        select: { referralCodeId: true, referredUserId: true, metadata: true },
      }),
      prisma.organizationAbuseFlag.findMany({
        where: { orgId, type: "referral_velocity", status: "open" },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);
    const topReferrerIds = [...new Set(codes.slice(0, 5).map((code) => code.referrerUserId))];
    const users = await prisma.user.findMany({ where: { id: { in: topReferrerIds } } });
    const recentByCode = new Map<string, typeof recentRedemptions>();
    for (const redemption of recentRedemptions) {
      recentByCode.set(redemption.referralCodeId, [
        ...(recentByCode.get(redemption.referralCodeId) ?? []),
        redemption,
      ]);
    }
    return ok({
      summary: {
        activeCodes: codes.filter((code) => code.status === "active").length,
        redemptionsThisMonth: redemptions.length,
        rewardCreditsThisMonth: rewards.reduce((total, reward) => total + reward.rewardValue, 0),
        appliedRewardsThisMonth: rewards.filter((reward) => reward.status === "applied").length,
        openAbuseFlags: openFlags.length,
      },
      topReferrers: codes.slice(0, 5).map((code) => ({
        code,
        user: users.find((user) => user.id === code.referrerUserId) ?? null,
        abuseSignals: {
          redemptions24h: recentByCode.get(code.id)?.length ?? 0,
          uniqueInviteePhones: new Set(
            (recentByCode.get(code.id) ?? [])
              .map((redemption) =>
                typeof redemption.metadata === "object" &&
                redemption.metadata &&
                "phone" in redemption.metadata
                  ? String(redemption.metadata.phone)
                  : "",
              )
              .filter(Boolean),
          ).size,
          suspiciousClustering: (recentByCode.get(code.id)?.length ?? 0) > 5,
        },
      })),
      pendingRewards: rewards
        .filter((reward) => reward.status === "pending")
        .slice(0, 10)
        .map((reward) => ({
          id: reward.id,
          referrerUserId: reward.referrerUserId,
          referralCodeId: reward.referralCodeId,
          rewardType: reward.rewardType,
          rewardValue: reward.rewardValue,
          status: reward.status,
          createdAt: reward.createdAt,
        })),
      openFlags,
    });
  }
  if (
    request.method === "POST" &&
    pathMatches(path, ["orgs", /.+/, "referral-rewards", /.+/, "mark-paid"])
  ) {
    const orgId = path[1]!;
    const rewardId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "REFERRALS_MANAGE");
    const reward = await prisma.referralReward.findFirst({ where: { id: rewardId, orgId } });
    if (!reward) {
      throw notFoundError("Referral reward not found");
    }
    const updated = await prisma.referralReward.update({
      where: { id: reward.id },
      data: { status: "applied", appliedAt: new Date() },
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "referral_reward.marked_paid",
      entityType: "referral_reward",
      entityId: reward.id,
      metadata: { referrerUserId: reward.referrerUserId, rewardType: reward.rewardType },
    });
    return ok({ reward: updated });
  }
  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "referrals", "redeem"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireAuth(ctx);
    await assertRateLimit(
      "referralRedeemByActor",
      `${orgId}:${userId}`,
      "Too many referral redemption attempts from this account.",
    );
    const body = referralRedeemSchema.parse(await readJson(request));
    const { referral, redemption, alreadyRedeemed } = await redeemReferralCodeForUser({
      orgId,
      userId,
      code: body.code,
      ctx,
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: alreadyRedeemed ? "referral.redeem_replayed" : "referral.redeemed",
      entityType: "referral_redemption",
      entityId: redemption.id,
      metadata: { code: referral.code, referralCodeId: referral.id },
    });
    if (!alreadyRedeemed) {
      await flagReferralAbuseIfNeeded({
        orgId,
        referralCodeId: referral.id,
        referredUserId: userId,
      });
    }
    return ok({ referral, redemption, alreadyRedeemed });
  }
  if (
    request.method === "POST" &&
    (pathMatches(path, ["orgs", /.+/, "referrals"]) ||
      pathMatches(path, ["orgs", /.+/, "referral-codes"]))
  ) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireAuth(ctx);
    if (ctx.orgId !== orgId || !ctx.roles.length) {
      throw forbiddenError("No organization access");
    }
    const canManage = ctx.permissions.includes("REFERRALS_MANAGE");
    const body = referralCodeManageSchema.parse(await readJson(request).catch(() => ({})));
    if ((body.referrerUserId || body.createdByRole || body.couponId) && !canManage) {
      throw forbiddenError("Referral management permission required.");
    }
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { username: true },
    });
    if (!org) {
      return fail("NOT_FOUND", "Gym not found", 404);
    }
    const policy = await prisma.referralPolicy.upsert({
      where: { orgId },
      update: {},
      create: { orgId },
    });
    if (!policy.enabled) {
      throw validationError("Referral program is not active for this gym.");
    }
    const referrerUserId = canManage && body.referrerUserId ? body.referrerUserId : userId;
    const createdByRole = (body.createdByRole ?? ctx.roles[0] ?? "MEMBER") as OrgRole;
    if (createdByRole === "TRAINER" && !policy.trainerReferralEnabled) {
      throw validationError("Trainer referrals are not enabled.");
    }
    if (
      (createdByRole === "ADMIN" || createdByRole === "RECEPTIONIST") &&
      !policy.staffReferralEnabled
    ) {
      throw validationError("Staff referrals are not enabled.");
    }
    if (body.couponId) {
      const coupon = await prisma.coupon.findFirst({ where: { id: body.couponId, orgId } });
      if (!coupon) {
        throw notFoundError("Coupon not found");
      }
    }
    const code = body.code ?? (await generateUniqueReferralCode(referrerUserId));
    const referral = await prisma.referralCode.create({
      data: clean({
        orgId,
        referrerUserId,
        code,
        couponId: body.couponId,
        createdByRole,
        autoGenerated: !body.code,
        displayName: body.displayName,
        maxUses: body.maxUses ?? 20,
        expiresAt: body.expiresAt
          ? new Date(body.expiresAt)
          : policy.referralCodeExpiryDays > 0
            ? new Date(Date.now() + policy.referralCodeExpiryDays * 24 * 60 * 60 * 1000)
            : undefined,
        status: body.status ?? "active",
        lastResetAt: new Date(),
      }),
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "referral.created",
      entityType: "referral_code",
      entityId: referral.id,
      metadata: { code: referral.code, createdByRole: referral.createdByRole },
    });
    return ok({
      referral,
      links: { web: `/join/${org.username}?ref=${code}`, short: `/r/${code}` },
    });
  }
  if (request.method === "PATCH" && pathMatches(path, ["orgs", /.+/, "referrals", /.+/])) {
    const orgId = path[1]!;
    const referralId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "REFERRALS_MANAGE");
    const body = referralCodeManageSchema.partial().parse(await readJson(request));
    const existingReferral = await prisma.referralCode.findFirst({
      where: { id: referralId, orgId },
    });
    if (!existingReferral) {
      throw notFoundError("Referral code not found");
    }
    if (body.couponId) {
      const coupon = await prisma.coupon.findFirst({ where: { id: body.couponId, orgId } });
      if (!coupon) {
        throw notFoundError("Coupon not found");
      }
    }
    const referral = await prisma.referralCode.update({
      where: { id: existingReferral.id },
      data: clean({
        code: body.code,
        referrerUserId: body.referrerUserId,
        couponId: body.couponId,
        createdByRole: body.createdByRole,
        displayName: body.displayName,
        maxUses: body.maxUses,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : body.expiresAt,
        status: body.status,
      }),
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "referral.updated",
      entityType: "referral_code",
      entityId: referral.id,
      metadata: { code: referral.code, status: referral.status },
    });
    return ok({ referral });
  }
  if (request.method === "GET" && pathMatches(path, ["r", /.+/])) {
    const referral = await prisma.referralCode.findUnique({ where: { code: path[1]! } });
    if (!referral) return fail("NOT_FOUND", "Referral not found", 404);
    const org = await prisma.organization.findUnique({ where: { id: referral.orgId } });
    return ok({ referral, org });
  }
  if (request.method === "POST" && pathMatches(path, ["referrals", /.+/, "redeem"])) {
    const code = path[1]!.trim().toUpperCase();
    const referralRecord = await prisma.referralCode.findUnique({ where: { code } });
    if (!referralRecord) {
      throw notFoundError("Referral not found");
    }
    const orgId = referralRecord.orgId;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireAuth(ctx);
    await assertRateLimit(
      "referralRedeemByActor",
      `${orgId}:${userId}:${code}`,
      "Too many referral redemption attempts from this account.",
    );
    const { referral, redemption, alreadyRedeemed } = await redeemReferralCodeForUser({
      orgId,
      userId,
      code,
      ctx,
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: alreadyRedeemed ? "referral.redeem_replayed" : "referral.redeemed",
      entityType: "referral_redemption",
      entityId: redemption.id,
      metadata: { code: referral.code, referralCodeId: referral.id },
    });
    if (!alreadyRedeemed) {
      await flagReferralAbuseIfNeeded({
        orgId,
        referralCodeId: referral.id,
        referredUserId: userId,
      });
    }
    return ok({ referral, redemption, alreadyRedeemed });
  }
  return undefined;
}
