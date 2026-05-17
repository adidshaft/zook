import { describe, expect, it } from "vitest";
import { createZookMockServices } from "../mock-services";
import {
  QA_DEMO_ACCOUNT_EMAIL,
  QA_DEMO_ACCOUNT_PHONE,
  QA_FRESH_ACCOUNT_EMAIL,
  QA_FRESH_ACCOUNT_PHONE,
  SEEDED_DEMO_ACCOUNT_EMAILS,
  SEEDED_DEMO_ACCOUNT_PHONES,
  isQaDemoIdentifier,
  isQaFreshIdentifier,
  isSeededDemoIdentifier,
} from "../test-identities";

describe("Zook mock service facades", () => {
  it("recognizes documented QA login identities", () => {
    expect(isQaFreshIdentifier(QA_FRESH_ACCOUNT_EMAIL)).toBe(true);
    expect(isQaFreshIdentifier("+91 90000 11111")).toBe(true);
    expect(isQaFreshIdentifier(QA_FRESH_ACCOUNT_PHONE)).toBe(true);
    expect(isQaFreshIdentifier(QA_DEMO_ACCOUNT_EMAIL)).toBe(false);

    expect(isQaDemoIdentifier(QA_DEMO_ACCOUNT_EMAIL)).toBe(true);
    expect(isQaDemoIdentifier("+91 98765 43210")).toBe(true);
    expect(isQaDemoIdentifier(QA_DEMO_ACCOUNT_PHONE)).toBe(true);
    expect(isQaDemoIdentifier(QA_FRESH_ACCOUNT_EMAIL)).toBe(false);

    expect(isSeededDemoIdentifier(QA_DEMO_ACCOUNT_EMAIL)).toBe(true);
    expect(isSeededDemoIdentifier(QA_DEMO_ACCOUNT_PHONE)).toBe(true);
    expect(isSeededDemoIdentifier("owner@zook.local")).toBe(true);
    expect(isSeededDemoIdentifier("prospect@zook.local")).toBe(true);
    expect(isSeededDemoIdentifier("+91 97654 32109")).toBe(true);
    expect(isSeededDemoIdentifier(QA_FRESH_ACCOUNT_EMAIL)).toBe(false);
    expect(SEEDED_DEMO_ACCOUNT_EMAILS).toContain("trainer@zook.local");
    expect(SEEDED_DEMO_ACCOUNT_EMAILS).toContain("prospect@zook.local");
    expect(SEEDED_DEMO_ACCOUNT_PHONES).toContain("+919123456780");
    expect(SEEDED_DEMO_ACCOUNT_PHONES).toContain("+919555000111");
  });

  it("keeps membership activation behind mock payment confirmation", async () => {
    const services = createZookMockServices();
    const membership = await services.membershipService.getCurrentMembership(
      "user-aarav",
      "org-aarogya-strength",
    );
    expect(membership?.status).toBe("ACTIVE");

    if (membership) {
      membership.status = "PENDING_PAYMENT";
    }

    const checkout = await services.membershipService.createCheckoutSession(
      "plan-hybrid-pro",
      "RHEA250",
    );
    expect(checkout.status).toBe("CREATED");
    expect(
      (await services.membershipService.getCurrentMembership("user-aarav", "org-aarogya-strength"))
        ?.status,
    ).toBe("PENDING_PAYMENT");

    await services.paymentService.confirmMockPayment(checkout.id);
    expect(
      (await services.membershipService.getCurrentMembership("user-aarav", "org-aarogya-strength"))
        ?.status,
    ).toBe("ACTIVE");
  });

  it("creates pending attendance and writes audit when reception approves it", async () => {
    const services = createZookMockServices();
    const attempt = await services.attendanceService.scanQr("zook-demo-pending");

    expect(attempt.status).toBe("PENDING_APPROVAL");
    expect(attempt.entryCode).toBe("ZK-7319");

    const approved = await services.receptionistService.approveAttendance(
      attempt.id,
      "Desk approved after identity match",
    );
    expect(approved.status).toBe("APPROVED");
    expect(services.state.auditLogs[0]?.action).toBe("attendance.approved");
  });

  it("keeps AI drafts hidden until trainer assignment", async () => {
    const services = createZookMockServices();
    const draft = await services.planService.generateAiPlanDraft({
      trainerUserId: "user-rhea",
      clientId: "user-aarav",
      goal: "Muscle gain",
    });

    expect(draft.visibleToMember).toBe(false);

    const assigned = await services.planService.assignDraft(draft.id, "user-aarav");
    expect(assigned.visibleToMember).toBe(true);
    expect(assigned.aiGenerated).toBe(true);
    expect(services.state.notifications[0]?.type).toBe("PLAN");
  });

  it("never exposes provider secrets in diagnostics", async () => {
    const services = createZookMockServices();
    const providers = await services.diagnosticsService.listProviders();

    expect(providers.length).toBeGreaterThan(0);
    expect(providers.every((provider) => provider.secretVisible === false)).toBe(true);
    expect(JSON.stringify(providers)).not.toContain("RAZORPAY_KEY_SECRET=");
  });

  it("resolves demo email and phone to the same complete account", async () => {
    const services = createZookMockServices();
    const byEmail = await services.authService.verifyOtp("member@zook.local", "000000");
    const byPhone = await services.authService.verifyOtp("+91 98765 43210", "000000");

    expect(byEmail.session.user.email).toBe("member@zook.local");
    expect(byPhone.session.user.email).toBe("member@zook.local");
    expect(byPhone.session.user.phone).toBe("+919876543210");
    expect(byPhone.session.activeOrganization?.roles).toContain("MEMBER");
  });
});
