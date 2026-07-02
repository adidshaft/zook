import { zookDemoFixtures } from "@zook/core/demo-fixtures";

type MembershipHelpers = {
  activeMembership: () => (typeof zookDemoFixtures.memberships)[number] | null;
  activeOrg: () => (typeof zookDemoFixtures.organizations)[number] | undefined;
  demoInvoices: () => Array<Record<string, unknown>>;
  demoPaymentDocument: (paymentId: string, kind: "receipt" | "invoice") => Record<string, unknown>;
  demoSucceededPayment: () => Record<string, unknown>;
  enrichMembership: <T extends { planId?: string | null; orgId?: string | null; daysLeft?: number | null }>(
    membership: T | null,
  ) => (T & { plan?: { name?: string | null } | null }) | null;
  nowIso: () => string;
};

export function memberMembershipsDemoResponse(
  pathname: string,
  method: string,
  init: { body?: unknown },
  helpers: MembershipHelpers,
) {
  if (pathname === "/me/membership/active") {
    return { membership: helpers.enrichMembership(helpers.activeMembership()) };
  }

  if (pathname.startsWith("/r/")) {
    const referralCode = pathname.split("/").at(-1)?.toUpperCase();
    const referral = zookDemoFixtures.referralCodes.find(
      (candidate) => candidate.code === referralCode,
    );
    return {
      referral: referral ?? null,
      org: referral ? helpers.activeOrg() : null,
    };
  }

  if (pathname === "/me/memberships") {
    return {
      subscriptions: zookDemoFixtures.memberships.map((membership) =>
        helpers.enrichMembership(membership),
      ),
      payments: [helpers.demoSucceededPayment(), ...zookDemoFixtures.payments],
    };
  }

  if (pathname === "/me/invoices") {
    return { invoices: helpers.demoInvoices() };
  }

  const docMatch = pathname.match(/^\/me\/payments\/([^/]+)\/(receipt|invoice)$/);
  if (docMatch && method === "POST") {
    return helpers.demoPaymentDocument(docMatch[1], docMatch[2] as "receipt" | "invoice");
  }

  if (pathname.match(/^\/me\/memberships\/[^/]+\/renew$/)) {
    return {
      checkoutUrl: "/checkout/mock/offline-renewal",
      session: { id: "offline-renewal", status: "CREATED", provider: "mock" },
      subscription: {
        ...(helpers.activeMembership() ?? {}),
        renewedAt: helpers.nowIso(),
        planId: (init.body as { planId?: string } | undefined)?.planId,
      },
    };
  }

  if (pathname.match(/^\/me\/memberships\/[^/]+\/autopay$/) && method === "POST") {
    return {
      checkoutUrl: null,
      session: null,
      mandate: {
        id: "offline-autopay",
        provider: "mock",
        status: "ACTIVE",
        nextChargeAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
    };
  }

  if (pathname.match(/^\/me\/memberships\/[^/]+\/autopay$/) && method === "DELETE") {
    return {
      mandate: {
        id: "offline-autopay",
        provider: "mock",
        status: "CANCELLED",
        cancelledAt: helpers.nowIso(),
      },
    };
  }

  const cancelMembershipMatch = pathname.match(/^\/me\/memberships\/([^/]+)\/cancel$/);
  if (cancelMembershipMatch && method === "POST") {
    const target = zookDemoFixtures.memberships.find(
      (membership) => membership.id === cancelMembershipMatch[1],
    );
    if (target) {
      target.status = "CANCELLED";
      target.daysLeft = 0;
      const enriched = helpers.enrichMembership(target);
      const planName = enriched?.plan?.name ?? "your membership";
      zookDemoFixtures.notifications.unshift({
        id: `notif-membership-cancelled-${Date.now()}`,
        orgId: target.orgId ?? "org-aarogya-strength",
        userId: "user-aarav",
        type: "TRANSACTIONAL",
        title: "Membership cancelled",
        message: `${planName} has been cancelled. Rejoin this gym or explore a new one to restore your access.`,
        targetRoute: "/membership",
        readAt: null,
        createdAt: helpers.nowIso(),
      });
    }
    return {
      subscription: helpers.enrichMembership(target ?? helpers.activeMembership()) ?? null,
    };
  }

  return undefined;
}
