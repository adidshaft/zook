import { type FormEvent, useState } from "react";
import { CreditCard } from "lucide-react";
import { ConfirmActionButton } from "@/components/confirm-action-button";
import { formatDate, formatEnumLabel, formatInr } from "@/lib/format";
import { getRupeeAmountError, normalizeRupeeInput } from "@/lib/payment-amount";
import { formatPaymentMode, formatPaymentPurpose } from "@/components/dashboard/payments/payments-utils";
import { GlassCard } from "../glass-card";
import { ZookButton } from "../zook-button";
import type { DeskCopy } from "./copy";
import type {
  DeskPaymentRow,
  MemberRow,
  PaymentFormState,
  PaymentPurpose,
  PlanRow,
  ReceiptDetails,
  ShopOrder,
} from "./types";
import { memberLabel, orderItemsSummary } from "./utils";
import { ReceiptCard } from "./receipt-card";
import { PaymentProofUpload } from "../payment-proof-upload";

function refundedAmountFor(payment: DeskPaymentRow) {
  return (
    payment.refundedAmountPaise ??
    payment.refunds
      ?.filter((refund) => !["FAILED", "CANCELLED"].includes(refund.status))
      .reduce((total, refund) => total + refund.amountPaise, 0) ??
    0
  );
}

function isRefundable(payment: DeskPaymentRow) {
  return (
    ["SUCCEEDED", "PARTIALLY_REFUNDED"].includes(payment.status) &&
    refundedAmountFor(payment) < payment.amountPaise
  );
}

export function PaymentTab({
  copy,
  busyId,
  paymentForm,
  members,
  activePlans,
  payAtDeskOrders,
  orgId,
  lastReceipt,
  recentPayments,
  recentPaymentsLoading,
  recentPaymentsError,
  refundDraft,
  refundError,
  onSubmit,
  onPurposeChange,
  onMemberChange,
  onOrderChange,
  onPlanChange,
  onFormChange,
  onStartRefund,
  onCancelRefund,
  onRefundReasonChange,
  onSubmitRefund,
}: {
  copy: DeskCopy;
  busyId: string;
  paymentForm: PaymentFormState;
  members: MemberRow[];
  activePlans: PlanRow[];
  payAtDeskOrders: ShopOrder[];
  orgId: string;
  lastReceipt: ReceiptDetails | null;
  recentPayments: DeskPaymentRow[];
  recentPaymentsLoading: boolean;
  recentPaymentsError: string;
  refundDraft: { payment: DeskPaymentRow; reason: string } | null;
  refundError: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onPurposeChange: (purpose: PaymentPurpose) => void;
  onMemberChange: (userId: string) => void;
  onOrderChange: (orderId: string) => void;
  onPlanChange: (planId: string) => void;
  onFormChange: (patch: Partial<PaymentFormState>) => void;
  onStartRefund: (payment: DeskPaymentRow) => void;
  onCancelRefund: () => void;
  onRefundReasonChange: (reason: string) => void;
  onSubmitRefund: () => void | Promise<void>;
}) {
  const [amountTouched, setAmountTouched] = useState(false);
  const amountError = getRupeeAmountError(paymentForm.amountRupees);
  const selectedPaymentMember = members.find(
    (member) => member.user?.id === paymentForm.memberUserId,
  );
  const activeSubscription = selectedPaymentMember?.activeSubscription;
  const selectedShopOrder = payAtDeskOrders.find((order) => order.id === paymentForm.shopOrderId);

  return (
    <GlassCard>
      <div className="flex items-center gap-3">
        <CreditCard className="text-[var(--accent)]" size={22} />
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">{copy.recordPayment}</h1>
          <p className="mt-1 text-sm text-[var(--text-tertiary)]">{copy.paymentDescription}</p>
        </div>
      </div>
      <form
        className="mt-5 grid gap-4 pb-24"
        onSubmit={(event) => {
          setAmountTouched(true);
          if (amountError) {
            event.preventDefault();
            return;
          }
          onSubmit(event);
        }}
      >
        <fieldset className="grid gap-2">
          <legend className="text-sm text-[var(--text-secondary)]">{copy.paymentPurpose}</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {[
              ["MEMBERSHIP", copy.membershipPayment],
              ["SHOP_ORDER", copy.shopOrderPayment],
              ["OTHER", copy.otherPayment],
            ].map(([purpose, label]) => (
              <label
                key={purpose}
                className={`zook-focus flex min-h-12 items-center gap-3 rounded-2xl border px-4 text-sm font-semibold transition cursor-pointer ${
                  paymentForm.purpose === purpose
                    ? "border-[var(--border-focus)] bg-[var(--accent-soft)] text-[var(--accent-strong)] dark:bg-[var(--surface-accent-soft)] dark:text-[var(--accent)]"
                    : "border-[var(--border)] bg-[var(--bg-sunken)] text-[var(--text-primary)] hover:bg-[var(--surface-raised)]"
                }`}
              >
                <input
                  type="radio"
                  name="purpose"
                  value={purpose}
                  checked={paymentForm.purpose === purpose}
                  onChange={() => onPurposeChange(purpose as PaymentPurpose)}
                  className="accent-[var(--accent)]"
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        {paymentForm.purpose !== "SHOP_ORDER" ? (
          <label className="grid gap-2 text-sm text-[var(--text-secondary)]">
            {copy.member}
            <select
              value={paymentForm.memberUserId}
              onChange={(event) => onMemberChange(event.target.value)}
              className="zook-focus min-h-12 rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] px-4 text-[var(--text-primary)] transition focus:border-[var(--border-focus)]"
              required={paymentForm.purpose === "MEMBERSHIP"}
            >
              <option value="" className="bg-[var(--bg-elevated)] text-[var(--text-primary)]">
                {copy.chooseMember}
              </option>
              {members.map((member) => (
                <option key={member.profile.id} value={member.user?.id ?? ""} className="bg-[var(--bg-elevated)] text-[var(--text-primary)]">
                  {memberLabel(member)}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {paymentForm.purpose === "SHOP_ORDER" ? (
          <label className="grid gap-2 text-sm text-[var(--text-secondary)]">
            {copy.shopOrderPayment}
            <select
              value={paymentForm.shopOrderId}
              onChange={(event) => onOrderChange(event.target.value)}
              className="zook-focus min-h-12 rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] px-4 text-[var(--text-primary)] transition focus:border-[var(--border-focus)]"
              required
            >
              <option value="" className="bg-[var(--bg-elevated)] text-[var(--text-primary)]">
                {copy.chooseOrder}
              </option>
              {payAtDeskOrders.map((order) => (
                <option key={order.id} value={order.id} className="bg-[var(--bg-elevated)] text-[var(--text-primary)]">
                  {order.user?.name ?? "Member"} - {orderItemsSummary(order)} -{" "}
                  {formatInr(order.totalPaise)}
                </option>
              ))}
            </select>
            {!payAtDeskOrders.length ? (
              <span className="text-xs text-[var(--text-tertiary)]">{copy.noPayAtDeskOrders}</span>
            ) : null}
            {selectedShopOrder ? (
              <span className="rounded-2xl border border-[var(--border-focus)] bg-[var(--surface-accent-soft)] px-3 py-2 text-xs font-semibold text-[var(--accent-strong)]">
                {copy.collectAmount} {formatInr(selectedShopOrder.totalPaise)}
              </span>
            ) : null}
          </label>
        ) : null}
        <div className="grid gap-4 md:grid-cols-2">
          {paymentForm.purpose === "MEMBERSHIP" ? (
            <div className="grid gap-3">
              {activeSubscription ? (
                <label className="grid gap-2 text-sm text-[var(--text-secondary)]">
                  {copy.membership}
                  <select
                    value={paymentForm.subscriptionId}
                    onChange={(event) =>
                      onFormChange({ subscriptionId: event.target.value, planId: "" })
                    }
                    className="zook-focus min-h-12 rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] px-4 text-[var(--text-primary)] transition focus:border-[var(--border-focus)]"
                  >
                    <option value="" className="bg-[var(--bg-elevated)] text-[var(--text-primary)]">
                      {copy.newMembership}
                    </option>
                    <option value={activeSubscription.id} className="bg-[var(--bg-elevated)] text-[var(--text-primary)]">
                      {copy.renewExisting}
                    </option>
                  </select>
                </label>
              ) : null}
              <label className="grid gap-2 text-sm text-[var(--text-secondary)]">
                {copy.plan}
                <select
                  value={paymentForm.planId}
                  onChange={(event) => onPlanChange(event.target.value)}
                  className="zook-focus min-h-12 rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] px-4 text-[var(--text-primary)] transition focus:border-[var(--border-focus)]"
                >
                  <option value="" className="bg-[var(--bg-elevated)] text-[var(--text-primary)]">
                    {activeSubscription ? copy.useSelectedMembership : copy.renewExisting}
                  </option>
                  {activePlans.map((plan) => (
                    <option key={plan.id} value={plan.id} className="bg-[var(--bg-elevated)] text-[var(--text-primary)]">
                      {plan.name} - {formatInr(plan.pricePaise)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : null}
          <label className="grid gap-2 text-sm text-[var(--text-secondary)]">
            {copy.mode}
            <select
              value={paymentForm.mode}
              onChange={(event) => onFormChange({ mode: event.target.value })}
              className="zook-focus min-h-12 rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] px-4 text-[var(--text-primary)] transition focus:border-[var(--border-focus)]"
            >
              <option value="CASH" className="bg-[var(--bg-elevated)] text-[var(--text-primary)]">
                Cash
              </option>
              <option value="DIRECT_UPI" className="bg-[var(--bg-elevated)] text-[var(--text-primary)]">
                UPI
              </option>
              <option value="CARD" className="bg-[var(--bg-elevated)] text-[var(--text-primary)]">
                Card
              </option>
              <option value="BANK_TRANSFER" className="bg-[var(--bg-elevated)] text-[var(--text-primary)]">
                Bank transfer
              </option>
              <option value="OTHER" className="bg-[var(--bg-elevated)] text-[var(--text-primary)]">
                Other
              </option>
            </select>
          </label>
        </div>
        {paymentForm.purpose === "OTHER" ? (
          <label className="grid gap-2 text-sm text-[var(--text-secondary)]">
            {copy.reason}
            <input
              value={paymentForm.description}
              onChange={(event) => onFormChange({ description: event.target.value })}
              placeholder={copy.reasonPlaceholder}
              className="zook-focus min-h-12 rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] px-4 text-[var(--text-primary)] transition focus:border-[var(--border-focus)]"
              required
            />
          </label>
        ) : null}
        <div className="grid gap-4">
          <label className="grid gap-2 text-sm text-[var(--text-secondary)]">
            {copy.amount}
            <div
              className={`flex min-h-12 items-center rounded-2xl border bg-[var(--bg-sunken)] px-4 transition ${
                amountTouched && amountError
                  ? "border-rose-500/60"
                  : "border-[var(--border)] focus-within:border-[var(--border-focus)]"
              }`}
            >
              <span className="pr-2 text-sm font-semibold text-[var(--text-secondary)]">₹</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={paymentForm.amountRupees}
                onBlur={() => setAmountTouched(true)}
                onChange={(event) =>
                  onFormChange({ amountRupees: normalizeRupeeInput(event.target.value) })
                }
                inputMode="decimal"
                placeholder="2500"
                aria-invalid={amountTouched && amountError ? true : undefined}
                className="zook-focus min-h-12 flex-1 bg-transparent text-[var(--text-primary)] transition focus:outline-none"
                required
              />
            </div>
            {amountTouched && amountError ? (
              <span className="text-xs text-rose-500 dark:text-rose-300">{amountError}</span>
            ) : (
              <span className="text-xs text-[var(--text-tertiary)]">
                {copy.amountHint}
              </span>
            )}
          </label>
        </div>
        <ZookButton
          type="submit"
          disabled={busyId === "payment"}
          state={busyId === "payment" ? "loading" : "idle"}
        >
          {busyId === "payment" ? copy.recording : copy.recordPayment}
        </ZookButton>
        <details className="rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] px-4 py-3">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-[var(--text-secondary)]">
            <span>{copy.optionalDetails}</span>
            <span className="text-xs font-normal text-[var(--text-tertiary)]">{copy.showOptionalDetails}</span>
          </summary>
          <div className="mt-4 grid gap-4">
            <label className="grid gap-2 text-sm text-[var(--text-secondary)]">
              {copy.referenceNumber}
              <input
                value={paymentForm.receiptNumber}
                onChange={(event) => onFormChange({ receiptNumber: event.target.value })}
                placeholder={copy.referencePlaceholder}
                className="zook-focus min-h-12 rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] px-4 text-[var(--text-primary)] transition focus:border-[var(--border-focus)]"
              />
            </label>
            <PaymentProofUpload
              orgId={orgId}
              value={paymentForm.proofAssetId}
              onChange={(proofAssetId) => onFormChange({ proofAssetId })}
              label={copy.proofFileId}
              placeholder={copy.proofPlaceholder}
            />
            <label className="grid gap-2 text-sm text-[var(--text-secondary)]">
              {copy.notes}
              <textarea
                value={paymentForm.notes}
                onChange={(event) => onFormChange({ notes: event.target.value })}
                className="zook-focus min-h-24 rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] px-4 py-3 text-[var(--text-primary)] transition focus:border-[var(--border-focus)]"
              />
            </label>
          </div>
        </details>
      </form>
      {lastReceipt ? <ReceiptCard copy={copy} receipt={lastReceipt} /> : null}
      <RecentPaymentsList
        copy={copy}
        busyId={busyId}
        payments={recentPayments}
        loading={recentPaymentsLoading}
        error={recentPaymentsError}
        refundDraft={refundDraft}
        refundError={refundError}
        onStartRefund={onStartRefund}
        onCancelRefund={onCancelRefund}
        onRefundReasonChange={onRefundReasonChange}
        onSubmitRefund={onSubmitRefund}
      />
    </GlassCard>
  );
}

function RecentPaymentsList({
  copy,
  busyId,
  payments,
  loading,
  error,
  refundDraft,
  refundError,
  onStartRefund,
  onCancelRefund,
  onRefundReasonChange,
  onSubmitRefund,
}: {
  copy: DeskCopy;
  busyId: string;
  payments: DeskPaymentRow[];
  loading: boolean;
  error: string;
  refundDraft: { payment: DeskPaymentRow; reason: string } | null;
  refundError: string;
  onStartRefund: (payment: DeskPaymentRow) => void;
  onCancelRefund: () => void;
  onRefundReasonChange: (reason: string) => void;
  onSubmitRefund: () => void | Promise<void>;
}) {
  return (
    <div className="mt-8 border-t border-[var(--border)] pt-6">
      <h2 className="text-lg font-semibold text-[var(--text-primary)]">{copy.recentPayments}</h2>
      <p className="mt-1 text-sm text-[var(--text-tertiary)]">{copy.recentPaymentsDescription}</p>

      {refundDraft ? (
        <form
          className="mt-4 rounded-[24px] border border-[var(--border)] bg-[var(--bg-sunken)] p-4"
          onSubmit={(event) => {
            event.preventDefault();
            void onSubmitRefund();
          }}
        >
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            {copy.refund} {formatInr(refundDraft.payment.amountPaise - refundedAmountFor(refundDraft.payment))} ·{" "}
            {refundDraft.payment.user?.name ?? formatEnumLabel(refundDraft.payment.purpose)}
          </p>
          {refundError ? (
            <p className="mt-2 rounded-2xl border border-[color-mix(in_srgb,var(--feedback-danger)_36%,transparent)] bg-[var(--surface-danger-soft)] px-4 py-3 text-sm text-[var(--feedback-danger)]">
              {refundError}
            </p>
          ) : null}
          <label className="mt-3 grid gap-2 text-xs font-medium text-[var(--text-secondary)]">
            {copy.refundReason}
            <textarea
              value={refundDraft.reason}
              onChange={(event) => onRefundReasonChange(event.target.value)}
              placeholder={copy.refundReasonPlaceholder}
              rows={3}
              maxLength={240}
              className="zook-focus rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none"
            />
          </label>
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <ZookButton type="button" tone="ghost" size="sm" onClick={onCancelRefund}>
              {copy.common.cancel}
            </ZookButton>
            <ConfirmActionButton
              className="zook-focus inline-flex min-h-10 items-center justify-center rounded-full bg-[var(--accent-fill)] px-4 py-2 text-sm font-semibold text-[var(--text-on-accent)] disabled:cursor-not-allowed disabled:opacity-60"
              title={copy.refundConfirmTitle}
              description={copy.refundConfirmDescription}
              confirmLabel={copy.submitRefund}
              confirmTone="danger"
              onConfirm={() => onSubmitRefund()}
              disabled={!refundDraft.reason.trim() || busyId === `refund:${refundDraft.payment.id}`}
            >
              {busyId === `refund:${refundDraft.payment.id}` ? copy.refunding : copy.submitRefund}
            </ConfirmActionButton>
          </div>
        </form>
      ) : null}

      {error ? (
        <p className="mt-4 rounded-2xl border border-[color-mix(in_srgb,var(--feedback-danger)_36%,transparent)] bg-[var(--surface-danger-soft)] px-4 py-3 text-sm text-[var(--feedback-danger)]">
          {copy.unableRecentPayments}
        </p>
      ) : null}

      <div className="mt-4 grid gap-2">
        {loading && !payments.length ? (
          <p className="rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] px-4 py-3 text-sm text-[var(--text-tertiary)]">
            {copy.loadingRecentPayments}
          </p>
        ) : null}
        {!loading && !payments.length && !error ? (
          <p className="rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] px-4 py-3 text-sm text-[var(--text-tertiary)]">
            {copy.noRecentPayments}
          </p>
        ) : null}
        {payments.map((payment) => {
          const refunded = refundedAmountFor(payment);
          const refundable = isRefundable(payment);
          const recordedAt = payment.recordedAt ?? payment.createdAt;
          return (
            <div
              key={payment.id}
              className="grid gap-3 rounded-[20px] border border-[var(--border-subtle)] bg-[var(--bg-sunken)] px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-center"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-[var(--text-primary)]">
                  {payment.user?.name ?? formatPaymentPurpose(payment.purpose)}
                </p>
                <p className="mt-1 truncate text-xs text-[var(--text-secondary)]">
                  {formatInr(payment.amountPaise)} · {formatPaymentMode(payment.mode)} ·{" "}
                  {formatDate(recordedAt)}
                </p>
                {refunded > 0 ? (
                  <p className="mt-1 truncate text-xs text-[var(--text-tertiary)]">
                    {refunded >= payment.amountPaise ? copy.refunded : copy.partiallyRefunded} ·{" "}
                    {formatInr(refunded)}
                  </p>
                ) : null}
              </div>
              {refundable ? (
                <ZookButton
                  type="button"
                  size="sm"
                  tone="ghost"
                  onClick={() => onStartRefund(payment)}
                  disabled={busyId === `refund:${payment.id}`}
                  state={busyId === `refund:${payment.id}` ? "loading" : "idle"}
                >
                  {busyId === `refund:${payment.id}` ? copy.refunding : copy.refund}
                </ZookButton>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
