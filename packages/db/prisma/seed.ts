import { createHash } from "node:crypto";
import {
  AIProviderType,
  AIRequestType,
  AttendanceSource,
  AttendanceStatus,
  ConsentStatus,
  ConsentType,
  CouponType,
  GymJoinMode,
  GymVisibility,
  LocationSource,
  MembershipPlanType,
  NotificationStatus,
  NotificationType,
  OrderStatus,
  PaymentMode,
  PaymentPurpose,
  PaymentStatus,
  Permission,
  PlanStatus,
  PlanType,
  Prisma,
  PrismaClient,
  ProductCategory,
  Role,
  SubscriptionStatus
} from "@prisma/client";

const prisma = new PrismaClient();

const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const days = (count: number) => new Date(Date.now() + count * 24 * 60 * 60 * 1000);
const pastDays = (count: number) => days(-count);
const paise = (rupees: number) => Math.round(rupees * 100);
const must = <T>(value: T | undefined, label: string): T => {
  if (!value) {
    throw new Error(`Missing seed value: ${label}`);
  }
  return value;
};

const ownerPermissions = Object.values(Permission).filter(
  (permission) => !permission.startsWith("PLATFORM_"),
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
  Permission.NOTIFICATION_SEND_OPERATIONAL
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
  Permission.NOTIFICATION_SEND_PLAN
];

async function clear() {
  await prisma.organizationAbuseFlag.deleteMany();
  await prisma.platformSetting.deleteMany();
  await prisma.pickupCode.deleteMany();
  await prisma.shopOrderItem.deleteMany();
  await prisma.shopOrder.deleteMany();
  await prisma.inventoryMovement.deleteMany();
  await prisma.product.deleteMany();
  await prisma.challengeProgress.deleteMany();
  await prisma.challengeParticipant.deleteMany();
  await prisma.challenge.deleteMany();
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
  await prisma.payment.deleteMany();
  await prisma.paymentSession.deleteMany();
  await prisma.membershipJoinRequest.deleteMany();
  await prisma.membershipUsage.deleteMany();
  await prisma.memberSubscription.deleteMany();
  await prisma.membershipPlan.deleteMany();
  await prisma.consentRecord.deleteMany();
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
      ["platform", "Platform Admin", "platform@zook.local", true, false],
      ["owner", "Aarav Owner", "owner@zook.local", false, false],
      ["admin", "Meera Admin", "admin@zook.local", false, false],
      ["reception", "Riya Reception", "reception@zook.local", false, false],
      ["trainer", "Kabir Trainer", "trainer@zook.local", false, false],
      ["member", "Nisha Member", "member@zook.local", false, false],
      ["minor", "Isha Minor", "minor@zook.local", false, true]
    ].map(([key, name, email, isPlatformAdmin, isMinor]) =>
      prisma.user.create({
        data: {
          name: String(name),
          email: String(email),
          phone: "+91 90000 00000",
          dateOfBirth: isMinor ? new Date("2011-08-18") : new Date("1995-04-12"),
          profilePhotoUrl: `/seed/avatars/${key}.svg`,
          fitnessGoal: isMinor ? "Build healthy habits safely" : "Strength and consistency",
          isPlatformAdmin: Boolean(isPlatformAdmin),
          isMinor: Boolean(isMinor),
          guardianPending: Boolean(isMinor),
          marketingOptIn: !isMinor,
          aiConsent: !isMinor,
          emailVerifiedAt: new Date()
        }
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

  await prisma.otpChallenge.create({
    data: {
      email: "member@zook.local",
      codeHash: hash("000000"),
      expiresAt: days(1)
    }
  });

  const ironHouse = await prisma.organization.create({
    data: {
      name: "Iron House Fitness",
      username: "iron-house",
      contactPhone: "+91 98765 43210",
      contactEmail: "hello@ironhouse.example",
      address: "Koregaon Park Road",
      city: "Pune",
      state: "Maharashtra",
      pincode: "411001",
      latitude: new Prisma.Decimal("18.5362"),
      longitude: new Prisma.Decimal("73.8930"),
      locationSource: LocationSource.MOCK,
      amenities: ["Strength floor", "Cardio", "Locker", "Personal training"],
      operatingHours: { weekday: "05:30-22:30", sunday: "07:00-14:00" },
      visibility: GymVisibility.PUBLIC,
      joinMode: GymJoinMode.OPEN_JOIN,
      trialStartAt: new Date(),
      trialEndAt: days(30),
      createdByUserId: owner.id,
      settings: { allowReferrals: true, broadcastApprovalRequired: true }
    }
  });

  const peakLab = await prisma.organization.create({
    data: {
      name: "PeakLab Gym",
      username: "peaklab",
      contactPhone: "+91 99887 76655",
      contactEmail: "join@peaklab.example",
      address: "Indiranagar 100 Feet Road",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560038",
      latitude: new Prisma.Decimal("12.9719"),
      longitude: new Prisma.Decimal("77.6412"),
      locationSource: LocationSource.MOCK,
      amenities: ["Functional zone", "HIIT", "Nutrition desk"],
      operatingHours: { weekday: "06:00-22:00", sunday: "08:00-12:00" },
      visibility: GymVisibility.PUBLIC,
      joinMode: GymJoinMode.APPROVAL_REQUIRED,
      trialStartAt: new Date(),
      trialEndAt: days(30),
      createdByUserId: owner.id
    }
  });

  const ironBranch = await prisma.branch.create({
    data: {
      orgId: ironHouse.id,
      name: "Iron House Main",
      address: ironHouse.address,
      city: ironHouse.city,
      state: ironHouse.state,
      pincode: ironHouse.pincode,
      latitude: ironHouse.latitude,
      longitude: ironHouse.longitude,
      locationSource: LocationSource.MOCK,
      isDefault: true
    }
  });

  const peakBranch = await prisma.branch.create({
    data: {
      orgId: peakLab.id,
      name: "PeakLab Main",
      address: peakLab.address,
      city: peakLab.city,
      state: peakLab.state,
      pincode: peakLab.pincode,
      latitude: peakLab.latitude,
      longitude: peakLab.longitude,
      locationSource: LocationSource.MOCK,
      isDefault: true
    }
  });

  for (const org of [ironHouse, peakLab]) {
    await prisma.saaSSubscription.create({
      data: {
        orgId: org.id,
        trialStartAt: org.trialStartAt,
        trialEndAt: org.trialEndAt
      }
    });
    await prisma.organizationSetting.create({
      data: {
        orgId: org.id,
        keyValues: {
          attendanceMode: "EXCEPTION_APPROVAL",
          multiEntryConsumes: false,
          minorsMarketingOff: true
        }
      }
    });
  }

  const orgUsers = [
    [owner.id, Role.OWNER],
    [admin.id, Role.ADMIN],
    [reception.id, Role.RECEPTIONIST],
    [trainer.id, Role.TRAINER],
    [member.id, Role.MEMBER],
    [minor.id, Role.MEMBER]
  ] as const;

  for (const [userId, role] of orgUsers) {
    await prisma.organizationUser.create({ data: { orgId: ironHouse.id, userId } });
    await prisma.organizationRoleAssignment.create({
      data: { orgId: ironHouse.id, userId, role, assignedById: owner.id }
    });
  }

  await prisma.organizationUser.create({ data: { orgId: peakLab.id, userId: owner.id } });
  await prisma.organizationRoleAssignment.create({
    data: { orgId: peakLab.id, userId: owner.id, role: Role.OWNER, assignedById: owner.id }
  });

  for (const permission of ownerPermissions) {
    await prisma.organizationRolePermission.create({
      data: { orgId: ironHouse.id, role: Role.OWNER, permission }
    });
  }
  for (const permission of adminPermissions) {
    await prisma.organizationRolePermission.create({
      data: { orgId: ironHouse.id, role: Role.ADMIN, permission }
    });
  }
  for (const permission of receptionistPermissions) {
    await prisma.organizationRolePermission.create({
      data: { orgId: ironHouse.id, role: Role.RECEPTIONIST, permission }
    });
  }
  for (const permission of trainerPermissions) {
    await prisma.organizationRolePermission.create({
      data: { orgId: ironHouse.id, role: Role.TRAINER, permission }
    });
  }

  await prisma.staffInvitation.create({
    data: {
      orgId: ironHouse.id,
      email: "coach2@ironhouse.example",
      role: Role.TRAINER,
      token: "seed-trainer-invite",
      invitedById: owner.id,
      expiresAt: days(7)
    }
  });

  await prisma.memberProfile.createMany({
    data: [
      {
        orgId: ironHouse.id,
        userId: member.id,
        profilePhotoUrl: member.profilePhotoUrl,
        profilePhotoConsentAt: new Date(),
        marketingOptIn: true,
        joinedViaReferralCodeId: null
      },
      {
        orgId: ironHouse.id,
        userId: minor.id,
        profilePhotoUrl: minor.profilePhotoUrl,
        marketingOptIn: false
      }
    ]
  });

  await prisma.guardianConsent.create({
    data: {
      minorUserId: minor.id,
      guardianName: "Neha Guardian",
      guardianEmail: "guardian@zook.local",
      guardianPhone: "+91 91111 11111",
      relationship: "Parent",
      status: ConsentStatus.PENDING
    }
  });

  await prisma.consentRecord.createMany({
    data: [
      {
        orgId: ironHouse.id,
        userId: member.id,
        type: ConsentType.PROFILE_PHOTO_ATTENDANCE,
        status: ConsentStatus.GRANTED,
        recordedById: member.id
      },
      {
        orgId: ironHouse.id,
        userId: member.id,
        type: ConsentType.AI_PERSONALIZATION,
        status: ConsentStatus.GRANTED,
        recordedById: member.id
      },
      {
        orgId: ironHouse.id,
        userId: minor.id,
        type: ConsentType.MARKETING,
        status: ConsentStatus.DENIED,
        recordedById: minor.id
      }
    ]
  });

  const monthly = await prisma.membershipPlan.create({
    data: {
      orgId: ironHouse.id,
      branchId: ironBranch.id,
      name: "Monthly Unlimited",
      description: "Unlimited gym access for 30 days.",
      type: MembershipPlanType.DURATION,
      pricePaise: paise(1999),
      durationDays: 30,
      createdById: owner.id,
      terms: "Valid for one member only."
    }
  });

  await prisma.membershipPlan.create({
    data: {
      orgId: ironHouse.id,
      branchId: ironBranch.id,
      name: "Annual Unlimited",
      description: "Best value annual access.",
      type: MembershipPlanType.DURATION,
      pricePaise: paise(17999),
      durationDays: 365,
      createdById: owner.id
    }
  });

  const visits = await prisma.membershipPlan.create({
    data: {
      orgId: ironHouse.id,
      branchId: ironBranch.id,
      name: "30 Visits / 180 Days",
      description: "Flexible pack for busy members.",
      type: MembershipPlanType.HYBRID,
      pricePaise: paise(3499),
      visitLimit: 30,
      validityDays: 180,
      createdById: owner.id
    }
  });

  await prisma.membershipPlan.create({
    data: {
      orgId: ironHouse.id,
      branchId: ironBranch.id,
      name: "Trial Pass",
      description: "One free guided visit.",
      type: MembershipPlanType.TRIAL,
      pricePaise: 0,
      visitLimit: 1,
      validityDays: 7,
      createdById: owner.id
    }
  });

  await prisma.membershipPlan.create({
    data: {
      orgId: peakLab.id,
      branchId: peakBranch.id,
      name: "PeakLab Monthly",
      description: "Approval-required access.",
      type: MembershipPlanType.DURATION,
      pricePaise: paise(2499),
      durationDays: 30,
      createdById: owner.id
    }
  });

  const welcome = await prisma.coupon.create({
    data: {
      orgId: ironHouse.id,
      code: "WELCOME10",
      type: CouponType.PERCENTAGE,
      valuePercentBps: 1000,
      active: true,
      validFrom: pastDays(2),
      validUntil: days(45),
      maxRedemptions: 100,
      perUserLimit: 1,
      createdById: owner.id
    }
  });

  await prisma.coupon.create({
    data: {
      orgId: ironHouse.id,
      code: "NEW500",
      type: CouponType.FIXED_AMOUNT,
      valuePaise: paise(500),
      active: true,
      validFrom: pastDays(2),
      validUntil: days(45),
      applicablePlanId: monthly.id,
      createdById: owner.id
    }
  });

  const referral = await prisma.referralCode.create({
    data: {
      orgId: ironHouse.id,
      referrerUserId: member.id,
      code: "NISHAFIT",
      couponId: welcome.id,
      createdByRole: Role.MEMBER,
      maxUses: 20
    }
  });

  const payment = await prisma.payment.create({
    data: {
      orgId: ironHouse.id,
      userId: member.id,
      purpose: PaymentPurpose.MEMBERSHIP,
      amountPaise: paise(1799),
      status: PaymentStatus.SUCCEEDED,
      mode: PaymentMode.MOCK_ONLINE,
      provider: "mock",
      providerRef: "mock_seed_membership",
      recordedAt: new Date()
    }
  });

  const subscription = await prisma.memberSubscription.create({
    data: {
      orgId: ironHouse.id,
      branchId: ironBranch.id,
      memberUserId: member.id,
      planId: monthly.id,
      status: SubscriptionStatus.ACTIVE,
      startsAt: pastDays(5),
      endsAt: days(25),
      paymentId: payment.id,
      referralCodeId: referral.id,
      activatedById: owner.id
    }
  });

  await prisma.memberSubscription.create({
    data: {
      orgId: ironHouse.id,
      branchId: ironBranch.id,
      memberUserId: member.id,
      planId: visits.id,
      status: SubscriptionStatus.PAUSED,
      startsAt: days(30),
      endsAt: days(210),
      remainingVisits: 30,
      notes: "Early renewal starts after current plan."
    }
  });

  const attendance = await prisma.attendanceRecord.create({
    data: {
      orgId: ironHouse.id,
      branchId: ironBranch.id,
      userId: member.id,
      subscriptionId: subscription.id,
      status: AttendanceStatus.APPROVED,
      source: AttendanceSource.QR_SCAN,
      dateKey: new Date().toISOString().slice(0, 10),
      checkedInAt: new Date(),
      approvedById: reception.id,
      approvedAt: new Date(),
      suspiciousFlags: []
    }
  });

  await prisma.membershipUsage.create({
    data: {
      orgId: ironHouse.id,
      subscriptionId: subscription.id,
      attendanceId: attendance.id,
      usedVisits: 0
    }
  });

  await prisma.attendanceOverride.create({
    data: {
      orgId: ironHouse.id,
      attendanceRecordId: attendance.id,
      userId: member.id,
      reason: "system issue",
      notes: "Seeded example override audit trail.",
      createdById: reception.id
    }
  });

  await prisma.trainerProfile.create({
    data: {
      orgId: ironHouse.id,
      userId: trainer.id,
      bio: "Strength coach focused on safe, sustainable progress.",
      specialties: ["Strength", "Fat loss", "Beginner technique"],
      availability: { mon: "07:00-12:00", wed: "17:00-21:00" },
      upiId: "kabir@upi",
      visibleToMembers: true
    }
  });

  await prisma.trainerAssignment.create({
    data: {
      orgId: ironHouse.id,
      trainerUserId: trainer.id,
      memberUserId: member.id,
      assignedById: owner.id
    }
  });

  const ptPack = await prisma.personalTrainingPlan.create({
    data: {
      orgId: ironHouse.id,
      trainerUserId: trainer.id,
      name: "12 Session Pack",
      description: "Technique and progression coaching.",
      sessionCount: 12,
      pricePaise: paise(9000)
    }
  });

  await prisma.personalTrainingPlan.create({
    data: {
      orgId: ironHouse.id,
      trainerUserId: trainer.id,
      name: "Monthly PT",
      description: "One month guided training.",
      durationDays: 30,
      pricePaise: paise(12000)
    }
  });

  const ptSub = await prisma.personalTrainingSubscription.create({
    data: {
      orgId: ironHouse.id,
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
      recordedById: trainer.id
    }
  });

  await prisma.personalTrainingSessionLog.create({
    data: {
      orgId: ironHouse.id,
      subscriptionId: ptSub.id,
      trainerUserId: trainer.id,
      memberUserId: member.id,
      notes: "Squat technique and RPE calibration."
    }
  });

  const plan = await prisma.planContent.create({
    data: {
      orgId: ironHouse.id,
      creatorUserId: trainer.id,
      type: PlanType.WORKOUT,
      title: "Starter Strength Week",
      description: "Three-day beginner strength plan.",
      content: {
        days: [
          { name: "Day 1", work: ["Goblet squat 3x10", "Push-up 3x8", "Row 3x12"] },
          { name: "Day 2", work: ["Deadlift pattern 3x8", "Press 3x8", "Carry 4x30m"] }
        ]
      },
      aiGenerated: true,
      reviewed: true,
      reviewedById: trainer.id,
      status: PlanStatus.PUBLISHED,
      visibility: "assigned"
    }
  });

  await prisma.planVersion.create({
    data: {
      orgId: ironHouse.id,
      planId: plan.id,
      versionNo: 1,
      content: { title: "Starter Strength Week" },
      createdById: trainer.id
    }
  });

  const assignment = await prisma.planAssignment.create({
    data: {
      orgId: ironHouse.id,
      planId: plan.id,
      assignedById: trainer.id,
      assignedToUserId: member.id,
      audience: "selected_member"
    }
  });

  await prisma.planProgress.create({
    data: {
      orgId: ironHouse.id,
      assignmentId: assignment.id,
      userId: member.id,
      progressJson: { completed: ["Day 1"] },
      completionPct: 50,
      feedback: "Felt strong on goblet squats."
    }
  });

  await prisma.resourceLibraryItem.create({
    data: {
      orgId: ironHouse.id,
      title: "Beginner Strength Safety Notes",
      summary: "Prefer technique quality and gradual progression over load.",
      content: "Warm up, keep movements pain-free, and consult a professional for injuries.",
      approved: true,
      createdById: trainer.id
    }
  });

  const conversation = await prisma.aIConversation.create({
    data: {
      orgId: ironHouse.id,
      userId: member.id,
      title: "Plan clarification"
    }
  });

  await prisma.aIMessage.createMany({
    data: [
      {
        conversationId: conversation.id,
        role: "user",
        content: "How should I warm up for today?"
      },
      {
        conversationId: conversation.id,
        role: "assistant",
        content: "Start with five minutes easy cardio and two light sets of your first lift."
      }
    ]
  });

  await prisma.aIUsageLog.createMany({
    data: [
      {
        orgId: ironHouse.id,
        userId: member.id,
        role: Role.MEMBER,
        provider: AIProviderType.MOCK,
        requestType: AIRequestType.CHAT,
        promptSummary: "Warm-up advice",
        responseSummary: "Basic safe warm-up guidance",
        tokenEstimate: 120,
        quotaConsumed: 1
      },
      {
        orgId: ironHouse.id,
        userId: trainer.id,
        role: Role.TRAINER,
        provider: AIProviderType.MOCK,
        requestType: AIRequestType.STRUCTURED_PLAN,
        promptSummary: "Draft beginner strength plan",
        responseSummary: "Created reviewed draft",
        tokenEstimate: 600,
        quotaConsumed: 1,
        createdPlanId: plan.id
      }
    ]
  });

  await prisma.aIQuota.createMany({
    data: [
      {
        orgId: ironHouse.id,
        userId: member.id,
        role: Role.MEMBER,
        textDailyLimit: 5,
        textMonthLimit: 50,
        imageMonthLimit: 0,
        resetDailyAt: days(1),
        resetMonthAt: days(30)
      },
      {
        orgId: ironHouse.id,
        userId: trainer.id,
        role: Role.TRAINER,
        textDailyLimit: 25,
        textMonthLimit: 300,
        imageMonthLimit: 10,
        resetDailyAt: days(1),
        resetMonthAt: days(30)
      },
      {
        orgId: ironHouse.id,
        role: Role.OWNER,
        textDailyLimit: 25,
        textMonthLimit: 500,
        imageMonthLimit: 20,
        resetDailyAt: days(1),
        resetMonthAt: days(30)
      }
    ]
  });

  const notification = await prisma.notification.create({
    data: {
      orgId: ironHouse.id,
      createdById: owner.id,
      type: NotificationType.OPERATIONAL,
      status: NotificationStatus.SENT,
      title: "Evening floor maintenance",
      body: "Cardio zone opens at 7 PM today after maintenance.",
      audience: "all_active_members",
      sentAt: new Date(),
      pushEnabled: true
    }
  });

  await prisma.notificationRecipient.create({
    data: {
      notificationId: notification.id,
      userId: member.id,
      deliveredAt: new Date(),
      deliveryStatus: "mock_push"
    }
  });

  await prisma.notificationTemplate.create({
    data: {
      orgId: ironHouse.id,
      type: NotificationType.TRANSACTIONAL,
      name: "Membership Expiring",
      title: "Your membership expires soon",
      body: "Renew before {date} to keep check-ins active.",
      active: true,
      createdById: owner.id
    }
  });

  await prisma.userNotificationPreference.createMany({
    data: [
      {
        orgId: ironHouse.id,
        userId: member.id,
        transactional: true,
        operational: true,
        promotional: true,
        engagement: true,
        pushEnabled: true
      },
      {
        orgId: ironHouse.id,
        userId: minor.id,
        transactional: true,
        operational: true,
        promotional: false,
        engagement: false,
        pushEnabled: false
      }
    ]
  });

  await prisma.badge.createMany({
    data: [
      { code: "FIRST_CHECKIN", name: "First Check-in", description: "Completed your first visit." },
      { code: "SEVEN_DAY_STREAK", name: "7-Day Streak", description: "Seven consistent days." },
      { code: "TWELVE_VISITS", name: "12 Visits", description: "Twelve visits logged." },
      { code: "PLAN_FINISHER", name: "Plan Finisher", description: "Completed an assigned plan." }
    ]
  });

  const firstBadge = await prisma.badge.findUniqueOrThrow({ where: { code: "FIRST_CHECKIN" } });
  await prisma.userBadge.create({
    data: {
      orgId: ironHouse.id,
      userId: member.id,
      badgeId: firstBadge.id,
      metadata: { source: "attendance" }
    }
  });

  await prisma.userGoal.create({
    data: {
      orgId: ironHouse.id,
      userId: member.id,
      type: "weekly_attendance",
      title: "Attend 4 times this week",
      targetValue: 4,
      currentValue: 2,
      period: "week"
    }
  });

  const habit = await prisma.habitChecklist.create({
    data: {
      orgId: ironHouse.id,
      userId: member.id,
      title: "Recovery basics",
      items: ["Hydration", "8k steps", "Sleep reminder"]
    }
  });

  await prisma.habitCompletion.create({
    data: {
      habitId: habit.id,
      userId: member.id,
      dateKey: new Date().toISOString().slice(0, 10),
      completedItems: ["Hydration", "8k steps"]
    }
  });

  const challenge = await prisma.challenge.create({
    data: {
      orgId: ironHouse.id,
      createdById: owner.id,
      title: "Comeback Week",
      description: "Opt-in five-day consistency challenge.",
      startsAt: pastDays(1),
      endsAt: days(6),
      optInOnly: true,
      leaderboardEnabled: false
    }
  });

  await prisma.challengeParticipant.create({
    data: {
      orgId: ironHouse.id,
      challengeId: challenge.id,
      userId: member.id,
      visibleOnLeaderboard: false
    }
  });

  await prisma.challengeProgress.create({
    data: {
      orgId: ironHouse.id,
      challengeId: challenge.id,
      userId: member.id,
      value: 2,
      metadata: { visits: 2 }
    }
  });

  const products = await prisma.product.createManyAndReturn({
    data: [
      {
        orgId: ironHouse.id,
        name: "Water Bottle",
        description: "Reusable steel bottle.",
        category: ProductCategory.WATER,
        pricePaise: paise(399),
        stock: 24,
        lowStockThreshold: 5,
        imageUrl: "/seed/products/water-bottle.svg"
      },
      {
        orgId: ironHouse.id,
        name: "Protein Shake",
        description: "Post-workout shake, pickup at counter.",
        category: ProductCategory.PROTEIN_SHAKE,
        pricePaise: paise(149),
        stock: 18,
        lowStockThreshold: 6,
        imageUrl: "/seed/products/protein-shake.svg"
      },
      {
        orgId: ironHouse.id,
        name: "Shaker",
        description: "Leak-resistant shaker.",
        category: ProductCategory.SHAKER,
        pricePaise: paise(299),
        stock: 8,
        lowStockThreshold: 4,
        imageUrl: "/seed/products/shaker.svg"
      }
    ]
  });

  const waterBottle = must(products[0], "water bottle product");
  const proteinShake = must(products[1], "protein shake product");

  const shopOrder = await prisma.shopOrder.create({
    data: {
      orgId: ironHouse.id,
      userId: member.id,
      status: OrderStatus.READY_FOR_PICKUP,
      totalPaise: paise(548),
      pickupCode: "IH-PICK-101"
    }
  });

  await prisma.shopOrderItem.createMany({
    data: [
      {
        orgId: ironHouse.id,
        orderId: shopOrder.id,
        productId: waterBottle.id,
        quantity: 1,
        unitPaise: paise(399)
      },
      {
        orgId: ironHouse.id,
        orderId: shopOrder.id,
        productId: proteinShake.id,
        quantity: 1,
        unitPaise: paise(149)
      }
    ]
  });

  await prisma.pickupCode.create({
    data: {
      orgId: ironHouse.id,
      orderId: shopOrder.id,
      code: "IH-PICK-101",
      expiresAt: days(14)
    }
  });

  await prisma.inventoryMovement.createMany({
    data: [
      {
        orgId: ironHouse.id,
        productId: waterBottle.id,
        delta: -1,
        reason: "paid_order",
        orderId: shopOrder.id,
        createdById: member.id
      },
      {
        orgId: ironHouse.id,
        productId: proteinShake.id,
        delta: -1,
        reason: "paid_order",
        orderId: shopOrder.id,
        createdById: member.id
      }
    ]
  });

  await prisma.membershipJoinRequest.create({
    data: {
      orgId: peakLab.id,
      branchId: peakBranch.id,
      userId: member.id,
      status: "pending",
      message: "Looking for a functional training plan."
    }
  });

  await prisma.platformSetting.create({
    data: {
      key: "global_ai_limits",
      value: { memberDaily: 5, trainerDaily: 25, orgMonthly: 500 },
      updatedById: platform.id
    }
  });

  await prisma.organizationAbuseFlag.create({
    data: {
      orgId: ironHouse.id,
      userId: member.id,
      type: "repeated_manual_override",
      severity: "low",
      metadata: { count: 1, note: "Seed example only" }
    }
  });

  await prisma.auditLog.createMany({
    data: [
      {
        orgId: ironHouse.id,
        actorUserId: owner.id,
        action: "organization.seeded",
        entityType: "Organization",
        entityId: ironHouse.id,
        metadata: { seed: true }
      },
      {
        orgId: ironHouse.id,
        actorUserId: reception.id,
        action: "manual_payment.recorded",
        entityType: "Payment",
        entityId: payment.id,
        metadata: { mode: "mock_online" }
      }
    ]
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
    ironHouse: "iron-house",
    peakLab: "peaklab"
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
