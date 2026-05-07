"use client";

import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import Link from "next/link";
import { QrCode } from "lucide-react";
import { formatInr } from "@/lib/format";
import { useOperationalResource } from "@/lib/use-operational-resource";
import { webApiFetch } from "@/lib/api-client";
import { Pill } from "./glass-card";
import { DashboardLocaleToggle } from "./dashboard-locale-toggle";
import { DashboardSignOutButton } from "./dashboard-sign-out-button";
import { deskTranslations } from "./desk/copy";
import { MemberTab } from "./desk/member-tab";
import { PaymentTab } from "./desk/payment-tab";
import { DeskBottomNav, withBranch } from "./desk/panel-config";
import { PickupTab } from "./desk/pickup-tab";
import { QueueTab } from "./desk/queue-tab";
import type {
  AttendanceQueueRecord,
  BranchSummary,
  MemberRow,
  PaymentFormState,
  PaymentPurpose,
  PlanRow,
  ReceiptDetails,
  ShopOrder,
  TabKey,
} from "./desk/types";

export function DeskPanel({
  orgId,
  orgName,
  branch,
  locale,
}: {
  orgId: string;
  orgName: string;
  branch: BranchSummary | null;
  locale?: string | null;
}) {
  const copy = deskTranslations[locale === "hi" ? "hi" : "en"];
  const [activeTab, setActiveTab] = useState<TabKey>("queue");
  const [busyId, setBusyId] = useState("");
  const [toast, setToast] = useState("");
  const [memberQuery, setMemberQuery] = useState("");
  const [selectedMember, setSelectedMember] = useState<MemberRow | null>(null);
  const [paymentForm, setPaymentForm] = useState<PaymentFormState>({
    purpose: "MEMBERSHIP",
    memberUserId: "",
    planId: "",
    subscriptionId: "",
    shopOrderId: "",
    amountRupees: "",
    mode: "CASH",
    proofAssetId: "",
    description: "",
    receiptNumber: "",
    notes: "",
  });
  const [verifiedOrderIds, setVerifiedOrderIds] = useState<string[]>([]);
  const [skippedCodeOrderIds, setSkippedCodeOrderIds] = useState<string[]>([]);
  const [lastReceipt, setLastReceipt] = useState<ReceiptDetails | null>(null);

  const pendingState = useOperationalResource<{ records: AttendanceQueueRecord[] }>({
    path: withBranch(`/api/orgs/${orgId}/attendance/live`, branch),
    refreshMs: 15_000,
  });
  const todayState = useOperationalResource<{ records: AttendanceQueueRecord[] }>({
    path: withBranch(`/api/orgs/${orgId}/attendance/today`, branch),
    refreshMs: 30_000,
  });
  const membersState = useOperationalResource<{ members: MemberRow[] }>({
    path: withBranch(`/api/orgs/${orgId}/members?limit=100`, branch),
  });
  const plansState = useOperationalResource<{ plans: PlanRow[] }>({
    path: withBranch(`/api/orgs/${orgId}/membership-plans`, branch),
  });
  const ordersState = useOperationalResource<{
    orders: ShopOrder[];
    summary?: { fulfilledToday: number };
  }>({
    path: withBranch(`/api/orgs/${orgId}/shop/orders/active`, branch),
    refreshMs: 30_000,
  });

  const members = membersState.data?.members ?? [];
  const pendingRecords = pendingState.data?.records ?? [];
  const todayRecords = todayState.data?.records ?? [];
  const activeOrders = ordersState.data?.orders ?? [];
  const payAtDeskOrders = activeOrders.filter(
    (order) => order.status === "PENDING_PAYMENT" && !order.paymentId,
  );
  const pickupOrders = activeOrders.filter(
    (order) =>
      order.status === "READY_FOR_PICKUP" ||
      (order.status === "PENDING_PAYMENT" && !order.paymentId),
  );
  const activePlans = (plansState.data?.plans ?? []).filter((plan) => plan.active);

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

  function memberPaymentDefaults(member: MemberRow | null) {
    const subscription = member?.activeSubscription;
    const plan = (plansState.data?.plans ?? []).find(
      (candidate) => candidate.id === subscription?.planId,
    );
    const canActivateExisting = subscription?.status === "PENDING_PAYMENT";
    return {
      planId: !canActivateExisting && subscription?.planId ? subscription.planId : "",
      subscriptionId: canActivateExisting && subscription?.id ? subscription.id : "",
      amountRupees: plan ? String(plan.pricePaise / 100) : "",
    };
  }

  function updatePaymentForm(patch: Partial<PaymentFormState>) {
    setPaymentForm((current) => ({ ...current, ...patch }));
  }

  function selectMember(member: MemberRow) {
    const defaults = memberPaymentDefaults(member);
    setSelectedMember(member);
    setPaymentForm((current) => ({
      ...current,
      memberUserId: member.user?.id ?? "",
      planId: defaults.planId,
      subscriptionId: defaults.subscriptionId,
      amountRupees: defaults.amountRupees || current.amountRupees,
    }));
  }

  function selectPaymentOrder(order: ShopOrder) {
    setPaymentForm((current) => ({
      ...current,
      purpose: "SHOP_ORDER",
      shopOrderId: order.id,
      memberUserId: order.user?.id ?? current.memberUserId,
      planId: "",
      subscriptionId: "",
      amountRupees: String(order.totalPaise / 100),
    }));
    const orderMember = members.find((member) => member.user?.id === order.user?.id);
    if (orderMember) {
      setSelectedMember(orderMember);
    }
  }

  function jumpToShopPayment(order: ShopOrder) {
    selectPaymentOrder(order);
    setActiveTab("payment");
  }

  function handlePurposeChange(purpose: PaymentPurpose) {
    const defaults = memberPaymentDefaults(selectedMember);
    setPaymentForm((current) => ({
      ...current,
      purpose,
      planId: purpose === "MEMBERSHIP" ? defaults.planId : "",
      subscriptionId:
        purpose === "MEMBERSHIP" ? defaults.subscriptionId || current.subscriptionId : "",
      shopOrderId: "",
      amountRupees: purpose === "SHOP_ORDER" ? "" : defaults.amountRupees || current.amountRupees,
    }));
  }

  function handlePaymentMemberChange(userId: string) {
    const member = members.find((candidate) => candidate.user?.id === userId);
    const defaults = memberPaymentDefaults(member ?? null);
    if (member) {
      setSelectedMember(member);
    }
    setPaymentForm((current) => ({
      ...current,
      memberUserId: userId,
      planId: defaults.planId,
      subscriptionId: defaults.subscriptionId,
      amountRupees: defaults.amountRupees || current.amountRupees,
    }));
  }

  function handlePaymentOrderChange(orderId: string) {
    const order = activeOrders.find((candidate) => candidate.id === orderId);
    if (order) {
      selectPaymentOrder(order);
      return;
    }
    setPaymentForm((current) => ({ ...current, shopOrderId: "", amountRupees: "" }));
  }

  function handlePaymentPlanChange(planId: string) {
    const plan = activePlans.find((candidate) => candidate.id === planId);
    setPaymentForm((current) => ({
      ...current,
      planId,
      subscriptionId: "",
      amountRupees: plan ? String(plan.pricePaise / 100) : current.amountRupees,
    }));
  }

  function handleMemberPayment(member: MemberRow) {
    setActiveTab("payment");
    selectMember(member);
  }

  function skipPickupCode(orderId: string) {
    setSkippedCodeOrderIds((current) =>
      current.includes(orderId) ? current : [...current, orderId],
    );
  }

  async function overrideMemberEntry(member: MemberRow) {
    if (!member.user?.id || !branch?.id) return;
    try {
      setBusyId(`override:${member.user.id}`);
      setToast("");
      await webApiFetch(`/api/orgs/${orgId}/attendance/manual`, {
        method: "POST",
        body: {
          memberUserId: member.user.id,
          branchId: branch.id,
          reason: "Allowed by reception after identity check.",
        },
      });
      todayState.reload();
      setToast(copy.entryApproved);
    } catch (cause) {
      setToast(cause instanceof Error ? cause.message : copy.unableEntry);
    } finally {
      setBusyId("");
    }
  }

  async function sendMemberMessage(member: MemberRow) {
    if (!member.user?.id) return;
    const body = window.prompt(copy.directMessagePrompt);
    if (!body?.trim()) return;
    try {
      setBusyId(`message:${member.user.id}`);
      setToast("");
      await webApiFetch(`/api/orgs/${orgId}/notifications`, {
        method: "POST",
        body: {
          type: "TRANSACTIONAL",
          title: copy.deskMessageTitle,
          body,
          audience: "single_member",
          singleUserId: member.user.id,
          pushEnabled: true,
        },
      });
      setToast(copy.messageSent);
    } catch (cause) {
      setToast(cause instanceof Error ? cause.message : copy.unableMessage);
    } finally {
      setBusyId("");
    }
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
      setToast(action === "approve" ? copy.entryApproved : copy.entryRejected);
    } catch (cause) {
      setToast(cause instanceof Error ? cause.message : copy.unableEntry);
    } finally {
      setBusyId("");
    }
  }

  async function recordPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setBusyId("payment");
      setToast("");
      const amountPaise = Math.round(Number(paymentForm.amountRupees) * 100);
      const selectedOrder = activeOrders.find((order) => order.id === paymentForm.shopOrderId);
      const body = {
        purpose: paymentForm.purpose,
        memberUserId: paymentForm.memberUserId || undefined,
        planId: paymentForm.planId || undefined,
        subscriptionId: paymentForm.subscriptionId || undefined,
        shopOrderId: paymentForm.shopOrderId || undefined,
        description: paymentForm.description || undefined,
        amountPaise,
        mode: paymentForm.mode,
        proofAssetId: paymentForm.proofAssetId || undefined,
        receiptNumber: paymentForm.receiptNumber || undefined,
        notes: paymentForm.notes || undefined,
      };
      const path =
        paymentForm.purpose === "SHOP_ORDER" && paymentForm.shopOrderId
          ? `/api/orgs/${orgId}/shop/orders/${paymentForm.shopOrderId}/manual-payment`
          : paymentForm.purpose === "OTHER"
            ? `/api/orgs/${orgId}/manual-payments/general`
            : `/api/orgs/${orgId}/manual-payments`;
      await webApiFetch(path, { method: "POST", body });
      if (paymentForm.purpose === "SHOP_ORDER") {
        ordersState.reload();
      }
      setToast(
        `${paymentForm.purpose === "SHOP_ORDER" ? copy.shopPaymentRecorded : copy.paymentRecorded} ${formatInr(amountPaise)}.`,
      );
      setLastReceipt({
        title:
          paymentForm.purpose === "SHOP_ORDER" && selectedOrder
            ? `Shop order ${selectedOrder.id.slice(-8).toUpperCase()}`
            : paymentForm.purpose === "OTHER"
              ? paymentForm.description || copy.otherPayment
              : copy.membershipPayment,
        payer:
          paymentForm.purpose === "SHOP_ORDER"
            ? selectedOrder?.user?.name
            : (selectedMember?.user?.name ??
              members.find((member) => member.user?.id === paymentForm.memberUserId)?.user?.name),
        amountPaise,
        mode: paymentForm.mode,
        reference: paymentForm.receiptNumber || undefined,
        recordedAt: new Date().toISOString(),
      });
      setPaymentForm((current) => ({
        ...current,
        ...(current.purpose === "SHOP_ORDER" ? { shopOrderId: "" } : {}),
        receiptNumber: "",
        notes: "",
      }));
    } catch (cause) {
      setToast(
        cause instanceof Error
          ? cause.message
          : paymentForm.purpose === "SHOP_ORDER"
            ? copy.unableShopPayment
            : copy.unablePayment,
      );
    } finally {
      setBusyId("");
    }
  }

  async function verifyPickupCode(order: ShopOrder) {
    const code = window.prompt(copy.pickupPrompt, order.pickupCode ?? "");
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
      setToast(copy.pickupVerified);
    } catch (cause) {
      setToast(cause instanceof Error ? cause.message : copy.unablePickupVerify);
    } finally {
      setBusyId("");
    }
  }

  async function fulfillOrder(orderId: string) {
    try {
      setBusyId(orderId);
      setToast("");
      const skipped = skippedCodeOrderIds.includes(orderId);
      await webApiFetch(`/api/orgs/${orgId}/shop/orders/${orderId}/fulfill`, {
        method: "POST",
        body: skipped
          ? { pickupCodeSkipped: true, skipReason: "Skipped by reception at handover." }
          : {},
      });
      ordersState.reload();
      setToast(copy.pickupFulfilled);
    } catch (cause) {
      setToast(cause instanceof Error ? cause.message : copy.unablePickup);
    } finally {
      setBusyId("");
    }
  }

  return (
    <main className="min-h-dvh pb-28">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#070907]/92 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold uppercase tracking-[0.14em] text-white/70">
              {orgName}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Pill tone="lime">{branch?.name ?? copy.mainBranch}</Pill>
              <Pill>
                {todayRecords.length} {copy.checkInsToday}
              </Pill>
            </div>
          </div>
          <DashboardLocaleToggle locale={locale ?? undefined} labels={copy.common} />
          <DashboardSignOutButton
            compact
            label={copy.common.signOut}
            busyLabel={copy.common.signingOut}
          />
        </div>
      </header>

      <section className="mx-auto grid max-w-5xl gap-4 px-4 py-5">
        {toast ? (
          <div className="rounded-2xl border border-lime-300/25 bg-lime-300/10 px-4 py-3 text-sm text-lime-100">
            {toast}
          </div>
        ) : null}

        {activeTab === "queue" ? (
          <QueueTab
            copy={copy}
            pendingRecords={pendingRecords}
            todayRecords={todayRecords}
            branchName={branch?.name ?? null}
            busyId={busyId}
            onUpdateAttendance={(recordId, action) => void updateAttendance(recordId, action)}
          />
        ) : null}

        {activeTab === "member" ? (
          <MemberTab
            copy={copy}
            memberQuery={memberQuery}
            filteredMembers={filteredMembers}
            selectedMember={selectedMember}
            busyId={busyId}
            onMemberQueryChange={setMemberQuery}
            onSelectMember={selectMember}
            onRecordPayment={handleMemberPayment}
            onOverrideEntry={(member) => void overrideMemberEntry(member)}
            onSendMessage={(member) => void sendMemberMessage(member)}
          />
        ) : null}

        {activeTab === "payment" ? (
          <PaymentTab
            copy={copy}
            busyId={busyId}
            paymentForm={paymentForm}
            members={members}
            activePlans={activePlans}
            payAtDeskOrders={payAtDeskOrders}
            orgId={orgId}
            lastReceipt={lastReceipt}
            onSubmit={(event) => void recordPayment(event)}
            onPurposeChange={handlePurposeChange}
            onMemberChange={handlePaymentMemberChange}
            onOrderChange={handlePaymentOrderChange}
            onPlanChange={handlePaymentPlanChange}
            onFormChange={updatePaymentForm}
          />
        ) : null}

        {activeTab === "pickup" ? (
          <PickupTab
            copy={copy}
            activeOrders={pickupOrders}
            fulfilledToday={ordersState.data?.summary?.fulfilledToday ?? 0}
            verifiedOrderIds={verifiedOrderIds}
            skippedCodeOrderIds={skippedCodeOrderIds}
            busyId={busyId}
            onVerifyPickupCode={(order) => void verifyPickupCode(order)}
            onSkipCode={skipPickupCode}
            onJumpToShopPayment={jumpToShopPayment}
            onFulfillOrder={(orderId) => void fulfillOrder(orderId)}
          />
        ) : null}
      </section>

      <Link
        href="/desk/qr"
        className="zook-focus fixed bottom-24 right-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-lime-300 text-black shadow-[var(--zook-shadow-glow-lime)]"
        aria-label={copy.showEntryQr}
      >
        <QrCode size={24} />
      </Link>

      <DeskBottomNav activeTab={activeTab} copy={copy} onChange={setActiveTab} />
    </main>
  );
}
