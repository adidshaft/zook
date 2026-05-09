import { expect, test } from "@playwright/test";
import { prisma } from "@zook/db";
import { expectApiOk, loginWithSessionCookie, seedAndGetOrg } from "./helpers";

async function createIsolatedOwner(orgId: string) {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const user = await prisma.user.create({
    data: {
      email: `tenant-owner-${suffix}@zook.local`,
      name: "Tenant Isolation Owner",
    },
  });
  await prisma.organizationUser.create({
    data: { orgId, userId: user.id },
  });
  await prisma.organizationRoleAssignment.create({
    data: { orgId, userId: user.id, role: "OWNER" },
  });
  return user.email;
}

test("owner member lists never include another organization", async ({ page }) => {
  const org = await seedAndGetOrg({ username: "aarogya-strength" });
  const otherOrg = await seedAndGetOrg({ username: "peaklab" });
  await loginWithSessionCookie(page, await createIsolatedOwner(org.id));

  const ownResponse = await page.request.get(`/api/orgs/${org.id}/members?limit=50`, {
    headers: { "x-zook-org-id": org.id },
  });
  const ownPayload = await expectApiOk<{ members: Array<{ profile?: { orgId?: string } }> }>(
    ownResponse,
  );
  expect(ownPayload.data.members.every((member) => member.profile?.orgId === org.id)).toBe(true);

  const crossResponse = await page.request.get(`/api/orgs/${otherOrg.id}/members?limit=50`, {
    headers: { "x-zook-org-id": org.id },
  });
  expect(crossResponse.status()).toBe(403);
});

test("concurrent org headers keep request context isolated", async ({ page }) => {
  const org = await seedAndGetOrg({ username: "aarogya-strength" });
  const otherOrg = await seedAndGetOrg({ username: "peaklab" });
  await loginWithSessionCookie(page, await createIsolatedOwner(org.id));

  const [ownResponse, crossResponse] = await Promise.all([
    page.request.get(`/api/orgs/${org.id}/attendance?limit=10`, {
      headers: { "x-zook-org-id": org.id },
    }),
    page.request.get(`/api/orgs/${otherOrg.id}/attendance?limit=10`, {
      headers: { "x-zook-org-id": otherOrg.id },
    }),
  ]);

  const ownPayload = await expectApiOk<{ attendance: Array<{ orgId?: string }> }>(ownResponse);
  expect(ownPayload.data.attendance.every((record) => record.orgId === org.id)).toBe(true);
  expect(crossResponse.status()).toBe(403);
});
