import { getAppEnv, isTruthy, zookDemoFixtures } from "@zook/core";
import { applyCoupon } from "@zook/core/services";
import { prisma } from "@zook/db";

export type PublicGymPlan = {
  id: string;
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
  visibleToMembers: boolean;
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
    gymType: string | null;
    openingHoursSummary: string | null;
    appStoreUrl: string | null;
    playStoreUrl: string | null;
  };
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

function demoPublicGymProfile(
  username: string,
  referralCode?: string,
): PublicGymProfileData | null {
  const org = zookDemoFixtures.organizations.find((gym) => gym.username === username);
  if (!org) {
    return null;
  }
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
      coverImageUrl: null,
      logoUrl: null,
      tagline: null,
      gallery: [],
      facilities: [],
      gymType: null,
      openingHoursSummary: null,
      appStoreUrl: null,
      playStoreUrl: null,
    },
    plans: zookDemoFixtures.membershipPlans
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

  const [plans, trainerAssignments, settings, referral] = await Promise.all([
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
      coverImageUrl: org.coverImageUrl,
      logoUrl: org.logoUrl,
      tagline: typeof settingValues.tagline === "string" ? settingValues.tagline : null,
      gallery: stringArray(settingValues.gallery),
      facilities: stringArray(settingValues.facilities),
      gymType: typeof settingValues.gymType === "string" ? settingValues.gymType : null,
      openingHoursSummary:
        typeof settingValues.openingHoursSummary === "string"
          ? settingValues.openingHoursSummary
          : null,
      appStoreUrl: typeof settingValues.appStoreUrl === "string" ? settingValues.appStoreUrl : null,
      playStoreUrl:
        typeof settingValues.playStoreUrl === "string" ? settingValues.playStoreUrl : null,
    },
    plans: plans.map((plan) => ({
      id: plan.id,
      name: plan.name,
      description: plan.description,
      type: plan.type,
      pricePaise: plan.pricePaise,
      durationDays: plan.durationDays,
      visitLimit: plan.visitLimit,
      publicVisible: plan.publicVisible,
    })),
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
