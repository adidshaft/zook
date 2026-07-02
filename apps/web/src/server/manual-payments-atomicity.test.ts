import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./api-router/manual-payments.ts", import.meta.url), "utf8");

describe("manual payment atomicity", () => {
  it("activates an existing subscription and records its payment in one serializable transaction", () => {
    const start = source.indexOf("if (body.subscriptionId) {");
    const end = source.indexOf("} else {", start);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    const branch = source.slice(start, end);

    expect(branch).toContain("await prisma.$transaction(");
    expect(branch).toContain("isolationLevel: Prisma.TransactionIsolationLevel.Serializable");
    // Compare-and-swap guard so a concurrent desk record cannot double-activate,
    // and a failed activation rolls back the payment instead of orphaning it.
    expect(branch).toContain("status: { not: \"ACTIVE\" }");
    expect(branch).toContain("if (activated.count !== 1)");
  });

  it("creates the payment and new subscription in one serializable transaction", () => {
    const start = source.indexOf("} else {", source.indexOf("if (body.subscriptionId) {"));
    const end = source.indexOf("await ensureOrganizationMembership", start);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    const branch = source.slice(start, end);

    expect(branch).toContain("await prisma.$transaction(");
    expect(branch).toContain("isolationLevel: Prisma.TransactionIsolationLevel.Serializable");
    expect(branch).toContain("const createdPayment = await tx.payment.create");
    expect(branch).toContain("const createdSubscription = await tx.memberSubscription.create");
  });

  it("guards desk-paid shop order stock decrements inside the transaction", () => {
    const start = source.indexOf('if (body.purpose === "SHOP_ORDER")');
    const end = source.indexOf('if (body.purpose === "OTHER")', start);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    const branch = source.slice(start, end);

    expect(branch).toContain("await prisma.$transaction(");
    expect(branch).toContain("await tx.product.updateMany");
    expect(branch).toContain("stock: { gte: item.quantity }");
    expect(branch).toContain("if (stockUpdate.count !== 1)");
    expect(branch).toContain('throw conflictError("Product out of stock")');
  });
});
