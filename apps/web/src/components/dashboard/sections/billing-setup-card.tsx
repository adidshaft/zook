"use client";

import Link from "next/link";
import { GlassCard, Pill } from "../../glass-card";

export function CompactStatusMark({
  label,
  ready,
}: {
  label: string;
  ready: boolean;
}) {
  return (
    <span
      aria-label={label}
      title={label}
      className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full border px-2 text-[11px] font-semibold ${
        ready
          ? "border-[color-mix(in_srgb,var(--accent)_42%,transparent)] bg-[var(--accent-soft)] text-[var(--accent-strong)]"
          : "border-[color-mix(in_srgb,var(--feedback-warning)_42%,transparent)] bg-[var(--surface-warning-soft)] text-[var(--feedback-warning)]"
      }`}
    >
      {ready ? "✓" : "!"}
    </span>
  );
}

export function BillingSetupCard({
  nextStepHref,
  nextStepLabel,
  setupSteps,
  labels,
}: {
  nextStepHref: string;
  nextStepLabel: string;
  setupSteps: Array<{
    label: string;
    body: string;
    ready: boolean;
    href: string;
  }>;
  labels: {
    finishBillingSetup: string;
    finishBillingSetupDescription: string;
    ready: string;
    setupReadyCount: (values: { ready: number; total: number }) => string;
    stepNeededLabel: (values: { label: string }) => string;
    stepReadyLabel: (values: { label: string }) => string;
  };
}) {
  const readyCount = setupSteps.filter((step) => step.ready).length;

  return (
    <GlassCard className="xl:col-span-2">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Pill tone={setupSteps.every((step) => step.ready) ? "lime" : "amber"}>
            {labels.setupReadyCount({ ready: readyCount, total: setupSteps.length })}
          </Pill>
          <h1 className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">
            {labels.finishBillingSetup}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
            {labels.finishBillingSetupDescription}
          </p>
        </div>
        <Link
          href={nextStepHref}
          className="zook-focus inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--accent-fill)] px-5 py-2.5 text-sm font-semibold text-[var(--text-on-accent)] transition hover:brightness-105"
        >
          {nextStepLabel}
        </Link>
      </div>
      <div className="mt-5 grid gap-2 md:grid-cols-3">
        {setupSteps.map((step) => (
          <a
            key={step.label}
            href={step.href}
            className="zook-focus flex items-center gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-sunken)] px-3 py-2.5 transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-raised)]"
          >
            <CompactStatusMark
              label={
                step.ready
                  ? labels.stepReadyLabel({ label: step.label })
                  : labels.stepNeededLabel({ label: step.label })
              }
              ready={step.ready}
            />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-[var(--text-primary)]">
                {step.label}
              </span>
              <span className="mt-0.5 block text-xs leading-5 text-[var(--text-secondary)]">
                {step.ready ? labels.ready : step.body}
              </span>
            </span>
          </a>
        ))}
      </div>
    </GlassCard>
  );
}
