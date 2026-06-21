import { expect, test } from "@playwright/test";
import { prisma } from "@zook/db";
import { expectApiOk, loginWithSessionCookie, seedAndGetOrg } from "./helpers";
import { requireDb } from "./helpers/db";

async function createClassMember(orgId: string, email: string) {
  const user = await prisma.user.create({
    data: {
      email,
      emailVerifiedAt: new Date(),
      name: email.split("@")[0] ?? "Class Member",
    },
  });
  await prisma.organizationUser.create({
    data: { orgId, userId: user.id, status: "active" },
  });
  await prisma.organizationRoleAssignment.create({
    data: { orgId, userId: user.id, role: "MEMBER" },
  });
  return user;
}

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

  test("canceling a confirmed class enrollment promotes the earliest waitlisted member and allows re-enroll", async ({
    page,
  }) => {
    await loginWithSessionCookie(page, "owner@zook.local");
    const org = await seedAndGetOrg({ username: "aarogya-strength" });
    const branch = await prisma.branch.findFirstOrThrow({
      where: { orgId: org.id, isDefault: true, active: true },
    });
    const trainerAssignment = await prisma.organizationRoleAssignment.findFirstOrThrow({
      where: { orgId: org.id, role: "TRAINER" },
    });
    const suffix = Date.now();
    const confirmedMember = await createClassMember(org.id, `class-confirmed-${suffix}@zook.local`);
    const waitlistedMember = await createClassMember(org.id, `class-waitlisted-${suffix}@zook.local`);

    const created = await expectApiOk<{ class: { id: string } }>(
      await page.request.post(`/api/orgs/${org.id}/classes`, {
        data: {
          branchId: branch.id,
          trainerId: trainerAssignment.userId,
          name: `Capacity Test ${suffix}`,
          classType: "STRENGTH",
          maxCapacity: 1,
          startTime: new Date(Date.now() + 4 * 60 * 60_000).toISOString(),
          endTime: new Date(Date.now() + 5 * 60 * 60_000).toISOString(),
        },
      }),
    );

    await loginWithSessionCookie(page, confirmedMember.email!);
    const confirmed = await expectApiOk<{ enrollment: { status: string } }>(
      await page.request.post(`/api/orgs/${org.id}/classes/${created.data.class.id}/enroll`),
    );
    expect(confirmed.data.enrollment.status).toBe("confirmed");

    await loginWithSessionCookie(page, waitlistedMember.email!);
    const waitlisted = await expectApiOk<{ enrollment: { status: string } }>(
      await page.request.post(`/api/orgs/${org.id}/classes/${created.data.class.id}/enroll`),
    );
    expect(waitlisted.data.enrollment.status).toBe("waitlisted");

    await loginWithSessionCookie(page, confirmedMember.email!);
    await expectApiOk(await page.request.delete(`/api/orgs/${org.id}/classes/${created.data.class.id}/enroll`));

    await expect(
      prisma.classEnrollment.findUnique({
        where: { classId_memberId: { classId: created.data.class.id, memberId: confirmedMember.id } },
      }),
    ).resolves.toMatchObject({ status: "cancelled", cancelledAt: expect.any(Date) });
    await expect(
      prisma.classEnrollment.findUnique({
        where: { classId_memberId: { classId: created.data.class.id, memberId: waitlistedMember.id } },
      }),
    ).resolves.toMatchObject({ status: "confirmed" });

    const reEnrolled = await expectApiOk<{ enrollment: { status: string } }>(
      await page.request.post(`/api/orgs/${org.id}/classes/${created.data.class.id}/enroll`),
    );
    expect(reEnrolled.data.enrollment.status).toBe("waitlisted");
    await expect(
      prisma.classEnrollment.findUnique({
        where: { classId_memberId: { classId: created.data.class.id, memberId: confirmedMember.id } },
      }),
    ).resolves.toMatchObject({ status: "waitlisted", cancelledAt: null });
  });

  test("class roster is limited to staff permissions", async ({ page }) => {
    await loginWithSessionCookie(page, "owner@zook.local");
    const org = await seedAndGetOrg({ username: "aarogya-strength" });
    const branch = await prisma.branch.findFirstOrThrow({
      where: { orgId: org.id, isDefault: true, active: true },
    });
    const trainerAssignment = await prisma.organizationRoleAssignment.findFirstOrThrow({
      where: { orgId: org.id, role: "TRAINER" },
    });
    const suffix = Date.now();
    const member = await createClassMember(org.id, `class-roster-member-${suffix}@zook.local`);

    const created = await expectApiOk<{ class: { id: string } }>(
      await page.request.post(`/api/orgs/${org.id}/classes`, {
        data: {
          branchId: branch.id,
          trainerId: trainerAssignment.userId,
          name: `Roster Test ${suffix}`,
          classType: "HIIT",
          maxCapacity: 10,
          startTime: new Date(Date.now() + 6 * 60 * 60_000).toISOString(),
          endTime: new Date(Date.now() + 7 * 60 * 60_000).toISOString(),
        },
      }),
    );

    await loginWithSessionCookie(page, member.email!);
    await expectApiOk(await page.request.post(`/api/orgs/${org.id}/classes/${created.data.class.id}/enroll`));
    expect((await page.request.get(`/api/orgs/${org.id}/classes/${created.data.class.id}/roster`)).status()).toBe(403);

    await loginWithSessionCookie(page, "owner@zook.local");
    const roster = await expectApiOk<{
      class: { id: string; name: string; maxCapacity: number };
      roster: Array<{ memberId: string; name: string | null; status: string; enrolledAt: string }>;
    }>(await page.request.get(`/api/orgs/${org.id}/classes/${created.data.class.id}/roster`));
    expect(roster.data.class).toMatchObject({ id: created.data.class.id, maxCapacity: 10 });
    expect(roster.data.roster).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ memberId: member.id, name: member.name, status: "confirmed" }),
      ]),
    );
  });
});
