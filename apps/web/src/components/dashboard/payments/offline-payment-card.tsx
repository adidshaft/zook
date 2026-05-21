"use client";

import type * as React from "react";
import { formatDateTime, formatInr } from "@/lib/format";
import { SectionHeader } from "../../dashboard-primitives";
import { GlassCard } from "../../glass-card";
import { PaymentProofUpload } from "../../payment-proof-upload";
import { HelpHint, SearchableSelect } from "../../ui";
import { ZookButton } from "../../zook-button";
import type { MembershipPlanRow, MemberRow } from "../../dashboard-operational-model";
import { formatPaymentMode, modeOptions, type PaymentReceiptState } from "./payments-utils";
import type { ManualPaymentForm } from "./types";

export function OfflinePaymentCard({
  orgId,
  membershipPlans,
  members,
  manualPayment,
  setManualPayment,
  manualPaymentStatus,
  manualPaymentBusy,
  canRecordOffline,
  permissionMessage,
  lastReceipt,
  onRecordOfflinePayment,
}: {
  orgId: string;
  membershipPlans: MembershipPlanRow[];
  members: MemberRow[];
  manualPayment: ManualPaymentForm;
  setManualPayment: React.Dispatch<React.SetStateAction<ManualPaymentForm>>;
  manualPaymentStatus: string;
  manualPaymentBusy: boolean;
  canRecordOffline: boolean;
  permissionMessage: string;
  lastReceipt: PaymentReceiptState | null;
  onRecordOfflinePayment: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <GlassCard>
      <SectionHeader
        eyebrow="Record offline payment"
        title="Collected at the desk"
        description={
          <span className="inline-flex items-center gap-2">
            Use this for cash, UPI, card, or bank transfer membership payments.
            <HelpHint label="Payment mode" title="Payment mode">
              UPI is a direct bank transfer via PhonePe or GPay. Cash and Card are recorded for
              reconciliation. Bank Transfer may settle in one to two days.
            </HelpHint>
          </span>
        }
      />
      <form className="mt-5 grid gap-3" onSubmit={(event) => onRecordOfflinePayment(event)}>
        <div className="flex flex-wrap gap-2">
          {modeOptions.map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setManualPayment((current) => ({ ...current, mode }))}
              className={`zook-focus rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                manualPayment.mode === mode
                  ? "border-lime-300/45 bg-lime-300/14 text-lime-100"
                  : "border-white/10 bg-black/25 text-white/55 hover:bg-white/8"
              }`}
            >
              {formatPaymentMode(mode)}
            </button>
          ))}
        </div>
        <SearchableSelect
          label="Choose member"
          placeholder="Choose member"
          searchPlaceholder="Search members"
          value={manualPayment.memberUserId}
          onChange={(memberUserId) =>
            setManualPayment((current) => ({ ...current, memberUserId }))
          }
          options={members
            .filter((member) => member.user?.id)
            .map((member) => ({
              value: member.user!.id,
              label: member.user?.name ?? member.user?.email ?? "Member",
              description: member.user?.phone ?? member.user?.email ?? undefined,
            }))}
        />
        <SearchableSelect
          label="Choose plan"
          placeholder="Choose plan"
          searchPlaceholder="Search plans"
          value={manualPayment.planId}
          onChange={(planId) => {
            const plan = membershipPlans.find((candidate) => candidate.id === planId);
            setManualPayment((current) => ({
              ...current,
              planId,
              amountRupees: plan ? String(plan.pricePaise / 100) : current.amountRupees,
            }));
          }}
          options={membershipPlans
            .filter((plan) => plan.active)
            .map((plan) => ({
              value: plan.id,
              label: plan.name,
              description: formatInr(plan.pricePaise),
            }))}
        />
        <div className="grid gap-3 md:grid-cols-2">
          <input
            value={manualPayment.amountRupees}
            onChange={(event) =>
              setManualPayment((current) => ({ ...current, amountRupees: event.target.value }))
            }
            inputMode="decimal"
            placeholder="Amount"
            className="zook-focus min-h-11 rounded-2xl border border-white/10 bg-black/30 px-4 text-sm text-white"
            required
          />
          <select
            value={manualPayment.mode}
            onChange={(event) =>
              setManualPayment((current) => ({ ...current, mode: event.target.value }))
            }
            className="zook-focus min-h-11 rounded-2xl border border-white/10 bg-black/30 px-4 text-sm text-white"
          >
            {modeOptions.map((mode) => (
              <option key={mode} value={mode} className="bg-black">
                {formatPaymentMode(mode)}
              </option>
            ))}
          </select>
        </div>
        <PaymentProofUpload
          orgId={orgId}
          value={manualPayment.proofAssetId}
          onChange={(proofAssetId) =>
            setManualPayment((current) => ({ ...current, proofAssetId }))
          }
        />
        <input
          value={manualPayment.receiptNumber}
          onChange={(event) =>
            setManualPayment((current) => ({ ...current, receiptNumber: event.target.value }))
          }
          placeholder="Reference number"
          className="zook-focus min-h-11 rounded-2xl border border-white/10 bg-black/30 px-4 text-sm text-white"
        />
        <textarea
          value={manualPayment.notes}
          onChange={(event) =>
            setManualPayment((current) => ({ ...current, notes: event.target.value }))
          }
          placeholder="Notes"
          className="zook-focus min-h-24 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white"
        />
        <ZookButton
          type="submit"
          disabled={manualPaymentBusy || !canRecordOffline}
          state={manualPaymentBusy ? "loading" : "idle"}
          title={!canRecordOffline ? permissionMessage : undefined}
        >
          {manualPaymentBusy ? "Recording..." : "Record payment"}
        </ZookButton>
        <div className="rounded-2xl border border-amber-300/25 bg-amber-300/10 p-4 text-sm leading-6 text-amber-50/82">
          Manual/offline payments are recorded with audit logs. Membership activation still follows
          the server confirmation rules for the selected payment path.
        </div>
        {manualPaymentStatus ? <p className="text-sm text-white/58">{manualPaymentStatus}</p> : null}
      </form>
      {lastReceipt ? (
        <div className="mt-5 rounded-[22px] border border-lime-300/20 bg-lime-300/10 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-lime-100/70">
            Receipt ready
          </p>
          <p className="mt-2 text-lg font-semibold text-white">{lastReceipt.title}</p>
          <div className="mt-3 grid gap-2 text-sm text-white/65">
            <p>Amount: {formatInr(lastReceipt.amountPaise)}</p>
            <p>Mode: {formatPaymentMode(lastReceipt.mode)}</p>
            <p>Reference: {lastReceipt.reference || "Not added"}</p>
            <p>Recorded: {formatDateTime(lastReceipt.recordedAt)}</p>
          </div>
          <ZookButton
            type="button"
            tone="ghost"
            size="sm"
            onClick={() => window.print()}
            className="mt-4"
          >
            Print receipt
          </ZookButton>
        </div>
      ) : null}
    </GlassCard>
  );
}
