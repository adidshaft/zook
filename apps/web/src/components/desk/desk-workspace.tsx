"use client";

import { Pill } from "@/components/glass-card";
import Link from "next/link";
import { CreditCard, PackageCheck, QrCode, Search } from "lucide-react";
import { useDeskWorkspace } from "@/lib/use-desk-workspace";
import { DeskMetrics } from "./desk-metrics";
import { DeskClassesPanel } from "./DeskClassesPanel";
import { DeskMessageDraftForm, DeskPickupDraftForm } from "./desk-status-forms";
import { MemberTab } from "./member-tab";
import { PaymentTab } from "./payment-tab";
import { PickupTab } from "./pickup-tab";
import { QueueTab } from "./queue-tab";
import type { BranchSummary, TabKey } from "./types";

export function DeskWorkspace({
  orgId,
  branch,
  locale,
  activeTab,
  initialOrderId,
  initialMemberUserId,
  redirectedFromDashboard,
}: {
  orgId: string;
  orgName: string;
  branch: BranchSummary | null;
  locale?: string | null;
  activeTab: TabKey;
  initialOrderId?: string | undefined;
  initialMemberUserId?: string | undefined;
  redirectedFromDashboard?: boolean;
}) {
  const { copy, state, actions } = useDeskWorkspace({
    orgId,
    branch,
    locale,
    initialMemberUserId,
  });
  const branchQuery = branch?.id ? `?branchId=${encodeURIComponent(branch.id)}` : "";
  const nextDeskAction = state.pendingRecords.length
      ? {
        href: `/desk${branchQuery}`,
        label: copy.nextReviewCheckIns,
        detail: `${state.pendingRecords.length} ${copy.nextReviewCheckInsDetail}`,
        count: state.pendingRecords.length,
      }
    : state.payAtDeskOrders.length
      ? {
          href: `/desk/payments${branchQuery}`,
          label: copy.nextCollectPayments,
          detail: `${state.payAtDeskOrders.length} ${copy.nextCollectPaymentsDetail}`,
          count: state.payAtDeskOrders.length,
        }
      : state.pickupOrders.length
        ? {
            href: `/desk/orders${branchQuery}`,
            label: copy.nextVerifyPickups,
            detail: `${state.pickupOrders.length} ${copy.nextVerifyPickupsDetail}`,
            count: state.pickupOrders.length,
          }
        : {
            href: `/desk/members${branchQuery}`,
            label: copy.nextDeskClear,
            detail: copy.nextDeskClearDetail,
            count: state.todayRecords.length,
          };
  const quickActions = [
    { href: `/desk/qr${branchQuery}`, label: copy.quickQrCheckIn, icon: <QrCode size={16} /> },
    { href: `/desk/members${branchQuery}`, label: copy.quickFindMember, icon: <Search size={16} /> },
    { href: `/desk/payments${branchQuery}`, label: copy.quickNewPayment, icon: <CreditCard size={16} /> },
    { href: `/desk/orders${branchQuery}`, label: copy.quickPickup, icon: <PackageCheck size={16} /> },
  ];
  const deskIsClear = nextDeskAction.label === copy.nextDeskClear;

  return (
    <div className="mx-auto grid max-w-5xl gap-3 px-4 py-4">
      <div className="rounded-[22px] border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-3">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Pill>{branch?.name ?? copy.mainBranch}</Pill>
              <Pill>
                {state.todayRecords.length} {copy.checkInsToday}
              </Pill>
              <Pill tone={deskIsClear ? "neutral" : "amber"}>
                {nextDeskAction.count}
              </Pill>
            </div>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h1 className="truncate text-lg font-semibold text-[var(--text-primary)]">
                  {nextDeskAction.label}
                </h1>
                <p className="mt-0.5 line-clamp-1 text-sm text-[var(--text-secondary)]">
                  {nextDeskAction.detail}
                </p>
              </div>
              <Link
                href={nextDeskAction.href}
                className="zook-focus inline-flex min-h-9 shrink-0 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--bg-sunken)] px-3 text-xs font-semibold text-[var(--text-primary)] transition hover:border-[var(--border-focus)] hover:bg-[var(--surface)]"
              >
                {copy.openTask}
              </Link>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto lg:justify-end">
            {quickActions.map((action, idx) => (
              <Link
                key={action.href}
                href={action.href}
                className={
                  idx === 0
                    ? "zook-focus inline-flex min-h-9 shrink-0 items-center gap-2 rounded-full bg-[var(--accent-fill)] px-3 text-xs font-semibold text-[var(--text-on-accent)] transition hover:opacity-90"
                    : "zook-focus inline-flex min-h-9 shrink-0 items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-sunken)] px-3 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-focus)] hover:text-[var(--text-primary)]"
                }
              >
                {action.icon}
                {action.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <DeskMetrics
        todayCount={state.todayRecords.length}
        pendingCount={state.pendingRecords.length}
        memberCount={state.members.length}
        handoffCount={state.payAtDeskOrders.length}
      />

      {redirectedFromDashboard ? (
        <div className="rounded-2xl border border-blue-300/25 bg-blue-300/10 px-4 py-3 text-sm text-blue-50">
          {copy.openedAsReception}
        </div>
      ) : null}

      {state.toast ? (
        <div className="rounded-2xl border border-blue-300/25 bg-blue-300/10 px-4 py-3 text-sm text-blue-50">
          {state.toast}
        </div>
      ) : null}

      {state.messageDraft ? (
        <DeskMessageDraftForm
          copy={copy}
          busyId={state.busyId}
          messageDraft={state.messageDraft}
          onCancel={() => actions.setMessageDraft(null)}
          onDraftChange={(body) =>
            actions.setMessageDraft((current) => (current ? { ...current, body } : current))
          }
          onSubmit={actions.submitMemberMessage}
        />
      ) : null}

      {state.pickupDraft ? (
        <DeskPickupDraftForm
          copy={copy}
          busyId={state.busyId}
          pickupDraft={state.pickupDraft}
          onCancel={() => actions.setPickupDraft(null)}
          onDraftChange={(code) =>
            actions.setPickupDraft((current) => (current ? { ...current, code } : current))
          }
          onSubmit={actions.submitPickupCode}
        />
      ) : null}

      {activeTab === "queue" ? (
        <QueueTab
          copy={copy}
          pendingRecords={state.pendingRecords}
          todayRecords={state.todayRecords}
          branchName={branch?.name ?? null}
          busyId={state.busyId}
          onUpdateAttendance={(recordId, action) => void actions.updateAttendance(recordId, action)}
        />
      ) : null}

      {activeTab === "member" ? (
        <MemberTab
          copy={copy}
          memberQuery={state.memberQuery}
          filteredMembers={state.filteredMembers}
          selectedMember={state.selectedMember}
          busyId={state.busyId}
          onMemberQueryChange={actions.setMemberQuery}
          onSelectMember={actions.selectMember}
          getRecordPaymentHref={actions.getMemberPaymentHref}
          onOverrideEntry={(member) => void actions.overrideMemberEntry(member)}
          onCheckOut={(member) => void actions.checkOutMember(member)}
          onSendMessage={(member) => void actions.sendMemberMessage(member)}
        />
      ) : null}

      {activeTab === "classes" ? (
        <DeskClassesPanel orgId={orgId} branch={branch} members={state.members} />
      ) : null}

      {activeTab === "payment" ? (
        <PaymentTab
          copy={copy}
          busyId={state.busyId}
          paymentForm={state.paymentForm}
          members={state.members}
          activePlans={state.activePlans}
          payAtDeskOrders={state.payAtDeskOrders}
          orgId={orgId}
          lastReceipt={state.lastReceipt}
          recentPayments={state.recentPayments}
          recentPaymentsLoading={state.recentPaymentsLoading}
          recentPaymentsError={state.recentPaymentsError}
          refundDraft={state.refundDraft}
          refundError={state.refundError}
          onSubmit={(event) => void actions.recordPayment(event)}
          onPurposeChange={actions.handlePurposeChange}
          onMemberChange={actions.handlePaymentMemberChange}
          onOrderChange={actions.handlePaymentOrderChange}
          onPlanChange={actions.handlePaymentPlanChange}
          onFormChange={actions.updatePaymentForm}
          onStartRefund={actions.startRefund}
          onCancelRefund={() => actions.setRefundDraft(null)}
          onRefundReasonChange={(reason) =>
            actions.setRefundDraft((current) => (current ? { ...current, reason } : current))
          }
          onSubmitRefund={() => actions.submitRefund()}
        />
      ) : null}

      {activeTab === "pickup" ? (
        <PickupTab
          copy={copy}
          activeOrders={state.pickupOrders}
          orderSort={state.orderSort}
          fulfilledToday={state.fulfilledToday}
          verifiedOrderIds={state.verifiedOrderIds}
          skippedCodeOrderIds={state.skippedCodeOrderIds}
          busyId={state.busyId}
          onVerifyPickupCode={(order) => void actions.verifyPickupCode(order)}
          onOrderSortChange={actions.setOrderSort}
          onSkipCode={actions.skipPickupCode}
          onJumpToShopPayment={actions.jumpToShopPayment}
          onFulfillOrder={(orderId) => void actions.fulfillOrder(orderId)}
          highlightedOrderId={initialOrderId}
        />
      ) : null}
    </div>
  );
}
