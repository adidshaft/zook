"use client";

import { useEffect, useMemo, useState } from "react";
import { GlassCard } from "@/components/glass-card";
import type { DashboardRoutePanelBaseProps } from "../route-panels";

type StaffUser = { id: string; name: string; email: string };
type StaffAssignment = { userId: string; role: string };
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
  const [staff, setStaff] = useState<{ staff: StaffAssignment[]; users: StaffUser[] }>({
    staff: [],
    users: [],
  });
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [selectedTrainerId, setSelectedTrainerId] = useState("");
  const [commission, setCommission] = useState("20");
  const [baseMonthly, setBaseMonthly] = useState("0");
  const [perSession, setPerSession] = useState("50000");
  const [status, setStatus] = useState("");
  const trainers = useMemo(
    () =>
      staff.staff
        .filter((assignment) => assignment.role === "TRAINER")
        .map((assignment) => staff.users.find((user) => user.id === assignment.userId))
        .filter(Boolean) as StaffUser[],
    [staff],
  );

  async function load() {
    const [staffResponse, payoutsResponse] = await Promise.all([
      fetch(`/api/orgs/${orgId}/staff`),
      fetch(`/api/orgs/${orgId}/payouts?month=${encodeURIComponent(month)}`),
    ]);
    const staffJson = (await staffResponse.json()) as { data?: typeof staff };
    const payoutsJson = (await payoutsResponse.json()) as { data?: { payouts: Payout[] } };
    setStaff(staffJson.data ?? { staff: [], users: [] });
    setPayouts(payoutsJson.data?.payouts ?? []);
  }

  useEffect(() => {
    void load();
  }, [month]);

  useEffect(() => {
    if (!selectedTrainerId && trainers[0]) setSelectedTrainerId(trainers[0].id);
  }, [selectedTrainerId, trainers]);

  async function saveConfig() {
    if (!selectedTrainerId) return;
    setStatus("Saving payout config...");
    await fetch(`/api/orgs/${orgId}/trainers/${selectedTrainerId}/payout-config`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        baseMonthlyPaise: Math.round(Number(baseMonthly || 0) * 100),
        ptCommissionPercent: Number.parseInt(commission, 10) || 0,
        perSessionFeePaise: Math.round(Number(perSession || 0) * 100),
        payDay: 5,
      }),
    });
    await load();
    setStatus("Payout config saved.");
  }

  async function markPaid(payoutId: string) {
    setStatus("Marking payout paid...");
    await fetch(`/api/orgs/${orgId}/payouts/${payoutId}/mark-paid`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ method: "UPI", note: "Closed from dashboard" }),
    });
    await load();
    setStatus("Payout marked paid.");
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
          <button className="zook-focus rounded-lg bg-[var(--accent-fill)] px-4 py-2 font-semibold text-[var(--text-on-accent)]" onClick={() => void saveConfig()}>Save config</button>
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
              <button className="zook-focus mt-4 rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-semibold text-[var(--text-primary)]" onClick={() => void markPaid(payout.id)}>Mark paid</button>
            ) : null}
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
