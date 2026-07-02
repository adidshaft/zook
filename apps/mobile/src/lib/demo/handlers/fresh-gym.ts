/**
 * Empty payloads for the read endpoints that drive list/empty states, so the
 * "fresh gym, no data yet" experience can be exercised. Returns undefined to
 * fall through to normal demo data for anything not listed here.
 */
export function freshGymEmptyResponse(pathname: string): unknown {
  if (pathname.match(/^\/orgs\/[^/]+\/members$/)) return { members: [] };
  if (pathname.match(/^\/orgs\/[^/]+\/membership-plans$/)) return { plans: [] };
  if (pathname.match(/^\/orgs\/[^/]+\/classes$/)) return { classes: [] };
  if (pathname.match(/^\/orgs\/[^/]+\/coupons$/)) return { coupons: [] };
  if (pathname.match(/^\/orgs\/[^/]+\/join-requests$/)) return { joinRequests: [] };
  if (pathname.match(/^\/orgs\/[^/]+\/payouts$/)) return { payouts: [] };
  if (pathname.match(/^\/orgs\/[^/]+\/products$/)) return { products: [] };
  if (pathname.match(/^\/orgs\/[^/]+\/shop\/orders\/active$/)) return { orders: [] };
  if (pathname.match(/^\/orgs\/[^/]+\/payments\/recent/)) return { payments: [] };
  if (pathname === "/me/notifications") return { notifications: [], unreadCount: 0 };
  if (pathname === "/me/coaching") return { subscription: null, trainer: null, plan: null, sessions: [] };
  return undefined;
}
