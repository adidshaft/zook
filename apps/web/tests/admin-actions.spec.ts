import { expect, test } from "@playwright/test";
import { prisma } from "@zook/db";
import { expectApiOk, loginWithSessionCookie, seedAndGetOrg } from "./helpers";
import { requireDb } from "./helpers/db";

const allWeekHours = {
  mon: { open: "06:00", close: "22:00" },
  tue: { open: "06:00", close: "22:00" },
  wed: { open: "06:00", close: "22:00" },
  thu: { open: "06:00", close: "22:00" },
  fri: { open: "06:00", close: "22:00" },
  sat: { open: "07:00", close: "20:00" },
  sun: { open: "07:00", close: "20:00" },
};

test.describe("branches, staff, settings, and billing actions", () => {
  test.beforeEach(() => {
    requireDb();
  });

  test("owner creates and archives a branch", async ({ page }) => {
    await loginWithSessionCookie(page, "owner@zook.local");
    const org = await seedAndGetOrg({ username: "aarogya-strength" });
    const branchName = `Action Branch ${Date.now()}`;

    const branch = await expectApiOk<{ branch: { id: string; name: string; active: boolean } }>(
      await page.request.post(`/api/orgs/${org.id}/branches`, {
        data: {
          name: branchName,
          address: "42 Action Street",
          city: "Pune",
          state: "MH",
          pincode: "411001",
          contactPhone: "+91 98765 43210",
          operatingHours: allWeekHours,
          commerceSetup: "SHARED",
          isDefault: false,
        },
      }),
    );
    expect(branch.data.branch).toMatchObject({ name: branchName, active: true });

    const archived = await expectApiOk<{ branch: { active: boolean } }>(
      await page.request.delete(`/api/orgs/${org.id}/branches/${branch.data.branch.id}`),
    );
    expect(archived.data.branch.active).toBe(false);
    await page.goto("/dashboard/branches");
    await expect(page.getByText(/Branches|Branch network/i)).toBeVisible();
  });

  test("owner invites, changes, and removes staff with RBAC taking effect", async ({ page }) => {
    await loginWithSessionCookie(page, "owner@zook.local");
    const owner = await prisma.user.findUniqueOrThrow({ where: { email: "owner@zook.local" } });
    const org = await seedAndGetOrg({ username: "aarogya-strength" });
    const branch = await prisma.branch.findFirstOrThrow({
      where: { orgId: org.id, isDefault: true },
    });
    const inviteEmail = `staff-invite-${Date.now()}@zook.local`;

    const invite = await expectApiOk<{ invite: { id: string; email: string; role: string } }>(
      await page.request.post(`/api/orgs/${org.id}/staff/invite`, {
        data: { email: inviteEmail, role: "ADMIN" },
      }),
    );
    expect(invite.data.invite).toMatchObject({ email: inviteEmail, role: "ADMIN" });

    const staffUser = await prisma.user.create({
      data: { email: `staff-role-${Date.now()}@zook.local`, name: "Action Staff" },
    });
    await prisma.organizationUser.upsert({
      where: { orgId_userId: { orgId: org.id, userId: staffUser.id } },
      update: { status: "active", leftAt: null },
      create: { orgId: org.id, userId: staffUser.id, status: "active" },
    });
    const assignment = await prisma.organizationRoleAssignment.create({
      data: { orgId: org.id, userId: staffUser.id, role: "TRAINER", assignedById: owner.id },
    });
    const updated = await expectApiOk<{ assignment: { id: string; role: string } }>(
      await page.request.patch(`/api/orgs/${org.id}/staff/${assignment.id}`, {
        data: { role: "RECEPTIONIST", branchId: branch.id },
      }),
    );
    expect(updated.data.assignment.role).toBe("RECEPTIONIST");

    await loginWithSessionCookie(page, staffUser.email);
    await expect((await page.request.get(`/api/orgs/${org.id}/payments/recent`)).status()).toBe(
      200,
    );

    await loginWithSessionCookie(page, "owner@zook.local");
    await expectApiOk(await page.request.delete(`/api/orgs/${org.id}/staff/${assignment.id}`));
    await expect(
      prisma.organizationRoleAssignment.findUnique({ where: { id: assignment.id } }),
    ).resolves.toBeNull();
  });

  test("settings profile and join mode changes appear on the public profile", async ({ page }) => {
    await loginWithSessionCookie(page, "owner@zook.local");
    const org = await seedAndGetOrg({ username: "aarogya-strength" });
    const nextName = `Aarogya Strength ${Date.now().toString().slice(-4)}`;

    await expectApiOk(
      await page.request.patch(`/api/orgs/${org.id}/profile`, {
        data: {
          name: nextName,
          username: org.username,
          contactEmail: org.contactEmail ?? "hello@zook.local",
          contactPhone: org.contactPhone ?? "+91 98765 43210",
          address: org.address,
          city: org.city,
          state: org.state,
          pincode: org.pincode,
          amenities: Array.isArray(org.amenities) ? org.amenities : [],
          visibility: org.visibility,
          joinMode: "APPROVAL_REQUIRED",
          tagline: "Action-tested training floor",
          gallery: [],
          facilities: ["Strength floor"],
          equipment: ["Squat rack"],
          openingHoursSummary: "Open daily",
        },
      }),
    );
    await expect(prisma.organization.findUnique({ where: { id: org.id } })).resolves.toMatchObject({
      name: nextName,
      joinMode: "APPROVAL_REQUIRED",
    });

    await expectApiOk(
      await page.request.patch(`/api/orgs/${org.id}/join-mode`, {
        data: { joinMode: "OPEN_JOIN" },
      }),
    );
    await page.goto(`/g/${org.username}`);
    await expect(page.getByRole("heading", { name: nextName })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Action-tested training floor")).toBeVisible();
  });

  test("invoice PDF download and mock payment-provider connect toggle are visible product gaps", async ({
    page,
  }) => {
    test.fail(
      true,
      "Billing currently exposes profile/subscription state and HTML receipts; PDF invoice download and provider connect toggles need product UI.",
    );
    await loginWithSessionCookie(page, "owner@zook.local");
    await page.goto("/dashboard/billing");
    expect(await page.getByRole("button", { name: /connect mock provider/i }).count()).toBe(1);
    expect(await page.getByRole("button", { name: /download invoice pdf/i }).count()).toBe(1);
  });
});
