"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useMemo, useRef, useState } from "react";

function formatCountdown(remainingMs: number) {
  const safeMs = Math.max(0, remainingMs);
  const minutes = Math.floor(safeMs / 60_000);
  const seconds = Math.floor((safeMs % 60_000) / 1000);
  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
}

export function HostedCheckoutExpiryNotice({
  expiresAt,
  retryHref,
}: {
  expiresAt: string | Date;
  retryHref: string;
}) {
  const router = useRouter();
  const expiryMs = useMemo(() => new Date(expiresAt).getTime(), [expiresAt]);
  const [remainingMs, setRemainingMs] = useState(() => expiryMs - Date.now());
  const didRefreshRef = useRef(false);

  useEffect(() => {
    setRemainingMs(expiryMs - Date.now());
    didRefreshRef.current = false;

    const timer = window.setInterval(() => {
      setRemainingMs(expiryMs - Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, [expiryMs]);

  useEffect(() => {
    if (remainingMs > 0 || didRefreshRef.current) {
      return;
    }
    didRefreshRef.current = true;
    startTransition(() => {
      router.refresh();
    });
  }, [remainingMs, router]);

  if (remainingMs > 5 * 60_000) {
    return null;
  }

  if (remainingMs <= 0) {
    return (
      <div className="mt-5 rounded-[22px] border border-[var(--feedback-danger)] bg-[var(--surface-danger-soft)] px-4 py-4 text-sm text-[var(--text-primary)]">
        <p className="font-semibold text-[var(--text-primary)]">This payment link has expired.</p>
        <p className="mt-2 leading-6 text-[var(--text-secondary)]">
          Refresh the session status, or return to Zook to start checkout again.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => router.refresh()}
            className="zook-focus inline-flex items-center justify-center rounded-full bg-[var(--accent-fill)] px-5 py-3 font-semibold text-[var(--text-on-accent)] transition hover:opacity-90"
          >
            Refresh status
          </button>
          <Link
            href={retryHref}
            className="zook-focus inline-flex items-center justify-center rounded-full border border-[var(--border)] px-5 py-3 text-sm text-[var(--text-secondary)] transition hover:bg-[var(--bg-sunken)] hover:text-[var(--text-primary)]"
          >
            Return to Zook
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-5 rounded-[22px] border border-[var(--feedback-warning)] bg-[var(--surface-warning-soft)] px-4 py-3 text-sm text-[var(--text-primary)]">
      This payment link expires in {formatCountdown(remainingMs)}.
    </div>
  );
}
