import { describe, expect, it } from "vitest";
import type { RequestContext } from "@zook/core";
import { canExportOrgReport, parseReportFilters, renderCsv } from "./reports-service";

function ctx(overrides: Partial<RequestContext> = {}): RequestContext {
  return {
    userId: "user_1",
    orgId: "org_1",
    roles: ["OWNER"],
    permissions: ["ORG_VIEW_REPORTS"],
    ...overrides
  };
}

describe("reports service helpers", () => {
  it("renders metadata and escapes csv rows", () => {
    const csv = renderCsv({
      report: "attendance",
      generatedBy: "owner_1",
      generatedAt: new Date("2026-04-24T00:00:00.000Z"),
      rows: [{ name: 'Aman "AJ"', note: "line 1,\nline 2" }]
    });

    expect(csv).toContain("# report=attendance,generatedBy=owner_1,generatedAt=2026-04-24T00:00:00.000Z");
    expect(csv).toContain('"Aman ""AJ"""');
    expect(csv).toContain('"line 1,\nline 2"');
  });

  it("prevents trainers from exporting all gym revenue", () => {
    expect(
      canExportOrgReport({
        report: "revenue",
        ctx: ctx({
          userId: "trainer_1",
          roles: ["TRAINER"],
          permissions: ["PLANS_CREATE"]
        }),
        actorUserId: "trainer_1"
      })
    ).toBe(false);
  });

  it("allows trainer client exports only for trainer scope", () => {
    expect(
      canExportOrgReport({
        report: "trainer-client",
        ctx: ctx({
          userId: "trainer_1",
          roles: ["TRAINER"],
          permissions: ["PLANS_CREATE"]
        }),
        actorUserId: "trainer_1",
        trainerId: "trainer_1"
      })
    ).toBe(true);
  });

  it("parses report filters from query params", () => {
    const filters = parseReportFilters(
      new URLSearchParams({
        from: "2026-04-01",
        to: "2026-04-30",
        planId: "plan_1",
        paymentMode: "CASH"
      })
    );

    expect(filters.planId).toBe("plan_1");
    expect(filters.paymentMode).toBe("CASH");
    expect(filters.from?.getHours()).toBe(0);
    expect(filters.from?.getMinutes()).toBe(0);
    expect(filters.to?.getHours()).toBe(23);
    expect(filters.to?.getMinutes()).toBe(59);
  });
});
