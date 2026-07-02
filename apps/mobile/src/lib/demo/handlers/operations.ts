import { zookDemoFixtures } from "@zook/core/demo-fixtures";
import { startDemoCheckIn } from "../../demo-member-home";

function nowIso() {
  return new Date().toISOString();
}

function demoBody(init: { body?: unknown }) {
  return init.body && typeof init.body === "object" ? (init.body as Record<string, unknown>) : {};
}

function activeOrg() {
  return zookDemoFixtures.organizations[0];
}

function activeMembership() {
  return (
    zookDemoFixtures.memberships.find(
      (membership) => membership.id === "membership-aarav-hybrid",
    ) ?? null
  );
}

function enrichMembership<
  T extends { planId?: string | null; orgId?: string | null; daysLeft?: number | null },
>(membership: T | null) {
  if (!membership) return membership;
  const plan = zookDemoFixtures.membershipPlans.find((entry) => entry.id === membership.planId);
  const org =
    zookDemoFixtures.organizations.find((entry) => entry.id === membership.orgId) ?? activeOrg();
  const endsAt =
    typeof membership.daysLeft === "number"
      ? new Date(Date.now() + membership.daysLeft * 24 * 60 * 60 * 1000).toISOString()
      : null;
  return {
    ...membership,
    ...(endsAt ? { endsAt, expiresAt: endsAt } : {}),
    plan: plan
      ? {
          id: plan.id,
          name: plan.name,
          description: plan.description,
          type: plan.type,
          pricePaise: plan.pricePaise,
          durationDays: plan.durationDays,
          visitLimit: plan.visitLimit,
        }
      : null,
    organization: org ? { id: org.id, name: org.name, username: org.username } : null,
  };
}

export function operationsDemoResponse(pathname: string, method: string, init: { body?: unknown }) {
  const joinRequestsApproveBatchMatch = pathname.match(/^\/orgs\/[^/]+\/join-requests\/approve-batch$/);
  if (joinRequestsApproveBatchMatch && method === "POST") {
    const body = demoBody(init);
    const ids = Array.isArray(body.ids) ? body.ids : [];
    return { approved: ids.length };
  }

  if (pathname.match(/\/join-requests\/[^/]+\/approve$/)) {
    return { joinRequest: { id: "offline-join-request", status: "approved" } };
  }

  if (pathname.match(/\/join-requests\/[^/]+\/reject$/)) {
    return { joinRequest: { id: "offline-join-request", status: "rejected" } };
  }

  if (pathname.endsWith("/join-requests")) {
    if (init.body) {
      return {
        id: "offline-join-request",
        status: "PENDING",
        ...(init.body as object | undefined),
      };
    }
    return { joinRequests: zookDemoFixtures.joinRequests };
  }

  if (pathname.match(/^\/orgs\/[^/]+\/notifications$/) && method === "POST") {
    return { ok: true };
  }

  if (pathname.startsWith("/push/") && method === "POST") {
    return { ok: true };
  }

  const switchMatch = pathname.match(/^\/me\/memberships\/([^/]+)\/switch$/);
  if (switchMatch && method === "POST") {
    const body = demoBody(init);
    const target = zookDemoFixtures.memberships.find((membership) => membership.id === switchMatch[1]);
    if (target && body.planId) target.planId = String(body.planId);
    return { subscription: enrichMembership(target ?? activeMembership()) };
  }

  const pauseMatch = pathname.match(/^\/me\/memberships\/([^/]+)\/pause$/);
  if (pauseMatch && method === "POST") {
    const body = demoBody(init);
    const target = zookDemoFixtures.memberships.find((membership) => membership.id === pauseMatch[1]);
    if (target) {
      target.status = "PAUSED";
      const enriched = enrichMembership(target);
      const planName = enriched?.plan?.name ?? "your membership";
      const resumeDate = body.resumesAt
        ? new Date(String(body.resumesAt)).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
          })
        : "the selected date";
      zookDemoFixtures.notifications.unshift({
        id: `notif-membership-paused-${Date.now()}`,
        orgId: target.orgId ?? "org-aarogya-strength",
        userId: "user-aarav",
        type: "TRANSACTIONAL",
        title: "Membership paused",
        message: `${planName} is paused until ${resumeDate}. Your remaining days carry over. Resume any time to restore entry.`,
        targetRoute: "/membership",
        readAt: null,
        createdAt: nowIso(),
      });
    }
    return { subscription: enrichMembership(target ?? activeMembership()) };
  }

  const resumeMatch = pathname.match(/^\/me\/memberships\/([^/]+)\/resume$/);
  if (resumeMatch && method === "POST") {
    const target = zookDemoFixtures.memberships.find((membership) => membership.id === resumeMatch[1]);
    if (target) target.status = "ACTIVE";
    return { subscription: enrichMembership(target ?? activeMembership()) };
  }

  const approveAttendanceMatch = pathname.match(/^\/orgs\/[^/]+\/attendance\/([^/]+)\/approve$/);
  if (approveAttendanceMatch && method === "POST") {
    const record = zookDemoFixtures.attendanceAttempts.find(
      (attempt) => attempt.id === approveAttendanceMatch[1],
    );
    if (record) record.status = "APPROVED";
    return { attendance: record ?? { id: approveAttendanceMatch[1], status: "APPROVED" } };
  }

  const rejectAttendanceMatch = pathname.match(/^\/orgs\/[^/]+\/attendance\/([^/]+)\/reject$/);
  if (rejectAttendanceMatch && method === "POST") {
    const record = zookDemoFixtures.attendanceAttempts.find(
      (attempt) => attempt.id === rejectAttendanceMatch[1],
    );
    if (record) record.status = "REJECTED";
    return { attendance: record ?? { id: rejectAttendanceMatch[1], status: "REJECTED" } };
  }

  if (pathname.match(/^\/orgs\/[^/]+\/attendance\/manual$/) && method === "POST") {
    return { attendance: startDemoCheckIn(activeOrg()?.name ?? null) };
  }

  return undefined;
}
