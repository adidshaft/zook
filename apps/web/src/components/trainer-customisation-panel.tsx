"use client";

import { motion } from "framer-motion";
import { Bell, ClipboardList, IndianRupee, Palette, Settings2, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { GlassCard } from "@/components/glass-card";

type TrainerPrefs = {
  defaultLanding: "today" | "clients" | "plans";
  autoNotifyOnPlanChange: boolean;
  showRevenueCard: boolean;
  weekStart: "monday" | "sunday";
  preferredAccent: "lime" | "sky" | "amber" | "violet";
};

const DEFAULTS: TrainerPrefs = {
  defaultLanding: "today",
  autoNotifyOnPlanChange: true,
  showRevenueCard: false,
  weekStart: "monday",
  preferredAccent: "lime",
};

const STORAGE_KEY = "zook.trainer.prefs.v1";

function loadPrefs(): TrainerPrefs {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<TrainerPrefs>) };
  } catch {
    return DEFAULTS;
  }
}

function savePrefs(prefs: TrainerPrefs) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // ignore quota / private-mode errors
  }
}

export function TrainerCustomisationPanel({ trainerName }: { trainerName: string }) {
  const [prefs, setPrefs] = useState<TrainerPrefs>(DEFAULTS);
  const [mounted, setMounted] = useState(false);
  const [saved, setSaved] = useState<number | null>(null);

  useEffect(() => {
    setPrefs(loadPrefs());
    setMounted(true);
  }, []);

  function update<K extends keyof TrainerPrefs>(key: K, value: TrainerPrefs[K]) {
    setPrefs((current) => {
      const next = { ...current, [key]: value };
      savePrefs(next);
      return next;
    });
    setSaved(Date.now());
  }

  function reset() {
    setPrefs(DEFAULTS);
    savePrefs(DEFAULTS);
    setSaved(Date.now());
  }

  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Settings2 size={16} className="text-[var(--accent-strong)]" />
          <h2 className="text-base font-semibold text-[var(--text-primary)]">
            Personalise your coach workspace
          </h2>
        </div>
        <button
          type="button"
          onClick={reset}
          className="zook-focus rounded-full border border-[var(--border)] px-3 py-1 text-[11px] font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
        >
          Reset
        </button>
      </div>
      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
        Saved locally to this browser. {trainerName ? `Hi, ${trainerName}.` : null}
      </p>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <SegmentRow
          icon={<ClipboardList size={14} className="text-[var(--accent-strong)]" />}
          label="Default landing tab"
          value={prefs.defaultLanding}
          onChange={(value) => update("defaultLanding", value)}
          options={[
            { value: "today", label: "Today" },
            { value: "clients", label: "Clients" },
            { value: "plans", label: "Plans" },
          ]}
        />
        <SegmentRow
          icon={<Users size={14} className="text-[var(--feedback-info)]" />}
          label="Week starts on"
          description="Affects week schedule + reports"
          value={prefs.weekStart}
          onChange={(value) => update("weekStart", value)}
          options={[
            { value: "monday", label: "Monday" },
            { value: "sunday", label: "Sunday" },
          ]}
        />
        <SwitchRow
          icon={<Bell size={14} className="text-[var(--feedback-warning)]" />}
          label="Auto-notify on plan change"
          checked={prefs.autoNotifyOnPlanChange}
          onChange={(value) => update("autoNotifyOnPlanChange", value)}
        />
        <SwitchRow
          icon={<IndianRupee size={14} className="text-[var(--feedback-success)]" />}
          label="Show revenue snippet"
          checked={prefs.showRevenueCard}
          onChange={(value) => update("showRevenueCard", value)}
        />
        <SegmentRow
          icon={<Palette size={14} className="text-[var(--accent-strong)]" />}
          label="Accent colour"
          description="Used across charts and chips"
          value={prefs.preferredAccent}
          onChange={(value) => update("preferredAccent", value)}
          options={[
            { value: "lime", label: "Lime" },
            { value: "sky", label: "Sky" },
            { value: "amber", label: "Amber" },
            { value: "violet", label: "Violet" },
          ]}
        />
      </div>

      {mounted ? (
        <motion.p
          key={saved ?? "idle"}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 text-xs text-[var(--accent-strong)]"
        >
          {saved ? "Saved" : "Preferences"}
        </motion.p>
      ) : null}
    </GlassCard>
  );
}

function SegmentRow<T extends string>({
  icon,
  label,
  description,
  value,
  options,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  description?: string;
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (next: T) => void;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-sunken)] p-4">
      <div className="flex items-center gap-2">
        {icon}
        <p className="text-sm font-medium text-[var(--text-primary)]">{label}</p>
      </div>
      {description ? <p className="mt-1 text-xs text-[var(--text-tertiary)]">{description}</p> : null}
      <div className="mt-3 inline-flex rounded-full border border-[var(--border)] bg-[var(--bg-sunken)] p-1 text-[11px]">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={opt.value === value}
            className={`zook-focus rounded-full px-3 py-1 font-medium transition ${
              opt.value === value
                ? "bg-[var(--accent-fill)] text-[var(--text-on-accent)] font-semibold shadow-sm"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function SwitchRow({
  icon,
  label,
  description,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-sunken)] p-4">
      <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border border-[var(--border)] bg-[var(--bg-sunken)]">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-[var(--text-primary)]">{label}</span>
        {description ? <span className="block text-xs text-[var(--text-tertiary)]">{description}</span> : null}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`zook-focus relative h-6 w-11 shrink-0 rounded-full border transition ${
          checked
            ? "border-[color-mix(in_srgb,var(--accent)_45%,transparent)] bg-[var(--surface-accent-soft)]"
            : "border-[var(--border-strong)] bg-[var(--bg-sunken)]"
        }`}
      >
        <span
          className={`absolute top-0.5 grid h-5 w-5 place-items-center rounded-full transition ${
            checked
              ? "left-[calc(100%-1.375rem)] bg-[var(--accent-fill)] text-[var(--text-on-accent)]"
              : "left-0.5 bg-[var(--text-tertiary)]"
          }`}
        />
      </button>
    </label>
  );
}
