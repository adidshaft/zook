import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@zook/db";
import { getRequestContext, requirePlatformAdmin } from "../access";
import { writeAuditLog } from "../audit";
import { notFoundError, validationError } from "../errors";
import { createUniqueMemberSlug } from "../member-slug";
import { ok, readJson } from "../response";
import {
  ANALYTICS_SUMMARY_LIST_LIMIT,
  ensureOrganizationMembership,
  getSaasPlanCatalog,
  pathMatches,
  platformOrgCreditSchema,
  platformOrgReasonSchema,
  platformOrgRenameSchema,
  platformOrgTierSchema,
  platformOrgTransferSchema,
  platformOrgTrialExtendSchema,
  platformSubscriptionNoteSchema,
} from "./core";

export async function handlePlatformOrgAdmin(request: NextRequest, path: string[]) {
  if (request.method === "POST" && pathMatches(path, ["platform", "orgs", /.+/, "trial", "extend"])) {
    const ctx = await getRequestContext(request);
    const actorUserId = requirePlatformAdmin(ctx);
    const orgId = path[2]!;
    const body = platformOrgTrialExtendSchema.parse(await readJson(request));
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw notFoundError("Organization not found");
    const currentEnd = org.trialEndAt ?? new Date();
    const trialEndAt = new Date(currentEnd.getTime() + body.days * 24 * 60 * 60 * 1000);
    const subscription = await prisma.saaSSubscription.upsert({
      where: { orgId },
      create: {
        orgId,
        trialStartAt: org.trialStartAt ?? new Date(),
        trialEndAt,
        trialExtendedDays: body.days,
        status: org.status,
      },
      update: {
        trialEndAt,
        trialExtendedDays: { increment: body.days },
        noteForPlatform: body.reason,
      },
    });
    const updatedOrg = await prisma.organization.update({ where: { id: orgId }, data: { trialEndAt } });
    await writeAuditLog({
      request,
      orgId,
      actorUserId,
      action: "platform.organization_trial_extended",
      entityType: "organization",
      entityId: orgId,
      before: { trialEndAt: currentEnd.toISOString() },
      after: { trialEndAt: trialEndAt.toISOString() },
      metadata: { days: body.days, reason: body.reason, subscriptionId: subscription.id },
    });
    return ok({ org: updatedOrg, subscription });
  }

  if (request.method === "POST" && pathMatches(path, ["platform", "orgs", /.+/, "credit"])) {
    const ctx = await getRequestContext(request);
    const actorUserId = requirePlatformAdmin(ctx);
    const orgId = path[2]!;
    const body = platformOrgCreditSchema.parse(await readJson(request));
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw notFoundError("Organization not found");
    const subscription = await prisma.saaSSubscription.upsert({
      where: { orgId },
      create: {
        orgId,
        trialStartAt: org.trialStartAt ?? new Date(),
        trialEndAt: org.trialEndAt ?? new Date(),
        status: org.status,
        creditPaise: body.paise,
        noteForPlatform: body.reason,
      },
      update: { creditPaise: { increment: body.paise }, noteForPlatform: body.reason },
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId,
      action: "platform.organization_credit_adjusted",
      entityType: "organization",
      entityId: orgId,
      riskLevel: "HIGH",
      metadata: { paise: body.paise, reason: body.reason, subscriptionId: subscription.id },
    });
    return ok({ subscription });
  }

  if (request.method === "POST" && pathMatches(path, ["platform", "orgs", /.+/, "subscription-note"])) {
    const ctx = await getRequestContext(request);
    const actorUserId = requirePlatformAdmin(ctx);
    const orgId = path[2]!;
    const body = platformSubscriptionNoteSchema.parse(await readJson(request));
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw notFoundError("Organization not found");
    const subscription = await prisma.saaSSubscription.upsert({
      where: { orgId },
      create: {
        orgId,
        trialStartAt: org.trialStartAt ?? new Date(),
        trialEndAt: org.trialEndAt ?? new Date(),
        status: org.status,
        noteForPlatform: body.note,
      },
      update: { noteForPlatform: body.note },
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId,
      action: "platform.organization_subscription_note_updated",
      entityType: "saas_subscription",
      entityId: subscription.id,
      metadata: { noteLength: body.note.length },
    });
    return ok({ subscription });
  }

  if (request.method === "PATCH" && pathMatches(path, ["platform", "orgs", /.+/, "tier"])) {
    const ctx = await getRequestContext(request);
    const actorUserId = requirePlatformAdmin(ctx);
    const orgId = path[2]!;
    const body = platformOrgTierSchema.parse(await readJson(request));
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw notFoundError("Organization not found");
    const subscription = await prisma.saaSSubscription.upsert({
      where: { orgId },
      create: {
        orgId,
        trialStartAt: org.trialStartAt ?? new Date(),
        trialEndAt: org.trialEndAt ?? new Date(),
        status: org.status,
        tier: body.tier,
      },
      update: { tier: body.tier },
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId,
      action: "platform.organization_tier_changed",
      entityType: "organization",
      entityId: orgId,
      riskLevel: "HIGH",
      metadata: { tier: body.tier, effectiveAt: body.effectiveAt ?? null },
    });
    return ok({ subscription });
  }

  if (request.method === "POST" && pathMatches(path, ["platform", "orgs", /.+/, "rename"])) {
    const ctx = await getRequestContext(request);
    const actorUserId = requirePlatformAdmin(ctx);
    const orgId = path[2]!;
    const body = platformOrgRenameSchema.parse(await readJson(request));
    const before = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!before) throw notFoundError("Organization not found");
    const org = await prisma.organization.update({
      where: { id: orgId },
      data: { name: body.name, username: body.username },
    });
    await prisma.organizationUsernameHistory.create({
      data: { orgId, oldUsername: before.username, newUsername: body.username, changedById: actorUserId },
    }).catch(() => undefined);
    await writeAuditLog({
      request,
      orgId,
      actorUserId,
      action: "platform.organization_renamed",
      entityType: "organization",
      entityId: orgId,
      before: { name: before.name, username: before.username },
      after: { name: org.name, username: org.username },
      metadata: { reason: body.reason },
    });
    return ok({ org });
  }

  if (request.method === "POST" && pathMatches(path, ["platform", "orgs", /.+/, "soft-delete"])) {
    const ctx = await getRequestContext(request);
    const actorUserId = requirePlatformAdmin(ctx);
    const orgId = path[2]!;
    const body = platformOrgReasonSchema.parse(await readJson(request));
    const org = await prisma.organization.update({
      where: { id: orgId },
      data: { status: "DELETED", deletedAt: new Date() },
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId,
      action: "platform.organization_soft_deleted",
      entityType: "organization",
      entityId: orgId,
      riskLevel: "CRITICAL",
      metadata: { reason: body.reason, purgeAfterDays: 30 },
    });
    return ok({ org });
  }

  if (
    request.method === "POST" &&
    pathMatches(path, ["platform", "orgs", /.+/, "transfer-ownership"])
  ) {
    const ctx = await getRequestContext(request);
    const actorUserId = requirePlatformAdmin(ctx);
    const orgId = path[2]!;
    const body = platformOrgTransferSchema.parse(await readJson(request));
    await ensureOrganizationMembership({
      orgId,
      userId: body.newOwnerUserId,
      marketingOptIn: true,
      skipSaasMemberLimit: true,
    });
    await prisma.organizationRoleAssignment.upsert({
      where: { orgId_userId: { orgId, userId: body.newOwnerUserId } },
      create: { orgId, userId: body.newOwnerUserId, role: "OWNER", assignedById: actorUserId },
      update: { role: "OWNER", assignedById: actorUserId },
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId,
      action: "platform.organization_ownership_transferred",
      entityType: "organization",
      entityId: orgId,
      riskLevel: "CRITICAL",
      metadata: { newOwnerUserId: body.newOwnerUserId, reason: body.reason },
    });
    return ok({ transferred: true });
  }

  if (
    request.method === "POST" &&
    pathMatches(path, ["platform", "orgs", /.+/, "bulk-import-members"])
  ) {
    const ctx = await getRequestContext(request);
    const actorUserId = requirePlatformAdmin(ctx);
    const orgId = path[2]!;
    const body = z.object({ csv: z.string().min(1).max(500_000) }).parse(await readJson(request));
    const lines = body.csv.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (lines.length < 2) throw validationError("CSV must contain a header row and at least one data row.");
    const headers = lines[0]!.toLowerCase().split(",").map((h) => h.trim().replace(/^["']|["']$/g, ""));
    const nameIndex = headers.findIndex((h) => ["name", "full name", "member name"].includes(h));
    const emailIndex = headers.findIndex((h) => ["email", "email address"].includes(h));
    if (nameIndex < 0 || emailIndex < 0) throw validationError("CSV must include 'name' and 'email' columns.");
    const results: Array<{ row: number; status: "created" | "existing" | "error"; email?: string; error?: string }> = [];
    for (const [index, line] of lines.slice(1).entries()) {
      const columns = line.split(",").map((col) => col.trim().replace(/^["']|["']$/g, ""));
      const name = columns[nameIndex]?.trim();
      const email = columns[emailIndex]?.trim().toLowerCase();
      if (!name || !email) {
        results.push({ row: index + 2, status: "error", error: "Missing name or email" });
        continue;
      }
      const existing = await prisma.user.findUnique({ where: { email } });
      const user = existing ?? (await prisma.user.create({
        data: { email, name, slug: await createUniqueMemberSlug(), marketingOptIn: true },
      }));
      await ensureOrganizationMembership({ orgId, userId: user.id, marketingOptIn: user.marketingOptIn });
      results.push({ row: index + 2, status: existing ? "existing" : "created", email });
    }
    await writeAuditLog({
      request,
      orgId,
      actorUserId,
      action: "platform.members.bulk_imported",
      entityType: "organization",
      entityId: orgId,
      metadata: { totalRows: results.length },
    });
    return ok({ results, summary: { total: results.length, created: results.filter((r) => r.status === "created").length, existing: results.filter((r) => r.status === "existing").length, errors: results.filter((r) => r.status === "error").length } });
  }

  if (request.method === "GET" && pathMatches(path, ["platform", "orgs"])) {
    const ctx = await getRequestContext(request);
    requirePlatformAdmin(ctx);
    return ok({
      orgs: await prisma.organization.findMany({
        select: {
          id: true,
          name: true,
          username: true,
          city: true,
          state: true,
          status: true,
          joinMode: true,
          trialEndAt: true,
          createdAt: true,
          contactEmail: true,
          contactPhone: true,
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    });
  }

  if (request.method === "GET" && pathMatches(path, ["platform", "subscriptions"])) {
    const ctx = await getRequestContext(request);
    requirePlatformAdmin(ctx);
    const orgs = await prisma.organization.findMany({
      select: {
        id: true,
        name: true,
        username: true,
        status: true,
        trialEndAt: true,
        createdAt: true,
        contactEmail: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    const orgIds = orgs.map((org) => org.id);
    const orgScope = { orgId: { in: orgIds } };
    const [
      subscriptions,
      mandates,
      referrals,
      planCatalog,
      memberGroups,
      branchGroups,
      staffGroups,
      trainerGroups,
      productGroups,
    ] = await Promise.all([
      prisma.saaSSubscription.findMany({
        where: orgScope,
        orderBy: { createdAt: "desc" },
        take: ANALYTICS_SUMMARY_LIST_LIMIT,
      }),
      prisma.saaSBillingMandate.findMany({
        where: orgScope,
        orderBy: { createdAt: "desc" },
        take: ANALYTICS_SUMMARY_LIST_LIMIT,
      }),
      prisma.orgReferralPartnership.findMany({
        where: { sourceOrgId: { in: orgIds } },
        orderBy: { createdAt: "desc" },
        take: ANALYTICS_SUMMARY_LIST_LIMIT,
      }),
      getSaasPlanCatalog(),
      prisma.memberProfile.groupBy({ by: ["orgId"], where: orgScope, _count: { _all: true } }),
      prisma.branch.groupBy({
        by: ["orgId"],
        where: { ...orgScope, active: true },
        _count: { _all: true },
      }),
      prisma.organizationRoleAssignment.groupBy({
        by: ["orgId"],
        where: { ...orgScope, role: { not: "MEMBER" } },
        _count: { _all: true },
      }),
      prisma.organizationRoleAssignment.groupBy({
        by: ["orgId"],
        where: { ...orgScope, role: "TRAINER" },
        _count: { _all: true },
      }),
      prisma.product.groupBy({ by: ["orgId"], where: orgScope, _count: { _all: true } }),
    ]);
    const subByOrg = new Map(subscriptions.map((sub) => [sub.orgId, sub]));
    const mandateByOrg = new Map(mandates.map((mandate) => [mandate.orgId, mandate]));
    const memberCountByOrg = new Map(memberGroups.map((row) => [row.orgId, row._count._all]));
    const branchCountByOrg = new Map(branchGroups.map((row) => [row.orgId, row._count._all]));
    const staffCountByOrg = new Map(staffGroups.map((row) => [row.orgId, row._count._all]));
    const trainerCountByOrg = new Map(trainerGroups.map((row) => [row.orgId, row._count._all]));
    const productCountByOrg = new Map(productGroups.map((row) => [row.orgId, row._count._all]));
    const referralCountBySource = new Map<string, number>();
    for (const partnership of referrals) {
      referralCountBySource.set(
        partnership.sourceOrgId,
        (referralCountBySource.get(partnership.sourceOrgId) ?? 0) + 1,
      );
    }
    return ok({
      summary: {
        totalOrgs: orgs.length,
        onTrial: orgs.filter((o) => o.status === "TRIAL_ACTIVE" || o.status === "TRIAL_EXPIRING")
          .length,
        active: orgs.filter((o) => o.status === "ACTIVE").length,
        suspended: orgs.filter((o) => o.status === "SUSPENDED").length,
        cancelled: orgs.filter((o) => o.status === "CANCELLED").length,
        totalReferrals: referrals.length,
      },
      rows: orgs.map((org) => {
        const subscription = subByOrg.get(org.id);
        const mandate = mandateByOrg.get(org.id);
        const tier = subscription?.tier ?? "FREE";
        const entitlements = planCatalog[tier].entitlements;
        return {
          orgId: org.id,
          orgName: org.name,
          username: org.username,
          orgStatus: org.status,
          trialEndAt: org.trialEndAt,
          createdAt: org.createdAt,
          contactEmail: org.contactEmail,
          subscriptionStatus: subscription?.status ?? null,
          tier,
          billingCycle: subscription?.billingCycle ?? "MONTHLY",
          priceLockedPaise: subscription?.priceLockedPaise ?? null,
          creditPaise: subscription?.creditPaise ?? 0,
          noteForPlatform: subscription?.noteForPlatform ?? null,
          nextBillingAt: subscription?.nextBillingAt ?? null,
          mandateStatus: mandate?.status ?? null,
          mandateNextChargeAt: mandate?.nextChargeAt ?? null,
          mandatePaidCount: mandate?.paidCount ?? 0,
          referredCount: referralCountBySource.get(org.id) ?? 0,
          usage: {
            activeMemberCount: memberCountByOrg.get(org.id) ?? 0,
            branchCount: branchCountByOrg.get(org.id) ?? 0,
            staffCount: staffCountByOrg.get(org.id) ?? 0,
            trainerCount: trainerCountByOrg.get(org.id) ?? 0,
            productCount: productCountByOrg.get(org.id) ?? 0,
          },
          entitlements,
        };
      }),
      planCatalog,
    });
  }

  if (request.method === "PATCH" && pathMatches(path, ["platform", "orgs", /.+/, "status"])) {
    const ctx = await getRequestContext(request);
    const userId = requirePlatformAdmin(ctx);
    const body = (await readJson(request)) as { status: "ACTIVE" | "SUSPENDED" | "CANCELLED" };
    const org = await prisma.organization.update({
      where: { id: path[2]! },
      data: { status: body.status },
    });
    await writeAuditLog({
      request,
      orgId: org.id,
      actorUserId: userId,
      action: "platform.organization_status_updated",
      entityType: "organization",
      entityId: org.id,
      metadata: { status: body.status },
    });
    return ok({ org });
  }
}
