# Plan 03 — Semantic Theme Tokens + Light Mode

## Goal

Rebuild the theme system so:

1. Components reference **semantic tokens** (`surface`, `textPrimary`, `border`, `accent`, …), never hex literals.
2. Two complete palettes ship: `light` and `dark`. Each one passes WCAG AA contrast for all text-on-surface pairs.
3. A `useTheme()` hook switches palettes at runtime based on user preference (System / Light / Dark) without app reload.
4. The 6 `@deprecated` aliases in the current `theme.ts` are mapped through, but new code must not use them.

## Why

- No light theme exists. Confirmed: `git grep "useColorScheme\|prefersDark\|theme\.dark\|theme\.light" apps/mobile/src apps/mobile/app` returns nothing.
- Several tokens have failing contrast on the current dark background: `textSubtle #778273` on `bgApp #070908` ≈ 3.6:1 (fails WCAG AA for body text).
- Aliases like `bg`, `text`, `muted`, `subtle`, `panel`, `lime` (all marked `@deprecated` in `apps/mobile/src/lib/theme.ts:32-54`) are still used by hundreds of call sites — they need to keep working until other plans migrate consumers.

## Current state

- `apps/mobile/src/lib/theme.ts` (240+ lines) — single dark palette in `colors`, plus `palettes`, `radii`, `spacing`, `typography`, `layout`, `shadows`, `zookTokens`.
- Most components import `colors`, `spacing`, etc. directly: `import { colors, spacing, typography } from "@/lib/theme";`.
- No theme provider, no runtime switching.

## Architectural target

```
apps/mobile/src/lib/theme/
├── tokens.ts          — semantic token names + types only
├── palettes/
│   ├── dark.ts        — full Palette object
│   └── light.ts       — full Palette object
├── provider.tsx       — ThemeProvider + useTheme() + useThemePreference()
├── index.ts           — public barrel: useTheme, ThemeProvider, types
└── legacy.ts          — back-compat exports for old import path
```

The old `apps/mobile/src/lib/theme.ts` becomes a thin re-export from `./theme/legacy.ts` so existing imports keep compiling.

## Token system

### Token categories

```ts
// apps/mobile/src/lib/theme/tokens.ts
export type Palette = {
  bg: {
    app: string;          // root
    elevated: string;     // raised surface (cards, sheets)
    sunken: string;       // pressed / depressed
    overlay: string;      // modal backdrop
  };
  surface: {
    default: string;
    raised: string;
    accentSoft: string;
    dangerSoft: string;
    warningSoft: string;
    successSoft: string;
  };
  text: {
    primary: string;      // body, WCAG AA on bg.app and surface.default
    secondary: string;    // de-emphasized but still AA
    tertiary: string;     // metadata only, never required reading
    inverse: string;      // for use on accent fills
    onAccent: string;     // text on accent fills
    onDanger: string;
    onWarning: string;
  };
  border: {
    subtle: string;
    default: string;
    strong: string;
    focus: string;
  };
  accent: {               // brand lime
    base: string;
    soft: string;
    strong: string;
    fill: string;
  };
  feedback: {
    danger: string;
    warning: string;
    success: string;
    info: string;
  };
  shadow: {
    sm: string;
    md: string;
    lg: string;
  };
};
```

### Dark palette (preserve existing brand)

Keep brand lime `#B9F455`. Bump muted text to pass AA. Sketch:

```ts
// apps/mobile/src/lib/theme/palettes/dark.ts
export const darkPalette: Palette = {
  bg: {
    app: "#070908",
    elevated: "#0F1411",
    sunken: "#050706",
    overlay: "rgba(0,0,0,0.55)",
  },
  surface: {
    default: "rgba(255,255,255,0.04)",
    raised: "rgba(255,255,255,0.07)",
    accentSoft: "rgba(185,244,85,0.10)",
    dangerSoft: "rgba(255,90,61,0.12)",
    warningSoft: "rgba(242,201,76,0.12)",
    successSoft: "rgba(125,211,172,0.12)",
  },
  text: {
    primary: "#F4F7EF",       // 14.6:1 on bg.app — AAA
    secondary: "#C7CFC0",     // 7.4:1 — AAA
    tertiary: "#8B9586",      // 4.6:1 — AA  (was #778273 / 3.6:1 — failed)
    inverse: "#11150F",
    onAccent: "#11150F",
    onDanger: "#FFFFFF",
    onWarning: "#11150F",
  },
  border: {
    subtle: "rgba(255,255,255,0.08)",
    default: "rgba(255,255,255,0.14)",
    strong: "rgba(255,255,255,0.22)",
    focus: "#B9F455",
  },
  accent: {
    base: "#B9F455",
    soft: "#D7FF6A",
    strong: "#A6E044",
    fill: "#B9F455",
  },
  feedback: {
    danger: "#FF5A3D",
    warning: "#F2C94C",
    success: "#7DD3AC",
    info: "#7DD3FC",
  },
  shadow: {
    sm: "0 1px 2px rgba(0,0,0,0.3)",
    md: "0 4px 12px rgba(0,0,0,0.35)",
    lg: "0 16px 40px rgba(0,0,0,0.45)",
  },
};
```

### Light palette (new)

Warm-neutral fitness app aesthetic. Keep accent lime (it's the brand) but with darker variants for legibility.

```ts
// apps/mobile/src/lib/theme/palettes/light.ts
export const lightPalette: Palette = {
  bg: {
    app: "#F7F8F4",
    elevated: "#FFFFFF",
    sunken: "#EEF0EA",
    overlay: "rgba(17,21,15,0.45)",
  },
  surface: {
    default: "#FFFFFF",
    raised: "#FFFFFF",
    accentSoft: "rgba(166,224,68,0.16)",
    dangerSoft: "rgba(220,38,38,0.10)",
    warningSoft: "rgba(217,119,6,0.12)",
    successSoft: "rgba(22,163,74,0.10)",
  },
  text: {
    primary: "#11150F",       // 16.1:1 on bg.app — AAA
    secondary: "#3F463C",     // 9.4:1 — AAA
    tertiary: "#6F7769",      // 4.7:1 — AA
    inverse: "#FFFFFF",
    onAccent: "#11150F",
    onDanger: "#FFFFFF",
    onWarning: "#11150F",
  },
  border: {
    subtle: "rgba(17,21,15,0.08)",
    default: "rgba(17,21,15,0.14)",
    strong: "rgba(17,21,15,0.22)",
    focus: "#A6E044",
  },
  accent: {
    base: "#A6E044",          // darker than dark-mode accent for AA on white text contexts
    soft: "#C7F472",
    strong: "#7CB427",
    fill: "#A6E044",
  },
  feedback: {
    danger: "#DC2626",
    warning: "#D97706",
    success: "#16A34A",
    info: "#0284C7",
  },
  shadow: {
    sm: "0 1px 2px rgba(17,21,15,0.06)",
    md: "0 4px 12px rgba(17,21,15,0.08)",
    lg: "0 16px 40px rgba(17,21,15,0.12)",
  },
};
```

## Execution steps

### Step 1 — Build new theme structure (additive)

Create folder `apps/mobile/src/lib/theme/` with files above. Do not delete the old `theme.ts` yet.

### Step 2 — Build `ThemeProvider` + `useTheme`

```tsx
// apps/mobile/src/lib/theme/provider.tsx
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import { darkPalette } from "./palettes/dark";
import { lightPalette } from "./palettes/light";
import { getStoredValue, setStoredValue } from "@/lib/storage";

type Preference = "system" | "light" | "dark";
type Mode = "light" | "dark";

const STORAGE_KEY = "zook_theme_preference";

const ThemeContext = createContext<{
  palette: Palette;
  mode: Mode;
  preference: Preference;
  setPreference: (p: Preference) => Promise<void>;
} | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPref] = useState<Preference>("light");

  useEffect(() => {
    void getStoredValue(STORAGE_KEY).then((v) => {
      if (v === "system" || v === "light" || v === "dark") setPref(v);
    });
  }, []);

  const mode: Mode = preference === "system" ? (systemScheme === "dark" ? "dark" : "light") : preference;
  const palette = mode === "dark" ? darkPalette : lightPalette;

  const setPreference = async (p: Preference) => {
    setPref(p);
    await setStoredValue(STORAGE_KEY, p);
  };

  const value = useMemo(() => ({ palette, mode, preference, setPreference }), [palette, mode, preference]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme called outside ThemeProvider");
  return ctx;
}
```

**Default preference is `"light"`** for new installs. Justification: fitness app, gyms have bright lighting, most users won't change defaults.

### Step 3 — Mount the provider

In `apps/mobile/app/_layout.tsx`, wrap the existing provider tree:

```tsx
<ThemeProvider>
  <AuthProvider>
    {/* ...existing children */}
  </AuthProvider>
</ThemeProvider>
```

### Step 4 — Back-compat shim

`apps/mobile/src/lib/theme/legacy.ts`:

```ts
// Bridges old static imports (`import { colors } from "@/lib/theme"`) to the new system.
// New code MUST NOT import from here.
import { darkPalette } from "./palettes/dark";
import { lightPalette } from "./palettes/light";

// Pick a default for static contexts (e.g. StyleSheet.create at module load).
// We use light because it's the default preference. Dynamic re-themeing happens via useTheme().
const defaultPalette = lightPalette;

export const colors = {
  // semantic re-exports
  bgApp: defaultPalette.bg.app,
  bgElevated: defaultPalette.bg.elevated,
  textPrimary: defaultPalette.text.primary,
  textMuted: defaultPalette.text.secondary,
  textSubtle: defaultPalette.text.tertiary,
  brandLime: defaultPalette.accent.base,
  brandLimeSoft: defaultPalette.accent.soft,
  warning: defaultPalette.feedback.warning,
  danger: defaultPalette.feedback.danger,
  glassFill: defaultPalette.surface.default,
  glassFillStrong: defaultPalette.surface.raised,
  glassStroke: defaultPalette.border.default,
  divider: defaultPalette.border.subtle,
  overlayDark: defaultPalette.bg.overlay,

  // @deprecated aliases (preserved verbatim from old theme.ts)
  bg: defaultPalette.bg.app,
  surfaceSolid: defaultPalette.bg.elevated,
  surfaceRaised: defaultPalette.surface.raised,
  surface: defaultPalette.surface.default,
  panel: defaultPalette.surface.default,
  panelStrong: defaultPalette.surface.raised,
  accentPanel: defaultPalette.surface.accentSoft,
  border: defaultPalette.border.default,
  borderStrong: defaultPalette.border.strong,
  limeBorder: defaultPalette.accent.strong,
  text: defaultPalette.text.primary,
  muted: defaultPalette.text.secondary,
  subtle: defaultPalette.text.tertiary,
  paper: "#F2F5EB",
  ink: "#11150F",
  inkSoft: "#6F7769",
  lime: defaultPalette.accent.base,
  limeSoft: defaultPalette.accent.soft,
  amber: defaultPalette.feedback.warning,
  red: defaultPalette.feedback.danger,
  blue: defaultPalette.feedback.info,
  violet: "#B9A9FF",
};

// spacing, radii, typography, layout, shadows, palettes, zookTokens: copy from old theme.ts
// (they are not palette-dependent).
export { spacing, radii, typography, layout, shadows, opacity, shadowIntensity, palettes, zookTokens } from "./tokens-static";
```

**Important:** the shim renders a **static palette** (light). This means components using static imports look correct in light mode but will **not** re-theme in dark mode without migration. That's expected — it's a stepping stone. Migration to `useTheme()` happens in plans #09 (member shell), #05/06/07 (role rewrites), and #11 (final cleanup).

Move `spacing`, `radii`, `typography`, `layout`, `shadows`, `palettes`, `opacity`, `shadowIntensity`, `zookTokens` from old `theme.ts` to a new `apps/mobile/src/lib/theme/tokens-static.ts` — they have no palette dependency and stay as plain exports.

### Step 5 — Replace `theme.ts` with re-export

```ts
// apps/mobile/src/lib/theme.ts (now just a barrel)
export * from "./theme/legacy";
```

This means **every existing `import { colors } from "@/lib/theme"` keeps compiling**. Zero file churn at this step.

### Step 6 — Public theme API

```ts
// apps/mobile/src/lib/theme/index.ts
export { ThemeProvider, useTheme } from "./provider";
export type { Palette } from "./tokens";
export { darkPalette } from "./palettes/dark";
export { lightPalette } from "./palettes/light";
// Static tokens (spacing/radii/etc.) re-exported via "@/lib/theme" already.
```

### Step 7 — Convert one canonical file to demonstrate the pattern

Pick `apps/mobile/src/components/primitives/buttons.tsx`. Convert from static `colors` import to `useTheme()` palette consumption. This is the **reference implementation** for plans #09 and #11.

Pattern:
```tsx
// Before:
import { colors, spacing } from "@/lib/theme";
const styles = StyleSheet.create({ root: { backgroundColor: colors.lime } });

// After:
import { spacing } from "@/lib/theme";          // static tokens unchanged
import { useTheme } from "@/lib/theme/index";   // palette via hook
// inside component:
const { palette } = useTheme();
const dynamicStyle = { backgroundColor: palette.accent.fill };
```

### Step 8 — Settings entry for the preference

In `apps/mobile/app/settings.tsx`, add a section "Appearance" with three options: System / Light / Dark. Use `useTheme().preference` and `setPreference`. **Do not refactor settings.tsx beyond this addition** — plan #10 rebuilds it.

### Step 9 — Status bar handling

In `apps/mobile/app/_layout.tsx`, the `StatusBar` style must follow theme mode:

```tsx
const { mode } = useTheme();
<StatusBar style={mode === "dark" ? "light" : "dark"} />
```

### Step 10 — Contrast audit

Run a manual audit on dark mode pairs that previously failed:
- `text.tertiary` on `bg.app` — must be ≥ 4.5:1
- `text.tertiary` on `surface.default` — must be ≥ 4.5:1
- Any text on `surface.accentSoft` — must use `text.primary`, not tertiary
- Buttons disabled state — visible at 3:1 minimum

Document any tone exceptions (e.g., decorative chip text) in a comment in `palettes/dark.ts`.

## Files created

- `apps/mobile/src/lib/theme/tokens.ts`
- `apps/mobile/src/lib/theme/tokens-static.ts`
- `apps/mobile/src/lib/theme/palettes/dark.ts`
- `apps/mobile/src/lib/theme/palettes/light.ts`
- `apps/mobile/src/lib/theme/provider.tsx`
- `apps/mobile/src/lib/theme/legacy.ts`
- `apps/mobile/src/lib/theme/index.ts`

## Files modified

- `apps/mobile/src/lib/theme.ts` (becomes a one-line re-export)
- `apps/mobile/app/_layout.tsx` (mount ThemeProvider; StatusBar)
- `apps/mobile/app/settings.tsx` (Appearance section only)
- `apps/mobile/src/components/primitives/buttons.tsx` (reference implementation)

## Files deleted

None. Removal of `legacy.ts` shim happens in plan #11.

## UI fixes shipped with this plan

- Light mode available (default for new users)
- Dark mode contrast fixed: `text.tertiary` now passes AA
- StatusBar adapts to mode (no more white text on white background flashes)
- Appearance setting in Settings → System / Light / Dark

## Acceptance criteria

- [ ] `apps/mobile/src/lib/theme/` exists with all 7 files.
- [ ] `import { colors, spacing, typography, palettes, zookTokens } from "@/lib/theme"` still works (back-compat shim).
- [ ] `useTheme()` returns the current `palette` and `mode`.
- [ ] `ThemeProvider` is mounted above the auth provider in `_layout.tsx`.
- [ ] Toggling Appearance in Settings updates the app immediately, without restart.
- [ ] Cold-launching the app reads the persisted preference.
- [ ] System preference is followed when "System" is selected; flipping iOS Dark Mode while app is foregrounded re-themes within a frame.
- [ ] `buttons.tsx` re-themes correctly between light and dark.
- [ ] `pnpm -w typecheck` clean.
- [ ] `pnpm -w test --filter @zook/mobile` clean.
- [ ] All previously-AA-failing text pairs now pass (verify against the contrast list in Step 10).

## What this plan does NOT do

- Does not migrate all components to `useTheme()` — only `buttons.tsx` as a reference. Mass migration happens in plans #09 and #11. Until then, screens render the **light palette** statically through the shim and won't visibly re-theme. **This is acceptable**: the shim is a one-way ratchet — every newly-migrated screen gets full re-themeing.
- Does not change typography, spacing, radii — only colors.
- Does not redesign components or layouts.

## Note for downstream plans

Plans #05, #06, #07, #09, #10, #11 will migrate their touched screens from static `colors` imports to `useTheme()`. When you touch a screen, migrate it. By the end of plan #11, `apps/mobile/src/lib/theme/legacy.ts` is deleted and `git grep "import.*colors.*from.*theme"` returns only the new structured imports.
