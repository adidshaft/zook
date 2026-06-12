import type { AuthSessionSummary, OrgRole } from "./types";
import { isOrgRole } from "./permissions";
import { normalizeLoginIdentifier } from "./validators";
import {
  type DemoAttendanceAttempt,
  type DemoAttendanceOutcome,
  type DemoCheckoutSession,
  type DemoNotification,
  type DemoPaymentRecord,
  type DemoPlanDraft,
  type DemoReportJob,
  type DemoShopOrder,
  type DemoTrainingPlan,
  type ZookDemoFixtures,
  zookDemoFixtures,
} from "./demo-fixtures";

function cloneFixtures(seed: ZookDemoFixtures): ZookDemoFixtures {
  return structuredClone(seed);
}

function nowIso() {
  return new Date().toISOString();
}

function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function findRequired<T>(items: T[], predicate: (item: T) => boolean, label: string) {
  const item = items.find(predicate);
  if (!item) {
    throw new Error(`${label} not found in Zook mock services.`);
  }
  return item;
}

function buildSession(
  state: ZookDemoFixtures,
  userEmail: string,
  activeOrgId: string,
): AuthSessionSummary {
  const user = findRequired(state.users, (candidate) => candidate.email === userEmail, "User");
  const organizations = state.organizations
    .map((organization) => {
      const roles = state.roleAssignments
        .filter(
          (assignment) => assignment.userId === user.id && assignment.orgId === organization.id,
        )
        .map((assignment) => assignment.role)
        .filter(isOrgRole);
      if (!roles.length) {
        return null;
      }
      return {
        orgId: organization.id,
        name: organization.name,
        username: organization.username,
        status: organization.status === "SUSPENDED" ? ("SUSPENDED" as const) : ("ACTIVE" as const),
        city: organization.city,
        state: organization.state,
        roles,
        permissions: [],
        joinedAt: new Date("2026-04-01T00:00:00.000Z"),
      };
    })
    .filter((organization): organization is NonNullable<typeof organization> =>
      Boolean(organization),
    );
  const activeOrganization =
    organizations.find((organization) => organization.orgId === activeOrgId) ?? organizations[0];

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      isMinor: user.isMinor,
      guardianPending: user.guardianPending,
      isPlatformAdmin: user.email === "platform@zook.local",
      marketingOptIn: user.marketingOptIn,
      aiConsent: user.aiConsent,
      weeklyWorkoutGoal: 5,
    },
    organizations,
    ...(activeOrganization ? { activeOrgId: activeOrganization.orgId, activeOrganization } : {}),
  };
}

function statusForOutcome(outcome: DemoAttendanceOutcome) {
  if (outcome === "pending") return "PENDING_APPROVAL" as const;
  if (outcome === "rejected") return "REJECTED" as const;
  if (outcome === "flagged") return "FLAGGED" as const;
  return "APPROVED" as const;
}

function entryCodeForOutcome(outcome: DemoAttendanceOutcome) {
  if (outcome === "pending") return "ZK-7319";
  if (outcome === "rejected") return "ZK-9044";
  if (outcome === "flagged") return "ZK-1180";
  return "ZK-4821";
}

export function createZookMockServices(seed: ZookDemoFixtures = zookDemoFixtures) {
  const state = cloneFixtures(seed);
  let activeOrgId = state.organizations[0]?.id ?? "org-demo-unset";
  let activeRole: OrgRole = "MEMBER";

  function writeAudit(input: {
    orgId: string;
    action: string;
    entityType: string;
    entityId: string;
    actorName: string;
    reason: string;
  }) {
    state.auditLogs.unshift({
      id: newId("audit"),
      orgId: input.orgId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      actorName: input.actorName,
      reason: input.reason,
      createdAt: nowIso(),
      requestId: newId("req"),
    });
  }

  function createCheckoutSession(input: {
    purpose: DemoCheckoutSession["purpose"];
    targetId: string;
    amountPaise: number;
  }) {
    const id = newId("checkout");
    const session: DemoCheckoutSession = {
      id,
      purpose: input.purpose,
      targetId: input.targetId,
      amountPaise: input.amountPaise,
      status: "CREATED",
      hostedUrl: `/checkout/mock/${id}`,
      activatesOnConfirmation: true,
    };
    state.checkoutSessions.unshift(session);
    return session;
  }

  return {
    state,
    authService: {
      async requestOtp(identifier: string) {
        return {
          challengeId: newId("otp"),
          identifier,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
          devOtp: "000000",
        };
      },
      async verifyOtp(identifier: string, code: string) {
        if (code !== "000000") {
          throw new Error("Invalid mock OTP. Use 000000 for local demo.");
        }
        const normalized = normalizeLoginIdentifier(identifier);
        const user =
          normalized.kind === "email"
            ? findRequired(
                state.users,
                (candidate) => candidate.email.toLowerCase() === normalized.value.toLowerCase(),
                "User",
              )
            : findRequired(
                state.users,
                (candidate) => candidate.phone === normalized.value,
                "User",
              );
        return {
          token: `mock-session-${identifier}`,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          session: buildSession(state, user.email, activeOrgId),
        };
      },
    },
    orgService: {
      async getUserOrganizations(userId = "user-aarav") {
        const orgIds = new Set(
          state.roleAssignments
            .filter((assignment) => assignment.userId === userId)
            .map((assignment) => assignment.orgId),
        );
        return state.organizations.filter((organization) => orgIds.has(organization.id));
      },
      async setActiveOrganization(orgId: string) {
        findRequired(
          state.organizations,
          (organization) => organization.id === orgId,
          "Organization",
        );
        activeOrgId = orgId;
        return { activeOrgId };
      },
    },
    roleService: {
      async getAvailableRoles(orgId = activeOrgId, userId = "user-aarav") {
        return state.roleAssignments
          .filter((assignment) => assignment.orgId === orgId && assignment.userId === userId)
          .map((assignment) => assignment.role)
          .filter(isOrgRole);
      },
      async setActiveRole(role: OrgRole) {
        activeRole = role;
        return { activeRole };
      },
    },
    membershipService: {
      async getCurrentMembership(memberId = "user-aarav", orgId = activeOrgId) {
        return (
          state.memberships.find(
            (membership) => membership.memberUserId === memberId && membership.orgId === orgId,
          ) ?? null
        );
      },
      async createCheckoutSession(planId: string, referralCode?: string) {
        const plan = findRequired(
          state.membershipPlans,
          (candidate) => candidate.id === planId,
          "Membership plan",
        );
        const referral = referralCode
          ? state.referralCodes.find(
              (candidate) => candidate.code.toLowerCase() === referralCode.toLowerCase(),
            )
          : undefined;
        const amountPaise = Math.max(0, plan.pricePaise - (referral?.discountPaise ?? 0));
        return createCheckoutSession({ purpose: "MEMBERSHIP", targetId: plan.id, amountPaise });
      },
    },
    paymentService: {
      async confirmMockPayment(sessionId: string) {
        const session = findRequired(
          state.checkoutSessions,
          (candidate) => candidate.id === sessionId,
          "Checkout session",
        );
        session.status = "SUCCEEDED";
        if (session.purpose === "MEMBERSHIP") {
          const existing = state.memberships.find(
            (membership) => membership.memberUserId === "user-aarav",
          );
          if (existing) {
            existing.status = "ACTIVE";
            existing.daysLeft = 30;
            existing.remainingVisits = 12;
          }
        }
        writeAudit({
          orgId: activeOrgId,
          action: "payment.mock.confirmed",
          entityType: "CheckoutSession",
          entityId: session.id,
          actorName: "Mock payment service",
          reason: "Payment confirmed in local sample.",
        });
        return session;
      },
    },
    attendanceService: {
      async getCurrentGymQr(branchId = "branch-default") {
        const session =
          state.attendanceSessions.find((candidate) => candidate.branchId === branchId) ??
          state.attendanceSessions[0];
        if (!session) {
          throw new Error("No active QR session in mock fixtures.");
        }
        return session;
      },
      async scanQr(qrPayload: string) {
        const payload = qrPayload.toLowerCase();
        const outcome: DemoAttendanceOutcome = payload.includes("pending")
          ? "pending"
          : payload.includes("flagged")
            ? "flagged"
            : payload.includes("rejected")
              ? "rejected"
              : "approved";
        const branch = findRequired(
          state.branches,
          (candidate) => candidate.id === "branch-default",
          "Branch",
        );
        const plan = findRequired(
          state.membershipPlans,
          (candidate) => candidate.id === "plan-hybrid-pro",
          "Membership plan",
        );
        const attempt: DemoAttendanceAttempt = {
          id: newId("attendance"),
          orgId: activeOrgId,
          branchId: branch.id,
          memberUserId: "user-aarav",
          memberName: "Demo Member",
          status: statusForOutcome(outcome),
          entryCode: entryCodeForOutcome(outcome),
          checkedInAt: nowIso(),
          branchName: branch.name,
          planName: plan.name,
          reason:
            outcome === "pending"
              ? "Attendance approval mode is enabled."
              : outcome === "flagged"
                ? "Replay protection flagged this scan for staff review."
                : outcome === "rejected"
                  ? "Membership gate rejected this scan."
                  : "Membership active and branch verified.",
          auditTrail: [
            "QR token valid",
            "Replay protection checked",
            "Branch verified",
            "Membership gate evaluated",
          ],
        };
        state.attendanceAttempts.unshift(attempt);
        return attempt;
      },
      async getAttendanceResult(attemptId: string) {
        return findRequired(
          state.attendanceAttempts,
          (candidate) => candidate.id === attemptId,
          "Attendance attempt",
        );
      },
      async verifyEntryCode(code: string) {
        const normalized = code.trim().toUpperCase();
        return (
          state.attendanceAttempts.find((attempt) => attempt.entryCode === normalized) ??
          state.shopOrders.find((order) => order.pickupCode === normalized) ??
          null
        );
      },
    },
    receptionistService: {
      async approveAttendance(attemptId: string, reason: string) {
        const attempt = findRequired(
          state.attendanceAttempts,
          (candidate) => candidate.id === attemptId,
          "Attendance attempt",
        );
        attempt.status = "APPROVED";
        attempt.reason = reason;
        attempt.auditTrail.push(`Approved by reception: ${reason}`);
        writeAudit({
          orgId: attempt.orgId,
          action: "attendance.approved",
          entityType: "AttendanceAttempt",
          entityId: attempt.id,
          actorName: "Farah Khan",
          reason,
        });
        return attempt;
      },
      async rejectAttendance(attemptId: string, reason: string) {
        const attempt = findRequired(
          state.attendanceAttempts,
          (candidate) => candidate.id === attemptId,
          "Attendance attempt",
        );
        attempt.status = "REJECTED";
        attempt.reason = reason;
        attempt.auditTrail.push(`Rejected by reception: ${reason}`);
        writeAudit({
          orgId: attempt.orgId,
          action: "attendance.rejected",
          entityType: "AttendanceAttempt",
          entityId: attempt.id,
          actorName: "Farah Khan",
          reason,
        });
        return attempt;
      },
      async recordOfflinePayment(payload: {
        memberUserId: string;
        amountPaise: number;
        mode: DemoPaymentRecord["mode"];
        reason: string;
        referenceId?: string;
        note?: string;
      }) {
        if (!payload.reason.trim()) {
          throw new Error("Manual payment records require a reason.");
        }
        const payment: DemoPaymentRecord = {
          id: newId("payment"),
          orgId: activeOrgId,
          memberUserId: payload.memberUserId,
          purpose: "MEMBERSHIP",
          summary: "Hybrid Pro renewal",
          amountPaise: payload.amountPaise,
          mode: payload.mode,
          status: "SUCCEEDED",
          createdAt: nowIso(),
          reason: payload.reason,
        };
        state.payments.unshift(payment);
        writeAudit({
          orgId: activeOrgId,
          action: "payment.offline.recorded",
          entityType: "PaymentRecord",
          entityId: payment.id,
          actorName: "Farah Khan",
          reason: payload.reason,
        });
        return payment;
      },
    },
    shopService: {
      async listProducts(orgId = activeOrgId) {
        return state.shopProducts.filter((product) => product.orgId === orgId);
      },
      async createOrder(cart: Array<{ productId: string; quantity: number }>) {
        const items = cart.map((item) => {
          const product = findRequired(
            state.shopProducts,
            (candidate) => candidate.id === item.productId,
            "Product",
          );
          return { productId: product.id, quantity: item.quantity, unitPaise: product.pricePaise };
        });
        const totalPaise = items.reduce((sum, item) => sum + item.quantity * item.unitPaise, 0);
        const order: DemoShopOrder = {
          id: newId("order"),
          orgId: activeOrgId,
          memberUserId: "user-aarav",
          status: "PENDING_PAYMENT",
          totalPaise,
          pickupCode: "PU-9142",
          items,
          createdAt: nowIso(),
        };
        state.shopOrders.unshift(order);
        return order;
      },
      async createCheckoutSession(orderId: string) {
        const order = findRequired(
          state.shopOrders,
          (candidate) => candidate.id === orderId,
          "Shop order",
        );
        return createCheckoutSession({
          purpose: "SHOP_ORDER",
          targetId: order.id,
          amountPaise: order.totalPaise,
        });
      },
      async confirmMockOrderPayment(sessionId: string) {
        const session = findRequired(
          state.checkoutSessions,
          (candidate) => candidate.id === sessionId,
          "Checkout session",
        );
        const order = findRequired(
          state.shopOrders,
          (candidate) => candidate.id === session.targetId,
          "Shop order",
        );
        session.status = "SUCCEEDED";
        order.status = "READY_FOR_PICKUP";
        return order;
      },
      async verifyPickupCode(code: string) {
        const normalized = code.trim().toUpperCase();
        return state.shopOrders.find((order) => order.pickupCode === normalized) ?? null;
      },
      async fulfillOrder(orderId: string) {
        const order = findRequired(
          state.shopOrders,
          (candidate) => candidate.id === orderId,
          "Shop order",
        );
        order.status = "FULFILLED";
        writeAudit({
          orgId: order.orgId,
          action: "shop.order.fulfilled",
          entityType: "ShopOrder",
          entityId: order.id,
          actorName: "Farah Khan",
          reason: "Pickup code verified at desk.",
        });
        return order;
      },
    },
    trainerService: {
      async getAssignedClients(trainerId = "user-rhea") {
        const assignments = state.trainerClientAssignments.filter(
          (assignment) => assignment.trainerUserId === trainerId && assignment.active,
        );
        return assignments.map((assignment) => {
          const user = findRequired(
            state.users,
            (candidate) => candidate.id === assignment.memberUserId,
            "Assigned client",
          );
          const profile = state.memberProfiles.find((candidate) => candidate.userId === user.id);
          return { assignment, user, profile };
        });
      },
      async getClientDetail(clientId: string) {
        const assignment = findRequired(
          state.trainerClientAssignments,
          (candidate) => candidate.memberUserId === clientId && candidate.active,
          "Trainer client assignment",
        );
        const user = findRequired(
          state.users,
          (candidate) => candidate.id === assignment.memberUserId,
          "Client user",
        );
        const profile = findRequired(
          state.memberProfiles,
          (candidate) => candidate.userId === user.id,
          "Client profile",
        );
        const ptPack = state.ptPacks.find((candidate) => candidate.memberUserId === user.id);
        const plans = state.trainingPlans.filter((plan) => plan.memberUserId === user.id);
        return { assignment, user, profile, ptPack, plans };
      },
    },
    planService: {
      async createPlan(
        payload: Pick<DemoTrainingPlan, "title" | "type" | "memberUserId" | "trainerUserId">,
      ) {
        const plan: DemoTrainingPlan = {
          id: newId("plan"),
          orgId: activeOrgId,
          trainerUserId: payload.trainerUserId,
          memberUserId: payload.memberUserId,
          title: payload.title,
          type: payload.type,
          status: "DRAFT",
          aiGenerated: false,
          reviewed: false,
          visibleToMember: false,
          durationLabel: "45-60 min",
          difficulty: "Medium",
          exercises: [],
        };
        state.trainingPlans.unshift(plan);
        return plan;
      },
      async generateAiPlanDraft(payload: {
        trainerUserId: string;
        clientId: string;
        goal: string;
      }) {
        const template = findRequired(
          state.planDrafts,
          (candidate) => candidate.id === "draft-strength-block",
          "Plan draft template",
        );
        const draft: DemoPlanDraft = {
          ...template,
          id: newId("draft"),
          trainerUserId: payload.trainerUserId,
          memberUserId: payload.clientId,
          goal: payload.goal,
          visibleToMember: false,
        };
        state.planDrafts.unshift(draft);
        state.aiUsageRecords.unshift({
          id: newId("ai"),
          orgId: activeOrgId,
          actorRole: "TRAINER",
          requestType: "STRUCTURED_PLAN",
          promptSummary: `Draft plan for ${payload.goal}`,
          quotaConsumed: 1,
          safetyStatus: "CLEAR",
          createdAt: nowIso(),
        });
        return draft;
      },
      async assignDraft(draftId: string, clientId: string) {
        const draft = findRequired(
          state.planDrafts,
          (candidate) => candidate.id === draftId,
          "Plan draft",
        );
        draft.visibleToMember = true;
        draft.safety.trainerApproval = "Complete";
        const plan: DemoTrainingPlan = {
          id: newId("plan"),
          orgId: draft.orgId,
          trainerUserId: draft.trainerUserId,
          memberUserId: clientId,
          title: draft.title,
          type: "WORKOUT",
          status: "PUBLISHED",
          aiGenerated: true,
          reviewed: true,
          visibleToMember: true,
          durationLabel: "4 weeks",
          difficulty: draft.difficulty,
          exercises: state.trainingPlans[0]?.exercises ?? [],
        };
        state.trainingPlans.unshift(plan);
        state.notifications.unshift({
          id: newId("notif"),
          orgId: activeOrgId,
          userId: clientId,
          type: "PLAN",
          title: "New plan assigned",
          message: `${draft.title} is ready after trainer review.`,
          targetRoute: "/plan",
          readAt: null,
          createdAt: nowIso(),
        });
        writeAudit({
          orgId: activeOrgId,
          action: "plan.ai_draft.assigned",
          entityType: "PlanDraft",
          entityId: draft.id,
          actorName: "Demo Coach",
          reason: "Trainer reviewed and assigned AI draft.",
        });
        return plan;
      },
    },
    notificationService: {
      async listInbox(userId = "user-aarav") {
        return state.notifications.filter((notification) => notification.userId === userId);
      },
      async sendNotification(payload: {
        userId: string;
        title: string;
        message: string;
        type: DemoNotification["type"];
        targetRoute: string;
      }) {
        const notification = {
          id: newId("notif"),
          orgId: activeOrgId,
          userId: payload.userId,
          type: payload.type,
          title: payload.title,
          message: payload.message,
          targetRoute: payload.targetRoute,
          readAt: null,
          createdAt: nowIso(),
        };
        state.notifications.unshift(notification);
        return notification;
      },
    },
    guardianService: {
      async requestConsent(minorId: string, guardianEmail: string) {
        for (const challenge of state.guardianConsentChallenges.filter(
          (candidate) => candidate.minorId === minorId,
        )) {
          if (challenge.status === "PENDING") {
            challenge.status = "EXPIRED";
          }
        }
        const challenge = {
          id: newId("guardian"),
          minorId,
          guardianEmail,
          status: "PENDING" as const,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        };
        state.guardianConsentChallenges.unshift(challenge);
        return challenge;
      },
      async verifyConsent(challengeId: string, otp: string) {
        if (otp !== "000000") {
          throw new Error("Invalid mock consent OTP.");
        }
        const challenge = findRequired(
          state.guardianConsentChallenges,
          (candidate) => candidate.id === challengeId,
          "Legacy approval challenge",
        );
        challenge.status = "GRANTED";
        const minor = findRequired(
          state.users,
          (candidate) => candidate.id === challenge.minorId,
          "Minor user",
        );
        minor.guardianPending = false;
        minor.aiConsent = true;
        writeAudit({
          orgId: activeOrgId,
          action: "guardian.consent.granted",
          entityType: "GuardianConsentChallenge",
          entityId: challenge.id,
          actorName: "Guardian",
          reason: "Guardian verified consent challenge.",
        });
        return challenge;
      },
    },
    diagnosticsService: {
      async listProviders() {
        return state.providerDiagnostics.map((diagnostic) => ({
          ...diagnostic,
          secretVisible: false,
        }));
      },
    },
    reportService: {
      async createExportJob(reportType: string) {
        const job: DemoReportJob = {
          id: newId("report"),
          orgId: activeOrgId,
          type: reportType,
          status: "PROCESSING",
          createdAt: nowIso(),
        };
        state.reportJobs.unshift(job);
        writeAudit({
          orgId: activeOrgId,
          action: "report.export.requested",
          entityType: "ReportJob",
          entityId: job.id,
          actorName: "Owner",
          reason: `${reportType} export requested.`,
        });
        return job;
      },
    },
    privacyService: {
      async requestExport(userId = "user-aarav") {
        const job = {
          id: newId("privacy-export"),
          orgId: activeOrgId,
          type: "privacy-data-export",
          status: "PROCESSING" as const,
          createdAt: nowIso(),
        };
        state.reportJobs.unshift(job);
        writeAudit({
          orgId: activeOrgId,
          action: "privacy.export.requested",
          entityType: "User",
          entityId: userId,
          actorName: "Demo Member",
          reason: "Member requested data export.",
        });
        return job;
      },
      async requestDeletion(userId = "user-aarav") {
        const job = {
          id: newId("privacy-deletion"),
          orgId: activeOrgId,
          type: "privacy-account-deletion",
          status: "PROCESSING" as const,
          createdAt: nowIso(),
        };
        state.reportJobs.unshift(job);
        writeAudit({
          orgId: activeOrgId,
          action: "privacy.deletion.requested",
          entityType: "User",
          entityId: userId,
          actorName: "Demo Member",
          reason: "Member requested account deletion job.",
        });
        return job;
      },
    },
  };
}

export const zookMockServices = createZookMockServices();
