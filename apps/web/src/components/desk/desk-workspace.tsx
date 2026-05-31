"use client";

import { Pill } from "@/components/glass-card";
import { PulseDot } from "@/components/dashboard/charts";
import { useDeskWorkspace } from "@/lib/use-desk-workspace";
import { DeskMetrics } from "./desk-metrics";
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
  redirectedFromDashboard,
}: {
  orgId: string;
  orgName: string;
  branch: BranchSummary | null;
  locale?: string | null;
  activeTab: TabKey;
  initialOrderId?: string | undefined;
  redirectedFromDashboard?: boolean;
}) {
  const { copy, state, actions } = useDeskWorkspace({ orgId, branch, locale });

  return (
    <div className="mx-auto grid max-w-5xl gap-4 px-4 py-5">
      <div className="flex flex-wrap items-center gap-2">
        <Pill tone="lime">
          <PulseDot tone="lime" size={6} />
          <span className="ml-1.5">{branch?.name ?? copy.mainBranch}</span>
        </Pill>
        <Pill>
          {state.todayRecords.length} {copy.checkInsToday}
        </Pill>
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
        <div className="rounded-2xl border border-lime-300/25 bg-lime-300/10 px-4 py-3 text-sm text-lime-100">
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
          onRecordPayment={actions.handleMemberPayment}
          onOverrideEntry={(member) => void actions.overrideMemberEntry(member)}
          onCheckOut={(member) => void actions.checkOutMember(member)}
          onSendMessage={(member) => void actions.sendMemberMessage(member)}
        />
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
          onSubmit={(event) => void actions.recordPayment(event)}
          onPurposeChange={actions.handlePurposeChange}
          onMemberChange={actions.handlePaymentMemberChange}
          onOrderChange={actions.handlePaymentOrderChange}
          onPlanChange={actions.handlePaymentPlanChange}
          onFormChange={actions.updatePaymentForm}
        />
      ) : null}

      {activeTab === "pickup" ? (
        <PickupTab
          copy={copy}
          activeOrders={state.pickupOrders}
          fulfilledToday={state.fulfilledToday}
          verifiedOrderIds={state.verifiedOrderIds}
          skippedCodeOrderIds={state.skippedCodeOrderIds}
          busyId={state.busyId}
          onVerifyPickupCode={(order) => void actions.verifyPickupCode(order)}
          onSkipCode={actions.skipPickupCode}
          onJumpToShopPayment={actions.jumpToShopPayment}
          onFulfillOrder={(orderId) => void actions.fulfillOrder(orderId)}
          highlightedOrderId={initialOrderId}
        />
      ) : null}
    </div>
  );
}
