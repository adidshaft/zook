import { prisma } from "@zook/db";
import type { NextRequest } from "next/server";

import { getRequestContext } from "../access";
import { buildGymDiscoveryResults } from "../gym-discovery";
import { assertRateLimit } from "../rate-limit";
import { fail, ok } from "../response";
import { getClientIp } from "../security";
import { computeDiscountPaise, getMapProviderOrThrow, pathMatches } from "./core";

function publicTrainerPhotoUrl(value: string | null | undefined) {
  if (!value || value.startsWith("/api/files/")) {
    return null;
  }
  return value;
}

export async function handlePublicOrganizations(request: NextRequest, path: string[]) {
  if (request.method === "GET" && pathMatches(path, ["orgs", "public", "search"])) {
    await assertRateLimit(
      "publicOrgSearchByIp",
      getClientIp(request),
      "Too many gym searches from this IP.",
    );
    const query = request.nextUrl.searchParams.get("q") ?? "";
    const city = request.nextUrl.searchParams.get("city") ?? undefined;
    const limit = Math.min(
      50,
      Math.max(1, Number(request.nextUrl.searchParams.get("limit") ?? 50)),
    );
    const cursor = request.nextUrl.searchParams.get("cursor") ?? undefined;
    const nearLat = request.nextUrl.searchParams.get("nearLat");
    const nearLng = request.nextUrl.searchParams.get("nearLng");
    const gyms = await prisma.organization.findMany({
      where: {
        ...(city ? { city: { contains: city, mode: "insensitive" } } : {}),
        ...(query
          ? {
              OR: [
                { name: { contains: query, mode: "insensitive" } },
                { username: { contains: query, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      take: limit + 1,
    });
    const pageGyms = gyms.slice(0, limit);
    const results = buildGymDiscoveryResults({
      gyms: pageGyms.map((gym) => ({
        id: gym.id,
        name: gym.name,
        username: gym.username,
        city: gym.city,
        state: gym.state,
        visibility: gym.visibility,
        joinMode: gym.joinMode,
        latitude: gym.latitude ? Number(gym.latitude) : null,
        longitude: gym.longitude ? Number(gym.longitude) : null,
        amenities: Array.isArray(gym.amenities)
          ? gym.amenities.filter((item): item is string => typeof item === "string")
          : [],
        coverImageUrl: gym.coverImageUrl,
        logoUrl: gym.logoUrl,
      })),
      ...(query ? { query } : {}),
      ...(city ? { city } : {}),
      ...(nearLat && nearLng
        ? { near: { latitude: Number(nearLat), longitude: Number(nearLng) } }
        : {}),
      mapProvider: getMapProviderOrThrow(),
    });
    return ok({ gyms: results, nextCursor: gyms.length > limit ? gyms[limit]?.id : null });
  }
  if (request.method === "GET" && pathMatches(path, ["platform-referrals", "lookup"])) {
    const code = request.nextUrl.searchParams.get("code")?.trim().toLowerCase();
    if (!code) {
      return ok({ match: null });
    }
    const sourceOrg = await prisma.organization.findUnique({
      where: { username: code },
      select: { id: true, name: true, username: true, city: true },
    });
    if (!sourceOrg) {
      return ok({ match: null });
    }
    return ok({
      match: {
        code: sourceOrg.username.toUpperCase(),
        sourceOrgName: sourceOrg.name,
        sourceOrgCity: sourceOrg.city,
      },
    });
  }
  if (request.method === "GET" && pathMatches(path, ["orgs", "public", /.+/])) {
    const username = path[2]!;
    const ctx = await getRequestContext(request);
    const viewerUserId = ctx.userId;
    const referralCode = request.nextUrl.searchParams.get("ref")?.toUpperCase() ?? undefined;
    const org = await prisma.organization.findUnique({ where: { username } });
    if (!org || org.visibility === "HIDDEN") {
      return fail("NOT_FOUND", "Gym not found", 404);
    }
    const [
      plans,
      activeMembership,
      pendingJoinRequest,
      approvedJoinRequest,
      referral,
      trainerAssignments,
      branches,
      settings,
      offers,
    ] = await Promise.all([
      prisma.membershipPlan.findMany({
        where: { orgId: org.id, active: true, publicVisible: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      viewerUserId
        ? prisma.memberSubscription.findFirst({
            where: { orgId: org.id, memberUserId: viewerUserId, status: "ACTIVE" },
            orderBy: { createdAt: "desc" },
          })
        : Promise.resolve(null),
      viewerUserId
        ? prisma.membershipJoinRequest.findFirst({
            where: { orgId: org.id, userId: viewerUserId, status: "pending" },
            orderBy: { createdAt: "desc" },
          })
        : Promise.resolve(null),
      viewerUserId
        ? prisma.membershipJoinRequest.findFirst({
            where: { orgId: org.id, userId: viewerUserId, status: "approved" },
            orderBy: { reviewedAt: "desc" },
          })
        : Promise.resolve(null),
      referralCode
        ? prisma.referralCode.findUnique({ where: { code: referralCode } })
        : Promise.resolve(null),
      prisma.organizationRoleAssignment.findMany({
        where: { orgId: org.id, role: "TRAINER" },
        take: 8,
      }),
      prisma.branch.findMany({ where: { orgId: org.id, active: true }, take: 5 }),
      prisma.organizationSetting.findUnique({ where: { orgId: org.id } }),
      prisma.offer.findMany({
        where: {
          orgId: org.id,
          active: true,
          startsAt: { lte: new Date() },
          endsAt: { gte: new Date() },
        },
        orderBy: { endsAt: "asc" },
        take: 10,
      }),
    ]);
    const [trainerUsers, trainerProfiles] = await Promise.all([
      prisma.user.findMany({
        where: { id: { in: trainerAssignments.map((assignment) => assignment.userId) } },
      }),
      prisma.trainerProfile.findMany({
        where: {
          orgId: org.id,
          userId: { in: trainerAssignments.map((assignment) => assignment.userId) },
        },
      }),
    ]);
    const settingValues =
      settings?.keyValues &&
      typeof settings.keyValues === "object" &&
      !Array.isArray(settings.keyValues)
        ? (settings.keyValues as Record<string, unknown>)
        : {};
    return ok({
      org: {
        ...org,
        tagline: typeof settingValues.tagline === "string" ? settingValues.tagline : null,
        gallery:
          Array.isArray(settingValues.gallery) &&
          settingValues.gallery.every((item) => typeof item === "string")
            ? settingValues.gallery
            : [],
        facilities:
          Array.isArray(settingValues.facilities) &&
          settingValues.facilities.every((item) => typeof item === "string")
            ? settingValues.facilities
            : [],
        equipment:
          Array.isArray(settingValues.equipment) &&
          settingValues.equipment.every((item) => typeof item === "string")
            ? settingValues.equipment
            : [],
        gymType: typeof settingValues.gymType === "string" ? settingValues.gymType : null,
        openingHoursSummary:
          typeof settingValues.openingHoursSummary === "string"
            ? settingValues.openingHoursSummary
            : null,
        appStoreUrl:
          typeof settingValues.appStoreUrl === "string" ? settingValues.appStoreUrl : null,
        playStoreUrl:
          typeof settingValues.playStoreUrl === "string" ? settingValues.playStoreUrl : null,
      },
      branches,
      trainers: trainerAssignments
        .map((assignment) => {
          const user = trainerUsers.find((candidate) => candidate.id === assignment.userId) ?? null;
          const profile =
            trainerProfiles.find((candidate) => candidate.userId === assignment.userId) ?? null;
          return {
            userId: assignment.userId,
            name: user?.name ?? "Trainer",
            profilePhotoUrl: publicTrainerPhotoUrl(user?.profilePhotoUrl),
            bio: profile?.bio ?? null,
            specialties: profile?.specialties ?? null,
            visibleToMembers: profile?.visibleToMembers ?? true,
          };
        })
        .filter((trainer) => trainer.visibleToMembers !== false),
      plans: plans.map((plan) => {
        const offer = offers.find((candidate) => {
          const applicablePlans = Array.isArray(candidate.applicablePlans)
            ? candidate.applicablePlans.filter((item): item is string => typeof item === "string")
            : [];
          const applies = applicablePlans.length === 0 || applicablePlans.includes(plan.id);
          return (
            applies &&
            (!candidate.maxRedemptions || candidate.redemptionCount < candidate.maxRedemptions)
          );
        });
        const offerDiscountPaise = offer
          ? computeDiscountPaise({
              type: offer.discountType,
              value: offer.discountValue,
              amountPaise: plan.pricePaise,
            })
          : 0;
        return {
          ...plan,
          activeOffer: offer
            ? {
                id: offer.id,
                name: offer.name,
                description: offer.description,
                discountType: offer.discountType,
                discountValue: offer.discountValue,
                endsAt: offer.endsAt,
              }
            : null,
          effectivePricePaise: Math.max(plan.pricePaise - offerDiscountPaise, 0),
        };
      }),
      offers,
      viewerState: viewerUserId
        ? {
            activeMembership,
            pendingJoinRequest,
            approvedJoinRequest,
          }
        : null,
      referral:
        referral && referral.orgId === org.id
          ? {
              code: referral.code,
              couponId: referral.couponId,
              status: referral.status,
              maxUses: referral.maxUses,
              redemptionCount: referral.redemptionCount,
            }
          : null,
    });
  }
  return undefined;
}
