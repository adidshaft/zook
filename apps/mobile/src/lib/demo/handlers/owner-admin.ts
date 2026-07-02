import { zookDemoFixtures } from "@zook/core/demo-fixtures";

function nowIso() {
  return new Date().toISOString();
}

function hoursAgoIso(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function demoBody(init: { body?: unknown }) {
  return init.body && typeof init.body === "object" ? (init.body as Record<string, unknown>) : {};
}

function activeOrg() {
  return zookDemoFixtures.organizations[0];
}

type DemoMembershipPlan = {
  id: string;
  orgId: string;
  name: string;
  description: string | null;
  type: string;
  pricePaise: number;
  durationDays: number | null;
  visitLimit: number | null;
  validityDays: number | null;
  publicVisible: boolean;
  active: boolean;
};

const demoMembershipPlans: DemoMembershipPlan[] = zookDemoFixtures.membershipPlans.map((plan) => ({
  id: plan.id,
  orgId: plan.orgId,
  name: plan.name,
  description: plan.description ?? null,
  type: plan.type,
  pricePaise: plan.pricePaise,
  durationDays: plan.durationDays ?? null,
  visitLimit: plan.visitLimit ?? null,
  validityDays: null,
  publicVisible: plan.publicVisible ?? true,
  active: true,
}));

function demoPlanFromBody(body: Record<string, unknown>, base?: DemoMembershipPlan): DemoMembershipPlan {
  const toNumber = (value: unknown) => {
    const parsed = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
    return Number.isFinite(parsed) ? parsed : null;
  };
  return {
    id: base?.id ?? `plan-${Date.now()}`,
    orgId: activeOrg()?.id ?? "org-demo",
    name: body.name !== undefined ? String(body.name) : (base?.name ?? "Plan"),
    description:
      body.description !== undefined
        ? String(body.description) || null
        : (base?.description ?? null),
    type: body.type !== undefined ? String(body.type) : (base?.type ?? "DURATION"),
    pricePaise:
      body.pricePaise !== undefined ? (toNumber(body.pricePaise) ?? 0) : (base?.pricePaise ?? 0),
    durationDays:
      body.durationDays !== undefined ? toNumber(body.durationDays) : (base?.durationDays ?? null),
    visitLimit: body.visitLimit !== undefined ? toNumber(body.visitLimit) : (base?.visitLimit ?? null),
    validityDays:
      body.validityDays !== undefined ? toNumber(body.validityDays) : (base?.validityDays ?? null),
    publicVisible:
      body.publicVisible !== undefined ? Boolean(body.publicVisible) : (base?.publicVisible ?? true),
    active: true,
  };
}

function demoCreateMembershipPlan(body: Record<string, unknown>) {
  const plan = demoPlanFromBody(body);
  demoMembershipPlans.unshift(plan);
  return { plan };
}

function demoUpdateMembershipPlan(planId: string, body: Record<string, unknown>) {
  const index = demoMembershipPlans.findIndex((plan) => plan.id === planId);
  if (index < 0) throw new Error("Plan not found.");
  const updated = demoPlanFromBody(body, demoMembershipPlans[index]);
  demoMembershipPlans[index] = updated;
  return { plan: updated };
}

function demoDeleteMembershipPlan(planId: string) {
  const index = demoMembershipPlans.findIndex((plan) => plan.id === planId);
  if (index >= 0) demoMembershipPlans.splice(index, 1);
  return { ok: true };
}

type DemoStaffRow = {
  id: string;
  userId: string;
  role: string;
  branchId: string | null;
  pending: boolean;
  user: { id: string; name: string | null; email: string };
};

const demoStaff: DemoStaffRow[] = [
  {
    id: "role-owner-owner",
    userId: "user-owner",
    role: "OWNER",
    branchId: null,
    pending: false,
    user: { id: "user-owner", name: "Aditya Rao", email: "owner@zook.local" },
  },
  {
    id: "role-rohan-trainer",
    userId: "user-rhea",
    role: "TRAINER",
    branchId: null,
    pending: false,
    user: { id: "user-rhea", name: "Coach Rohan", email: "trainer@zook.local" },
  },
  {
    id: "role-priya-reception",
    userId: "user-priya",
    role: "RECEPTIONIST",
    branchId: null,
    pending: false,
    user: { id: "user-priya", name: "Farah Khan", email: "reception@zook.local" },
  },
];

function demoStaffPayload() {
  return {
    staff: demoStaff.map((row) => ({
      id: row.id,
      userId: row.userId,
      role: row.role,
      branchId: row.branchId,
      pending: row.pending,
    })),
    users: demoStaff.map((row) => row.user),
  };
}

function demoInviteStaff(body: Record<string, unknown>) {
  const email = String(body.email ?? "").trim().toLowerCase();
  const role = String(body.role ?? "TRAINER");
  const id = `invite-${Date.now()}`;
  const userId = `pending-${Date.now()}`;
  demoStaff.push({
    id,
    userId,
    role,
    branchId: body.branchId ? String(body.branchId) : null,
    pending: true,
    user: { id: userId, name: email.split("@")[0] ?? email, email },
  });
  return { invite: { id, email, role } };
}

function demoUpdateStaffRole(assignmentId: string, body: Record<string, unknown>) {
  const row = demoStaff.find((entry) => entry.id === assignmentId);
  if (!row) throw new Error("Staff member not found.");
  row.role = String(body.role ?? row.role);
  row.branchId = body.branchId ? String(body.branchId) : null;
  return { assignment: { id: row.id, userId: row.userId, role: row.role, branchId: row.branchId } };
}

function demoRemoveStaff(assignmentId: string) {
  const index = demoStaff.findIndex((entry) => entry.id === assignmentId);
  if (index >= 0) demoStaff.splice(index, 1);
  return { ok: true };
}

type DemoCoupon = {
  id: string;
  orgId: string;
  code: string;
  type: "FIXED_AMOUNT" | "PERCENTAGE";
  valuePaise: number | null;
  valuePercentBps: number | null;
  active: boolean;
  maxRedemptions: number | null;
  redemptionCount: number;
  perUserLimit: number | null;
  applicablePlanId: string | null;
  createdAt: string;
};

const demoCoupons: DemoCoupon[] = [
  {
    id: "coupon-welcome",
    orgId: "org-aarogya-strength",
    code: "WELCOME15",
    type: "PERCENTAGE",
    valuePaise: null,
    valuePercentBps: 1500,
    active: true,
    maxRedemptions: 100,
    redemptionCount: 23,
    perUserLimit: 1,
    applicablePlanId: null,
    createdAt: hoursAgoIso(24 * 30),
  },
  {
    id: "coupon-festive",
    orgId: "org-aarogya-strength",
    code: "FESTIVE500",
    type: "FIXED_AMOUNT",
    valuePaise: 50000,
    valuePercentBps: null,
    active: true,
    maxRedemptions: null,
    redemptionCount: 8,
    perUserLimit: 1,
    applicablePlanId: null,
    createdAt: hoursAgoIso(24 * 6),
  },
];

function demoCouponFromBody(body: Record<string, unknown>, base?: DemoCoupon): DemoCoupon {
  const toNumber = (value: unknown) => {
    const parsed = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
    return Number.isFinite(parsed) ? parsed : null;
  };
  const type = (body.type !== undefined
    ? String(body.type)
    : base?.type ?? "PERCENTAGE") as DemoCoupon["type"];
  return {
    id: base?.id ?? `coupon-${Date.now()}`,
    orgId: activeOrg()?.id ?? "org-demo",
    code: body.code !== undefined ? String(body.code).toUpperCase() : base?.code ?? "CODE",
    type,
    valuePaise:
      type === "FIXED_AMOUNT"
        ? body.valuePaise !== undefined
          ? toNumber(body.valuePaise)
          : base?.valuePaise ?? null
        : null,
    valuePercentBps:
      type === "PERCENTAGE"
        ? body.valuePercentBps !== undefined
          ? toNumber(body.valuePercentBps)
          : base?.valuePercentBps ?? null
        : null,
    active: body.active !== undefined ? Boolean(body.active) : base?.active ?? true,
    maxRedemptions:
      body.maxRedemptions !== undefined ? toNumber(body.maxRedemptions) : base?.maxRedemptions ?? null,
    redemptionCount: base?.redemptionCount ?? 0,
    perUserLimit: body.perUserLimit !== undefined ? toNumber(body.perUserLimit) : base?.perUserLimit ?? null,
    applicablePlanId:
      body.applicablePlanId !== undefined
        ? String(body.applicablePlanId) || null
        : base?.applicablePlanId ?? null,
    createdAt: base?.createdAt ?? nowIso(),
  };
}

function demoCreateCoupon(body: Record<string, unknown>) {
  const coupon = demoCouponFromBody(body);
  demoCoupons.unshift(coupon);
  return { coupon };
}

function demoUpdateCoupon(couponId: string, body: Record<string, unknown>) {
  const index = demoCoupons.findIndex((coupon) => coupon.id === couponId);
  if (index < 0) throw new Error("Coupon not found.");
  const updated = demoCouponFromBody(body, demoCoupons[index]);
  demoCoupons[index] = updated;
  return { coupon: updated };
}

function demoDeleteCoupon(couponId: string) {
  const index = demoCoupons.findIndex((coupon) => coupon.id === couponId);
  if (index >= 0) demoCoupons.splice(index, 1);
  return { ok: true };
}

export function ownerAdminDemoResponse(pathname: string, method: string, init: { body?: unknown }) {
  if (pathname.match(/^\/orgs\/[^/]+\/setup-status$/)) {
    return {
      hasMembershipPlans: true,
      hasQrDisplayed: true,
      staffCount: 4,
      memberCount: 128,
      hasShopProducts: true,
    };
  }

  const planEditMatch = pathname.match(/^\/orgs\/[^/]+\/membership-plans\/([^/]+)$/);
  if (planEditMatch) {
    if (method === "DELETE") {
      return demoDeleteMembershipPlan(planEditMatch[1]);
    }
    if (method === "PATCH" || method === "PUT") {
      return demoUpdateMembershipPlan(planEditMatch[1], demoBody(init));
    }
  }
  if (pathname.match(/^\/orgs\/[^/]+\/membership-plans$/)) {
    if (method === "POST") {
      return demoCreateMembershipPlan(demoBody(init));
    }
    return { plans: demoMembershipPlans };
  }

  if (pathname.match(/^\/orgs\/[^/]+\/staff\/invite$/) && method === "POST") {
    return demoInviteStaff(demoBody(init));
  }
  const staffEditMatch = pathname.match(/^\/orgs\/[^/]+\/staff\/([^/]+)$/);
  if (staffEditMatch && staffEditMatch[1] !== "invite") {
    if (method === "DELETE") {
      return demoRemoveStaff(staffEditMatch[1]);
    }
    if (method === "PATCH" || method === "PUT") {
      return demoUpdateStaffRole(staffEditMatch[1], demoBody(init));
    }
  }
  if (pathname.match(/^\/orgs\/[^/]+\/staff$/)) {
    return demoStaffPayload();
  }

  const couponEditMatch = pathname.match(/^\/orgs\/[^/]+\/coupons\/([^/]+)$/);
  if (couponEditMatch && couponEditMatch[1] !== "validate") {
    if (method === "DELETE") {
      return demoDeleteCoupon(couponEditMatch[1]);
    }
    if (method === "PATCH" || method === "PUT") {
      return demoUpdateCoupon(couponEditMatch[1], demoBody(init));
    }
  }
  if (pathname.match(/^\/orgs\/[^/]+\/coupons$/)) {
    if (method === "POST") {
      return demoCreateCoupon(demoBody(init));
    }
    return { coupons: demoCoupons };
  }

  return undefined;
}
