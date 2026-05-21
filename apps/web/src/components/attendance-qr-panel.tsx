"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Clock3, QrCode, RefreshCcw, ShieldCheck, Users } from "lucide-react";
import { ZookButton } from "@/components/zook-button";
import QRCode from "qrcode";
import { GlassCard, Pill } from "./glass-card";
import { AvatarInitials, StatusDot } from "./dashboard-primitives";
import { webApiFetch } from "@/lib/api-client";

type PendingAttendanceRecord = {
  id: string;
  status: "PENDING_APPROVAL" | "FLAGGED" | string;
  checkedInAt?: string | Date | null;
  user?: { name?: string | null } | null;
  profile?: { membershipStatus?: string | null } | null;
  plan?: { name?: string | null } | null;
};

export function AttendanceQrPanel({
  orgId,
  branchId,
  branchName,
  density = "standard",
}: {
  orgId: string;
  branchId?: string | null;
  branchName?: string | null;
  density?: "standard" | "compact";
}) {
  const [qrPayload, setQrPayload] = useState<string>("");
  const [checkInCode, setCheckInCode] = useState<string>("");
  const [qrImageUrl, setQrImageUrl] = useState<string>("");
  const [expiresAt, setExpiresAt] = useState<string>("");
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState(30);
  const [queueRecords, setQueueRecords] = useState<PendingAttendanceRecord[]>([]);
  const [error, setError] = useState<string>("");
  const [qrRenderError, setQrRenderError] = useState<string>("");

  const loadToken = useCallback(async () => {
    try {
      setError("");
      const query = branchId ? `?branchId=${encodeURIComponent(branchId)}` : "";
      const payload = await webApiFetch<{
        qrPayload: string;
        checkInCode?: string;
        expiresAt: string;
      }>(
        `/api/orgs/${orgId}/attendance/qr-token${query}`,
        { method: "POST" },
      );
      setQrPayload(payload.qrPayload);
      setCheckInCode(payload.checkInCode ?? "");
      setExpiresAt(payload.expiresAt);
      setLastRefreshedAt(new Date());
      setSecondsRemaining(30);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load attendance QR token.");
    }
  }, [branchId, orgId]);

  const loadQueue = useCallback(async () => {
    try {
      const query = branchId ? `?branchId=${encodeURIComponent(branchId)}` : "";
      const payload = await webApiFetch<{ records: PendingAttendanceRecord[] }>(
        `/api/orgs/${orgId}/attendance/pending${query}`,
      );
      setQueueRecords(payload.records ?? []);
    } catch {
      setQueueRecords([]);
    }
  }, [branchId, orgId]);

  useEffect(() => {
    void loadToken();
    void loadQueue();
    const timer = window.setInterval(() => {
      void loadToken();
      void loadQueue();
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [loadQueue, loadToken]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!lastRefreshedAt) {
        setSecondsRemaining(30);
        return;
      }
      const elapsed = Math.floor((Date.now() - lastRefreshedAt.getTime()) / 1000);
      setSecondsRemaining(Math.max(0, 30 - elapsed));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [lastRefreshedAt]);

  useEffect(() => {
    if (!qrPayload) {
      setQrImageUrl("");
      return;
    }

    let active = true;
    setQrRenderError("");
    void QRCode.toDataURL(qrPayload, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 280,
      color: {
        dark: "#070908",
        light: "#f6ffe2",
      },
    })
      .then((dataUrl) => {
        if (active) {
          setQrImageUrl(dataUrl);
        }
      })
      .catch(() => {
        if (active) {
          setQrRenderError("Unable to show the QR image. Refresh and try again.");
        }
      });

    return () => {
      active = false;
    };
  }, [qrPayload]);

  return (
    <GlassCard variant="strong" className="rounded-[24px] border-[var(--border)] bg-[var(--bg-sunken)] shadow-none">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Live Attendance QR</h2>
          <p className="mt-1 text-sm text-[var(--text-tertiary)]">
            Scan the QR code to mark attendance for {branchName ?? "this branch"}.
          </p>
        </div>
        <ZookButton
          tone="ghost"
          size="sm"
          onClick={() => void loadToken()}
          leadingIcon={<RefreshCcw size={16} />}
        >
          Refresh
        </ZookButton>
      </div>
      <div className="mt-5 rounded-[24px] border border-[var(--border)] bg-[var(--bg-sunken)]/60 p-5">
        <div className="flex items-center gap-2 text-[var(--accent-strong)]">
          <QrCode size={18} />
          <span className="text-sm font-medium">Rolling signed QR token · Refreshes every 30 seconds</span>
        </div>
        {error ? <p className="mt-4 text-sm text-[var(--feedback-danger)]">{error}</p> : null}
        {!error ? (
          <div
            className={
              density === "compact"
                ? "mt-4 grid gap-5"
                : "mt-4 grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]"
            }
          >
            <div
              className={
                density === "compact"
                  ? "grid min-h-[240px] place-items-center rounded-[26px] border border-lime-200/25 bg-lime-50 p-4 shadow-[0_18px_46px_rgba(185,244,85,0.18),inset_0_1px_0_rgba(255,255,255,0.45)]"
                  : "grid min-h-[300px] place-items-center rounded-[26px] border border-lime-200/25 bg-lime-50 p-4 shadow-[0_18px_46px_rgba(185,244,85,0.18),inset_0_1px_0_rgba(255,255,255,0.45)]"
              }
            >
              {qrImageUrl ? (
                <img
                  src={qrImageUrl}
                  alt="Attendance QR code"
                  className={
                    density === "compact"
                      ? "h-full max-h-[240px] w-full max-w-[240px] rounded-xl"
                      : "h-full max-h-[280px] w-full max-w-[280px] rounded-xl"
                  }
                />
              ) : (
                <p className="text-center text-sm font-medium text-black/60">
                  {qrPayload ? "Rendering QR..." : "Loading QR..."}
                </p>
              )}
            </div>
            <div className="flex min-w-0 flex-col justify-between gap-4">
              <div>
                <p className="text-sm leading-6 text-[var(--text-secondary)]">
                  Display this at reception or the entry gate. Members can scan the QR or type the
                  short code in the mobile app. The token is generated by the server and refreshes
                  automatically every 30 seconds in this console.
                </p>
                <div className="mt-5 rounded-2xl border border-[color-mix(in_srgb,var(--accent)_20%,transparent)] bg-[var(--surface-accent-soft)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]/70">
                    Rolling signed QR token
                  </p>
                  <p className="mt-2 break-all font-mono text-3xl font-black tracking-[0.12em] text-[var(--accent-strong)] sm:text-4xl">
                    {checkInCode || "-- ----"}
                  </p>
                  <p className="mt-2 text-sm leading-5 text-[var(--text-tertiary)]">
                    Short entry code uses the same branch and expiry as the QR.
                  </p>
                </div>
                <div className="mt-5 grid place-items-center">
                  <div className="relative h-32 w-32">
                    <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
                      <circle cx="64" cy="64" r="50" fill="none" stroke="var(--border)" strokeWidth="8" />
                      <circle
                        cx="64"
                        cy="64"
                        r="50"
                        fill="none"
                        stroke="var(--accent)"
                        strokeLinecap="round"
                        strokeWidth="8"
                        strokeDasharray={`${(Math.max(secondsRemaining, 0) / 30) * 314} 314`}
                      />
                    </svg>
                    <div className="absolute inset-0 grid place-items-center text-center">
                      <div>
                        <p className="text-3xl font-black tabular-nums text-[var(--text-primary)]">{secondsRemaining}</p>
                        <p className="text-xs text-[var(--text-tertiary)]">sec</p>
                      </div>
                    </div>
                  </div>
                </div>
                {qrRenderError ? (
                  <p className="mt-3 text-sm text-[var(--feedback-danger)]">{qrRenderError}</p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <Pill tone="lime">Check-in ready</Pill>
                {branchName ? <Pill>{branchName}</Pill> : null}
                {expiresAt ? <Pill>Expires {new Date(expiresAt).toLocaleTimeString()}</Pill> : null}
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)]/60 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)]">
                  <ShieldCheck className="h-4 w-4 text-[var(--accent)]" aria-hidden="true" />
                  Validation checklist
                </div>
                <div className="mt-3 grid gap-2 text-sm text-[var(--text-secondary)]">
                  {[
                    ["Server-authoritative validation", "Attendance verified with secure token"],
                    ["Replay protection", "Each QR can be used only once"],
                    ["Branch check", `Valid for ${branchName ?? "selected branch"}`],
                    ["Membership check", "Active plan & status verified"],
                  ].map(([item, detail]) => (
                    <div key={item} className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[var(--accent)]" aria-hidden="true" />
                      <span>
                        <span className="block text-[var(--text-primary)]">{item}</span>
                        <span className="block text-xs text-[var(--text-tertiary)]">{detail}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
      <div className="mt-5 rounded-[24px] border border-[var(--border)] bg-[var(--bg-sunken)]/40 p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-[var(--text-secondary)]" aria-hidden="true" />
            <h3 className="text-base font-semibold text-[var(--text-primary)]">Pending / Flagged Queue</h3>
          </div>
          <Pill>{queueRecords.length}</Pill>
        </div>
        <div className="mt-4 flex gap-2">
          <button className="rounded-lg border border-[var(--border-focus)] bg-[var(--surface-accent-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--accent-strong)]">
            Pending ({queueRecords.filter((record) => record.status === "PENDING_APPROVAL").length})
          </button>
          <button className="rounded-lg border border-[var(--border)] bg-[var(--bg-sunken)] px-3 py-1.5 text-xs font-semibold text-[var(--text-tertiary)]">
            Flagged ({queueRecords.filter((record) => record.status === "FLAGGED").length})
          </button>
        </div>
        <div className="mt-3 grid gap-2">
          {(queueRecords.length ? queueRecords.slice(0, 4) : []).map((record) => {
            const name = record.user?.name ?? "Member review";
            const checkedInAt = record.checkedInAt ? new Date(record.checkedInAt) : null;
            const flagged = record.status === "FLAGGED";
            return (
              <div key={record.id} className="flex items-center gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-3 py-2">
                <AvatarInitials name={name} className="h-9 w-9 rounded-full" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{name}</p>
                  <p className="truncate text-xs text-[var(--text-tertiary)]">
                    {record.plan?.name ?? (flagged ? "Manual review required" : "Pending validation")}
                  </p>
                </div>
                <p className="text-xs text-[var(--text-tertiary)]">
                  {checkedInAt ? checkedInAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--"}
                </p>
                <StatusDot tone={flagged ? "red" : "amber"} />
              </div>
            );
          })}
          {!queueRecords.length ? (
            <p className="rounded-xl border border-dashed border-[var(--border)] px-3 py-4 text-sm text-[var(--text-tertiary)]">
              No pending or flagged scans right now.
            </p>
          ) : null}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--bg-sunken)]/60 px-4 py-3 text-xs text-[var(--text-tertiary)]">
        <span className="inline-flex items-center gap-2 text-[var(--accent-strong)]">
          <StatusDot tone="lime" /> Attendance sync: Live
        </span>
        <span>Token ID: {qrPayload ? qrPayload.slice(-8) : "--"}</span>
        <span>
          Last refreshed:{" "}
          {lastRefreshedAt ? lastRefreshedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--"}
        </span>
        <button onClick={() => void loadToken()} className="inline-flex items-center gap-1 text-[var(--text-secondary)] hover:text-[var(--accent)]">
          <Clock3 className="h-3.5 w-3.5" aria-hidden="true" /> Refresh
        </button>
      </div>
    </GlassCard>
  );
}
