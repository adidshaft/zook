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

export function ageLabel(dateOfBirth?: string | Date | null) {
  if (!dateOfBirth) return "DOB not added";
  const date = new Date(dateOfBirth);
  if (Number.isNaN(date.getTime())) return "DOB not added";
  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const monthDelta = today.getMonth() - date.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < date.getDate())) {
    age -= 1;
  }
  return `${age} years`;
}
