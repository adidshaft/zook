import type { PublicLocale } from "@/lib/public-i18n";

export function publicJoinHref(input: {
  username: string;
  plan: string;
  referralCode?: string | null | undefined;
  couponCode?: string | null | undefined;
  locale?: PublicLocale;
}) {
  const query = new URLSearchParams({ plan: input.plan });
  if (input.referralCode) {
    query.set("ref", input.referralCode);
  }
  if (input.couponCode) {
    query.set("coupon", input.couponCode);
  }
  if (input.locale === "hi") {
    query.set("lang", "hi");
  }
  return `/join/${input.username}?${query.toString()}`;
}
