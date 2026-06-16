import { expect, test } from "@playwright/test";
import { prisma } from "@zook/db";
import { expectApiOk, loginWithSessionCookie, seedAndGetOrg } from "./helpers";
import { requireDb } from "./helpers/db";

test.describe("classes actions", () => {
  test.beforeEach(() => {
    requireDb();
  });

  test("owner schedules a class and members can see booking state", async ({ page }) => {
    await loginWithSessionCookie(page, "owner@zook.local");
    const org = await seedAndGetOrg({ username: "aarogya-strength" });
    const branch = await prisma.branch.findFirstOrThrow({
      where: { orgId: org.id, isDefault: true, active: true },
    });
    const trainerAssignment = await prisma.organizationRoleAssignment.findFirstOrThrow({
      where: { orgId: org.id, role: "TRAINER" },
    });

    const created = await expectApiOk<{ class: { id: string } }>(
      await page.request.post(`/api/orgs/${org.id}/classes`, {
        data: {
          branchId: branch.id,
          trainerId: trainerAssignment.userId,
          name: `Sunrise Flow ${Date.now()}`,
          classType: "YOGA",
          maxCapacity: 8,
          startTime: new Date(Date.now() + 2 * 60 * 60_000).toISOString(),
          endTime: new Date(Date.now() + 3 * 60 * 60_000).toISOString(),
        },
      }),
    );

    await page.goto(`/dashboard/classes?branchId=${branch.id}`);
    await expect(page.getByRole("heading", { name: "Schedule a group class" })).toBeVisible();
    await expect(page.getByText("Sunrise Flow", { exact: false })).toBeVisible();

    await loginWithSessionCookie(page, "member@zook.local");
    const beforeBooking = await expectApiOk<{
      classes: Array<{ id: string; remainingCapacity: number; myEnrollmentStatus?: string | null }>;
    }>(await page.request.get(`/api/orgs/${org.id}/classes?branchId=${branch.id}`));
    const listed = beforeBooking.data.classes.find((entry) => entry.id === created.data.class.id);
    expect(listed?.remainingCapacity).toBe(8);
    expect(listed?.myEnrollmentStatus ?? null).toBeNull();

    const booked = await expectApiOk<{
      enrollment: { status: string };
      remainingCapacity: number;
    }>(await page.request.post(`/api/orgs/${org.id}/classes/${created.data.class.id}/enroll`));
    expect(booked.data.enrollment.status).toBe("confirmed");
    expect(booked.data.remainingCapacity).toBe(7);

    const afterBooking = await expectApiOk<{
      classes: Array<{ id: string; myEnrollmentStatus?: string | null; remainingCapacity: number }>;
    }>(await page.request.get(`/api/orgs/${org.id}/classes?branchId=${branch.id}`));
    const bookedClass = afterBooking.data.classes.find((entry) => entry.id === created.data.class.id);
    expect(bookedClass?.myEnrollmentStatus).toBe("confirmed");
    expect(bookedClass?.remainingCapacity).toBe(7);
  });
});
