import type { NextRequest } from "next/server";
import { z } from "zod";
import { publicUserEmail } from "@zook/core";
import { getPaymentProviderDiagnostics } from "@zook/core/providers";
import { Prisma, prisma } from "@zook/db";
import { getRequestContext, requireAuth } from "../access";
import { conflictError, forbiddenError, notFoundError, validationError } from "../errors";
import { applyPaymentSessionStatus } from "../payment-runtime";
import { assertRateLimit } from "../rate-limit";
import { fail, ok, readJson } from "../response";
import {
  assertActiveContextOrg,
  assertSaasMemberCapacity,
  clean,
  createDirectNotification,
  deriveAutopayBillingCadence,
  ensureOrganizationMembership,
  ensureOrganizationMembershipWithClient,
  getObjectMetadata,
  getPaymentProviderOrThrow,
  liveMandateStatuses,
  pathMatches,
  providerMandateStatusToLocal,
  resolveActiveOffer,
  resolveOrgBranch,
  resolveReferralPricing,
  resolveValidatedCoupon,
  resolveValidatedReferral,
  startPaymentSessionCheckout,
} from "./core";

const subscriptionCheckoutSchema = z.object({
  planId: z.string(),
  couponCode: z.string().trim().toUpperCase().optional(),
  referralCode: z.string().trim().toUpperCase().optional(),
});

const subscriptionRenewSchema = z.object({
  planId: z.string().optional(),
  couponCode: z.string().trim().toUpperCase().optional(),
  referralCode: z.string().trim().toUpperCase().optional(),
});

const membershipAutopaySchema = z.object({
  planId: z.string().optional(),
});

export async function handleMembershipPayments(request: NextRequest, path: string[]) {
  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "subscriptions"])) {
    const ctx = await getRequestContext(request);
    const userId = requireAuth(ctx);
    await assertRateLimit(
      "paymentSessionByActor",
      `${path[1]!}:${userId}`,
      "Too many membership payment attempts.",
    );
    const orgId = path[1]!;
    const body = subscriptionCheckoutSchema.parse(await readJson(request));
    const [organization, plan, existingSubscription, approvedJoinRequest, user] = await Promise.all(
      [
        prisma.organization.findUnique({ where: { id: orgId } }),
        prisma.membershipPlan.findFirst({ where: { id: body.planId, orgId, active: true } }),
        prisma.memberSubscription.findFirst({
          where: { orgId, memberUserId: userId, status: { in: ["PENDING_PAYMENT", "ACTIVE"] } },
          orderBy: { createdAt: "desc" },
        }),
        prisma.membershipJoinRequest.findFirst({
          where: { orgId, userId, status: "approved" },
          orderBy: { reviewedAt: "desc" },
        }),
        prisma.user.findUniqueOrThrow({ where: { id: userId } }),
      ],
    );
    if (!organization || !plan) {
      return fail("NOT_FOUND", "Plan not found", 404);
    }
    const branch = await resolveOrgBranch(orgId, plan.branchId);
    if (
      organization.status === "SUSPENDED" ||
      organization.status === "CANCELLED" ||
      organization.status === "TRIAL_EXPIRED"
    ) {
      throw forbiddenError("This gym is not accepting new membership purchases right now.");
    }
    if (existingSubscription) {
      throw conflictError("You already have a membership in progress for this gym.");
    }
    await assertSaasMemberCapacity(orgId, userId);
    const referral = await resolveValidatedReferral({
      orgId,
      userId,
      ctx,
      ...(body.referralCode ? { referralCode: body.referralCode } : {}),
    });
    if (organization.joinMode === "APPROVAL_REQUIRED" && !approvedJoinRequest) {
      throw forbiddenError("This gym requires approval before payment.");
    }
    if (organization.joinMode === "INVITE_ONLY" && !referral) {
      throw forbiddenError("Invite-only gyms require a valid referral or invite code.");
    }
    const pricing = await resolveValidatedCoupon({
      orgId,
      userId,
      planId: plan.id,
      amountPaise: plan.pricePaise,
      ...(body.couponCode ? { couponCode: body.couponCode } : {}),
      ...(referral?.couponId ? { fallbackCouponId: referral.couponId } : {}),
    });
    const offerPricing = await resolveActiveOffer({
      orgId,
      planId: plan.id,
      amountPaise: plan.pricePaise,
    });
    const referralPricing = await resolveReferralPricing({
      orgId,
      amountPaise: plan.pricePaise,
      couponDiscountPaise: pricing.discountPaise + offerPricing.discountPaise,
      ...(referral ? { referralCodeId: referral.id } : {}),
    });
    const subscription = await prisma.memberSubscription.create({
      data: {
        orgId,
        branchId: branch.id,
        memberUserId: userId,
        planId: plan.id,
        status: "PENDING_PAYMENT",
      },
    });
    const session = await prisma.paymentSession.create({
      data: {
        orgId,
        branchId: branch.id,
        userId,
        purpose: "MEMBERSHIP",
        amountPaise: referralPricing.finalAmountPaise,
        status: "CREATED",
        checkoutUrl: "",
        provider: getPaymentProviderDiagnostics().selectedProvider,
        metadata: clean({
          branchId: branch.id,
          subscriptionId: subscription.id,
          offerId: offerPricing.offer?.id,
          offerDiscountPaise: offerPricing.discountPaise,
          couponId: pricing.coupon?.id,
          couponDiscountPaise: pricing.discountPaise,
          referralCodeId: referral?.id,
          referralDiscountPaise: referralPricing.referralDiscountPaise,
          joinRequestId: approvedJoinRequest?.id,
        }) as Prisma.InputJsonValue,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });
    if (session.amountPaise === 0) {
      const processed = await applyPaymentSessionStatus({
        sessionId: session.id,
        nextStatus: "SUCCEEDED",
        provider: "internal",
        providerRef: `zero_${session.id}`,
        paymentMode: "OTHER",
        expectedAmountPaise: 0,
        createNotification: createDirectNotification,
        ensureMembership: (membershipInput, tx) =>
          tx
            ? ensureOrganizationMembershipWithClient(tx, membershipInput)
            : ensureOrganizationMembership(membershipInput),
      });
      const activatedSubscription = await prisma.memberSubscription.findUnique({
        where: { id: subscription.id },
      });
      return ok({
        subscription: activatedSubscription ?? subscription,
        checkoutUrl: `/checkout/${processed.session.id}`,
        checkoutData: null,
        session: processed.session,
      });
    }
    getPaymentProviderOrThrow();
    let started;
    try {
      started = await startPaymentSessionCheckout({
        session,
        customer: clean({
          name: user.name,
          email: publicUserEmail(user.email),
          phone: user.phone ?? undefined,
        }),
      });
    } catch (error) {
      await prisma.$transaction([
        prisma.paymentSession.update({
          where: { id: session.id },
          data: { status: "FAILED", completedAt: new Date() },
        }),
        prisma.memberSubscription.update({
          where: { id: subscription.id },
          data: { status: "CANCELLED" },
        }),
      ]);
      throw error;
    }
    return ok({
      subscription,
      checkoutUrl: started.checkoutUrl,
      checkoutData: started.checkout.checkoutData ?? null,
      session: started.session,
    });
  }

  if (request.method === "POST" && pathMatches(path, ["me", "memberships", /.+/, "renew"])) {
    const subscriptionId = path[2]!;
    const ctx = await getRequestContext(request);
    const userId = requireAuth(ctx);
    const body = subscriptionRenewSchema.parse(await readJson(request).catch(() => ({})));
    await assertRateLimit(
      "paymentSessionByActor",
      `renew:${subscriptionId}:${userId}`,
      "Too many membership renewal attempts.",
    );
    const currentSubscription = await prisma.memberSubscription.findFirst({
      where: { id: subscriptionId, memberUserId: userId },
    });
    if (!currentSubscription) {
      throw notFoundError("Membership not found");
    }
    const orgId = currentSubscription.orgId;
    assertActiveContextOrg(ctx, orgId);
    const [organization, currentPlan, selectedPlan, pendingRenewal, user] = await Promise.all([
      prisma.organization.findUnique({ where: { id: orgId } }),
      prisma.membershipPlan.findFirst({ where: { id: currentSubscription.planId, orgId } }),
      body.planId
        ? prisma.membershipPlan.findFirst({ where: { id: body.planId, orgId, active: true } })
        : Promise.resolve(null),
      prisma.memberSubscription.findFirst({
        where: {
          orgId,
          memberUserId: userId,
          status: "PENDING_PAYMENT",
          notes: { contains: `renewal:${subscriptionId}` },
        },
      }),
      prisma.user.findUniqueOrThrow({ where: { id: userId } }),
    ]);
    const plan = selectedPlan ?? currentPlan;
    if (!organization || !plan) {
      throw notFoundError("Renewal plan not found");
    }
    if (pendingRenewal) {
      throw conflictError("You already have a renewal payment in progress.");
    }
    const referral = await resolveValidatedReferral({
      orgId,
      userId,
      ctx,
      ...(body.referralCode ? { referralCode: body.referralCode } : {}),
    });
    const pricing = await resolveValidatedCoupon({
      orgId,
      userId,
      planId: plan.id,
      amountPaise: plan.pricePaise,
      ...(body.couponCode ? { couponCode: body.couponCode } : {}),
      ...(referral?.couponId ? { fallbackCouponId: referral.couponId } : {}),
    });
    const offerPricing = await resolveActiveOffer({
      orgId,
      planId: plan.id,
      amountPaise: plan.pricePaise,
    });
    const referralPricing = await resolveReferralPricing({
      orgId,
      amountPaise: plan.pricePaise,
      couponDiscountPaise: pricing.discountPaise + offerPricing.discountPaise,
      ...(referral ? { referralCodeId: referral.id } : {}),
    });
    const branch = await resolveOrgBranch(orgId, plan.branchId ?? currentSubscription.branchId);
    const subscription = await prisma.memberSubscription.create({
      data: {
        orgId,
        branchId: branch.id,
        memberUserId: userId,
        planId: plan.id,
        status: "PENDING_PAYMENT",
        notes: `renewal:${subscriptionId}`,
      },
    });
    const session = await prisma.paymentSession.create({
      data: {
        orgId,
        branchId: branch.id,
        userId,
        purpose: "MEMBERSHIP",
        amountPaise: referralPricing.finalAmountPaise,
        status: "CREATED",
        checkoutUrl: "",
        provider: getPaymentProviderDiagnostics().selectedProvider,
        metadata: clean({
          branchId: branch.id,
          subscriptionId: subscription.id,
          renewalOfSubscriptionId: subscriptionId,
          offerId: offerPricing.offer?.id,
          offerDiscountPaise: offerPricing.discountPaise,
          couponId: pricing.coupon?.id,
          couponDiscountPaise: pricing.discountPaise,
          referralCodeId: referral?.id,
          referralDiscountPaise: referralPricing.referralDiscountPaise,
        }) as Prisma.InputJsonValue,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });
    if (session.amountPaise === 0) {
      const processed = await applyPaymentSessionStatus({
        sessionId: session.id,
        nextStatus: "SUCCEEDED",
        provider: "internal",
        providerRef: `zero_${session.id}`,
        paymentMode: "OTHER",
        expectedAmountPaise: 0,
        createNotification: createDirectNotification,
        ensureMembership: (membershipInput, tx) =>
          tx
            ? ensureOrganizationMembershipWithClient(tx, membershipInput)
            : ensureOrganizationMembership(membershipInput),
      });
      const activatedSubscription = await prisma.memberSubscription.findUnique({
        where: { id: subscription.id },
      });
      return ok({
        subscription: activatedSubscription ?? subscription,
        checkoutUrl: `/checkout/${processed.session.id}`,
        checkoutData: null,
        session: processed.session,
      });
    }
    getPaymentProviderOrThrow();
    let started;
    try {
      started = await startPaymentSessionCheckout({
        session,
        customer: clean({
          name: user.name,
          email: publicUserEmail(user.email),
          phone: user.phone ?? undefined,
        }),
      });
    } catch (error) {
      await prisma.$transaction([
        prisma.paymentSession.update({
          where: { id: session.id },
          data: { status: "FAILED", completedAt: new Date() },
        }),
        prisma.memberSubscription.update({
          where: { id: subscription.id },
          data: { status: "CANCELLED" },
        }),
      ]);
      throw error;
    }
    return ok({
      subscription,
      checkoutUrl: started.checkoutUrl,
      checkoutData: started.checkout.checkoutData ?? null,
      session: started.session,
    });
  }

  if (request.method === "POST" && pathMatches(path, ["me", "memberships", /.+/, "autopay"])) {
    const subscriptionId = path[2]!;
    const ctx = await getRequestContext(request);
    const userId = requireAuth(ctx);
    const body = membershipAutopaySchema.parse(await readJson(request).catch(() => ({})));
    await assertRateLimit(
      "paymentSessionByActor",
      `autopay:${subscriptionId}:${userId}`,
      "Too many autopay setup attempts.",
    );
    const currentSubscription = await prisma.memberSubscription.findFirst({
      where: { id: subscriptionId, memberUserId: userId },
    });
    if (!currentSubscription) {
      throw notFoundError("Membership not found");
    }
    if (currentSubscription.status !== "ACTIVE") {
      throw validationError("Autopay can only be enabled for an active membership.");
    }
    const orgId = currentSubscription.orgId;
    assertActiveContextOrg(ctx, orgId);
    const [organization, currentPlan, selectedPlan, user, existingMandate] = await Promise.all([
      prisma.organization.findUnique({ where: { id: orgId } }),
      prisma.membershipPlan.findFirst({ where: { id: currentSubscription.planId, orgId } }),
      body.planId
        ? prisma.membershipPlan.findFirst({ where: { id: body.planId, orgId, active: true } })
        : Promise.resolve(null),
      prisma.user.findUniqueOrThrow({ where: { id: userId } }),
      prisma.paymentMandate.findFirst({
        where: {
          orgId,
          userId,
          status: { in: liveMandateStatuses },
          OR: [
            { sourceSubscriptionId: subscriptionId },
            { latestSubscriptionId: subscriptionId },
            { latestSubscriptionId: currentSubscription.id },
          ],
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);
    const plan = selectedPlan ?? currentPlan;
    if (!organization || !plan) {
      throw notFoundError("Autopay plan not found");
    }
    if (
      organization.status === "SUSPENDED" ||
      organization.status === "CANCELLED" ||
      organization.status === "TRIAL_EXPIRED"
    ) {
      throw forbiddenError("This gym is not accepting autopay setup right now.");
    }
    if (existingMandate) {
      return ok({
        mandate: existingMandate,
        checkoutUrl: existingMandate.checkoutUrl,
        session: null,
      });
    }

    const provider = getPaymentProviderOrThrow();
    const cadence = deriveAutopayBillingCadence(plan);
    const mandate = await prisma.paymentMandate.create({
      data: {
        orgId,
        userId,
        planId: plan.id,
        sourceSubscriptionId: currentSubscription.id,
        latestSubscriptionId: currentSubscription.id,
        provider: provider.providerName,
        status: "CREATED",
        amountPaise: plan.pricePaise,
        currency: plan.currency,
        billingPeriod: cadence.billingPeriod,
        billingInterval: cadence.billingInterval,
        totalCount: 120,
        metadata: clean({
          sourceSubscriptionId: currentSubscription.id,
          planId: plan.id,
        }) as Prisma.InputJsonValue,
      },
    });

    if (provider.providerName === "mock") {
      const created = await provider.createMandate({
        orgId,
        userId,
        amountPaise: plan.pricePaise,
        currency: "INR",
        referenceId: mandate.id,
        planName: plan.name,
        billingPeriod: cadence.billingPeriod,
        billingInterval: cadence.billingInterval,
        totalCount: 120,
        metadata: {
          autopayMandateId: mandate.id,
          sourceSubscriptionId: currentSubscription.id,
          planId: plan.id,
        },
      });
      const updated = await prisma.paymentMandate.update({
        where: { id: mandate.id },
        data: clean({
          status: providerMandateStatusToLocal(created.status),
          providerMandateId: created.mandateId,
          providerPlanId: created.providerPlanId,
          paidCount: created.paidCount,
          totalCount: created.totalCount,
          activatedAt: new Date(),
        }),
      });
      return ok({ mandate: updated, checkoutUrl: null, session: null });
    }

    const session = await prisma.paymentSession.create({
      data: {
        orgId,
        branchId: currentSubscription.branchId,
        userId,
        purpose: "MEMBERSHIP",
        amountPaise: plan.pricePaise,
        currency: plan.currency,
        status: "CREATED",
        checkoutUrl: "",
        provider: provider.providerName,
        metadata: clean({
          autopayMandateId: mandate.id,
          sourceSubscriptionId: currentSubscription.id,
          planId: plan.id,
        }) as Prisma.InputJsonValue,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
    let createdMandate;
    try {
      const startAt =
        currentSubscription.endsAt && currentSubscription.endsAt.getTime() > Date.now()
          ? currentSubscription.endsAt
          : undefined;
      createdMandate = await provider.createMandate({
        orgId,
        userId,
        amountPaise: plan.pricePaise,
        currency: "INR",
        referenceId: session.id,
        planName: plan.name,
        description: `${organization.name} ${plan.name} autopay`,
        billingPeriod: cadence.billingPeriod,
        billingInterval: cadence.billingInterval,
        totalCount: 120,
        ...(startAt ? { startAt } : {}),
        returnUrl: `/checkout/${session.id}`,
        customer: clean({
          name: user.name,
          email: publicUserEmail(user.email),
          phone: user.phone ?? undefined,
        }),
        metadata: {
          autopayMandateId: mandate.id,
          sourceSubscriptionId: currentSubscription.id,
          planId: plan.id,
          paymentSessionId: session.id,
        },
      });
    } catch (error) {
      await prisma.$transaction([
        prisma.paymentSession.update({
          where: { id: session.id },
          data: { status: "FAILED", completedAt: new Date() },
        }),
        prisma.paymentMandate.update({
          where: { id: mandate.id },
          data: { status: "FAILED" },
        }),
      ]);
      throw error;
    }

    const hostedCheckoutUrl = `/checkout/${session.id}`;
    const [updatedMandate, updatedSession] = await prisma.$transaction([
      prisma.paymentMandate.update({
        where: { id: mandate.id },
        data: clean({
          status: providerMandateStatusToLocal(createdMandate.status),
          providerMandateId: createdMandate.mandateId,
          providerPlanId: createdMandate.providerPlanId,
          checkoutUrl: hostedCheckoutUrl,
          currentStartAt: createdMandate.currentStartAt,
          currentEndAt: createdMandate.currentEndAt,
          nextChargeAt: createdMandate.nextChargeAt,
          paidCount: createdMandate.paidCount,
          totalCount: createdMandate.totalCount,
        }),
      }),
      prisma.paymentSession.update({
        where: { id: session.id },
        data: {
          provider: provider.providerName,
          providerRef: createdMandate.mandateId,
          checkoutUrl: hostedCheckoutUrl,
          status: "CREATED",
          metadata: {
            ...getObjectMetadata(session.metadata),
            providerCheckoutData: createdMandate.checkoutData ?? null,
          } as Prisma.InputJsonValue,
        },
      }),
    ]);

    return ok({
      mandate: updatedMandate,
      checkoutUrl: hostedCheckoutUrl,
      checkoutData: createdMandate.checkoutData ?? null,
      session: updatedSession,
    });
  }
}
