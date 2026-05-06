import type { MemberRow, ShopOrder } from "./types";

export function memberLabel(member: MemberRow | null) {
  return member?.user?.name ?? member?.user?.email ?? "Member";
}

export function orderItemsSummary(order: ShopOrder) {
  const items = order.items ?? [];
  if (!items.length) return "No items listed";
  return items
    .slice(0, 2)
    .map((item) => `${item.quantity} x ${item.product?.name ?? "Item"}`)
    .join(", ");
}

export function phoneLast4(phone?: string | null) {
  const digits = phone?.replace(/\D/g, "") ?? "";
  return digits ? digits.slice(-4) : "not added";
}
