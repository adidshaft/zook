import { describe, expect, it } from "vitest";
import { createZookMockServices } from "../mock-services";

describe("Zook mock service facades", () => {
  it("keeps membership activation behind mock payment confirmation", async () => {
    const services = createZookMockServices();
    const membership = await services.membershipService.getCurrentMembership("user-aarav", "org-iron-temple");
    expect(membership?.status).toBe("ACTIVE");

    if (membership) {
      membership.status = "PENDING_PAYMENT";
    }

    const checkout = await services.membershipService.createCheckoutSession("plan-hybrid-pro", "RHEA250");
    expect(checkout.status).toBe("CREATED");
    expect((await services.membershipService.getCurrentMembership("user-aarav", "org-iron-temple"))?.status).toBe("PENDING_PAYMENT");

    await services.paymentService.confirmMockPayment(checkout.id);
    expect((await services.membershipService.getCurrentMembership("user-aarav", "org-iron-temple"))?.status).toBe("ACTIVE");
  });

  it("creates pending attendance and writes audit when reception approves it", async () => {
    const services = createZookMockServices();
    const attempt = await services.attendanceService.scanQr("zook-demo-pending");

    expect(attempt.status).toBe("PENDING_APPROVAL");
    expect(attempt.entryCode).toBe("ZK-7319");

    const approved = await services.receptionistService.approveAttendance(attempt.id, "Desk approved after identity match");
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
});
