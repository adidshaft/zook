import { getAppEnv, isTruthy, zookDemoFixtures } from "@zook/core";
import { applyCoupon } from "@zook/core/services";
import { prisma } from "@zook/db";
import { cachedJson } from "./server-cache";

export type PublicGymPlan = {
  id: string;
  handle: string;
  name: string;
  description: string | null;
  type: string;
  pricePaise: number;
  durationDays: number | null;
  visitLimit: number | null;
  publicVisible: boolean;
};

export type PublicGymTrainer = {
  userId: string;
  name: string;
  profilePhotoUrl: string | null;
  bio: string | null;
  specialties: unknown;
  ptAvailable: boolean;
  visibleToMembers: boolean;
};

export type PublicGymBranch = {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  googleMapsUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  isDefault?: boolean;
};

export type PublicGymReferral = {
  code: string;
  status: string;
  discountPaise: number;
  discountPercentBps: number | null;
};

export type PublicGymProfileData = {
  org: {
    id: string;
    name: string;
    username: string;
    address: string;
    city: string;
    state: string;
    joinMode: string;
    amenities: string[];
    coverImageUrl: string | null;
    logoUrl: string | null;
    tagline: string | null;
    gallery: string[];
    facilities: string[];
    equipment: string[];
    gymType: string | null;
    openingHoursSummary: string | null;
    latitude: number | null;
    longitude: number | null;
    appStoreUrl: string | null;
    playStoreUrl: string | null;
  };
  branches: PublicGymBranch[];
  plans: PublicGymPlan[];
  trainers: PublicGymTrainer[];
  referral: PublicGymReferral | null;
  connected: boolean;
};

export type PublicCouponPreview = {
  code: string;
  discountPaise: number;
  finalAmountPaise: number;
};

export function canUsePublicDemoFallback() {
  return (
    getAppEnv() === "local" &&
    (process.env.API_MODE === "offline-demo" || isTruthy(process.env.WEB_DEMO_FALLBACK))
  );
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function demoGymMedia(username?: string | null) {
  if (username === "aarogya-strength" || username === "your-fitness") {
    const base = `/seed/gyms/${username}`;
    return {
      logoUrl: `${base}/logo.svg`,
      coverImageUrl: `${base}/cover.png`,
      gallery: [
        `${base}/gallery-01.png`,
        `${base}/gallery-02.png`,
        `${base}/gallery-03.png`,
        `${base}/gallery-04.png`,
        `${base}/gallery-05.png`,
      ],
    };
  }
  return { logoUrl: null, coverImageUrl: null, gallery: [] };
}

function settingsRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function couponInput(coupon: {
  id: string;
  orgId: string;
  code: string;
  type: "FIXED_AMOUNT" | "PERCENTAGE";
  valuePaise: number | null;
  valuePercentBps: number | null;
  active: boolean;
  validFrom: Date | null;
  validUntil: Date | null;
  maxRedemptions: number | null;
  perUserLimit: number | null;
  applicablePlanId: string | null;
}) {
  return {
    id: coupon.id,
    orgId: coupon.orgId,
    code: coupon.code,
    type: coupon.type,
    ...(coupon.valuePaise !== null ? { valuePaise: coupon.valuePaise } : {}),
    ...(coupon.valuePercentBps !== null ? { valuePercentBps: coupon.valuePercentBps } : {}),
    active: coupon.active,
    ...(coupon.validFrom ? { validFrom: coupon.validFrom } : {}),
    ...(coupon.validUntil ? { validUntil: coupon.validUntil } : {}),
    ...(coupon.maxRedemptions !== null ? { maxRedemptions: coupon.maxRedemptions } : {}),
    ...(coupon.perUserLimit !== null ? { perUserLimit: coupon.perUserLimit } : {}),
    ...(coupon.applicablePlanId ? { applicablePlanId: coupon.applicablePlanId } : {}),
  };
}

function publicTrainerPhotoUrl(value: string | null | undefined) {
  if (!value || value.includes("..") || value.startsWith("file:")) {
    return null;
  }
  return value;
}

function hasPtAvailability(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  if (typeof record.ptAvailable === "boolean") {
    return record.ptAvailable;
  }
  if (Array.isArray(record.slots)) {
    return record.slots.length > 0;
  }
  return false;
}

function dateStamp(value?: Date | null) {
  return value?.getTime() ?? 0;
}

async function publicGymCacheKey(username: string, referralCode?: string) {
  const normalizedReferralCode = referralCode?.trim().toUpperCase() || "";
  const org = await prisma.organization.findUnique({
    where: { username },
    select: { id: true, updatedAt: true, visibility: true },
  });

  if (!org || org.visibility === "HIDDEN") {
    return null;
  }

  const [plansVersion, settings, trainerRolesVersion, trainerProfilesVersion, referral] =
    await Promise.all([
      prisma.membershipPlan.aggregate({
        where: { orgId: org.id, active: true, publicVisible: true },
        _count: { _all: true },
        _max: { updatedAt: true },
      }),
      prisma.organizationSetting.findUnique({
        where: { orgId: org.id },
        select: { updatedAt: true },
      }),
      prisma.organizationRoleAssignment.aggregate({
        where: { orgId: org.id, role: "TRAINER" },
        _count: { _all: true },
        _max: { createdAt: true },
      }),
      prisma.trainerProfile.aggregate({
        where: { orgId: org.id },
        _count: { _all: true },
        _max: { updatedAt: true },
      }),
      normalizedReferralCode
        ? prisma.referralCode.findUnique({
            where: { code: normalizedReferralCode },
            select: { orgId: true, updatedAt: true, couponId: true },
          })
        : Promise.resolve(null),
    ]);

  return [
    "public-gym",
    username,
    normalizedReferralCode,
    org.id,
    dateStamp(org.updatedAt),
    plansVersion._count._all,
    dateStamp(plansVersion._max.updatedAt),
    dateStamp(settings?.updatedAt),
    trainerRolesVersion._count._all,
    dateStamp(trainerRolesVersion._max.createdAt),
    trainerProfilesVersion._count._all,
    dateStamp(trainerProfilesVersion._max.updatedAt),
    referral?.orgId === org.id ? dateStamp(referral.updatedAt) : 0,
    referral?.orgId === org.id ? (referral.couponId ?? "") : "",
  ].join(":");
}

function durationHandle(plan: { type: string; durationDays: number | null }) {
  if (plan.type === "TRIAL") return "trial";
  if (!plan.durationDays) return "visit-pack";
  if (plan.durationDays <= 45) return "monthly";
  if (plan.durationDays <= 110) return "quarterly";
  if (plan.durationDays <= 220) return "half-yearly";
  return "annual";
}

function publicPlanBaseHandle(plan: {
  type: string;
  durationDays: number | null;
  pricePaise: number;
  visitLimit: number | null;
}) {
  const visit = plan.visitLimit ? `${plan.visitLimit}-visit` : "unlimited";
  const price = plan.pricePaise > 0 ? `${Math.round(plan.pricePaise / 100)}` : "free";
  return `${durationHandle(plan)}-${visit}-${price}`;
}

function withPublicPlanHandles(plans: Array<Omit<PublicGymPlan, "handle">>): PublicGymPlan[] {
  const seen = new Map<string, number>();
  return plans.map((plan) => {
    const base = publicPlanBaseHandle(plan);
    const nextCount = (seen.get(base) ?? 0) + 1;
    seen.set(base, nextCount);
    return {
      ...plan,
      handle: nextCount === 1 ? base : `${base}-${nextCount}`,
    };
  });
}

function demoPublicGymProfile(
  username: string,
  referralCode?: string,
): PublicGymProfileData | null {
  const org = zookDemoFixtures.organizations.find((gym) => gym.username === username);
  if (!org) {
    return null;
  }
  const media = demoGymMedia(org.username);
  const usersById = new Map(zookDemoFixtures.users.map((user) => [user.id, user]));
  const referral = referralCode
    ? zookDemoFixtures.referralCodes.find(
        (code) => code.code.toLowerCase() === referralCode.toLowerCase(),
      )
    : null;
  return {
    connected: false,
    org: {
      id: org.id,
      name: org.name,
      username: org.username,
      address: org.address,
      city: org.city,
      state: org.state,
      joinMode: org.joinMode,
      amenities: org.amenities,
      coverImageUrl: media.coverImageUrl,
      logoUrl: media.logoUrl,
      tagline: null,
      gallery: media.gallery,
      facilities: [],
      equipment: [],
      gymType: null,
      openingHoursSummary: null,
      latitude: null,
      longitude: null,
      appStoreUrl: null,
      playStoreUrl: null,
    },
    branches: zookDemoFixtures.branches
      .filter((branch) => branch.orgId === org.id)
      .map((branch, index) => ({
        id: branch.id,
        name: branch.name,
        address: branch.address,
        city: branch.city,
        state: branch.state,
        googleMapsUrl: branch.googleMapsUrl ?? null,
        latitude: branch.latitude ?? null,
        longitude: branch.longitude ?? null,
        isDefault: index === 0,
      })),
    plans: withPublicPlanHandles(
      zookDemoFixtures.membershipPlans
        .filter((plan) => plan.orgId === org.id && plan.publicVisible)
        .map((plan) => ({
          id: plan.id,
          name: plan.name,
          description: plan.description,
          type: plan.type,
          pricePaise: plan.pricePaise,
          durationDays: plan.durationDays,
          visitLimit: plan.visitLimit || null,
          publicVisible: plan.publicVisible,
        })),
    ),
    trainers: zookDemoFixtures.trainerClientAssignments
      .filter((assignment) => assignment.orgId === org.id)
      .map((assignment) => {
        const user = usersById.get(assignment.trainerUserId);
        return {
          userId: assignment.trainerUserId,
          name: user?.name ?? "Trainer",
          profilePhotoUrl: null,
          bio: null,
          specialties: null,
          ptAvailable: false,
          visibleToMembers: true,
        };
      }),
    referral: referral
      ? {
          code: referral.code,
          status: referral.status,
          discountPaise: referral.discountPaise,
          discountPercentBps: null,
        }
      : null,
  };
}

async function publicGymProfileFromDb(
  username: string,
  referralCode?: string,
): Promise<PublicGymProfileData | null> {
  const org = await prisma.organization.findUnique({ where: { username } });
  if (!org || org.visibility === "HIDDEN") {
    return null;
  }

  const [plans, trainerAssignments, settings, referral, branches] = await Promise.all([
    prisma.membershipPlan.findMany({
      where: { orgId: org.id, active: true, publicVisible: true },
      orderBy: [{ pricePaise: "asc" }, { createdAt: "asc" }],
      take: 12,
    }),
    prisma.organizationRoleAssignment.findMany({
      where: { orgId: org.id, role: "TRAINER" },
      take: 8,
    }),
    prisma.organizationSetting.findUnique({ where: { orgId: org.id } }),
    referralCode
      ? prisma.referralCode.findUnique({
          where: { code: referralCode.toUpperCase() },
        })
      : Promise.resolve(null),
    prisma.branch.findMany({
      where: { orgId: org.id },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        address: true,
        city: true,
        state: true,
        googleMapsUrl: true,
        latitude: true,
        longitude: true,
        isDefault: true,
      },
      take: 6,
    }),
  ]);

  const trainerUserIds = trainerAssignments.map((assignment) => assignment.userId);
  const [trainerUsers, trainerProfiles, coupon] = await Promise.all([
    trainerUserIds.length
      ? prisma.user.findMany({ where: { id: { in: trainerUserIds } } })
      : Promise.resolve([]),
    trainerUserIds.length
      ? prisma.trainerProfile.findMany({ where: { orgId: org.id, userId: { in: trainerUserIds } } })
      : Promise.resolve([]),
    referral?.couponId
      ? prisma.coupon.findFirst({ where: { id: referral.couponId, orgId: org.id, active: true } })
      : Promise.resolve(null),
  ]);

  const trainerUsersById = new Map(trainerUsers.map((user) => [user.id, user]));
  const trainerProfilesByUserId = new Map(
    trainerProfiles.map((profile) => [profile.userId, profile]),
  );
  const settingValues = settingsRecord(settings?.keyValues);
  const demoMedia = canUsePublicDemoFallback() ? demoGymMedia(org.username) : null;
  const referralBelongsToOrg = referral?.orgId === org.id;

  return {
    connected: true,
    org: {
      id: org.id,
      name: org.name,
      username: org.username,
      address: org.address,
      city: org.city,
      state: org.state,
      joinMode: org.joinMode,
      amenities: stringArray(org.amenities),
      coverImageUrl: org.coverImageUrl ?? demoMedia?.coverImageUrl ?? null,
      logoUrl: org.logoUrl ?? demoMedia?.logoUrl ?? null,
      tagline: typeof settingValues.tagline === "string" ? settingValues.tagline : null,
      gallery: stringArray(settingValues.gallery).length
        ? stringArray(settingValues.gallery)
        : demoMedia?.gallery ?? [],
      facilities: stringArray(settingValues.facilities),
      equipment: stringArray(settingValues.equipment),
      gymType: typeof settingValues.gymType === "string" ? settingValues.gymType : null,
      openingHoursSummary:
        typeof settingValues.openingHoursSummary === "string"
          ? settingValues.openingHoursSummary
          : null,
      latitude: org.latitude ? Number(org.latitude) : null,
      longitude: org.longitude ? Number(org.longitude) : null,
      appStoreUrl: typeof settingValues.appStoreUrl === "string" ? settingValues.appStoreUrl : null,
      playStoreUrl:
        typeof settingValues.playStoreUrl === "string" ? settingValues.playStoreUrl : null,
    },
    branches: branches.map((branch) => ({
      id: branch.id,
      name: branch.name,
      address: branch.address,
      city: branch.city,
      state: branch.state,
      googleMapsUrl: branch.googleMapsUrl,
      latitude: branch.latitude ? Number(branch.latitude) : null,
      longitude: branch.longitude ? Number(branch.longitude) : null,
      isDefault: branch.isDefault,
    })),
    plans: withPublicPlanHandles(
      plans.map((plan) => ({
        id: plan.id,
        name: plan.name,
        description: plan.description,
        type: plan.type,
        pricePaise: plan.pricePaise,
        durationDays: plan.durationDays,
        visitLimit: plan.visitLimit,
        publicVisible: plan.publicVisible,
      })),
    ),
    trainers: trainerAssignments
      .map((assignment) => {
        const user = trainerUsersById.get(assignment.userId) ?? null;
        const profile = trainerProfilesByUserId.get(assignment.userId) ?? null;
        return {
          userId: assignment.userId,
          name: user?.name ?? "Trainer",
          profilePhotoUrl: publicTrainerPhotoUrl(user?.profilePhotoUrl),
          bio: profile?.bio ?? null,
          specialties: profile?.specialties ?? null,
          ptAvailable: hasPtAvailability(profile?.availability),
          visibleToMembers: profile?.visibleToMembers ?? true,
        };
      })
      .filter((trainer) => trainer.visibleToMembers !== false),
    referral:
      referral && referralBelongsToOrg
        ? {
            code: referral.code,
            status: referral.status,
            discountPaise: coupon?.valuePaise ?? 0,
            discountPercentBps: coupon?.valuePercentBps ?? null,
          }
        : null,
  };
}

export async function getPublicGymProfileData(username: string, referralCode?: string) {
  try {
    const cacheKey = await publicGymCacheKey(username, referralCode);
    if (cacheKey) {
      return cachedJson(cacheKey, 60, () => publicGymProfileFromDb(username, referralCode));
    }

    const data = await publicGymProfileFromDb(username, referralCode);
    if (data || !canUsePublicDemoFallback()) {
      return data;
    }
  } catch (error) {
    if (!canUsePublicDemoFallback()) {
      throw error;
    }
  }
  return demoPublicGymProfile(username, referralCode);
}

export async function getPublicCouponPreview(input: {
  orgId: string;
  planId: string;
  couponCode: string;
  amountPaise: number;
  userId?: string;
}): Promise<PublicCouponPreview | null> {
  const code = input.couponCode.trim().toUpperCase();
  if (!code) {
    return null;
  }

  const coupon = await prisma.coupon.findUnique({
    where: { orgId_code: { orgId: input.orgId, code } },
  });
  if (!coupon) {
    return null;
  }

  const [totalRedemptions, userRedemptions] = await Promise.all([
    prisma.couponRedemption.count({ where: { orgId: input.orgId, couponId: coupon.id } }),
    input.userId
      ? prisma.couponRedemption.count({
          where: { orgId: input.orgId, couponId: coupon.id, userId: input.userId },
        })
      : Promise.resolve(0),
  ]);
  const result = applyCoupon(couponInput(coupon), {
    amountPaise: input.amountPaise,
    planId: input.planId,
    redemptionCount: { total: totalRedemptions, byUser: userRedemptions },
  });

  return {
    code: coupon.code,
    discountPaise: result.discountPaise,
    finalAmountPaise: result.finalAmountPaise,
  };
}
