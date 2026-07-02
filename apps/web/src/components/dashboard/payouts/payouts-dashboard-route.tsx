"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ConfirmActionButton } from "@/components/confirm-action-button";
import { EmptyState, SectionHeader } from "@/components/dashboard-primitives";
import { GlassCard } from "@/components/glass-card";
import { webApiFetch } from "@/lib/api-client";
import { formatInr } from "@/lib/format";
import { rupeesToPaise } from "@/lib/payment-amount";
import { useT } from "@/lib/use-t";
import type { DashboardRoutePanelBaseProps } from "../route-panels";

type StaffUser = { id: string; name: string; email: string };
type StaffAssignment = { userId: string; role: string };
type StaffState = { staff: StaffAssignment[]; users: StaffUser[] };
type PayoutLine = { id: string; description: string; amountPaise: number; kind: string };
type Payout = {
  id: string;
  trainerId: string;
  totalPaise: number;
  status: string;
  trainer?: StaffUser | null;
  lines: PayoutLine[];
};

export function PayoutsDashboardRoute({ orgId }: DashboardRoutePanelBaseProps) {
  const t = useT("payouts");
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [staff, setStaff] = useState<StaffState>({
    staff: [],
    users: [],
  });
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [selectedTrainerId, setSelectedTrainerId] = useState("");
  const [commission, setCommission] = useState("20");
  const [baseMonthly, setBaseMonthly] = useState("0");
  const [perSession, setPerSession] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [configBusy, setConfigBusy] = useState(false);
  const [busyPayoutId, setBusyPayoutId] = useState<string | null>(null);
  const trainers = useMemo(
    () =>
      staff.staff
        .filter((assignment) => assignment.role === "TRAINER")
        .map((assignment) => staff.users.find((user) => user.id === assignment.userId))
        .filter(Boolean) as StaffUser[],
    [staff],
  );

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [staffJson, payoutsJson] = await Promise.all([
        webApiFetch<StaffState>(`/api/orgs/${orgId}/staff`),
        webApiFetch<{ payouts: Payout[] }>(`/api/orgs/${orgId}/payouts?month=${encodeURIComponent(month)}`),
      ]);
      setStaff(staffJson);
      setPayouts(payoutsJson.payouts ?? []);
    } catch (cause) {
      setStatus(cause instanceof Error ? cause.message : t("unableLoadPayouts"));
    } finally {
      setLoading(false);
    }
  }, [month, orgId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!selectedTrainerId && trainers[0]) setSelectedTrainerId(trainers[0].id);
  }, [selectedTrainerId, trainers]);

  async function saveConfig() {
    if (!selectedTrainerId) return;
    const baseMonthlyPaise = rupeesToPaise(baseMonthly);
    const perSessionFeePaise = rupeesToPaise(perSession);
    if (baseMonthlyPaise === null || perSessionFeePaise === null) {
      setStatus(t("enterValidAmounts"));
      return;
    }
    try {
      setConfigBusy(true);
      setStatus(t("savingPayoutConfig"));
      await webApiFetch(`/api/orgs/${orgId}/trainers/${selectedTrainerId}/payout-config`, {
        method: "PUT",
        body: {
          baseMonthlyPaise,
          ptCommissionPercent: Number.parseInt(commission, 10) || 0,
          perSessionFeePaise,
          payDay: 5,
        },
        feedback: { success: t("payoutConfigSavedToast") },
      });
      await load();
      setStatus(t("payoutConfigSaved"));
    } catch (cause) {
      setStatus(cause instanceof Error ? cause.message : t("unableSavePayoutConfig"));
    } finally {
      setConfigBusy(false);
    }
  }
  async function markPaid(payout: Payout) {
    try {
      setBusyPayoutId(payout.id);
      setStatus(t("markingPayoutPaid"));
      await webApiFetch(`/api/orgs/${orgId}/payouts/${payout.id}/mark-paid`, {
        method: "POST",
        body: { method: "UPI", note: t("closedFromDashboardNote") },
        feedback: { success: t("payoutMarkedPaidToast") },
      });
      await load();
      setStatus(t("payoutMarkedPaid"));
    } catch (cause) {
      setStatus(cause instanceof Error ? cause.message : t("unableMarkPayoutPaid"));
    } finally {
      setBusyPayoutId(null);
    }
  }

  return (
    <div className="grid gap-4">
      <GlassCard className="p-5">
        <SectionHeader
          eyebrow={t("eyebrow")}
          title={t("monthlyPayoutSetup")}
          description={t("monthlyPayoutDescription")}
          badge={payouts.length ? <span className="rounded-full border border-[var(--border)] px-2.5 py-1 text-xs font-semibold text-[var(--text-secondary)]">{t("payoutCount", { count: payouts.length })}</span> : null}
        />
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(9rem,0.8fr)_minmax(12rem,1.1fr)_repeat(3,minmax(8rem,0.8fr))_auto] xl:items-end">
          <label className="grid gap-1 text-sm text-[var(--text-secondary)]">
            {t("month")}
            <input className="zook-focus rounded-lg border border-[var(--border)] bg-[var(--bg-sunken)] px-3 py-2 text-[var(--text-primary)]" type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm text-[var(--text-secondary)]">
            {t("trainer")}
            <select className="zook-focus rounded-lg border border-[var(--border)] bg-[var(--bg-sunken)] px-3 py-2 text-[var(--text-primary)]" value={selectedTrainerId} onChange={(event) => setSelectedTrainerId(event.target.value)}>
              {trainers.map((trainer) => <option key={trainer.id} value={trainer.id}>{trainer.name}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm text-[var(--text-secondary)]">
            {t("baseMonthly")}
            <input className="zook-focus rounded-lg border border-[var(--border)] bg-[var(--bg-sunken)] px-3 py-2 text-[var(--text-primary)]" inputMode="decimal" value={baseMonthly} onChange={(event) => setBaseMonthly(event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm text-[var(--text-secondary)]">
            {t("ptCommission")}
            <input className="zook-focus rounded-lg border border-[var(--border)] bg-[var(--bg-sunken)] px-3 py-2 text-[var(--text-primary)]" inputMode="numeric" value={commission} onChange={(event) => setCommission(event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm text-[var(--text-secondary)]">
            {t("perSession")}
            <input className="zook-focus rounded-lg border border-[var(--border)] bg-[var(--bg-sunken)] px-3 py-2 text-[var(--text-primary)]" inputMode="decimal" value={perSession} onChange={(event) => setPerSession(event.target.value)} />
          </label>
          <button className="zook-focus rounded-lg bg-[var(--accent-fill)] px-4 py-2 font-semibold text-[var(--text-on-accent)] disabled:cursor-not-allowed disabled:opacity-60" disabled={configBusy || !selectedTrainerId} onClick={() => void saveConfig()}>{configBusy ? t("saving") : t("save")}</button>
        </div>
        <p className="mt-3 text-xs text-[var(--text-tertiary)]">
          {t("perSessionHelp")}
        </p>
        {status ? (
          <p className="mt-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-sunken)] px-3 py-2 text-sm text-[var(--text-secondary)]">
            {status}
          </p>
        ) : null}
      </GlassCard>
      <div className="grid gap-3 md:grid-cols-2">
        {loading && payouts.length === 0 ? (
          <GlassCard className="p-5">
            <EmptyState title={t("loadingPayouts")} />
          </GlassCard>
        ) : null}
        {!loading && payouts.length === 0 ? (
          <GlassCard className="p-5">
            <EmptyState
              title={t("noPayouts")}
              description={t("noPayoutsDescription")}
            />
          </GlassCard>
        ) : null}
        {payouts.map((payout) => (
          <GlassCard key={payout.id} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-[var(--text-secondary)]">{payout.trainer?.name ?? payout.trainerId}</p>
                <h2 className="mt-1 text-2xl font-black text-[var(--text-primary)]">{formatInr(payout.totalPaise)}</h2>
              </div>
              <span className="rounded-lg border border-[var(--border)] px-2 py-1 text-xs uppercase text-[var(--text-secondary)]">{payout.status}</span>
            </div>
            <div className="mt-4 grid gap-1.5 border-t border-[var(--border-subtle)] pt-3">
              {payout.lines.map((line) => (
                <div key={line.id} className="flex justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate text-[var(--text-secondary)]">{line.description}</span>
                  <span className="font-semibold text-[var(--text-primary)]">{formatInr(line.amountPaise)}</span>
                </div>
              ))}
            </div>
            {payout.status !== "paid" ? (
              <ConfirmActionButton
                className="zook-focus mt-4 rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-semibold text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={busyPayoutId === payout.id}
                title={t("markPaidTitle", { name: payout.trainer?.name ?? t("trainerFallback") })}
                description={t("markPaidDescription", { amount: formatInr(payout.totalPaise) })}
                confirmLabel={t("markPaid")}
                onConfirm={() => markPaid(payout)}
              >
                {busyPayoutId === payout.id ? t("marking") : t("markPaid")}
              </ConfirmActionButton>
            ) : null}
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
