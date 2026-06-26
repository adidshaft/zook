import { expect, test } from "@playwright/test";
import { prisma } from "@zook/db";
import { expectApiOk, loginWithSessionCookie, seedAndGetOrg } from "./helpers";
import { requireDb } from "./helpers/db";

async function createTrainerForPayout(orgId: string, assignedById: string, suffix: string) {
  const trainer = await prisma.user.create({
    data: { email: `trainer-payout-${suffix}@zook.local`, name: `Payout Trainer ${suffix}` },
  });
  await prisma.organizationUser.create({
    data: { orgId, userId: trainer.id, status: "active" },
  });
  await prisma.organizationRoleAssignment.create({
    data: { orgId, userId: trainer.id, role: "TRAINER", assignedById },
  });
  return trainer;
}

test.describe("trainer payouts", () => {
  test.beforeEach(() => {
    requireDb();
  });

  test("owner sets commission, PT subscription accrues payout, refund claws back, and payout is paid", async ({
    page,
  }) => {
    await loginWithSessionCookie(page, "owner@zook.local");
    const org = await seedAndGetOrg({ username: "aarogya-strength" });
    const owner = await prisma.user.findUniqueOrThrow({ where: { email: "owner@zook.local" } });
    const trainer = await createTrainerForPayout(org.id, owner.id, `flow-${Date.now()}`);
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

  test("owner marks a trainer payout paid from the dashboard", async ({ page }) => {
    await loginWithSessionCookie(page, "owner@zook.local");
    const org = await seedAndGetOrg({ username: "aarogya-strength" });
    const owner = await prisma.user.findUniqueOrThrow({ where: { email: "owner@zook.local" } });
    const trainer = await createTrainerForPayout(org.id, owner.id, `paid-${Date.now()}`);
    const member = await prisma.user.findUniqueOrThrow({ where: { email: "member@zook.local" } });

    await expectApiOk(
      await page.request.put(`/api/orgs/${org.id}/trainers/${trainer.id}/payout-config`, {
        data: {
          baseMonthlyPaise: 7_500_00,
          ptCommissionPercent: 10,
          perSessionFeePaise: 0,
          payDay: 5,
        },
      }),
    );
    await expectApiOk<{ subscription: { id: string } }>(
      await page.request.post(`/api/orgs/${org.id}/pt-subscriptions`, {
        data: {
          memberUserId: member.id,
          trainerUserId: trainer.id,
          amountPaise: 10_000_00,
          paymentMode: "CASH",
          totalSessions: 6,
        },
      }),
    );
    const payouts = await expectApiOk<{
      payouts: Array<{ id: string; totalPaise: number; trainer?: { name?: string | null } | null }>;
    }>(await page.request.get(`/api/orgs/${org.id}/payouts?month=${new Date().toISOString().slice(0, 7)}`));
    const payout = payouts.data.payouts.find((item) => item.totalPaise === 8_500_00);
    expect(payout?.id).toBeTruthy();

    await page.goto("/dashboard/payouts");
    await expect(page.getByText("₹8,500")).toBeVisible({ timeout: 30_000 });
    const payoutCard = page.locator("div").filter({ hasText: "₹8,500" }).filter({ hasText: "Mark paid" }).first();
    await payoutCard.getByRole("button", { name: "Mark paid" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Mark paid" }).click();
    await expect(page.getByRole("main").getByText("Payout marked paid.")).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      prisma.trainerPayout.findUnique({ where: { id: payout!.id } }),
    ).resolves.toMatchObject({ status: "paid", paidMethod: "UPI" });
  });
});
