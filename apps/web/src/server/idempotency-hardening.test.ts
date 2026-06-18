import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const routerSource = readFileSync(new URL("./api-router/core.ts", import.meta.url), "utf8");
const idempotencyStart = routerSource.indexOf("function isIdempotentOperation");
const idempotencyEnd = routerSource.indexOf("export async function withIdempotency");
const idempotencyBody =
  idempotencyStart >= 0 && idempotencyEnd > idempotencyStart
    ? routerSource.slice(idempotencyStart, idempotencyEnd)
    : "";

describe("request idempotency hardening", () => {
  it("uses the generated Prisma delegate instead of an any-cast table access", () => {
    expect(routerSource).toContain("const idempotency = prisma.requestIdempotency");
    expect(routerSource).not.toContain("(prisma as any).requestIdempotency");
  });

  it("covers refund, cancel, and switch mutations", () => {
    expect(idempotencyBody).toContain('["orgs", /.+/, "payments", /.+/, "refund"]');
    expect(idempotencyBody).toContain('["platform", "payments", /.+/, "refund"]');
    expect(idempotencyBody).toContain('["orgs", /.+/, "saas-subscription", "cancel"]');
    expect(idempotencyBody).toContain('["orgs", /.+/, "subscriptions", /.+/, "switch"]');
    expect(idempotencyBody).toContain('["me", "subscriptions", /.+/, "switch"]');
    expect(idempotencyBody).toContain('["me", "memberships", /.+/, "switch"]');
    expect(idempotencyBody).toContain('["me", "memberships", /.+/, "autopay"]');
  });
});
