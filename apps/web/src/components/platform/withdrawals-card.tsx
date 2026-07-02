"use client";

import { useCallback, useEffect, useState } from "react";

import { StatusPill } from "../dashboard-primitives";
import { Pill, type PillTone } from "../glass-card";
import { ZookButton } from "../zook-button";
import { webApiFetch } from "@/lib/api-client";
import { formatDateTime, formatInr } from "@/lib/format";

export type RewardWithdrawalRow = {
  id: string;
  userId: string;
  amountPaise: number;
  status: string;
  requestedAt: string;
  paidAt?: string | null;
  paidMethod?: string | null;
  user: { id: string; name: string | null; email: string } | null;
};

/**
 * Platform-owner review + payout of member/trainer reward-cash withdrawals
 * (the manual-payout step of "accrue + manual"). Backend:
 * GET /api/platform/rewards/withdrawals, POST .../:id/mark-paid.
 */
export function PlatformWithdrawalsCard() {
  const [rows, setRows] = useState<RewardWithdrawalRow[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ message: string; tone: PillTone } | null>(null);

  const load = useCallback(() => {
    void webApiFetch<{ withdrawals: RewardWithdrawalRow[] }>("/api/platform/rewards/withdrawals")
      .then((payload) => setRows(payload.withdrawals))
      .catch((cause) =>
        setNotice({ message: cause instanceof Error ? cause.message : "Unable to load withdrawals.", tone: "red" }),
      );
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function markPaid(id: string) {
    setBusyId(id);
    setNotice(null);
    try {
      await webApiFetch(`/api/platform/rewards/withdrawals/${id}/mark-paid`, {
        method: "POST",
        body: { method: "Manual payout" },
      });
      setNotice({ message: "Marked paid.", tone: "lime" });
      load();
    } catch (cause) {
      setNotice({ message: cause instanceof Error ? cause.message : "Unable to mark paid.", tone: "red" });
    } finally {
      setBusyId(null);
    }
  }

  const pending = (rows ?? []).filter((row) => row.status === "REQUESTED");

  return (
    <div className="mt-5 rounded-[22px] border border-white/10 bg-black/20 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">Reward payouts</p>
          <p className="mt-1 text-sm font-semibold text-white">Member / trainer withdrawal requests</p>
        </div>
        {pending.length ? <Pill tone="amber">{pending.length} to pay</Pill> : <Pill tone="neutral">Clear</Pill>}
      </div>
      {rows === null ? (
        <p className="mt-4 text-sm text-white/45">Loading withdrawals...</p>
      ) : rows.length === 0 ? (
        <p className="mt-4 text-sm text-white/45">No withdrawal requests yet.</p>
      ) : (
        <div className="mt-4 grid gap-2">
          {rows.map((row) => (
            <div
              key={row.id}
              className="flex items-center gap-3 rounded-[16px] border border-white/10 bg-black/25 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">
                  {row.user?.name ?? row.user?.email ?? "Member"}
                </p>
                <p className="truncate text-xs text-white/45">{formatDateTime(row.requestedAt)}</p>
              </div>
              <p className="text-sm font-semibold text-white">{formatInr(row.amountPaise)}</p>
              {row.status === "REQUESTED" ? (
                <ZookButton size="sm" onClick={() => void markPaid(row.id)} disabled={busyId === row.id}>
                  {busyId === row.id ? "..." : "Mark paid"}
                </ZookButton>
              ) : (
                <StatusPill value={row.status} tone={row.status === "PAID" ? "lime" : "neutral"} />
              )}
            </div>
          ))}
        </div>
      )}
      {notice ? (
        <div className="mt-3">
          <Pill tone={notice.tone}>{notice.message}</Pill>
        </div>
      ) : null}
    </div>
  );
}
