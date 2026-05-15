import type { FormEvent } from "react";
import { CreditCard } from "lucide-react";
import { formatInr } from "@/lib/format";
import { GlassCard } from "../glass-card";
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
        <CreditCard className="text-lime-200" size={22} />
        <div>
          <h1 className="text-2xl font-semibold text-white">{copy.recordPayment}</h1>
          <p className="mt-1 text-sm text-white/48">{copy.paymentDescription}</p>
        </div>
      </div>
      <form className="mt-5 grid gap-4 pb-24" onSubmit={onSubmit}>
        <fieldset className="grid gap-2">
          <legend className="text-sm text-white/62">{copy.paymentPurpose}</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {[
              ["MEMBERSHIP", copy.membershipPayment],
              ["SHOP_ORDER", copy.shopOrderPayment],
              ["OTHER", copy.otherPayment],
            ].map(([purpose, label]) => (
              <label
                key={purpose}
                className={`zook-focus flex min-h-12 items-center gap-3 rounded-2xl border px-4 text-sm font-semibold ${
                  paymentForm.purpose === purpose
                    ? "border-lime-300/50 bg-lime-300/12 text-lime-50"
                    : "border-white/10 bg-black/20 text-white/62"
                }`}
              >
                <input
                  type="radio"
                  name="purpose"
                  value={purpose}
                  checked={paymentForm.purpose === purpose}
                  onChange={() => onPurposeChange(purpose as PaymentPurpose)}
                  className="accent-lime-300"
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="grid gap-2 text-sm text-white/62">
          {copy.member}
          <select
            value={paymentForm.memberUserId}
            onChange={(event) => onMemberChange(event.target.value)}
            className="zook-focus min-h-12 rounded-2xl border border-white/10 bg-black/30 px-4 text-white"
            required={paymentForm.purpose === "MEMBERSHIP"}
          >
            <option value="" className="bg-black">
              {copy.chooseMember}
            </option>
            {members.map((member) => (
              <option key={member.profile.id} value={member.user?.id ?? ""} className="bg-black">
                {memberLabel(member)}
              </option>
            ))}
          </select>
        </label>
        {paymentForm.purpose === "SHOP_ORDER" ? (
          <label className="grid gap-2 text-sm text-white/62">
            {copy.shopOrderPayment}
            <select
              value={paymentForm.shopOrderId}
              onChange={(event) => onOrderChange(event.target.value)}
              className="zook-focus min-h-12 rounded-2xl border border-white/10 bg-black/30 px-4 text-white"
              required
            >
              <option value="" className="bg-black">
                {copy.chooseOrder}
              </option>
              {payAtDeskOrders.map((order) => (
                <option key={order.id} value={order.id} className="bg-black">
                  {order.user?.name ?? "Member"} - {orderItemsSummary(order)} -{" "}
                  {formatInr(order.totalPaise)}
                </option>
              ))}
            </select>
            {!payAtDeskOrders.length ? (
              <span className="text-xs text-white/38">{copy.noPayAtDeskOrders}</span>
            ) : null}
          </label>
        ) : null}
        <div className="grid gap-4 md:grid-cols-2">
          {paymentForm.purpose === "MEMBERSHIP" ? (
            <div className="grid gap-3">
              {activeSubscription ? (
                <label className="grid gap-2 text-sm text-white/62">
                  {copy.membership}
                  <select
                    value={paymentForm.subscriptionId}
                    onChange={(event) =>
                      onFormChange({ subscriptionId: event.target.value, planId: "" })
                    }
                    className="zook-focus min-h-12 rounded-2xl border border-white/10 bg-black/30 px-4 text-white"
                  >
                    <option value="" className="bg-black">
                      New membership
                    </option>
                    <option value={activeSubscription.id} className="bg-black">
                      {copy.renewExisting}
                    </option>
                  </select>
                </label>
              ) : null}
              <label className="grid gap-2 text-sm text-white/62">
                {copy.plan}
                <select
                  value={paymentForm.planId}
                  onChange={(event) => onPlanChange(event.target.value)}
                  className="zook-focus min-h-12 rounded-2xl border border-white/10 bg-black/30 px-4 text-white"
                >
                  <option value="" className="bg-black">
                    {activeSubscription ? "Use selected membership" : copy.renewExisting}
                  </option>
                  {activePlans.map((plan) => (
                    <option key={plan.id} value={plan.id} className="bg-black">
                      {plan.name} - {formatInr(plan.pricePaise)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : null}
          <label className="grid gap-2 text-sm text-white/62">
            {copy.mode}
            <select
              value={paymentForm.mode}
              onChange={(event) => onFormChange({ mode: event.target.value })}
              className="zook-focus min-h-12 rounded-2xl border border-white/10 bg-black/30 px-4 text-white"
            >
              <option value="CASH" className="bg-black">
                Cash
              </option>
              <option value="DIRECT_UPI" className="bg-black">
                UPI
              </option>
              <option value="CARD" className="bg-black">
                Card
              </option>
              <option value="BANK_TRANSFER" className="bg-black">
                Bank transfer
              </option>
              <option value="OTHER" className="bg-black">
                Other
              </option>
            </select>
          </label>
        </div>
        {paymentForm.purpose === "OTHER" ? (
          <label className="grid gap-2 text-sm text-white/62">
            {copy.reason}
            <input
              value={paymentForm.description}
              onChange={(event) => onFormChange({ description: event.target.value })}
              placeholder={copy.reasonPlaceholder}
              className="zook-focus min-h-12 rounded-2xl border border-white/10 bg-black/30 px-4 text-white"
              required
            />
          </label>
        ) : null}
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm text-white/62">
            {copy.amount}
            <input
              value={paymentForm.amountRupees}
              onChange={(event) => onFormChange({ amountRupees: event.target.value })}
              inputMode="decimal"
              placeholder="2500"
              className="zook-focus min-h-12 rounded-2xl border border-white/10 bg-black/30 px-4 text-white"
              required
            />
          </label>
          <label className="grid gap-2 text-sm text-white/62">
            {copy.referenceNumber}
            <input
              value={paymentForm.receiptNumber}
              onChange={(event) => onFormChange({ receiptNumber: event.target.value })}
              placeholder={copy.referencePlaceholder}
              className="zook-focus min-h-12 rounded-2xl border border-white/10 bg-black/30 px-4 text-white"
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
        <label className="grid gap-2 text-sm text-white/62">
          {copy.notes}
          <textarea
            value={paymentForm.notes}
            onChange={(event) => onFormChange({ notes: event.target.value })}
            className="zook-focus min-h-24 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white"
          />
        </label>
        <button
          type="submit"
          disabled={busyId === "payment"}
          className="zook-focus min-h-12 rounded-full bg-lime-300 px-5 text-sm font-semibold text-black disabled:opacity-50"
        >
          {busyId === "payment" ? copy.recording : copy.recordPayment}
        </button>
      </form>
      {lastReceipt ? <ReceiptCard copy={copy} receipt={lastReceipt} /> : null}
    </GlassCard>
  );
}
