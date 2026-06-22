import { expect, test } from "@playwright/test";
import { prisma } from "@zook/db";
import { expectApiOk, loginWithSessionCookie, seedAndGetOrg } from "./helpers";
import { requireDb } from "./helpers/db";

test.describe("shop actions", () => {
  test.beforeEach(() => {
    requireDb();
  });

  test("owner creates, edits, adjusts, and archives a product", async ({ page }) => {
    await loginWithSessionCookie(page, "owner@zook.local");
    const org = await seedAndGetOrg({ username: "aarogya-strength" });
    const productName = `Action Protein ${Date.now()}`;

    const created = await expectApiOk<{ product: { id: string; stock: number; active: boolean } }>(
      await page.request.post(`/api/orgs/${org.id}/products`, {
        data: {
          name: productName,
          category: "SUPPLEMENT",
          pricePaise: 24900,
          stock: 7,
          lowStockThreshold: 2,
          description: "Playwright product",
        },
      }),
    );
    expect(created.data.product).toMatchObject({ stock: 7, active: true });

    const edited = await expectApiOk<{
      product: { id: string; stock: number; pricePaise: number };
    }>(
      await page.request.patch(`/api/orgs/${org.id}/products/${created.data.product.id}`, {
        data: { pricePaise: 29900, stock: 9 },
      }),
    );
    expect(edited.data.product).toMatchObject({ stock: 9, pricePaise: 29900 });

    const adjusted = await expectApiOk<{
      product: { stock: number };
      movement: { reason: string };
    }>(
      await page.request.post(`/api/orgs/${org.id}/inventory/adjust`, {
        data: {
          productId: created.data.product.id,
          delta: -2,
          reason: "Playwright stock correction",
        },
      }),
    );
    expect(adjusted.data.product.stock).toBe(7);
    expect(adjusted.data.movement.reason).toBe("Playwright stock correction");

    await expectApiOk(
      await page.request.patch(`/api/orgs/${org.id}/products/${created.data.product.id}`, {
        data: { active: false },
      }),
    );
    await expect(
      prisma.product.findUnique({ where: { id: created.data.product.id } }),
    ).resolves.toMatchObject({ active: false });

    await page.goto("/dashboard/shop");
    await expect(page.getByText("Low-stock watch")).toBeVisible();
  });

  test("owner switches between branch-scoped shop inventory", async ({ page }) => {
    await loginWithSessionCookie(page, "owner@zook.local");
    const org = await seedAndGetOrg({ username: "aarogya-strength" });
    const defaultBranch = await prisma.branch.findFirstOrThrow({
      where: { orgId: org.id, isDefault: true },
    });
    const secondaryBranch = await prisma.branch.create({
      data: {
        orgId: org.id,
        name: `Shop Annex ${Date.now()}`,
        address: org.address,
        city: org.city,
        state: org.state,
        pincode: org.pincode,
        active: true,
      },
    });
    const defaultProductName = `Default Whey ${Date.now()}`;
    const secondaryProductName = `Annex Bottle ${Date.now()}`;

    await expectApiOk(
      await page.request.post(`/api/orgs/${org.id}/products`, {
        data: {
          branchId: defaultBranch.id,
          name: defaultProductName,
          category: "SUPPLEMENT",
          pricePaise: 21900,
          stock: 3,
          lowStockThreshold: 4,
        },
      }),
    );
    await expectApiOk(
      await page.request.post(`/api/orgs/${org.id}/products`, {
        data: {
          branchId: secondaryBranch.id,
          name: secondaryProductName,
          category: "SHAKER",
          pricePaise: 39900,
          stock: 8,
          lowStockThreshold: 2,
        },
      }),
    );

    const defaultProducts = await expectApiOk<{ products: Array<{ name: string }> }>(
      await page.request.get(`/api/orgs/${org.id}/products?branchId=${defaultBranch.id}`),
    );
    expect(defaultProducts.data.products.map((product) => product.name)).toContain(
      defaultProductName,
    );
    expect(defaultProducts.data.products.map((product) => product.name)).not.toContain(
      secondaryProductName,
    );

    const secondaryProducts = await expectApiOk<{ products: Array<{ name: string }> }>(
      await page.request.get(`/api/orgs/${org.id}/products?branchId=${secondaryBranch.id}`),
    );
    expect(secondaryProducts.data.products.map((product) => product.name)).toContain(
      secondaryProductName,
    );
    expect(secondaryProducts.data.products.map((product) => product.name)).not.toContain(
      defaultProductName,
    );

    const member = await prisma.user.findUniqueOrThrow({ where: { email: "member@zook.local" } });
    const [defaultOrder, secondaryOrder] = await Promise.all([
      prisma.shopOrder.create({
        data: { orgId: org.id, branchId: defaultBranch.id, userId: member.id, totalPaise: 21900 },
      }),
      prisma.shopOrder.create({
        data: { orgId: org.id, branchId: secondaryBranch.id, userId: member.id, totalPaise: 39900 },
      }),
    ]);
    const defaultShopCsv = await page.request.get(
      `/api/orgs/${org.id}/reports/shop.csv?branchId=${defaultBranch.id}`,
    );
    expect(defaultShopCsv.ok()).toBe(true);
    const defaultShopCsvText = await defaultShopCsv.text();
    expect(defaultShopCsvText).toContain(defaultOrder.id);
    expect(defaultShopCsvText).not.toContain(secondaryOrder.id);

    await page.goto(`/dashboard/shop?branchId=${defaultBranch.id}`);
    await expect(page.getByText(defaultProductName)).toBeVisible();
    await expect(page.getByText(secondaryProductName)).toHaveCount(0);

    await page.goto(`/dashboard/shop?branchId=${secondaryBranch.id}`);
    await expect(page.getByText(secondaryProductName)).toBeVisible();
    await expect(page.getByText(defaultProductName)).toHaveCount(0);
  });

  test("member order can be paid at desk and fulfilled with notification", async ({ page }) => {
    test.setTimeout(150_000);
    const org = await seedAndGetOrg({ username: "aarogya-strength" });
    await loginWithSessionCookie(page, "owner@zook.local");
    const product = await expectApiOk<{ product: { id: string; pricePaise: number } }>(
      await page.request.post(`/api/orgs/${org.id}/products`, {
        data: {
          name: `Pickup Bottle ${Date.now()}`,
          category: "SHAKER",
          pricePaise: 39900,
          stock: 4,
          lowStockThreshold: 1,
          active: true,
        },
      }),
    );

    await loginWithSessionCookie(page, "member@zook.local");
    const orderPayload = await expectApiOk<{
      order: { id: string; totalPaise: number; status: string };
    }>(
      await page.request.post("/api/shop/orders", {
        data: { orgId: org.id, items: [{ productId: product.data.product.id, quantity: 1 }] },
      }),
    );
    expect(orderPayload.data.order.totalPaise).toBe(39900);

    await loginWithSessionCookie(page, "owner@zook.local");
    const paid = await expectApiOk<{
      order: { id: string; status: string };
      payment: { id: string };
    }>(
      await page.request.post(
        `/api/orgs/${org.id}/shop/orders/${orderPayload.data.order.id}/manual-payment`,
        {
          data: {
            amountPaise: 39900,
            mode: "CASH",
            receiptNumber: `SHOP-${Date.now()}`,
            notes: "Playwright shop order payment",
          },
        },
      ),
    );
    expect(paid.data.order.status).toBe("READY_FOR_PICKUP");

    const fulfilled = await expectApiOk<{ order: { status: string; fulfilledAt?: string | null } }>(
      await page.request.post(
        `/api/orgs/${org.id}/shop/orders/${orderPayload.data.order.id}/fulfill`,
        {
          data: { pickupCodeSkipped: true, skipReason: "Verified in Playwright action test" },
        },
      ),
    );
    expect(fulfilled.data.order.status).toBe("FULFILLED");
    await expect(
      prisma.notification.findFirst({
        where: {
          orgId: org.id,
          metadata: { path: ["shopOrderId"], equals: orderPayload.data.order.id },
        },
      }),
    ).resolves.toBeTruthy();
  });

  test("owner sees product photo upload and refund route for paid shop orders", async ({
    page,
  }) => {
    await loginWithSessionCookie(page, "owner@zook.local");
    const org = await seedAndGetOrg({ username: "aarogya-strength" });
    const member = await prisma.user.findUniqueOrThrow({ where: { email: "member@zook.local" } });
    const branch = await prisma.branch.findFirstOrThrow({
      where: { orgId: org.id, isDefault: true },
    });
    const product = await prisma.product.create({
      data: {
        orgId: org.id,
        branchId: branch.id,
        name: `Refundable Water ${Date.now()}`,
        category: "WATER",
        pricePaise: 5000,
        stock: 10,
      },
    });
    const payment = await prisma.payment.create({
      data: {
        orgId: org.id,
        branchId: branch.id,
        userId: member.id,
        purpose: "SHOP_ORDER",
        amountPaise: 5000,
        status: "SUCCEEDED",
        mode: "CASH",
        provider: "manual",
        recordedAt: new Date(),
      },
    });
    const order = await prisma.shopOrder.create({
      data: {
        orgId: org.id,
        branchId: branch.id,
        userId: member.id,
        status: "READY_FOR_PICKUP",
        paymentId: payment.id,
        totalPaise: 5000,
        pickupCode: "RFND42",
      },
    });
    await prisma.shopOrderItem.create({
      data: {
        orgId: org.id,
        orderId: order.id,
        productId: product.id,
        quantity: 1,
        unitPaise: 5000,
      },
    });

    await page.goto("/dashboard/shop");
    await expect(page.getByText("Product photos")).toBeVisible({ timeout: 15_000 });
    await page.goto("/dashboard/shop/orders");
    await expect(page.getByText(order.id.slice(-8).toUpperCase())).toBeVisible({
      timeout: 15_000,
    });
    const refundLink = page.getByRole("link", { name: /refund order/i }).first();
    await expect(refundLink).toBeVisible();
    await expect(refundLink).toHaveAttribute(
      "href",
      `/dashboard/payments?search=${encodeURIComponent(payment.id)}`,
    );
  });
});
