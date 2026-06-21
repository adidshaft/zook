import { expect, test, type APIResponse, type Page } from "@playwright/test";
import { prisma, type Branch, type MembershipPlan, type Organization, type User } from "@zook/db";
import { expectApiOk, loginWithSessionCookie, seedAndGetOrg } from "./helpers";
import { requireDb } from "./helpers/db";

function dateKey() {
  return new Date().toISOString().slice(0, 10);
}

async function createScanMember(orgId: string, email: string) {
  const user = await prisma.user.create({
    data: {
      email,
      emailVerifiedAt: new Date(),
      name: email.split("@")[0] ?? "Scan Member",
      profilePhotoUrl: "https://example.com/member.jpg",
    },
  });
  await prisma.organizationUser.create({
    data: { orgId, userId: user.id, status: "active" },
  });
  await prisma.organizationRoleAssignment.create({
    data: { orgId, userId: user.id, role: "MEMBER" },
  });
  await prisma.memberProfile.create({
    data: {
      orgId,
      userId: user.id,
      profilePhotoUrl: "https://example.com/member.jpg",
    },
  });
  return user;
}

async function createScanPlan(input: { org: Organization; branch: Branch; owner: User }) {
  return prisma.membershipPlan.create({
    data: {
      orgId: input.org.id,
      branchId: input.branch.id,
      name: `Scan Plan ${Date.now()}`,
      type: "DURATION",
      pricePaise: 99900,
      durationDays: 30,
      createdById: input.owner.id,
    },
  });
}

async function createScanSubscription(input: {
  org: Organization;
  branch: Branch;
  member: User;
  plan: MembershipPlan;
  status: "ACTIVE" | "PAUSED" | "EXPIRED";
}) {
  return prisma.memberSubscription.create({
    data: {
      orgId: input.org.id,
      branchId: input.branch.id,
      memberUserId: input.member.id,
      planId: input.plan.id,
      status: input.status,
      startsAt: new Date(Date.now() - 24 * 60 * 60_000),
      endsAt:
        input.status === "EXPIRED"
          ? new Date(Date.now() - 60 * 60_000)
          : new Date(Date.now() + 29 * 24 * 60 * 60_000),
      ...(input.status === "PAUSED" ? { pausedAt: new Date() } : {}),
    },
  });
}

async function issueQr(page: Page, orgId: string) {
  await loginWithSessionCookie(page, "owner@zook.local");
  const qr = await expectApiOk<{ qrPayload: string }>(
    await page.request.post(`/api/orgs/${orgId}/attendance/qr-token`),
  );
  return qr.data.qrPayload;
}

async function expectScanFailure(response: APIResponse, code: string, messagePattern: RegExp) {
  expect(response.status()).toBe(400);
  const body = (await response.json()) as { ok: boolean; error?: { code?: string; message?: string } };
  expect(body.ok).toBe(false);
  expect(body.error?.code).toBe(code);
  expect(body.error?.message).toMatch(messagePattern);
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
    await prisma.attendanceRecord.updateMany({
      where: {
        orgId: org.id,
        userId: member.id,
        checkedOutAt: null,
        status: { in: ["APPROVED", "PENDING_APPROVAL", "FLAGGED"] },
      },
      data: {
        checkedOutAt: new Date(),
        checkoutReason: "manual",
        durationSeconds: 0,
      },
    });

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

  test("attendance scan returns specific membership errors and succeeds for active memberships", async ({
    page,
  }) => {
    const org = await seedAndGetOrg({ username: "aarogya-strength" });
    const branch = await prisma.branch.findFirstOrThrow({
      where: { orgId: org.id, isDefault: true, active: true },
    });
    const owner = await prisma.user.findUniqueOrThrow({ where: { email: "owner@zook.local" } });
    const plan = await createScanPlan({ org, branch, owner });
    const suffix = Date.now();

    const noMembershipMember = await createScanMember(org.id, `scan-none-${suffix}@zook.local`);
    const noMembershipQr = await issueQr(page, org.id);
    await loginWithSessionCookie(page, noMembershipMember.email!);
    await expectScanFailure(
      await page.request.post("/api/attendance/scan", {
        data: { qrPayload: noMembershipQr, deviceId: `scan-none-${suffix}` },
      }),
      "NO_ACTIVE_MEMBERSHIP",
      new RegExp(org.name),
    );

    const pausedMember = await createScanMember(org.id, `scan-paused-${suffix}@zook.local`);
    await createScanSubscription({ org, branch, member: pausedMember, plan, status: "PAUSED" });
    const pausedQr = await issueQr(page, org.id);
    await loginWithSessionCookie(page, pausedMember.email!);
    await expectScanFailure(
      await page.request.post("/api/attendance/scan", {
        data: { qrPayload: pausedQr, deviceId: `scan-paused-${suffix}` },
      }),
      "MEMBERSHIP_PAUSED",
      /membership is paused/i,
    );

    const expiredMember = await createScanMember(org.id, `scan-expired-${suffix}@zook.local`);
    await createScanSubscription({ org, branch, member: expiredMember, plan, status: "EXPIRED" });
    const expiredQr = await issueQr(page, org.id);
    await loginWithSessionCookie(page, expiredMember.email!);
    await expectScanFailure(
      await page.request.post("/api/attendance/scan", {
        data: { qrPayload: expiredQr, deviceId: `scan-expired-${suffix}` },
      }),
      "MEMBERSHIP_EXPIRED",
      /membership expired/i,
    );

    const activeMember = await createScanMember(org.id, `scan-active-${suffix}@zook.local`);
    const activeSubscription = await createScanSubscription({
      org,
      branch,
      member: activeMember,
      plan,
      status: "ACTIVE",
    });
    const activeQr = await issueQr(page, org.id);
    await loginWithSessionCookie(page, activeMember.email!);
    const scanned = await expectApiOk<{ status: string; attendance: { subscriptionId?: string } }>(
      await page.request.post("/api/attendance/scan", {
        data: { qrPayload: activeQr, deviceId: `scan-active-${suffix}` },
      }),
    );
    expect(scanned.data.status).toBe("APPROVED");
    await expect(
      prisma.attendanceRecord.findFirst({
        where: { orgId: org.id, userId: activeMember.id, subscriptionId: activeSubscription.id },
      }),
    ).resolves.toBeTruthy();
  });
});
