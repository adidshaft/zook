"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { formatInr } from "@/lib/format";
import { getRupeeAmountError, normalizeRupeeInput } from "@/lib/payment-amount";
import { useOperationalResource } from "@/lib/use-operational-resource";
import { webApiFetch } from "@/lib/api-client";
import { deskTranslations } from "@/components/desk/copy";
import { withBranch } from "@/components/desk/panel-config";
import type {
  AttendanceQueueRecord,
  BranchSummary,
  DeskPaymentRow,
  MemberRow,
  PaymentFormState,
  PaymentPurpose,
  PlanRow,
  ReceiptDetails,
  ShopOrder,
} from "@/components/desk/types";

export function useDeskWorkspace({
  orgId,
  branch,
  locale,
  initialMemberUserId,
}: {
  orgId: string;
  branch: BranchSummary | null;
  locale?: string | null | undefined;
  initialMemberUserId?: string | null | undefined;
}) {
  const router = useRouter();
  const copy = deskTranslations[locale === "hi" ? "hi" : "en"];
  const [busyId, setBusyId] = useState("");
  const [toast, setToast] = useState("");
  const [memberQuery, setMemberQuery] = useState("");
  const [debouncedMemberQuery, setDebouncedMemberQuery] = useState("");
  const [orderSort, setOrderSort] = useState<"newest" | "oldest" | "status">("newest");
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
  const [skippedCodeReasons, setSkippedCodeReasons] = useState<Record<string, string>>({});
  const [lastReceipt, setLastReceipt] = useState<ReceiptDetails | null>(null);
  const [messageDraft, setMessageDraft] = useState<{ member: MemberRow; body: string } | null>(
    null,
  );
  const [pickupDraft, setPickupDraft] = useState<{ order: ShopOrder; code: string } | null>(null);
  const [refundDraft, setRefundDraft] = useState<{ payment: DeskPaymentRow; reason: string } | null>(
    null,
  );
  const [refundError, setRefundError] = useState("");

  const pendingState = useOperationalResource<{ records: AttendanceQueueRecord[] }>({
    path: withBranch(`/api/orgs/${orgId}/attendance/live`, branch),
    refreshMs: 15_000,
  });
  const todayState = useOperationalResource<{ records: AttendanceQueueRecord[] }>({
    path: withBranch(`/api/orgs/${orgId}/attendance/today`, branch),
    refreshMs: 30_000,
  });
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedMemberQuery(memberQuery.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [memberQuery]);

  const membersPath = useMemo(() => {
    const params = new URLSearchParams({ limit: "20" });
    if (debouncedMemberQuery) {
      params.set("q", debouncedMemberQuery);
    }
    return withBranch(`/api/orgs/${orgId}/members?${params.toString()}`, branch);
  }, [branch, debouncedMemberQuery, orgId]);

  const membersState = useOperationalResource<{ members: MemberRow[] }>({
    path: membersPath,
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
  const recentPaymentsState = useOperationalResource<{ payments: DeskPaymentRow[] }>({
    path: withBranch(`/api/orgs/${orgId}/payments/recent`, branch),
    refreshMs: 30_000,
  });

  const members = useMemo(() => membersState.data?.members ?? [], [membersState.data?.members]);
  const pendingRecords = pendingState.data?.records ?? [];
  const todayRecords = todayState.data?.records ?? [];
  const activeOrders = useMemo(() => {
    const orders = [...(ordersState.data?.orders ?? [])];
    if (orderSort === "oldest") {
      return orders.sort(
        (left, right) =>
          new Date(left.createdAt ?? 0).getTime() - new Date(right.createdAt ?? 0).getTime(),
      );
    }
    if (orderSort === "status") {
      const rank: Record<string, number> = {
        READY_FOR_PICKUP: 0,
        PENDING_PAYMENT: 1,
        PAID: 2,
      };
      return orders.sort(
        (left, right) =>
          (rank[left.status] ?? 9) - (rank[right.status] ?? 9) ||
          new Date(right.createdAt ?? 0).getTime() - new Date(left.createdAt ?? 0).getTime(),
      );
    }
    return orders.sort(
      (left, right) =>
        new Date(right.createdAt ?? 0).getTime() - new Date(left.createdAt ?? 0).getTime(),
    );
  }, [orderSort, ordersState.data?.orders]);
  const payAtDeskOrders = activeOrders.filter(
    (order) => order.status === "PENDING_PAYMENT" && !order.paymentId,
  );
  const pickupOrders = activeOrders.filter(
    (order) =>
      order.status === "READY_FOR_PICKUP" ||
      (order.status === "PENDING_PAYMENT" && !order.paymentId),
  );
  const activePlans = (plansState.data?.plans ?? []).filter((plan) => plan.active);
  const recentPayments = recentPaymentsState.data?.payments ?? [];

  const filteredMembers = useMemo(() => members.slice(0, debouncedMemberQuery ? 20 : 8), [
    debouncedMemberQuery,
    members,
  ]);

  useEffect(() => {
    if (!selectedMember?.user?.id) return;
    const nextSelectedMember = members.find(
      (member) => member.user?.id === selectedMember.user?.id,
    );
    if (nextSelectedMember && nextSelectedMember !== selectedMember) {
      setSelectedMember(nextSelectedMember);
    }
  }, [members, selectedMember]);

  const memberPaymentDefaults = useCallback((member: MemberRow | null) => {
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
  }, [plansState.data?.plans]);

  function updatePaymentForm(patch: Partial<PaymentFormState>) {
    setPaymentForm((current) => ({ ...current, ...patch }));
  }

  const selectMember = useCallback((member: MemberRow) => {
    const defaults = memberPaymentDefaults(member);
    setSelectedMember(member);
    setPaymentForm((current) => ({
      ...current,
      memberUserId: member.user?.id ?? "",
      planId: defaults.planId,
      subscriptionId: defaults.subscriptionId,
      amountRupees: defaults.amountRupees || current.amountRupees,
    }));
  }, [memberPaymentDefaults]);

  useEffect(() => {
    if (!initialMemberUserId || paymentForm.memberUserId) return;
    const member = members.find((candidate) => candidate.user?.id === initialMemberUserId);
    if (member) {
      selectMember(member);
    }
  }, [initialMemberUserId, members, paymentForm.memberUserId, selectMember]);

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
    if (orderMember) setSelectedMember(orderMember);
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
    if (member) setSelectedMember(member);
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
    selectMember(member);
    router.push(getMemberPaymentHref(member));
  }

  function getMemberPaymentHref(member: MemberRow) {
    const params = new URLSearchParams();
    if (member.user?.id) params.set("memberId", member.user.id);
    return withBranch(`/desk/payments/new?${params.toString()}`, branch);
  }

  function jumpToShopPayment(order: ShopOrder) {
    selectPaymentOrder(order);
    router.push(withBranch("/desk/payments/new", branch));
  }

  function skipPickupCode(orderId: string, reason: string) {
    setSkippedCodeOrderIds((current) =>
      current.includes(orderId) ? current : [...current, orderId],
    );
    setSkippedCodeReasons((current) => ({ ...current, [orderId]: reason }));
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
      void Promise.all([todayState.reload(), membersState.reload()]);
      setToast(copy.entryApproved);
    } catch (cause) {
      void membersState.reload();
      setToast(cause instanceof Error ? cause.message : copy.unableEntry);
    } finally {
      setBusyId("");
    }
  }

  async function checkOutMember(member: MemberRow) {
    const activeCheckIn = member.activeCheckIn;
    if (!activeCheckIn?.id) return;
    try {
      setBusyId(`checkout:${member.user?.id ?? activeCheckIn.id}`);
      setToast("");
      await webApiFetch(`/api/orgs/${orgId}/attendance/${activeCheckIn.id}/checkout`, {
        method: "POST",
        body: { reason: "manual" },
      });
      void Promise.all([todayState.reload(), membersState.reload()]);
      setToast(copy.entryCheckedOut);
    } catch (cause) {
      setToast(cause instanceof Error ? cause.message : copy.unableEntry);
    } finally {
      setBusyId("");
    }
  }

  function sendMemberMessage(member: MemberRow) {
    if (!member.user?.id) return;
    setMessageDraft({ member, body: "" });
    setToast("");
  }

  async function submitMemberMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!messageDraft?.member.user?.id || !messageDraft.body.trim()) return;
    try {
      setBusyId(`message:${messageDraft.member.user.id}`);
      setToast("");
      await webApiFetch(`/api/orgs/${orgId}/notifications`, {
        method: "POST",
        body: {
          type: "TRANSACTIONAL",
          title: copy.deskMessageTitle,
          body: messageDraft.body.trim(),
          audience: "single_member",
          singleUserId: messageDraft.member.user.id,
          pushEnabled: true,
        },
      });
      setMessageDraft(null);
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
      const amountError = getRupeeAmountError(paymentForm.amountRupees);
      if (amountError) {
        setToast(amountError);
        return;
      }
      const amountPaise = Math.round(Number(normalizeRupeeInput(paymentForm.amountRupees)) * 100);
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
      if (paymentForm.purpose === "SHOP_ORDER") ordersState.reload();
      void recentPaymentsState.reload();
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
    setPickupDraft({ order, code: order.pickupCode ?? "" });
    setToast("");
  }

  async function submitPickupCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pickupDraft?.code.trim()) return;
    try {
      setBusyId(`verify:${pickupDraft.order.id}`);
      setToast("");
      await webApiFetch(`/api/orgs/${orgId}/reception/verify-code`, {
        method: "POST",
        body: { code: pickupDraft.code.trim() },
      });
      setVerifiedOrderIds((current) =>
        current.includes(pickupDraft.order.id) ? current : [...current, pickupDraft.order.id],
      );
      setPickupDraft(null);
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
          ? { pickupCodeSkipped: true, skipReason: skippedCodeReasons[orderId] ?? "Skipped by reception at handover." }
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

  function startRefund(payment: DeskPaymentRow) {
    setRefundError("");
    setRefundDraft({ payment, reason: "Refund requested at desk" });
  }

  async function submitRefund() {
    if (!refundDraft) return;
    const { payment, reason } = refundDraft;
    if (!payment.orgId) {
      setRefundError("This payment is missing its gym link.");
      return;
    }
    if (!reason.trim()) {
      setRefundError("Add a reason for the refund.");
      return;
    }
    try {
      setBusyId(`refund:${payment.id}`);
      setRefundError("");
      await webApiFetch(`/api/orgs/${payment.orgId}/payments/${payment.id}/refund`, {
        method: "POST",
        body: { reason: reason.trim() },
        feedback: { success: "Refund submitted." },
      });
      setRefundDraft(null);
      void recentPaymentsState.reload();
      setToast("Refund submitted.");
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Unable to refund payment.";
      setRefundError(
        message.toLowerCase().includes("provider reference")
          ? "This payment cannot be refunded automatically because it was not collected through Razorpay."
          : message,
      );
    } finally {
      setBusyId("");
    }
  }

  return {
    copy,
    state: {
      busyId,
      toast,
      memberQuery,
      orderSort,
      filteredMembers,
      selectedMember,
      paymentForm,
      verifiedOrderIds,
      skippedCodeOrderIds,
      lastReceipt,
      messageDraft,
      pickupDraft,
      refundDraft,
      refundError,
      pendingRecords,
      todayRecords,
      members,
      activePlans,
      payAtDeskOrders,
      pickupOrders,
      recentPayments,
      recentPaymentsLoading: recentPaymentsState.loading,
      recentPaymentsError: recentPaymentsState.error,
      fulfilledToday: ordersState.data?.summary?.fulfilledToday ?? 0,
    },
    actions: {
      setMemberQuery,
      setOrderSort,
      setMessageDraft,
      setPickupDraft,
      setRefundDraft,
      selectMember,
      updatePaymentForm,
      handlePurposeChange,
      handlePaymentMemberChange,
      handlePaymentOrderChange,
      handlePaymentPlanChange,
      handleMemberPayment,
      getMemberPaymentHref,
      jumpToShopPayment,
      skipPickupCode,
      overrideMemberEntry,
      checkOutMember,
      sendMemberMessage,
      submitMemberMessage,
      updateAttendance,
      recordPayment,
      verifyPickupCode,
      submitPickupCode,
      fulfillOrder,
      startRefund,
      submitRefund,
      reloadRecentPayments: () => void recentPaymentsState.reload(),
    },
  };
}
