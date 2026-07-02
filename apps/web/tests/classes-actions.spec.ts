import { expect, test } from "@playwright/test";
import { prisma } from "@zook/db";
import { completeMockCheckout, expectApiOk, loginWithSessionCookie, seedAndGetOrg } from "./helpers";
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

    const className = `Sunrise Flow ${Date.now()}`;
    const created = await expectApiOk<{ class: { id: string } }>(
      await page.request.post(`/api/orgs/${org.id}/classes`, {
        data: {
          branchId: branch.id,
          trainerId: trainerAssignment.userId,
          name: className,
          classType: "YOGA",
          maxCapacity: 8,
          startTime: new Date(Date.now() + 2 * 60 * 60_000).toISOString(),
          endTime: new Date(Date.now() + 3 * 60 * 60_000).toISOString(),
        },
      }),
    );

    await page.goto(`/dashboard/classes?branchId=${branch.id}`);
    await expect(page.getByRole("heading", { name: "Schedule a group class" })).toBeVisible();
    await expect(page.getByRole("heading", { name: className }).first()).toBeVisible();

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

  test("paid class booking creates checkout, settles to confirmed, and cancels with refund before cutoff", async ({
    page,
  }) => {
    await loginWithSessionCookie(page, "owner@zook.local");
    const org = await seedAndGetOrg({ username: "aarogya-strength" });
    await prisma.organization.update({
      where: { id: org.id },
      data: { settings: { allowClassDropIn: true, classRefundCutoffHours: 6 } },
    });
    const branch = await prisma.branch.findFirstOrThrow({
      where: { orgId: org.id, isDefault: true, active: true },
    });
    const trainerAssignment = await prisma.organizationRoleAssignment.findFirstOrThrow({
      where: { orgId: org.id, role: "TRAINER" },
    });

    const created = await expectApiOk<{ class: { id: string; pricePaise: number } }>(
      await page.request.post(`/api/orgs/${org.id}/classes`, {
        data: {
          branchId: branch.id,
          trainerId: trainerAssignment.userId,
          name: `Paid Strength ${Date.now()}`,
          classType: "STRENGTH",
          maxCapacity: 6,
          pricePaise: 49900,
          trainerCommissionBps: 2000,
          startTime: new Date(Date.now() + 24 * 60 * 60_000).toISOString(),
          endTime: new Date(Date.now() + 25 * 60 * 60_000).toISOString(),
        },
      }),
    );
    expect(created.data.class.pricePaise).toBe(49900);

    await loginWithSessionCookie(page, "member@zook.local");
    const member = await prisma.user.findUniqueOrThrow({ where: { email: "member@zook.local" } });
    const checkout = await expectApiOk<{
      enrollment: { id: string; status: string; paymentSessionId?: string | null };
      paymentRequired: boolean;
      checkoutUrl: string;
      session: { id: string };
    }>(await page.request.post(`/api/orgs/${org.id}/classes/${created.data.class.id}/enroll`));
    expect(checkout.data.paymentRequired).toBe(true);
    expect(checkout.data.enrollment.status).toBe("pending_payment");
    expect(checkout.data.checkoutUrl).toContain(`/checkout/mock/${checkout.data.session.id}`);

    await completeMockCheckout(page, checkout.data.session.id);
    await expect(
      prisma.classEnrollment.findUnique({
        where: { classId_memberId: { classId: created.data.class.id, memberId: member.id } },
      }),
    ).resolves.toMatchObject({
      status: "confirmed",
      paidAt: expect.any(Date),
      paymentSessionId: checkout.data.session.id,
    });
    await expect(
      prisma.trainerPayoutLine.findFirst({
        where: { orgId: org.id, trainerId: trainerAssignment.userId, kind: "CLASS_COMMISSION" },
      }),
    ).resolves.toMatchObject({ amountPaise: 9980, sourceType: "class_booking" });

    const cancelled = await expectApiOk<{ ok: boolean; refundAllowed: boolean }>(
      await page.request.delete(`/api/orgs/${org.id}/classes/${created.data.class.id}/enroll`),
    );
    expect(cancelled.data.refundAllowed).toBe(true);
    await expect(
      prisma.paymentRefund.findFirst({
        where: { orgId: org.id, amountPaise: 49900, reason: "Class booking cancelled before cutoff" },
      }),
    ).resolves.toMatchObject({ status: "REFUNDED" });
  });

  test("paid class capacity sends overflow to waitlist without charging", async ({ page }) => {
    await loginWithSessionCookie(page, "owner@zook.local");
    const org = await seedAndGetOrg({ username: "aarogya-strength" });
    await prisma.organization.update({
      where: { id: org.id },
      data: { settings: { allowClassDropIn: true } },
    });
    const branch = await prisma.branch.findFirstOrThrow({
      where: { orgId: org.id, isDefault: true, active: true },
    });
    const trainerAssignment = await prisma.organizationRoleAssignment.findFirstOrThrow({
      where: { orgId: org.id, role: "TRAINER" },
    });
    const overflowMember = await createClassMember(org.id, `paid-waitlist-${Date.now()}@zook.local`);
    const created = await expectApiOk<{ class: { id: string } }>(
      await page.request.post(`/api/orgs/${org.id}/classes`, {
        data: {
          branchId: branch.id,
          trainerId: trainerAssignment.userId,
          name: `Paid Capacity ${Date.now()}`,
          classType: "HIIT",
          maxCapacity: 1,
          pricePaise: 29900,
          startTime: new Date(Date.now() + 12 * 60 * 60_000).toISOString(),
          endTime: new Date(Date.now() + 13 * 60 * 60_000).toISOString(),
        },
      }),
    );

    await loginWithSessionCookie(page, "member@zook.local");
    const sessionsBeforeOverflow = await prisma.paymentSession.count({ where: { orgId: org.id } });
    const first = await expectApiOk<{ enrollment: { status: string }; session: { id: string } }>(
      await page.request.post(`/api/orgs/${org.id}/classes/${created.data.class.id}/enroll`),
    );
    expect(first.data.enrollment.status).toBe("pending_payment");
    expect(await prisma.paymentSession.count({ where: { orgId: org.id } })).toBe(sessionsBeforeOverflow + 1);

    await loginWithSessionCookie(page, overflowMember.email!);
    const waitlisted = await expectApiOk<{
      enrollment: { status: string; paymentSessionId?: string | null };
      paymentRequired?: boolean;
    }>(await page.request.post(`/api/orgs/${org.id}/classes/${created.data.class.id}/enroll`));
    expect(waitlisted.data.enrollment.status).toBe("waitlisted");
    expect(waitlisted.data.paymentRequired).toBe(false);
    expect(await prisma.paymentSession.count({ where: { orgId: org.id } })).toBe(sessionsBeforeOverflow + 1);
  });

  test("exercise templates include starters and support org CRUD", async ({ page }) => {
    await loginWithSessionCookie(page, "owner@zook.local");
    const org = await seedAndGetOrg({ username: "aarogya-strength" });
    const initial = await expectApiOk<{ templates: Array<{ id: string; scope: string; name: string }> }>(
      await page.request.get(`/api/orgs/${org.id}/exercise-templates`),
    );
    expect(initial.data.templates.some((template) => template.scope === "STARTER" && template.name === "Bench Press")).toBe(true);

    const created = await expectApiOk<{ template: { id: string; scope: string; featured: boolean } }>(
      await page.request.post(`/api/orgs/${org.id}/exercise-templates`, {
        data: {
          scope: "ORG",
          starterId: "starter-bench-press",
          name: `House Bench ${Date.now()}`,
          featured: true,
        },
      }),
    );
    expect(created.data.template).toMatchObject({ scope: "ORG", featured: true });

    const updated = await expectApiOk<{ template: { id: string; defaultReps: number } }>(
      await page.request.patch(`/api/orgs/${org.id}/exercise-templates/${created.data.template.id}`, {
        data: { defaultReps: 12 },
      }),
    );
    expect(updated.data.template.defaultReps).toBe(12);

    await expectApiOk(await page.request.delete(`/api/orgs/${org.id}/exercise-templates/${created.data.template.id}`));
    await expect(prisma.exerciseTemplate.findUnique({ where: { id: created.data.template.id } })).resolves.toMatchObject({ active: false });
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

    await page.goto(`/dashboard/classes?branchId=${branch.id}`);
    const classCard = page
      .getByRole("heading", { name: `Roster Test ${suffix}` })
      .locator("xpath=ancestor::div[contains(@class,'rounded-')][1]");
    await expect(classCard).toBeVisible({ timeout: 30_000 });
    await classCard.getByRole("button", { name: /view roster/i }).click();
    await expect(classCard.getByText("Class roster")).toBeVisible();
    await expect(classCard.getByText(member.name ?? member.email!)).toBeVisible();
    await expect(classCard.getByText(/confirmed/i)).toBeVisible();
  });
});
