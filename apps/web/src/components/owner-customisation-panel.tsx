"use client";

import { motion } from "framer-motion";
import {
  BarChart3,
  Bell,
  Eye,
  EyeOff,
  LayoutDashboard,
  PieChart,
  Settings2,
  Sparkles,
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
  accent: "lime" | "sky" | "amber" | "violet";
  density: "comfortable" | "compact";
  numberFormat: "in" | "international";
};

export const OWNER_PREFS_DEFAULTS: OwnerPrefs = {
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

export function loadOwnerPrefs(): OwnerPrefs {
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
    icon: Sparkles,
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
    setPrefs(loadOwnerPrefs());
    setMounted(true);
  }, []);

  function toggleWidget(key: OwnerWidgetKey) {
    setPrefs((current) => {
      const next: OwnerPrefs = {
        ...current,
        widgets: { ...current.widgets, [key]: !current.widgets[key] },
      };
      saveOwnerPrefs(next);
      // Custom event so the dashboard refreshes its layout reactively.
      window.dispatchEvent(new CustomEvent("zook:owner-prefs-changed", { detail: next }));
      return next;
    });
    setSavedAt(Date.now());
  }

  function update<K extends keyof OwnerPrefs>(key: K, value: OwnerPrefs[K]) {
    setPrefs((current) => {
      const next: OwnerPrefs = { ...current, [key]: value };
      saveOwnerPrefs(next);
      window.dispatchEvent(new CustomEvent("zook:owner-prefs-changed", { detail: next }));
      return next;
    });
    setSavedAt(Date.now());
  }

  function resetAll() {
    saveOwnerPrefs(OWNER_PREFS_DEFAULTS);
    setPrefs(OWNER_PREFS_DEFAULTS);
    window.dispatchEvent(
      new CustomEvent("zook:owner-prefs-changed", { detail: OWNER_PREFS_DEFAULTS }),
    );
    setSavedAt(Date.now());
  }

  const visibleCount = Object.values(prefs.widgets).filter(Boolean).length;

  return (
    <GlassCard className="relative overflow-hidden p-5">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-lime-300/8 blur-3xl"
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Settings2 size={16} className="text-lime-300" />
          <h2 className="text-base font-semibold text-white">Customise your dashboard</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] text-white/55">
            {visibleCount}/{WIDGET_META.length} widgets on
          </span>
          <button
            type="button"
            onClick={resetAll}
            className="zook-focus rounded-full border border-white/10 px-3 py-1 text-[11px] font-medium text-white/55 transition hover:border-white/25 hover:text-white"
          >
            Reset
          </button>
        </div>
      </div>
      <p className="mt-2 text-sm leading-6 text-white/55">
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
                  ? "border-lime-300/35 bg-lime-300/[0.06] hover:border-lime-300/55"
                  : "border-white/10 bg-white/[0.025] hover:border-white/25"
              }`}
            >
              <span
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg border ${
                  on
                    ? "border-lime-300/45 bg-lime-300/15 text-lime-200"
                    : "border-white/10 bg-white/[0.03] text-white/55"
                }`}
              >
                <Icon size={16} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-white">{meta.label}</span>
                <span className="block text-xs text-white/45">{meta.description}</span>
              </span>
              <span
                className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border ${
                  on
                    ? "border-lime-300/45 bg-lime-300/15 text-lime-200"
                    : "border-white/10 bg-white/[0.03] text-white/45"
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
          className="mt-4 text-xs text-lime-200/70"
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
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">{label}</p>
      <div className="mt-2 inline-flex w-full max-w-full overflow-x-auto rounded-full border border-white/10 bg-black/30 p-1 text-[11px]">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={opt.value === value}
            className={`zook-focus shrink-0 rounded-full px-3 py-1 font-medium transition ${
              opt.value === value
                ? "bg-lime-300 text-black"
                : "text-white/55 hover:text-white"
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
    setPrefs(loadOwnerPrefs());
    function onChange(event: Event) {
      const detail = (event as CustomEvent<OwnerPrefs>).detail;
      if (detail) setPrefs(detail);
    }
    window.addEventListener("zook:owner-prefs-changed", onChange);
    return () => window.removeEventListener("zook:owner-prefs-changed", onChange);
  }, []);
  return prefs;
}
