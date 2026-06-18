import { prisma } from "@zook/db";
import type { DashboardBranchFilter } from "@/server/domains/shared/filters";
import { serializeUserForReadModel } from "@/server/domains/shared/read-serialization";
import { shopBranchFilter } from "./branch-filter";

export async function getOrganizationActiveShopOrders(
  orgId: string,
  filters: DashboardBranchFilter = {},
) {
  const orders = await prisma.shopOrder.findMany({
    where: {
      orgId,
      status: { in: ["PENDING_PAYMENT", "PAID", "READY_FOR_PICKUP"] },
      ...shopBranchFilter(filters),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const [items, users] = await Promise.all([
    prisma.shopOrderItem.findMany({ where: { orderId: { in: orders.map((order) => order.id) } } }),
    prisma.user.findMany({ where: { id: { in: orders.map((order) => order.userId) } } }),
  ]);
  const products = await prisma.product.findMany({
    where: { orgId, id: { in: [...new Set(items.map((item) => item.productId))] } },
  });
  const usersById = new Map(users.map((user) => [user.id, user]));
  const productsById = new Map(products.map((product) => [product.id, product]));

  return orders.map((order) => ({
    ...order,
    user: serializeUserForReadModel(usersById.get(order.userId) ?? null),
    items: items
      .filter((item) => item.orderId === order.id)
      .map((item) => ({
        ...item,
        product: productsById.get(item.productId) ?? null,
      })),
  }));
}

export async function getMyShopOrders(userId: string) {
  const orders = await prisma.shopOrder.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  const items = await prisma.shopOrderItem.findMany({
    where: { orderId: { in: orders.map((order) => order.id) } },
  });
  const products = await prisma.product.findMany({
    where: { id: { in: [...new Set(items.map((item) => item.productId))] } },
  });
  const productsById = new Map(products.map((product) => [product.id, product]));

  return orders.map((order) => ({
    ...order,
    items: items
      .filter((item) => item.orderId === order.id)
      .map((item) => ({
        ...item,
        product: productsById.get(item.productId) ?? null,
      })),
  }));
}
