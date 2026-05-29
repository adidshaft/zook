import { expect, test } from "@playwright/test";
import type { Role } from "@zook/core";
import { prisma } from "@zook/db";
import { loginWithSessionCookie, seedAndGetOrg } from "./helpers";

function requireDb() {
  if (process.env.RUN_DB_WEB_TESTS !== "1") {
    test.skip(true, "DB-gated tests run only when RUN_DB_WEB_TESTS=1.");
  }

  if (!process.env.DATABASE_URL) {
    throw new Error("RUN_DB_WEB_TESTS=1 was set, but DATABASE_URL is missing.");
  }
}

async function createMatrixActor(input: {
  orgId: string;
  role: Role | "PLATFORM_ADMIN";
  branchId?: string;
}) {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const roleSlug = input.role.toLowerCase().replace(/_/g, "-");
  const user = await prisma.user.create({
    data: {
      email: `rbac-${roleSlug}-${suffix}@zook.local`,
      name: `RBAC ${input.role}`,
      isPlatformAdmin: input.role === "PLATFORM_ADMIN",
    },
  });

  if (input.role !== "PLATFORM_ADMIN") {
    await prisma.organizationUser.create({
      data: { orgId: input.orgId, userId: user.id },
    });
    const assignmentData = {
      orgId: input.orgId,
      userId: user.id,
      role: input.role,
      ...(input.role === "RECEPTIONIST" ? { branchId: input.branchId ?? null } : {}),
    };
    await prisma.organizationRoleAssignment.create({
      data: assignmentData,
    });
  }

  return user.email;
}

test("organization routes enforce role and permission matrix", async ({ page }) => {
  test.setTimeout(60_000);
  requireDb();
  const org = await seedAndGetOrg({ username: "aarogya-strength" });
  const defaultBranch = await prisma.branch.findFirstOrThrow({
    where: { orgId: org.id, isDefault: true },
  });
  const ownerEmail = await createMatrixActor({ orgId: org.id, role: "OWNER" });
  const adminEmail = await createMatrixActor({ orgId: org.id, role: "ADMIN" });
  const memberEmail = await createMatrixActor({ orgId: org.id, role: "MEMBER" });
  const receptionistEmail = await createMatrixActor({
    orgId: org.id,
    role: "RECEPTIONIST",
    branchId: defaultBranch.id,
  });
  const trainerEmail = await createMatrixActor({ orgId: org.id, role: "TRAINER" });
  const platformEmail = await createMatrixActor({ orgId: org.id, role: "PLATFORM_ADMIN" });
  const ownerUser = await prisma.user.findUniqueOrThrow({ where: { email: ownerEmail } });
  const memberUser = await prisma.user.findUniqueOrThrow({ where: { email: memberEmail } });
  const plan = await prisma.membershipPlan.create({
    data: {
      orgId: org.id,
      createdById: ownerUser.id,
      name: `RBAC Plan ${Date.now()}`,
      type: "DURATION",
      pricePaise: 199900,
      durationDays: 30,
      publicVisible: true,
    },
  });

  await loginWithSessionCookie(page, ownerEmail);
  await expect((await page.request.get(`/api/orgs/${org.id}/dashboard`)).status()).toBe(200);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(
    (await page.request.get(`/api/orgs/${org.id}/subscription-reminders`)).status(),
  ).toBe(200);

  await loginWithSessionCookie(page, adminEmail);
  await expect((await page.request.get(`/api/orgs/${org.id}/dashboard`)).status()).toBe(200);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect((await page.request.get(`/api/orgs/${org.id}/billing-profile`)).status()).toBe(403);
  await expect(
    (
      await page.request.patch(`/api/orgs/${org.id}/permissions`, {
        data: { role: "TRAINER", permission: "AI_GENERATE_PLAN", enabled: false },
      })
    ).status(),
  ).toBe(403);

  await loginWithSessionCookie(page, memberEmail);
  await expect((await page.request.get(`/api/orgs/${org.id}/dashboard`)).status()).toBe(403);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/(?:me|m)(?:\/[^/?#]+)?$/);
  await expect(
    (
      await page.request.post(`/api/orgs/${org.id}/products`, {
        data: {
          name: `Forbidden Product ${Date.now()}`,
          category: "OTHER",
          pricePaise: 1000,
          stock: 1,
        },
      })
    ).status(),
  ).toBe(403);
  await expect(
    (
      await page.request.post(`/api/orgs/${org.id}/manual-payments`, {
        data: {
          memberUserId: memberUser.id,
          amountPaise: 199900,
          method: "CASH",
          planId: plan.id,
          branchId: defaultBranch.id,
        },
      })
    ).status(),
  ).toBe(403);
  await expect(
    (
      await page.request.post(`/api/orgs/${org.id}/notifications`, {
        data: {
          title: "Forbidden broadcast",
          body: "Members cannot broadcast.",
          type: "OPERATIONAL",
          audience: "selected_members",
          selectedUserIds: [memberUser.id],
        },
      })
    ).status(),
  ).toBe(403);

  await loginWithSessionCookie(page, receptionistEmail);
  await expect((await page.request.get(`/api/orgs/${org.id}/attendance/pending`)).status()).toBe(
    200,
  );
  await expect((await page.request.get(`/api/orgs/${org.id}/payments/recent`)).status()).toBe(200);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/desk(?:\?from=dashboard)?$/, { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "Today's queue" })).toBeVisible();
  await expect(
    (
      await page.request.patch(`/api/orgs/${org.id}/permissions`, {
        data: { role: "TRAINER", permission: "AI_GENERATE_PLAN", enabled: false },
      })
    ).status(),
  ).toBe(403);
  await expect(
    (
      await page.request.post(`/api/orgs/${org.id}/products`, {
        data: {
          name: `Reception Forbidden Product ${Date.now()}`,
          category: "OTHER",
          pricePaise: 1000,
          stock: 1,
          branchId: defaultBranch.id,
        },
      })
    ).status(),
  ).toBe(403);

  await loginWithSessionCookie(page, trainerEmail);
  await expect((await page.request.get(`/api/orgs/${org.id}/members`)).status()).toBe(200);
  await expect((await page.request.get(`/api/orgs/${org.id}/payments/recent`)).status()).toBe(403);
  await expect(
    (
      await page.request.post(`/api/orgs/${org.id}/manual-payments`, {
        data: {
          memberUserId: memberUser.id,
          amountPaise: 199900,
          method: "CASH",
          planId: plan.id,
          branchId: defaultBranch.id,
        },
      })
    ).status(),
  ).toBe(403);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/coach$/);

  await loginWithSessionCookie(page, platformEmail);
  await expect((await page.request.get("/api/platform/provider-status")).status()).toBe(200);

  await loginWithSessionCookie(page, ownerEmail);
  await expect((await page.request.get("/api/platform/provider-status")).status()).toBe(403);
});
