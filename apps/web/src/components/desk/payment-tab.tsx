import type { FormEvent } from "react";
import { CreditCard } from "lucide-react";
import { formatInr } from "@/lib/format";
import { GlassCard } from "../glass-card";
import { ZookButton } from "../zook-button";
import type { DeskCopy } from "./copy";
import type { MemberRow, PaymentFormState, PaymentPurpose, PlanRow, ReceiptDetails, ShopOrder } from "./types";
import { memberLabel, orderItemsSummary } from "./utils";
import { ReceiptCard } from "./receipt-card";
import { PaymentProofUpload } from "../payment-proof-upload";

export function PaymentTab({
  copy,
  busyId,
  paymentForm,
  members,
  activePlans,
  payAtDeskOrders,
  orgId,
  lastReceipt,
  onSubmit,
  onPurposeChange,
  onMemberChange,
  onOrderChange,
  onPlanChange,
  onFormChange,
}: {
  copy: DeskCopy;
  busyId: string;
  paymentForm: PaymentFormState;
  members: MemberRow[];
  activePlans: PlanRow[];
  payAtDeskOrders: ShopOrder[];
  orgId: string;
  lastReceipt: ReceiptDetails | null;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onPurposeChange: (purpose: PaymentPurpose) => void;
  onMemberChange: (userId: string) => void;
  onOrderChange: (orderId: string) => void;
  onPlanChange: (planId: string) => void;
  onFormChange: (patch: Partial<PaymentFormState>) => void;
}) {
  const selectedPaymentMember = members.find(
    (member) => member.user?.id === paymentForm.memberUserId,
  );
  const activeSubscription = selectedPaymentMember?.activeSubscription;

  return (
    <GlassCard>
      <div className="flex items-center gap-3">
        <CreditCard className="text-[var(--accent)]" size={22} />
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">{copy.recordPayment}</h1>
          <p className="mt-1 text-sm text-[var(--text-tertiary)]">{copy.paymentDescription}</p>
        </div>
      </div>
      <form className="mt-5 grid gap-4 pb-24" onSubmit={onSubmit}>
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
                      New membership
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
                    {activeSubscription ? "Use selected membership" : copy.renewExisting}
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
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm text-[var(--text-secondary)]">
            {copy.amount}
            <input
              value={paymentForm.amountRupees}
              onChange={(event) => onFormChange({ amountRupees: event.target.value })}
              inputMode="decimal"
              placeholder="2500"
              className="zook-focus min-h-12 rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] px-4 text-[var(--text-primary)] transition focus:border-[var(--border-focus)]"
              required
            />
          </label>
          <label className="grid gap-2 text-sm text-[var(--text-secondary)]">
            {copy.referenceNumber}
            <input
              value={paymentForm.receiptNumber}
              onChange={(event) => onFormChange({ receiptNumber: event.target.value })}
              placeholder={copy.referencePlaceholder}
              className="zook-focus min-h-12 rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] px-4 text-[var(--text-primary)] transition focus:border-[var(--border-focus)]"
            />
          </label>
        </div>
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
        <ZookButton
          type="submit"
          disabled={busyId === "payment"}
          state={busyId === "payment" ? "loading" : "idle"}
        >
          {busyId === "payment" ? copy.recording : copy.recordPayment}
        </ZookButton>
      </form>
      {lastReceipt ? <ReceiptCard copy={copy} receipt={lastReceipt} /> : null}
    </GlassCard>
  );
}
