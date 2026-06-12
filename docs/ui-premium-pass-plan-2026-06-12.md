# Zook Premium UI Pass — Executable Spec (2026-06-12)

Self-contained implementation spec for an autonomous coding agent. No prior context
assumed. This pass is purely visual/interaction quality: the product structure, routes,
and data layer from `docs/product-excellence-plan-2026-06-10.md` are DONE and must not
be restructured. Execute workstreams U0 → U6 in order; one commit per task,
prefix "U<id>:". Before every commit: `pnpm --filter @zook/mobile typecheck &&
pnpm --filter @zook/mobile lint && pnpm --filter @zook/mobile test` (root
`pnpm typecheck` when `packages/` are touched).

## Design direction (read carefully — this governs every judgment call)

**Goal: a premium, calm, glass-and-light interface.** iOS takes a *liquid-glass-inspired*
treatment — translucent materials, specular hairlines, continuous corners, depth from
blur and layered shadow — implemented ONLY with APIs available on **iOS 16+**
(`expo-blur`, React Native `borderCurve: "continuous"`, scroll-driven Reanimated
headers, native-stack `headerTransparent`/`headerBlurEffect`). Never use iOS-26-only
UIKit glass APIs. **Android is NOT imitation-iOS**: it gets Material 3 expressive —
tonal surfaces instead of blur, elevation, ripple, an animated active-indicator pill.
Blur on Android is expensive: the tab bar MAY use it only if frame-perfect on a
mid-range device; otherwise tonal `bg.elevated` surfaces.

Principles, in priority order:
1. **One thing per row.** No stacked chips, no duplicate information, no filler copy.
2. **Information earns its place.** If a label restates what's visible, delete it.
3. **Depth over decoration.** Hierarchy from material layers (blur/tonal), hairlines,
   and type scale — not from more borders and more pills.
4. **Motion is physical and brief.** Springs, 150–350ms, always honoring reduce-motion
   (`useReduceMotion` exists in `src/lib/motion.ts`).
5. Both color modes are first-class. Verify every change in light AND dark.

Key files: theme tokens `packages/tokens/src/`; primitives
`apps/mobile/src/components/primitives/` (note: `foundation.tsx` still hosts
`MobileHeader` and some shared pieces); tab bar
`apps/mobile/src/components/role-tab-bar.tsx`; role layouts
`apps/mobile/app/(member)/_layout.tsx`, `app/owner/_layout.tsx`,
`app/trainer/_layout.tsx`, `app/reception/_layout.tsx`. Demo mode for visual checks:
`APP_ENV=local API_MODE=offline-demo EXPO_PUBLIC_API_MODE=offline-demo pnpm dev:mobile`.

Reference evidence of the current problems:
`artifacts/app-store-screenshots-20260612/member-home.png` — the header stacks SIX
rows before content (demo banner → org/role pill → streak pill → uppercase org
eyebrow duplicating the pill → "Hello, Nisha" → "Today in your gym" filler), and the
tab bar wraps "Progress" mid-word ("Progres / s").

---

# U0 — Material, type, and motion tokens

### U0.1 Material tokens
In `packages/tokens/src/` add `materials.ts` exporting per-mode material definitions:
- `glassBar` (iOS bars): `{ blurIntensity: 28 dark / 22 light, blurTint: mode,
  overlayColor: surface tint at low alpha, hairline: rgba(255,255,255,0.16) dark /
  rgba(17,21,15,0.08) light }` — the hairline is a 1px top inner highlight that sells
  the glass edge.
- `tonalBar` (Android bars): `{ backgroundColor: bg.elevated, elevation: 3,
  topHairline: border.subtle }`.
- `cardSurface`: light = `surface.default` + hairline border + `shadow.sm`;
  dark = `surface.default` (white 6%) + inner top highlight rgba(255,255,255,0.06).
Export from the package index; re-export through `apps/mobile/src/lib/theme`.

### U0.2 Continuous corners + radius discipline
Add `borderCurve: "continuous"` (no-op on Android, correct smoothing on iOS) to the
base styles of: Card (`primitives/cards.tsx`), Button (`primitives/buttons.tsx`),
Input, the tab bar container, sheets, and `IconBubble`. Audit radii: cards 24, small
cards/buttons 18, inputs 16, chips/pills 999 — replace any ad-hoc values
(`rg "borderRadius: [0-9]" apps/mobile/src/components | sort` and normalize outliers
to the token scale in `packages/tokens`).

### U0.3 Type refinements
In the tokens typography: add `letterSpacing: -0.4` to `display`/`screenTitle`,
`-0.2` to `title`/`headerTitle`; add `fontVariant: ["tabular-nums"]` to `metric` and
create `timer` (the 44px check-in timer in member home should use it — find
`activeSessionTimer` in `app/(member)/index.tsx`). No font family change; Inter stays.

### U0.4 Motion tokens
In `src/lib/motion.ts` add exported presets: `springs.snappy`
(damping 18, stiffness 220), `springs.gentle` (damping 22, stiffness 150),
`durations.fast: 150 / base: 250 / slow: 350`, `easings.standard`
(Easing.out(cubic)). Refactor existing animations opportunistically as later tasks
touch them — do not sweep the codebase in this task.

**Verify (U0):** typecheck + contrast tests (`pnpm --filter @zook/ui test`) pass; app
renders unchanged except corner smoothing and metric numerals.

---

# U1 — Header system rebuild (the headline fix)

### U1.1 New `ScreenHeader` for tab roots
Create `src/components/primitives/screen-header.tsx`, replacing how tab-root screens
use `MobileHeader` (which lives in `foundation.tsx:777` — leave it for pushed-screen
stragglers until U1.4). Structure, top to bottom:

1. **Utility row** (single row, space-between, height 44):
   - Left: **one** compact context pill — org avatar/initial (20px) + org short name +
     chevron-down — which opens the existing org/role switching surface
     (`src/components/role-switcher.tsx`; reuse its sheet/action, restyle the trigger).
     Role is shown INSIDE the switcher sheet, not in the pill, UNLESS the user has
     multiple roles in the active org — then append a small role tag in the pill.
   - Right: trailing slot (notifications bell with unread dot where the screen already
     has one, avatar shortcut on member home).
2. **Title row**: the greeting/title at `display` scale. NO eyebrow (the org name now
   lives only in the context pill — delete the duplicated uppercase eyebrow), NO
   filler subtitle. Subtitle renders only when passed explicitly, and callers must
   pass it only when it carries information (date, branch name, count).
3. **Inline meta slot** (optional, same line as title or directly under, 24px height):
   small inline elements like the streak (flame icon + "5" + "day streak" in
   `text.secondary` — NOT an outlined pill).

Props: `{ title, subtitle?, context?: { orgName, onPress, roleTag? }, trailing?,
meta?, scrollY? }`.

### U1.2 Scroll-collapse glass behavior
`ScreenHeader` accepts a Reanimated `scrollY` shared value (callers pass it from their
ScrollView via `useAnimatedScrollHandler`; for FlatList screens use
`Animated.FlatList`). Behavior: as `scrollY` goes 0→64, the title row fades/translates
up and a compact bar (utility row + small centered title at `headerTitle` scale)
pins to the top with the **glassBar material** behind it — iOS: `BlurView` +
overlay + bottom hairline; Android: tonalBar. Below 0 (overscroll), nothing stretches.
Respect reduce-motion: snap between states without translation.
Apply to: member home (`app/(member)/index.tsx`), progress, you; owner Today
(`app/owner/index.tsx`), members; trainer home; reception desk. Screens with short
content may skip `scrollY` — header just renders static.

### U1.3 Apply + de-clutter each tab root
For every tab-root screen, migrate `MobileHeader`/`RoleHeader` → `ScreenHeader` and
apply rule "one thing per row":
- **Member home**: context pill "Aarogya Strength Club" (chevron) | right: avatar.
  Title "Hello, Nisha". Streak becomes the inline meta (flame + n-day). DELETE the
  eyebrow and "Today in your gym". Net: 6 stacked rows → 2.
- **Owner Today**: context pill (org, + branch name inside the switcher or as subtitle
  when multi-branch). Title "Today". `RoleSwitcherChip` is absorbed by the context
  pill — remove the separate chip.
- **Trainer / Reception / Progress / Plan / You / Members etc.**: same pattern; titles
  are the screen name; kill all decorative subtitles ("Profile, membership, settings,
  and tools" on You — delete).
- **Demo banner** (`src/components/demo-banner.tsx`): restyle from a full-width strip
  to a slim floating capsule ("Demo data") top-center overlaying the header utility
  row's safe area, 28px tall, warningSoft surface — it must not consume a layout row.

### U1.4 Pushed screens stay native, but get glass
In the root stack options (where T1.3 of the previous plan configured native headers —
`app/_layout.tsx` / `src/features/route-surfaces/root-layout-route.tsx`): on iOS set
`headerTransparent: true` + `headerBlurEffect: mode === "dark" ?
"systemChromeMaterialDark" : "systemChromeMaterial"` and give scroll views
`contentInsetAdjustmentBehavior: "automatic"`; Android keeps solid `bg.app` headers.
Remove the custom circular back button from `MobileHeader` (foundation.tsx ~line
812–833): pushed screens use the native back; after migration, `MobileHeader` should
have no remaining callers — delete it and `RoleHeader` from foundation.tsx.

**Verify (U1):** member home header shows exactly: utility row, "Hello, Nisha",
inline streak; no duplicated org name anywhere; scrolling collapses to a glass bar
(iOS) / tonal bar (Android); pushed screens (settings, membership) show native glass
headers; `rg "MobileHeader|RoleHeader" apps/mobile` → zero hits.

---

# U2 — Tab bar polish

### U2.1 Fix the label wrap bug
In `role-tab-bar.tsx`: tab labels must have `numberOfLines={1}` — "Progress"
currently wraps to "Progres / s" (see reference screenshot). Keep `navLabel` 12px; if
five items can't fit 360pt with 12px labels, the member tab "Progress" label may
shorten to "Progress" with letterSpacing -0.2 — never wrap, never shrink below 11px.

### U2.2 iOS glass treatment
Tab bar container: glassBar material (U0.1) — BlurView + overlay + **top hairline
specular highlight** (1px, rgba(255,255,255,0.16) dark / rgba(17,21,15,0.06) light)
+ `borderCurve: "continuous"`. Selected tab: replace the static accentSoft background
with an animated pill — a single indicator that springs (`springs.snappy`) to the
focused item (Reanimated layout-driven; one shared indicator View, animate
translateX). Scan FAB: two-layer shadow (tight 2px + soft 12px), 1px inner top
highlight, press scales to 0.94 with `springs.snappy`.

### U2.3 Android Material treatment
tonalBar material; active indicator = Material pill (28px tall capsule behind icon)
animating between items; `android_ripple` on every tab pressable (borderless);
elevation 3; respect edge-to-edge (bar background extends under the gesture nav with
proper inset padding).

**Verify (U2):** no label wrapping on a 360dp device; indicator animates on both
platforms; reduce-motion disables the indicator spring (jump cut).

---

# U3 — Surfaces and cards

### U3.1 Card material pass
Apply `cardSurface` (U0.1) in `primitives/cards.tsx`: light mode cards get the
hairline + `shadow.sm` (currently border-only — flat); dark mode cards get the inner
top highlight (a 1px top border in rgba(255,255,255,0.06)) instead of a heavier
outline. Kill any remaining double-border looks (card-inside-card with two visible
borders — when nesting, the inner surface uses `bg.sunken` with NO border).

### U3.2 Pressable cards
Create `PressableCard` in `cards.tsx`: Card + press feedback (scale 0.98 +
opacity 0.92 via `springs.snappy`, `android_ripple` on Android, haptic "light").
Migrate the obvious tappable cards: metric tiles
(`src/components/domain/metric-grid/tile.tsx`), attention rows, member home
contextual cards (`features/member/home/banners.tsx`), You quick-action rows.

### U3.3 Section rhythm
Standardize vertical rhythm on every tab root: `spacing.lg` (16) between cards in a
group, `spacing.xxl` (24) before each `SectionHeader`, SectionHeader bottom margin
`spacing.sm`. Audit the tab roots and remove per-screen ad-hoc gap values in favor of
a shared `styles.content` gap (`rg "gap: [0-9]" apps/mobile/app` and normalize).

**Verify (U3):** screenshot member home + owner Today in both modes — consistent
elevation story, no double borders, even rhythm.

---

# U4 — Motion and moments

### U4.1 Screen-enter stagger
`primitives/animated-appear.tsx` exists — standardize it: 12px fade-up,
`durations.base`, 40ms stagger per sibling, reduce-motion → opacity-only. Apply to
the card stacks of the seven tab roots (wrap top-level cards; do not animate
in-card content).

### U4.2 The check-in moment
After a successful scan check-in (find the success path in the scan flow —
`src/features/route-surfaces/member-scan-route.tsx` / attendance mutations), show a
full-screen overlay moment, ~1.4s, auto-dismiss: brand-dark backdrop, an animated
lime tick drawing in (Reanimated stroke or scale+fade composition — no third-party
Lottie dependency), gym name + "Checked in", success haptic. Reuse the same component
for desk verify success (reception) if it doesn't already have one — check
`features/reception/` for the T5.2 full-screen verify result and visually align both.

### U4.3 Skeleton + refresh consistency
`src/components/skeletons/index.tsx`: one shimmer treatment (opacity pulse 0.45→0.8,
1100ms loop) across all skeletons; pull-to-refresh tint = `accent.base` everywhere
(`rg "RefreshControl" apps/mobile` audit).

**Verify (U4):** record a screen capture of member home load + check-in on iOS
simulator; motion brief and physical; reduce-motion path verified.

---

# U5 — Auth and onboarding glass pass

`src/features/route-surfaces/login-route.tsx` + `app/onboarding/value-props.tsx`:
- Login: brand mark + a single glass card (cardSurface; iOS may use a subtle BlurView
  here since the screen is static) containing the method toggle, input, and CTA; OTP
  step uses the existing `OtpInput` restyled to 6 boxes with continuous corners,
  focused box shows `border.focus` + slight scale; background: `bg.app` with ONE
  large soft radial accent glow (a positioned View with accentSoft, blurRadius via
  opacity gradient — no image asset).
- Value props: full-bleed slides, display-scale headline, page dots → springy
  segmented progress; "Skip" stays top-right.
- Keep ALL auth logic untouched — visual-only changes in these files.

**Verify (U5):** login → OTP → home flow works with dev OTP 000000; both modes.

---

# U6 — Final parity and evidence

1. Re-run the contrast tests (`pnpm --filter @zook/ui test`) — any new
   overlay/hairline colors must not regress text contrast.
2. Dynamic type spot-check at 130%: ScreenHeader, tab bar, cards — nothing clips;
   title may wrap to 2 lines max.
3. Recapture the store screenshot set with the existing Maestro flow
   (`apps/mobile/.maestro/flows/09-store-screenshots.yaml`, guard
   `pnpm screenshots:check`) into `artifacts/app-store-screenshots-<today>/`,
   replacing the 20260612 set; visually confirm each frame (no wrapped labels, new
   header, glass bars).
4. Final clean run of all checks; tree clean.

---

# /goal statement (paste into Codex)

/goal Execute docs/ui-premium-pass-plan-2026-06-12.md end to end on the existing
branch `launch-coming-soon-signposting` (no new branch, no rebase). Read the whole
plan first, including the Design direction section — it governs every judgment call.
Execute U0 → U6 strictly in order, one commit per task ("U<id>: <summary>"), running
`pnpm --filter @zook/mobile typecheck && pnpm --filter @zook/mobile lint &&
pnpm --filter @zook/mobile test` before every commit (root typecheck when packages
change). Hard constraints: iOS treatment must work on iOS 16+ (expo-blur,
borderCurve continuous, Reanimated — no iOS-26-only APIs); Android uses Material 3
tonal surfaces, not fake-iOS blur; every visual change verified in BOTH light and
dark mode; reduce-motion respected on every new animation; no changes to data layer,
routes, or business logic — this pass is visual/interaction only. Where the plan
names a file that moved, adapt to reality and note the deviation in the commit body.
Stop and report only if a change would require altering business logic or an API.
Finish with the U6 evidence step (recaptured screenshots) and a summary: commits,
deviations, and anything needing human device QA.
