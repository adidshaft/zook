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

test("owner mutations cannot force another organization id in path or body", async ({ page }) => {
  const org = await seedAndGetOrg({ username: "aarogya-strength" });
  const otherOrg = await seedAndGetOrg({ username: "peaklab" });
  const otherBranch = await prisma.branch.findFirstOrThrow({ where: { orgId: otherOrg.id } });
  await loginWithSessionCookie(page, await createIsolatedOwner(org.id));

  const crossProfile = await page.request.patch(`/api/orgs/${otherOrg.id}/profile`, {
    headers: { "x-zook-org-id": org.id },
    data: {
      name: otherOrg.name,
      username: otherOrg.username,
      contactPhone: otherOrg.contactPhone ?? "9876543210",
      contactEmail: otherOrg.contactEmail ?? "owner@zook.local",
      address: otherOrg.address ?? "Other Org Street",
      city: otherOrg.city ?? "Bengaluru",
      state: otherOrg.state ?? "Karnataka",
      pincode: otherOrg.pincode ?? "560001",
      amenities: [],
      equipment: [],
      visibility: "PUBLIC",
      joinMode: "OPEN_JOIN",
      logoUrl: "",
      coverImageUrl: "",
      tagline: "Cross-tenant write attempt",
      gallery: [],
      facilities: [],
      gymType: "",
      openingHoursSummary: "",
      appStoreUrl: "",
      playStoreUrl: "",
    },
  });
  expect(crossProfile.status()).toBe(403);

  const crossProduct = await page.request.post(`/api/orgs/${otherOrg.id}/products`, {
    headers: { "x-zook-org-id": org.id },
    data: {
      orgId: otherOrg.id,
      branchId: otherBranch.id,
      name: `Cross Tenant Product ${Date.now()}`,
      category: "OTHER",
      pricePaise: 1000,
      stock: 1,
    },
  });
  expect(crossProduct.status()).toBe(403);
  await expect(
    prisma.product.findFirst({
      where: { orgId: otherOrg.id, name: { startsWith: "Cross Tenant Product" } },
    }),
  ).resolves.toBeNull();
});
