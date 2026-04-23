import type { OrderStatus } from "../types";

export interface ProductStock {
  id: string;
  stock: number;
  pricePaise: number;
  active: boolean;
}

export interface ShopOrderState {
  id: string;
  status: OrderStatus;
  totalPaise: number;
  pickupCode?: string;
}

export function calculateShopOrder(input: { products: ProductStock[]; items: Array<{ productId: string; quantity: number }> }): { totalPaise: number; stockDeltas: Array<{ productId: string; delta: number }> } {
  let totalPaise = 0;
  const stockDeltas: Array<{ productId: string; delta: number }> = [];
  for (const item of input.items) {
    const product = input.products.find((candidate) => candidate.id === item.productId);
    if (!product || !product.active) {
      throw new Error("Product unavailable");
    }
    if (product.stock < item.quantity) {
      throw new Error("Product out of stock");
    }
    totalPaise += product.pricePaise * item.quantity;
    stockDeltas.push({ productId: product.id, delta: -item.quantity });
  }
  return { totalPaise, stockDeltas };
}

export function markShopOrderPaid(order: ShopOrderState, pickupCode: string): ShopOrderState {
  if (order.status !== "PENDING_PAYMENT") {
    throw new Error("Only pending orders can be paid");
  }
  return { ...order, status: "READY_FOR_PICKUP", pickupCode };
}

export function fulfillShopOrder(order: ShopOrderState): ShopOrderState {
  if (order.status === "FULFILLED") {
    throw new Error("Order already fulfilled");
  }
  if (order.status !== "READY_FOR_PICKUP" && order.status !== "PAID") {
    throw new Error("Order is not ready for pickup");
  }
  return { ...order, status: "FULFILLED" };
}
