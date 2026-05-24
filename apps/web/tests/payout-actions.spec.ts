import { expect, test } from "@playwright/test";
import { prisma } from "@zook/db";
import { expectApiOk, loginWithSessionCookie, seedAndGetOrg } from "./helpers";
import { requireDb } from "./helpers/db";

test.describe("trainer payouts", () => {
  test.beforeEach(() => {
    requireDb();
  });

  test("owner sets commission, PT subscription accrues payout, refund claws back, and payout is paid", async ({
    page,
  }) => {
    await loginWithSessionCookie(page, "owner@zook.local");
    const org = await seedAndGetOrg({ username: "aarogya-strength" });
    const trainer = await prisma.user.findUniqueOrThrow({ where: { email: "trainer@zook.local" } });
    const member = await prisma.user.findUniqueOrThrow({ where: { email: "member@zook.local" } });

    await expectApiOk(
      await page.request.put(`/api/orgs/${org.id}/trainers/${trainer.id}/payout-config`, {
        data: {
          baseMonthlyPaise: 10_000_00,
          ptCommissionPercent: 20,
          perSessionFeePaise: 500_00,
          payDay: 5,
        },
      }),
    );

    const subscription = await expectApiOk<{ subscription: { id: string } }>(
      await page.request.post(`/api/orgs/${org.id}/pt-subscriptions`, {
        data: {
          memberUserId: member.id,
          trainerUserId: trainer.id,
          amountPaise: 20_000_00,
          paymentMode: "CASH",
          totalSessions: 10,
        },
      }),
    );

    let payouts = await expectApiOk<{
      payouts: Array<{ id: string; totalPaise: number; lines: Array<{ kind: string; amountPaise: number }> }>;
    }>(await page.request.get(`/api/orgs/${org.id}/payouts?month=${new Date().toISOString().slice(0, 7)}`));
    const payout = payouts.data.payouts.find((item) => item.lines.some((line) => line.kind === "PT_COMMISSION"));
    expect(payout?.totalPaise).toBe(14_000_00);
    expect(payout?.lines).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: "PT_COMMISSION", amountPaise: 4_000_00 })]),
    );

    await expectApiOk(
      await page.request.post(`/api/orgs/${org.id}/pt-sessions`, {
        data: { subscriptionId: subscription.data.subscription.id },
      }),
    );
    payouts = await expectApiOk(
      await page.request.get(`/api/orgs/${org.id}/payouts?month=${new Date().toISOString().slice(0, 7)}`),
    );
    const withSession = payouts.data.payouts.find((item) => item.id === payout?.id);
    expect(withSession?.totalPaise).toBe(14_500_00);

    await expectApiOk(
      await page.request.post(
        `/api/orgs/${org.id}/pt-subscriptions/${subscription.data.subscription.id}/refund`,
      ),
    );
    payouts = await expectApiOk(
      await page.request.get(`/api/orgs/${org.id}/payouts?month=${new Date().toISOString().slice(0, 7)}`),
    );
    const clawedBack = payouts.data.payouts.find((item) => item.id === payout?.id);
    expect(clawedBack?.lines).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: "PT_CLAWBACK", amountPaise: -4_000_00 })]),
    );
    expect(clawedBack?.totalPaise).toBe(10_500_00);

    const paid = await expectApiOk<{ payout: { status: string; paidMethod: string } }>(
      await page.request.post(`/api/orgs/${org.id}/payouts/${payout?.id}/mark-paid`, {
        data: { method: "UPI", note: "Playwright payout close" },
      }),
    );
    expect(paid.data.payout).toMatchObject({ status: "paid", paidMethod: "UPI" });
  });
});
