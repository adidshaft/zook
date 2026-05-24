import { describe, expect, it } from "vitest";
import {
  calculatePayoutTotal,
  calculatePtClawback,
  calculatePtCommission,
  payoutPeriod,
} from ".";

describe("trainer payouts", () => {
  it("calculates PT subscription commission", () => {
    expect(calculatePtCommission(20_000_00, 20)).toBe(4_000_00);
  });

  it("calculates refund claw-backs as negative commission rows", () => {
    expect(calculatePtClawback(20_000_00, 20)).toBe(-4_000_00);
  });

  it("drafts monthly payout totals from base and accrued lines", () => {
    expect(
      calculatePayoutTotal(
        [{ amountPaise: 4_000_00 }, { amountPaise: 500_00 }, { amountPaise: -1_000_00 }],
        10_000_00,
      ),
    ).toBe(13_500_00);
  });

  it("normalizes cron draft month to the first day", () => {
    expect(payoutPeriod("2026-05").toISOString()).toBe("2026-05-01T00:00:00.000Z");
  });
});
