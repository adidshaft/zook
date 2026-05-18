import { expect, test } from "@playwright/test";
import { prisma } from "@zook/db";
import { expectApiOk, loginWithSessionCookie, seedAndGetOrg } from "./helpers";
import { requireDb } from "./helpers/db";

function dateKey() {
  return new Date().toISOString().slice(0, 10);
}

test.describe("attendance actions", () => {
  test.beforeEach(() => {
    requireDb();
  });

  test("owner approves and rejects pending attendance rows with audit read-back", async ({
    page,
  }) => {
    await loginWithSessionCookie(page, "owner@zook.local");
    const org = await seedAndGetOrg({ username: "aarogya-strength" });
    const branch = await prisma.branch.findFirstOrThrow({
      where: { orgId: org.id, isDefault: true },
    });
    const member = await prisma.user.findUniqueOrThrow({ where: { email: "member@zook.local" } });
    const [approveRecord, rejectRecord] = await Promise.all([
      prisma.attendanceRecord.create({
        data: {
          orgId: org.id,
          branchId: branch.id,
          userId: member.id,
          status: "PENDING_APPROVAL",
          source: "QR_SCAN",
          dateKey: dateKey(),
        },
      }),
      prisma.attendanceRecord.create({
        data: {
          orgId: org.id,
          branchId: branch.id,
          userId: member.id,
          status: "PENDING_APPROVAL",
          source: "QR_SCAN",
          dateKey: dateKey(),
        },
      }),
    ]);

    const approvePayload = await expectApiOk<{ record: { status: string } }>(
      await page.request.post(`/api/orgs/${org.id}/attendance/${approveRecord.id}/approve`),
    );
    expect(approvePayload.data.record.status).toBe("APPROVED");
    await expect(
      prisma.auditLog.findFirst({
        where: { orgId: org.id, action: "attendance.approved", entityId: approveRecord.id },
      }),
    ).resolves.toBeTruthy();

    const rejectPayload = await expectApiOk<{
      record: { status: string; rejectionReason: string };
    }>(
      await page.request.post(`/api/orgs/${org.id}/attendance/${rejectRecord.id}/reject`, {
        data: { reason: "Playwright rejection reason" },
      }),
    );
    expect(rejectPayload.data.record).toMatchObject({
      status: "REJECTED",
      rejectionReason: "Playwright rejection reason",
    });
    await expect(
      prisma.auditLog.findFirst({
        where: { orgId: org.id, action: "attendance.rejected", entityId: rejectRecord.id },
      }),
    ).resolves.toBeTruthy();
  });

  test("manual check-in records attendance and consumes membership usage", async ({ page }) => {
    await loginWithSessionCookie(page, "owner@zook.local");
    const org = await seedAndGetOrg({ username: "aarogya-strength" });
    const branch = await prisma.branch.findFirstOrThrow({
      where: { orgId: org.id, isDefault: true },
    });
    const member = await prisma.user.findUniqueOrThrow({ where: { email: "member@zook.local" } });

    const payload = await expectApiOk<{ record: { id: string; status: string; source: string } }>(
      await page.request.post(`/api/orgs/${org.id}/attendance/manual`, {
        data: {
          memberUserId: member.id,
          branchId: branch.id,
          reason: "Playwright manual desk check-in",
          notes: "Manual attendance action coverage",
        },
      }),
    );
    expect(payload.data.record).toMatchObject({ status: "APPROVED", source: "MANUAL" });
    await expect(
      prisma.attendanceOverride.findFirst({
        where: { attendanceRecordId: payload.data.record.id },
      }),
    ).resolves.toBeTruthy();
    await expect(
      prisma.membershipUsage.findFirst({
        where: { orgId: org.id, attendanceId: payload.data.record.id },
      }),
    ).resolves.toBeTruthy();
  });

  test("QR token regeneration returns a fresh signed payload", async ({ page }) => {
    await loginWithSessionCookie(page, "owner@zook.local");
    const org = await seedAndGetOrg({ username: "aarogya-strength" });
    const first = await expectApiOk<{ qrPayload: string; expiresAt: string }>(
      await page.request.post(`/api/orgs/${org.id}/attendance/qr-token`),
    );
    const second = await expectApiOk<{ qrPayload: string; expiresAt: string }>(
      await page.request.post(`/api/orgs/${org.id}/attendance/qr-token`),
    );
    expect(second.data.qrPayload).not.toBe(first.data.qrPayload);
    expect(new Date(second.data.expiresAt).getTime()).toBeGreaterThan(Date.now());

    await page.goto("/dashboard/attendance/qr-display");
    await expect(page.getByRole("heading", { name: /Live Attendance QR/i })).toBeVisible();
    await expect(page.getByAltText(/Attendance QR code/i)).toBeVisible({ timeout: 15_000 });
  });
});
