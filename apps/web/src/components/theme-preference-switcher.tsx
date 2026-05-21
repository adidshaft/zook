"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import clsx from "clsx";

type ThemePreference = "system" | "light" | "dark";

const cookieName = "zook_theme";
const maxAge = 60 * 60 * 24 * 365;
const preferences: Array<{
  value: ThemePreference;
  label: string;
  icon: typeof Monitor;
}> = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

function normalizeThemePreference(value: string | undefined): ThemePreference {
  return value === "system" || value === "light" || value === "dark" ? value : "light";
}

function readCookiePreference() {
  const cookie = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${cookieName}=`))
    ?.split("=")[1];
  try {
    return normalizeThemePreference(cookie ? decodeURIComponent(cookie) : undefined);
  } catch {
    return "light";
  }
}

function resolvedTheme(preference: ThemePreference) {
  if (preference === "light" || preference === "dark") {
    return preference;
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(preference: ThemePreference) {
  const theme = resolvedTheme(preference);
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

function persistTheme(preference: ThemePreference) {
  document.cookie = `${cookieName}=${encodeURIComponent(preference)}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
}

export function ThemePreferenceSwitcher() {
  const [preference, setPreference] = useState<ThemePreference>("light");

  useEffect(() => {
    const cookiePreference = readCookiePreference();
    setPreference(cookiePreference);
    applyTheme(cookiePreference);
  }, []);

  useEffect(() => {
    if (preference !== "system") {
      return undefined;
    }
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [preference]);

  return (
    <div
      className="grid grid-cols-3 gap-1 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-sunken)] p-1"
      aria-label="Theme"
    >
      {preferences.map((option) => {
        const Icon = option.icon;
        const selected = preference === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            title={option.label}
            className={clsx(
              "zook-focus inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl px-2 text-xs font-semibold transition",
              selected
                ? "bg-[var(--surface-raised)] text-[var(--text-primary)] shadow-[var(--shadow-sm)]"
                : "text-[var(--text-tertiary)] hover:bg-[var(--surface)] hover:text-[var(--text-primary)]",
            )}
            onClick={() => {
              setPreference(option.value);
              persistTheme(option.value);
              applyTheme(option.value);
            }}
          >
            <Icon size={14} aria-hidden="true" />
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
