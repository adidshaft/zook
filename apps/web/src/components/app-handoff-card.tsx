"use client";

import { useState } from "react";
import { ArrowUpRight, Smartphone } from "lucide-react";
import { GlassCard, Pill } from "@/components/glass-card";

export function AppHandoffCard({
  title,
  description,
  deepLink,
  eyebrow = "Continue in app",
  getAppHref = "/",
  compact = false,
  minimal = false,
}: {
  title: string;
  description: string;
  deepLink: string;
  eyebrow?: string;
  getAppHref?: string;
  compact?: boolean;
  minimal?: boolean;
}) {
  const [triedDeepLink, setTriedDeepLink] = useState(false);

  function openApp() {
    setTriedDeepLink(true);
    window.location.href = deepLink;
  }

  if (minimal) {
    return (
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-sunken)] px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-[var(--text-secondary)]">{title}</p>
          <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">{description}</p>
          {triedDeepLink ? (
            <p className="mt-1 text-xs text-[var(--text-tertiary)]">Did not open? Install Zook first.</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={openApp}
          className="zook-focus shrink-0 inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-raised)]"
        >
          <Smartphone size={13} aria-hidden="true" />
          Open app
        </button>
      </div>
    );
  }

  return (
    <GlassCard className={compact ? "p-4" : "p-5"}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
            {eyebrow}
          </p>
          <h2 className="mt-2 text-base font-semibold text-[var(--text-primary)]">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
          {triedDeepLink ? (
            <div className="mt-3">
              <Pill>Did not open? Install Zook, then try again.</Pill>
            </div>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:min-w-48">
          <button
            type="button"
            onClick={openApp}
            className="zook-focus inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[var(--accent-fill)] px-5 py-2.5 text-sm font-semibold text-[var(--text-on-accent)] transition hover:brightness-105"
          >
            <Smartphone size={17} aria-hidden="true" />
            Continue in the Zook app
          </button>
          <a
            href={getAppHref}
            className="zook-focus inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-raised)]"
          >
            Get the Zook app
            <ArrowUpRight size={15} aria-hidden="true" />
          </a>
        </div>
      </div>
    </GlassCard>
  );
}
