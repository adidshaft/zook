import { Prisma, prisma } from "@zook/db";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { getRequestContext, requireOrgPermission } from "../access";
import { invalidateOrganizationDashboardCache } from "../domains/overview/read-models";
import { conflictError, notFoundError, validationError } from "../errors";
import { assertRateLimit } from "../rate-limit";
import { ok, readJson } from "../response";
import { writeAuditLog } from "../audit";
import {
  assertLimitAvailable,
  clean,
  getMapProviderOrThrow,
  getOrgSaasEntitlements,
  pathMatches,
} from "./core";

const timeStringSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const dayHoursSchema = z.union([
  z.object({ closed: z.literal(true) }),
  z.object({ open: timeStringSchema, close: timeStringSchema }),
]);
const operatingHoursSchema = z
  .object({
    mon: dayHoursSchema,
    tue: dayHoursSchema,
    wed: dayHoursSchema,
    thu: dayHoursSchema,
    fri: dayHoursSchema,
    sat: dayHoursSchema,
    sun: dayHoursSchema,
  })
  .strict();

const branchManageBaseSchema = z.object({
  name: z.string().trim().min(2).max(120),
  address: z.string().trim().min(10).max(240),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
  pincode: z.string().regex(/^\d{6}$/),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  locationSource: z.enum(["MANUAL", "GOOGLE_PLACE", "GOOGLE_MAPS_LINK"]).optional(),
  googleMapsUrl: z.string().trim().url().optional(),
  contactPhone: z.string().trim().min(8).max(20),
  contactEmail: z.string().trim().email().optional().nullable(),
  whatsappNumber: z.string().trim().min(8).max(20).optional().nullable(),
  operatingHours: operatingHoursSchema.optional().nullable(),
  amenities: z.array(z.string().trim().min(1).max(48)).max(40).optional(),
  managerId: z.string().optional().nullable(),
  logoAssetId: z.string().optional().nullable(),
  coverAssetId: z.string().optional().nullable(),
  commerceSetup: z.enum(["SHARED", "CUSTOM"]).optional(),
  isDefault: z.boolean().optional(),
  active: z.boolean().optional(),
});

const branchManageSchema = branchManageBaseSchema.superRefine((value, ctx) => {
  if (
    value.locationSource === "GOOGLE_PLACE" &&
    (value.latitude == null || value.longitude == null)
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Choose the branch location on the map before saving.",
      path: ["latitude"],
    });
  }
  if (!value.operatingHours) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Set working hours for all seven days before saving.",
      path: ["operatingHours"],
    });
  }
  if (!value.commerceSetup) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Choose whether this branch shares plans and products or uses its own.",
      path: ["commerceSetup"],
    });
  }
});

const branchQrSettingsSchema = z.object({
  qrMode: z.enum(["ROLLING", "STATIC"]),
  staticQrExpiryDays: z.number().int().min(1).max(90).optional(),
});

const pincodeStatePrefixes: Record<string, string[]> = {
  Maharashtra: ["40", "41", "42", "43", "44"],
  Karnataka: ["56", "57", "58", "59"],
  Delhi: ["11"],
  "Uttar Pradesh": ["20", "21", "22", "24", "25", "26", "27", "28"],
  Haryana: ["12", "13"],
  Punjab: ["14", "15", "16"],
  Rajasthan: ["30", "31", "32", "33", "34"],
  Gujarat: ["36", "37", "38", "39"],
  Tamilnadu: ["60", "61", "62", "63", "64"],
  "Tamil Nadu": ["60", "61", "62", "63", "64"],
  Kerala: ["67", "68", "69"],
  Telangana: ["50"],
  "Andhra Pradesh": ["51", "52", "53"],
  Odisha: ["75", "76", "77"],
  "West Bengal": ["70", "71", "72", "73", "74"],
  Bihar: ["80", "81", "82", "83", "84", "85"],
  Jharkhand: ["82", "83"],
  Assam: ["78"],
};

function branchLocationWarnings(input: { state?: string | null; pincode?: string | null }) {
  const state = input.state?.trim();
  const pincode = input.pincode?.trim();
  if (!state || !pincode || !/^\d{6}$/.test(pincode)) {
    return [];
  }
  const prefixes = Object.entries(pincodeStatePrefixes).find(
    ([candidate]) => candidate.toLowerCase() === state.toLowerCase(),
  )?.[1];
  if (!prefixes?.length || prefixes.some((prefix) => pincode.startsWith(prefix))) {
    return [];
  }
  return [
    `The pincode does not look typical for ${state}. You can still save it if the address is correct.`,
  ];
}

async function resolveBranchLocation(input: z.infer<typeof branchManageBaseSchema>) {
  if (input.googleMapsUrl) {
    const place = await getMapProviderOrThrow().resolveGoogleMapsLink(input.googleMapsUrl);
    if (!place) {
      throw validationError("Unable to resolve the provided Google Maps link.");
    }
    return {
      ...input,
      latitude: place.latitude,
      longitude: place.longitude,
      locationSource: place.locationSource === "MOCK" ? "MANUAL" : place.locationSource,
    };
  }
  if (input.latitude != null && input.longitude != null) {
    return input;
  }
  const place = await getMapProviderOrThrow().geocodeAddress({
    address: input.address,
    city: input.city,
    state: input.state,
    pincode: input.pincode,
  });
  return {
    ...input,
    latitude: place.latitude,
    longitude: place.longitude,
    locationSource: place.locationSource === "MOCK" ? "MANUAL" : place.locationSource,
  };
}

async function assertBranchManager(orgId: string, managerId?: string | null) {
  if (!managerId) {
    return;
  }
  const assignment = await prisma.organizationRoleAssignment.findFirst({
    where: { orgId, userId: managerId, role: { in: ["OWNER", "ADMIN"] } },
  });
  if (!assignment) {
    throw validationError("Branch manager must be an active owner or admin.");
  }
}

export async function handleOrganizationBranches(request: NextRequest, path: string[]) {
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "branches"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgPermission(ctx, orgId, "ORG_MANAGE_LOCATION");
    return ok({
      branches: await prisma.branch.findMany({
        where: { orgId },
        orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      }),
    });
  }
  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "branches"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "ORG_MANAGE_LOCATION");
    await assertRateLimit(
      "branchCreationBurstByOwner",
      `${orgId}:${userId}`,
      "Please wait a moment before adding another branch.",
    );
    await assertRateLimit(
      "branchCreationByOwner",
      `${orgId}:${userId}`,
      "Please wait a moment before adding another branch.",
    );
    const body = await resolveBranchLocation(branchManageSchema.parse(await readJson(request)));
    const warnings = branchLocationWarnings(body);
    await assertBranchManager(orgId, body.managerId);
    const duplicate = await prisma.branch.findFirst({
      where: { orgId, address: body.address, city: body.city, active: true },
    });
    if (duplicate) {
      throw conflictError("A branch with this address already exists.");
    }
    const [{ tier, entitlements }, activeBranchCount] = await Promise.all([
      getOrgSaasEntitlements(orgId),
      prisma.branch.count({ where: { orgId, active: true } }),
    ]);
    assertLimitAvailable({
      limit: entitlements.branchLimit,
      used: activeBranchCount,
      label: "Branch",
      tier,
    });
    const branch = await prisma.$transaction(async (tx) => {
      const previousDefault = await tx.branch.findFirst({
        where: { orgId, isDefault: true, active: true },
      });
      if (body.isDefault) {
        await tx.branch.updateMany({
          where: { orgId, isDefault: true },
          data: { isDefault: false },
        });
      }
      const created = await tx.branch.create({
        data: clean({
          orgId,
          name: body.name,
          address: body.address,
          city: body.city,
          state: body.state,
          pincode: body.pincode,
          latitude: body.latitude != null ? new Prisma.Decimal(body.latitude) : undefined,
          longitude: body.longitude != null ? new Prisma.Decimal(body.longitude) : undefined,
          googleMapsUrl: body.googleMapsUrl,
          locationSource: body.locationSource ?? "MANUAL",
          contactPhone: body.contactPhone,
          contactEmail: body.contactEmail,
          whatsappNumber: body.whatsappNumber ?? body.contactPhone,
          operatingHours: body.operatingHours as Prisma.InputJsonValue | undefined,
          amenities: body.amenities,
          managerId: body.managerId,
          logoAssetId: body.logoAssetId,
          coverAssetId: body.coverAssetId,
          isDefault: body.isDefault ?? false,
          active: body.active ?? true,
        }),
      });
      const activeDefault = await tx.branch.findFirst({
        where: { orgId, isDefault: true, active: true },
      });
      const sharedCommerceSource = body.isDefault ? previousDefault : activeDefault;
      if (body.commerceSetup === "SHARED" && sharedCommerceSource) {
        const [plans, products] = await Promise.all([
          tx.membershipPlan.findMany({
            where: {
              orgId,
              active: true,
              OR: [{ branchId: null }, { branchId: sharedCommerceSource.id }],
            },
          }),
          tx.product.findMany({
            where: {
              orgId,
              active: true,
              OR: [{ branchId: null }, { branchId: sharedCommerceSource.id }],
            },
          }),
        ]);
        if (plans.length) {
          await tx.membershipPlan.createMany({
            data: plans.map((plan) =>
              clean({
                orgId,
                branchId: created.id,
                name: plan.name,
                description: plan.description,
                type: plan.type,
                pricePaise: plan.pricePaise,
                currency: plan.currency,
                gstRateBps: plan.gstRateBps,
                joiningFeePaise: plan.joiningFeePaise,
                durationDays: plan.durationDays,
                visitLimit: plan.visitLimit,
                validityDays: plan.validityDays,
                startDate: plan.startDate,
                endDate: plan.endDate,
                accessDays: plan.accessDays as Prisma.InputJsonValue | undefined,
                maxEntriesPerDay: plan.maxEntriesPerDay,
                active: plan.active,
                publicVisible: plan.publicVisible,
                terms: plan.terms,
                cancellationPolicy: plan.cancellationPolicy,
                createdById: userId,
              }),
            ),
          });
        }
        if (products.length) {
          await tx.product.createMany({
            data: products.map((product) =>
              clean({
                orgId,
                branchId: created.id,
                name: product.name,
                description: product.description,
                category: product.category,
                pricePaise: product.pricePaise,
                stock: product.stock,
                lowStockThreshold: product.lowStockThreshold,
                imageUrl: product.imageUrl,
                active: product.active,
                taxRateBps: product.taxRateBps,
              }),
            ),
          });
        }
      }
      if (!activeDefault) {
        await tx.branch.update({
          where: { id: created.id },
          data: { isDefault: true, active: true },
        });
        return tx.branch.findUniqueOrThrow({ where: { id: created.id } });
      }
      return created;
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "branch.created",
      entityType: "branch",
      entityId: branch.id,
      metadata: {
        name: branch.name,
        isDefault: branch.isDefault,
        commerceSetup: body.commerceSetup,
      },
    });
    await invalidateOrganizationDashboardCache(orgId, { branchId: branch.id });
    return ok({ branch, warnings });
  }
  if (
    request.method === "PATCH" &&
    pathMatches(path, ["orgs", /.+/, "branches", /.+/, "qr-settings"])
  ) {
    const orgId = path[1]!;
    const branchId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "ORG_MANAGE_LOCATION");
    const body = branchQrSettingsSchema.parse(await readJson(request));
    const existing = await prisma.branch.findFirst({ where: { id: branchId, orgId } });
    if (!existing) {
      throw notFoundError("Branch not found");
    }
    const branch = await prisma.$transaction(async (tx) => {
      const updated = await tx.branch.update({
        where: { id: branchId },
        data: clean({
          qrMode: body.qrMode,
          staticQrExpiryDays: body.staticQrExpiryDays,
        }),
      });
      await tx.attendanceQrToken.updateMany({
        where: { orgId, branchId, expiresAt: { gt: new Date() } },
        data: { expiresAt: new Date() },
      });
      return updated;
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "branch.qr_settings_updated",
      entityType: "branch",
      entityId: branch.id,
      metadata: {
        qrMode: branch.qrMode,
        staticQrExpiryDays: branch.staticQrExpiryDays,
      },
    });
    return ok({ branch });
  }

  if (request.method === "PATCH" && pathMatches(path, ["orgs", /.+/, "branches", /.+/])) {
    const orgId = path[1]!;
    const branchId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "ORG_MANAGE_LOCATION");
    const body = branchManageBaseSchema.partial().parse(await readJson(request));
    const existing = await prisma.branch.findFirst({ where: { id: branchId, orgId } });
    if (!existing) {
      throw notFoundError("Branch not found");
    }
    const warnings = branchLocationWarnings({
      state: body.state ?? existing.state,
      pincode: body.pincode ?? existing.pincode,
    });
    await assertBranchManager(orgId, body.managerId);
    if (body.address || body.city) {
      const duplicate = await prisma.branch.findFirst({
        where: {
          orgId,
          address: body.address ?? existing.address,
          city: body.city ?? existing.city,
          active: true,
          id: { not: branchId },
        },
      });
      if (duplicate) {
        throw conflictError("A branch with this address already exists.");
      }
    }
    const shouldResolveLocation =
      Boolean(body.googleMapsUrl) ||
      ((body.address || body.city || body.state || body.pincode) &&
        (body.latitude == null || body.longitude == null));
    const resolvedBody =
      shouldResolveLocation
        ? await resolveBranchLocation({
            name: body.name ?? existing.name,
            address: body.address ?? existing.address,
            city: body.city ?? existing.city,
            state: body.state ?? existing.state,
            pincode: body.pincode ?? existing.pincode,
            latitude: body.latitude ?? undefined,
            longitude: body.longitude ?? undefined,
            locationSource: body.locationSource ?? undefined,
            googleMapsUrl: body.googleMapsUrl,
            contactPhone: body.contactPhone ?? existing.contactPhone ?? "",
            contactEmail: body.contactEmail ?? existing.contactEmail,
            whatsappNumber: body.whatsappNumber ?? existing.whatsappNumber,
            operatingHours: (body.operatingHours ?? existing.operatingHours) as never,
          })
        : body;
    const branch = await prisma.$transaction(async (tx) => {
      if (body.isDefault) {
        await tx.branch.updateMany({
          where: { orgId, isDefault: true, id: { not: branchId } },
          data: { isDefault: false },
        });
      }
      const updated = await tx.branch.update({
        where: { id: branchId },
        data: clean({
          name: resolvedBody.name,
          address: resolvedBody.address,
          city: resolvedBody.city,
          state: resolvedBody.state,
          pincode: resolvedBody.pincode,
          latitude:
            resolvedBody.latitude != null
              ? new Prisma.Decimal(resolvedBody.latitude)
              : resolvedBody.latitude,
          longitude:
            resolvedBody.longitude != null
              ? new Prisma.Decimal(resolvedBody.longitude)
              : resolvedBody.longitude,
          googleMapsUrl: resolvedBody.googleMapsUrl,
          locationSource: resolvedBody.locationSource,
          contactPhone: resolvedBody.contactPhone,
          contactEmail: resolvedBody.contactEmail,
          whatsappNumber: resolvedBody.whatsappNumber,
          operatingHours:
            body.operatingHours === null
              ? Prisma.JsonNull
              : (body.operatingHours as Prisma.InputJsonValue | undefined),
          amenities: body.amenities,
          managerId: body.managerId,
          logoAssetId: body.logoAssetId,
          coverAssetId: body.coverAssetId,
          isDefault: body.isDefault,
          active: body.active,
        }),
      });
      if (updated.isDefault && !updated.active) {
        throw conflictError("Default branch must stay active.");
      }
      if (existing.isDefault && body.isDefault === false) {
        const replacement = await tx.branch.findFirst({
          where: { orgId, active: true, id: { not: branchId } },
          orderBy: { createdAt: "asc" },
        });
        if (!replacement) {
          throw conflictError("At least one active default branch is required.");
        }
        await tx.branch.update({ where: { id: replacement.id }, data: { isDefault: true } });
      }
      return updated;
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "branch.updated",
      entityType: "branch",
      entityId: branch.id,
      metadata: { name: branch.name, isDefault: branch.isDefault, active: branch.active },
    });
    await invalidateOrganizationDashboardCache(orgId, { branchId: branch.id });
    return ok({ branch, warnings });
  }
  if (request.method === "DELETE" && pathMatches(path, ["orgs", /.+/, "branches", /.+/])) {
    const orgId = path[1]!;
    const branchId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "ORG_MANAGE_LOCATION");
    const existing = await prisma.branch.findFirst({ where: { id: branchId, orgId } });
    if (!existing) {
      throw notFoundError("Branch not found");
    }
    if (existing.isDefault) {
      throw conflictError(
        "Default branch cannot be deactivated. Make another branch default first.",
      );
    }
    const branch = await prisma.branch.update({
      where: { id: branchId },
      data: { active: false },
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "branch.deactivated",
      entityType: "branch",
      entityId: branch.id,
      metadata: { name: branch.name },
    });
    await invalidateOrganizationDashboardCache(orgId, { branchId: branch.id });
    return ok({ branch });
  }
  return undefined;
}
