import { createOrganizationSchema, type NotificationType } from "@zook/core";
import { createTrialWindow, normalizeUsername } from "@zook/core/services";
import { Prisma, prisma } from "@zook/db";
import type { NextRequest } from "next/server";

import { getRequestContext, requireAuth } from "../access";
import { writeAuditLog } from "../audit";
import { assertRateLimit } from "../rate-limit";
import { ok, readJson } from "../response";
import { clean, pathMatches } from "./core";

function starterNotificationTemplates(orgId: string, createdById: string) {
  const templates: Array<{
    name: string;
    type: NotificationType;
    title: string;
    body: string;
  }> = [
    {
      name: "Renewal nudge",
      type: "PLAN",
      title: "Your membership is ending soon",
      body: "Renew at the desk or reply in the app if you want help choosing your next plan.",
    },
    {
      name: "Class moved",
      type: "OPERATIONAL",
      title: "Class timing changed",
      body: "Today's class has moved. Please check the new time before you leave for the gym.",
    },
    {
      name: "Holiday closure",
      type: "OPERATIONAL",
      title: "Gym closed for a holiday",
      body: "The gym will stay closed on the announced date. Regular timings resume after that.",
    },
    {
      name: "New plan launch",
      type: "PROMOTIONAL",
      title: "New membership plan available",
      body: "A new plan is now available. Open Zook or visit the desk to choose what fits you.",
    },
    {
      name: "Welcome new member",
      type: "TRANSACTIONAL",
      title: "Welcome to the gym",
      body: "Your membership is active. Show your QR code at the desk when you arrive.",
    },
    {
      name: "Birthday wish",
      type: "ENGAGEMENT",
      title: "Happy birthday",
      body: "Wishing you a strong year ahead. We are glad to have you with us.",
    },
    {
      name: "Stock arrival",
      type: "OPERATIONAL",
      title: "Shop item back in stock",
      body: "The item you asked about is back at the gym shop. Visit the desk to pick it up.",
    },
    {
      name: "Event update",
      type: "OPERATIONAL",
      title: "Gym event update",
      body: "An event update is available for members. Open Zook for the details.",
    },
  ];
  return templates.map((template) => ({
    orgId,
    createdById,
    active: true,
    ...template,
  }));
}

export async function handleOrganizationRoot(request: NextRequest, path: string[]) {
  if (request.method === "POST" && pathMatches(path, ["orgs"])) {
    const ctx = await getRequestContext(request);
    const userId = requireAuth(ctx);
    await assertRateLimit(
      "organizationCreateByActor",
      userId,
      "You can create one organization per day from this account.",
    );
    const body = createOrganizationSchema.parse(await readJson(request));
    const username = normalizeUsername(body.username);
    const trial = createTrialWindow();
    const org = await prisma.$transaction(async (tx) => {
      const created = await tx.organization.create({
        data: clean({
          name: body.name,
          legalName: body.name,
          username,
          contactPhone: body.contactPhone,
          contactEmail: body.contactEmail,
          gstNumber: body.gstNumber,
          address: body.address,
          city: body.city,
          state: body.state,
          pincode: body.pincode,
          originalGoogleMapsUrl: body.originalGoogleMapsUrl,
          latitude: body.latitude ? new Prisma.Decimal(body.latitude) : undefined,
          longitude: body.longitude ? new Prisma.Decimal(body.longitude) : undefined,
          locationSource: "MANUAL",
          amenities: body.amenities,
          visibility: body.visibility,
          joinMode: body.joinMode,
          trialStartAt: trial.trialStartAt,
          trialEndAt: trial.trialEndAt,
          createdByUserId: userId,
        }),
      });
      const branch = await tx.branch.create({
        data: clean({
          orgId: created.id,
          name: `${created.name} Main`,
          address: created.address,
          city: created.city,
          state: created.state,
          pincode: created.pincode,
          latitude: created.latitude,
          longitude: created.longitude,
          contactPhone: created.contactPhone,
          contactEmail: created.contactEmail,
          whatsappNumber: created.contactPhone,
          operatingHours:
            created.operatingHours === null
              ? undefined
              : (created.operatingHours as Prisma.InputJsonValue),
          amenities: Array.isArray(created.amenities)
            ? created.amenities.filter((item): item is string => typeof item === "string")
            : [],
          isDefault: true,
        }),
      });
      await tx.organizationUser.create({ data: { orgId: created.id, userId } });
      await tx.organizationRoleAssignment.create({
        data: { orgId: created.id, userId, role: "OWNER", assignedById: userId },
      });
      await tx.saaSSubscription.create({
        data: { orgId: created.id, trialStartAt: trial.trialStartAt, trialEndAt: trial.trialEndAt },
      });
      if (body.platformReferralCode) {
        const normalizedReferral = body.platformReferralCode.toLowerCase();
        if (normalizedReferral !== username) {
          const [sourceOrg, referralCode] = await Promise.all([
            tx.organization.findUnique({
            where: { username: normalizedReferral },
            select: { id: true },
            }),
            tx.referralCode.findUnique({
              where: { code: body.platformReferralCode.toUpperCase() },
              select: { orgId: true, referrerUserId: true, createdByRole: true, code: true },
            }),
          ]);
          const sourceOrgId = referralCode?.orgId ?? sourceOrg?.id;
          if (sourceOrgId && referralCode?.referrerUserId !== userId) {
            await tx.orgReferralPartnership.upsert({
              where: {
                sourceOrgId_targetOrgId: { sourceOrgId, targetOrgId: created.id },
              },
              create: {
                sourceOrgId,
                targetOrgId: created.id,
                referrerUserId: referralCode?.referrerUserId ?? null,
                referrerRole: referralCode?.createdByRole ?? null,
                referrerOrgId: referralCode?.orgId ?? null,
                code: referralCode?.code ?? body.platformReferralCode,
                referralPolicySnapshot: {
                  code: body.platformReferralCode,
                  redeemedAt: new Date().toISOString(),
                  rewardTier: "trial_extension_30d",
                } as Prisma.InputJsonValue,
                status: "pending",
              },
              update: {},
            });
          }
        }
      }
      await tx.organizationSetting.create({
        data: {
          orgId: created.id,
          keyValues: {
            defaultBranchId: branch.id,
            attendanceMode: "EXCEPTION_APPROVAL",
            equipment: body.equipment,
            gymType: body.amenities[0] ?? "",
          },
        },
      });
      await tx.notificationTemplate.createMany({
        data: starterNotificationTemplates(created.id, userId),
      });
      return created;
    });
    await writeAuditLog({
      request,
      orgId: org.id,
      actorUserId: userId,
      action: "organization.created",
      entityType: "organization",
      entityId: org.id,
      metadata: { username: org.username },
    });
    return ok({ org });
  }
  if (request.method === "GET" && pathMatches(path, ["orgs", "current"])) {
    const ctx = await getRequestContext(request);
    const userId = requireAuth(ctx);
    const membership = await prisma.organizationUser.findFirst({
      where: { userId, status: "active" },
    });
    if (!membership) {
      return ok({ org: null });
    }
    return ok({ org: await prisma.organization.findUnique({ where: { id: membership.orgId } }) });
  }
  return undefined;
}
