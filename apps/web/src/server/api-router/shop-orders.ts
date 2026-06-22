import { publicUserEmail } from "@zook/core";
import { getPaymentProviderDiagnostics } from "@zook/core/providers";
import { calculateShopOrder, fulfillShopOrderForContext } from "@zook/core/services";
import { prisma } from "@zook/db";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { getRequestContext, requireAuth, requireOrgPermission } from "../access";
import { writeAuditLog } from "../audit";
import { getOrganizationActiveShopOrders } from "../domains/shop-orders/read-models";
import { notFoundError, validationError } from "../errors";
import { ok, readJson } from "../response";
import {
  assertBranchAccessForContext,
  clean,
  createDirectNotification,
  getPaymentProviderOrThrow,
  pathMatches,
  queryBranchId,
  resolveOrgBranch,
  startPaymentSessionCheckout,
} from "./core";

const shopOrderSchema = z.object({
  orgId: z.string(),
  branchId: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string(),
        quantity: z.number().int().positive(),
      }),
    )
    .min(1),
});

export async function handleShopOrders(request: NextRequest, path: string[]) {
  if (request.method === "POST" && pathMatches(path, ["shop", "orders"])) {
    const userId = requireAuth(await getRequestContext(request));
    const body = shopOrderSchema.parse(await readJson(request));
    getPaymentProviderOrThrow();
    const [products, user] = await Promise.all([
      prisma.product.findMany({
        where: { id: { in: body.items.map((item) => item.productId) }, orgId: body.orgId },
      }),
      prisma.user.findUnique({ where: { id: userId } }),
    ]);
    const inferredBranchId =
      body.branchId ?? products.find((product) => product.branchId)?.branchId;
    const branch = await resolveOrgBranch(body.orgId, inferredBranchId);
    if (products.some((product) => product.branchId && product.branchId !== branch.id)) {
      throw validationError("Shop products must belong to the selected branch.");
    }
    const calculation = calculateShopOrder({
      products: products.map((product) => ({
        id: product.id,
        stock: product.stock,
        pricePaise: product.pricePaise,
        active: product.active,
      })),
      items: body.items,
    });
    const order = await prisma.shopOrder.create({
      data: { orgId: body.orgId, branchId: branch.id, userId, totalPaise: calculation.totalPaise },
    });
    await prisma.shopOrderItem.createMany({
      data: body.items.map((item) => ({
        orgId: body.orgId,
        orderId: order.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPaise: products.find((product) => product.id === item.productId)?.pricePaise ?? 0,
      })),
    });
    const session = await prisma.paymentSession.create({
      data: {
        orgId: body.orgId,
        branchId: branch.id,
        userId,
        purpose: "SHOP_ORDER",
        amountPaise: calculation.totalPaise,
        checkoutUrl: "",
        provider: getPaymentProviderDiagnostics().selectedProvider,
        metadata: { shopOrderId: order.id, branchId: branch.id },
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });
    let started;
    try {
      started = await startPaymentSessionCheckout({
        session,
        customer: clean({
          name: user?.name ?? undefined,
          email: publicUserEmail(user?.email),
          phone: user?.phone ?? undefined,
        }),
      });
      await prisma.shopOrder.update({
        where: { id: order.id },
        data: { paymentSessionId: session.id },
      });
    } catch (error) {
      await prisma.$transaction([
        prisma.paymentSession.update({
          where: { id: session.id },
          data: { status: "FAILED", completedAt: new Date() },
        }),
        prisma.shopOrder.update({
          where: { id: order.id },
          data: { status: "CANCELLED", paymentSessionId: session.id },
        }),
      ]);
      throw error;
    }
    return ok({
      order,
      checkoutUrl: started.checkoutUrl,
      checkoutData: started.checkout.checkoutData ?? null,
      session: started.session,
    });
  }
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "shop", "orders"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgPermission(ctx, orgId, "SHOP_FULFILL_ORDER");
    const branchId = await assertBranchAccessForContext(ctx, orgId, queryBranchId(request));
    const orders = await prisma.shopOrder.findMany({
      where: { orgId, ...(branchId ? { branchId } : {}) },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    const items = await prisma.shopOrderItem.findMany({
      where: { orderId: { in: orders.map((order) => order.id) } },
    });
    return ok({
      orders: orders.map((order) => ({
        ...order,
        items: items.filter((item) => item.orderId === order.id),
      })),
    });
  }
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "shop", "orders", "active"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgPermission(ctx, orgId, "SHOP_FULFILL_ORDER");
    const branchId = await assertBranchAccessForContext(ctx, orgId, queryBranchId(request));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [orders, fulfilledToday] = await Promise.all([
      getOrganizationActiveShopOrders(orgId, clean({ branchId })),
      prisma.shopOrder.count({
        where: {
          orgId,
          status: "FULFILLED",
          fulfilledAt: { gte: today },
          ...(branchId ? { branchId } : {}),
        },
      }),
    ]);
    return ok({ orders, summary: { fulfilledToday } });
  }
  if (
    request.method === "POST" &&
    pathMatches(path, ["orgs", /.+/, "shop", "orders", /.+/, "fulfill"])
  ) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "SHOP_FULFILL_ORDER");
    const existingOrder = await prisma.shopOrder.findFirst({ where: { id: path[4]!, orgId } });
    if (!existingOrder) {
      throw notFoundError("Shop order not found");
    }
    await assertBranchAccessForContext(ctx, orgId, existingOrder.branchId);
    const fulfillBody = z
      .object({
        pickupCodeSkipped: z.boolean().optional(),
        skipReason: z.string().trim().max(200).optional(),
      })
      .parse(await readJson(request).catch(() => ({})));
    const fulfilled = fulfillShopOrderForContext({
      ctx,
      orgId,
      order: {
        id: existingOrder.id,
        status: existingOrder.status,
        totalPaise: existingOrder.totalPaise,
        ...(existingOrder.pickupCode ? { pickupCode: existingOrder.pickupCode } : {}),
      },
    });
    const order = await prisma.shopOrder.update({
      where: { id: existingOrder.id },
      data: { status: fulfilled.status, fulfilledById: userId, fulfilledAt: new Date() },
    });
    await prisma.pickupCode.updateMany({
      where: { orderId: existingOrder.id },
      data: { status: fulfilled.status, fulfilledAt: new Date() },
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "shop_order.fulfilled",
      entityType: "shop_order",
      entityId: order.id,
      metadata: {
        pickupCodeSkipped: Boolean(fulfillBody.pickupCodeSkipped),
        skipReason: fulfillBody.skipReason ?? null,
      },
    });
    await createDirectNotification({
      orgId,
      createdById: userId,
      type: "TRANSACTIONAL",
      title: "Pickup completed",
      body: "Your shop order has been marked as picked up.",
      audience: "single_member",
      metadata: {
        shopOrderId: order.id,
        branchId: order.branchId,
        status: order.status,
      },
      userIds: [order.userId],
    });
    return ok({ order });
  }
  return undefined;
}
