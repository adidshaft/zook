# Plan 04 — Semantic Theme Tokens + Light Mode

## Goal

Rebuild the CSS variable system in `packages/ui/src/tokens.css` so:

1. Components reference **semantic tokens** (`--surface`, `--text-primary`, `--accent`) only.
2. Two complete palettes ship: `[data-theme="light"]` and `[data-theme="dark"]`. Each one passes WCAG AA contrast for all text-on-surface pairs.
3. A theme switcher in the user menu picks System / Light / Dark, persisted per user.
4. The current `--zook-graphite-*`, `--zook-glass`, etc. become palette internals; component code stops referencing them directly.

## Why

- No light theme exists today. The web app, like mobile, is dark-only. Owners running it on a desktop in a bright gym office report visibility issues.
- `--zook-subtle: #778273` on `--zook-bg: #070908` ≈ 3.6:1 — fails WCAG AA for body text.
- Token names are physical (`graphite-900`, `glass`) not semantic; light-mode versions can't be expressed in this naming scheme.
- This plan can run in parallel with plans #01/#02/#03 (host split) — token work is pure CSS/component scope.

## Current state

- [`packages/ui/src/tokens.css`](packages/ui/src/tokens.css) — 58 lines. Single dark palette. Variables: `--zook-bg`, `--zook-graphite-{600..950}`, `--zook-glass`, `--zook-glass-strong`, `--zook-surface`, `--zook-surface-strong`, `--zook-border`, `--zook-border-strong`, `--zook-text`, `--zook-muted`, `--zook-subtle`, `--zook-text-muted`, `--zook-lime`, `--zook-lime-{soft,dim,border,deep}`, `--zook-warning`, `--zook-danger`, `--zook-amber`, `--zook-red`, `--zook-blue`, `--zook-radius-*`, `--zook-shadow-*`.
- [`apps/web/app/globals.css`](apps/web/app/globals.css) — 139 lines. Uses the variables for body, `.zook-glass`, `.zook-glass-strong`, focus styles.
- Tailwind: not configured for the web app — vanilla CSS variables only.
- No `[data-theme]` attribute is set anywhere.

## Architectural target

```
packages/ui/src/
├── tokens.css            — semantic vars only; [data-theme="dark"] + [data-theme="light"]
├── palettes/
│   ├── dark.css          — :root[data-theme="dark"] { --surface: ...; ... }
│   └── light.css         — :root[data-theme="light"] { ... }
├── globals.css           — base body, focus, scrollbar (existing, modified)
└── tokens.test.ts        — runtime contrast assertions
```

## Token system

### Semantic tokens

```css
/* packages/ui/src/tokens.css */
:root {
  /* Sizing & shape — palette-independent */
  --radius-xs: 8px;
  --radius-sm: 12px;
  --radius-md: 18px;
  --radius-lg: 24px;
  --radius-xl: 28px;
  --radius-xxl: 32px;
  --sidebar-width: 280px;
  --header-height: 72px;

  /* Defaults — light palette */
  color-scheme: light;
}

@import "./palettes/light.css";

:root[data-theme="dark"] {
  color-scheme: dark;
}

:root[data-theme="dark"] {
  /* override every semantic token */
}

@import "./palettes/dark.css";
```

Semantic variable names (in both palettes):

```
--bg                  page background
--bg-elevated         raised surface (cards, sheets)
--bg-sunken           depressed surface (input wells)
--bg-overlay          modal backdrop

--surface             default card surface
--surface-raised      raised card / floating
--surface-accent-soft accent tinted surface
--surface-danger-soft danger tinted surface
--surface-warning-soft
--surface-success-soft

--text-primary        body text — AAA
--text-secondary      de-emphasized, AAA
--text-tertiary       metadata only, AA
--text-inverse        for use on solid accent
--text-on-accent
--text-on-danger
--text-on-warning

--border-subtle
--border               default border
--border-strong
--border-focus         focus ring color

--accent               brand lime
--accent-soft
--accent-strong
--accent-fill          full-saturation fill

--feedback-danger
--feedback-warning
--feedback-success
--feedback-info

--shadow-sm
--shadow-md
--shadow-lg
```

### Dark palette

```css
/* packages/ui/src/palettes/dark.css */
:root[data-theme="dark"] {
  --bg: #070908;
  --bg-elevated: #0F1411;
  --bg-sunken: #050706;
  --bg-overlay: rgba(0, 0, 0, 0.55);

  --surface: rgba(255, 255, 255, 0.04);
  --surface-raised: rgba(255, 255, 255, 0.07);
  --surface-accent-soft: rgba(185, 244, 85, 0.10);
  --surface-danger-soft: rgba(255, 90, 61, 0.12);
  --surface-warning-soft: rgba(242, 201, 76, 0.12);
  --surface-success-soft: rgba(125, 211, 172, 0.12);

  --text-primary: #F4F7EF;        /* 14.6:1 on --bg — AAA */
  --text-secondary: #C7CFC0;      /* 7.4:1 — AAA */
  --text-tertiary: #8B9586;       /* 4.6:1 — AA (was #778273 / 3.6:1 — failed) */
  --text-inverse: #11150F;
  --text-on-accent: #11150F;
  --text-on-danger: #FFFFFF;
  --text-on-warning: #11150F;

  --border-subtle: rgba(255, 255, 255, 0.08);
  --border: rgba(255, 255, 255, 0.14);
  --border-strong: rgba(255, 255, 255, 0.22);
  --border-focus: #B9F455;

  --accent: #B9F455;
  --accent-soft: #D7FF6A;
  --accent-strong: #A6E044;
  --accent-fill: #B9F455;

  --feedback-danger: #FF5A3D;
  --feedback-warning: #F2C94C;
  --feedback-success: #7DD3AC;
  --feedback-info: #7DD3FC;

  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.35);
  --shadow-lg: 0 16px 40px rgba(0, 0, 0, 0.45);
}
```

### Light palette

```css
/* packages/ui/src/palettes/light.css */
:root[data-theme="light"] {
  --bg: #F7F8F4;
  --bg-elevated: #FFFFFF;
  --bg-sunken: #EEF0EA;
  --bg-overlay: rgba(17, 21, 15, 0.45);

  --surface: #FFFFFF;
  --surface-raised: #FFFFFF;
  --surface-accent-soft: rgba(166, 224, 68, 0.16);
  --surface-danger-soft: rgba(220, 38, 38, 0.10);
  --surface-warning-soft: rgba(217, 119, 6, 0.12);
  --surface-success-soft: rgba(22, 163, 74, 0.10);

  --text-primary: #11150F;        /* 16.1:1 on --bg — AAA */
  --text-secondary: #3F463C;      /* 9.4:1 — AAA */
  --text-tertiary: #6F7769;       /* 4.7:1 — AA */
  --text-inverse: #FFFFFF;
  --text-on-accent: #11150F;
  --text-on-danger: #FFFFFF;
  --text-on-warning: #11150F;

  --border-subtle: rgba(17, 21, 15, 0.08);
  --border: rgba(17, 21, 15, 0.14);
  --border-strong: rgba(17, 21, 15, 0.22);
  --border-focus: #A6E044;

  --accent: #A6E044;              /* darker than dark-mode accent for AA on white */
  --accent-soft: #C7F472;
  --accent-strong: #7CB427;
  --accent-fill: #A6E044;

  --feedback-danger: #DC2626;
  --feedback-warning: #D97706;
  --feedback-success: #16A34A;
  --feedback-info: #0284C7;

  --shadow-sm: 0 1px 2px rgba(17, 21, 15, 0.06);
  --shadow-md: 0 4px 12px rgba(17, 21, 15, 0.08);
  --shadow-lg: 0 16px 40px rgba(17, 21, 15, 0.12);
}
```

### Back-compat shim

Keep `--zook-*` names working during migration. Add at the **end** of `tokens.css`:

```css
:root {
  --zook-bg: var(--bg);
  --zook-graphite-950: var(--bg);
  --zook-graphite-900: var(--bg-elevated);
  --zook-graphite-800: var(--bg-elevated);
  --zook-graphite-700: var(--surface-raised);
  --zook-graphite-600: var(--surface-raised);
  --zook-surface: var(--surface);
  --zook-surface-strong: var(--surface-raised);
  --zook-glass: var(--surface);
  --zook-glass-strong: var(--surface-raised);
  --zook-border: var(--border);
  --zook-border-strong: var(--border-strong);
  --zook-text: var(--text-primary);
  --zook-muted: var(--text-secondary);
  --zook-subtle: var(--text-tertiary);
  --zook-text-muted: var(--text-secondary);
  --zook-lime: var(--accent);
  --zook-lime-soft: var(--accent-soft);
  --zook-lime-dim: var(--surface-accent-soft);
  --zook-lime-border: var(--border-focus);
  --zook-lime-deep: var(--accent-strong);
  --zook-warning: var(--feedback-warning);
  --zook-danger: var(--feedback-danger);
  --zook-amber: var(--feedback-warning);
  --zook-red: var(--feedback-danger);
  --zook-blue: var(--feedback-info);
  --zook-radius-xs: var(--radius-xs);
  --zook-radius-sm: var(--radius-sm);
  --zook-radius-md: var(--radius-md);
  --zook-radius-lg: var(--radius-lg);
  --zook-radius-xl: var(--radius-xl);
  --zook-radius-xxl: var(--radius-xxl);
  --zook-shadow-glass: var(--shadow-lg);
  --zook-shadow-glow-lime: 0 18px 46px rgba(166, 224, 68, 0.16);
  --zook-shadow-inset: inset 0 1px 0 rgba(255, 255, 255, 0.13), inset 0 -1px 0 rgba(255, 255, 255, 0.04);
  --zook-lime-glow-subtle: 0 0 24px rgba(166, 224, 68, 0.4);
  --zook-sidebar-width: var(--sidebar-width);
  --zook-header-height: var(--header-height);
  --zook-card-radius: var(--radius-lg);
  --zook-stat-card-radius: var(--radius-md);
}
```

Every old `--zook-X` variable still works. Plan #11 removes the shim once consumers migrate.

## Execution steps

### Step 1 — Restructure `packages/ui/src/`

Create `packages/ui/src/palettes/{dark,light}.css` per snippets. Rewrite `tokens.css` to:
1. Set palette-independent vars (`--radius-*`, `--sidebar-width`, etc.).
2. Import the light palette unconditionally as default.
3. Import the dark palette inside `:root[data-theme="dark"]`.
4. Append the back-compat shim.

`packages/ui/package.json` `exports` should include the new files if they're referenced externally.

### Step 2 — Default `data-theme`

Set `<html data-theme="light">` by default. Theme preference is read at request time from a cookie `zook_theme=system|light|dark`.

In `apps/web/app/layout.tsx`:

```tsx
import { cookies } from "next/headers";
// ...
const theme = (await cookies()).get("zook_theme")?.value;
const resolved = theme === "dark" ? "dark" : theme === "light" ? "light" : "light"; // server-default
return (
  <html lang={locale} data-theme={resolved}>
    <head>{/* ... */}</head>
    <body>{children}</body>
  </html>
);
```

If `theme === "system"`, server-side defaults to `"light"` (no `prefers-color-scheme` at SSR time). A small inline script in `<head>` corrects to system preference before paint to avoid flash:

```html
<script
  dangerouslySetInnerHTML={{
    __html: `
      (function() {
        try {
          var pref = document.cookie.match(/zook_theme=([^;]+)/);
          var val = pref ? pref[1] : 'light';
          if (val === 'system') {
            val = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
          }
          document.documentElement.setAttribute('data-theme', val);
        } catch (_) {}
      })();
    `,
  }}
/>
```

Add this script with the correct nonce per the CSP setup in `middleware.ts`.

### Step 3 — Theme switcher in user menu

Find the user menu component (`apps/web/src/components/dashboard/shell/user-menu.tsx`). Add a theme submenu with three options. On select:
- Set cookie `zook_theme=...` (server action or `fetch('/api/preferences/theme', ...)`).
- Update `document.documentElement.dataset.theme` immediately on the client.
- Persist to user record (new field `themePreference`) in the DB so the cookie can be re-set on a fresh device.

The user-record write can ride alongside the cookie set so they don't drift. If you'd rather defer the DB column, leave it cookie-only for this plan and add the column in plan #11.

### Step 4 — `globals.css` cleanup

`apps/web/app/globals.css` — rewrite `body`, `.zook-glass`, `.zook-glass-strong` to use semantic vars:

```css
body {
  background: var(--bg);
  color: var(--text-primary);
}
.zook-glass {
  background: var(--surface);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-md);
  backdrop-filter: blur(24px);
}
```

Light theme generally doesn't want blur (looks gauzy on white). Tighten the rule: `@media (prefers-color-scheme: light)` or `[data-theme="light"] .zook-glass { backdrop-filter: none; }`.

### Step 5 — Contrast audit script

Add `packages/ui/src/contrast-audit.ts` that programmatically checks contrast ratios for the documented text-on-surface pairs in both palettes. Run in CI:

```ts
// pseudo-test
import { computeContrast } from "./contrast";
import dark from "./palettes/dark.json";  // mirror of the CSS values
import light from "./palettes/light.json";

const pairs = [
  ["text-primary", "bg"],
  ["text-secondary", "bg"],
  ["text-tertiary", "bg"],
  ["text-primary", "surface"],
  ["text-tertiary", "surface"],
  ["text-on-accent", "accent-fill"],
  // ...
];

for (const palette of [dark, light]) {
  for (const [fg, bg] of pairs) {
    const ratio = computeContrast(palette[fg], resolveAlpha(palette[bg], palette.bg));
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  }
}
```

If a ratio fails, the test fails and CI blocks. Update palette to fix.

### Step 6 — Reference migration

Pick `apps/web/src/components/glass-card.tsx` as the reference migration. Read it; if it uses `var(--zook-glass)` style, leave alone (it inherits from the shim). If it has hardcoded hex, refactor to semantic vars.

Migration pattern for future plans: when you touch a component, swap `var(--zook-text)` → `var(--text-primary)`, `var(--zook-bg)` → `var(--bg)`, `var(--zook-glass)` → `var(--surface)`, etc.

### Step 7 — Storybook / dev preview

If the project has a Storybook or component preview, add a theme toggle in the toolbar. Otherwise, add a dev-only `?_theme=dark` query param hack on the homepage to force a theme without setting a cookie. Useful for screenshots and visual review.

## Files created

- `packages/ui/src/palettes/dark.css`
- `packages/ui/src/palettes/light.css`
- `packages/ui/src/contrast-audit.ts`
- `packages/ui/src/contrast.ts` (utility for computing WCAG contrast)
- `packages/ui/src/tokens.test.ts`

## Files modified

- `packages/ui/src/tokens.css` (rewritten + back-compat shim)
- `apps/web/app/globals.css`
- `apps/web/app/layout.tsx` (data-theme + inline script)
- `apps/web/src/components/dashboard/shell/user-menu.tsx` (theme switcher)
- `apps/web/middleware.ts` (CSP `script-src` already allows nonce; verify inline script's nonce is set)
- `packages/db/prisma/schema.prisma` (only if Step 3 chooses the DB-backed path)

## Files deleted

None in this plan. Shim removal in plan #11.

## UI/UX fixes shipped

- Light mode available (default)
- WCAG AA contrast pass on both palettes
- Theme switcher in user menu
- No flash of wrong theme on cold load

## Acceptance criteria

- [ ] `packages/ui/src/tokens.css` defines semantic vars and imports both palettes.
- [ ] `[data-theme="dark"]` overrides apply; `[data-theme="light"]` is the default.
- [ ] Old `--zook-*` vars still resolve via shim.
- [ ] Setting `document.documentElement.dataset.theme = 'dark'` in dev tools live-switches the entire app.
- [ ] User menu theme switcher persists across page reloads (cookie or DB).
- [ ] Cold page load doesn't flash the wrong theme (inline script runs before paint).
- [ ] Contrast audit test passes for both palettes.
- [ ] CSP doesn't break the inline script (nonce wired correctly).
- [ ] `pnpm -w typecheck` clean.
- [ ] `pnpm -w test --filter @zook/web` clean.

## What this plan does NOT do

- Does not migrate every component to semantic vars — only `glass-card.tsx` as reference. Mass migration happens in plans #05/#06/#07/#09 (each touched file migrates) and finally #11.
- Does not introduce Tailwind.
- Does not change spacing or typography systems.
