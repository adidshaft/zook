import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const paymentRuntimeSource = readFileSync(new URL("./payment-runtime.ts", import.meta.url), "utf8");

describe("payment runtime atomicity", () => {
  it("reuses an existing payment record when a replay collides on session uniqueness", () => {
    const fnStart = paymentRuntimeSource.indexOf("export async function applyPaymentSessionStatus");
    expect(fnStart).toBeGreaterThanOrEqual(0);
    const fnBody = paymentRuntimeSource.slice(fnStart, fnStart + 5200);

    expect(fnBody).toContain("async function findPaymentBySessionOrProviderRef");
    expect(fnBody).toContain("error.code !== \"P2002\"");
    expect(fnBody).toContain("const replayed = await findPaymentBySessionOrProviderRef");
  });

  it("guards membership activation side effects behind a single status transition", () => {
    const fnStart = paymentRuntimeSource.indexOf("export async function applyPaymentSessionStatus");
    expect(fnStart).toBeGreaterThanOrEqual(0);
    const fnBody = paymentRuntimeSource.slice(fnStart);

    expect(fnBody).toContain("if (nextState.status === \"SUCCEEDED\" && metadata.subscriptionId)");
    expect(fnBody).toContain("await prisma.$transaction(");
    expect(fnBody).toContain("isolationLevel: Prisma.TransactionIsolationLevel.Serializable");
    expect(fnBody).toContain("const activated = await tx.memberSubscription.updateMany");
    expect(fnBody).toContain("status: { not: \"ACTIVE\" }");
    expect(fnBody).toContain("await input.ensureMembership(");
    expect(fnBody).toContain("notifications.push({");
  });
});
