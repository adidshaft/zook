# Zook Product Excellence Plan — Executable Spec (2026-06-10)

This document is an implementation spec for an autonomous coding agent. It assumes no
prior conversation context. Work through the workstreams **in order** (WS0 → WS9);
within a workstream, tasks are ordered by dependency. Each task states WHAT to change,
WHERE, HOW, and how to VERIFY. Commit per task or per small group of related tasks.

## Repo orientation (read first)

- Monorepo: `apps/mobile` (Expo Router + React Native), `apps/web` (Next.js dashboard,
  public pages, and the API host at `app/api/[[...path]]`), `packages/core` (services,
  policies, providers), `packages/db` (Prisma), `packages/tokens` + `packages/ui`
  (design tokens), `packages/config`.
- Mobile routes live in `apps/mobile/app/`; shared mobile UI in
  `apps/mobile/src/components/`; per-role feature code in `apps/mobile/src/features/`;
  data layer in `apps/mobile/src/lib/domains/` (React Query, one folder per domain).
- Theme: `apps/mobile/src/lib/theme/` (provider, `tokens.ts` Palette type,
  `tokens-static.ts` spacing/radii/typography/layout, `palettes/light.ts`,
  `palettes/dark.ts`). `apps/mobile/src/lib/theme.ts` is a one-line re-export shim.
- Commands (run from repo root): `pnpm install`, `pnpm db:local:setup`,
  `pnpm dev:web`, `pnpm dev:mobile`. Mobile checks:
  `pnpm --filter @zook/mobile typecheck`, `pnpm --filter @zook/mobile lint`,
  `pnpm --filter @zook/mobile test`. Web/all: `pnpm typecheck`, `pnpm lint`,
  `pnpm test` if defined at root (check root `package.json`). Dev OTP: `000000`.
  Seed accounts in root `README.md` (`owner@zook.local`, `member@zook.local`, etc.).
- Five product roles: Owner, Admin, Reception (`RECEPTIONIST` enum), Trainer, Member.
  Platform admin is hidden (`User.isPlatformAdmin`), never shown in product UI.

## Why this work (context for judgment calls)

The backend (RBAC, providers, payments, attendance, audit) is solid. The front-of-house
is inconsistent: member vs staff roles use different tab bars; three token sources
disagree (lime `#B9F455` in `packages/tokens` dark-glass vs green `#1F3E24` in the
mobile light palette); every screen disables native headers; first-run dashboards are
walls of zeros with stacked empty states; copy uses jargon ("Cmd", "Plans in motion",
"Feature Locked"); 2,600+ lines of `*-legacy.tsx` screens are still the live
implementations of membership/plan-detail; the member retention surface (tracking) is
not in the tab bar while Shop is. When a task offers discretion, optimize for:
(1) platform-native feel, (2) consistency across roles, (3) a useful first-run with a
clear next action on every empty surface, (4) plain language a small-gym owner in India
understands.

---

# WS0 — Design system consolidation

### T0.1 Make `packages/tokens` the single token source

**What:** Move the mobile palette system into `packages/tokens` and have both apps
consume it. The mobile shape is canonical.

**How:**
1. In `packages/tokens/src/`, create `palette.ts` containing the `Palette` type copied
   from `apps/mobile/src/lib/theme/tokens.ts`, plus `lightPalette` and `darkPalette`
   copied from `apps/mobile/src/lib/theme/palettes/light.ts` and `dark.ts`.
2. Move `spacing`, `radii`, `typography`, `layout`, `shadows`, `opacity` from
   `apps/mobile/src/lib/theme/tokens-static.ts` into `packages/tokens/src/` (new files
   `spacing.ts`, `typography.ts`, etc.), keeping the exact current values except where
   later tasks change them. Export everything from `packages/tokens/src/index.ts`.
   Keep the existing `zookColors`/`zookSpacing`/`zookRadii` exports temporarily as
   deprecated aliases so web doesn't break; re-derive their values from `darkPalette`
   where they map (e.g. `brandLime` = `darkPalette.accent.base`).
3. Rewrite `apps/mobile/src/lib/theme/tokens.ts`, `tokens-static.ts`, and
   `palettes/*` as re-exports from `@zook/tokens` (keep file paths so imports keep
   working; the provider stays in the mobile app).
4. Ensure `@zook/tokens` is a dependency of `@zook/mobile` and `@zook/ui`
   (`workspace:*`) and that the package builds with `pnpm typecheck`.

**Verify:** `pnpm typecheck` clean; `grep -rn '"#B9F455"' apps/ packages/ --include='*.ts*' | grep -v packages/tokens | grep -v node_modules` returns nothing (all hex
values for brand colors live only in `packages/tokens`); app renders identically
(`pnpm dev:mobile`, member home loads).

### T0.2 One brand accent system

**What:** The dark theme uses lime `#B9F455`, the light theme dark green `#1F3E24`.
Keep both as a deliberate pairing but encode it: lime is the brand color, green is its
light-mode-safe counterpart.

**How:** In `packages/tokens/src/palette.ts`, add to each palette:
`accent.onLightSafe` is unnecessary — instead document in a comment block at the top of
the file: dark mode → lime base/fill with black `onAccent`; light mode → green
base/fill with white `onAccent`; never use lime as text/icon color on light
backgrounds. Then audit: `grep -rn "accent.base" apps/mobile/src apps/mobile/app` and
for each usage as a *text or icon color*, confirm it reads from the theme palette (so
light mode gets green automatically) rather than from `zookColors.brandLime` or a hex
literal. Replace any literal lime usages with `palette.accent.base`.

**Verify:** grep for `brandLime` and `#B9F455` in `apps/mobile` returns zero hits.

### T0.3 Consolidate buttons

**What:** One `Button` component, four variants, real disabled state, no label
auto-shrink, Android ripple.

**Where:** `apps/mobile/src/components/primitives/buttons.tsx`.

**How:**
1. Delete the `tone` prop and `ButtonTone` type. Public API:
   `variant: "primary" | "secondary" | "ghost" | "destructive"` (rename `danger` →
   `destructive`), `size: "sm" | "md" | "lg"`, plus the existing props
   (`href`, `icon`, `busy`, `busyLabel`, `fullWidth`, `hapticWeight`, `testID`, …).
2. Delete wrapper exports `SecondaryGlassButton` and `DangerActionButton` (they are
   duplicates of `SecondaryButton`/`DangerButton`). Keep `PrimaryButton`,
   `SecondaryButton`, `GhostButton`, and rename `DangerButton` internals to the
   `destructive` variant. Update all usages:
   `grep -rln "SecondaryGlassButton\|DangerActionButton\|tone=\"lime\"\|tone=\"secondary\"\|tone=\"ghost\"\|tone=\"danger\"" apps/mobile` and fix each
   (`tone="lime"` → remove, `tone="danger"` → `variant="destructive"`, etc.).
3. On the label `<Text>`: remove `adjustsFontSizeToFit` and `minimumFontScale`. Keep
   `numberOfLines={1}`. If any screen's button label now truncates during the WS1/WS2
   manual passes, shorten the label copy — do not reintroduce auto-shrink.
4. Disabled state: replace `disabled: { opacity: 1 }` with `opacity: 0.5`, and keep the
   neutral fill (`bg.sunken`) it already applies.
5. Android ripple: on the non-link `Pressable`, add
   `android_ripple={{ color: palette.border.default, borderless: false }}`.
6. Export `Button` as the canonical name; keep `ZookButton` as an alias export for now.

**Verify:** `pnpm --filter @zook/mobile typecheck && pnpm --filter @zook/mobile lint`;
grep for `tone=` under `apps/mobile` returns zero; visually press-check a primary and
disabled button on Android (ripple, dimmed).

### T0.4 Rename glass-era components

**What:** `GlassCard` → `Card`, `GlassInput` → `Input` (the theme is no longer glass).

**Where:** `apps/mobile/src/components/primitives/cards.tsx`, `inputs.tsx`, and ~all
usages (`grep -rln "GlassCard\|GlassInput" apps/mobile`).

**How:** Rename the components and add `export const GlassCard = Card;` /
`export const GlassInput = Input;` deprecated aliases, then mechanically update all
imports/usages to the new names and delete the aliases. Card variants stay as they are
(`variant="compact"` etc.); do not change visuals in this task.

**Verify:** grep for `GlassCard|GlassInput` returns zero; typecheck clean.

### T0.5 Add missing primitives

**Where:** new files under `apps/mobile/src/components/primitives/`, exported from
`index.tsx`.

1. **`empty-state.tsx` — `EmptyState`**: props
   `{ icon: IonIconName; title: string; body?: string; cta?: { label: string; onPress | href }; testID? }`.
   Layout: centered column, `IconBubble` (exists in primitives) 48px, title
   `typography.cardTitle`, body `typography.small` in `text.secondary`, optional single
   `Button variant="secondary" size="sm"`. Vertical padding `spacing.xxl`. Every empty
   state in the app must funnel through this (WS7 audits usages).
2. **`stat-strip.tsx` — `StatStrip`**: horizontal row of 2–4 small stats
   `{ items: { label: string; value: string; icon? }[] }` — used by member home
   "this week" (T3.2). Single Card, items separated by hairline dividers.
3. **`setup-checklist.tsx` — `SetupChecklist`**: props
   `{ title: string; steps: { id; label; done: boolean; onPress }[]; progressLabel? }`.
   Card with progress bar (done/total), each step a row with
   checkmark-circle (done, `feedback.success`) or ellipse-outline (pending), chevron.
   Used by owner first-run (T4.1).
4. **`confirm-sheet.tsx` — `useConfirmSheet`** hook or component wrapping the existing
   `expo-safe-bottom-sheet`: standardized destructive confirmation (title, body,
   destructive label, cancel). Replace `Alert.alert` confirmation in
   `apps/mobile/app/(member)/you.tsx` (`confirmSignOut`) with it; leave other
   `Alert.alert` usages until touched by later tasks.

**Verify:** Storybook-style stories optional; typecheck + render one usage each.

### T0.6 Copy style guide + rename map

**What:** Create `docs/copy-style-guide.md` and apply the rename map across mobile.

**How:** Write the guide with these rules: sentence case everywhere (headings, buttons,
tabs); no abbreviations or ops jargon; one name per concept; INR via the existing
`formatInr`; dates via `formatDateTime`/short formats. Banned → replacement map (apply
with grep across `apps/mobile`, user-visible strings only):

| Current | Replace with |
| --- | --- |
| "Cmd" (owner tab) | "Today" |
| "Command view" / "command" copy | "Today" / plain descriptions |
| "Plans in motion" | "Active plan work" |
| "Today coaching actions" | "Today" |
| "Feature Locked" | "AI drafting is off" (see T6.2) |
| "Trainer mode" chip | "Trainer" |
| "Review" (owner approvals tab) | "Approvals" |
| Member tab "Profile" on `you` screen titled "You" | both "You" |
| "Desk" vs "Reception" mixed | screen title "Front desk", role name "Reception" |

**Verify:** grep for each banned string in `apps/mobile` returns zero (excluding tests
that assert new copy).

### T0.7 Contrast audit covers mobile palettes in CI

**What:** `packages/ui/src/contrast-audit.ts` + `packages/ui/__tests__/tokens.test.ts`
already exist for web. Add test cases asserting WCAG AA (4.5:1 text, 3:1 large
text/icons) for both mobile palettes from `@zook/tokens`: `text.primary/secondary/
tertiary` on `bg.app/elevated` and on `surface.default/raised`; `accent.base` on
`bg.app` (as icon, 3:1); `text.onAccent` on `accent.fill`; feedback colors on their
soft surfaces. Fix any failing palette value by darkening/lightening minimally.

**Verify:** `pnpm --filter @zook/ui test` passes and runs in existing CI.

---

# WS1 — Navigation and information architecture

### T1.1 One platform-adaptive tab bar for all roles

**What:** All four roles use the same tab chrome. Today: member has a custom floating
pill bar with center scan FAB (`apps/mobile/app/(member)/_layout.tsx`), staff roles use
default tabs styled by `createRoleTabBarStyle` (`apps/mobile/src/lib/theme/tab-bar.ts`)
— different heights, label sizes, and backgrounds.

**How:**
1. Create `apps/mobile/src/components/role-tab-bar.tsx` exporting `RoleTabBar`, a
   generalization of the member `FloatingTabBar`: props
   `{ state, descriptors, navigation, badges?: Record<string, number>, centerAction?: { routeName: string } }`.
   - iOS: current member treatment (floating, blur, 76px) is the house style — keep it.
   - Android: full-width bar, `bg.elevated`, hairline top border, 64px + bottom inset,
     Material-feeling active state (the existing `tabItemWrapper` accent-soft pill).
   - Labels: `typography.navLabel` (12px) on both platforms — fixes the 9px/10px split.
   - Icons: from the route's `options.tabBarIcon` (so each layout declares its own
     icons; don't hardcode route names in the bar). Badge rendering generalized from
     the current member unread badge.
   - `centerAction` renders the raised circular button (current scan FAB) for the named
     route; only member uses it.
2. Use `RoleTabBar` in all four layouts:
   `apps/mobile/app/(member)/_layout.tsx`, `app/owner/_layout.tsx`,
   `app/trainer/_layout.tsx`, `app/reception/_layout.tsx` via
   `<Tabs tabBar={(p) => <RoleTabBar {...p} …/>}>`.
3. Delete `createRoleTabBarStyle` (`lib/theme/tab-bar.ts`) and
   `src/components/role-tab-bar-background.tsx` once unused.
4. Badge sources: owner approvals pending count (already in owner layout), member
   unread notifications. **Fix the re-render issue while here:** in both layouts,
   compute the count with React Query `select` so the layout only re-renders when the
   *count* changes, e.g.
   `useMyNotifications({ select: d => d.notifications.filter(n => !n.readAt).length })`
   — adjust the domain hook in `src/lib/domains/notifications/queries.ts` to accept
   `select`/options passthrough if it doesn't already.

**Verify:** run the app as `member@zook.local`, `owner@zook.local`,
`trainer@zook.local`, `reception@zook.local` — identical chrome per platform; scan FAB
only for member; badges still show; typecheck/lint clean.

### T1.2 Tab sets per role

**What:** Rebalance tabs (member retention surface in, rarely-used surfaces out).

**How:**
- **Member** (`app/(member)/_layout.tsx`): `index` (Home, home icon) · `plan` (Plan,
  barbell) · `scan` (center action) · `progress` (Progress, stats-chart icon — new tab,
  see T3.3) · `you` (You, person). **Shop leaves the tab bar** (T3.3 adds its entry
  points). Remove the hidden `diet` tab and its special-casing in the tab bar
  (`focusedRouteName === "diet"` checks) — T3.4 relocates diet inside Plan.
- **Owner** (`app/owner/_layout.tsx`): `index` (Today, pulse icon) · `members` ·
  `approvals` (Approvals) · `revenue` · `more` (new screen `app/owner/more.tsx`,
  ellipsis-horizontal icon). Move **Stock** and **Billing** off the bar: `more.tsx`
  is a simple list screen (use `ListRow`) linking to `/owner/stock` (gated by
  `SHOP_MANAGE_PRODUCTS`), `/owner/billing` (gated by `ORG_MANAGE_BILLING`), and the
  "Manage on web" rows from T7.3. Keep the routes themselves; set `href: null` on
  their `Tabs.Screen` entries so they remain pushable but not tabs.
- **Trainer** (`app/trainer/_layout.tsx`): Today (`index`) · Clients · Plans · Payouts
  stays if currently a tab — check the file; if payouts is a tab, keep it; otherwise
  leave structure, only renaming labels per T0.6.
- **Reception** (`app/reception/_layout.tsx`): Front desk (`index`) · Members ·
  Payments · Orders (confirm current names in file; rename labels only).

**Verify:** every previously-reachable screen is still reachable (tab, More list, or
push); deep links to `/owner/stock` and `/(member)/shop` still resolve.

### T1.3 Native headers

**What:** Stop suppressing native headers globally; use native stack headers for all
pushed (non-tab) screens. Tab roots keep custom in-screen heroes.

**How:**
1. Root stack `apps/mobile/app/_layout.tsx` (and `src/features/route-surfaces/root-layout-route.tsx` which backs it): for the route groups of pushed screens
   (`settings/*`, `profile/*`, `membership/*`, `notifications/*`, `shop/*` modal stack,
   `tracking*`, `plan/[assignmentId]`, `owner/member/[id]`,
   `trainer/clients/*`, `reception/members/[id]`, `reception/payments/new`,
   `attendance/[…]`, `order/[…]`), set `headerShown: true` with:
   `headerLargeTitle: true` on iOS for list screens (Membership, Notifications,
   History, Members), regular titles elsewhere; `headerBackButtonDisplayMode:
   "minimal"`; `headerTintColor: palette.accent.base`; `headerStyle: { backgroundColor:
   palette.bg.app }`; `headerTitleStyle` from `typography.headerTitle` (drop
   fontFamily-only differences).
2. Remove the per-screen `<Stack.Screen options={{ headerShown: false }} />` lines and
   the custom `MobileHeader` from those pushed screens; pass `title` via
   `Stack.Screen options`. Where a screen used `MobileHeader` subtitle text, move it to
   a leading paragraph under the header if it adds information; otherwise drop it.
3. Tab root screens (member home/plan/progress/you, owner Today/members/approvals/
   revenue, trainer/reception roots) keep `headerShown: false` and their in-screen
   `MobileHeader` hero — but `MobileHeader` becomes the *only* custom header in the
   app.
4. List screens with search (owner members, reception members, shop index): use native
   `headerSearchBarOptions` (iOS pull-down search) where the screen has a native
   header; keep the existing `SearchField` on tab roots.
5. Sanity-check Android predictive back: `app.config.ts` —
   `android.predictiveBackGestureEnabled: true` if not set.

**Verify:** iOS: settings/membership/notifications show large titles and back-swipe
works from every pushed screen. Android: system back and predictive back work
everywhere. `grep -rn "headerShown: false" apps/mobile/app | wc -l` drops to roughly
the number of tab layouts + tab root screens.

### T1.4 Route cleanup

**How (explicit file list):**
1. Delete `apps/mobile/app/find-gyms.tsx` (it's just `<Redirect href="/gyms" />`);
   grep for `find-gyms` references and update them to `/gyms`.
2. Delete `apps/mobile/app/more.tsx` (re-exports the You screen); grep for `"/more"`
   links and point them at `/(member)/you`.
3. Keep `app/g/[username].tsx` and `app/gym/[username].tsx` (deep-link aliases, they
   redirect correctly). No change.
4. Plan routes: keep `app/(member)/plan.tsx` (tab) and `app/plan/[assignmentId].tsx`
   (detail). Delete `app/plans.tsx` and `app/plans/[assignmentId].tsx` after replacing
   them with redirects? No — replace each file's content with a `<Redirect>` to the
   `/plan/...` equivalents (old notification deep links may reference them), and grep
   `apps/mobile/src` + `packages/core` for `"/plans"` links, updating to `/plan`.
5. `app/owner/index.tsx`: delete the `useEffect` that re-handles `params.view` (lines
   ~47–53) — `app/owner/_layout.tsx` already performs the same redirect. Keep the
   layout version.
6. Replace drill-in `router.replace` with `router.push` in:
   `app/owner/index.tsx` (all `AttentionItem` ctas and `MetricTileItem.onPress`),
   and grep `rg "router.replace\(" apps/mobile/app apps/mobile/src` reviewing each —
   rule: `replace` only for auth transitions, role switches, and alias redirects;
   everything user-initiated that should support "back" uses `push`.
7. `route-surfaces` indirection: leave as-is (it isolates heavy screens); do NOT
   migrate in this pass.

**Verify:** typecheck; manually: owner Today → tap "Active members" → back returns to
Today (not exits); old link `zook://plans` path still lands on plan.

### T1.5 Legacy screen retirement (membership / profile / settings)

**What:** `app/membership/index.tsx` re-exports
`src/features/member/legacy/membership-legacy.tsx` (1,239 lines); profile and settings
have similar legacy backings. Composable pieces already exist in
`src/components/membership/` (`active-membership-card.tsx`, `autopay-card.tsx`,
`payments-section.tsx`, `membership-history-section.tsx`, `helpers.ts`).

**How:**
1. Build `src/features/member/membership/membership-screen.tsx` composing the existing
   membership components: active membership card → autopay card (if mandate exists) →
   payments section → history link → "Buy membership" CTA when none active
   (`href="/membership/buy"`). Read data from the same domain hooks the legacy file
   uses (find them at the top of `membership-legacy.tsx`; they live in
   `src/lib/domains/payments` and `member`). Wire `app/membership/index.tsx` to it.
2. Check what `app/profile/index.tsx` and `app/settings/index.tsx` actually render:
   if they re-export `profile-legacy.tsx`/`settings-legacy.tsx`, do the same
   extraction — settings is mostly `ListRow` navigation (mirror the rows already in
   `(member)/you.tsx` `settingsRows`); profile composes
   `src/components/profile/profile-photo-control.tsx` + `profile-extra-fields.tsx` +
   an edit form. Preserve every action the legacy screens expose (diff the rendered
   sections; do not drop functionality silently — list anything intentionally dropped
   in the commit message).
3. Delete the three `src/features/member/legacy/*.tsx` files and
   `src/features/member/plan/legacy-plan-detail.tsx` only after T3.5 replaces plan
   detail. Confirm with `rg "legacy" apps/mobile/src apps/mobile/app` → zero hits.

**Verify:** membership screen shows the same data for `member@zook.local` seed (active
membership, payment history); profile photo upload and extra fields still work;
typecheck clean.

---

# WS2 — Onboarding rewrite

Current flow: `app/onboarding/index.tsx` (splash, 2s timer + whole-screen Pressable) →
`language.tsx` → `value-props.tsx` → `role-question.tsx` → `permissions.tsx` → login.

### T2.1 Splash

**Where:** `app/onboarding/index.tsx`.
**How:** Reduce the auto-advance timeout to 1200ms (static) / 1400ms (animated);
shorten animation durations to fit (wordmark 480ms, mark delay 480ms/360ms). Remove the
"Tap to skip" text. Keep the screen pressable but guard double-navigation: keep a
`navigatedRef`, set it in both the timer and press handler, and skip if already set.

### T2.2 Remove role question and permissions steps; gate language

**How:**
1. Delete `app/onboarding/role-question.tsx`. Roles come from the backend after login;
   nothing should depend on the answer — grep for where the answer is stored
   (`rg "role-question|roleQuestion|onboardingRole" apps/mobile`) and remove the
   storage + reads.
2. Delete `app/onboarding/permissions.tsx` (permissions move to point-of-use, T2.3).
3. `language.tsx`: keep the screen but only in the flow if real localization ships
   (T9.2 decides). Default behavior for this pass: skip it — wire splash →
   `value-props` directly, default the locale from the device
   (`expo-localization` or existing `src/lib/i18n.tsx` logic), and ensure Language
   remains reachable at `settings/language`.
4. `value-props.tsx`: cap at 3 slides, add a persistent "Skip" in the top-right safe
   area, final slide CTA → `/login`.
5. Update the step order wherever it's encoded (`app/onboarding/[step].tsx` /
   `src/features/route-surfaces/onboarding-step-route.tsx` — read these files; they
   likely define the sequence) and fix `route-guards.ts` tests if they assert the old
   sequence (`src/lib/route-guards.test.ts`).

**Verify:** fresh install (clear storage) reaches login in ≤3 taps; `pnpm --filter @zook/mobile test` passes (update route-guard tests deliberately, not by deletion).

### T2.3 Contextual permission prompts

**What:** New `PermissionRationaleSheet` + per-feature request points.

**How:**
1. `src/components/primitives/permission-sheet.tsx`: bottom sheet (reuse
   `expo-safe-bottom-sheet`) with icon, title, one-sentence why, "Allow" (triggers the
   OS prompt) and "Not now". Export hook
   `useRequestPermissionWithRationale(kind: "camera" | "location" | "notifications")`
   that: returns immediately if already granted; shows the sheet once per kind
   (persist "asked" in `src/lib/storage.ts`); on Allow calls the matching expo request
   (`expo-camera`, `expo-location`, `expo-notifications` — registration helper already
   in `src/lib/push-notifications.tsx`).
2. Integration points:
   - Camera → member Scan screen (`app/(member)/scan.tsx` /
     `src/features/route-surfaces/member-scan-route.tsx`): call before activating the
     camera view; show an in-screen `EmptyState` with "Enable camera" if denied.
   - Location → inside the geofence hook (T3.1) on first active check-in with branch
     coordinates; if denied, skip geofencing silently (manual checkout still works).
   - Notifications → after the first successful check-in toast OR after joining a gym:
     copy "Get renewal reminders and approval updates". Find the join-success and
     checkin-success code paths (`src/lib/domains/attendance/mutations.ts` consumers,
     join flow in `app/join/[username].tsx`) and trigger there, max once.

**Verify:** fresh install: no OS permission dialog appears before login or before the
relevant feature is touched; scan still works after granting.

---

# WS3 — Member surface

### T3.1 Extract geofence auto-checkout into a layout-level hook

**What:** `app/(member)/index.tsx` lines ~36–306 embed geofence config, haversine
distance, location watching/polling, and checkout mutation inside the Home screen —
it stops running when the user switches tabs (correctness bug).

**How:**
1. Create `src/lib/use-geofence-checkout.ts` exporting `useGeofenceCheckout()`. Move
   verbatim: the constants (`GEOFENCE_*`, env radius parsing), `distanceMeters`, the
   watch/poll effect, and the checkout call. Inputs come from `useMemberHome()`
   (`activeCheckIn`) and `useAuth()`. Move `applyCheckoutToCache` +
   `stopActiveCheckIn` into the hook; return
   `{ activeCheckIn, checkoutBusy, stopActiveCheckIn }`.
2. Mount the hook once in `app/(member)/_layout.tsx`; have the Home screen consume the
   same data via `useMemberHome()` and call a small exported
   `useManualCheckout()` (or pass through context if simpler — prefer a module-level
   approach: hook mounted in layout does geofencing; Home uses its own instance of the
   checkout mutation; guard double-checkout server-side semantics already exist via
   the `checkoutStartedRef` — move that ref into the hook).
3. Wire the location permission request through T2.3's rationale flow.

**Verify:** check in (seeded QR or manual via reception), navigate to Plan tab, mock a
location outside radius (or temporarily lower the radius env) → auto-checkout fires
while not on Home; unit-test `distanceMeters` and the exit-counting logic by extracting
them pure into the hook file (add `use-geofence-checkout.test.ts` following the
existing `src/lib/*.test.ts` vitest pattern).

### T3.2 Member home rebuild

**Where:** `app/(member)/index.tsx` + `src/features/member/home/`.

**What/How (final layout, top to bottom):**
1. `MobileHeader` — keep, but add a streak chip when `streakDays > 0` (data already in
   the home payload per `state.ts`): pill with flame icon + "N-day streak".
2. `ActiveCheckInCard` — keep as-is (it's good), now using hook state from T3.1.
3. State hero card via existing `deriveHomeState`/`renderHomeCard`
   (`src/features/member/home/state.ts`, `render.tsx`) — keep the machine, upgrade two
   cards:
   - `cards/workout-card.tsx`: show up to 3 exercise names of today's day (extend the
     member home API payload only if it already carries plan content; otherwise fetch
     via the existing plan assignment query from `src/lib/domains/plans` — check
     `queries.ts` for a plan-detail hook) + "Start workout" primary button →
     `/plan/[assignmentId]`.
   - `cards/no-org-card.tsx` and `first-run-card.tsx`: single CTA "Find your gym" →
     `/gyms`; remove multi-CTA clutter if present.
4. **New: this-week `StatStrip`** (T0.5): visits (attendance count this week — derive
   from `recentAttendance` in the home payload), active time, workouts logged, habits
   done. Sources: `src/lib/domains/tracking/queries.ts` already powers the Tracking
   screen's weekly stats (see screenshot evidence: "Active time 1h15m / Sessions 1 /
   Weight 68.4kg / Habits 1") — reuse the same hooks. Tapping it → `/progress` tab.
5. Contextual cards (render only when applicable, in this order): pickup-ready order
   (shop order with pickup code — hook in `src/lib/domains/shop/queries.ts`),
   membership expiring ≤7 days (amber `Banner` with "Renew" → `/membership/buy`),
   pending join approval, then the existing `Banners` component
   (`features/member/home/banners.tsx`) — fold these into `banners.tsx` so the screen
   stays thin.
6. Keep `HomeSkeleton`, `QueryErrorState`, pull-to-refresh exactly as now. Delete the
   dead `HomeLoading` component at the bottom of the file (unreferenced).

**Verify:** seed member sees: streak chip absent (0), workout/no-plan hero, week strip
with real numbers; all cards navigate correctly; no zero-only screen (if everything is
empty the hero state covers it with one CTA).

### T3.3 Progress tab + Shop demotion

**How:**
1. Create `app/(member)/progress.tsx` containing what `app/tracking.tsx` renders today
   (that file is 99 lines — read it; it likely re-exports/wraps
   `src/components/tracking.tsx`). Move the surface (workouts/body/habits with
   History link to `/tracking-history` and Log entry to `/tracking-entry`). Replace
   `app/tracking.tsx` content with a `<Redirect href="/(member)/progress" />` (old
   links/notifications). Register the tab per T1.2.
2. Shop exit from tabs: remove `shop` from `(member)/_layout.tsx` tab screens
   (`href: null`), keep `app/(member)/shop.tsx` route working. Entry points instead:
   (a) home contextual card when the gym has products — determine via the shop products
   query (`src/lib/domains/shop/queries.ts`, e.g. `useShopProducts`): render a "Gym
   shop" card when `products.length > 0`; (b) a "Gym shop" `ListRow` in the You screen
   Quick actions card (always, label hides nothing).

**Verify:** Progress tab shows tracking data; member of a gym with seeded products sees
the shop card; `/shop` cart/checkout/pickup flows unchanged.

### T3.4 Diet inside Plan

**Where:** `app/(member)/plan.tsx`, `app/(member)/diet.tsx`, member layout.
**How:** Add a segmented control at the top of the Plan screen — two segments
"Workout" | "Diet" (build `primitives/segmented-control.tsx`: pill container
`bg.sunken`, animated thumb `surface.raised`, `typography.caption` labels — or use
`@react-native-segmented-control/segmented-control` on iOS and the custom one on
Android; simpler: custom on both). Render current plan content vs current diet content
(move `diet.tsx` body into `src/features/member/plan/diet-panel.tsx`). Delete the
`diet` tab registration and the tab-bar special-casing (done in T1.2); replace
`app/(member)/diet.tsx` with a redirect to `/plan?tab=diet` and honor the param.

**Verify:** plan/diet toggle works; deep link `/diet` lands on the diet segment.

### T3.5 Plan detail rewrite

**Where:** new `src/features/member/plan/plan-detail.tsx` wired to
`app/plan/[assignmentId].tsx`; then delete `legacy-plan-detail.tsx`.

**How:** Read `legacy-plan-detail.tsx` first to inventory data hooks and actions —
reuse them all. Screen structure: native header (title = plan name, large title off) →
day selector (horizontal chip row of plan days, today preselected) → exercise list
(Card per exercise: name, sets × reps × weight hint, optional notes) → per-exercise
"Log set" / mark-done action writing through the existing tracking mutations
(`src/lib/domains/tracking/mutations.ts` — the Tracking screen's log-workout flow shows
the shape) → sticky bottom "Finish workout" button that records the session and routes
back to Home (which will then show the `workoutLoggedToday` hero). Preserve any
PT/trainer-note rendering the legacy screen had.

**Verify:** start → log → finish loop updates home state to "logged today"; history
shows the session; legacy file deleted with zero remaining references.

---

# WS4 — Owner surface

### T4.1 Setup checklist (first-run)

**How:**
1. **API:** add `GET /api/org/setup-status` to the web API. Follow the existing
   route-handler pattern (find a sibling under the catch-all router — locate where
   `org`-scoped GET handlers are registered: `rg "setup|dashboard" apps/web/src/server`
  ; mirror the owner-dashboard handler's context/RBAC usage, permission
   `ORG_VIEW_REPORTS` or the dashboard's permission). Response, derived with cheap
   Prisma counts on existing tables:
   `{ hasMembershipPlans, hasQrDisplayed (true if any attendance record OR qr token generated — if not derivable, use hasAnyAttendance), staffCount, memberCount, hasShopProducts }`.
2. **Mobile:** `src/lib/domains/owner/queries.ts` — add `useOwnerSetupStatus()`.
3. Owner Today (`app/owner/index.tsx`): when any of
   plans/staff(>1)/members(>1) is false, render `SetupChecklist` (T0.5) as the FIRST
   card: steps "Create membership plans" → web handoff sheet (T7.3) or
   `/dashboard/membership-plans` link; "Display your check-in QR" → instructions sheet
   pointing to web `/dashboard/attendance/qr-display`; "Invite staff" → web staff page
   handoff; "Share your join link" → native share sheet
   (`Share.share` with `https://zookfit.in/g/{username}` — org username available from
   `useRoleContext()` / dashboard payload). Hide the checklist permanently once all
   steps are done (no manual dismiss).

**Verify:** fresh-org owner (create via `/start-gym` on web or a seed without data)
sees the checklist; seeded full org doesn't.

### T4.2 Today screen restructure

**Where:** `app/owner/index.tsx`.
**How:**
1. Order: header (title "Today", org + branch as eyebrow, `RoleSwitcherChip`) →
   SetupChecklist (conditional) → `MetricGrid` (keep 4 tiles; change `router.replace`
   → `push`, done in T1.4) → **single** "Needs attention" section → charts
   (`OwnerDashboardCharts` exists — keep).
2. Needs-attention rework: currently builds 4 always-rendered `AttentionItem`s (every
   row renders even when there's nothing to do, with tone "lime" and CTA "Open").
   Change: build the array with only items whose count > 0; if the array is empty
   render ONE `EmptyState` (icon checkmark-done, title "All clear",
   body "Nothing needs your attention right now", no CTA). Remove per-item
   "Open"-when-zero CTAs entirely.
3. Metric tiles: hints must be real ("0 pending review" → omit hint when zero).

**Verify:** seeded org with pending join request shows exactly one attention row;
empty org shows the single All-clear state under the checklist.

### T4.3 Approvals screen single empty state

**Where:** `app/owner/approvals.tsx`.
**How:** The screen currently stacks "All caught up" + "No join requests" + per-queue
empties. Restructure: if joinRequests + scanReviews are both empty → render ONE
`EmptyState` ("All caught up", body "New join requests and scan reviews will appear
here") and nothing else. Otherwise render only the non-empty sections, each with a
count in its `SectionHeader`.

### T4.4 Expiring memberships → action

**Where:** `app/owner/revenue.tsx` (the "expiring soon" attention row currently dumps
into revenue).
**How:** Add an "Expiring soon" section to the owner members screen
(`app/owner/members.tsx`) or revenue screen — wherever the expiring list data already
exists (`rg "expiringMemberships|expiring" apps/mobile/src/lib/domains apps/web/src/server` to find the payload; the dashboard summary has the count, check if a list
endpoint exists; if only a count exists, add `expiringSoon: {memberId,name,endsAt}[]`
to the owner dashboard payload server-side). Each row: member name, days left, button
"Send reminder" → existing notification send mutation
(`src/lib/domains/notifications/mutations.ts`; reuse whatever
permission/template the web notifications surface uses — keep it a simple
prefilled message: "Your membership ends on {date}. Renew in the app."). Point the
Today "Expiring soon" attention row here instead of `/owner/revenue`.

**Verify:** seeded expiring member receives an in-app notification after tapping
"Send reminder" (log in as that member to confirm).

---

# WS5 — Reception surface

### T5.1 Split the mega-file

**Where:** `src/features/reception/reception-workspace.tsx` (2,193 lines backing 4
screens).
**How:** Mechanical, behavior-preserving extraction into
`src/features/reception/`: `desk-context.tsx` (the shared context/provider + sheet
plumbing currently at the top of the file), and ensure `components/desk-screen.tsx`,
`members-screen.tsx`, `payments-screen.tsx`, `orders-screen.tsx` (already exist —
check whether they import from the workspace or duplicate) contain their own screen
code. Target: no file in `features/reception` over ~500 lines; `reception-workspace.tsx`
deleted or reduced to the provider. No visual/behavioral changes in this task.

**Verify:** all four reception screens render and function identically (code verify,
manual payment, order fulfill); typecheck clean.

### T5.2 Desk verify speed pass

**Where:** the desk screen's entry-code verify flow (search `verifyCode|entryCode` in
`features/reception/`).
**How:**
1. Auto-submit when the code input reaches the expected length (inspect what length
   codes have — pickup codes look like `AS-PICK-101`; attendance entry codes check
   `src/lib/domains/reception`; if lengths vary, keep the button but also submit on
   keyboard "done").
2. Verify result becomes a full-screen modal (not an inline card):
   success → `feedback.success`-tinted backdrop, member profile photo LARGE (≥160px,
   `profilePhotoUrl` is already in the verification payload), name, what was verified
   (check-in vs pickup + order total), auto-dismiss after 4s with manual dismiss;
   failure → danger-tinted equivalent with the reason. Haptics: success/error
   notification haptic on result (pattern from `pressWithHaptics`).
3. Keep all existing audit logging untouched.

**Verify:** verify a seeded pickup code and an invalid code; both readable at a
glance; sheet auto-dismisses.

---

# WS6 — Trainer surface

### T6.1 Trainer home reorder

**Where:** `app/trainer/index.tsx`.
**How:** Order: header ("Trainer", client-count eyebrow — remove the
"client list is access-controlled" line from the hero; if the access note matters,
make it a one-time dismissible info `Banner` at the bottom) → "Today" section first
(clients with sessions/coaching actions today — the data driving the current "TODAY /
The next coaching actions to clear first" block) → "Needs plan" queue ("N clients
ready for coaching" / "Create plan next" — currently below) → active plans summary →
AI draft entry last. Apply T0.6 copy renames ("Plans in motion" → "Active plan work").

### T6.2 AI locked state

**Where:** `src/features/trainer/components/ai-draft-panel.tsx`.
**How:** Replace the "Feature Locked" wall: title "AI drafting is off", body
"Your gym owner can turn on AI plan drafting in settings. You can still create and
edit plans manually." with a single secondary button "Create plan manually" routing to
the manual plan flow. Keep the unlocked state as-is.

---

# WS7 — Cross-cutting consistency

### T7.1 Empty-state audit

**How:** `rg -l "No |All caught|caught up|empty" apps/mobile/src apps/mobile/app`
plus manual pass over list screens (owner members/revenue/stock, reception all,
trainer clients/plans/payouts, member notifications/membership history/shop/orders,
tracking history). Replace each ad-hoc empty rendering with the `EmptyState`
primitive: one icon, one sentence, at most one CTA pointing to the action that fills
the list (e.g. members → "Share your join link" share action; notifications → none).

### T7.2 Role switching consistency

**How:** `src/components/role-switcher.tsx` (`RoleSwitcherChip`) — ensure the chip
appears in the header of every role's root screen (member home, owner Today, trainer
home, reception desk) for multi-role users, and that the You screen rows (T0.5's
`PillActionRow` items in `(member)/you.tsx`) and the chip drive the same
`switchRole` from `src/lib/auth.tsx`. On switch, show a brief full-screen overlay
("Switching to Owner…", brand background, ~600ms or until the target layout mounts)
so the chrome change reads as intentional — implement in the auth/role-switch path,
not per-screen.

### T7.3 "Manage on web" handoff

**How:** `src/components/web-handoff-row.tsx`: a `ListRow` variant with
globe icon, title, subtitle "zookfit.in dashboard", chevron-up icon; tap → sheet with
the absolute URL, "Copy link" (`expo-clipboard`) and "Open" (`Linking.openURL`).
Add rows: owner More screen (T1.2) → Branches, Coupons & offers, Reports, Staff,
Notification templates (URLs: `https://zookfit.in/dashboard/branches`, `/plans/coupons`,
`/reports`, `/staff`, `/notifications/templates`); base URL from existing config
(`rg "zookfit.in|WEB_URL|PUBLIC_URL" apps/mobile/src .env.example` — use the env-driven
value, not a hardcoded string).

### T7.4 Notification deep-link audit

**How:** `src/lib/notification-routing.ts` + its test already map notification types →
routes. Update any routes changed by WS1/WS3 (`/plans/*` → `/plan/*`, `/tracking` →
`/progress`, shop tab removal) and extend `notification-routing.test.ts` cases
accordingly.

---

# WS8 — Native polish and accessibility

### T8.1 Platform icons
Add `expo-symbols`; create `src/components/primitives/icon.tsx` exporting
`Icon({ name, size, color })` that maps a small app-level icon vocabulary (home, plan,
scan, progress, you, members, approvals, revenue, more, desk, payments, orders,
notifications, settings…) to SF Symbols on iOS and Ionicons on Android. Migrate the
tab bars and headers first (highest visibility); migrate other Ionicons usages
opportunistically, not exhaustively.

### T8.2 Dynamic type
Remove any `allowFontScaling={false}` (`rg "allowFontScaling" apps/mobile`). Manual
pass at iOS accessibility text size XL and Android font scale 1.3: member home, plan
detail, owner Today, desk verify. Fix overflow by allowing wrap (`numberOfLines`
removal) or layout adjustment, not by shrinking fonts.

### T8.3 Touch targets
Audit chips/rows/tab labels: every tappable ≥44pt. Known offenders: tab labels are
fine after T1.1; check `Pill`, `StatusChip` onPress usages and list chevrons
(`ListRow` height).

### T8.4 Android system integration
`app.config.ts`: confirm `android.edgeToEdgeEnabled: true` (or add) +
`predictiveBackGestureEnabled: true`; verify status/navigation bar colors come from the
theme (expo-status-bar usage in root layout); add `android_ripple` to `ListRow` and
`Pill` pressables (Button done in T0.3).

### T8.5 Screen-reader pass on the five money flows
Login, join-a-gym, membership checkout, member scan, desk verify: every interactive
element has `accessibilityLabel`/`Role`; OTP input announces digits
(`primitives/otp-input.tsx`); scan screen announces camera state; desk verify result
announces success/failure (`AccessibilityInfo.announceForAccessibility` on result).

---

# WS9 — Launch hygiene

### T9.1 Regenerate store screenshots
`artifacts/app-store-screenshots-20260522/*.png` are blank splash captures ("Tap to
skip" on cream) — unusable. After WS2/WS3 land: re-capture the 9-screen set against
seeded demo data (member home with workout hero, plan detail, scan, progress, owner
Today with data, approvals with a pending item, trainer home, desk verify success,
notifications). Reuse whatever script produced
`artifacts/store-mobile-dark-screenshots-20260522` (`rg -l "store-assets|screenshots" scripts/`). Add a guard to the capture script: reject any frame whose pixel variance
is near zero (blank detection).

### T9.2 i18n decision (pick A unless instructed otherwise)
**Option A (default): English-only for now.** Remove the onboarding language step
(done in T2.2), keep `settings/language` hidden (`href` removal from You settings rows)
until localization is real, and delete unused locale scaffolding only if trivially
separable. **Option B: ship Hindi for the member surface** — wire `useI18n` through all
member-facing routes (currently 3 of 31 route files use it), extract ~300 strings to
the message catalog (`apps/mobile` i18n setup in `src/lib/i18n.tsx`), translate, and
re-enable the language step. Do not half-ship B.

### T9.3 API route split
Execute the existing plan in `docs/api-router-split-plan.md` (splitting the
`app/api/[[...path]]` catch-all into per-domain route files). Follow that document;
it predates this one and remains valid.

### T9.4 Feedback channel
`app/settings/support.tsx`: ensure "Report a problem" posts somewhere real — wire to
the existing notifications/email provider (e.g. a `POST /api/support/feedback` handler
that emails via the configured email provider and logs to Sentry breadcrumbs). Include
app version (`expo-constants`), role, and orgId automatically.

---

# Global definition of done

1. `pnpm typecheck && pnpm lint` clean at root; `pnpm --filter @zook/mobile test` and
   `pnpm --filter @zook/ui test` pass; Playwright web smoke (`apps/web/tests`) passes.
2. Greps return zero: `tone=` (buttons), `GlassCard|GlassInput`, `legacy`,
   `brandLime` in `apps/mobile`, `"Cmd"|Plans in motion|Feature Locked` user strings.
3. Manual matrix (iOS simulator + one Android device/emulator, light + dark theme):
   - Fresh install → login in ≤60s with no upfront permission dialogs.
   - Member: home hero reflects plan state; start→log→finish workout updates home;
     Progress tab live; scan asks camera permission contextually.
   - Owner: fresh org sees setup checklist, not zeros; every drill-in supports back;
     approvals shows one empty state when clear.
   - Reception: code verify is full-screen and glanceable.
   - Trainer: today-first ordering; AI-off state explains itself.
   - All roles share identical tab/header chrome per platform.
4. Store screenshot set regenerated and non-blank.
