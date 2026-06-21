"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, QrCode, Smartphone } from "lucide-react";
import { GlassCard, Pill } from "./glass-card";

/**
 * Public fallback shown when a gym check-in QR (a universal link to /checkin)
 * is opened on a device where the app did NOT intercept the link — usually
 * because the app isn't installed. If it IS installed, we still try the custom
 * scheme as a second bridge. Otherwise we surface the short code + store links.
 */
export function CheckInLanding({
  qrPayload,
  checkInCode,
}: {
  qrPayload: string;
  checkInCode: string;
}) {
  const [triedDeepLink, setTriedDeepLink] = useState(false);

  const appDeepLink = useMemo(() => {
    const params = new URLSearchParams();
    if (qrPayload) params.set("qrPayload", qrPayload);
    if (checkInCode) params.set("checkInCode", checkInCode);
    const query = params.toString();
    return query ? `zook://checkin?${query}` : "zook://checkin";
  }, [qrPayload, checkInCode]);

  // Best-effort: try to hand off to the installed app via the custom scheme.
  // If nothing handles it, the page stays put and the manual options remain.
  useEffect(() => {
    if (!qrPayload && !checkInCode) return;
    const timer = window.setTimeout(() => {
      setTriedDeepLink(true);
      window.location.href = appDeepLink;
    }, 350);
    return () => window.clearTimeout(timer);
  }, [appDeepLink, checkInCode, qrPayload]);

  const hasTarget = Boolean(qrPayload || checkInCode);

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col justify-center gap-6 px-5 py-12">
      <GlassCard variant="strong" className="rounded-[28px] border-[var(--border)] bg-[var(--bg-sunken)]">
        <div className="flex flex-col items-center gap-5 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-[var(--surface-accent-soft)] text-[var(--accent-strong)]">
            <QrCode size={30} aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Check in to your gym</h1>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              {hasTarget
                ? "Opening the Zook app to confirm your check-in…"
                : "This link is missing its check-in details. Ask reception to refresh the QR."}
            </p>
          </div>

          {checkInCode ? (
            <div className="w-full rounded-2xl border border-[color-mix(in_srgb,var(--accent)_20%,transparent)] bg-[var(--surface-accent-soft)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]/70">
                Your check-in code
              </p>
              <p className="mt-1 font-mono text-4xl font-black tracking-[0.12em] text-[var(--accent-strong)]">
                {checkInCode}
              </p>
              <p className="mt-2 text-xs leading-5 text-[var(--text-tertiary)]">
                Open Zook → Scan → Enter code if the app didn’t open automatically.
              </p>
            </div>
          ) : null}

          {hasTarget ? (
            <a
              href={appDeepLink}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[var(--accent-contrast,#0b0d0a)] transition hover:opacity-90"
            >
              <Smartphone size={18} aria-hidden="true" />
              Open in the Zook app
            </a>
          ) : null}

          <div className="flex w-full flex-col gap-2">
            <a
              href="/"
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] px-5 py-3 text-sm font-semibold text-[var(--text-primary)] transition hover:border-[var(--border-focus)]"
            >
              Get the Zook app
              <ArrowUpRight size={16} aria-hidden="true" />
            </a>
          </div>

          {triedDeepLink ? (
            <Pill>Didn’t open? Use the code above in the app.</Pill>
          ) : null}
        </div>
      </GlassCard>
    </main>
  );
}
