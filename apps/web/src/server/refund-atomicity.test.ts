import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const routerSource = readFileSync(new URL("./api-router/core.ts", import.meta.url), "utf8");

describe("refund atomicity", () => {
  it("reserves refund requests inside a serializable transaction", () => {
    const helperStart = routerSource.indexOf("async function refundPaymentForActor");
    expect(helperStart).toBeGreaterThanOrEqual(0);
    const helperBody = routerSource.slice(helperStart, helperStart + 5200);

    expect(helperBody).toContain("await prisma.$transaction(");
    expect(helperBody).toContain("isolationLevel: Prisma.TransactionIsolationLevel.Serializable");
    expect(helperBody).toContain("const requestedRefund = await tx.paymentRefund.create");
  });

  it("recomputes active refund totals when finalizing payment status", () => {
    const helperStart = routerSource.indexOf("async function refundPaymentForActor");
    expect(helperStart).toBeGreaterThanOrEqual(0);
    const helperBody = routerSource.slice(helperStart, helperStart + 7600);

    expect(helperBody).toContain("const activeRefunds = await tx.paymentRefund.findMany");
    expect(helperBody).toContain("const nextRefundedAmountPaise = activeRefunds.reduce");
    expect(helperBody).toContain("const updated = await tx.payment.update");
  });
});
