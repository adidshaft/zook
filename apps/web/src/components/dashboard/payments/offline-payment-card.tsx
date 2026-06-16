"use client";

import * as React from "react";
import { formatDateTime, formatInr } from "@/lib/format";
import { getRupeeAmountError, normalizeRupeeInput } from "@/lib/payment-amount";
import { SectionHeader } from "../../dashboard-primitives";
import { GlassCard } from "../../glass-card";
import { PaymentProofUpload } from "../../payment-proof-upload";
import { HelpHint, SearchableSelect } from "../../ui";
import { ZookButton } from "../../zook-button";
import type { MembershipPlanRow, MemberRow } from "@/components/dashboard/types";
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
  const [amountTouched, setAmountTouched] = React.useState(false);
  const amountError = getRupeeAmountError(manualPayment.amountRupees);

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
      <form
        className="mt-5 grid gap-3"
        onSubmit={(event) => {
          setAmountTouched(true);
          if (amountError) {
            event.preventDefault();
            return;
          }
          onRecordOfflinePayment(event);
        }}
      >
        <div className="flex flex-wrap gap-2">
          {modeOptions.map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setManualPayment((current) => ({ ...current, mode }))}
              className={`zook-focus rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                manualPayment.mode === mode
                  ? "border-[var(--accent-strong)]/40 bg-[var(--surface-accent-soft)] text-[var(--accent-strong)]"
                  : "border-[var(--border)] bg-[var(--bg-sunken)] text-[var(--text-secondary)] hover:bg-[var(--surface-raised)]"
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
          <label className="grid gap-2 text-sm text-[var(--text-secondary)]">
            Amount
            <div
              className={`flex min-h-11 items-center rounded-2xl border bg-[var(--bg-sunken)] px-4 ${
                amountTouched && amountError
                  ? "border-rose-500/60"
                  : "border-[var(--border)]"
              }`}
            >
              <span className="pr-2 text-sm font-semibold text-[var(--text-secondary)]">₹</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={manualPayment.amountRupees}
                onBlur={() => setAmountTouched(true)}
                onChange={(event) =>
                  setManualPayment((current) => ({
                    ...current,
                    amountRupees: normalizeRupeeInput(event.target.value),
                  }))
                }
                inputMode="decimal"
                placeholder="2500"
                aria-invalid={amountTouched && amountError ? true : undefined}
                className="zook-focus min-h-11 flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none"
                required
              />
            </div>
            {amountTouched && amountError ? (
              <span className="text-xs text-rose-500 dark:text-rose-300">{amountError}</span>
            ) : (
              <span className="text-xs text-[var(--text-tertiary)]">
                Enter the collected amount in rupees.
              </span>
            )}
          </label>
          <select
            value={manualPayment.mode}
            onChange={(event) =>
              setManualPayment((current) => ({ ...current, mode: event.target.value }))
            }
            className="zook-focus min-h-11 rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] px-4 text-sm text-[var(--text-primary)]"
          >
            {modeOptions.map((mode) => (
              <option key={mode} value={mode} className="bg-[var(--bg-elevated)] text-[var(--text-primary)]">
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
          className="zook-focus min-h-11 rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] px-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
        />
        <textarea
          value={manualPayment.notes}
          onChange={(event) =>
            setManualPayment((current) => ({ ...current, notes: event.target.value }))
          }
          placeholder="Notes"
          className="zook-focus min-h-24 rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
        />
        <ZookButton
          type="submit"
          disabled={manualPaymentBusy || !canRecordOffline}
          state={manualPaymentBusy ? "loading" : "idle"}
          title={!canRecordOffline ? permissionMessage : undefined}
        >
          {manualPaymentBusy ? "Recording..." : "Record payment"}
        </ZookButton>
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200 p-4 text-sm leading-6">
          Manual/offline payments are recorded with audit logs. Membership activation still follows
          the server confirmation rules for the selected payment path.
        </div>
        {manualPaymentStatus ? <p className="text-sm text-[var(--text-tertiary)]">{manualPaymentStatus}</p> : null}
      </form>
      {lastReceipt ? (
        <div className="mt-5 rounded-[22px] border border-[var(--accent-strong)]/20 bg-[var(--surface-accent-soft)] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
            Receipt ready
          </p>
          <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">{lastReceipt.title}</p>
          <div className="mt-3 grid gap-2 text-sm text-[var(--text-secondary)]">
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
