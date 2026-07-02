import { zookDemoFixtures } from "@zook/core/demo-fixtures";

function nowIso() {
  return new Date().toISOString();
}

function activeMembership() {
  return (
    zookDemoFixtures.memberships.find(
      (membership) => membership.id === "membership-aarav-hybrid",
    ) ?? null
  );
}

function latestBadgePayload() {
  return {
    id: "offline-badge-first",
    badgeId: "badge-first-checkin",
    code: "first_checkin",
    name: "First check-in",
    description: "Completed the first gym check-in.",
    icon: "checkmark-circle-outline",
    awardedAt: zookDemoFixtures.attendanceAttempts[0]?.checkedInAt ?? nowIso(),
    metadata: { totalCheckIns: zookDemoFixtures.attendanceAttempts.length },
  };
}

export function demoMemberEngagementPayload() {
  const membership = activeMembership();
  const streakDays = membership?.streakDays ?? 0;
  const latestBadge = latestBadgePayload();
  return {
    streakDays,
    totalCheckIns: zookDemoFixtures.attendanceAttempts.length,
    badges: [latestBadge],
    latestBadge,
    nextMilestone: {
      code: "streak_7",
      name: "7-day streak",
      description: "Checked in for 7 days in a row.",
      icon: "flame-outline",
      metric: "streakDays",
      target: 7,
      current: streakDays,
      remaining: Math.max(0, 7 - streakDays),
      progress: Math.max(0, Math.min(1, streakDays / 7)),
    },
  };
}

export function engagementDemoResponse(pathname: string) {
  if (pathname === "/me/badges") {
    return { badges: [latestBadgePayload()] };
  }
  if (pathname === "/me/engagement") {
    return demoMemberEngagementPayload();
  }
  return undefined;
}
