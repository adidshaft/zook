import { zookDemoFixtures } from "@zook/core/demo-fixtures";
import { accountDemoResponse } from "./demo/handlers/account";
import { aiDemoResponse } from "./demo/handlers/ai";
import { attendanceDemoResponse } from "./demo/handlers/attendance";
import { authDemoResponse } from "./demo/handlers/auth";
import { classesDemoResponse } from "./demo/handlers/classes";
import { dietDemoResponse } from "./demo/handlers/diet";
import { engagementDemoResponse } from "./demo/handlers/engagement";
import { exerciseTemplatesDemoResponse } from "./demo/handlers/exercise-templates";
import { freshGymEmptyResponse } from "./demo/handlers/fresh-gym";
import { memberMembershipsDemoResponse } from "./demo/handlers/member-memberships";
import { memberNotificationsDemoResponse } from "./demo/handlers/member-notifications";
import { memberOverviewDemoResponse } from "./demo/handlers/member-overview";
import { membersReceptionDemoResponse } from "./demo/handlers/members-reception";
import { operationsDemoResponse } from "./demo/handlers/operations";
import { ownerAdminDemoResponse } from "./demo/handlers/owner-admin";
import { ownerDashboardDemoResponse } from "./demo/handlers/owner-dashboard";
import { personalTrainingDemoResponse } from "./demo/handlers/personal-training";
import { plansDemoResponse } from "./demo/handlers/plans";
import { publicOrgsDemoResponse } from "./demo/handlers/public-orgs";
import { referralsDemoResponse } from "./demo/handlers/referrals";
import { rewardsDemoResponse } from "./demo/handlers/rewards";
import { reviewsDemoResponse } from "./demo/handlers/reviews";
import {
  demoInvoices,
  demoPaymentDocument,
  demoSucceededPayment,
  shopPaymentsDemoResponse,
} from "./demo/handlers/shop-payments";
import { supportDemoResponse } from "./demo/handlers/support";
import {
  trackingDemoResponse,
} from "./demo/handlers/tracking";
import {
  isDemoFreshGym as readDemoFreshGym,
  setDemoFreshGym as writeDemoFreshGym,
} from "./demo/state";

function normalizePath(path: string) {
  return path.startsWith("/") ? path : `/${path}`;
}

function nowIso() {
  return new Date().toISOString();
}

function activeOrg() {
  return zookDemoFixtures.organizations[0];
}

// Attach the resolved plan + organization so cards can show the real plan
// name ("Hybrid Pro") instead of the generic "Membership" fallback.
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

function activeMembership() {
  return (
    zookDemoFixtures.memberships.find(
      (membership) => membership.id === "membership-aarav-hybrid",
    ) ?? null
  );
}

type DemoTransport = {
  request<T>(
    path: string,
    init?: { body?: unknown; method?: string } & Record<string, unknown>,
  ): Promise<T>;
};

export function createDemoTransport(): DemoTransport {
  return {
    request: demoMobileApiFetch,
  };
}

export function setDemoFreshGym(on: boolean) {
  writeDemoFreshGym(on);
}
export function isDemoFreshGym() {
  return readDemoFreshGym();
}

export async function demoMobileApiFetch<T>(
  path: string,
  init: { body?: unknown; method?: string } & Record<string, unknown> = {},
): Promise<T> {
  const parsed = new URL(normalizePath(path), "https://offline.zook.local");
  const pathname = parsed.pathname;
  const method = (init.method ?? "GET").toUpperCase();

  if (pathname === "/public/app-config" && method === "GET") {
    return {
      minimumAppVersion: { ios: null, android: null },
      storeUrls: { ios: null, android: null },
    } as T;
  }

  // Fresh-gym demo mode: a brand-new gym with no members/plans/activity yet,
  // so the empty states across the app can be seen (and demoed). Only affects
  // read lists; writes still work so you can populate from zero.
  if (isDemoFreshGym() && method === "GET") {
    const fresh = freshGymEmptyResponse(pathname);
    if (fresh !== undefined) {
      return fresh as T;
    }
  }

  const authResponse = authDemoResponse(pathname, init);
  if (authResponse !== undefined) {
    return authResponse as T;
  }
  const supportResponse = supportDemoResponse(pathname, method);
  if (supportResponse !== undefined) {
    return supportResponse as T;
  }

  const accountResponse = accountDemoResponse(pathname, method, init);
  if (accountResponse !== undefined) {
    return accountResponse as T;
  }

  const memberOverviewResponse = memberOverviewDemoResponse(pathname);
  if (memberOverviewResponse !== undefined) {
    return memberOverviewResponse as T;
  }

  const rewardsResponse = rewardsDemoResponse(pathname, parsed.searchParams, method, init);
  if (rewardsResponse !== undefined) {
    return rewardsResponse as T;
  }

  const engagementResponse = engagementDemoResponse(pathname);
  if (engagementResponse !== undefined) {
    return engagementResponse as T;
  }

  const memberMembershipsResponse = memberMembershipsDemoResponse(pathname, method, init, {
    activeMembership,
    activeOrg,
    demoInvoices,
    demoPaymentDocument,
    demoSucceededPayment,
    enrichMembership,
    nowIso,
  });
  if (memberMembershipsResponse !== undefined) {
    return memberMembershipsResponse as T;
  }
  const attendanceResponse = attendanceDemoResponse(pathname, method, init, {
    activeOrg,
    nowIso,
  });
  if (attendanceResponse !== undefined) {
    return attendanceResponse as T;
  }
  const plansResponse = plansDemoResponse(pathname, method, init);
  if (plansResponse !== undefined) {
    return plansResponse as T;
  }

  const memberNotificationsResponse = memberNotificationsDemoResponse(pathname, method, init, {
    nowIso,
  });
  if (memberNotificationsResponse !== undefined) {
    return memberNotificationsResponse as T;
  }
  const trackingResponse = trackingDemoResponse(pathname, method, init);
  if (trackingResponse !== undefined) {
    return trackingResponse as T;
  }

  const referralsResponse = referralsDemoResponse(pathname, method, init);
  if (referralsResponse !== undefined) {
    return referralsResponse as T;
  }

  const publicOrgsResponse = publicOrgsDemoResponse(pathname, Boolean(init.token), {
    activeMembership,
    activeOrg,
  });
  if (publicOrgsResponse !== undefined) {
    return publicOrgsResponse as T;
  }


  const ownerDashboardResponse = ownerDashboardDemoResponse(pathname, init);
  if (ownerDashboardResponse !== undefined) {
    return ownerDashboardResponse as T;
  }

  const membersReceptionResponse = membersReceptionDemoResponse(pathname, init);
  if (membersReceptionResponse !== undefined) {
    return membersReceptionResponse as T;
  }

  const shopPaymentsResponse = shopPaymentsDemoResponse(pathname, method, init);
  if (shopPaymentsResponse !== undefined) {
    return shopPaymentsResponse as T;
  }

  const dietResponse = dietDemoResponse(pathname, method, init);
  if (dietResponse !== undefined) {
    return dietResponse as T;
  }

  const exerciseTemplatesResponse = exerciseTemplatesDemoResponse(pathname, method, init);
  if (exerciseTemplatesResponse !== undefined) {
    return exerciseTemplatesResponse as T;
  }

  const classesResponse = classesDemoResponse(pathname, method, init);
  if (classesResponse !== undefined) {
    return classesResponse as T;
  }

  const ownerAdminResponse = ownerAdminDemoResponse(pathname, method, init);
  if (ownerAdminResponse !== undefined) {
    return ownerAdminResponse as T;
  }

  const personalTrainingResponse = personalTrainingDemoResponse(pathname, method, init);
  if (personalTrainingResponse !== undefined) {
    return personalTrainingResponse as T;
  }

  const reviewsResponse = reviewsDemoResponse(pathname, method, init);
  if (reviewsResponse !== undefined) {
    return reviewsResponse as T;
  }

  const aiResponse = aiDemoResponse(pathname);
  if (aiResponse !== undefined) {
    return aiResponse as T;
  }

  const operationsResponse = operationsDemoResponse(pathname, method, init);
  if (operationsResponse !== undefined) {
    return operationsResponse as T;
  }
  throw new Error("This action is not available in local test mode.");
}
