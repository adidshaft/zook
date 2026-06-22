import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const schema = readFileSync("packages/db/prisma/schema.prisma", "utf8");
const rewardsRoute = readFileSync("apps/web/src/server/api-router/rewards.ts", "utf8");
const paymentRuntime = readFileSync("apps/web/src/server/payment-runtime.ts", "utf8");
const ledger = readFileSync("apps/web/src/server/domains/rewards/ledger.ts", "utf8");

describe("reward ledger coverage", () => {
  it("keeps cash rewards in dedicated wallet and ledger models", () => {
    expect(schema).toContain("model UserRewardWallet");
    expect(schema).toContain("model RewardLedgerEntry");
    expect(schema).toContain("model RewardWithdrawal");
    expect(schema).toContain("enum RewardLedgerStatus");
    expect(schema).toContain("SEMIANNUAL");
  });

  it("exposes the mobile rewards contract from the API router", () => {
    expect(rewardsRoute).toContain('pathMatches(path, ["me", "rewards", "wallet"])');
    expect(rewardsRoute).toContain('pathMatches(path, ["me", "rewards", "gym-referral"])');
    expect(rewardsRoute).toContain('pathMatches(path, ["me", "rewards", "withdrawals"])');
    expect(rewardsRoute).toContain('pathMatches(path, ["platform", "rewards", "withdrawals"');
  });

  it("qualifies both platform gym referrals and member referral cash rewards from payment settlement", () => {
    expect(paymentRuntime).toContain("qualifyPlatformGymReferral");
    expect(paymentRuntime).toContain('"MEMBER_TO_GYM_CASH"');
    expect(ledger).toContain('"GYM_TO_ZOOK_CASH"');
    expect(ledger).toContain("policy.qualifyingCycles");
  });

  it("settles the reward lifecycle with promotion, clawback reversal, and caps", () => {
    const cron = readFileSync("apps/web/src/server/api-router/cron.ts", "utf8");
    // Promotion + reversal chokepoint
    expect(ledger).toContain("export async function settleReadyRewards");
    expect(ledger).toContain('status: "PAYABLE"');
    expect(ledger).toContain('status: "REVERSED"');
    // Per-user monthly cap guardrail
    expect(ledger).toContain("policy.maxRewardsPerUserPerMonth");
    expect(ledger).toContain('"CAPPED"');
    // Scheduled settlement job
    expect(cron).toContain('pathMatches(path, ["cron", "rewards-settle"])');
    expect(cron).toContain("settleReadyRewards");
    // Member-to-gym cash honors the configured clawback window, not a hardcode
    expect(paymentRuntime).toContain("getPlatformReferralPolicy");
    expect(paymentRuntime).not.toContain("14 * 24 * 60 * 60 * 1000");
  });
});
