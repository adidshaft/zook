import { createHash } from "node:crypto";
import {
  AccountDeletionJobStatus,
  AIProviderType,
  AIRequestType,
  AuditRiskLevel,
  AttendanceSource,
  AttendanceStatus,
  ConsentStatus,
  ConsentType,
  CouponType,
  DataExportFormat,
  DataExportJobStatus,
  GymJoinMode,
  GymVisibility,
  GuardianConsentChallengeChannel,
  GuardianConsentChallengeStatus,
  IncidentSeverity,
  IncidentStatus,
  LocationSource,
  MembershipPlanType,
  NotificationStatus,
  NotificationType,
  OrderStatus,
  PaymentMode,
  PaymentEventStatus,
  PaymentPurpose,
  PaymentStatus,
  PaymentWebhookAttemptStatus,
  Permission,
  PlanStatus,
  PlanType,
  Prisma,
  PrismaClient,
  ProductCategory,
  ProviderHealthCheckStatus,
  ProviderHealthDomain,
  PushDeliveryStatus,
  PushDeviceStatus,
  PushPlatform,
  Role,
  SubscriptionStatus,
} from "@prisma/client";

const seedMode = process.env.ZOOK_SEED_MODE?.trim().toLowerCase();
const isProductionDemoSeed =
  process.env.APP_ENV?.trim().toLowerCase() === "production" &&
  seedMode === "production-demo" &&
  process.env.ZOOK_ALLOW_PRODUCTION_DEMO_SEED?.trim().toLowerCase() === "true";

if (process.env.APP_ENV?.trim().toLowerCase() === "production" && !isProductionDemoSeed) {
  throw new Error("Refusing to run Prisma seed when APP_ENV=production.");
}

const prisma = new PrismaClient();

const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const days = (count: number) => new Date(Date.now() + count * 24 * 60 * 60 * 1000);
const pastDays = (count: number) => days(-count);
const minutesFromNow = (count: number) => new Date(Date.now() + count * 60 * 1000);
const paise = (rupees: number) => Math.round(rupees * 100);
const must = <T>(value: T | undefined, label: string): T => {
  if (!value) {
    throw new Error(`Missing seed value: ${label}`);
  }
  return value;
};

const ownerPermissions = Object.values(Permission).filter(
  (permission) => !permission.startsWith("PLATFORM_") && !permission.startsWith("AI_"),
);

const adminPermissions = ownerPermissions.filter(
  (permission) =>
    permission !== Permission.ORG_MANAGE_BILLING &&
    permission !== Permission.ORG_MANAGE_PERMISSIONS,
);

const receptionistPermissions = [
  Permission.MEMBERS_VIEW,
  Permission.PAYMENTS_RECORD_OFFLINE,
  Permission.ATTENDANCE_QR_DISPLAY,
  Permission.ATTENDANCE_APPROVE,
  Permission.ATTENDANCE_MANUAL_OVERRIDE,
  Permission.SHOP_FULFILL_ORDER,
  Permission.NOTIFICATION_CREATE_DRAFT,
  Permission.NOTIFICATION_SEND_OPERATIONAL,
];

const trainerPermissions = [
  Permission.MEMBERS_VIEW,
  Permission.PT_RECORD,
  Permission.PLANS_CREATE,
  Permission.PLANS_PUBLISH_ASSIGNED,
  Permission.AI_USE_TEXT,
  Permission.AI_GENERATE_PLAN,
  Permission.AI_GENERATE_IMAGE,
  Permission.NOTIFICATION_CREATE_DRAFT,
  Permission.NOTIFICATION_SEND_ASSIGNED,
  Permission.NOTIFICATION_SEND_PLAN,
];

const seedUserEmails = [
  "platform@zook.local",
  "owner@zook.local",
  "admin@zook.local",
  "reception@zook.local",
  "trainer@zook.local",
  "member@zook.local",
  "minor@zook.local",
];

const seedUserPhones = [
  "+919000000001",
  "+919988777665",
  "+919700000002",
  "+919765432109",
  "+919123456780",
  "+919876543210",
  "+919000012345",
];

const seedOrgUsernames = ["aarogya-strength", "peaklab"];

async function clearProductionDemoData() {
  const nonSeedOrgCount = await prisma.organization.count({
    where: { username: { notIn: seedOrgUsernames } },
  });
  if (nonSeedOrgCount > 0) {
    throw new Error(
      "Refusing production demo seed because non-demo organizations already exist. Use a staging database or write a scoped migration.",
    );
  }

  const seedOrgs = await prisma.organization.findMany({
    where: { username: { in: seedOrgUsernames } },
    select: { id: true },
  });
  const seedOrgIds = seedOrgs.map((org) => org.id);

  const seedUsers = await prisma.user.findMany({
    where: {
      OR: [
        { email: { in: seedUserEmails } },
        { phone: { in: seedUserPhones } },
        { email: { endsWith: "@zook.local" } },
      ],
    },
    select: { id: true },
  });
  const seedUserIds = seedUsers.map((user) => user.id);
  const orgScope = seedOrgIds.length > 0 ? { orgId: { in: seedOrgIds } } : { orgId: "__no_seed_org__" };
  const userScope = seedUserIds.length > 0 ? { userId: { in: seedUserIds } } : { userId: "__no_seed_user__" };
  const seedHabits = await prisma.memberHabit.findMany({
    where: { OR: [{ organizationId: { in: seedOrgIds } }, { userId: { in: seedUserIds } }] },
    select: { id: true },
  });
  const seedHabitIds = seedHabits.map((habit) => habit.id);
  const seedWorkouts = await prisma.workoutSession.findMany({
    where: { OR: [{ organizationId: { in: seedOrgIds } }, { userId: { in: seedUserIds } }] },
    select: { id: true },
  });
  const seedWorkoutIds = seedWorkouts.map((workout) => workout.id);
  const seedAiConversations = await prisma.aIConversation.findMany({
    where: { OR: [orgScope, userScope] },
    select: { id: true },
  });
  const seedAiConversationIds = seedAiConversations.map((conversation) => conversation.id);
  const seedPaymentEvents = await prisma.paymentEvent.findMany({
    where: { OR: [orgScope, userScope] },
    select: { id: true },
  });
  const seedPaymentEventIds = seedPaymentEvents.map((event) => event.id);

  await prisma.organizationAbuseFlag.deleteMany({ where: { OR: [orgScope, userScope] } });
  await prisma.platformSetting.deleteMany({ where: { key: "global_ai_limits" } });
  await prisma.incidentLog.deleteMany({ where: orgScope });
  await prisma.providerHealthCheck.deleteMany({ where: orgScope });
  await prisma.accountDeletionJob.deleteMany({ where: { OR: [orgScope, userScope] } });
  await prisma.accountDeletionRequest.deleteMany({ where: { OR: [orgScope, userScope] } });
  await prisma.dataExportJob.deleteMany({ where: { OR: [orgScope, userScope] } });
  await prisma.dataExportRequest.deleteMany({ where: { OR: [orgScope, userScope] } });
  await prisma.pushDelivery.deleteMany({ where: { OR: [orgScope, userScope] } });
  await prisma.pushDevice.deleteMany({ where: { OR: [orgScope, userScope] } });
  await prisma.pickupCode.deleteMany({ where: orgScope });
  await prisma.shopOrderItem.deleteMany({ where: orgScope });
  await prisma.shopOrder.deleteMany({ where: { OR: [orgScope, userScope] } });
  await prisma.inventoryMovement.deleteMany({ where: orgScope });
  await prisma.product.deleteMany({ where: orgScope });
  await prisma.challengeProgress.deleteMany({ where: { OR: [orgScope, userScope] } });
  await prisma.challengeParticipant.deleteMany({ where: { OR: [orgScope, userScope] } });
  await prisma.challenge.deleteMany({ where: orgScope });
  await prisma.memberHabitLog.deleteMany({ where: { habitId: { in: seedHabitIds } } });
  await prisma.memberHabit.deleteMany({
    where: { OR: [{ organizationId: { in: seedOrgIds } }, { userId: { in: seedUserIds } }] },
  });
  await prisma.bodyProgressEntry.deleteMany({
    where: { OR: [{ organizationId: { in: seedOrgIds } }, { userId: { in: seedUserIds } }] },
  });
  await prisma.workoutExerciseEntry.deleteMany({ where: { workoutSessionId: { in: seedWorkoutIds } } });
  await prisma.workoutSession.deleteMany({
    where: { OR: [{ organizationId: { in: seedOrgIds } }, { userId: { in: seedUserIds } }] },
  });
  await prisma.userBadge.deleteMany({ where: { OR: [orgScope, userScope] } });
  await prisma.badge.deleteMany({ where: { code: { in: ["FIRST_CHECKIN", "SEVEN_DAY_STREAK", "TWELVE_VISITS", "PLAN_FINISHER"] } } });
  await prisma.habitCompletion.deleteMany({ where: userScope });
  await prisma.habitChecklist.deleteMany({ where: { OR: [orgScope, userScope] } });
  await prisma.userGoal.deleteMany({ where: { OR: [orgScope, userScope] } });
  await prisma.userNotificationPreference.deleteMany({ where: { OR: [orgScope, userScope] } });
  await prisma.notificationTemplate.deleteMany({ where: orgScope });
  await prisma.notificationRecipient.deleteMany({ where: userScope });
  await prisma.notification.deleteMany({ where: orgScope });
  await prisma.aIQuota.deleteMany({ where: { OR: [orgScope, userScope] } });
  await prisma.aIUsageLog.deleteMany({ where: { OR: [orgScope, userScope] } });
  await prisma.aIMessage.deleteMany({ where: { conversationId: { in: seedAiConversationIds } } });
  await prisma.aIConversation.deleteMany({ where: { OR: [orgScope, userScope] } });
  await prisma.resourceLibraryItem.deleteMany({ where: orgScope });
  await prisma.planProgress.deleteMany({ where: { OR: [orgScope, userScope] } });
  await prisma.planAssignment.deleteMany({ where: { OR: [orgScope, { assignedToUserId: { in: seedUserIds } }] } });
  await prisma.planVersion.deleteMany({ where: orgScope });
  await prisma.planContent.deleteMany({ where: orgScope });
  await prisma.personalTrainingSessionLog.deleteMany({ where: { OR: [orgScope, { memberUserId: { in: seedUserIds } }, { trainerUserId: { in: seedUserIds } }] } });
  await prisma.personalTrainingSubscription.deleteMany({ where: { OR: [orgScope, { memberUserId: { in: seedUserIds } }, { trainerUserId: { in: seedUserIds } }] } });
  await prisma.personalTrainingPlan.deleteMany({ where: { OR: [orgScope, { trainerUserId: { in: seedUserIds } }] } });
  await prisma.trainerAssignment.deleteMany({ where: { OR: [orgScope, { memberUserId: { in: seedUserIds } }, { trainerUserId: { in: seedUserIds } }] } });
  await prisma.trainerProfile.deleteMany({ where: { OR: [orgScope, userScope] } });
  await prisma.attendanceOverride.deleteMany({ where: { OR: [orgScope, userScope] } });
  await prisma.attendanceRecord.deleteMany({ where: { OR: [orgScope, userScope] } });
  await prisma.attendanceQrToken.deleteMany({ where: orgScope });
  await prisma.referralRedemption.deleteMany({ where: { OR: [orgScope, { referredUserId: { in: seedUserIds } }] } });
  await prisma.referralCode.deleteMany({ where: { OR: [orgScope, { referrerUserId: { in: seedUserIds } }] } });
  await prisma.couponRedemption.deleteMany({ where: { OR: [orgScope, userScope] } });
  await prisma.coupon.deleteMany({ where: orgScope });
  await prisma.manualPaymentAdjustment.deleteMany({ where: orgScope });
  await prisma.invoice.deleteMany({ where: orgScope });
  await prisma.subscriptionReminder.deleteMany({ where: orgScope });
  await prisma.paymentWebhookAttempt.deleteMany({ where: { paymentEventId: { in: seedPaymentEventIds } } });
  await prisma.payment.deleteMany({ where: { OR: [orgScope, userScope] } });
  await prisma.paymentEvent.deleteMany({ where: { OR: [orgScope, userScope] } });
  await prisma.paymentSession.deleteMany({ where: { OR: [orgScope, userScope] } });
  await prisma.membershipJoinRequest.deleteMany({ where: { OR: [orgScope, userScope] } });
  await prisma.membershipUsage.deleteMany({ where: orgScope });
  await prisma.memberSubscription.deleteMany({ where: { OR: [orgScope, { memberUserId: { in: seedUserIds } }] } });
  await prisma.membershipPlan.deleteMany({ where: orgScope });
  await prisma.consentRecord.deleteMany({ where: { OR: [orgScope, userScope] } });
  await prisma.guardianConsentChallenge.deleteMany({ where: { minorUserId: { in: seedUserIds } } });
  await prisma.guardianConsent.deleteMany({ where: { minorUserId: { in: seedUserIds } } });
  await prisma.memberProfile.deleteMany({ where: { OR: [orgScope, userScope] } });
  await prisma.organizationSetting.deleteMany({ where: orgScope });
  await prisma.saaSSubscription.deleteMany({ where: orgScope });
  await prisma.staffInvitation.deleteMany({ where: orgScope });
  await prisma.organizationRolePermission.deleteMany({ where: orgScope });
  await prisma.organizationRoleAssignment.deleteMany({ where: { OR: [orgScope, userScope] } });
  await prisma.organizationUser.deleteMany({ where: { OR: [orgScope, userScope] } });
  await prisma.branch.deleteMany({ where: orgScope });
  await prisma.organizationUsernameHistory.deleteMany({ where: { orgId: { in: seedOrgIds } } });
  await prisma.organization.deleteMany({ where: { id: { in: seedOrgIds } } });
  await prisma.auditLog.deleteMany({ where: { OR: [{ orgId: { in: seedOrgIds } }, { actorUserId: { in: seedUserIds } }] } });
  await prisma.fileAsset.deleteMany({ where: { OR: [orgScope, { ownerUserId: { in: seedUserIds } }] } });
  await prisma.requestIdempotency.deleteMany({ where: { userId: { in: seedUserIds } } });
  await prisma.authIdentity.deleteMany({ where: { userId: { in: seedUserIds } } });
  await prisma.otpChallenge.deleteMany({
    where: {
      OR: [
        { email: { in: [...seedUserEmails, "guardian@zook.local"] } },
        { identifier: { in: [...seedUserEmails, "guardian@zook.local"] } },
        { phone: { in: seedUserPhones } },
      ],
    },
  });
  await prisma.userSession.deleteMany({ where: { userId: { in: seedUserIds } } });
  await prisma.user.deleteMany({ where: { id: { in: seedUserIds } } });
}

async function clear() {
  if (isProductionDemoSeed) {
    await clearProductionDemoData();
    return;
  }

  await prisma.organizationAbuseFlag.deleteMany();
  await prisma.platformSetting.deleteMany();
  await prisma.incidentLog.deleteMany();
  await prisma.providerHealthCheck.deleteMany();
  await prisma.accountDeletionJob.deleteMany();
  await prisma.accountDeletionRequest.deleteMany();
  await prisma.dataExportJob.deleteMany();
  await prisma.dataExportRequest.deleteMany();
  await prisma.pushDelivery.deleteMany();
  await prisma.pushDevice.deleteMany();
  await prisma.pickupCode.deleteMany();
  await prisma.shopOrderItem.deleteMany();
  await prisma.shopOrder.deleteMany();
  await prisma.inventoryMovement.deleteMany();
  await prisma.product.deleteMany();
  await prisma.challengeProgress.deleteMany();
  await prisma.challengeParticipant.deleteMany();
  await prisma.challenge.deleteMany();
  await prisma.memberHabitLog.deleteMany();
  await prisma.memberHabit.deleteMany();
  await prisma.bodyProgressEntry.deleteMany();
  await prisma.workoutExerciseEntry.deleteMany();
  await prisma.workoutSession.deleteMany();
  await prisma.userBadge.deleteMany();
  await prisma.badge.deleteMany();
  await prisma.habitCompletion.deleteMany();
  await prisma.habitChecklist.deleteMany();
  await prisma.userGoal.deleteMany();
  await prisma.userNotificationPreference.deleteMany();
  await prisma.notificationTemplate.deleteMany();
  await prisma.notificationRecipient.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.aIQuota.deleteMany();
  await prisma.aIUsageLog.deleteMany();
  await prisma.aIMessage.deleteMany();
  await prisma.aIConversation.deleteMany();
  await prisma.resourceLibraryItem.deleteMany();
  await prisma.planProgress.deleteMany();
  await prisma.planAssignment.deleteMany();
  await prisma.planVersion.deleteMany();
  await prisma.planContent.deleteMany();
  await prisma.personalTrainingSessionLog.deleteMany();
  await prisma.personalTrainingSubscription.deleteMany();
  await prisma.personalTrainingPlan.deleteMany();
  await prisma.trainerAssignment.deleteMany();
  await prisma.trainerProfile.deleteMany();
  await prisma.attendanceOverride.deleteMany();
  await prisma.attendanceRecord.deleteMany();
  await prisma.attendanceQrToken.deleteMany();
  await prisma.referralRedemption.deleteMany();
  await prisma.referralCode.deleteMany();
  await prisma.couponRedemption.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.manualPaymentAdjustment.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.subscriptionReminder.deleteMany();
  await prisma.paymentWebhookAttempt.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.paymentEvent.deleteMany();
  await prisma.paymentSession.deleteMany();
  await prisma.membershipJoinRequest.deleteMany();
  await prisma.membershipUsage.deleteMany();
  await prisma.memberSubscription.deleteMany();
  await prisma.membershipPlan.deleteMany();
  await prisma.consentRecord.deleteMany();
  await prisma.guardianConsentChallenge.deleteMany();
  await prisma.guardianConsent.deleteMany();
  await prisma.memberProfile.deleteMany();
  await prisma.organizationSetting.deleteMany();
  await prisma.saaSSubscription.deleteMany();
  await prisma.staffInvitation.deleteMany();
  await prisma.organizationRolePermission.deleteMany();
  await prisma.organizationRoleAssignment.deleteMany();
  await prisma.organizationUser.deleteMany();
  await prisma.branch.deleteMany();
  await prisma.organizationUsernameHistory.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.fileAsset.deleteMany();
  await prisma.otpChallenge.deleteMany();
  await prisma.userSession.deleteMany();
  await prisma.user.deleteMany();
}

async function main() {
  await clear();

  const users = await Promise.all(
    [
      ["platform", "Platform Admin", "platform@zook.local", "+919000000001", true, false],
      ["owner", "Aditya Rao", "owner@zook.local", "+919988777665", false, false],
      ["admin", "Sneha Iyer", "admin@zook.local", "+919700000002", false, false],
      ["reception", "Farah Khan", "reception@zook.local", "+919765432109", false, false],
      ["trainer", "Rohan Kulkarni", "trainer@zook.local", "+919123456780", false, false],
      ["member", "Nisha Menon", "member@zook.local", "+919876543210", false, false],
      ["minor", "Ira Shah", "minor@zook.local", "+919000012345", false, true],
    ].map(([key, name, email, phone, isPlatformAdmin, isMinor]) =>
      prisma.user.create({
        data: {
          name: String(name),
          email: String(email),
          phone: String(phone),
          phoneVerifiedAt: new Date(),
          dateOfBirth: isMinor ? new Date("2011-08-18") : new Date("1995-04-12"),
          profilePhotoUrl: `/seed/avatars/${key}.svg`,
          fitnessGoal: isMinor ? "Build healthy habits safely" : "Strength and consistency",
          isPlatformAdmin: Boolean(isPlatformAdmin),
          isMinor: Boolean(isMinor),
          guardianPending: Boolean(isMinor),
          marketingOptIn: !isMinor,
          aiConsent: !isMinor,
          emailVerifiedAt: new Date(),
        },
      }),
    ),
  );

  const platform = must(users[0], "platform user");
  const owner = must(users[1], "owner user");
  const admin = must(users[2], "admin user");
  const reception = must(users[3], "reception user");
  const trainer = must(users[4], "trainer user");
  const member = must(users[5], "member user");
  const minor = must(users[6], "minor user");

  await prisma.otpChallenge.createMany({
    data: seedUserEmails.map((email) => ({
      email,
      identifier: email,
      channel: "email",
      codeHash: hash("000000"),
      purpose: "login",
      expiresAt: days(7),
    })),
  });

  const aarogyaStrength = await prisma.organization.create({
    data: {
      name: "Aarogya Strength",
      username: "aarogya-strength",
      contactPhone: "+91 98765 43210",
      contactEmail: "hello@aarogyastrength.example",
      address: "Lane 7, Koregaon Park",
      city: "Pune",
      state: "Maharashtra",
      pincode: "411001",
      latitude: new Prisma.Decimal("18.5362"),
      longitude: new Prisma.Decimal("73.8930"),
      locationSource: LocationSource.MOCK,
      amenities: ["Strength floor", "Cardio", "Locker room", "Personal training", "Recovery corner"],
      operatingHours: { weekday: "05:30-22:30", sunday: "07:00-14:00" },
      visibility: GymVisibility.PUBLIC,
      joinMode: GymJoinMode.OPEN_JOIN,
      trialStartAt: new Date(),
      trialEndAt: days(60),
      createdByUserId: owner.id,
      settings: { allowReferrals: true, broadcastApprovalRequired: true },
    },
  });

  const indiranagarPerformance = await prisma.organization.create({
    data: {
      name: "Peak Lab Performance",
      username: "peaklab",
      contactPhone: "+91 99887 76655",
      contactEmail: "join@peaklab.example",
      address: "12th Main Road, Indiranagar",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560038",
      latitude: new Prisma.Decimal("12.9719"),
      longitude: new Prisma.Decimal("77.6412"),
      locationSource: LocationSource.MOCK,
      amenities: ["Functional zone", "HIIT", "Mobility area", "Nutrition desk"],
      operatingHours: { weekday: "06:00-22:00", sunday: "08:00-12:00" },
      visibility: GymVisibility.PUBLIC,
      joinMode: GymJoinMode.APPROVAL_REQUIRED,
      trialStartAt: new Date(),
      trialEndAt: days(60),
      createdByUserId: owner.id,
    },
  });

  const aarogyaBranch = await prisma.branch.create({
    data: {
      orgId: aarogyaStrength.id,
      name: "Aarogya Strength Koregaon Park",
      address: aarogyaStrength.address,
      city: aarogyaStrength.city,
      state: aarogyaStrength.state,
      pincode: aarogyaStrength.pincode,
      latitude: aarogyaStrength.latitude,
      longitude: aarogyaStrength.longitude,
      locationSource: LocationSource.MOCK,
      isDefault: true,
    },
  });

  const indiranagarBranch = await prisma.branch.create({
    data: {
      orgId: indiranagarPerformance.id,
      name: "Peak Lab 12th Main",
      address: indiranagarPerformance.address,
      city: indiranagarPerformance.city,
      state: indiranagarPerformance.state,
      pincode: indiranagarPerformance.pincode,
      latitude: indiranagarPerformance.latitude,
      longitude: indiranagarPerformance.longitude,
      locationSource: LocationSource.MOCK,
      isDefault: true,
    },
  });

  for (const org of [aarogyaStrength, indiranagarPerformance]) {
    await prisma.saaSSubscription.create({
      data: {
        orgId: org.id,
        trialStartAt: org.trialStartAt,
        trialEndAt: org.trialEndAt,
      },
    });
    await prisma.organizationSetting.create({
      data: {
        orgId: org.id,
        keyValues: {
          attendanceMode: "EXCEPTION_APPROVAL",
          multiEntryConsumes: false,
          minorsMarketingOff: true,
        },
      },
    });
  }

  const orgUsers = [
    [owner.id, Role.OWNER],
    [admin.id, Role.ADMIN],
    [reception.id, Role.RECEPTIONIST],
    [trainer.id, Role.TRAINER],
    [member.id, Role.MEMBER],
    [minor.id, Role.MEMBER],
  ] as const;

  for (const [userId, role] of orgUsers) {
    await prisma.organizationUser.create({ data: { orgId: aarogyaStrength.id, userId } });
    await prisma.organizationRoleAssignment.create({
      data: { orgId: aarogyaStrength.id, userId, role, assignedById: owner.id },
    });
  }

  await prisma.organizationUser.create({ data: { orgId: indiranagarPerformance.id, userId: owner.id } });
  await prisma.organizationRoleAssignment.create({
    data: { orgId: indiranagarPerformance.id, userId: owner.id, role: Role.OWNER, assignedById: owner.id },
  });

  for (const permission of ownerPermissions) {
    await prisma.organizationRolePermission.create({
      data: { orgId: aarogyaStrength.id, role: Role.OWNER, permission },
    });
  }
  for (const permission of adminPermissions) {
    await prisma.organizationRolePermission.create({
      data: { orgId: aarogyaStrength.id, role: Role.ADMIN, permission },
    });
  }
  for (const permission of receptionistPermissions) {
    await prisma.organizationRolePermission.create({
      data: { orgId: aarogyaStrength.id, role: Role.RECEPTIONIST, permission },
    });
  }
  for (const permission of trainerPermissions) {
    await prisma.organizationRolePermission.create({
      data: { orgId: aarogyaStrength.id, role: Role.TRAINER, permission },
    });
  }

  await prisma.staffInvitation.create({
    data: {
      orgId: aarogyaStrength.id,
      email: "coach2@ironhouse.example",
      role: Role.TRAINER,
      token: "seed-trainer-invite",
      invitedById: owner.id,
      expiresAt: days(7),
    },
  });

  await prisma.memberProfile.createMany({
    data: [
      {
        orgId: aarogyaStrength.id,
        userId: member.id,
        profilePhotoUrl: member.profilePhotoUrl,
        profilePhotoConsentAt: new Date(),
        marketingOptIn: true,
        joinedViaReferralCodeId: null,
      },
      {
        orgId: aarogyaStrength.id,
        userId: minor.id,
        profilePhotoUrl: minor.profilePhotoUrl,
        marketingOptIn: false,
      },
    ],
  });

  const guardianOtpChallenge = await prisma.otpChallenge.create({
    data: {
      email: "guardian@zook.local",
      identifier: "guardian@zook.local",
      channel: "email",
      codeHash: hash("111111"),
      purpose: "guardian_consent",
      attempts: 1,
      maxAttempts: 3,
      ipAddress: "203.0.113.24",
      expiresAt: days(2),
    },
  });

  const guardianConsent = await prisma.guardianConsent.create({
    data: {
      minorUserId: minor.id,
      guardianName: "Kavita Guardian",
      guardianEmail: "guardian@zook.local",
      guardianPhone: "+91 91111 11111",
      relationship: "Parent",
      status: ConsentStatus.PENDING,
      otpChallengeId: guardianOtpChallenge.id,
      challengeStatus: GuardianConsentChallengeStatus.PENDING,
      challengedAt: new Date(),
      metadata: {
        reviewQueue: "private-pilot-guardians",
        challengePurpose: "parental_approval",
      },
    },
  });

  const guardianConsentChallenge = await prisma.guardianConsentChallenge.create({
    data: {
      guardianConsentId: guardianConsent.id,
      minorUserId: minor.id,
      otpChallengeId: guardianOtpChallenge.id,
      channel: GuardianConsentChallengeChannel.EMAIL_OTP,
      status: GuardianConsentChallengeStatus.PENDING,
      challengeTokenHash: hash("guardian-magic-link"),
      attempts: 1,
      maxAttempts: 3,
      lastSentAt: new Date(),
      expiresAt: days(2),
      ipAddress: "203.0.113.24",
      userAgent: "Pilot guardian mailbox",
      metadata: {
        reminderScheduledAt: days(1).toISOString(),
        escalationOwner: owner.email,
      },
    },
  });

  await prisma.guardianConsent.update({
    where: { id: guardianConsent.id },
    data: {
      activeChallengeId: guardianConsentChallenge.id,
    },
  });

  await prisma.consentRecord.createMany({
    data: [
      {
        orgId: aarogyaStrength.id,
        userId: member.id,
        type: ConsentType.PROFILE_PHOTO_ATTENDANCE,
        status: ConsentStatus.GRANTED,
        recordedById: member.id,
      },
      {
        orgId: aarogyaStrength.id,
        userId: member.id,
        type: ConsentType.AI_PERSONALIZATION,
        status: ConsentStatus.GRANTED,
        recordedById: member.id,
      },
      {
        orgId: aarogyaStrength.id,
        userId: minor.id,
        type: ConsentType.MARKETING,
        status: ConsentStatus.DENIED,
        recordedById: minor.id,
      },
      {
        orgId: aarogyaStrength.id,
        userId: minor.id,
        type: ConsentType.GUARDIAN,
        status: ConsentStatus.PENDING,
        recordedById: owner.id,
        metadata: {
          guardianConsentId: guardianConsent.id,
          challengeId: guardianConsentChallenge.id,
        },
      },
      {
        orgId: aarogyaStrength.id,
        userId: member.id,
        type: ConsentType.DATA_EXPORT,
        status: ConsentStatus.GRANTED,
        recordedById: member.id,
      },
      {
        orgId: aarogyaStrength.id,
        userId: member.id,
        type: ConsentType.ACCOUNT_DELETION,
        status: ConsentStatus.PENDING,
        recordedById: member.id,
      },
    ],
  });

  const exportAsset = await prisma.fileAsset.create({
    data: {
      orgId: aarogyaStrength.id,
      ownerUserId: member.id,
      originalName: "member-private-export.json",
      storageKey: "exports/member-private-export-2026-04-24.json",
      url: "https://cdn.zook.local/exports/member-private-export-2026-04-24.json",
      mimeType: "application/json",
      sizeBytes: 16384,
      purpose: "data_export",
      category: "privacy",
      metadata: {
        source: "private_pilot_seed",
      },
    },
  });

  const exportRequest = await prisma.dataExportRequest.create({
    data: {
      orgId: aarogyaStrength.id,
      userId: member.id,
      status: "completed",
      requestId: "exp_member_private_pilot_001",
      exportFormat: "json",
      exportUrl: exportAsset.url,
      notes: "Private pilot self-serve export example.",
      processedById: owner.id,
      processedAt: minutesFromNow(-30),
      completedAt: minutesFromNow(-30),
    },
  });

  const exportJob = await prisma.dataExportJob.create({
    data: {
      requestId: exportRequest.id,
      orgId: aarogyaStrength.id,
      userId: member.id,
      status: DataExportJobStatus.SUCCEEDED,
      format: DataExportFormat.JSON,
      storageProvider: "local",
      fileAssetId: exportAsset.id,
      exportUrl: exportAsset.url,
      checksum: hash("member-private-export-2026-04-24"),
      recordCount: 42,
      requestedById: member.id,
      processedById: owner.id,
      startedAt: minutesFromNow(-45),
      completedAt: minutesFromNow(-30),
      expiresAt: days(7),
      metadata: {
        includes: ["profile", "payments", "attendance", "consents"],
        piiReview: "complete",
      },
    },
  });

  await prisma.dataExportRequest.update({
    where: { id: exportRequest.id },
    data: {
      latestJobId: exportJob.id,
    },
  });

  const deletionRequest = await prisma.accountDeletionRequest.create({
    data: {
      orgId: aarogyaStrength.id,
      userId: member.id,
      status: "scheduled",
      requestId: "del_member_private_pilot_001",
      notes: "Dry-run deletion retained for pilot validation.",
      processedById: platform.id,
      processedAt: minutesFromNow(-10),
      scheduledFor: days(14),
    },
  });

  const deletionJob = await prisma.accountDeletionJob.create({
    data: {
      requestId: deletionRequest.id,
      orgId: aarogyaStrength.id,
      userId: member.id,
      status: AccountDeletionJobStatus.QUEUED,
      requestedById: member.id,
      processedById: platform.id,
      scheduledFor: days(14),
      retentionUntil: days(44),
      dryRunReport: {
        delete: ["member_profile", "attendance_records", "notifications"],
        retain: ["audit_logs", "billing_records"],
        anonymize: ["payment_notes"],
      },
      metadata: {
        mode: "pilot_rehearsal",
        approvalTicket: "PRIV-204",
      },
    },
  });

  await prisma.accountDeletionRequest.update({
    where: { id: deletionRequest.id },
    data: {
      latestJobId: deletionJob.id,
    },
  });

  const monthly = await prisma.membershipPlan.create({
    data: {
      orgId: aarogyaStrength.id,
      branchId: aarogyaBranch.id,
      name: "Monthly Unlimited",
      description: "Unlimited gym access for 30 days.",
      type: MembershipPlanType.DURATION,
      pricePaise: paise(1999),
      durationDays: 30,
      createdById: owner.id,
      terms: "Valid for one member only.",
    },
  });

  await prisma.membershipPlan.create({
    data: {
      orgId: aarogyaStrength.id,
      branchId: aarogyaBranch.id,
      name: "Annual Unlimited",
      description: "Best value annual access.",
      type: MembershipPlanType.DURATION,
      pricePaise: paise(17999),
      durationDays: 365,
      createdById: owner.id,
    },
  });

  const visits = await prisma.membershipPlan.create({
    data: {
      orgId: aarogyaStrength.id,
      branchId: aarogyaBranch.id,
      name: "30 Visits / 180 Days",
      description: "Flexible pack for busy members.",
      type: MembershipPlanType.HYBRID,
      pricePaise: paise(3499),
      visitLimit: 30,
      validityDays: 180,
      createdById: owner.id,
    },
  });

  await prisma.membershipPlan.create({
    data: {
      orgId: aarogyaStrength.id,
      branchId: aarogyaBranch.id,
      name: "Trial Pass",
      description: "One free guided visit.",
      type: MembershipPlanType.TRIAL,
      pricePaise: 0,
      visitLimit: 1,
      validityDays: 7,
      createdById: owner.id,
    },
  });

  await prisma.membershipPlan.create({
    data: {
      orgId: indiranagarPerformance.id,
      branchId: indiranagarBranch.id,
      name: "Indiranagar Performance Monthly",
      description: "Approval-required access.",
      type: MembershipPlanType.DURATION,
      pricePaise: paise(2499),
      durationDays: 30,
      createdById: owner.id,
    },
  });

  const welcome = await prisma.coupon.create({
    data: {
      orgId: aarogyaStrength.id,
      code: "WELCOME10",
      type: CouponType.PERCENTAGE,
      valuePercentBps: 1000,
      active: true,
      validFrom: pastDays(2),
      validUntil: days(45),
      maxRedemptions: 100,
      perUserLimit: 1,
      createdById: owner.id,
    },
  });

  await prisma.coupon.create({
    data: {
      orgId: aarogyaStrength.id,
      code: "NEW500",
      type: CouponType.FIXED_AMOUNT,
      valuePaise: paise(500),
      active: true,
      validFrom: pastDays(2),
      validUntil: days(45),
      applicablePlanId: monthly.id,
      createdById: owner.id,
    },
  });

  const referral = await prisma.referralCode.create({
    data: {
      orgId: aarogyaStrength.id,
      referrerUserId: member.id,
      code: "NISHAFIT",
      couponId: welcome.id,
      createdByRole: Role.MEMBER,
      maxUses: 20,
    },
  });

  const paymentSession = await prisma.paymentSession.create({
    data: {
      provider: "mock",
      orgId: aarogyaStrength.id,
      userId: member.id,
      purpose: PaymentPurpose.MEMBERSHIP,
      amountPaise: paise(1799),
      currency: "INR",
      status: PaymentStatus.SUCCEEDED,
      checkoutUrl: "https://pilot.zook.local/checkout/mock-membership",
      providerRef: "sess_mock_membership_seed",
      metadata: {
        planName: monthly.name,
        cohort: "private_pilot_rc",
      },
      expiresAt: days(1),
      completedAt: minutesFromNow(-75),
    },
  });

  const payment = await prisma.payment.create({
    data: {
      orgId: aarogyaStrength.id,
      userId: member.id,
      sessionId: paymentSession.id,
      purpose: PaymentPurpose.MEMBERSHIP,
      amountPaise: paise(1799),
      status: PaymentStatus.SUCCEEDED,
      mode: PaymentMode.MOCK_ONLINE,
      provider: "mock",
      providerRef: "mock_seed_membership",
      receiptNumber: "AS-REC-240424-001",
      notes: "Private pilot online payment linked to hardened webhook examples.",
      recordedAt: new Date(),
    },
  });

  const paymentCapturedPayload = {
    paymentId: payment.id,
    sessionId: paymentSession.id,
    status: "captured",
    amountPaise: payment.amountPaise,
    currency: payment.currency,
  };
  const paymentCapturedHeaders = {
    "x-zook-signature": "sig_mock_membership_paid",
    "x-zook-delivery": "pilot-seed-1",
  };

  const paymentCapturedEvent = await prisma.paymentEvent.create({
    data: {
      orgId: aarogyaStrength.id,
      userId: member.id,
      sessionId: paymentSession.id,
      paymentId: payment.id,
      status: PaymentEventStatus.PROCESSED,
      provider: "mock",
      providerEventId: "evt_mock_membership_paid",
      eventType: "payment.captured",
      eventVersion: "2026-04-24",
      payload: paymentCapturedPayload,
      headers: paymentCapturedHeaders,
      rawPayloadHash: hash(JSON.stringify(paymentCapturedPayload)),
      sourceIpAddress: "198.51.100.45",
      signature: paymentCapturedHeaders["x-zook-signature"],
      signatureVerified: true,
      signatureVerifiedAt: minutesFromNow(-74),
      receivedAt: minutesFromNow(-74),
      processedAt: minutesFromNow(-73),
      lastAttemptAt: minutesFromNow(-73),
      attemptCount: 1,
      riskFlags: {
        replayDetected: false,
        manualReview: false,
      },
    },
  });

  const paymentRefundPayload = {
    paymentId: payment.id,
    refundRequestId: "refund_req_private_pilot_001",
    status: "pending_review",
    amountPaise: paise(500),
  };
  const paymentRefundHeaders = {
    "x-zook-signature": "sig_mock_membership_refund",
    "x-zook-delivery": "pilot-seed-2",
  };

  const paymentRefundEvent = await prisma.paymentEvent.create({
    data: {
      orgId: aarogyaStrength.id,
      userId: member.id,
      sessionId: paymentSession.id,
      paymentId: payment.id,
      status: PaymentEventStatus.QUARANTINED,
      provider: "mock",
      providerEventId: "evt_mock_membership_refund",
      eventType: "payment.refund.requested",
      eventVersion: "2026-04-24",
      payload: paymentRefundPayload,
      headers: paymentRefundHeaders,
      rawPayloadHash: hash(JSON.stringify(paymentRefundPayload)),
      sourceIpAddress: "198.51.100.46",
      signature: paymentRefundHeaders["x-zook-signature"],
      signatureVerified: true,
      signatureVerifiedAt: minutesFromNow(-16),
      receivedAt: minutesFromNow(-15),
      processedAt: minutesFromNow(-8),
      lastAttemptAt: minutesFromNow(-8),
      attemptCount: 2,
      nextRetryAt: minutesFromNow(30),
      processingError: "Refund reference missing from pilot ledger, manual review required.",
      riskFlags: {
        manualReview: true,
        reason: "missing_refund_reference",
      },
    },
  });

  await prisma.paymentWebhookAttempt.createMany({
    data: [
      {
        paymentEventId: paymentCapturedEvent.id,
        attemptNo: 1,
        status: PaymentWebhookAttemptStatus.SUCCEEDED,
        processor: "payment-webhook-worker",
        startedAt: minutesFromNow(-74),
        completedAt: minutesFromNow(-73),
        durationMs: 184,
        httpStatusCode: 200,
        result: {
          sideEffects: ["payment_confirmed", "subscription_activation_ready"],
        },
      },
      {
        paymentEventId: paymentRefundEvent.id,
        attemptNo: 1,
        status: PaymentWebhookAttemptStatus.FAILED,
        processor: "payment-webhook-worker",
        startedAt: minutesFromNow(-14),
        completedAt: minutesFromNow(-13),
        durationMs: 241,
        httpStatusCode: 422,
        errorCode: "MISSING_REFUND_REFERENCE",
        errorMessage: "Refund reference not found in pilot ledger.",
        result: {
          retryable: true,
        },
      },
      {
        paymentEventId: paymentRefundEvent.id,
        attemptNo: 2,
        status: PaymentWebhookAttemptStatus.FAILED,
        processor: "payment-webhook-worker",
        startedAt: minutesFromNow(-9),
        completedAt: minutesFromNow(-8),
        durationMs: 227,
        httpStatusCode: 422,
        errorCode: "MISSING_REFUND_REFERENCE",
        errorMessage: "Manual review requested after second failed attempt.",
        result: {
          retryable: true,
          escalated: true,
        },
      },
    ],
  });

  const subscription = await prisma.memberSubscription.create({
    data: {
      orgId: aarogyaStrength.id,
      branchId: aarogyaBranch.id,
      memberUserId: member.id,
      planId: monthly.id,
      status: SubscriptionStatus.ACTIVE,
      startsAt: pastDays(5),
      endsAt: days(25),
      paymentId: payment.id,
      referralCodeId: referral.id,
      activatedById: owner.id,
    },
  });

  await prisma.memberSubscription.create({
    data: {
      orgId: aarogyaStrength.id,
      branchId: aarogyaBranch.id,
      memberUserId: member.id,
      planId: visits.id,
      status: SubscriptionStatus.PAUSED,
      startsAt: days(30),
      endsAt: days(210),
      remainingVisits: 30,
      notes: "Early renewal starts after current plan.",
    },
  });

  const attendance = await prisma.attendanceRecord.create({
    data: {
      orgId: aarogyaStrength.id,
      branchId: aarogyaBranch.id,
      userId: member.id,
      subscriptionId: subscription.id,
      status: AttendanceStatus.APPROVED,
      source: AttendanceSource.QR_SCAN,
      dateKey: new Date().toISOString().slice(0, 10),
      checkedInAt: new Date(),
      approvedById: reception.id,
      approvedAt: new Date(),
      suspiciousFlags: [],
    },
  });

  await prisma.membershipUsage.create({
    data: {
      orgId: aarogyaStrength.id,
      subscriptionId: subscription.id,
      attendanceId: attendance.id,
      usedVisits: 0,
    },
  });

  await prisma.attendanceOverride.create({
    data: {
      orgId: aarogyaStrength.id,
      attendanceRecordId: attendance.id,
      userId: member.id,
      reason: "system issue",
      notes: "Seeded example override audit trail.",
      createdById: reception.id,
    },
  });

  await prisma.trainerProfile.create({
    data: {
      orgId: aarogyaStrength.id,
      userId: trainer.id,
      bio: "Strength coach focused on safe, sustainable progress.",
      specialties: ["Strength", "Fat loss", "Beginner technique"],
      availability: { mon: "07:00-12:00", wed: "17:00-21:00" },
      upiId: "kabir@upi",
      visibleToMembers: true,
    },
  });

  await prisma.trainerAssignment.create({
    data: {
      orgId: aarogyaStrength.id,
      trainerUserId: trainer.id,
      memberUserId: member.id,
      assignedById: owner.id,
    },
  });

  const ptPack = await prisma.personalTrainingPlan.create({
    data: {
      orgId: aarogyaStrength.id,
      trainerUserId: trainer.id,
      name: "12 Session Pack",
      description: "Technique and progression coaching.",
      sessionCount: 12,
      pricePaise: paise(9000),
    },
  });

  await prisma.personalTrainingPlan.create({
    data: {
      orgId: aarogyaStrength.id,
      trainerUserId: trainer.id,
      name: "Monthly PT",
      description: "One month guided training.",
      durationDays: 30,
      pricePaise: paise(12000),
    },
  });

  const ptSub = await prisma.personalTrainingSubscription.create({
    data: {
      orgId: aarogyaStrength.id,
      memberUserId: member.id,
      trainerUserId: trainer.id,
      ptPlanId: ptPack.id,
      status: SubscriptionStatus.ACTIVE,
      startsAt: pastDays(3),
      endsAt: days(60),
      totalSessions: 12,
      remainingSessions: 10,
      amountPaise: paise(9000),
      paymentMode: PaymentMode.DIRECT_UPI,
      notes: "Paid directly to trainer.",
      recordedById: trainer.id,
    },
  });

  await prisma.personalTrainingSessionLog.create({
    data: {
      orgId: aarogyaStrength.id,
      subscriptionId: ptSub.id,
      trainerUserId: trainer.id,
      memberUserId: member.id,
      notes: "Squat technique and RPE calibration.",
    },
  });

  const plan = await prisma.planContent.create({
    data: {
      orgId: aarogyaStrength.id,
      creatorUserId: trainer.id,
      type: PlanType.WORKOUT,
      title: "Starter Strength Week",
      description: "Three-day beginner strength plan.",
      content: {
        days: [
          { name: "Day 1", work: ["Goblet squat 3x10", "Push-up 3x8", "Row 3x12"] },
          { name: "Day 2", work: ["Deadlift pattern 3x8", "Press 3x8", "Carry 4x30m"] },
        ],
      },
      aiGenerated: true,
      reviewed: true,
      reviewedById: trainer.id,
      status: PlanStatus.PUBLISHED,
      visibility: "assigned",
    },
  });

  await prisma.planVersion.create({
    data: {
      orgId: aarogyaStrength.id,
      planId: plan.id,
      versionNo: 1,
      content: { title: "Starter Strength Week" },
      createdById: trainer.id,
    },
  });

  const assignment = await prisma.planAssignment.create({
    data: {
      orgId: aarogyaStrength.id,
      planId: plan.id,
      assignedById: trainer.id,
      assignedToUserId: member.id,
      audience: "selected_member",
    },
  });

  await prisma.planProgress.create({
    data: {
      orgId: aarogyaStrength.id,
      assignmentId: assignment.id,
      userId: member.id,
      progressJson: { completed: ["Day 1"] },
      completionPct: 50,
      feedback: "Felt strong on goblet squats.",
    },
  });

  await prisma.resourceLibraryItem.create({
    data: {
      orgId: aarogyaStrength.id,
      title: "Beginner Strength Safety Notes",
      summary: "Prefer technique quality and gradual progression over load.",
      content: "Warm up, keep movements pain-free, and consult a professional for injuries.",
      approved: true,
      createdById: trainer.id,
    },
  });

  const conversation = await prisma.aIConversation.create({
    data: {
      orgId: aarogyaStrength.id,
      userId: member.id,
      title: "Plan clarification",
    },
  });

  await prisma.aIMessage.createMany({
    data: [
      {
        conversationId: conversation.id,
        role: "user",
        content: "How should I warm up for today?",
      },
      {
        conversationId: conversation.id,
        role: "assistant",
        content: "Start with five minutes easy cardio and two light sets of your first lift.",
      },
    ],
  });

  await prisma.aIUsageLog.createMany({
    data: [
      {
        orgId: aarogyaStrength.id,
        userId: member.id,
        role: Role.MEMBER,
        provider: AIProviderType.MOCK,
        requestType: AIRequestType.CHAT,
        promptSummary: "Warm-up advice",
        responseSummary: "Basic safe warm-up guidance",
        tokenEstimate: 120,
        quotaConsumed: 1,
      },
      {
        orgId: aarogyaStrength.id,
        userId: trainer.id,
        role: Role.TRAINER,
        provider: AIProviderType.MOCK,
        requestType: AIRequestType.STRUCTURED_PLAN,
        promptSummary: "Draft beginner strength plan",
        responseSummary: "Created reviewed draft",
        tokenEstimate: 600,
        quotaConsumed: 1,
        createdPlanId: plan.id,
      },
    ],
  });

  await prisma.aIQuota.createMany({
    data: [
      {
        orgId: aarogyaStrength.id,
        userId: member.id,
        role: Role.MEMBER,
        textDailyLimit: 5,
        textMonthLimit: 50,
        imageMonthLimit: 0,
        resetDailyAt: days(1),
        resetMonthAt: days(30),
      },
      {
        orgId: aarogyaStrength.id,
        userId: trainer.id,
        role: Role.TRAINER,
        textDailyLimit: 25,
        textMonthLimit: 300,
        imageMonthLimit: 10,
        resetDailyAt: days(1),
        resetMonthAt: days(30),
      },
      {
        orgId: aarogyaStrength.id,
        role: Role.OWNER,
        textDailyLimit: 25,
        textMonthLimit: 500,
        imageMonthLimit: 20,
        resetDailyAt: days(1),
        resetMonthAt: days(30),
      },
    ],
  });

  const notification = await prisma.notification.create({
    data: {
      orgId: aarogyaStrength.id,
      createdById: owner.id,
      type: NotificationType.OPERATIONAL,
      status: NotificationStatus.SENT,
      title: "Evening floor maintenance",
      body: "Cardio zone opens at 7 PM today after maintenance.",
      audience: "all_active_members",
      sentAt: new Date(),
      pushEnabled: true,
    },
  });

  const memberRecipient = await prisma.notificationRecipient.create({
    data: {
      notificationId: notification.id,
      userId: member.id,
      deliveredAt: new Date(),
      deliveryStatus: "push_delivered",
    },
  });

  const guardianReminderNotification = await prisma.notification.create({
    data: {
      orgId: aarogyaStrength.id,
      createdById: owner.id,
      type: NotificationType.SECURITY,
      status: NotificationStatus.SENT,
      title: "Guardian approval still pending",
      body: "Ask your guardian to complete approval before your next coached session.",
      audience: "minor_members_pending_guardian",
      sentAt: minutesFromNow(-12),
      pushEnabled: true,
      metadata: {
        guardianConsentId: guardianConsent.id,
      },
    },
  });

  const minorRecipient = await prisma.notificationRecipient.create({
    data: {
      notificationId: guardianReminderNotification.id,
      userId: minor.id,
      deliveryStatus: "push_failed",
    },
  });

  await prisma.notificationTemplate.create({
    data: {
      orgId: aarogyaStrength.id,
      type: NotificationType.TRANSACTIONAL,
      name: "Membership Expiring",
      title: "Your membership expires soon",
      body: "Renew before {date} to keep check-ins active.",
      active: true,
      createdById: owner.id,
    },
  });

  await prisma.userNotificationPreference.createMany({
    data: [
      {
        orgId: aarogyaStrength.id,
        userId: member.id,
        transactional: true,
        operational: true,
        promotional: true,
        engagement: true,
        pushEnabled: true,
      },
      {
        orgId: aarogyaStrength.id,
        userId: minor.id,
        transactional: true,
        operational: true,
        promotional: false,
        engagement: false,
        pushEnabled: false,
      },
    ],
  });

  const pushDevices = await prisma.pushDevice.createManyAndReturn({
    data: [
      {
        orgId: aarogyaStrength.id,
        userId: member.id,
        platform: PushPlatform.IOS,
        provider: "expo",
        token: "ExponentPushToken[member-private-pilot-ios]",
        status: PushDeviceStatus.ACTIVE,
        deviceLabel: "Nisha iPhone 15",
        deviceFingerprint: hash("member-private-pilot-ios"),
        appVersion: "1.4.0-pilot.2",
        osVersion: "iOS 17.4",
        locale: "en-IN",
        timezone: "Asia/Kolkata",
        lastSeenAt: new Date(),
        lastRegisteredAt: pastDays(2),
        metadata: {
          buildChannel: "private-pilot",
          notificationsEnabled: true,
        },
      },
      {
        orgId: aarogyaStrength.id,
        userId: minor.id,
        platform: PushPlatform.ANDROID,
        provider: "expo",
        token: "ExponentPushToken[minor-private-pilot-android]",
        status: PushDeviceStatus.INVALIDATED,
        deviceLabel: "Ira Pixel 8",
        deviceFingerprint: hash("minor-private-pilot-android"),
        appVersion: "1.4.0-pilot.2",
        osVersion: "Android 15",
        locale: "en-IN",
        timezone: "Asia/Kolkata",
        lastSeenAt: minutesFromNow(-180),
        lastRegisteredAt: pastDays(3),
        lastFailureAt: minutesFromNow(-10),
        failureReason: "Expo reported DeviceNotRegistered after beta reinstall.",
        metadata: {
          buildChannel: "private-pilot",
          notificationsEnabled: false,
        },
      },
    ],
  });

  const memberPushDevice = must(pushDevices[0], "member push device");
  const minorPushDevice = must(pushDevices[1], "minor push device");

  await prisma.pushDelivery.create({
    data: {
      orgId: aarogyaStrength.id,
      notificationId: notification.id,
      notificationRecipientId: memberRecipient.id,
      userId: member.id,
      deviceId: memberPushDevice.id,
      provider: "expo",
      providerMessageId: "expo_seed_member_delivery_001",
      status: PushDeliveryStatus.DELIVERED,
      attemptCount: 1,
      scheduledAt: minutesFromNow(-21),
      sentAt: minutesFromNow(-20),
      deliveredAt: minutesFromNow(-19),
      payload: {
        title: notification.title,
        audience: notification.audience,
      },
      response: {
        ticketStatus: "ok",
      },
    },
  });

  const failedPushDelivery = await prisma.pushDelivery.create({
    data: {
      orgId: aarogyaStrength.id,
      notificationId: guardianReminderNotification.id,
      notificationRecipientId: minorRecipient.id,
      userId: minor.id,
      deviceId: minorPushDevice.id,
      provider: "expo",
      providerMessageId: "expo_seed_minor_delivery_001",
      status: PushDeliveryStatus.FAILED,
      attemptCount: 2,
      scheduledAt: minutesFromNow(-13),
      sentAt: minutesFromNow(-12),
      failureCode: "DeviceNotRegistered",
      failureReason: "Push token invalidated after app reinstall.",
      payload: {
        title: guardianReminderNotification.title,
        audience: guardianReminderNotification.audience,
      },
      response: {
        error: "DeviceNotRegistered",
      },
    },
  });

  await prisma.badge.createMany({
    data: [
      { code: "FIRST_CHECKIN", name: "First Check-in", description: "Completed your first visit." },
      { code: "SEVEN_DAY_STREAK", name: "7-Day Streak", description: "Seven consistent days." },
      { code: "TWELVE_VISITS", name: "12 Visits", description: "Twelve visits logged." },
      { code: "PLAN_FINISHER", name: "Plan Finisher", description: "Completed an assigned plan." },
    ],
  });

  const firstBadge = await prisma.badge.findUniqueOrThrow({ where: { code: "FIRST_CHECKIN" } });
  await prisma.userBadge.create({
    data: {
      orgId: aarogyaStrength.id,
      userId: member.id,
      badgeId: firstBadge.id,
      metadata: { source: "attendance" },
    },
  });

  await prisma.userGoal.create({
    data: {
      orgId: aarogyaStrength.id,
      userId: member.id,
      type: "weekly_attendance",
      title: "Attend 4 times this week",
      targetValue: 4,
      currentValue: 2,
      period: "week",
    },
  });

  const habit = await prisma.habitChecklist.create({
    data: {
      orgId: aarogyaStrength.id,
      userId: member.id,
      title: "Recovery basics",
      items: ["Hydration", "8k steps", "Sleep reminder"],
    },
  });

  await prisma.habitCompletion.create({
    data: {
      habitId: habit.id,
      userId: member.id,
      dateKey: new Date().toISOString().slice(0, 10),
      completedItems: ["Hydration", "8k steps"],
    },
  });

  const workoutSession = await prisma.workoutSession.create({
    data: {
      userId: member.id,
      organizationId: aarogyaStrength.id,
      title: "Upper Body Strength",
      workoutType: "strength",
      startedAt: pastDays(1),
      endedAt: new Date(pastDays(1).getTime() + 75 * 60 * 1000),
      durationMinutes: 75,
      intensity: "RPE 7",
      notes: "Solid pressing day and shoulder warm-up.",
      visibility: "TRAINER_VISIBLE",
    },
  });

  await prisma.workoutExerciseEntry.createMany({
    data: [
      {
        workoutSessionId: workoutSession.id,
        exerciseName: "Bench Press",
        orderIndex: 0,
        setsCompleted: 4,
        reps: 8,
        weightKg: new Prisma.Decimal("60"),
        completed: true,
      },
      {
        workoutSessionId: workoutSession.id,
        exerciseName: "Cable Row",
        orderIndex: 1,
        setsCompleted: 4,
        reps: 10,
        weightKg: new Prisma.Decimal("40"),
        completed: true,
      },
    ],
  });

  await prisma.bodyProgressEntry.create({
    data: {
      userId: member.id,
      organizationId: aarogyaStrength.id,
      measuredAt: new Date(),
      weightKg: new Prisma.Decimal("68.4"),
      waistCm: new Prisma.Decimal("79.0"),
      visibility: "PRIVATE",
      notes: "Post-cut baseline",
    },
  });

  const memberHabit = await prisma.memberHabit.create({
    data: {
      userId: member.id,
      organizationId: aarogyaStrength.id,
      title: "Hydration",
      category: "HYDRATION",
      targetValue: 3,
      unit: "litres",
      frequency: "DAILY",
      visibility: "PRIVATE",
    },
  });

  await prisma.memberHabitLog.create({
    data: {
      habitId: memberHabit.id,
      loggedAt: new Date(),
      value: 3,
      completed: true,
      notes: "Hit the daily water target.",
    },
  });

  const challenge = await prisma.challenge.create({
    data: {
      orgId: aarogyaStrength.id,
      createdById: owner.id,
      title: "Comeback Week",
      description: "Opt-in five-day consistency challenge.",
      startsAt: pastDays(1),
      endsAt: days(6),
      optInOnly: true,
      leaderboardEnabled: false,
    },
  });

  await prisma.challengeParticipant.create({
    data: {
      orgId: aarogyaStrength.id,
      challengeId: challenge.id,
      userId: member.id,
      visibleOnLeaderboard: false,
    },
  });

  await prisma.challengeProgress.create({
    data: {
      orgId: aarogyaStrength.id,
      challengeId: challenge.id,
      userId: member.id,
      value: 2,
      metadata: { visits: 2 },
    },
  });

  const products = await prisma.product.createManyAndReturn({
    data: [
      {
        orgId: aarogyaStrength.id,
        name: "Water Bottle",
        description: "Reusable steel bottle.",
        category: ProductCategory.WATER,
        pricePaise: paise(399),
        stock: 24,
        lowStockThreshold: 5,
        imageUrl: "/seed/products/water-bottle.svg",
      },
      {
        orgId: aarogyaStrength.id,
        name: "Protein Shake",
        description: "Post-workout shake, pickup at counter.",
        category: ProductCategory.PROTEIN_SHAKE,
        pricePaise: paise(149),
        stock: 18,
        lowStockThreshold: 6,
        imageUrl: "/seed/products/protein-shake.svg",
      },
      {
        orgId: aarogyaStrength.id,
        name: "Shaker",
        description: "Leak-resistant shaker.",
        category: ProductCategory.SHAKER,
        pricePaise: paise(299),
        stock: 8,
        lowStockThreshold: 4,
        imageUrl: "/seed/products/shaker.svg",
      },
    ],
  });

  const waterBottle = must(products[0], "water bottle product");
  const proteinShake = must(products[1], "protein shake product");

  const shopOrder = await prisma.shopOrder.create({
    data: {
      orgId: aarogyaStrength.id,
      userId: member.id,
      status: OrderStatus.READY_FOR_PICKUP,
      totalPaise: paise(548),
      pickupCode: "AS-PICK-101",
    },
  });

  await prisma.shopOrderItem.createMany({
    data: [
      {
        orgId: aarogyaStrength.id,
        orderId: shopOrder.id,
        productId: waterBottle.id,
        quantity: 1,
        unitPaise: paise(399),
      },
      {
        orgId: aarogyaStrength.id,
        orderId: shopOrder.id,
        productId: proteinShake.id,
        quantity: 1,
        unitPaise: paise(149),
      },
    ],
  });

  await prisma.pickupCode.create({
    data: {
      orgId: aarogyaStrength.id,
      orderId: shopOrder.id,
      code: "AS-PICK-101",
      expiresAt: days(14),
    },
  });

  await prisma.inventoryMovement.createMany({
    data: [
      {
        orgId: aarogyaStrength.id,
        productId: waterBottle.id,
        delta: -1,
        reason: "paid_order",
        orderId: shopOrder.id,
        createdById: member.id,
      },
      {
        orgId: aarogyaStrength.id,
        productId: proteinShake.id,
        delta: -1,
        reason: "paid_order",
        orderId: shopOrder.id,
        createdById: member.id,
      },
    ],
  });

  await prisma.membershipJoinRequest.create({
    data: {
      orgId: indiranagarPerformance.id,
      branchId: indiranagarBranch.id,
      userId: member.id,
      status: "pending",
      message: "Looking for a functional training plan.",
    },
  });

  await prisma.platformSetting.create({
    data: {
      key: "global_ai_limits",
      value: { memberDaily: 5, trainerDaily: 25, orgMonthly: 500 },
      updatedById: platform.id,
    },
  });

  await prisma.organizationAbuseFlag.create({
    data: {
      orgId: aarogyaStrength.id,
      userId: member.id,
      type: "repeated_manual_override",
      severity: "low",
      metadata: { count: 1, note: "Seed example only" },
    },
  });

  const paymentHealthCheck = await prisma.providerHealthCheck.create({
    data: {
      orgId: aarogyaStrength.id,
      providerType: ProviderHealthDomain.PAYMENT,
      provider: "mock_payments",
      status: ProviderHealthCheckStatus.HEALTHY,
      checkedAt: minutesFromNow(-6),
      latencyMs: 182,
      statusCode: 200,
      message: "Webhook verification and capture flow healthy.",
      metadata: {
        queueDepth: 0,
        source: "private_pilot_monitor",
      },
    },
  });

  const pushHealthCheck = await prisma.providerHealthCheck.create({
    data: {
      orgId: aarogyaStrength.id,
      providerType: ProviderHealthDomain.PUSH,
      provider: "expo_push",
      status: ProviderHealthCheckStatus.DEGRADED,
      checkedAt: minutesFromNow(-5),
      latencyMs: 1340,
      statusCode: 207,
      errorCode: "TOKEN_INVALIDATION_SPIKE",
      message: "Invalid token rate above pilot threshold.",
      consecutiveFailures: 2,
      metadata: {
        invalidTokenRate: 0.18,
        cohort: "private_pilot_rc",
      },
    },
  });

  await prisma.incidentLog.createMany({
    data: [
      {
        orgId: aarogyaStrength.id,
        reportedById: platform.id,
        status: IncidentStatus.ACKNOWLEDGED,
        severity: IncidentSeverity.HIGH,
        category: "payment_webhook",
        title: "Refund webhook held for manual review",
        summary:
          "A refund event entered quarantine because the pilot ledger had no matching refund reference.",
        provider: paymentHealthCheck.provider,
        relatedEntityType: "PaymentEvent",
        relatedEntityId: paymentRefundEvent.id,
        detectionSource: "payment_webhook_worker",
        firstSeenAt: minutesFromNow(-15),
        acknowledgedAt: minutesFromNow(-8),
        metadata: {
          providerHealthCheckId: paymentHealthCheck.id,
          nextRetryAt: minutesFromNow(30).toISOString(),
        },
      },
      {
        orgId: aarogyaStrength.id,
        reportedById: owner.id,
        status: IncidentStatus.MONITORING,
        severity: IncidentSeverity.MEDIUM,
        category: "push_delivery",
        title: "Push token invalidation spike on beta builds",
        summary:
          "Expo push returned DeviceNotRegistered for one private-pilot device after the latest beta reinstall.",
        provider: pushHealthCheck.provider,
        relatedEntityType: "PushDelivery",
        relatedEntityId: failedPushDelivery.id,
        detectionSource: "provider_health_check",
        firstSeenAt: minutesFromNow(-12),
        resolutionSummary: "Monitoring after in-app re-registration prompt shipped.",
        metadata: {
          providerHealthCheckId: pushHealthCheck.id,
          guardianConsentId: guardianConsent.id,
        },
      },
    ],
  });

  await prisma.auditLog.createMany({
    data: [
      {
        orgId: aarogyaStrength.id,
        actorUserId: owner.id,
        action: "organization.seeded",
        entityType: "Organization",
        entityId: aarogyaStrength.id,
        after: {
          status: "TRIAL_ACTIVE",
          visibility: "PUBLIC",
        },
        riskLevel: AuditRiskLevel.LOW,
        metadata: { seed: true },
      },
      {
        orgId: aarogyaStrength.id,
        actorUserId: reception.id,
        action: "manual_payment.recorded",
        entityType: "Payment",
        entityId: payment.id,
        before: {
          status: "PENDING",
        },
        after: {
          status: "SUCCEEDED",
          notes: payment.notes,
        },
        riskLevel: AuditRiskLevel.MEDIUM,
        metadata: { mode: "mock_online" },
      },
      {
        orgId: aarogyaStrength.id,
        actorUserId: platform.id,
        action: "privacy.export.completed",
        entityType: "DataExportJob",
        entityId: exportJob.id,
        after: {
          status: "SUCCEEDED",
          format: "JSON",
        },
        riskLevel: AuditRiskLevel.HIGH,
        metadata: {
          requestId: exportRequest.id,
        },
      },
    ],
  });

  console.log("Zook seed completed.");
  console.table({
    platform: platform.email,
    owner: owner.email,
    admin: admin.email,
    reception: reception.email,
    trainer: trainer.email,
    member: member.email,
    minor: minor.email,
    otp: "000000",
    aarogyaStrength: "aarogya-strength",
    peakLab: "peaklab",
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
