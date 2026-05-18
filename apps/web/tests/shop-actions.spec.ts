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

  test("product image upload and order refund UI parity are visible product gaps", async ({
    page,
  }) => {
    test.fail(
      true,
      "The current shop suite covers product/order APIs; stable image upload and refund controls still need dashboard UI surface.",
    );
    await loginWithSessionCookie(page, "owner@zook.local");
    await page.goto("/dashboard/shop");
    expect(await page.getByLabel(/product image/i).count()).toBeGreaterThan(0);
    expect(await page.getByRole("button", { name: /refund order/i }).count()).toBeGreaterThan(0);
  });
});
