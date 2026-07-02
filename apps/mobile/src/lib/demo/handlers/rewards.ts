import { getOfflineDemoRoleOverride } from "../../demo-mode";

let demoWithdrawalRequestedPaise = 0;

function nowIso() {
  return new Date().toISOString();
}

function hoursAgoIso(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function demoBody(init: { body?: unknown }) {
  return init.body && typeof init.body === "object" ? (init.body as Record<string, unknown>) : {};
}

function demoIsOwnerRole(role?: string | null) {
  const resolved = (role ?? getOfflineDemoRoleOverride()).toUpperCase();
  return resolved === "OWNER" || resolved === "ADMIN";
}

function demoRewardsWallet(role?: string | null) {
  if (demoIsOwnerRole(role)) {
    return {
      balancePaise: 0,
      pendingPaise: 0,
      payablePaise: 0,
      lifetimePaise: 0,
      currency: "INR",
      entries: [],
    };
  }
  const basePayable = 200000;
  const payablePaise = Math.max(0, basePayable - demoWithdrawalRequestedPaise);
  const entries: Array<Record<string, unknown>> = [
    {
      id: "rw-1",
      kind: "GYM_TO_ZOOK_CASH",
      label: "Referred FitZone Andheri (yearly)",
      amountPaise: 200000,
      status: "PAYABLE",
      createdAt: hoursAgoIso(24 * 20),
      referredName: "FitZone Andheri",
    },
    {
      id: "rw-2",
      kind: "GYM_TO_ZOOK_CASH",
      label: "Referred Pulse Gym (6-month)",
      amountPaise: 100000,
      status: "QUALIFIED",
      createdAt: hoursAgoIso(24 * 8),
      referredName: "Pulse Gym",
    },
    {
      id: "rw-3",
      kind: "MEMBER_TO_GYM_CASH",
      label: "Referred Aarav (new member)",
      amountPaise: 50000,
      status: "PAID",
      createdAt: hoursAgoIso(24 * 40),
      referredName: "Aarav S",
    },
    {
      id: "rw-4",
      kind: "GYM_TO_ZOOK_CASH",
      label: "Iron House (refunded)",
      amountPaise: 200000,
      status: "REVERSED",
      createdAt: hoursAgoIso(24 * 55),
      referredName: "Iron House",
    },
  ];
  if (demoWithdrawalRequestedPaise > 0) {
    entries.unshift({
      id: "rw-wd",
      kind: "WITHDRAWAL",
      label: "Withdrawal requested",
      amountPaise: -demoWithdrawalRequestedPaise,
      status: "REQUESTED",
      createdAt: nowIso(),
    });
  }
  return {
    balancePaise: payablePaise,
    pendingPaise: 100000,
    payablePaise,
    lifetimePaise: 250000,
    currency: "INR",
    entries,
  };
}

function demoGymReferral(role?: string | null) {
  const isOwner = demoIsOwnerRole(role);
  const code = isOwner ? "AAROGYA-GYM" : "NISHA-ZK";
  return {
    code,
    shareUrl: `https://zookfit.in/r/${code}`,
    qualifyingCycles: ["6-month", "Yearly"],
    ...(isOwner ? { rewardDays: 30 } : { rewardPaise: 200000 }),
    terms: isOwner
      ? "Earn 30 free days of Zook when a gym you refer subscribes to a 6-month or yearly plan."
      : "Earn up to ₹2,000 when a gym you refer subscribes to a 6-month or yearly plan. Paid out after a short review window.",
  };
}

function demoRequestWithdrawal(body: Record<string, unknown>) {
  const amount = Number(body.amountPaise) || 0;
  demoWithdrawalRequestedPaise += amount;
  return {
    withdrawal: {
      id: `wd-${Date.now()}`,
      amountPaise: amount,
      status: "REQUESTED",
      createdAt: nowIso(),
    },
  };
}

export function rewardsDemoResponse(
  pathname: string,
  searchParams: URLSearchParams,
  method: string,
  init: { body?: unknown },
) {
  if (pathname === "/me/rewards/wallet") {
    return demoRewardsWallet(searchParams.get("role"));
  }
  if (pathname === "/me/rewards/gym-referral") {
    return demoGymReferral(searchParams.get("role"));
  }
  if (pathname === "/me/rewards/withdrawals" && method === "POST") {
    return demoRequestWithdrawal(demoBody(init));
  }
  return undefined;
}
