import Link from "next/link";

import { PublicNav } from "@/components/public/nav/public-nav";

export function GuardianConsentRetiredPage({
  challengeId,
}: {
  challengeId?: string;
}) {
  return (
    <main className="flex min-h-dvh flex-col bg-[var(--bg)] text-[var(--text-primary)]">
      <div className="mx-auto grid w-full max-w-5xl gap-5 px-4 sm:px-6">
        <PublicNav locale="en" />
      </div>
      <div className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6">
        <div className="max-w-xl rounded-[28px] border border-[var(--border)] bg-[var(--surface)]/92 p-8 shadow-[var(--shadow-lg)] backdrop-blur">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
            Guardian consent
          </p>
          <h1 className="mt-3 text-3xl font-black text-[var(--text-primary)]">
            Guardian approval is no longer required
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
            This link belongs to an older Zook flow. Membership checkout, attendance, and coaching
            access no longer depend on a separate guardian approval step.
          </p>
          <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
            If a gym team sent you this page recently, ask them to reopen the latest checkout or
            sign-in flow from Zook instead of reusing the retired consent link.
          </p>
          {challengeId ? (
            <p className="mt-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-sunken)] px-4 py-3 text-xs leading-5 text-[var(--text-tertiary)]">
              Reference: <span className="font-mono text-[var(--text-secondary)]">{challengeId}</span>
            </p>
          ) : null}
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/login"
              className="zook-focus inline-flex items-center gap-2 rounded-xl bg-[var(--accent-fill)] px-5 py-2.5 text-sm font-semibold text-[var(--text-on-accent)] transition hover:opacity-90"
            >
              Open Zook sign-in
            </Link>
            <Link
              href="/"
              className="zook-focus inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-5 py-2.5 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--bg-sunken)]"
            >
              Back to home
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
