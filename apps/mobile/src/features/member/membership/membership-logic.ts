export type MembershipLike = {
  id: string;
  createdAt?: string | null;
  endsAt?: string | null;
  planId?: string | null;
  status?: string | null;
  plan?: { id?: string | null } | null;
};

export function daysUntil(dateStr?: string | null, nowMs = Date.now()) {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - nowMs;
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function pauseMinimumDate(now = new Date()) {
  const date = new Date(now);
  date.setDate(date.getDate() + 1);
  date.setHours(12, 0, 0, 0);
  return date;
}

export function pauseDefaultDate(now = new Date()) {
  const date = pauseMinimumDate(now);
  date.setDate(date.getDate() + 6);
  return date;
}

export const pauseReasonOptions = ["Medical", "Travel", "Injury", "Other"];

export function planIdFor(subscription?: MembershipLike | null) {
  return subscription?.plan?.id ?? subscription?.planId ?? undefined;
}

export function shouldShowJoinDifferentGym(subscription?: MembershipLike | null) {
  const status = String(subscription?.status ?? "").toUpperCase();
  return (
    !subscription ||
    status.includes("CANCEL") ||
    status.includes("EXPIRED") ||
    status.includes("INACTIVE")
  );
}

export function checkoutUrl(url: string | null | undefined, toWebUrl: (path: string) => string) {
  if (!url) return null;
  return /^https?:\/\//i.test(url) ? url : toWebUrl(url);
}

export function checkoutUrlWithReturnUrl(
  url: string | null | undefined,
  sessionId: string | null | undefined,
  toWebUrl: (path: string) => string,
) {
  const resolvedUrl = checkoutUrl(url, toWebUrl);
  if (!resolvedUrl || !sessionId) return resolvedUrl;
  const returnUrl = `zook://payments/return?target=membership&session=${encodeURIComponent(sessionId)}`;
  try {
    const parsed = new URL(resolvedUrl);
    parsed.searchParams.set("return_url", returnUrl);
    return parsed.toString();
  } catch {
    const separator = resolvedUrl.includes("?") ? "&" : "?";
    return `${resolvedUrl}${separator}return_url=${encodeURIComponent(returnUrl)}`;
  }
}

export function subscriptionStatusRank(status?: string | null) {
  if (status === "ACTIVE") return 0;
  if (status === "PENDING_PAYMENT" || status === "PENDING") return 1;
  if (status === "PAUSED" || status === "PAST_DUE") return 2;
  return 3;
}

export function subscriptionTimestamp(subscription: MembershipLike) {
  return new Date(
    subscription.endsAt ?? subscription.createdAt ?? "1970-01-01T00:00:00.000Z",
  ).getTime();
}

export function sortMemberships<T extends MembershipLike>(
  memberships: T[],
  focusedSubscriptionId?: string | null,
) {
  return [...memberships].sort((left, right) => {
    if (left.id === focusedSubscriptionId) return -1;
    if (right.id === focusedSubscriptionId) return 1;
    const statusDelta = subscriptionStatusRank(left.status) - subscriptionStatusRank(right.status);
    if (statusDelta !== 0) return statusDelta;
    return subscriptionTimestamp(right) - subscriptionTimestamp(left);
  });
}

export function expiringSoonCount(memberships: MembershipLike[], nowMs = Date.now()) {
  return memberships.filter((subscription) => {
    if (subscription.status !== "ACTIVE" || !subscription.endsAt) return false;
    const days = daysUntil(subscription.endsAt, nowMs);
    return days !== null && days <= 30;
  }).length;
}
