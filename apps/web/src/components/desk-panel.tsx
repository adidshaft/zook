"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  CreditCard,
  IndianRupee,
  ListChecks,
  QrCode,
  Search,
  ShoppingBag,
  XCircle,
} from "lucide-react";
import { formatDate, formatDateTime, formatEnumLabel, formatInr } from "@/lib/format";
import { useOperationalResource } from "@/lib/use-operational-resource";
import { webApiFetch } from "@/lib/api-client";
import { GlassCard, Pill } from "./glass-card";
import { DashboardSignOutButton } from "./dashboard-sign-out-button";

type BranchSummary = { id: string; name: string; isDefault?: boolean; active?: boolean };

type AttendanceQueueRecord = {
  id: string;
  status: string;
  checkedInAt: string;
  suspiciousFlags?: string[] | null;
  branchName?: string | null;
  user?: { id?: string; name?: string | null; email?: string | null; phone?: string | null } | null;
  profile?: { profilePhotoUrl?: string | null } | null;
  plan?: { name?: string | null } | null;
  subscription?: { endsAt?: string | null; remainingVisits?: number | null } | null;
};

type MemberRow = {
  profile: { id: string; profilePhotoUrl?: string | null };
  user: { id: string; name: string; email: string; phone?: string | null } | null;
  lastCheckIn?: { checkedInAt: string; status: string } | null;
  activeSubscription?: {
    id: string;
    planId: string;
    status: string;
    endsAt?: string | null;
    remainingVisits?: number | null;
  } | null;
};

type PlanRow = { id: string; name: string; pricePaise: number; active: boolean };

type ShopOrder = {
  id: string;
  status: string;
  totalPaise: number;
  paymentId?: string | null;
  pickupCode?: string | null;
  user?: { id: string; name: string; email?: string | null; phone?: string | null } | null;
  items?: Array<{
    id: string;
    quantity: number;
    unitPaise: number;
    product?: { name?: string | null } | null;
  }>;
};

type TabKey = "queue" | "member" | "payment" | "pickup";

const tabs: Array<{ key: TabKey; label: string; icon: React.ReactNode }> = [
  { key: "queue", label: "Queue", icon: <ListChecks size={18} /> },
  { key: "member", label: "Member", icon: <Search size={18} /> },
  { key: "payment", label: "Payment", icon: <IndianRupee size={18} /> },
  { key: "pickup", label: "Pickup", icon: <ShoppingBag size={18} /> },
];

function withBranch(path: string, branch?: BranchSummary | null) {
  if (!branch?.id) return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}branchId=${encodeURIComponent(branch.id)}`;
}

function memberLabel(member: MemberRow | null) {
  return member?.user?.name ?? member?.user?.email ?? "Member";
}

function orderItemsSummary(order: ShopOrder) {
  const items = order.items ?? [];
  if (!items.length) return "No items listed";
  return items
    .slice(0, 2)
    .map((item) => `${item.quantity} x ${item.product?.name ?? "Item"}`)
    .join(", ");
}

function phoneLast4(phone?: string | null) {
  const digits = phone?.replace(/\D/g, "") ?? "";
  return digits ? digits.slice(-4) : "not added";
}

export function DeskPanel({
  orgId,
  orgName,
  branch,
}: {
  orgId: string;
  orgName: string;
  branch: BranchSummary | null;
}) {
  const [activeTab, setActiveTab] = useState<TabKey>("queue");
  const [busyId, setBusyId] = useState("");
  const [toast, setToast] = useState("");
  const [memberQuery, setMemberQuery] = useState("");
  const [selectedMember, setSelectedMember] = useState<MemberRow | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    memberUserId: "",
    planId: "",
    subscriptionId: "",
    amountRupees: "",
    mode: "CASH",
    receiptNumber: "",
    notes: "",
  });
  const [verifiedOrderIds, setVerifiedOrderIds] = useState<string[]>([]);
  const [lastReceipt, setLastReceipt] = useState<{
    title: string;
    amountPaise: number;
    mode: string;
    reference?: string | undefined;
  } | null>(null);

  const pendingState = useOperationalResource<{ records: AttendanceQueueRecord[] }>({
    path: withBranch(`/api/orgs/${orgId}/attendance/live`, branch),
    refreshMs: 15_000,
  });
  const todayState = useOperationalResource<{ records: AttendanceQueueRecord[] }>({
    path: withBranch(`/api/orgs/${orgId}/attendance/today`, branch),
    refreshMs: 30_000,
  });
  const membersState = useOperationalResource<{ members: MemberRow[] }>({
    path: `/api/orgs/${orgId}/members?limit=100`,
  });
  const plansState = useOperationalResource<{ plans: PlanRow[] }>({
    path: `/api/orgs/${orgId}/membership-plans`,
  });
  const ordersState = useOperationalResource<{ orders: ShopOrder[]; summary?: { fulfilledToday: number } }>({
    path: withBranch(`/api/orgs/${orgId}/shop/orders/active`, branch),
    refreshMs: 30_000,
  });

  const members = membersState.data?.members ?? [];
  const filteredMembers = useMemo(() => {
    const query = memberQuery.trim().toLowerCase();
    if (!query) return members.slice(0, 8);
    return members
      .filter((member) => {
        const user = member.user;
        return [user?.name, user?.email, user?.phone]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(query));
      })
      .slice(0, 12);
  }, [memberQuery, members]);

  function selectMember(member: MemberRow) {
    setSelectedMember(member);
    setPaymentForm((current) => ({
      ...current,
      memberUserId: member.user?.id ?? "",
      subscriptionId: member.activeSubscription?.id ?? "",
    }));
  }

  async function updateAttendance(recordId: string, action: "approve" | "reject") {
    try {
      setBusyId(recordId);
      setToast("");
      await webApiFetch(`/api/orgs/${orgId}/attendance/${recordId}/${action}`, {
        method: "POST",
        ...(action === "reject" ? { body: { reason: "Entry was rejected at the desk." } } : {}),
      });
      pendingState.reload();
      todayState.reload();
      setToast(action === "approve" ? "Entry approved." : "Entry rejected.");
    } catch (cause) {
      setToast(cause instanceof Error ? cause.message : "Unable to update entry.");
    } finally {
      setBusyId("");
    }
  }

  async function recordPayment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setBusyId("payment");
      setToast("");
      const amountPaise = Math.round(Number(paymentForm.amountRupees) * 100);
      const body = {
        memberUserId: paymentForm.memberUserId,
        planId: paymentForm.planId || undefined,
        subscriptionId: paymentForm.subscriptionId || undefined,
        amountPaise,
        mode: paymentForm.mode,
        receiptNumber: paymentForm.receiptNumber || undefined,
        notes: paymentForm.notes || undefined,
      };
      await webApiFetch(`/api/orgs/${orgId}/manual-payments`, { method: "POST", body });
      setToast(`Payment recorded. Receipt amount: ${formatInr(amountPaise)}.`);
      setLastReceipt({
        title: "Membership payment",
        amountPaise,
        mode: paymentForm.mode,
        reference: paymentForm.receiptNumber || undefined,
      });
      setPaymentForm((current) => ({ ...current, receiptNumber: "", notes: "" }));
    } catch (cause) {
      setToast(cause instanceof Error ? cause.message : "Unable to record payment.");
    } finally {
      setBusyId("");
    }
  }

  async function recordShopPayment(order: ShopOrder) {
    const reference = window.prompt("Reference number or UPI ID, if available", "") ?? "";
    try {
      setBusyId(`pay:${order.id}`);
      setToast("");
      await webApiFetch(`/api/orgs/${orgId}/shop/orders/${order.id}/manual-payment`, {
        method: "POST",
        body: {
          amountPaise: order.totalPaise,
          mode: "DIRECT_UPI",
          receiptNumber: reference || undefined,
          notes: "Recorded at reception pickup.",
        },
      });
      ordersState.reload();
      setLastReceipt({
        title: `Shop order ${order.id.slice(-8).toUpperCase()}`,
        amountPaise: order.totalPaise,
        mode: "DIRECT_UPI",
        reference: reference || undefined,
      });
      setToast(`Shop payment recorded. Receipt amount: ${formatInr(order.totalPaise)}.`);
    } catch (cause) {
      setToast(cause instanceof Error ? cause.message : "Unable to record shop payment.");
    } finally {
      setBusyId("");
    }
  }

  async function verifyPickupCode(order: ShopOrder) {
    const code = window.prompt("Enter the pickup code shown by the member", order.pickupCode ?? "");
    if (!code) {
      return;
    }
    try {
      setBusyId(`verify:${order.id}`);
      setToast("");
      await webApiFetch(`/api/orgs/${orgId}/reception/verify-code`, {
        method: "POST",
        body: { code },
      });
      setVerifiedOrderIds((current) =>
        current.includes(order.id) ? current : [...current, order.id],
      );
      setToast("Pickup code verified.");
    } catch (cause) {
      setToast(cause instanceof Error ? cause.message : "Unable to verify pickup code.");
    } finally {
      setBusyId("");
    }
  }

  async function fulfillOrder(orderId: string) {
    try {
      setBusyId(orderId);
      setToast("");
      await webApiFetch(`/api/orgs/${orgId}/shop/orders/${orderId}/fulfill`, { method: "POST" });
      ordersState.reload();
      setToast("Pickup marked fulfilled.");
    } catch (cause) {
      setToast(cause instanceof Error ? cause.message : "Unable to fulfill pickup.");
    } finally {
      setBusyId("");
    }
  }

  const pendingRecords = pendingState.data?.records ?? [];
  const todayRecords = todayState.data?.records ?? [];
  const activeOrders = ordersState.data?.orders ?? [];
  const activePlans = (plansState.data?.plans ?? []).filter((plan) => plan.active);

  return (
    <main className="min-h-dvh pb-28">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#070907]/92 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold uppercase tracking-[0.14em] text-white/70">
              {orgName}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Pill tone="lime">{branch?.name ?? "Main branch"}</Pill>
              <Pill>{todayRecords.length} check-ins today</Pill>
            </div>
          </div>
          <DashboardSignOutButton compact />
        </div>
      </header>

      <section className="mx-auto grid max-w-5xl gap-4 px-4 py-5">
        {toast ? (
          <div className="rounded-2xl border border-lime-300/25 bg-lime-300/10 px-4 py-3 text-sm text-lime-100">
            {toast}
          </div>
        ) : null}

        {activeTab === "queue" ? (
          <div className="grid gap-4">
            <GlassCard>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-semibold text-white">Today's queue</h1>
                  <p className="mt-1 text-sm text-white/48">
                    Review flagged entries and keep the check-in line moving.
                  </p>
                </div>
                <Pill tone={pendingRecords.length ? "amber" : "lime"}>
                  {pendingRecords.length} pending
                </Pill>
              </div>
              <div className="mt-5 grid gap-3">
                {pendingRecords.length ? (
                  pendingRecords.map((record) => (
                    <div key={record.id} className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                        <div>
                          <p className="font-medium text-white">
                            {record.user?.name ?? record.user?.email ?? "Member"}
                          </p>
                          <p className="mt-1 text-sm text-white/48">
                            {record.suspiciousFlags?.length
                              ? record.suspiciousFlags.map(formatEnumLabel).join(", ")
                              : formatEnumLabel(record.status)}
                            {" - "}
                            {formatDateTime(record.checkedInAt)}
                          </p>
                          <p className="mt-1 text-xs text-white/38">
                            {record.plan?.name ?? "Membership"} at {record.branchName ?? branch?.name ?? "branch"}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={busyId === record.id}
                            onClick={() => void updateAttendance(record.id, "approve")}
                            className="zook-focus inline-flex items-center gap-2 rounded-full bg-lime-300 px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
                          >
                            <CheckCircle2 size={16} />
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={busyId === record.id}
                            onClick={() => void updateAttendance(record.id, "reject")}
                            className="zook-focus inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-white/72 disabled:opacity-50"
                          >
                            <XCircle size={16} />
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[22px] border border-white/10 bg-black/20 p-5 text-sm text-white/48">
                    No entries need review right now.
                  </div>
                )}
              </div>
            </GlassCard>

            <GlassCard>
              <h2 className="text-xl font-semibold text-white">Recent check-ins</h2>
              <div className="mt-4 grid gap-2">
                {todayRecords.slice(0, 10).map((record) => (
                  <div key={record.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                    <span className="text-sm font-medium text-white/78">
                      {record.user?.name ?? record.user?.email ?? "Member"}
                    </span>
                    <span className="text-xs text-white/45">{formatDateTime(record.checkedInAt)}</span>
                  </div>
                ))}
                {!todayRecords.length ? (
                  <p className="text-sm text-white/45">No check-ins yet today.</p>
                ) : null}
              </div>
            </GlassCard>
          </div>
        ) : null}

        {activeTab === "member" ? (
          <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
            <GlassCard>
              <h1 className="text-2xl font-semibold text-white">Find a member</h1>
              <div className="mt-4 flex items-center gap-2 rounded-2xl border border-white/10 bg-black/25 px-3">
                <Search size={18} className="text-white/40" />
                <input
                  value={memberQuery}
                  onChange={(event) => setMemberQuery(event.target.value)}
                  placeholder="Search by name, phone, or email"
                  className="zook-focus min-h-12 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/32"
                />
              </div>
              <div className="mt-4 grid gap-2">
                {filteredMembers.map((member) => (
                  <button
                    key={member.profile.id}
                    type="button"
                    onClick={() => selectMember(member)}
                    className="zook-focus rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-left transition hover:bg-white/8"
                  >
                    <p className="text-sm font-medium text-white">{memberLabel(member)}</p>
                    <p className="mt-1 text-xs text-white/42">
                      Phone ending {phoneLast4(member.user?.phone)} - {member.activeSubscription ? formatEnumLabel(member.activeSubscription.status) : "No active plan"}
                    </p>
                  </button>
                ))}
              </div>
            </GlassCard>

            <GlassCard>
              {selectedMember ? (
                <>
                  <div className="flex items-start gap-4">
                    <div className="grid h-20 w-20 shrink-0 place-items-center rounded-3xl bg-lime-300/15 text-2xl font-semibold text-lime-100">
                      {memberLabel(selectedMember).slice(0, 1)}
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-2xl font-semibold text-white">{memberLabel(selectedMember)}</h2>
                      <p className="mt-1 text-sm text-white/48">
                        Phone ending {phoneLast4(selectedMember.user?.phone)}
                      </p>
                      {!selectedMember.profile.profilePhotoUrl ? (
                        <p className="mt-2 text-xs text-white/38">Profile photo not added yet.</p>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-5 grid gap-3">
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-white/35">Membership</p>
                      <p className="mt-2 text-lg font-semibold text-white">
                        {selectedMember.activeSubscription
                          ? formatEnumLabel(selectedMember.activeSubscription.status)
                          : "No active membership"}
                      </p>
                      <p className="mt-1 text-sm text-white/48">
                        Valid until {formatDate(selectedMember.activeSubscription?.endsAt)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-white/35">Recent activity</p>
                      <p className="mt-2 text-sm text-white/68">
                        Last check-in: {formatDateTime(selectedMember.lastCheckIn?.checkedInAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab("payment");
                          selectMember(selectedMember);
                        }}
                        className="zook-focus rounded-full bg-lime-300 px-4 py-2 text-sm font-semibold text-black"
                      >
                        Record payment
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-[22px] border border-dashed border-white/12 p-5 text-sm text-white/48">
                  Select a member to see membership status and quick actions.
                </div>
              )}
            </GlassCard>
          </div>
        ) : null}

        {activeTab === "payment" ? (
          <GlassCard>
            <div className="flex items-center gap-3">
              <CreditCard className="text-lime-200" size={22} />
              <div>
                <h1 className="text-2xl font-semibold text-white">Record payment</h1>
                <p className="mt-1 text-sm text-white/48">Use this for cash, UPI, card, or bank transfer collected at the desk.</p>
              </div>
            </div>
            <form className="mt-5 grid gap-4" onSubmit={(event) => void recordPayment(event)}>
              <label className="grid gap-2 text-sm text-white/62">
                Member
                <select
                  value={paymentForm.memberUserId}
                  onChange={(event) =>
                    setPaymentForm((current) => ({ ...current, memberUserId: event.target.value }))
                  }
                  className="zook-focus min-h-12 rounded-2xl border border-white/10 bg-black/30 px-4 text-white"
                  required
                >
                  <option value="" className="bg-black">Choose member</option>
                  {members.map((member) => (
                    <option key={member.profile.id} value={member.user?.id ?? ""} className="bg-black">
                      {memberLabel(member)}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm text-white/62">
                  Plan
                  <select
                    value={paymentForm.planId}
                    onChange={(event) => {
                      const plan = activePlans.find((candidate) => candidate.id === event.target.value);
                      setPaymentForm((current) => ({
                        ...current,
                        planId: event.target.value,
                        subscriptionId: "",
                        amountRupees: plan ? String(plan.pricePaise / 100) : current.amountRupees,
                      }));
                    }}
                    className="zook-focus min-h-12 rounded-2xl border border-white/10 bg-black/30 px-4 text-white"
                  >
                    <option value="" className="bg-black">Renew existing subscription</option>
                    {activePlans.map((plan) => (
                      <option key={plan.id} value={plan.id} className="bg-black">
                        {plan.name} - {formatInr(plan.pricePaise)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2 text-sm text-white/62">
                  Mode
                  <select
                    value={paymentForm.mode}
                    onChange={(event) =>
                      setPaymentForm((current) => ({ ...current, mode: event.target.value }))
                    }
                    className="zook-focus min-h-12 rounded-2xl border border-white/10 bg-black/30 px-4 text-white"
                  >
                    <option value="CASH" className="bg-black">Cash</option>
                    <option value="DIRECT_UPI" className="bg-black">UPI</option>
                    <option value="CARD" className="bg-black">Card</option>
                    <option value="BANK_TRANSFER" className="bg-black">Bank transfer</option>
                    <option value="OTHER" className="bg-black">Other</option>
                  </select>
                </label>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm text-white/62">
                  Amount
                  <input
                    value={paymentForm.amountRupees}
                    onChange={(event) =>
                      setPaymentForm((current) => ({ ...current, amountRupees: event.target.value }))
                    }
                    inputMode="decimal"
                    placeholder="2500"
                    className="zook-focus min-h-12 rounded-2xl border border-white/10 bg-black/30 px-4 text-white"
                    required
                  />
                </label>
                <label className="grid gap-2 text-sm text-white/62">
                  Reference number
                  <input
                    value={paymentForm.receiptNumber}
                    onChange={(event) =>
                      setPaymentForm((current) => ({ ...current, receiptNumber: event.target.value }))
                    }
                    placeholder="UPI ref or receipt number"
                    className="zook-focus min-h-12 rounded-2xl border border-white/10 bg-black/30 px-4 text-white"
                  />
                </label>
              </div>
              <label className="grid gap-2 text-sm text-white/62">
                Notes
                <textarea
                  value={paymentForm.notes}
                  onChange={(event) =>
                    setPaymentForm((current) => ({ ...current, notes: event.target.value }))
                  }
                  className="zook-focus min-h-24 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white"
                />
              </label>
              <button
                type="submit"
                disabled={busyId === "payment"}
                className="zook-focus min-h-12 rounded-full bg-lime-300 px-5 text-sm font-semibold text-black disabled:opacity-50"
              >
                {busyId === "payment" ? "Recording..." : "Record payment"}
              </button>
            </form>
            {lastReceipt ? (
              <div className="mt-5 rounded-[22px] border border-lime-300/20 bg-lime-300/10 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-lime-100/70">
                  Receipt ready
                </p>
                <p className="mt-2 text-lg font-semibold text-white">{lastReceipt.title}</p>
                <p className="mt-2 text-sm text-white/65">Amount: {formatInr(lastReceipt.amountPaise)}</p>
                <p className="mt-1 text-sm text-white/65">Mode: {formatEnumLabel(lastReceipt.mode)}</p>
                <p className="mt-1 text-sm text-white/65">Reference: {lastReceipt.reference || "Not added"}</p>
                <button type="button" onClick={() => window.print()} className="zook-focus mt-4 rounded-full border border-white/10 px-4 py-2 text-sm text-white/72">
                  Print receipt
                </button>
              </div>
            ) : null}
          </GlassCard>
        ) : null}

        {activeTab === "pickup" ? (
          <GlassCard>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-semibold text-white">Shop pickup</h1>
                <p className="mt-1 text-sm text-white/48">Verify pickup codes and mark ready orders fulfilled.</p>
              </div>
              <Pill tone="blue">{ordersState.data?.summary?.fulfilledToday ?? 0} fulfilled today</Pill>
            </div>
            <div className="mt-5 grid gap-3">
              {activeOrders.map((order) => {
                const verified = verifiedOrderIds.includes(order.id);
                return (
                  <div key={order.id} className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                      <div>
                        <p className="font-medium text-white">{order.user?.name ?? "Member"}</p>
                        <p className="mt-1 text-sm text-white/48">{orderItemsSummary(order)}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Pill tone={order.status === "READY_FOR_PICKUP" ? "lime" : "amber"}>
                            {formatEnumLabel(order.status)}
                          </Pill>
                          <Pill>{formatInr(order.totalPaise)}</Pill>
                          {verified ? <Pill tone="lime">Code verified</Pill> : null}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={busyId === `verify:${order.id}`}
                          onClick={() => void verifyPickupCode(order)}
                          className="zook-focus rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-white/72"
                        >
                          Verify code
                        </button>
                        {order.status === "PENDING_PAYMENT" && !order.paymentId ? (
                          <button
                            type="button"
                            disabled={busyId === `pay:${order.id}`}
                            onClick={() => void recordShopPayment(order)}
                            className="zook-focus rounded-full border border-lime-300/40 px-4 py-2 text-sm font-semibold text-lime-100 disabled:opacity-50"
                          >
                            Record payment
                          </button>
                        ) : null}
                        <button
                          type="button"
                          disabled={busyId === order.id || (!verified && order.status !== "READY_FOR_PICKUP")}
                          onClick={() => void fulfillOrder(order.id)}
                          className="zook-focus rounded-full bg-lime-300 px-4 py-2 text-sm font-semibold text-black disabled:opacity-45"
                        >
                          Mark fulfilled
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {!activeOrders.length ? (
                <p className="rounded-[22px] border border-white/10 bg-black/20 p-5 text-sm text-white/48">
                  No pickup orders are waiting right now.
                </p>
              ) : null}
            </div>
          </GlassCard>
        ) : null}
      </section>

      <Link
        href="/desk/qr"
        className="zook-focus fixed bottom-24 right-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-lime-300 text-black shadow-[var(--zook-shadow-glow-lime)]"
        aria-label="Show entry QR"
      >
        <QrCode size={24} />
      </Link>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[#070907]/94 px-3 py-2 backdrop-blur-xl">
        <div className="mx-auto grid max-w-5xl grid-cols-4 gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`zook-focus grid min-h-14 place-items-center rounded-2xl text-xs font-semibold transition ${
                activeTab === tab.key ? "bg-lime-300 text-black" : "text-white/58 hover:bg-white/8"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </main>
  );
}
