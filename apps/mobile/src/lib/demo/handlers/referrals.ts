import { zookDemoFixtures } from "@zook/core/demo-fixtures";

function hoursAgoIso(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function demoBody(init: { body?: unknown }) {
  return init.body && typeof init.body === "object" ? (init.body as Record<string, unknown>) : {};
}

const demoReferralPolicy: Record<string, unknown> = {
  id: "referral-policy-demo",
  orgId: "org-aarogya-strength",
  enabled: true,
  referrerRewardType: "DAYS",
  referrerRewardValue: 7,
  referredDiscountType: "PERCENTAGE",
  referredDiscountValue: 1000,
  maxDiscountCapBps: 3000,
  maxReferralsPerMonth: 10,
  referralCodeExpiryDays: 90,
  trainerReferralEnabled: true,
  staffReferralEnabled: false,
  trainerRewardType: "DAYS",
  trainerRewardValue: 14,
  memberGymReferralRewardPaise: 250000,
};

function demoUpdateReferralPolicy(body: Record<string, unknown>) {
  for (const [key, value] of Object.entries(body)) {
    if (value !== undefined) demoReferralPolicy[key] = value;
  }
  return { policy: demoReferralPolicy };
}

function demoReferralCodes() {
  const referralCodes = zookDemoFixtures.referralCodes.map((code) => ({
    ...code,
    redemptionCount: 3,
    maxUses: 10,
  }));
  const rewards = [
    {
      id: "reward-1",
      status: "applied",
      rewardType: "CREDIT",
      rewardValue: 25000,
      createdAt: hoursAgoIso(24 * 12),
    },
    {
      id: "reward-2",
      status: "applied",
      rewardType: "CREDIT",
      rewardValue: 25000,
      createdAt: hoursAgoIso(24 * 6),
    },
    {
      id: "reward-3",
      status: "pending",
      rewardType: "CREDIT",
      rewardValue: 25000,
      createdAt: hoursAgoIso(24 * 2),
    },
  ];
  return {
    referralCodes,
    rewards,
    links: {
      web: "https://zookfit.in/r/ROHAN500",
      short: "zook.fit/r/ROHAN500",
      app: "zook://r/ROHAN500",
    },
    policy: { rewardValuePaise: 25000, rewardType: "CREDIT" },
  };
}

export function referralsDemoResponse(pathname: string, method: string, init: { body?: unknown }) {
  if (pathname === "/me/referral-codes") {
    return demoReferralCodes();
  }

  if (pathname.match(/^\/orgs\/[^/]+\/referral-policy$/)) {
    if (method === "PATCH" || method === "POST" || method === "PUT") {
      return demoUpdateReferralPolicy(demoBody(init));
    }
    return { policy: demoReferralPolicy };
  }

  return undefined;
}
