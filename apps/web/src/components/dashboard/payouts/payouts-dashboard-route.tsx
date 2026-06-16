"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { GlassCard } from "@/components/glass-card";
import { webApiFetch } from "@/lib/api-client";
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

function formatInr(paise: number) {
  return `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
}

export function PayoutsDashboardRoute({ orgId }: DashboardRoutePanelBaseProps) {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [staff, setStaff] = useState<StaffState>({
    staff: [],
    users: [],
  });
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [selectedTrainerId, setSelectedTrainerId] = useState("");
  const [commission, setCommission] = useState("20");
  const [baseMonthly, setBaseMonthly] = useState("0");
  const [perSession, setPerSession] = useState("50000");
  const [status, setStatus] = useState("");
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
      const [staffJson, payoutsJson] = await Promise.all([
        webApiFetch<StaffState>(`/api/orgs/${orgId}/staff`),
        webApiFetch<{ payouts: Payout[] }>(`/api/orgs/${orgId}/payouts?month=${encodeURIComponent(month)}`),
      ]);
      setStaff(staffJson);
      setPayouts(payoutsJson.payouts ?? []);
    } catch (cause) {
      setStatus(cause instanceof Error ? cause.message : "Unable to load payouts.");
    }
  }, [month, orgId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!selectedTrainerId && trainers[0]) setSelectedTrainerId(trainers[0].id);
  }, [selectedTrainerId, trainers]);

  async function saveConfig() {
    if (!selectedTrainerId) return;
    try {
      setConfigBusy(true);
      setStatus("Saving payout config...");
      await webApiFetch(`/api/orgs/${orgId}/trainers/${selectedTrainerId}/payout-config`, {
        method: "PUT",
        body: {
          baseMonthlyPaise: Math.round(Number(baseMonthly || 0) * 100),
          ptCommissionPercent: Number.parseInt(commission, 10) || 0,
          perSessionFeePaise: Math.round(Number(perSession || 0) * 100),
          payDay: 5,
        },
        feedback: { success: "Payout config saved." },
      });
      await load();
      setStatus("Payout config saved.");
    } catch (cause) {
      setStatus(cause instanceof Error ? cause.message : "Unable to save payout config.");
    } finally {
      setConfigBusy(false);
    }
  }

  async function markPaid(payout: Payout) {
    const trainerName = payout.trainer?.name ?? "this trainer";
    if (!window.confirm(`Mark ${trainerName}'s payout of ${formatInr(payout.totalPaise)} as paid?`)) {
      return;
    }
    try {
      setBusyPayoutId(payout.id);
      setStatus("Marking payout paid...");
      await webApiFetch(`/api/orgs/${orgId}/payouts/${payout.id}/mark-paid`, {
        method: "POST",
        body: { method: "UPI", note: "Closed from dashboard" },
        feedback: { success: "Payout marked paid." },
      });
      await load();
      setStatus("Payout marked paid.");
    } catch (cause) {
      setStatus(cause instanceof Error ? cause.message : "Unable to mark payout paid.");
    } finally {
      setBusyPayoutId(null);
    }
  }

  return (
    <div className="grid gap-4">
      <GlassCard className="p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end">
          <label className="grid gap-1 text-sm text-[var(--text-secondary)]">
            Month
            <input className="zook-focus rounded-lg border border-[var(--border)] bg-[var(--bg-sunken)] px-3 py-2 text-[var(--text-primary)]" type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm text-[var(--text-secondary)]">
            Trainer
            <select className="zook-focus rounded-lg border border-[var(--border)] bg-[var(--bg-sunken)] px-3 py-2 text-[var(--text-primary)]" value={selectedTrainerId} onChange={(event) => setSelectedTrainerId(event.target.value)}>
              {trainers.map((trainer) => <option key={trainer.id} value={trainer.id}>{trainer.name}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm text-[var(--text-secondary)]">
            Base monthly ₹
            <input className="zook-focus rounded-lg border border-[var(--border)] bg-[var(--bg-sunken)] px-3 py-2 text-[var(--text-primary)]" value={baseMonthly} onChange={(event) => setBaseMonthly(event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm text-[var(--text-secondary)]">
            PT commission %
            <input className="zook-focus rounded-lg border border-[var(--border)] bg-[var(--bg-sunken)] px-3 py-2 text-[var(--text-primary)]" value={commission} onChange={(event) => setCommission(event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm text-[var(--text-secondary)]">
            Per session ₹
            <input className="zook-focus rounded-lg border border-[var(--border)] bg-[var(--bg-sunken)] px-3 py-2 text-[var(--text-primary)]" value={perSession} onChange={(event) => setPerSession(event.target.value)} />
          </label>
          <button className="zook-focus rounded-lg bg-[var(--accent-fill)] px-4 py-2 font-semibold text-[var(--text-on-accent)] disabled:cursor-not-allowed disabled:opacity-60" disabled={configBusy} onClick={() => void saveConfig()}>{configBusy ? "Saving..." : "Save config"}</button>
        </div>
        {status ? <p className="mt-3 text-sm text-[var(--text-secondary)]">{status}</p> : null}
      </GlassCard>
      <div className="grid gap-3 md:grid-cols-2">
        {payouts.map((payout) => (
          <GlassCard key={payout.id} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-[var(--text-secondary)]">{payout.trainer?.name ?? payout.trainerId}</p>
                <h2 className="mt-1 text-2xl font-black text-[var(--text-primary)]">{formatInr(payout.totalPaise)}</h2>
              </div>
              <span className="rounded-lg border border-[var(--border)] px-2 py-1 text-xs uppercase text-[var(--text-secondary)]">{payout.status}</span>
            </div>
            <div className="mt-4 grid gap-2">
              {payout.lines.map((line) => (
                <div key={line.id} className="flex justify-between gap-3 text-sm">
                  <span className="text-[var(--text-secondary)]">{line.description}</span>
                  <span className="font-semibold text-[var(--text-primary)]">{formatInr(line.amountPaise)}</span>
                </div>
              ))}
            </div>
            {payout.status !== "paid" ? (
              <button className="zook-focus mt-4 rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-semibold text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-60" disabled={busyPayoutId === payout.id} onClick={() => void markPaid(payout)}>{busyPayoutId === payout.id ? "Marking..." : "Mark paid"}</button>
            ) : null}
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
