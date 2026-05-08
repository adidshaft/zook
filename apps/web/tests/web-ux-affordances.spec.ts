import { expect, test } from "@playwright/test";
import { prisma } from "@zook/db";
import { loginWithSessionCookie, seedAndGetOrg } from "./helpers";

function requireDb() {
  if (process.env.RUN_DB_WEB_TESTS !== "1") {
    test.skip(true, "DB-gated UX affordance checks run only when RUN_DB_WEB_TESTS=1.");
  }
}

test("web UX affordances connect operators to the next action", async ({ page }) => {
  requireDb();
  await loginWithSessionCookie(page, "owner@zook.local");
  const org = await seedAndGetOrg({ username: "iron-house" });
  const branch =
    (await prisma.branch.findFirst({ where: { orgId: org.id, isDefault: true } })) ??
    (await prisma.branch.findFirstOrThrow({ where: { orgId: org.id } }));
  const owner = await prisma.user.findFirstOrThrow({ where: { email: "owner@zook.local" } });
  const product = await prisma.product.create({
    data: {
      orgId: org.id,
      branchId: branch.id,
      name: `UX Bottle ${Date.now()}`,
      category: "OTHER",
      pricePaise: 9900,
      stock: 3,
      lowStockThreshold: 1,
    },
  });
  const order = await prisma.shopOrder.create({
    data: {
      orgId: org.id,
      branchId: branch.id,
      userId: owner.id,
      status: "READY_FOR_PICKUP",
      totalPaise: 9900,
      pickupCode: `UX${Date.now().toString().slice(-6)}`,
    },
  });
  const orderItem = await prisma.shopOrderItem.create({
    data: {
      orgId: org.id,
      orderId: order.id,
      productId: product.id,
      quantity: 1,
      unitPaise: 9900,
    },
  });
  await prisma.auditLog.create({
    data: {
      orgId: org.id,
      actorUserId: owner.id,
      action: "ux.affordance.test",
      entityType: "shop_order",
      entityId: order.id,
      before: { status: "PENDING_PAYMENT" },
      after: { status: "READY_FOR_PICKUP" },
    },
  });

  await page.goto("/dashboard");
  await page.getByRole("button", { name: /select branch/i }).click();
  await expect(page.getByRole("listbox", { name: /select branch/i })).toBeVisible();

  await page.route("**/api/orgs/**/shop/orders**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        data: {
          orders: [
            {
              ...order,
              createdAt: order.createdAt.toISOString(),
              updatedAt: order.updatedAt.toISOString(),
              fulfilledAt: order.fulfilledAt?.toISOString() ?? null,
              items: [
                {
                  ...orderItem,
                  createdAt: orderItem.createdAt.toISOString(),
                  product: {
                    ...product,
                    createdAt: product.createdAt.toISOString(),
                    updatedAt: product.updatedAt.toISOString(),
                  },
                },
              ],
            },
          ],
        },
      }),
    });
  });
  await page.goto(`/dashboard/shop/orders?branchId=${encodeURIComponent(branch.id)}`);
  const orderRow = page.getByRole("row", { name: new RegExp(order.id.slice(-8).toUpperCase()) });
  const deskLink = orderRow.getByRole("link", { name: /open in desk/i });
  await expect(deskLink).toHaveAttribute(
    "href",
    `/desk?tab=pickup&orderId=${encodeURIComponent(order.id)}`,
  );
  await page.goto(`/desk?tab=pickup&orderId=${encodeURIComponent(order.id)}`);
  await expect(page).toHaveURL(/\/desk\?tab=pickup/);
  await expect(page.getByText(order.id.slice(-8).toUpperCase())).toBeVisible();

  await page.goto("/dashboard/audit");
  const auditRow = page.getByRole("row", { name: /Ux\.Affordance\.Test/i }).first();
  await expect(auditRow).toBeVisible();
  await page.waitForLoadState("networkidle");
  await auditRow.getByRole("button", { name: /details/i }).click();
  await expect(page.getByRole("dialog", { name: /change details/i })).toBeVisible();
});
