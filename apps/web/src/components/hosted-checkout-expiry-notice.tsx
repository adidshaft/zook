"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import { formatCountdownMs } from "@/lib/format";

export function HostedCheckoutExpiryNotice({
  expiresAt,
  retryHref,
  labels,
}: {
  expiresAt: string | Date;
  retryHref: string;
  labels?: {
    expiredTitle: string;
    expiredBody: string;
    refreshStatus: string;
    returnToZook: string;
    expiresIn: (timeLeft: string) => string;
  };
}) {
  const router = useRouter();
  const copy =
    labels ??
    {
      expiredTitle: "This payment link has expired.",
      expiredBody: "Refresh the session status, or return to Zook to start checkout again.",
      refreshStatus: "Refresh status",
      returnToZook: "Return to Zook",
      expiresIn: (timeLeft: string) => `This payment link expires in ${timeLeft}.`,
    };
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
        <p className="font-semibold text-[var(--text-primary)]">{copy.expiredTitle}</p>
        <p className="mt-2 leading-6 text-[var(--text-secondary)]">
          {copy.expiredBody}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href={retryHref}
            className="zook-focus inline-flex items-center justify-center rounded-full bg-[var(--accent-fill)] px-5 py-3 font-semibold text-[var(--text-on-accent)] transition hover:opacity-90"
          >
            {copy.returnToZook}
          </Link>
          <button
            type="button"
            onClick={() => router.refresh()}
            className="zook-focus inline-flex items-center justify-center rounded-full border border-[var(--border)] px-5 py-3 text-sm text-[var(--text-secondary)] transition hover:bg-[var(--bg-sunken)] hover:text-[var(--text-primary)]"
          >
            {copy.refreshStatus}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-5 rounded-[22px] border border-[var(--feedback-warning)] bg-[var(--surface-warning-soft)] px-4 py-3 text-sm text-[var(--text-primary)]">
      {copy.expiresIn(formatCountdownMs(remainingMs))}
    </div>
  );
}
