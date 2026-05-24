import { describe, expect, it } from "vitest";
import type {
  Coupon,
  MemberSubscription,
  MembershipPlan,
  ReferralCode,
  UserSafetyState,
} from "../types";
import { canAccessPlatform, hasPermission, permissionsForRoles } from "../permissions";
import { MockAIProvider } from "../providers/ai";
import {
  applyCoupon,
  assertManualPaymentRecordContext,
  assertAIAllowed,
  assertMinorCanUseFeature,
  assertOrgServicePermission,
  assertReferralRedeemContext,
  buildAIQuotaState,
  calculateShopOrder,
  canReceiveNotification,
  canAssignPlanToUser,
  canSendNotification,
  calculateInvoiceTotals,
  calculateTrainerCommissions,
  chooseRenewalStart,
  createPlanVersionSnapshot,
  buildInvoiceNumber,
  consumeVisit,
  createManualPaymentAdjustment,
  createSubscriptionReminder,
  createSignedQrToken,
  decideClassEnrollment,
  decideAttendanceStatus,
  defaultAIQuotaForRole,
  encodeQrPayload,
  evaluateOperatingHours,
  evaluateSubscription,
  fulfillShopOrder,
  fulfillShopOrderForContext,
  markShopOrderPaid,
  requireManualOverrideReason,
  runAIGuardedRequest,
  shouldCreatePaymentFailureReminder,
  shouldFanOutWhatsApp,
  transitionSubscriptionReminder,
  transitionPaymentSession,
  validateAttendanceScan,
  validateClassSchedule,
  validateReferralRedemption,
  validateSignedQrToken,
} from "../services";

const now = new Date("2026-04-24T08:00:00.000Z");

const durationPlan: MembershipPlan = {
  id: "plan_duration",
  orgId: "org",
  branchId: "branch",
  name: "Monthly",
  type: "DURATION",
  pricePaise: 200000,
  durationDays: 30,
  active: true,
  publicVisible: true,
};

const hybridPlan: MembershipPlan = {
  id: "plan_hybrid",
  orgId: "org",
  branchId: "branch",
  name: "30 Visits",
  type: "HYBRID",
  pricePaise: 350000,
  visitLimit: 30,
  validityDays: 180,
  active: true,
  publicVisible: true,
};

const activeSubscription: MemberSubscription = {
  id: "sub",
  orgId: "org",
  branchId: "branch",
  memberUserId: "member",
  planId: "plan_duration",
  status: "ACTIVE",
  startsAt: new Date("2026-04-01T00:00:00.000Z"),
  endsAt: new Date("2026-05-01T00:00:00.000Z"),
};

describe("membership service", () => {
  it("accepts valid duration subscriptions without visit consumption", () => {
    const result = evaluateSubscription(activeSubscription, durationPlan, {
      now,
      orgStatus: "ACTIVE",
      hasProfilePhoto: true,
    });
    expect(result).toMatchObject({ valid: true, consumesVisit: false });
  });

  it("consumes a visit for visit packs only once per day by default", () => {
    const sub: MemberSubscription = {
      ...activeSubscription,
      planId: hybridPlan.id,
      remainingVisits: 3,
    };
    expect(consumeVisit(sub, hybridPlan, { alreadyCheckedInToday: false }).remainingVisits).toBe(2);
    expect(consumeVisit(sub, hybridPlan, { alreadyCheckedInToday: true }).remainingVisits).toBe(3);
  });

  it("expires hybrid plans when visits are empty or end date has passed", () => {
    const empty = evaluateSubscription(
      { ...activeSubscription, planId: hybridPlan.id, remainingVisits: 0 },
      hybridPlan,
      { now, orgStatus: "ACTIVE", hasProfilePhoto: true },
    );
    const old = evaluateSubscription(
      {
        ...activeSubscription,
        planId: hybridPlan.id,
        remainingVisits: 5,
        endsAt: new Date("2026-01-01"),
      },
      hybridPlan,
      { now, orgStatus: "ACTIVE", hasProfilePhoto: true },
    );
    expect(empty.reason).toBe("visit_pack_empty");
    expect(old.reason).toBe("subscription_expired");
  });

  it("can schedule early renewal after current plan", () => {
    expect(chooseRenewalStart(activeSubscription, now).toISOString()).toBe(
      "2026-05-01T00:00:01.000Z",
    );
    expect(chooseRenewalStart(activeSubscription, now, "IMMEDIATE")).toBe(now);
  });
});

describe("coupon and referral service", () => {
  const coupon: Coupon = {
    id: "coupon",
    orgId: "org",
    code: "WELCOME10",
    type: "PERCENTAGE",
    valuePercentBps: 1000,
    active: true,
    validFrom: new Date("2026-01-01"),
    validUntil: new Date("2026-12-31"),
    perUserLimit: 1,
  };

  it("calculates bounded coupon discounts", () => {
    expect(applyCoupon(coupon, { amountPaise: 100000, now }).discountPaise).toBe(10000);
    expect(
      applyCoupon(
        { ...coupon, type: "FIXED_AMOUNT", valuePaise: 200000 },
        { amountPaise: 50000, now },
      ).finalAmountPaise,
    ).toBe(0);
  });

  it("rejects self-referrals and duplicate referral redemption", () => {
    const referral: ReferralCode = {
      id: "ref",
      orgId: "org",
      referrerUserId: "member",
      code: "DEMOFIT",
      status: "active",
      redemptionCount: 0,
    };
    expect(() =>
      validateReferralRedemption(referral, { referredUserId: "member", referredEmail: "a@b.com" }),
    ).toThrow("Self-referral");
    expect(() =>
      validateReferralRedemption(referral, { referredUserId: "other", existingRedemption: true }),
    ).toThrow("already redeemed");
    expect(() =>
      validateReferralRedemption(referral, {
        referredUserId: "other",
        referredEmail: "member@example.com",
        referrerEmail: "MEMBER@example.com",
      }),
    ).toThrow("Same email");
    expect(() =>
      validateReferralRedemption(referral, {
        referredUserId: "other",
        ctx: { userId: "actor", roles: [], permissions: [] },
      }),
    ).toThrow("referred member");
  });
});

describe("payments", () => {
  it("enforces payment session state machine and amount matching", () => {
    const session = {
      id: "s",
      purpose: "MEMBERSHIP" as const,
      amountPaise: 1000,
      status: "CREATED" as const,
    };
    expect(
      transitionPaymentSession(session, "SUCCEEDED", { expectedAmountPaise: 1000 }).status,
    ).toBe("SUCCEEDED");
    expect(() =>
      transitionPaymentSession(session, "SUCCEEDED", { expectedAmountPaise: 900 }),
    ).toThrow("amount mismatch");
    expect(() => transitionPaymentSession({ ...session, status: "SUCCEEDED" }, "FAILED")).toThrow(
      "already completed",
    );
  });

  it("requires reason for manual payment adjustments", () => {
    expect(
      createManualPaymentAdjustment({
        originalAmountPaise: 1000,
        adjustmentAmountPaise: -1000,
        reason: "Cash entered twice",
        mode: "CASH",
      }).adjustmentType,
    ).toBe("REVERSAL");
    expect(() =>
      createManualPaymentAdjustment({
        originalAmountPaise: 1000,
        adjustmentAmountPaise: -1000,
        mode: "CASH",
      }),
    ).toThrow("reason required");
  });

  it("guards manual payment mutations with org permissions", () => {
    expect(
      assertManualPaymentRecordContext(
        {
          userId: "reception",
          orgId: "org",
          roles: ["RECEPTIONIST"],
          permissions: ["PAYMENTS_RECORD_OFFLINE"],
        },
        "org",
      ),
    ).toBe("reception");
    expect(() =>
      assertManualPaymentRecordContext(
        {
          userId: "member",
          orgId: "org",
          roles: ["MEMBER"],
          permissions: [],
        },
        "org",
      ),
    ).toThrow("Permission denied");
  });
});

describe("service RBAC", () => {
  it("enforces tenant and permission boundaries in core service guards", () => {
    expect(() =>
      assertOrgServicePermission(
        {
          userId: "owner",
          orgId: "other_org",
          roles: ["OWNER"],
          permissions: ["SHOP_FULFILL_ORDER"],
        },
        "org",
        "SHOP_FULFILL_ORDER",
      ),
    ).toThrow("No organization access");
    expect(
      assertReferralRedeemContext(
        { userId: "member", roles: [], permissions: [] },
        { orgId: "org", referredUserId: "member" },
      ),
    ).toBe("member");
    expect(() =>
      assertReferralRedeemContext(
        { userId: "trainer", roles: [], permissions: [] },
        { orgId: "org", referredUserId: "member" },
      ),
    ).toThrow("referred member");
  });
});

describe("subscription reminders", () => {
  it("creates and transitions payment failure reminders", () => {
    const reminder = createSubscriptionReminder({
      orgId: "org",
      userId: "member",
      subscriptionId: "sub",
      mandateId: "mandate",
      kind: "PAYMENT_FAILED",
      now,
    });

    expect(reminder).toMatchObject({
      status: "PENDING",
      kind: "PAYMENT_FAILED",
      dueAt: now,
    });
    expect(shouldCreatePaymentFailureReminder({ eventType: "invoice.payment_failed" })).toBe(true);
    const sent = transitionSubscriptionReminder(reminder, "SENT", now);
    expect(sent.sentAt).toBe(now);
    const resolved = transitionSubscriptionReminder(sent, "RESOLVED", now);
    expect(resolved.resolvedAt).toBe(now);
    expect(() => transitionSubscriptionReminder(resolved, "PENDING", now)).toThrow("reopened");
  });
});

describe("invoices", () => {
  it("calculates GST totals and stable invoice numbers", () => {
    const totals = calculateInvoiceTotals({
      defaultGstRateBps: 1800,
      items: [{ description: "Monthly membership", unitAmountPaise: 100000, quantity: 2 }],
    });

    expect(totals).toMatchObject({
      subtotalPaise: 200000,
      gstPaise: 36000,
      totalPaise: 236000,
      gstRateBps: 1800,
    });
    expect(
      buildInvoiceNumber({
        orgCode: "iron temple",
        issueDate: new Date("2026-05-06T00:00:00Z"),
        sequence: 12,
      }),
    ).toBe("ZK-IRONTEMP-202605-00012");
  });
});

describe("attendance", () => {
  it("signs and validates rolling QR payloads", () => {
    const payload = createSignedQrToken({
      orgId: "org",
      branchId: "branch",
      secret: "secret",
      now,
      ttlSeconds: 120,
    });
    const encoded = encodeQrPayload(payload);
    expect(validateSignedQrToken({ encoded, secret: "secret", now }).orgId).toBe("org");
    expect(() =>
      validateSignedQrToken({
        encoded,
        secret: "secret",
        now: new Date("2026-04-24T08:03:00.000Z"),
      }),
    ).toThrow("expired");
  });

  it("allows repeat same-day attendance without a duplicate exception", () => {
    const scan = validateAttendanceScan({
      subscription: activeSubscription,
      plan: durationPlan,
      orgStatus: "ACTIVE",
      hasProfilePhoto: true,
      alreadyCheckedInToday: true,
      now,
    });
    expect(scan.allowed).toBe(true);
    expect(scan.suspiciousFlags).not.toContain("duplicate_same_day");
    expect(
      decideAttendanceStatus({ mode: "EXCEPTION_APPROVAL", suspiciousFlags: scan.suspiciousFlags }),
    ).toBe("APPROVED");
    expect(decideAttendanceStatus({ mode: "AUTOMATIC", suspiciousFlags: [] })).toBe("APPROVED");
  });

  it("allows a same-day repeat scan after a visit pack was consumed once", () => {
    const scan = validateAttendanceScan({
      subscription: { ...activeSubscription, planId: hybridPlan.id, remainingVisits: 0 },
      plan: hybridPlan,
      orgStatus: "ACTIVE",
      hasProfilePhoto: true,
      alreadyCheckedInToday: true,
      now,
    });
    expect(scan).toMatchObject({ allowed: true, suspiciousFlags: [] });
  });

  it("requires a manual override reason", () => {
    expect(() => requireManualOverrideReason()).toThrow("reason required");
  });

  it("evaluates branch working hours in the gym timezone", () => {
    const hours = {
      mon: { open: "06:00", close: "22:00" },
      tue: { closed: true },
      wed: { open: "22:00", close: "02:00" },
    };

    expect(
      evaluateOperatingHours({
        operatingHours: hours,
        now: new Date("2026-05-04T03:00:00.000Z"),
      }).open,
    ).toBe(true);
    expect(
      evaluateOperatingHours({
        operatingHours: hours,
        now: new Date("2026-05-03T23:00:00.000Z"),
      }),
    ).toMatchObject({ open: false, reason: "branch_closed", dayKey: "mon" });
    expect(
      evaluateOperatingHours({
        operatingHours: hours,
        now: new Date("2026-05-05T07:00:00.000Z"),
      }),
    ).toMatchObject({ open: false, reason: "branch_closed", dayKey: "tue" });
    expect(
      evaluateOperatingHours({
        operatingHours: hours,
        now: new Date("2026-05-06T18:00:00.000Z"),
      }).open,
    ).toBe(true);
    expect(
      evaluateOperatingHours({
        operatingHours: hours,
        now: new Date("2026-05-06T20:00:00.000Z"),
      }).open,
    ).toBe(true);
  });
});

describe("permissions and notifications", () => {
  it("checks role permissions", () => {
    expect(hasPermission(["OWNER"], "SHOP_MANAGE_PRODUCTS")).toBe(true);
    expect(hasPermission(["TRAINER"], "PAYMENTS_REFUND")).toBe(false);
  });

  it("keeps platform access separate from gym roles", () => {
    expect(permissionsForRoles(["PLATFORM_ADMIN"])).toEqual([]);
    expect(hasPermission(["PLATFORM_ADMIN"], "PLATFORM_MANAGE_ORGS")).toBe(false);
    expect(canAccessPlatform(["PLATFORM_ADMIN"], false)).toBe(false);
    expect(canAccessPlatform([], true)).toBe(true);
  });

  it("checks notification permissions and recipient opt-out", () => {
    expect(
      canSendNotification({
        roles: ["RECEPTIONIST"],
        type: "OPERATIONAL",
        audience: "all_active_members",
      }),
    ).toBe(true);
    expect(
      canSendNotification({
        roles: ["RECEPTIONIST"],
        type: "PROMOTIONAL",
        audience: "all_active_members",
      }),
    ).toBe(false);
    expect(
      canReceiveNotification("PROMOTIONAL", {
        isMinor: false,
        guardianConsentGranted: true,
        marketingOptIn: false,
        aiConsent: true,
        hasProfilePhoto: true,
      }),
    ).toBe(false);
    expect(
      shouldFanOutWhatsApp({
        notificationType: "TRANSACTIONAL",
        topic: "PAYMENT",
        recipientOptedIn: true,
      }),
    ).toBe(true);
    expect(
      shouldFanOutWhatsApp({
        notificationType: "PROMOTIONAL",
        topic: "PAYMENT",
        recipientOptedIn: true,
      }),
    ).toBe(false);
  });
});

describe("minor and AI restrictions", () => {
  const adult: UserSafetyState = {
    isMinor: false,
    guardianConsentGranted: true,
    marketingOptIn: true,
    aiConsent: true,
    hasProfilePhoto: true,
  };

  it("allows minors without legacy approval", () => {
    expect(() =>
      assertMinorCanUseFeature(
        { ...adult, isMinor: true, guardianConsentGranted: false },
        "JOIN_GYM",
      ),
    ).not.toThrow();
    expect(() =>
      assertAIAllowed({
        role: "MEMBER",
        requestType: "CHAT",
        quota: defaultAIQuotaForRole("MEMBER"),
        user: { ...adult, isMinor: true, guardianConsentGranted: false },
      }),
    ).not.toThrow();
  });

  it("enforces AI quota, scope, safety, and image permissions", async () => {
    const provider = new MockAIProvider();
    const quota = defaultAIQuotaForRole("MEMBER");
    expect(() =>
      assertAIAllowed({ role: "MEMBER", requestType: "IMAGE", quota, user: adult }),
    ).toThrow("Members cannot generate images");
    await expect(
      runAIGuardedRequest({
        provider,
        prompt: "give me a workout plan for chest pain",
        role: "MEMBER",
        requestType: "CHAT",
        quota,
        user: adult,
      }),
    ).rejects.toThrow("qualified professional");
    await expect(
      runAIGuardedRequest({
        provider,
        prompt: "who won the cricket match",
        role: "MEMBER",
        requestType: "CHAT",
        quota,
        user: adult,
      }),
    ).rejects.toThrow("limited to gym");
    const result = await runAIGuardedRequest({
      provider,
      prompt: "make a safe gym workout plan",
      role: "MEMBER",
      requestType: "CHAT",
      quota,
      user: adult,
    });
    expect(result.tokenEstimate).toBeGreaterThan(0);
  });

  it("builds quota state from persisted usage", () => {
    expect(
      buildAIQuotaState("TRAINER", { usedTextDaily: 2, usedTextMonth: 10, usedImagesMonth: 1 }),
    ).toMatchObject({
      textDailyLimit: 25,
      textMonthLimit: 300,
      imageMonthLimit: 10,
      usedTextDaily: 2,
      usedTextMonth: 10,
      usedImagesMonth: 1,
    });
  });
});

describe("plans", () => {
  it("lets trainers assign only to their own clients unless elevated", () => {
    expect(
      canAssignPlanToUser({
        actorRoles: ["TRAINER"],
        actorPermissions: ["PLANS_PUBLISH_ASSIGNED"],
        audience: "selected_member",
        targetUserId: "member_1",
        assignedClientUserIds: ["member_1"],
      }),
    ).toBe(true);
    expect(
      canAssignPlanToUser({
        actorRoles: ["TRAINER"],
        actorPermissions: ["PLANS_PUBLISH_ASSIGNED"],
        audience: "selected_member",
        targetUserId: "member_2",
        assignedClientUserIds: ["member_1"],
      }),
    ).toBe(false);
    expect(
      canAssignPlanToUser({
        actorRoles: ["OWNER"],
        actorPermissions: ["PLANS_PUBLISH_ALL"],
        audience: "all_active_members",
      }),
    ).toBe(true);
  });

  it("creates a version snapshot with useful metadata", () => {
    expect(
      createPlanVersionSnapshot({
        title: "Starter Strength",
        description: "Week one",
        aiGenerated: true,
        visibility: "assigned",
        content: { days: 3 },
      }),
    ).toMatchObject({
      title: "Starter Strength",
      description: "Week one",
      aiGenerated: true,
      visibility: "assigned",
      content: { days: 3 },
    });
  });
});

describe("trainer commissions", () => {
  it("aggregates PT subscriptions and assigned plans by month", () => {
    expect(
      calculateTrainerCommissions({
        orgId: "org",
        period: new Date("2026-05-06T00:00:00Z"),
        commissionBps: 2000,
        planAssignmentCommissionPaise: 5000,
        ptSubscriptions: [
          {
            trainerUserId: "trainer_1",
            amountPaise: 100000,
            createdAt: new Date("2026-05-01T00:00:00Z"),
            status: "ACTIVE",
          },
          {
            trainerUserId: "trainer_1",
            amountPaise: 100000,
            createdAt: new Date("2026-04-30T00:00:00Z"),
            status: "ACTIVE",
          },
        ],
        planAssignments: [
          {
            assignedById: "trainer_1",
            createdAt: new Date("2026-05-05T00:00:00Z"),
            active: true,
          },
        ],
      }),
    ).toMatchObject([
      {
        trainerId: "trainer_1",
        ptSessionCount: 1,
        planAssignmentCount: 1,
        totalPaise: 25000,
      },
    ]);
  });
});

describe("classes", () => {
  it("validates class windows and capacity decisions", () => {
    expect(() =>
      validateClassSchedule({
        startTime: new Date("2026-05-06T08:00:00Z"),
        endTime: new Date("2026-05-06T09:00:00Z"),
        maxCapacity: 10,
      }),
    ).not.toThrow();
    expect(decideClassEnrollment({ maxCapacity: 2, confirmedEnrollmentCount: 1 })).toMatchObject({
      status: "confirmed",
      remainingCapacity: 0,
    });
    expect(
      decideClassEnrollment({
        maxCapacity: 2,
        confirmedEnrollmentCount: 2,
        allowWaitlist: true,
      }),
    ).toMatchObject({ status: "waitlisted" });
  });
});

describe("shop", () => {
  it("calculates stock and order state", () => {
    const calc = calculateShopOrder({
      products: [{ id: "water", stock: 2, pricePaise: 100, active: true }],
      items: [{ productId: "water", quantity: 2 }],
    });
    expect(calc.totalPaise).toBe(200);
    const ready = markShopOrderPaid(
      { id: "order", status: "PENDING_PAYMENT", totalPaise: 200 },
      "PICKUP",
    );
    expect(ready.status).toBe("READY_FOR_PICKUP");
    expect(fulfillShopOrder(ready).status).toBe("FULFILLED");
    expect(
      fulfillShopOrderForContext({
        ctx: {
          userId: "reception",
          orgId: "org",
          roles: ["RECEPTIONIST"],
          permissions: ["SHOP_FULFILL_ORDER"],
        },
        orgId: "org",
        order: ready,
      }).status,
    ).toBe("FULFILLED");
    expect(() =>
      calculateShopOrder({
        products: [{ id: "water", stock: 1, pricePaise: 100, active: true }],
        items: [{ productId: "water", quantity: 2 }],
      }),
    ).toThrow("out of stock");
  });
});
