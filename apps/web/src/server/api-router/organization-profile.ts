import { normalizeUsername } from "@zook/core/services";
import { Prisma, prisma } from "@zook/db";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { getRequestContext, requireOrgPermission } from "../access";
import { conflictError, notFoundError, validationError } from "../errors";
import { ok, readJson } from "../response";
import { writeAuditLog } from "../audit";
import {
  clean,
  getMapProviderOrThrow,
  getObjectMetadata,
  getOrganizationScopedFileAsset,
  pathMatches,
} from "./core";

const organizationAssetSchema = z
  .object({
    logoAssetId: z.string().optional(),
    coverAssetId: z.string().optional(),
  })
  .refine(
    (value) => Boolean(value.logoAssetId || value.coverAssetId),
    "Provide at least one file asset.",
  );

const organizationLocationSchema = z
  .object({
    address: z.string().trim().min(3).max(200),
    city: z.string().trim().min(2).max(120),
    state: z.string().trim().min(2).max(120),
    pincode: z.string().trim().min(4).max(12),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    googleMapsUrl: z.string().url().optional(),
    googlePlaceId: z.string().optional(),
  })
  .refine(
    (value) =>
      Boolean(
        value.googleMapsUrl || (value.latitude !== undefined && value.longitude !== undefined),
      ),
    "Provide manual latitude/longitude or a Google Maps link.",
  );

const organizationPublicProfileSchema = z.object({
  name: z.string().trim().min(2).max(120),
  username: z.string().trim().min(3).max(32).optional(),
  contactPhone: z.string().trim().min(8).max(20),
  contactEmail: z.string().trim().email(),
  address: z.string().trim().min(3).max(240),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
  pincode: z
    .string()
    .trim()
    .regex(/^\d{6}$/),
  amenities: z.array(z.string().trim().min(2).max(80)).default([]),
  equipment: z.array(z.string().trim().min(2).max(80)).max(60).default([]),
  visibility: z.enum(["PUBLIC", "INVITE_ONLY", "HIDDEN"]),
  joinMode: z.enum(["OPEN_JOIN", "APPROVAL_REQUIRED", "INVITE_ONLY"]),
  logoUrl: z.string().trim().url().optional().or(z.literal("")),
  coverImageUrl: z.string().trim().url().optional().or(z.literal("")),
  tagline: z.string().trim().max(160).optional(),
  gallery: z.array(z.string().trim().url()).max(15).default([]),
  galleryAssetIds: z.array(z.string()).max(15).optional(),
  facilities: z.array(z.string().trim().min(2).max(80)).max(24).default([]),
  gymType: z.string().trim().max(80).optional(),
  openingHoursSummary: z.string().trim().max(160).optional(),
  appStoreUrl: z.string().trim().url().optional().or(z.literal("")),
  playStoreUrl: z.string().trim().url().optional().or(z.literal("")),
});

export async function handleOrganizationProfile(request: NextRequest, path: string[]) {
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "profile"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgPermission(ctx, orgId, "ORG_MANAGE_PROFILE");
    const [org, settings, branches] = await Promise.all([
      prisma.organization.findUnique({ where: { id: orgId } }),
      prisma.organizationSetting.findUnique({ where: { orgId } }),
      prisma.branch.findMany({
        where: { orgId },
        orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      }),
    ]);
    if (!org) {
      throw notFoundError("Organization not found");
    }
    const settingValues = getObjectMetadata(settings?.keyValues);
    return ok({
      org: {
        ...org,
        tagline: typeof settingValues.tagline === "string" ? settingValues.tagline : "",
        gallery: Array.isArray(settingValues.gallery)
          ? settingValues.gallery.filter((item): item is string => typeof item === "string")
          : [],
        facilities: Array.isArray(settingValues.facilities)
          ? settingValues.facilities.filter((item): item is string => typeof item === "string")
          : [],
        equipment: Array.isArray(settingValues.equipment)
          ? settingValues.equipment.filter((item): item is string => typeof item === "string")
          : [],
        gymType: typeof settingValues.gymType === "string" ? settingValues.gymType : "",
        openingHoursSummary:
          typeof settingValues.openingHoursSummary === "string"
            ? settingValues.openingHoursSummary
            : "",
        appStoreUrl: typeof settingValues.appStoreUrl === "string" ? settingValues.appStoreUrl : "",
        playStoreUrl:
          typeof settingValues.playStoreUrl === "string" ? settingValues.playStoreUrl : "",
      },
      branches,
      links: {
        publicProfile: `/in/${org.username}`,
        join: `/join/${org.username}`,
        appDeepLink: `zook://join/${org.username}`,
        qr: `/qr/${org.username}?target=join`,
      },
    });
  }
  if (request.method === "PATCH" && pathMatches(path, ["orgs", /.+/, "profile"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "ORG_MANAGE_PROFILE");
    const body = organizationPublicProfileSchema.parse(await readJson(request));
    const existing = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!existing) {
      throw notFoundError("Organization not found");
    }
    const nextUsername = body.username ? normalizeUsername(body.username) : existing.username;
    if (nextUsername !== existing.username) {
      const usernameOwner = await prisma.organization.findUnique({
        where: { username: nextUsername },
      });
      if (usernameOwner && usernameOwner.id !== orgId) {
        throw conflictError("This public username is already taken.");
      }
    }
    const galleryAssets = body.galleryAssetIds?.length
      ? await Promise.all(
          body.galleryAssetIds.map((assetId) =>
            getOrganizationScopedFileAsset(assetId, orgId, ["org_gallery"]),
          ),
        )
      : null;
    const gallery = galleryAssets
      ? galleryAssets.map((asset) => asset?.url).filter((url): url is string => Boolean(url))
      : body.gallery;
    const org = await prisma.$transaction(async (tx) => {
      const updated = await tx.organization.update({
        where: { id: orgId },
        data: clean({
          name: body.name,
          username: nextUsername,
          contactPhone: body.contactPhone,
          contactEmail: body.contactEmail,
          address: body.address,
          city: body.city,
          state: body.state,
          pincode: body.pincode,
          amenities: body.amenities,
          visibility: body.visibility,
          joinMode: body.joinMode,
          logoUrl: body.logoUrl || null,
          coverImageUrl: body.coverImageUrl || null,
        }),
      });
      if (nextUsername !== existing.username) {
        await tx.organizationUsernameHistory.create({
          data: {
            orgId,
            oldUsername: existing.username,
            newUsername: nextUsername,
            changedById: userId,
          },
        });
      }
      const currentSettings = await tx.organizationSetting.findUnique({ where: { orgId } });
      const currentValues = getObjectMetadata(currentSettings?.keyValues);
      await tx.organizationSetting.upsert({
        where: { orgId },
        create: {
          orgId,
          keyValues: {
            ...currentValues,
            tagline: body.tagline ?? "",
            gallery,
            facilities: body.facilities,
            equipment: body.equipment,
            gymType: body.gymType ?? "",
            openingHoursSummary: body.openingHoursSummary ?? "",
            appStoreUrl: body.appStoreUrl || "",
            playStoreUrl: body.playStoreUrl || "",
          } as Prisma.InputJsonValue,
        },
        update: {
          keyValues: {
            ...currentValues,
            tagline: body.tagline ?? "",
            gallery,
            facilities: body.facilities,
            equipment: body.equipment,
            gymType: body.gymType ?? "",
            openingHoursSummary: body.openingHoursSummary ?? "",
            appStoreUrl: body.appStoreUrl || "",
            playStoreUrl: body.playStoreUrl || "",
          } as Prisma.InputJsonValue,
        },
      });
      await tx.branch.updateMany({
        where: { orgId, isDefault: true },
        data: {
          address: body.address,
          city: body.city,
          state: body.state,
          pincode: body.pincode,
        },
      });
      return updated;
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "organization.public_profile_updated",
      entityType: "organization",
      entityId: orgId,
      metadata: {
        username: org.username,
        visibility: org.visibility,
        joinMode: org.joinMode,
      },
    });
    const branches = await prisma.branch.findMany({
      where: { orgId },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    });
    return ok({
      org: {
        ...org,
        tagline: body.tagline ?? "",
        gallery,
        facilities: body.facilities,
        equipment: body.equipment,
        gymType: body.gymType ?? "",
        openingHoursSummary: body.openingHoursSummary ?? "",
        appStoreUrl: body.appStoreUrl || "",
        playStoreUrl: body.playStoreUrl || "",
      },
      branches,
      links: {
        publicProfile: `/in/${org.username}`,
        join: `/join/${org.username}`,
        appDeepLink: `zook://join/${org.username}`,
        qr: `/qr/${org.username}?target=join`,
      },
    });
  }
  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "location", "resolve"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "ORG_MANAGE_LOCATION");
    const body = (await readJson(request)) as {
      googleMapsUrl?: string;
      address?: string;
      city?: string;
      state?: string;
      pincode?: string;
    };
    const mapProvider = getMapProviderOrThrow();
    const result = body.googleMapsUrl
      ? await mapProvider.resolveGoogleMapsLink(body.googleMapsUrl)
      : await mapProvider.geocodeAddress({
          address: body.address ?? "Manual address",
          city: body.city ?? "Pune",
          state: body.state ?? "Maharashtra",
          pincode: body.pincode ?? "411001",
        });
    if (!result) {
      throw validationError("Unable to resolve the provided Google Maps link.");
    }
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "organization.location_resolved",
      entityType: "organization",
      entityId: orgId,
      metadata: body,
    });
    return ok({ location: result });
  }
  if (request.method === "PATCH" && pathMatches(path, ["orgs", /.+/, "location"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "ORG_MANAGE_LOCATION");
    const body = organizationLocationSchema.parse(await readJson(request));
    const mapProvider = getMapProviderOrThrow();
    const resolvedFromLink = body.googleMapsUrl
      ? await mapProvider.resolveGoogleMapsLink(body.googleMapsUrl)
      : null;
    if (body.googleMapsUrl && !resolvedFromLink) {
      throw validationError("Unable to resolve the provided Google Maps link.");
    }
    const location = resolvedFromLink ?? {
      address: body.address,
      city: body.city,
      state: body.state,
      pincode: body.pincode,
      latitude: body.latitude ?? 0,
      longitude: body.longitude ?? 0,
      locationSource: "MANUAL" as const,
      ...(body.googlePlaceId ? { googlePlaceId: body.googlePlaceId } : {}),
      ...(body.googleMapsUrl ? { originalGoogleMapsUrl: body.googleMapsUrl } : {}),
      name: body.address,
    };
    const org = await prisma.organization.update({
      where: { id: orgId },
      data: clean({
        address: location.address,
        city: location.city,
        state: location.state,
        pincode: location.pincode,
        latitude: new Prisma.Decimal(location.latitude),
        longitude: new Prisma.Decimal(location.longitude),
        googlePlaceId: location.googlePlaceId,
        originalGoogleMapsUrl: location.originalGoogleMapsUrl,
        locationSource: location.locationSource as never,
      }),
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "organization.location_updated",
      entityType: "organization",
      entityId: org.id,
      metadata: clean({
        googleMapsUrl: body.googleMapsUrl,
        googlePlaceId: location.googlePlaceId,
        locationSource: location.locationSource,
      }),
    });
    return ok({ org });
  }
  if (request.method === "PATCH" && pathMatches(path, ["orgs", /.+/, "assets"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "ORG_MANAGE_PROFILE");
    const body = organizationAssetSchema.parse(await readJson(request));
    const [logoAsset, coverAsset] = await Promise.all([
      getOrganizationScopedFileAsset(body.logoAssetId, orgId, ["org_logo"]),
      getOrganizationScopedFileAsset(body.coverAssetId, orgId, ["org_cover"]),
    ]);
    const org = await prisma.organization.update({
      where: { id: orgId },
      data: clean({
        ...(logoAsset ? { logoUrl: logoAsset.url } : {}),
        ...(coverAsset ? { coverImageUrl: coverAsset.url } : {}),
      }),
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "organization.assets_updated",
      entityType: "organization",
      entityId: org.id,
      metadata: clean({
        logoAssetId: logoAsset?.id,
        coverAssetId: coverAsset?.id,
      }),
    });
    return ok({ org, assets: clean({ logoAsset, coverAsset }) });
  }
  if (request.method === "PATCH" && pathMatches(path, ["orgs", /.+/, "join-mode"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "ORG_MANAGE_PROFILE");
    const body = (await readJson(request)) as {
      joinMode: "OPEN_JOIN" | "APPROVAL_REQUIRED" | "INVITE_ONLY";
    };
    const org = await prisma.organization.update({
      where: { id: orgId },
      data: { joinMode: body.joinMode },
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "organization.join_mode_updated",
      entityType: "organization",
      entityId: org.id,
      metadata: { joinMode: body.joinMode },
    });
    return ok({ org });
  }
  return undefined;
}
