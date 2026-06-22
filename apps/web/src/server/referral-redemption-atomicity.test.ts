import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const routerSource = readFileSync(new URL("./api-router/core.ts", import.meta.url), "utf8");

describe("referral redemption atomicity", () => {
  it("keeps referral reservation and redemption creation in one transaction", () => {
    const helperStart = routerSource.indexOf("async function redeemReferralCodeForUser");
    expect(helperStart).toBeGreaterThanOrEqual(0);
    const helperBody = routerSource.slice(helperStart, helperStart + 2600);

    expect(helperBody).toContain("return await prisma.$transaction(async (tx) =>");
    expect(helperBody).toContain("const reserved = await tx.referralCode.updateMany");
    expect(helperBody).toContain("const redemption = await tx.referralRedemption.create");
  });
});
