"use client";

import { motion } from "framer-motion";
import {
  BarChart3,
  Bell,
  Bot,
  Eye,
  EyeOff,
  LayoutDashboard,
  PieChart,
  Settings2,
  TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";
import { GlassCard } from "@/components/glass-card";

export type OwnerWidgetKey =
  | "revenueChart"
  | "attendanceBars"
  | "planMix"
  | "aiUsage"
  | "staffActivity"
  | "tip";

type OwnerPrefs = {
  widgets: Record<OwnerWidgetKey, boolean>;
  accent: "lime" | "sky" | "amber" | "violet" | "paper";
  density: "comfortable" | "compact";
  numberFormat: "in" | "international";
};

const OWNER_PREFS_DEFAULTS: OwnerPrefs = {
  widgets: {
    revenueChart: true,
    attendanceBars: true,
    planMix: true,
    aiUsage: true,
    staffActivity: true,
    tip: true,
  },
  accent: "lime",
  density: "comfortable",
  numberFormat: "in",
};

const STORAGE_KEY = "zook.owner.prefs.v1";

function loadOwnerPrefs(): OwnerPrefs {
  if (typeof window === "undefined") return OWNER_PREFS_DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return OWNER_PREFS_DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<OwnerPrefs> & {
      widgets?: Partial<Record<OwnerWidgetKey, boolean>>;
    };
    return {
      ...OWNER_PREFS_DEFAULTS,
      ...parsed,
      widgets: { ...OWNER_PREFS_DEFAULTS.widgets, ...(parsed.widgets ?? {}) },
    };
  } catch {
    return OWNER_PREFS_DEFAULTS;
  }
}

function saveOwnerPrefs(prefs: OwnerPrefs) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // ignore
  }
}

type WidgetMeta = {
  key: OwnerWidgetKey;
  label: string;
  description: string;
  icon: typeof BarChart3;
};

const WIDGET_META: ReadonlyArray<WidgetMeta> = [
  {
    key: "revenueChart",
    label: "Revenue chart",
    description: "7-day line chart on the overview",
    icon: TrendingUp,
  },
  {
    key: "attendanceBars",
    label: "Daily check-ins bars",
    description: "Weekly attendance distribution",
    icon: BarChart3,
  },
  {
    key: "planMix",
    label: "Plan mix donut",
    description: "Share of members across active plans",
    icon: PieChart,
  },
  {
    key: "aiUsage",
    label: "AI usage tile",
    description: "Assistant quota for this month",
    icon: Bot,
  },
  {
    key: "staffActivity",
    label: "Staff activity",
    description: "Recent audit-log summary",
    icon: LayoutDashboard,
  },
  {
    key: "tip",
    label: "Zook tip",
    description: "Contextual operator nudge",
    icon: Bell,
  },
];

export function OwnerCustomisationPanel() {
  const [prefs, setPrefs] = useState<OwnerPrefs>(OWNER_PREFS_DEFAULTS);
  const [mounted, setMounted] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    const loaded = loadOwnerPrefs();
    setPrefs(loaded);
    if (typeof window !== "undefined") {
      document.documentElement.dataset.accent = loaded.accent;
    }
    setMounted(true);
  }, []);

  function toggleWidget(key: OwnerWidgetKey) {
    const next: OwnerPrefs = {
      ...prefs,
      widgets: { ...prefs.widgets, [key]: !prefs.widgets[key] },
    };
    saveOwnerPrefs(next);
    setPrefs(next);
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("zook:owner-prefs-changed", { detail: next }));
    }, 0);
    setSavedAt(Date.now());
  }

  function update<K extends keyof OwnerPrefs>(key: K, value: OwnerPrefs[K]) {
    const next: OwnerPrefs = { ...prefs, [key]: value };
    saveOwnerPrefs(next);
    setPrefs(next);
    if (key === "accent" && typeof window !== "undefined") {
      document.documentElement.dataset.accent = value as string;
    }
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("zook:owner-prefs-changed", { detail: next }));
    }, 0);
    setSavedAt(Date.now());
  }

  function resetAll() {
    saveOwnerPrefs(OWNER_PREFS_DEFAULTS);
    setPrefs(OWNER_PREFS_DEFAULTS);
    if (typeof window !== "undefined") {
      document.documentElement.dataset.accent = OWNER_PREFS_DEFAULTS.accent;
    }
    setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent("zook:owner-prefs-changed", { detail: OWNER_PREFS_DEFAULTS }),
      );
    }, 0);
    setSavedAt(Date.now());
  }

  const visibleCount = Object.values(prefs.widgets).filter(Boolean).length;

  return (
    <GlassCard className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Settings2 size={16} className="text-[var(--accent-strong)]" />
          <h2 className="text-base font-semibold text-[var(--text-primary)]">Customise your dashboard</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-[var(--border)] bg-[var(--bg-sunken)] px-3 py-1 text-[11px] text-[var(--text-secondary)]">
            {visibleCount}/{WIDGET_META.length} widgets on
          </span>
          <button
            type="button"
            onClick={resetAll}
            className="zook-focus rounded-full border border-[var(--border)] px-3 py-1 text-[11px] font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
          >
            Reset
          </button>
        </div>
      </div>
      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
        Show only what you actually use. Saved locally to this browser.
      </p>

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {WIDGET_META.map((meta) => {
          const on = prefs.widgets[meta.key];
          const Icon = meta.icon;
          return (
            <button
              key={meta.key}
              type="button"
              onClick={() => toggleWidget(meta.key)}
              aria-pressed={on}
              className={`zook-focus group flex items-start gap-3 rounded-xl border px-3 py-3 text-left transition ${
                on
                  ? "border-[color-mix(in_srgb,var(--accent)_35%,transparent)] bg-[var(--surface-accent-soft)] hover:border-[color-mix(in_srgb,var(--accent)_55%,transparent)]"
                  : "border-[var(--border)] bg-[var(--bg-sunken)] hover:border-[var(--border-strong)]"
              }`}
            >
              <span
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg border ${
                  on
                    ? "border-[color-mix(in_srgb,var(--accent)_45%,transparent)] bg-[var(--surface-accent-soft)] text-[var(--accent-strong)]"
                    : "border-[var(--border)] bg-[var(--bg-sunken)] text-[var(--text-secondary)]"
                }`}
              >
                <Icon size={16} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-[var(--text-primary)]">{meta.label}</span>
                <span className="block text-xs text-[var(--text-tertiary)]">{meta.description}</span>
              </span>
              <span
                className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border ${
                  on
                    ? "border-[color-mix(in_srgb,var(--accent)_45%,transparent)] bg-[var(--surface-accent-soft)] text-[var(--accent-strong)]"
                    : "border-[var(--border)] bg-[var(--bg-sunken)] text-[var(--text-tertiary)]"
                }`}
              >
                {on ? <Eye size={12} /> : <EyeOff size={12} />}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <SegmentRow
          label="Accent"
          value={prefs.accent}
          onChange={(value) => update("accent", value)}
          options={[
            { value: "lime", label: "Lime" },
            { value: "sky", label: "Sky" },
            { value: "amber", label: "Amber" },
            { value: "violet", label: "Violet" },
            { value: "paper", label: "Paper (Tactile)" },
          ]}
        />
        <SegmentRow
          label="Density"
          value={prefs.density}
          onChange={(value) => update("density", value)}
          options={[
            { value: "comfortable", label: "Comfortable" },
            { value: "compact", label: "Compact" },
          ]}
        />
        <SegmentRow
          label="Numbers"
          value={prefs.numberFormat}
          onChange={(value) => update("numberFormat", value)}
          options={[
            { value: "in", label: "1,00,000" },
            { value: "international", label: "100,000" },
          ]}
        />
      </div>

      {mounted ? (
        <motion.p
          key={savedAt ?? "idle"}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 text-xs text-[var(--accent-strong)]"
        >
          {savedAt ? "Saved" : "Loaded preferences"}
        </motion.p>
      ) : null}
    </GlassCard>
  );
}

function SegmentRow<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (next: T) => void;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-sunken)] p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">{label}</p>
      <div className="mt-2 inline-flex w-full max-w-full overflow-x-auto rounded-full border border-[var(--border)] bg-[var(--bg-sunken)] p-1 text-[11px]">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={opt.value === value}
            className={`zook-focus shrink-0 rounded-full px-3 py-1 font-medium transition ${
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

/**
 * Hook to subscribe a client component to owner-prefs changes. Returns the
 * latest stored preferences and updates when other parts of the page emit
 * `zook:owner-prefs-changed`.
 */
export function useOwnerPrefs(): OwnerPrefs {
  const [prefs, setPrefs] = useState<OwnerPrefs>(OWNER_PREFS_DEFAULTS);
  useEffect(() => {
    const loaded = loadOwnerPrefs();
    setPrefs(loaded);
    if (typeof window !== "undefined") {
      document.documentElement.dataset.accent = loaded.accent;
    }
    function onChange(event: Event) {
      const detail = (event as CustomEvent<OwnerPrefs>).detail;
      if (detail) {
        setPrefs(detail);
        if (typeof window !== "undefined") {
          document.documentElement.dataset.accent = detail.accent;
        }
      }
    }
    window.addEventListener("zook:owner-prefs-changed", onChange);
    return () => window.removeEventListener("zook:owner-prefs-changed", onChange);
  }, []);
  return prefs;
}
