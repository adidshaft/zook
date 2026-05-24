import { expect, test } from "@playwright/test";
import { prisma } from "@zook/db";
import { expectApiOk, loginWithSessionCookie } from "./helpers";
import { requireDb } from "./helpers/db";

test.describe("validation tooling", () => {
  test.beforeEach(() => {
    requireDb();
  });

  const cronHeaders = process.env.CRON_SECRET
    ? { authorization: `Bearer ${process.env.CRON_SECRET}` }
    : undefined;

  test("platform admin can fire the staging diagnostics handled exception", async ({ page }) => {
    await loginWithSessionCookie(page, "platform@zook.local");
    const response = await expectApiOk<{ captured: boolean; mode: string }>(
      await page.request.post("/api/diagnostics/throw", {
        data: { mode: "handled" },
      }),
    );
    expect(response.data).toEqual({ captured: true, mode: "handled" });
  });

  test("account deletion cron purges queued jobs and skips active runs", async ({ page }) => {
    const user = await prisma.user.create({
      data: { email: `delete-cron-${Date.now()}@zook.local`, name: "Delete Cron" },
    });
    const request = await prisma.accountDeletionRequest.create({
      data: {
        userId: user.id,
        status: "approved",
        scheduledFor: new Date(Date.now() - 60_000),
      },
    });
    const job = await prisma.accountDeletionJob.create({
      data: {
        requestId: request.id,
        userId: user.id,
        status: "QUEUED",
        scheduledFor: new Date(Date.now() - 60_000),
      },
    });

    const firstRun = await expectApiOk<{ processed: boolean; succeeded: number }>(
      await page.request.post("/api/cron/account-deletion-purge", { headers: cronHeaders }),
    );
    expect(firstRun.data).toMatchObject({ processed: true, succeeded: 1 });
    await expect(
      prisma.accountDeletionJob.findUniqueOrThrow({
        where: { id: job.id },
        select: { status: true },
      }),
    ).resolves.toEqual({ status: "SUCCEEDED" });

    await prisma.accountDeletionJob.create({
      data: {
        requestId: request.id,
        userId: user.id,
        status: "RUNNING",
        scheduledFor: new Date(Date.now() - 60_000),
        startedAt: new Date(),
      },
    });
    const skipped = await expectApiOk<{ processed: boolean; skipped: boolean; reason: string }>(
      await page.request.post("/api/cron/account-deletion-purge", { headers: cronHeaders }),
    );
    expect(skipped.data).toMatchObject({
      processed: false,
      skipped: true,
      reason: "previous_run_active",
    });
  });
});
