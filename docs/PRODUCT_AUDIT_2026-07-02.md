# Zook Product Audit — 2026-07-02

Full-product audit (mobile app, web app, backend, packages) for premium-SaaS readiness.
Each issue has an ID, severity, evidence (file:line), and an **exact directive** — read and execute, no further research needed unless the directive says "verify first".

Severity: **P0** = correctness/money/security bug, fix before next release · **P1** = visible product-quality fault · **P2** = debt/polish that compounds.

Verified context: monorepo typecheck is green (8/8 packages), all 366 unit tests pass, mobile i18n key audit passes (2,668 keys, Hindi 100% key coverage). The payment core (webhook signature verification, payment-session ownership checks, serializable activation transactions, rate-limit coverage, cron secret enforcement outside local) is genuinely hardened — do **not** rework those areas; the issues below are the actual gaps.

---

## A. Backend — correctness & logic gaps

### ✅ A1. [P0] UTC day-boundaries on an IST product — "today" metrics are wrong between 00:00 and 05:30 IST
The product is India-first (currency ₹, `en-IN`, Razorpay), and `apps/web/src/server/domains/shared/date.ts` + `operationalDateKey` (`apps/web/src/server/api-router/core.ts:1045`) already do this correctly with `Asia/Kolkata`. But many "today"/"this month" computations still use server-local (UTC in prod) time, so every daily stat flips 5.5 hours late:

- `apps/web/src/server/domains/overview/read-models.ts:66,248,459` — `monthStart.setHours(0,0,0,0)` (dashboard "this month" revenue/joins)
- `apps/web/src/server/domains/overview/chart-series.ts:51-53` — chart buckets start at UTC midnight (labels are IST via `Intl`, buckets are not — the bars themselves are shifted)
- `apps/web/src/server/reports-service.ts:30-32` — report from/to windows
- `apps/web/src/server/api-router/tracking.ts:449`, `apps/web/src/server/api-router/shop-orders.ts:215` ("fulfilled today" count), `apps/web/src/server/api-router/ai.ts:71-73`, `apps/web/src/server/api-router/core.ts:1684,3919,4433`
- `apps/web/src/server/domains/overview/read-models.ts:38` — cache key uses UTC date slices

**Directive:** Add to `apps/web/src/server/domains/shared/date.ts` a `startOfDayIst(date: Date): Date` and `startOfMonthIst(date: Date): Date` (compute the Y/M/D in `Asia/Kolkata` via `Intl.DateTimeFormat` parts — the same technique `operationalDateKey` uses — then construct the UTC instant for that IST midnight: `new Date(Date.UTC(y, m, d) - 5.5h)`). Replace every `setHours(0,0,0,0)` / `toISOString().slice(0,10)` day-logic call site listed above with these helpers. Add a unit test asserting that an event at `2026-07-01T20:00:00Z` (01:30 IST Jul 2) counts as **Jul 2**, not Jul 1. Do not change `attendance-service.ts` — it already uses per-branch timezone correctly.

### ✅ A2. [P0] "Workout logged today" disagrees between server (UTC) and mobile (device-local)
`apps/web/src/server/domains/plans/read-models.ts:114` resets exercise completion when `completedAt` is not today **in UTC**. The mobile home state (`apps/mobile/src/features/member/home/state.ts`, new `isToday()`) checks device-local time. A member finishing at 11 PM IST sees "logged today" on the phone while the server has already rolled to the next UTC day (or vice versa at 4 AM IST).

**Directive:** Change `read-models.ts:114` to compare IST dates using the helper from A1 (`completedAt` sliced through an `Asia/Kolkata` formatter). Keep the mobile device-local check as-is (device time ≈ IST for the target market; the server is the one that's wrong).

### ✅ A3. [P0] Desk-paid shop orders can oversell stock (negative inventory)
Order creation reserves stock safely with a guarded conditional update (`apps/web/src/server/api-router/shop-orders.ts:92-96`, `where: { stock: { gte: quantity } }`). But the manual desk-payment path decrements without the guard when no reservation exists: `apps/web/src/server/api-router/manual-payments.ts:138-141` does `stock: { decrement: item.quantity }` unconditionally inside the transaction.

**Directive:** In `manual-payments.ts`, replace the bare `tx.product.update({ data: { stock: { decrement } } })` with `tx.product.updateMany({ where: { id: item.productId, stock: { gte: item.quantity } }, data: { stock: { decrement: item.quantity } } })` and throw `conflictError("Product out of stock")` when `count !== 1` (mirrors shop-orders.ts:92-96). The transaction rollback then also voids the payment row, which is correct.

### ✅ A4. [P1] OTP request creates a user account before any verification
`apps/web/src/server/api-router/auth.ts:79` calls `getUserByIdentifierOrCreate(body.identifier)` on `POST /auth/request-otp` — before the code is ever verified. Anyone can mass-create junk `User` rows for arbitrary emails/phones (rate limit: 8/10min per IP, but distributed IPs scale it), and the create-vs-exists timing can leak account existence.

**Directive:** Move user creation to the `verify-otp` handler: `request-otp` should only create the OTP challenge keyed by identifier (the `AuthService`/challenge table doesn't need a userId to send a code — if `PrismaAuthRepo` currently requires one, store the identifier on the challenge and resolve/create the user in `verifyOtp` after the code matches, which `getAuthUserForVerifiedIdentifier` at line 113 already nearly does). Verify first that nothing between request and verify depends on the user row (e.g. seeded-demo path at line 64 is separate and fine).

**Status:** request OTP no longer creates users; verify OTP resolves/creates the user only after the challenge matches, with focused auth-service coverage.

### ✅ A5. [P1] `requireCronSecret` silently no-ops when the secret is missing
`apps/web/src/server/api-router/cron.ts:14-19`: `if (cronSecret && authHeader !== ...)` — when `getCronSecret()` returns `undefined`, every cron endpoint is publicly callable. `runtime-env.ts` throws for non-local envs at *validation* time, but nothing stops a prod process that skipped `validateRuntimeConfig` (or a misclassified `APP_ENV`) from serving open cron routes.

**Directive:** In `requireCronSecret` (and the inlined copy at cron.ts:24-28 — deduplicate it to use the helper), throw `forbiddenError` when `cronSecret` is falsy AND `getAppEnv() !== "local"`. One-line defense-in-depth.

### ✅ A6. [P0-ops] Prod is running stale code — rewards cron 404s
As of 2026-06-22, `https://zookfit.in/api/cron/rewards-settle` returned 404: the EC2 host predates the rewards/referral-guardrail routes. Everything shipped since (referral economics fix, reward settlement, review backend, classes cancel/roster) is dark in production.

**Directive:** Redeploy the web app to prod, then verify `POST /api/cron/rewards-settle` with the cron bearer returns 200, and confirm the cron schedules (`register handoff cron schedules` commit `837233da`) are actually firing (check `docs/` runbooks / infra for the scheduler used). Also confirm branch `mobile-ui-cleanup`'s ~30 commits have been merged to `main` — the memory notes say they were never pushed; `main`'s recent history suggests they landed, but verify with `git branch -a --contains`.

**Status:** production route is no longer stale-404 (`POST /api/cron/rewards-settle` without bearer returns 403 with `Invalid cron authorization` on 2026-07-02; latest unauthenticated request id `777b6da3-723e-4e54-a066-479b6a16569f`), `837233da` is contained on `main`, and `mobile-ui-cleanup` is an ancestor of `main`/`origin/main`. Scheduler registration is present in both deployment paths: `vercel.json` schedules `/api/cron/rewards-settle` hourly (`0 * * * *`), and `infra/aws/cloudformation.yaml` writes the same hourly host cron via `/opt/zook/run-cron.sh rewards-settle`. `scripts/check-release-env.ts` now verifies `/api/cron/rewards-settle` alongside the other handoff crons and no longer checks the deleted `apps/website` OG image; `pnpm exec tsx scripts/check-release-env.ts` passes with warnings only, including a pass for `/api/cron/rewards-settle`. After refreshing AWS profile `kyokasuigetsullp`, SSM confirmed the live production host in account `173237057070` is EC2 `i-0fe539e91f54c59cc` (`zook-web`) at `13.204.196.160` and SSM `Online`. SSM also confirmed `/etc/cron.d/zook` contains `0 * * * * root /opt/zook/run-cron.sh rewards-settle`, and `journalctl -u crond --since "12 hours ago"` shows hourly `CMD`/`CMDEND` entries for `/opt/zook/run-cron.sh rewards-settle` at 00:00, 01:00, 02:00, and 03:00 UTC on 2026-07-02. During verification, the live wrapper was found to hit Caddy over `http://127.0.0.1/api/...`, which returned a redirect without executing the app route; fixed both the live `/opt/zook/run-cron.sh` via SSM and the CloudFormation template so the wrapper resolves the running `zook-web-1` container IP and posts directly to `:3000`. Post-fix SSM command `f79543e4-2e27-4132-bb53-bb736d7648a6` ran `/opt/zook/run-cron.sh rewards-settle` with `run_cron_exit=0`, and the web container logged `POST /cron/rewards-settle` with `status:200` and `durationMs:62`. Public HTTPS bearer verification via SSM command `9550e86e-bbbd-490e-b53c-25e61f974d9d` returned `status=200` with payload `{"ok":true,"data":{"ok":true,"processed":0,"promoted":0,"reversed":0},"meta":{"requestId":"da020c74-45b7-4430-946a-b1b86bfd6547"}}`.

### ✅ A7. [P2] Duplicate unfiltered gym search query just for city chips (uncommitted diff)
`apps/mobile/app/gyms/index.tsx:85` (working tree) adds `const areaOptionsQuery = useGymSearch();` — a second, unfiltered full search request whose only purpose is city suggestions. Two network calls per screen, and the suggestion list is capped at whatever the unfiltered first page returns.

**Directive:** Either (a) add a cheap `GET /public/organizations/cities` endpoint (distinct cities, cached via `server-cache`) and a `useGymCities()` hook, or (b) compute suggestions once from the initial unfiltered result with `staleTime: Infinity` so it never refires. Do not ship the current double-query as-is.

### ✅ A8. [P2] Client-side rupee→paise conversion scattered and inconsistent
`Math.round(Number(x) * 100)` is hand-rolled in ≥6 web components (`refunds-section.tsx:120`, `payments-panel.tsx:154,247`, `classes-dashboard-route.tsx:228,256`, `payouts-dashboard-route.tsx:80-82`, `operational/actions/referrals.ts:31`) plus mobile `desk-context.tsx:269`. `apps/web/src/lib/payment-amount.ts` exists but isn't used everywhere; `Number("") === 0` means an empty field silently becomes ₹0 in some of these.

**Directive:** Export a single `rupeesToPaise(input: string): number | null` (null on empty/NaN/negative) from `apps/web/src/lib/payment-amount.ts` and a mirror in mobile `src/lib/formatting.ts`; replace all call sites above; treat `null` as a validation error in each form instead of submitting 0.

---

## B. Mobile app — UI/UX faults

### ✅ B1. [P1] Two competing header systems across the app
27 files use `ScreenHeader`, 38 use `AppHeader` (`apps/mobile/src/components/primitives/screen-header.tsx` vs `app-header.tsx`). They differ in title scale, back-affordance API, and context-slot layout — screens feel subtly different as you navigate (e.g. member tabs use ScreenHeader, tracking/settings pushed screens use AppHeader).

**Directive:** Unify on `ScreenHeader` (it's the richer one: `titleScale`, `contextSlot`, `trailing`). Add to it the `showBack` prop from `AppHeader`, migrate the 38 `AppHeader` call sites mechanically (title→title, showBack→showBack, trailing→trailing), delete `app-header.tsx`, and re-export `AppHeader = ScreenHeader` temporarily if any third-party/test references remain. Verify 3–4 representative screens per role on the iOS simulator (see `mobile-demo-run-harness` memory: `expo start --ios`, deep-link via `simctl openurl exp://127.0.0.1:8081/--/<path>`).

**Status:** `ScreenHeader` now owns the back/profile/header props, all `AppHeader` call sites were migrated, `app-header.tsx` was deleted, and mobile typecheck/tests pass. Rechecked offline-demo simulator verification on 2026-07-02: `pnpm --filter @zook/mobile ios` still cannot use Expo Go because the Expo Go fetch fails, but native local build/install is unblocked. Patched the generated iOS Podfile to skip CocoaPods target UUID stabilization for this Xcode 26/CocoaPods 1.16.2 combo, regenerated `Pods.xcodeproj`, and verified `xcodebuild -list -workspace apps/mobile/ios/Zook.xcworkspace` plus direct `xcodeproj` parsing both succeed. Native build then hit the upstream React Native/fmt consteval failure under Xcode 26, so the Podfile post-install patches `Pods/fmt/include/fmt/base.h` to set `FMT_USE_CONSTEVAL 0`; after that, `APP_ENV=local API_MODE=offline-demo EXPO_PUBLIC_API_MODE=offline-demo pnpm --filter @zook/mobile exec expo run:ios --no-build-cache --device 'iPhone 17'` built successfully (`Build Succeeded`, 0 errors), installed `com.zook.app`, bundled through Metro, and launched on the booted iPhone 17 simulator. The custom-scheme confirmation sheet was cleared by reinstalling the valid built app bundle, tapping the exposed iOS "Open" target once, starting plain Metro with `expo start --localhost`, and reloading the native app. Completed the required role sweep with screenshots under `/tmp/zook-sim/audit-2026-07-02/`: member home/scan/gym profile/shop/notifications, owner home/approvals/members/revenue, trainer home/clients/plans/payouts, and reception today/entry QR/members/payments/orders.

### ✅ B2. [P1] 32 `Alert.alert` call sites break the premium design language
Native OS alert boxes are used for destructive confirmations and errors across `owner/staff.tsx`, `owner/plans.tsx`, `owner/coupons.tsx`, `owner/payouts.tsx`, `owner/revenue.tsx` (refunds!), `owner/approvals.tsx`, `owner/billing.tsx`, `owner/exercise-library.tsx`, `settings/privacy.tsx`, `gyms/index.tsx`. The app already has a premium `ConfirmSheet` (`src/components/primitives/confirm-sheet.tsx`) and a toast host (`src/components/toast-host.tsx`).

**Directive:** Replace every `Alert.alert` used as *confirm* (two buttons, destructive action) with `ConfirmSheet`, and every `Alert.alert` used as *error/info notice* with `showToast`. Keep OS alerts only where the OS mandates them (permission rationale). Grep: `grep -rn "Alert.alert" apps/mobile/app apps/mobile/src`. This is ~32 mechanical swaps; do them per-screen and verify each flow on the simulator.

**Status:** confirm/error/info alerts were replaced with `ConfirmSheet`, in-app profile-photo actions, or `showToast`; remaining `Alert.alert` usage is OS-adjacent biometric/photo permission rationale only (`auth.tsx` biometric prompt, `profile-photo-control.tsx` photo picker/permission affordance, `privileged-action.ts` PIN-loading fallback, and `toast.ts` fallback when no toast host is mounted), and mobile typecheck/tests pass. Native offline-demo simulator build/install and the broad role-screen sweep are unblocked as documented in B1. Focused simulator verification on 2026-07-02 proved the custom sheet surfaces for owner approvals reject, owner plan remove, owner coupon remove, owner staff remove, owner revenue refund, owner exercise-template remove, owner trainer-payout mark-paid, owner billing cancellation, settings privacy deletion, reception order pickup, and gym-finder sign-out; screenshots are under `/tmp/zook-sim/audit-2026-07-02/b2/`. To make the billing cancellation action reachable in offline-demo QA, the demo SaaS billing fixture now returns an active subscription/mandate instead of a trial-only subscription; production behavior is unchanged. `pnpm --filter @zook/mobile typecheck` passes.

### ✅ B3. [P1] Custom exercises (uncommitted plan-detail work) are ghost data
Working-tree `apps/mobile/src/features/member/plan/plan-detail.tsx` `addCustomExercise()`: the exercise lives only in component state and is auto-marked completed on add. On refetch/app restart the exercise row vanishes, but its name persists inside the stored completed-set (`zook_plan_progress_<id>_<date>`), silently inflating nothing today but polluting storage; the member's "I added Farmer Carries" disappears. Also: auto-completing on add is surprising — the member may add first, do it later.

**Directive:** (1) Persist custom exercises under their own key `zook_plan_custom_<assignmentId>_<date>` and merge them into `exercises` state after the API load effect, so they survive reloads for the day. (2) Do **not** auto-add to `completed` — let the member tick it like any other row. (3) When completing the workout (the existing tracking POST), include custom exercises in the logged payload so they reach the backend. (4) Clean stale keys: on plan-detail mount, delete `zook_plan_progress_<id>` (old un-dated format) and any dated keys older than 7 days.

### ✅ B4. [P1] Hardcoded hex colors in feature code — the exact class that caused past light-mode invisibility bugs
Non-theme hexes live in `apps/mobile/src/features/route-surfaces/gym-username-route.tsx` (3), `entry-qr-route.tsx` (2), `member-scan-route.tsx` (working tree adds `"#050806"` as camera-card bg), `features/member/home/cards/workout-card.tsx` (1), `app/gyms/index.tsx` (1). Rule already established in this repo: on always-dark surfaces use *named* fixed-light constants from the theme, never inline hexes; never lime as text on light.

**Directive:** Add to `apps/mobile/src/lib/theme/tokens-static.ts` a `fixedSurfaces` group (e.g. `cameraWell: "#050806"`, plus names for the other hexes after reading each usage). Replace the inline hexes with those tokens. Then verify both themes on the simulator (`cmd uimode`-equivalent on iOS: Settings → Developer → Dark Appearance, or `xcrun simctl ui booted appearance dark|light`) for: gym profile, entry QR, scan, home hero.

**Status:** token replacement implemented and mobile typecheck passed. Simulator light/dark verification completed on 2026-07-02 after the native offline-demo app was unblocked: captured gym profile, entry QR, scan, and home hero in dark and light app themes under `/tmp/zook-sim/audit-2026-07-02/` (`gym-profile-dark/light.png`, `reception-entry-qr-dark/light.png`, `member-scan-dark/light.png`, `member-home-dark/light.png`). The app uses its own `zook_theme_preference`, so light-mode proof was taken after selecting Light on `/settings/appearance`, not just by changing simulator appearance.

### ✅ B5. [P1] Mega-screen files — the shop hooks-order crash came from exactly this
`gym-username-route.tsx` 2,050 lines, `shop-index-route.tsx` 1,536, `member-scan-route.tsx` 1,196, `notifications-index-route.tsx` 823. One real production-class bug (hooks-order crash in shop) already came from early-returns inside these monoliths.

**Directive:** Split by *rendered section*, not by state: for `gym-username-route.tsx` extract `GymPlansSection`, `GymCoachesSection`, `GymJoinFooter` etc. into `src/features/member/gym/` (siblings of the already-extracted `gym-reviews.tsx`, `gallery-viewer.tsx` — follow that exact pattern: props in, callbacks out, styles co-located). Do NOT thread shared mutable state through deep prop chains — if two sections share state, keep them together. All hooks stay at the top of the route component, above any conditional return. One screen per PR, simulator-verified.

**Status:** Continued the gym profile split by extracting the presentational join-path disclosure into `src/features/member/gym/gym-join-disclosure.tsx`, the membership plans list into `src/features/member/gym/gym-plans-section.tsx`, the overview/gallery/coaches section into `src/features/member/gym/gym-overview-section.tsx`, the trainer bottom-sheet body into `src/features/member/gym/gym-trainer-sheet-content.tsx`, the branch/location selector into `src/features/member/gym/gym-branch-selector.tsx`, the top checkout/request action into `src/features/member/gym/gym-next-action-card.tsx`, the cover/header hero into `src/features/member/gym/gym-hero-card.tsx`, the profile tab switcher into `src/features/member/gym/gym-profile-tabs.tsx`, and the seeded profile media helpers into `src/features/member/gym/gym-profile-media.ts`, with props in/callbacks out and styles/helpers co-located. `gym-username-route.tsx` delegates those rendered sections without moving hooks, and dropped from 2,051 lines to 843 lines. Continued the shop route split by extracting the cart review/payment-option body into `src/features/shop/shop-cart-section.tsx`, the checkout payment-method/cart-summary body into `src/features/shop/shop-checkout-section.tsx`, the pickup code/QR/items body into `src/features/shop/shop-pickup-section.tsx`, the browse header/search/category/active-order body into `src/features/shop/shop-browse-header.tsx`, the floating mini-cart into `src/features/shop/shop-mini-cart.tsx`, the shared browser-return notice into `src/features/shop/shop-browser-return-card.tsx`, and the product grid into `src/features/shop/shop-browse-grid.tsx`; `shop-index-route.tsx` keeps hooks/navigation/checkout mutations at route level and dropped from 1,536 lines to 957 lines. Continued the scan route split by extracting the verification-progress card into `src/features/member/scan/scan-verification-card.tsx`, the manual code-entry card into `src/features/member/scan/manual-code-card.tsx`, the camera scanner/help section into `src/features/member/scan/camera-scan-section.tsx`, the blocked-camera recovery card into `src/features/member/scan/camera-blocked-card.tsx`, the retry/queued-scan warnings into `src/features/member/scan/scan-warning-cards.tsx`, and the success modal into `src/features/member/scan/check-in-moment.tsx`; `member-scan-route.tsx` keeps scanner state, camera permission orchestration, refs, and mutation logic at route level and dropped from 1,198 lines to 772 lines. Continued the notifications route split by extracting the rendered inbox row, row date formatting, and notification icon/tone helpers into `src/features/notifications/notification-row.tsx`; `notifications-index-route.tsx` keeps list grouping, read-state mutations, routing, and detail-sheet orchestration at route level and dropped from 823 lines to 624 lines. Mobile typecheck, lint, and tests pass. Native offline-demo simulator verification completed on 2026-07-02 for the split screens: gym profile, shop, scan, and notifications screenshots were captured under `/tmp/zook-sim/audit-2026-07-02/`.

### ✅ B6. [P1] Owner "More" still has second-class web handoffs
`apps/mobile/app/owner/more.tsx:99-102,258` — Branches, Reports, and Notification templates still bounce the owner to the web dashboard mid-flow.

**Directive:** Per the established product split (owner heavy-admin on web is acceptable): keep **Branches** and **Notification templates** as handoffs but restyle `WebHandoffRow` to set expectation (add an explicit "Opens in browser" caption + external-link icon if not already present). Build **Reports** natively as a read-only summary screen: `GET /orgs/:id/reports` endpoints exist (`apps/web/src/server/api-router/reports.ts`) — add `app/owner/reports.tsx` with the monthly revenue/attendance/member-growth cards reusing `dashboard-charts.tsx` from `src/features/owner/components/`, keep CSV export on web. Register `href: null` in `app/owner/_layout.tsx` and move the row from `webRows` to `nativeRowGroups` — the same pattern used for plans/coupons/staff (see `zook-saas-feature-completion` memory).

**Status:** Branches/notification templates now say "Opens in browser"; Reports moved to a native `/owner/reports` screen, registered as a hidden owner route, and reuses `OwnerDashboardCharts` with summary cards plus web CSV handoff. Verified the JSON reports summary endpoint exists at `GET /orgs/:id/reports/summary` via `organization-overview.ts` and existing acceptance coverage, then switched the native reports screen to `useOwnerReportsSummary()` so it calls that endpoint instead of `/dashboard`; demo mode now serves the same payload for `/reports/summary`. Mobile typecheck, lint, tests, and web typecheck pass.

### ✅ B7. [P1] Accessibility coverage is partial
261 `<Pressable>` instances vs 311 `accessibilityLabel`s total (many of those on non-Pressables). Screen-reader users will hit unlabeled tap targets, and store review (esp. iOS) increasingly checks this.

**Directive:** Add `eslint-plugin-react-native-a11y` to `packages/config/eslint` with `has-accessibility-props` on `Pressable`/`TouchableOpacity` as **warn**, run `pnpm lint`, and fix every warning in `apps/mobile/app` + `src/features` + `src/components` (label = the visible text or an i18n key; icon-only buttons get explicit labels). Promote the rule to error once clean.

**Status:** added `eslint-plugin-react-native-a11y`; kept the requested `has-accessibility-props` rule as warn and added/promoted `has-valid-accessibility-descriptors` to error because this plugin's `has-accessibility-props` rule checks deprecated prop combinations, not missing labels. Fixed all resulting mobile a11y findings and `pnpm lint`, direct mobile lint, mobile typecheck, and mobile tests pass.

### ✅ B8. [P2] Demo/QA routes ship in the production bundle
`apps/mobile/app/__demo-fresh.tsx`, `__demo-role.tsx`, `__qa-open.tsx`, `__qa-reset.tsx`, `__qa-role.tsx`, `qa.tsx` are expo-router routes. Even if handlers are runtime-mode-gated, they're deep-linkable surface area in release builds.

**Directive:** Verify each file already renders null/redirects when `runtime-mode.ts` says production; regardless, exclude them from release: wrap each export in a guard component that checks `isOfflineDemoEnabled()` (`src/lib/runtime-mode.ts`) and `<Redirect href="/" />` otherwise, and add a unit test in `src/lib/runtime-mode.test.ts` asserting the guard denies in production mode.

### ✅ B9. [P2] `demo-api.ts` is a 3,856-line if-chain; `i18n.tsx` is 8,420 lines
Both are the two known hotspots every feature touches. The demo API's module-level state and path-matching if-chain is fragile (a mis-ordered match silently shadows a later handler), and the i18n file makes every key addition a merge-conflict magnet.

**Directive:** (1) Split `demo-api.ts` by domain into `src/lib/demo/handlers/{member,owner,trainer,reception,shop,classes,...}.ts`, each exporting `(path, method, body) => Response | undefined`, dispatched in order from a thin `demo-api.ts`; keep the module-level fixture stores in `src/lib/demo/state.ts` so statefulness is preserved. Pure mechanical move; run the existing api tests + a role sweep on the simulator. (2) Split `i18n.tsx` into `src/lib/i18n/{en,hi}/{member,owner,trainer,reception,common}.ts` merged at module load — keep the typed `TranslationKey` union by generating it from the merged `en` object (`typeof` composition), zero runtime behavior change.

**Status:** Continued the demo split by moving fresh-gym demo state into `src/lib/demo/state.ts`, the fresh-gym empty-response path handler into `src/lib/demo/handlers/fresh-gym.ts`, the offline auth/OTP handler into `src/lib/demo/handlers/auth.ts`, the account/profile/contact-preferences/profile-photo handler into `src/lib/demo/handlers/account.ts`, the support/upload handler into `src/lib/demo/handlers/support.ts`, the AI demo handler into `src/lib/demo/handlers/ai.ts`, the rewards/referral wallet handler into `src/lib/demo/handlers/rewards.ts`, the member home/dashboard/coaching handler into `src/lib/demo/handlers/member-overview.ts`, the member badges/engagement handler into `src/lib/demo/handlers/engagement.ts`, the member memberships/invoices handler into `src/lib/demo/handlers/member-memberships.ts`, the member attendance/QR handler into `src/lib/demo/handlers/attendance.ts`, the member notifications/privacy handler into `src/lib/demo/handlers/member-notifications.ts`, the member/trainer tracking/goals/body-progress handler into `src/lib/demo/handlers/tracking.ts`, the public gym discovery/profile handler into `src/lib/demo/handlers/public-orgs.ts`, the referral codes/policy handler into `src/lib/demo/handlers/referrals.ts`, the gym reviews handler into `src/lib/demo/handlers/reviews.ts`, the owner membership-plan/staff/coupon/setup handler into `src/lib/demo/handlers/owner-admin.ts`, the owner dashboard/SaaS billing handler into `src/lib/demo/handlers/owner-dashboard.ts`, the member directory/reception verification handler into `src/lib/demo/handlers/members-reception.ts`, the join-request/notifications/push/membership pause-resume/attendance moderation operations handler into `src/lib/demo/handlers/operations.ts`, the member/trainer diet handler into `src/lib/demo/handlers/diet.ts`, the exercise-template handler into `src/lib/demo/handlers/exercise-templates.ts`, the member/trainer class scheduling/enrollment/roster handler into `src/lib/demo/handlers/classes.ts`, the personal-training/trainer-payouts/clients handler into `src/lib/demo/handlers/personal-training.ts`, the shop/orders/payments/invoice helper handler into `src/lib/demo/handlers/shop-payments.ts`, and the member/trainer workout-plan handler into `src/lib/demo/handlers/plans.ts`, with `demo-api.ts` retaining compatibility exports and dispatching to the extracted handlers. `demo-api.ts` is down to 261 lines. Split `i18n.tsx` into `src/lib/i18n/{en,hi}/{common,member,owner,trainer,reception}.ts` plus locale `index.ts` merge files, changed `TranslationKey` to derive from the merged English object, and updated `scripts/audit-i18n.ts` to audit the split catalogs directly. `i18n.tsx` is down to 166 lines. Mobile typecheck, `pnpm check:i18n`, lint, and tests pass. Attempted the existing iOS role sweep flow (`01-login-otp.yaml`), but the required `pnpm seed:pilot` step cannot reach Postgres on `localhost:5432`, no process is listening on 5432, and Docker is not running. Native offline-demo role sweep completed on 2026-07-02 using the accepted `zook://__demo-role` route and screenshots under `/tmp/zook-sim/audit-2026-07-02/`, covering member, owner, trainer, and reception flows backed by the split demo handlers and i18n catalogs.

### ✅ B10. [P2] Residual i18n hardcoded-string risk
The audit script validates that used keys exist in both dictionaries (passes, 2,668 keys) — it does **not** detect hardcoded English strings that never became keys. 97 of 224 tsx files call `useT()`; the remainder are mostly re-exports/primitives, but not all.

**Directive:** Extend `scripts/audit-i18n.ts` with a JSX-literal detector: flag string literals >2 words inside JSX text/`title=`/`label=`/`placeholder=` props under `apps/mobile/app` and `src/features`, with an allowlist file for intentional literals (brand names, units, testIDs). Fix what it finds screen-by-screen (add keys to both `en` and `hi`, modern Hindi register per the existing dictionary style).

**Status:** `scripts/audit-i18n.ts` now detects hardcoded JSX text and `title`/`label`/`placeholder` literals under mobile app/features with `scripts/audit-i18n-allowlist.json`; converted the diet-history CTA to i18n and allowlisted the intentional example email placeholder. `pnpm check:i18n`, `pnpm lint`, mobile typecheck, and mobile tests pass.

---

## C. Web app — UI/UX faults

### ✅ C1. [P1] The platform admin console is driven by `window.prompt` — 20+ instances
`apps/web/src/components/platform-operations-panel.tsx` (2,921 lines): money credit adjustments (line 510), plan-tier changes (521), gym rename (527-529), **ownership transfer** (541), **CSV member import via a prompt textbox** (552), broadcast composition (677-684), and every "Reason" field are `window.prompt`/`window.confirm`. This is the single largest premium-SaaS violation in the product: no validation, no preview, un-styled, breaks in some browser contexts, and irreversible actions (owner transfer, credit adjust) ride on a one-line prompt.

**Directive:** Build a small `ActionModal` system in `apps/web/src/components/ui/` (the repo already has `use-modal-focus-trap.ts` and `radio-card-group.tsx` to compose with): a generic `<FormDialog fields={...} onSubmit danger>` supporting text/number/select/textarea/file. Replace every `window.prompt`/`confirm` in `platform-operations-panel.tsx` with it; for CSV import use a real file input + parsed preview table before commit; for owner transfer and credit adjustment require a typed confirmation string inside the dialog (the panel already has that pattern at line 74 — keep the semantics, fix the surface). While there, split the 2,921-line panel into per-section files under `src/components/platform/` mirroring the dashboard structure.

**Status:** Added reusable `ActionModal` and `FormDialog` in `apps/web/src/components/ui/` using the existing focus-trap hook, then removed all `window.prompt`-backed data entry from `platform-operations-panel.tsx`. Gym status, trial extension, credit adjustment, tier change, rename, CSV import, owner transfer, archive, broadcast creation, impersonation, refunds, and moderation decisions now use styled modal forms; credit adjustment, owner transfer, status changes, refunds, and impersonation require typed confirmations where needed. Platform member CSV import now supports file input plus parsed row-count/preview before submit. Continued the section split under `apps/web/src/components/platform/` with `PlatformImpersonationsSection`, `PlatformOpsSections` for feature flags/webhooks/audit, `PlatformBusinessOverview`, `PlatformReadinessSections` for service status/incident checklist, `PlatformAssistantSection`/`PlatformSafetySection`, `PlatformContentSections` for broadcasts/moderation, `PlatformWithdrawalsCard` for reward payouts, `PlatformReferralPolicyCard` for gym-to-gym referral policy editing, `PlatformSubscriptionsSection` for subscription/referral composition and plan tables, `PlatformOrganizationsSection` for gym account tables/details/watchlists, `PlatformSupportConsoleSection` for user/payment search plus detail panels, `PlatformHealthCockpit` for the readiness command card, and `PlatformOperationDialogs` for the remaining modal surfaces; `platform-operations-panel.tsx` is down to 1,027 lines. `rg` finds no remaining `window.prompt`/`window.confirm`/`window.alert` in the platform panel/components/UI extraction, web lint passes, and filtering the full web typecheck output shows no errors in the touched platform files. Browser-flow verification passed after Docker/Postgres were restored: `pnpm db:local:up`, `pnpm db:local:setup`, then `RUN_DB_WEB_TESTS=1 PLAYWRIGHT_RATE_LIMIT_PROVIDER=memory AI_FEATURES_ENABLED=true AI_PROVIDER=mock NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID=test-google-web.apps.googleusercontent.com GOOGLE_WEB_CLIENT_ID=test-google-web.apps.googleusercontent.com NEXT_PUBLIC_APPLE_CLIENT_ID=com.zook.app APPLE_CLIENT_ID=com.zook.app APPLE_SERVICE_ID=com.zook.web APPLE_BUNDLE_ID=com.zook.app pnpm exec playwright test apps/web/tests/platform-actions.spec.ts` passed 6/6 on 2026-07-02. The suite now includes `platform gym actions use custom dialogs instead of native prompts`, which opens the platform gym action dialogs for credit, tier, rename, CSV import, owner transfer, and suspend while asserting no browser-native `dialog` event fires.

### ✅ C2. [P1] Dashboard locale toggle exists but ~92% of dashboard components are English-only
13 of 171 `apps/web/src/components` files use translations, yet `dashboard-locale-toggle.tsx` offers Hindi. Switching locale changes almost nothing — worse than not offering it.

**Directive:** Decide explicitly: either (a) roll dashboard i18n out for the owner-facing routes in priority order (overview, members, payments, plans — the daily-work screens), adding keys to `apps/web/messages/` and converting components to `useT`/`getTranslations`, or (b) hide the locale toggle from the dashboard shell until coverage exists (keep it on public/member pages where coverage is better). Option (b) is a one-line stopgap; do it immediately and treat (a) as the follow-up epic.

### ✅ C3. [P2] Public pages advertise "iOS — coming soon / Android — coming soon" by default
`apps/web/src/lib/public-i18n.ts:149-150`; `appStoreUrl`/`playStoreUrl` default to `null` (`public-gym-read-models.ts:302-303`) unless set in settings. Store submissions exist (artifacts from 2026-05/06), so if the apps are live this copy is stale on every gym's public page.

**Directive:** Verify the store listings' live status. If live: add platform-level default store URLs (env `NEXT_PUBLIC_APP_STORE_URL` / `NEXT_PUBLIC_PLAY_STORE_URL` consumed as fallback in `public-gym-read-models.ts:447-449`) so every public gym page gets working install badges without per-gym setup. If not yet live: no change, but ticket the flip.

**Status:** verified again on 2026-07-02 that `com.zook.app` is not live (`itunes.apple.com/lookup?bundleId=com.zook.app&country=in` result count 0; Google Play package URL returned 404), so no fallback store URL change is applicable yet. The release flip remains: when App Store / Play Store listings go live, add `NEXT_PUBLIC_APP_STORE_URL` / `NEXT_PUBLIC_PLAY_STORE_URL` defaults in the public gym read model.

### ✅ C4. [P2] `apps/website` duplicates the Next.js public marketing surface
`apps/website` is a separate Vite site building HTML from template strings (`src/main.ts`), while `apps/web/app/page.tsx` + `src/components/public/home/*` is a full Next.js marketing page. Two marketing sites = drift (pricing, claims, design) and double maintenance.

**Directive:** Pick the canonical one. Recommendation: the Next.js public pages (they share tokens/components/i18n with the product). Check what `zookfit.in` root actually serves and what `vercel.json`/DNS route to `apps/website`; if `apps/website` is unused or only a landing experiment, delete the package and its turbo pipeline entries; if it IS the live landing page, schedule content parity checks or fold its sections into `apps/web/app/page.tsx` and then delete.

**Status:** verified `zookfit.in` root serves Next.js (`/_next/static`, `x-powered-by: Next.js`) and `vercel.json` builds `@zook/web`; removed unused `apps/website` and refreshed `pnpm-lock.yaml`.

---

## D. Architecture & code health

### ✅ D1. [P2] `api-router/core.ts` is a 4,819-line grab-bag
Auth session helpers, payment application (`applyPaymentSessionStatus`), coupon resolution, notification fan-out, org membership, file assets, and `pathMatches` all live in one file. Every domain module imports from it; changes have blast radius.

**Directive:** Continue the extraction pattern that already produced the other `api-router/*.ts` modules. Move, in this order (highest churn first): (1) payment-application internals (~core.ts:586-700, 2853+) → `api-router/payment-application.ts`; (2) notification helpers (`createDirectNotification` + fan-out) → `api-router/notification-helpers.ts`; (3) auth/session helpers consumed by `auth.ts` → `api-router/auth-helpers.ts`; keep `core.ts` re-exporting everything so no import site changes, then update imports opportunistically. Pure moves, no logic changes; typecheck must stay green after each step.

**Status:** payment application is already extracted in current code as `server/payment-runtime.ts`; `createDirectNotification` and platform broadcast fan-out moved to `api-router/notification-helpers.ts`; auth/session helpers plus `PrismaAuthRepo` moved to `api-router/auth-helpers.ts`; and `core.ts` keeps compatibility re-exports while direct auth surfaces import the new helper module. `core.ts` is down to 3,876 lines, and web typecheck, lint, and tests pass.

### ✅ D2. [P2] Repo hygiene — stray junk shipped in the repo
- `plans/[assignmentId]/page.tsx` + READMEs at the **repo root** — a Codex placeholder ("Expo route will live under apps/mobile/…") that was never cleaned.
- Three `.apk` files at repo root (gitignored but polluting checkouts).
- `packages/figma-icon-builder/Android ` — a directory whose name ends with a **trailing space** (breaks some tooling on other OSes; already needs quoting in `.vercelignore`).
- **127 files under `tmp/` and `scratch/` are git-tracked**, plus `artifacts/app-store-screenshots-20260612/` PNGs.
- `.codex-pet-runs/`, `build/mobile-release/` present at root.

**Directive:** `git rm -r --cached tmp scratch && rm -rf plans` (repo-root `plans/` only — NOT `apps/mobile/app/plan*`); delete the root APKs; `git mv "packages/figma-icon-builder/Android " packages/figma-icon-builder/android-exports` (update any references); move store screenshots to the untracked `artifacts/` convention and add `tmp/`, `scratch/`, `*.apk` to `.gitignore`. Keep `docs/`.

### ✅ D3. [P2] Duplicate/alias route sprawl on mobile deep links
`app/g/[username].tsx`, `app/gym/[username].tsx`, `app/gyms/[username].tsx`, `app/join/[username].tsx` all resolve to the gym profile; `app/plan/[assignmentId].tsx`, `app/plans/[assignmentId].tsx`, `app/plans.tsx` alias the plan screen. The aliases are thin redirects (correct), but there's no single map documenting which are canonical vs AASA-required.

**Directive:** Add `apps/mobile/docs/deep-links.md` listing every incoming path, its canonical target, and why the alias exists (AASA universal link, legacy QR, referral short link). Cheap now, prevents someone "cleaning up" a route the printed QR posters depend on.

---

## E. Ops & monitoring

### ✅ E1. [P1] Fail-closed rate limiter can brick the whole API on a config slip
`assertRateLimit` (`apps/web/src/server/rate-limit.ts:335-337`) throws 429 for **every** request when the provider is `misconfigured` (e.g. `RATE_LIMIT_PROVIDER=memory` left in a prod env, or Redis env vars missing). Fail-closed is the right security default, but today nothing surfaces it before users do.

**Directive:** `getRateLimitDiagnostics()` is already exported — wire it into the readiness endpoint (`apps/web/src/server/readiness.ts`) as a hard failure (`status: misconfigured` → readiness 503) so deploys with bad rate-limit config never pass health checks. Confirm the deploy pipeline actually gates on `/api/health-readiness`.

### ✅ E2. [P2] Silently swallowed storage-delete failure
`apps/web/src/server/api-router/files.ts:262` — `storageProvider.deleteFile(...).catch(() => undefined)` leaks orphaned objects in storage with no trace.

**Directive:** Keep the non-fatal behavior but log through the existing `error-reporter.ts` (`reportError(error, { context: "file-delete-orphan", key })`) instead of discarding, so orphans are countable in Sentry.

---

## F. Verified-good (do not churn)
For Codex's calibration — these were checked and are sound; don't "fix" them:
- Razorpay webhook: raw-body signature verification, event dedup by `providerEventId`, attempt persistence (`payment-sessions.ts:205+`).
- Manual membership activation: serializable transaction + compare-and-swap so concurrent desk entries can't double-activate (`manual-payments.ts:300-329`).
- Payment session reads: ownership asserted (`assertCanReadPaymentSession`) after unscoped fetch — not a tenant leak.
- Rate-limit rule coverage is broad and sensible (OTP, refunds, notifications, joins, QR scans...).
- Attendance day-keying is branch-timezone-aware (`packages/core/src/services/attendance-service.ts:111`).
- Money stored as integer paise everywhere in the schema; `Decimal` only for geo/body metrics.
- Route matching (`pathMatches`) is exact-length — the `manual-payments/general` ordering is not a shadowing bug.
- Mobile: past open items now closed — `tracking-history` has back affordance, `profile/edit`·`membership/buy` aliases are clean redirects, prior web-tsc errors fixed, Hindi key coverage 100%.

---

## Suggested execution order
1. **A3** (oversell) → **A1/A2** (timezone) → **A5** (cron guard) — small, high-stakes backend fixes.
2. **A6** — prod redeploy + verification (unblocks everything already built).
3. **C1** (platform prompt console) + **B2** (Alert.alert sweep) — the two loudest premium-UX violations.
4. **B1** (header unification), **B4** (hex tokens), **B3** (custom exercises) — mobile polish wave, simulator-verified.
5. **C2** (locale-toggle stopgap), **B6** (native Reports), **B7** (a11y lint).
6. **D2** (repo hygiene), **A7/A8**, **E1/E2**, then the structural splits **B5/B9/D1** as rolling debt work.
