import { zookDemoFixtures } from "@zook/core/demo-fixtures";
import { demoShopOrders } from "./shop-payments";

function nowIso() {
  return new Date().toISOString();
}

function activeOrg() {
  return zookDemoFixtures.organizations[0];
}

function demoMembers() {
  return zookDemoFixtures.memberProfiles.map((profile) => {
    const user =
      zookDemoFixtures.users.find((candidate) => candidate.id === profile.userId) ?? null;
    const activeSubscription =
      zookDemoFixtures.memberships.find(
        (membership) => membership.memberUserId === profile.userId,
      ) ?? null;
    const lastCheckIn =
      zookDemoFixtures.attendanceAttempts.find(
        (attempt) => attempt.memberUserId === profile.userId,
      ) ?? null;
    const trainer =
      zookDemoFixtures.users.find((candidate) => candidate.id === profile.assignedTrainerId) ??
      null;
    return {
      profile: {
        id: profile.id,
        userId: profile.userId,
        orgId: activeOrg()?.id ?? "org-demo",
        fitnessGoal: profile.goal,
        notes: profile.goal,
        profilePhotoUrl: null,
        createdAt: nowIso(),
      },
      user,
      activeSubscription,
      lastCheckIn,
      assignedTrainer: trainer,
    };
  });
}

export function membersReceptionDemoResponse(pathname: string, init: { body?: unknown }) {
  if (pathname.endsWith("/members")) {
    return { members: demoMembers() };
  }

  if (pathname.match(/^\/orgs\/[^/]+\/members\/[^/]+$/)) {
    const memberUserId = pathname.split("/").at(-1);
    const member = demoMembers().find((candidate) => candidate.profile.userId === memberUserId);
    return { member: member ?? demoMembers()[0] };
  }

  if (pathname.endsWith("/attendance/live") || pathname.endsWith("/attendance/pending")) {
    return { records: zookDemoFixtures.attendanceAttempts };
  }

  if (pathname.endsWith("/attendance/today")) {
    return { records: zookDemoFixtures.attendanceAttempts };
  }

  if (pathname.endsWith("/reception/verify-code")) {
    const body = init.body as { code?: string } | undefined;
    const normalized = body?.code?.trim().toUpperCase();
    const attendance = zookDemoFixtures.attendanceAttempts.find(
      (attempt) => attempt.entryCode === normalized,
    );
    if (attendance) {
      return {
        match: {
          type: "attendance",
          valid: attendance.status === "APPROVED",
          record: { status: attendance.status, entryCode: attendance.entryCode },
          user: zookDemoFixtures.users.find((user) => user.id === attendance.memberUserId) ?? null,
        },
      };
    }

    const order = demoShopOrders().find((candidate) => candidate.pickupCode === normalized);
    if (order) {
      return {
        match: {
          type: "pickup",
          valid: order.status === "READY_FOR_PICKUP" || order.status === "PAID",
          pickupCode: { status: order.status, code: order.pickupCode },
          order: { status: order.status, totalPaise: order.totalPaise },
          user: order.user,
        },
      };
    }

    return { match: null };
  }

  return undefined;
}
