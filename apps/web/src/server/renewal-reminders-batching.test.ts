import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const routerSource = readFileSync(new URL("./api-router/cron.ts", import.meta.url), "utf8");
const cronStart = routerSource.indexOf('pathMatches(path, ["cron", "renewal-reminders"])');
const cronEnd = routerSource.indexOf('pathMatches(path, ["cron", "refund-reconcile"])');
const cronBody =
  cronStart >= 0 && cronEnd > cronStart ? routerSource.slice(cronStart, cronEnd) : "";

describe("renewal reminder cron batching", () => {
  it("preloads existing member reminders by subscription id", () => {
    expect(cronStart).toBeGreaterThanOrEqual(0);
    expect(cronEnd).toBeGreaterThan(cronStart);
    expect(cronBody).toContain("const existingReminders = expiringSubscriptions.length");
    expect(cronBody).toContain("subscriptionId: { in: expiringSubscriptions.map((sub) => sub.id) }");
    expect(cronBody).toContain("const remindedSubscriptionIds = new Set(");
    expect(cronBody).not.toContain("await prisma.subscriptionReminder.findFirst({");
  });

  it("preloads trial reminders and owners by org id", () => {
    expect(cronBody).toContain("const existingTrialReminders = trialSubscriptions.length");
    expect(cronBody).toContain("orgId: { in: trialSubscriptions.map((sub) => sub.orgId) }");
    expect(cronBody).toContain("const owners = trialSubscriptions.length");
    expect(cronBody).toContain("const ownerByOrgId = new Map<string");
    expect(cronBody).not.toContain("await prisma.organizationRoleAssignment.findFirst({");
  });
});
