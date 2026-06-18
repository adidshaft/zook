import type { NextRequest } from "next/server";
import { type PaidSaasTier, type SaasBillingCycle, pricingFromPlanCatalog } from "../domains/billing/saas-plans";
import { Prisma, prisma } from "@zook/db";
import { getRequestContext, requireOrgPermission } from "../access";
import { writeAuditLog } from "../audit";
import { notFoundError, validationError } from "../errors";
import { assertRateLimit } from "../rate-limit";
import { ok, readJson } from "../response";
import {
  clean,
  getObjectMetadata,
  getOrgSaasUsage,
  getPaymentProviderOrThrow,
  getSaasPlanCatalog,
  getSaasPricing,
  liveMandateStatuses,
  missingBillingDetails,
  organizationBillingDetailsSchema,
  pathMatches,
  priceForSaasPlan,
  providerMandateStatusToLocal,
  renewalAfter,
  saasBillingMandateSchema,
  saasUpgradeSchema,
} from "./core";

export async function handleOrganizationBilling(request: NextRequest, path: string[]) {
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "billing-profile"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgPermission(ctx, orgId, "ORG_MANAGE_BILLING");
    const [org, subscription] = await Promise.all([
      prisma.organization.findUnique({ where: { id: orgId } }),
      prisma.saaSSubscription.findUnique({ where: { orgId } }),
    ]);
    if (!org) {
      throw notFoundError("Organization not found");
    }
    return ok({
      billingProfile: {
        legalName: org.legalName ?? "",
        gstNumber: org.gstNumber ?? "",
        billingEmail: subscription?.billingEmail ?? org.contactEmail ?? "",
        contactEmail: org.contactEmail ?? "",
        contactPhone: org.contactPhone ?? "",
        address: org.address,
        city: org.city,
        state: org.state,
        pincode: org.pincode,
        receiptReady: missingBillingDetails(org, "receipt").length === 0,
        invoiceReady: missingBillingDetails(org, "invoice").length === 0,
        receiptMissing: missingBillingDetails(org, "receipt"),
        invoiceMissing: missingBillingDetails(org, "invoice"),
      },
    });
  }

  if (request.method === "PATCH" && pathMatches(path, ["orgs", /.+/, "billing-profile"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "ORG_MANAGE_BILLING");
    const body = organizationBillingDetailsSchema.parse(await readJson(request));
    const [org] = await prisma.$transaction([
      prisma.organization.update({
        where: { id: orgId },
        data: {
          legalName: body.legalName,
          gstNumber: body.gstNumber,
          contactEmail: body.contactEmail,
          contactPhone: body.contactPhone || null,
          address: body.address,
          city: body.city,
          state: body.state,
          pincode: body.pincode,
        },
      }),
      prisma.saaSSubscription.upsert({
        where: { orgId },
        create: {
          orgId,
          status: "TRIAL_ACTIVE",
          trialStartAt: new Date(),
          trialEndAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
          billingEmail: body.contactEmail,
        },
        update: { billingEmail: body.contactEmail },
      }),
    ]);
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "organization.billing_profile_updated",
      entityType: "organization",
      entityId: orgId,
    });
    return ok({
      billingProfile: {
        legalName: org.legalName ?? "",
        gstNumber: org.gstNumber ?? "",
        billingEmail: body.contactEmail,
        contactEmail: org.contactEmail ?? "",
        contactPhone: org.contactPhone ?? "",
        address: org.address,
        city: org.city,
        state: org.state,
        pincode: org.pincode,
        receiptReady: missingBillingDetails(org, "receipt").length === 0,
        invoiceReady: missingBillingDetails(org, "invoice").length === 0,
        receiptMissing: missingBillingDetails(org, "receipt"),
        invoiceMissing: missingBillingDetails(org, "invoice"),
      },
    });
  }

  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "billing", "subscription"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgPermission(ctx, orgId, "ORG_MANAGE_BILLING");
    const [org, subscription, mandate, activeMemberCount, planCatalog, usage] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: orgId },
        select: { id: true, username: true, status: true, trialStartAt: true, trialEndAt: true },
      }),
      prisma.saaSSubscription.findUnique({ where: { orgId } }),
      prisma.saaSBillingMandate.findUnique({ where: { orgId } }),
      prisma.memberProfile.count({ where: { orgId } }),
      getSaasPlanCatalog(),
      getOrgSaasUsage(orgId),
    ]);
    if (!org) {
      throw notFoundError("Organization not found");
    }
    const resolvedTier =
      subscription?.tier === "STARTER" || subscription?.tier === "GROWTH" || subscription?.tier === "PRO"
        ? subscription.tier
        : "FREE";
    const referralPartnerships = await prisma.orgReferralPartnership.findMany({
      where: { sourceOrgId: orgId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return ok({
      subscription: {
        orgStatus: org.status,
        trialStartAt: org.trialStartAt,
        trialEndAt: org.trialEndAt,
        status: subscription?.status ?? org.status,
        tier: subscription?.tier ?? "FREE",
        billingCycle: subscription?.billingCycle ?? "MONTHLY",
        priceLockedPaise: subscription?.priceLockedPaise ?? null,
        billingEmail: subscription?.billingEmail ?? null,
        nextBillingAt: subscription?.nextBillingAt ?? null,
        nextRenewalAt: subscription?.nextRenewalAt ?? null,
        cancelledAt: subscription?.cancelledAt ?? null,
        cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd ?? false,
      },
      activeMemberCount,
      pricing: pricingFromPlanCatalog(planCatalog),
      planCatalog,
      entitlements: planCatalog[resolvedTier].entitlements,
      usage,
      mandate: mandate
        ? {
            id: mandate.id,
            status: mandate.status,
            provider: mandate.provider,
            providerMandateId: mandate.providerMandateId,
            amountPaise: mandate.amountPaise,
            currency: mandate.currency,
            billingPeriod: mandate.billingPeriod,
            billingInterval: mandate.billingInterval,
            paidCount: mandate.paidCount,
            totalCount: mandate.totalCount,
            nextChargeAt: mandate.nextChargeAt,
            currentEndAt: mandate.currentEndAt,
            authenticatedAt: mandate.authenticatedAt,
            activatedAt: mandate.activatedAt,
            cancelledAt: mandate.cancelledAt,
            checkoutUrl: mandate.checkoutUrl,
          }
        : null,
      platformReferral: {
        code: org.username.toUpperCase(),
        referredCount: referralPartnerships.length,
        recent: referralPartnerships.slice(0, 5).map((row) => ({
          id: row.id,
          targetOrgId: row.targetOrgId,
          status: row.status,
          createdAt: row.createdAt,
        })),
      },
    });
  }

  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "saas-subscription", "upgrade"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "ORG_MANAGE_BILLING");
    await assertRateLimit(
      "paymentSessionByActor",
      `saas-upgrade:${orgId}:${userId}`,
      "Too many billing setup attempts.",
    );
    const body = saasUpgradeSchema.parse(await readJson(request).catch(() => ({})));
    const tier = body.tier as PaidSaasTier;
    const billingCycle = body.billingCycle as SaasBillingCycle;
    const [org, subscription, existingMandate, pricing] = await Promise.all([
      prisma.organization.findUnique({ where: { id: orgId } }),
      prisma.saaSSubscription.findUnique({ where: { orgId } }),
      prisma.saaSBillingMandate.findUnique({ where: { orgId } }),
      getSaasPricing(),
    ]);
    if (!org) throw notFoundError("Organization not found");
    const provider = getPaymentProviderOrThrow();
    const amountPaise = priceForSaasPlan(pricing, tier, billingCycle);
    const now = new Date();
    const startsAt =
      org.trialEndAt && org.trialEndAt.getTime() > now.getTime() ? org.trialEndAt : now;
    const nextRenewalAt = renewalAfter(startsAt, billingCycle);
    const session = await prisma.paymentSession.create({
      data: {
        orgId,
        userId,
        purpose: "SAAS_BILLING",
        amountPaise,
        currency: "INR",
        status: "CREATED",
        checkoutUrl: "",
        provider: provider.providerName,
        metadata: {
          purpose: "SAAS_BILLING",
          orgId,
          tier,
          billingCycle,
          priceLockedPaise: amountPaise,
        } as Prisma.InputJsonValue,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
    const mandate =
      existingMandate ??
      (await prisma.saaSBillingMandate.create({
        data: {
          orgId,
          createdByUserId: userId,
          provider: provider.providerName,
          status: "CREATED",
          amountPaise,
          currency: "INR",
          billingPeriod: billingCycle === "YEARLY" ? "yearly" : "monthly",
          billingInterval: 1,
          totalCount: billingCycle === "YEARLY" ? 10 : 120,
          nextChargeAt: startsAt,
          paymentSessionId: session.id,
          metadata: { orgId, paymentSessionId: session.id, tier, billingCycle } as Prisma.InputJsonValue,
        },
      }));
    const createdMandate = await provider.createMandate({
      orgId,
      userId,
      amountPaise,
      currency: "INR",
      referenceId: session.id,
      planName: `Zook ${tier.toLowerCase()} ${billingCycle.toLowerCase()}`,
      description: `Zook ${tier} plan billed ${billingCycle.toLowerCase()}`,
      billingPeriod: billingCycle === "YEARLY" ? "yearly" : "monthly",
      billingInterval: 1,
      totalCount: billingCycle === "YEARLY" ? 10 : 120,
      startAt: startsAt,
      returnUrl: `/dashboard/billing`,
      customer: clean({
        name: org.name,
        email: org.contactEmail ?? subscription?.billingEmail ?? undefined,
        phone: org.contactPhone ?? undefined,
      }),
      metadata: {
        purpose: "SAAS_BILLING",
        saasBillingMandateId: mandate.id,
        orgId,
        paymentSessionId: session.id,
        tier,
        billingCycle,
        priceLockedPaise: amountPaise,
      },
    });
    const checkoutUrl =
      createdMandate.checkoutUrl ??
      (provider.providerName === "mock" ? `/checkout/mock/${session.id}` : `/checkout/${session.id}`);
    const [updatedMandate, updatedSession, updatedSubscription] = await prisma.$transaction([
      prisma.saaSBillingMandate.update({
        where: { id: mandate.id },
        data: clean({
          provider: provider.providerName,
          status: providerMandateStatusToLocal(createdMandate.status),
          providerMandateId: createdMandate.mandateId,
          providerPlanId: createdMandate.providerPlanId,
          checkoutUrl,
          amountPaise,
          billingPeriod: billingCycle === "YEARLY" ? "yearly" : "monthly",
          totalCount: billingCycle === "YEARLY" ? 10 : 120,
          nextChargeAt: createdMandate.nextChargeAt ?? startsAt,
          currentStartAt: createdMandate.currentStartAt,
          currentEndAt: createdMandate.currentEndAt,
          paidCount: createdMandate.paidCount,
          paymentSessionId: session.id,
          metadata: {
            ...getObjectMetadata(mandate.metadata),
            orgId,
            paymentSessionId: session.id,
            tier,
            billingCycle,
            priceLockedPaise: amountPaise,
            providerCheckoutData: createdMandate.checkoutData ?? null,
          } as Prisma.InputJsonValue,
        }),
      }),
      prisma.paymentSession.update({
        where: { id: session.id },
        data: {
          provider: provider.providerName,
          providerRef: createdMandate.mandateId,
          checkoutUrl,
          status: "CREATED",
          metadata: {
            ...getObjectMetadata(session.metadata),
            saasBillingMandateId: mandate.id,
            tier,
            billingCycle,
            priceLockedPaise: amountPaise,
            providerCheckoutData: createdMandate.checkoutData ?? null,
          } as Prisma.InputJsonValue,
        },
      }),
      prisma.saaSSubscription.upsert({
        where: { orgId },
        create: {
          orgId,
          status: "TRIAL_ACTIVE",
          tier,
          billingCycle,
          trialStartAt: org.trialStartAt ?? new Date(),
          trialEndAt: org.trialEndAt ?? startsAt,
          billingEmail: org.contactEmail,
          paymentSessionId: session.id,
          nextBillingAt: createdMandate.nextChargeAt ?? startsAt,
          nextRenewalAt,
          priceLockedPaise: amountPaise,
        },
        update: {
          tier,
          billingCycle,
          billingEmail: org.contactEmail,
          paymentSessionId: session.id,
          nextBillingAt: createdMandate.nextChargeAt ?? startsAt,
          nextRenewalAt,
          priceLockedPaise: amountPaise,
          cancelAtPeriodEnd: false,
          cancelledAt: null,
        },
      }),
    ]);
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "organization.saas_subscription_upgrade_started",
      entityType: "saas_subscription",
      entityId: updatedSubscription.id,
      metadata: { tier, billingCycle, amountPaise },
    });
    return ok({
      subscription: updatedSubscription,
      mandate: updatedMandate,
      checkoutUrl,
      checkoutData: createdMandate.checkoutData ?? null,
      session: updatedSession,
    });
  }

  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "saas-subscription", "cancel"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "ORG_MANAGE_BILLING");
    await assertRateLimit(
      "subscriptionChangeByActor",
      `saas-cancel:${orgId}:${userId}`,
      "Too many subscription cancellation attempts.",
    );
    const [subscription, mandate] = await Promise.all([
      prisma.saaSSubscription.findUnique({ where: { orgId } }),
      prisma.saaSBillingMandate.findUnique({ where: { orgId } }),
    ]);
    if (!subscription) throw notFoundError("SaaS subscription not found.");
    let nextMandate = mandate;
    if (mandate?.providerMandateId && !mandate.cancelledAt && mandate.status !== "CANCELLED") {
      const provider = getPaymentProviderOrThrow();
      const cancellation = await provider.cancelMandate({ mandateId: mandate.providerMandateId });
      nextMandate = await prisma.saaSBillingMandate.update({
        where: { id: mandate.id },
        data: {
          status: providerMandateStatusToLocal(cancellation.status),
          cancelledAt: new Date(),
        },
      });
    }
    const updated = await prisma.saaSSubscription.update({
      where: { orgId },
      data: { cancelAtPeriodEnd: true, cancelledAt: new Date() },
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "organization.saas_subscription_cancel_at_period_end",
      entityType: "saas_subscription",
      entityId: updated.id,
      metadata: { mandateId: nextMandate?.id },
    });
    return ok({ subscription: updated, mandate: nextMandate });
  }

  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "billing", "mandate"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "ORG_MANAGE_BILLING");
    await assertRateLimit(
      "paymentSessionByActor",
      `saas-billing:${orgId}:${userId}`,
      "Too many billing setup attempts.",
    );
    const body = saasBillingMandateSchema.parse(await readJson(request).catch(() => ({})));
    const [org, subscription, existingMandate] = await Promise.all([
      prisma.organization.findUnique({ where: { id: orgId } }),
      prisma.saaSSubscription.findUnique({ where: { orgId } }),
      prisma.saaSBillingMandate.findUnique({ where: { orgId } }),
    ]);
    if (!org) {
      throw notFoundError("Organization not found");
    }
    if (existingMandate?.checkoutUrl && liveMandateStatuses.includes(existingMandate.status)) {
      return ok({
        mandate: existingMandate,
        checkoutUrl: existingMandate.checkoutUrl,
        checkoutData: null,
        session: existingMandate.paymentSessionId
          ? await prisma.paymentSession.findUnique({
              where: { id: existingMandate.paymentSessionId },
            })
          : null,
      });
    }

    const provider = getPaymentProviderOrThrow();
    const amountPaise =
      body.amountPaise ?? Number(process.env.ZOOK_SAAS_MONTHLY_AMOUNT_PAISE ?? 299900);
    if (!Number.isFinite(amountPaise) || amountPaise <= 0) {
      throw validationError("Zook SaaS billing amount is not configured.");
    }
    const trialEndAt =
      subscription?.trialEndAt ?? org.trialEndAt ?? new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
    const session = await prisma.paymentSession.create({
      data: {
        orgId,
        userId,
        purpose: "SAAS_BILLING",
        amountPaise,
        currency: "INR",
        status: "CREATED",
        checkoutUrl: "",
        provider: provider.providerName,
        metadata: clean({
          purpose: "SAAS_BILLING",
          orgId,
          startsAfterTrial: true,
        }) as Prisma.InputJsonValue,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
    let mandate = existingMandate;
    if (!mandate) {
      mandate = await prisma.saaSBillingMandate.create({
        data: {
          orgId,
          createdByUserId: userId,
          provider: provider.providerName,
          status: "CREATED",
          amountPaise,
          currency: "INR",
          billingPeriod: "monthly",
          billingInterval: 1,
          totalCount: 120,
          nextChargeAt: trialEndAt,
          paymentSessionId: session.id,
          metadata: clean({
            orgId,
            paymentSessionId: session.id,
          }) as Prisma.InputJsonValue,
        },
      });
    }
    let createdMandate;
    try {
      createdMandate = await provider.createMandate({
        orgId,
        userId,
        amountPaise,
        currency: "INR",
        referenceId: session.id,
        planName: "Zook Gym OS monthly",
        description: "Zook Gym OS billing after the two-month free trial",
        billingPeriod: "monthly",
        billingInterval: 1,
        totalCount: 120,
        startAt: trialEndAt,
        returnUrl: `/dashboard/billing`,
        customer: clean({
          name: org.name,
          email: org.contactEmail ?? subscription?.billingEmail ?? undefined,
          phone: org.contactPhone ?? undefined,
        }),
        metadata: {
          purpose: "SAAS_BILLING",
          saasBillingMandateId: mandate.id,
          orgId,
          paymentSessionId: session.id,
        },
      });
    } catch (error) {
      await prisma.$transaction([
        prisma.paymentSession.update({
          where: { id: session.id },
          data: { status: "FAILED", completedAt: new Date() },
        }),
        prisma.saaSBillingMandate.update({
          where: { id: mandate.id },
          data: { status: "FAILED", paymentSessionId: session.id },
        }),
      ]);
      throw error;
    }

    const checkoutUrl =
      createdMandate.checkoutUrl ??
      (provider.providerName === "mock"
        ? `/checkout/mock/${session.id}`
        : `/checkout/${session.id}`);
    const [updatedMandate, updatedSession] = await prisma.$transaction([
      prisma.saaSBillingMandate.update({
        where: { id: mandate.id },
        data: clean({
          provider: provider.providerName,
          status: providerMandateStatusToLocal(createdMandate.status),
          providerMandateId: createdMandate.mandateId,
          providerPlanId: createdMandate.providerPlanId,
          checkoutUrl,
          currentStartAt: createdMandate.currentStartAt,
          currentEndAt: createdMandate.currentEndAt,
          nextChargeAt: createdMandate.nextChargeAt ?? trialEndAt,
          paidCount: createdMandate.paidCount,
          totalCount: createdMandate.totalCount,
          paymentSessionId: session.id,
          metadata: {
            ...getObjectMetadata(mandate.metadata),
            orgId,
            paymentSessionId: session.id,
            providerCheckoutData: createdMandate.checkoutData ?? null,
          } as Prisma.InputJsonValue,
        }),
      }),
      prisma.paymentSession.update({
        where: { id: session.id },
        data: {
          provider: provider.providerName,
          providerRef: createdMandate.mandateId,
          checkoutUrl,
          status: "CREATED",
          metadata: {
            ...getObjectMetadata(session.metadata),
            saasBillingMandateId: mandate.id,
            providerCheckoutData: createdMandate.checkoutData ?? null,
          } as Prisma.InputJsonValue,
        },
      }),
      prisma.saaSSubscription.upsert({
        where: { orgId },
        create: {
          orgId,
          status: "TRIAL_ACTIVE",
          trialStartAt: org.trialStartAt ?? new Date(),
          trialEndAt,
          billingEmail: org.contactEmail,
          paymentSessionId: session.id,
          nextBillingAt: createdMandate.nextChargeAt ?? trialEndAt,
        },
        update: {
          billingEmail: org.contactEmail,
          paymentSessionId: session.id,
          nextBillingAt: createdMandate.nextChargeAt ?? trialEndAt,
        },
      }),
    ]);
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "organization.billing_mandate_created",
      entityType: "saas_billing_mandate",
      entityId: updatedMandate.id,
      metadata: { provider: provider.providerName },
    });
    return ok({
      mandate: updatedMandate,
      checkoutUrl,
      checkoutData: createdMandate.checkoutData ?? null,
      session: updatedSession,
    });
  }
}
