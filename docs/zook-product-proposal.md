# Zook — Product Audit & Production Proposal

_Repo alignment note, 2026-05-07: this proposal was restored from `.claude/worktrees/eager-brahmagupta-aed045/docs/zook-product-proposal.md` because it was absent from `docs/` in the main worktree at implementation start. The implementation keeps demo strings in tests, fixtures, and guarded seed paths, and records remaining human provider-certification work in `docs/launch-runbook.md`._

_A whole-product review across mobile, web dashboard, public surfaces, and platform admin. Synthesises 170+ concrete findings from a UX/UI audit (mobile + web) and a production-readiness audit, and proposes a phased plan to ship._

---

## 0. Executive verdict

**Are we good for production? Not yet — but we are close.** The backend, RBAC, multi-tenancy, env preflight, and core domain tests are genuinely strong. What blocks launch is a small set of **provider certifications**, a **demo-data hangover** that leaks into the UI, and a **UX layer that is functionally complete but visually overloaded** — every screen tries to show everything at once, mock copy is still rendered to users, and feedback / loading states are inconsistent.

The product is roughly:

| Area | State | Confidence |
| --- | --- | --- |
| Domain logic & API | Production-ready | High |
| RBAC / multi-tenant isolation | Production-ready, tests light | Medium-high |
| Env preflight & release gates | Excellent | High |
| Mobile UX | Functional, needs hierarchy + state polish | Medium |
| Web dashboard UX | Dense, missing feedback, mock data leaking | Medium-low |
| Public / join / checkout | Works, copy and validation thin | Medium |
| Provider readiness (Razorpay live, OpenAI live, S3/R2, Expo push, Sentry) | **Blockers** | Low |
| Observability beyond request IDs | Scaffolded | Low |

**Recommendation:** ship to a **closed pilot of 3–5 gyms** in 2 weeks, public launch in 4–6 weeks behind the plan in §10.

---

## 1. North-star UX principles (apply across every surface)

These are the lenses every later section is judged against.

1. **One headline per screen.** Above the fold = exactly one number, one status, one primary action. Everything else is a level down.
2. **Progressive disclosure.** If it isn't needed in the first decision, it lives behind a tap, an accordion, or a "View all" link.
3. **Every async action ends in feedback.** Toast, haptic, optimistic UI, or an inline state — never silence.
4. **Every async load has a skeleton that matches the final shape.** Never show generic spinners or "Loading…" text on top-level surfaces.
5. **Empty, error, loading, and partial-data states are first-class** — treat them as designed screens, not afterthoughts.
6. **No demo strings ever reach a real user.** "Pilot Strength", "PILOT500", "ZK-7319", "Pilot Member", "Pilot Gym", "partner-gym", "pilot-owner.test" — none of these belong in a production binary.
7. **Information lives where the decision is made.** Plan price next to the join button. Renewal date next to the renew button. Pickup code on the order, not three taps deeper.
8. **Tabular numbers, fixed-width status pills, consistent corner radii.** Stop the per-screen spacing drift.
9. **India-first means localised dates, currency, phone formats, and Hindi parity** — not just translated strings.
10. **Motion is feedback, not decoration.** 150–250ms ease-out for state changes, haptic on success, no looping or attention-grabbing animations.

---

## 2. Mobile app — screen-by-screen blueprint

For each screen: **what's above the fold**, **what's one tap deeper**, **what's removed**, and **the specific issues to fix** (with file refs).

### 2.1 Member Home (`apps/mobile/app/index.tsx`)

**Above the fold (hero, single screen, no scroll required):**

- Greeting line + active gym name + small chevron to switch gym.
- **One** primary action card: contextually either *Check in* (if active membership), *Renew now* (if `renewalImminent`), or *Choose a plan* (if no subscription). Never two competing CTAs.
- Today's status strip: streak · visits this month · next class (if any). One row, tabular nums.

**One level down (scroll or tap):**

- Active plan progress (today's session, % complete).
- Recent body progress entry.
- Recent shop pickup with code (only if active).
- Trainer note (only if unread).
- "What's new" / org announcements (collapsed accordion, count only).

**Remove / fix:**

- The dual primary-action problem when the renewal sticky bar shows on top of a hero "Renew" button — pick one (`apps/mobile/app/index.tsx:308-315` vs `:376-387`).
- Replace "syncing…" fallbacks with shaped skeletons (`apps/mobile/app/index.tsx:45,92-94`).
- Make the gym switcher chevron visibly tappable (raise contrast or add a subtle pill background) (`:182-199`).
- Server-driven greeting or drop the time-of-day greeting; device clocks lie (`:37-42`).

### 2.2 Find Gyms (`apps/mobile/app/find-gyms.tsx`)

**Above the fold:**

- Search input with realistic placeholder ("Search by gym name or area").
- Location chip (auto-filled from device, tappable to change). Drop the hardcoded `["Pune", "Bengaluru", "Mumbai", "Delhi"]` list as the only choices (`:24`).
- 3 results.

**One level down:**

- More results (paginated/infinite scroll).
- Filters drawer: amenities, price band, distance, women-only, 24×7, has trainer.

**Remove / fix:**

- "Try Pilot Gym or partner-gym" placeholder must go (`:122`) — replace with `"Search by gym, area, or pin code"`.
- Multi-select cities (`:130-146`) — single-select today contradicts "Browse gyms".
- "+N more amenities" overflow indicator on cards (`:211-218`).
- Show applied referral discount as a pill on each card, not just a top banner (`:104-114`).
- Truncated gym names need ellipsis + accessible full name (`:199-200`).

### 2.3 Gym Detail (`apps/mobile/app/gym/[username].tsx`)

**Above the fold:**

- Cover photo + gym name + city + rating-or-distance.
- Single primary CTA: *Join* (or *Renew* if returning), with the **effective price after referral/coupon already computed and shown**. Don't make the user open checkout to learn the discount.

**One level down:**

- Plans (cards, with badges: "Popular", "Best value", "X spots left").
- Amenities (chips).
- Trainers (tappable rows → trainer profile sheet).
- Hours (collapsed; tap to expand all days + holiday closures).
- Address + map.

**Remove / fix:**

- Cache the post-checkout status message in React Query, not local state, so it survives refresh (`:46-47`).
- Guard the AppState listener against stale callbacks during navigation (`:70-88`).
- Add enrolment / "already a member" badges on plan cards.

### 2.4 Scan QR (`apps/mobile/app/scan.tsx`)

**Above the fold:**

- Full-screen camera. Single instruction line. One toggle: *Scan / Enter code*.

**Result sheet (after scan):**

- Big status icon (✓ / ✗ / ⏳).
- Branch name + entry code.
- Visit consumption summary ("X of Y visits remaining").
- One action: *Done*. If `duplicate`, offer *View today's check-in*.

**Remove / fix:**

- Camera permission denial must show a real screen with "Open Settings" CTA (`:104-108`).
- Manual code input needs format hint, max length, and live validation (`:18`, `:92-94`).
- Bottom sheet needs a visible drag handle (`:101`).
- Move scan-result params from URL query to navigation state — they leak in deep links (`:59-71`).
- Stop coupling the push-permission prompt to the post-scan moment without a benefit line ("Get notified the moment your check-in is approved.") (`:96-102`).
- Haptic on success is good — add a 250ms scale-up on the status icon for visual confirmation.

### 2.5 Plans (`apps/mobile/app/plans.tsx`)

**Above the fold:**

- Active plan card: name, today's task, progress ring with `% complete` label (not just the number).

**One level down:**

- Filter pills (Workout / Diet / Habits) — **drop Habits if it's not implemented** (`:46`, `:77-79`); don't ship dead filters.
- Past plans (collapsed list).

**Remove / fix:**

- Per-kind icons + colour accents so workout vs diet are scannable (`:131`).
- Empty filtered state ("No diet plans assigned yet — ask your trainer").
- Skeleton must match the exercise-row shape, not a generic block.

### 2.6 Notifications (`apps/mobile/app/notifications.tsx`)

**Above the fold:**

- Section header "Today" with an unread count.
- 3–5 most recent.

**One level down:**

- "Yesterday", "This week", "Older" — collapsed sections, lazy-loaded.

**Remove / fix:**

- Visually distinguish read vs unread (left border or background tint, not just bold weight) (`:91`).
- Mark-read on tap must succeed even if navigation does (`:125-135`).
- Toast on "Mark all as read" (`:96-123`).
- Paginate "Older" — never render 500 rows in one list (`:53-79`).
- Per-type icon mapping must have a consistent fallback set, not a generic bell (`:36-42`).

### 2.7 Shop (`apps/mobile/app/shop.tsx`)

**Above the fold:**

- Category strip + search.
- 4 product cards (image, name, price, "Add").

**One level down:**

- Cart drawer (slide up).
- Pickup orders (separate tab inside Shop, not a hidden state).

**Remove / fix:**

- **`pickupQrCells()` is not a real QR — it's a hashed pseudo-pattern (`:95-107`). Replace with a proper QR library (`react-native-qrcode-svg`).** This is a launch blocker — if we ship this the receptionist can't scan pickups.
- Make the cart hydration deterministic (`:140`) and show a skeleton, not an empty state.
- Mock-payment fallback (`:150`) must never run on a release build — gate by `EXPO_PUBLIC_API_MODE`, not by checking provider name at runtime.

### 2.8 Profile (`apps/mobile/app/profile.tsx`)

**Above the fold:**

- Avatar (tap to edit) + name + active role pill.
- Membership card with renewal date + "Renew" CTA inline.

**One level down:**

- Other roles in other gyms (tap to switch — make this a labelled section, not a buried list (`:127-141`)).
- Settings (notifications, language, privacy, export data, delete account, sign out) — single grouped list.

**Remove / fix:**

- Make role switcher visually obvious — a segmented control, not a list of links.
- Per-section refresh; full-page invalidation across 5 queries is heavy (`:22-27`).
- Add language toggle (en/hi). Today the i18n strings exist (`apps/mobile/src/lib/i18n.tsx`) but no UI exposes the switch.

### 2.9 Tracking (`apps/mobile/app/tracking.tsx`)

**Above the fold:**

- This week ring (X of N target) + current streak.
- Quick log button.

**One level down:**

- History (paginated).
- Body progress timeline (paginated; `bodyProgressEntries` is currently unbounded — `:81`).

**Remove / fix:**

- Weekly goal must be configurable per user (today hardcoded `5` at `:83`).
- Streak rule needs a tooltip ("Consecutive days with at least one logged session").

### 2.10 Reception (`apps/mobile/app/reception.tsx`)

**Above the fold:**

- Single counter: "Pending approvals · N" with primary action *Open queue*.
- Today's revenue (if Cash/UPI mode is enabled).

**One level down:**

- Full approval queue (oldest first, prioritised).
- Quick actions: record cash payment, fulfil pickup order.

**Remove / fix:**

- Reason suggestions on decision must be tap-to-fill chips, not a guessing game (`:74-78`).
- Phone-reveal toggle must persist (today resets on navigation — `:121`).
- Visual confirmation after approval (toast + the row animating out).

### 2.11 Trainer (`apps/mobile/app/trainer.tsx`)

**Above the fold:**

- Today's clients (3, with next-session time).
- Pending plan drafts to review (count + tap to open).

**One level down:**

- All clients (searchable).
- Plan templates.
- AI draft history.

### 2.12 Owner (`apps/mobile/app/owner.tsx`)

**Above the fold:**

- "Needs attention" — single number, broken down by category as a row of tappable counters (joins · scans · low stock · failed payments) instead of plain-text subtitle (`:48`).
- Today: revenue, check-ins, new joins.

**One level down:**

- Revenue chart (last 7 / 30 / 90).
- Stock alerts.
- Staff activity.

### 2.13 Cross-mobile fixes

| Fix | Why |
| --- | --- |
| Centralise spacing in `theme.ts` and ban literal `padding: 10/12/14` across screens. | Audit found drift (`index.tsx:490`, `:703`, `find-gyms.tsx:306`). |
| Standardise touch targets at 44×44 minimum. | Some `IconButton`s are smaller; accessibility risk. |
| Adopt one toast library and require a toast for every mutation outcome. Today only ~14 `showToast` calls exist across the entire mobile app. | Silent mutations are the most-cited UX failure. |
| Haptics map: success = `Light`, error = `Error`, warning = `Warning`. Apply on every mutation. | Currently only the scanner uses haptics. |
| Skeleton library matched to component shapes (cards, rows, hero, list). | "Loading..." text and generic spinners must disappear. |
| Bottom-nav height must respect safe-area insets, not the fixed 72 px constant (`index.tsx:474`). | Notch / home-indicator overlap on newer devices. |
| Remove every deferred implementation marker before launch (`find-gyms.tsx:149`, `scan.tsx:306`, `login.tsx:309`). | Each marks a feature shown but unimplemented. |

---

## 3. Web dashboard — screen-by-screen blueprint

### 3.1 `/dashboard` (Owner / Admin command board)

**Above the fold (single 1080p viewport, no scroll):**

- Page title + date + small org-status pill.
- 4 metric cards in one row (active members · today's check-ins · today's revenue · pending approvals). Each card: number, *clear* delta ("+12 vs last week"), one click-through.
- Setup checklist **only if incomplete**, with "2 of 4 complete" progress (`owner-setup-checklist.tsx`). Once 100%, hide it permanently.

**Below the fold:**

- Today's command board: pending joins (top 5, "View all"), failed payments, low stock — collapsible cards.
- Week chart.

**Remove / fix:**

- "Active Members" delta currently shows the gym name, not a delta (`dashboard-overview.tsx:73`).
- Workflow cards must render as clickable cards with hover state, not plain text (`:37-62`).
- Trial-end urgency — promote to a top banner if < 7 days, not buried in sidebar.
- Add breadcrumbs (today every subpage drops them).
- Defer-load secondary sections; today everything fetches in parallel and waterfalls (`dashboard-shell.tsx:86-164`).

### 3.2 `/dashboard/members`

**Above the fold:**

- Search + filter bar (status, plan, joined date) — today there is no search at all (`members-section.tsx:144-235`).
- Table with sortable columns (name, plan, joined, last visit, status).
- Bulk-action bar appears only when rows are selected.

**Detail panel (right drawer):**

- Member card · plan · subscription · attendance summary · body progress timeline (scrollable, `:76-132` currently truncates).
- Inline-edit primary fields (phone, email, goal) without leaving the page.

**Remove / fix:**

- Pagination on join requests (`:256-306`); show top 5, link to full view.
- Plan name fallback "Membership request" must show `[Plan deleted]` when ID doesn't resolve (`:269`).
- Status pill colour mapping must be exhaustive in `toneFromStatus()`.

### 3.3 `/dashboard/attendance`

- Today's check-ins as a live-updating list (entry method column: QR · Manual · Desk-approved).
- Pending approvals queue (oldest first).
- Per-row action: approve, reject, ask for ID — every action gets a toast and an audit-log line.

### 3.4 `/dashboard/plans`

- Plan cards with explicit "Popular" / "Best value" badges (today no visual hierarchy).
- Header column "Validity & Visits" instead of "Shape" (`members-section.tsx:341`).
- Currency code shown next to price (`₹999 INR`) so multi-region future is teed up.

### 3.5 `/dashboard/shop`

- Stock cards with progress bar ("3 of 50 sold"), low-stock pill if below threshold.
- Inline help on `lowStockThreshold`: "Alert when stock drops below this number" (`shop-section.tsx:81-88`).
- Delete confirms with item name + dependent-orders count.

### 3.6 `/dashboard/notifications`

- Composer with character counter ("42 / 160 — SMS limit").
- Recipient filters: active members only, joined within last N days, plan = X, branch = Y.
- "Test send to 5 random recipients" button before broadcasting.

### 3.7 `/dashboard/reports`

- Date-range picker (default last 30 days).
- Export menu: CSV / PDF / email me weekly.
- All charts must have an empty state with a "Last refreshed" timestamp.

### 3.8 `/dashboard/audit`

- Filter bar: actor · action type · date range · resource.
- Server-side pagination ("Showing 1–50 of 2 340").
- Click a row → side-by-side before/after diff.

### 3.9 `/dashboard/settings`

- Org profile, branches, billing, integrations, privacy, danger zone.
- **Unsaved changes** guard on every form (today missing entirely).
- Image upload via drag-drop, not a "paste a URL" textarea (`gym-profile-setup-panel.tsx:439-452`).
- Inline validation (GSTIN length, phone format, email) with red borders + helper text.

### 3.10 `/platform` (platform admin)

- Cap metric grid at 3 or 4 columns; today 5 in `xl` makes cards illegible (`platform/page.tsx:136-155`).
- Safety queue sorted by severity by default; "View org" deep link from each flag row.
- Suspension flow: reason + duration + unsuspend button, with confirmation dialog.

### 3.11 Cross-web fixes

| Fix | Why |
| --- | --- |
| Adopt **one** toast library (e.g. `sonner`) and require toast/optimistic update on every mutation. | Web has *zero* toast feedback today. |
| Build a real `<Button />` with variants `primary / secondary / ghost / danger / loading`. | Today button styles drift between routes. |
| Skeletons that match table-row, card, and metric shapes; ban "Loading…" text. | Every `/dashboard/*` page has at least one. |
| WCAG AA: raise text/background opacity in `glass-card.tsx:40-46` to ≥4.5:1. | Several pills sit at ~3.8:1 — fails AA. |
| `aria-current="page"` on active sidebar link, `aria-label` on status pills, visible focus rings everywhere. | Keyboard / screen-reader gaps. |
| Tables must show a horizontal-scroll affordance (gradient or arrow) when content overflows on tablet (`dashboard-primitives.tsx:255-315`). | Today scrolls silently. |
| Tighten CSP — drop `unsafe-eval`, replace `unsafe-inline` with nonces (`apps/web/next.config.ts:9`). | XSS hardening. |

---

## 4. Public surfaces, login, checkout

### 4.1 `/login`

- Single field, then OTP. Format hint inline: *"you@example.com or +91 98765 43210"*.
- OTP auto-submits at 6 digits — show *"Verifying…"* state immediately, lock the input.
- Resend cooldown as a shrinking progress bar with countdown ("Resend in 0:27").
- Drop the role pills as decoration; if shown, make them functional (a real role picker after OTP, only listing roles the user actually has).

### 4.2 `/g/[slug]` (public gym page)

- Hero (cover, name, location, primary CTA *Join now*).
- Plans: show 4 by default, "View all 7 plans" link (today hard-cuts at 6 — `g/[username]/page.tsx:121`).
- Amenities labelled "Amenities & Facilities" (today silently merges two arrays — `:130`).
- Trainers as cards → click opens a sheet with bio + PT rate.
- Hours: today summary, "View all hours" expands to weekly + holidays.

### 4.3 `/join/[slug]`

- Visible discount breakdown table:

  ```
  Plan price          ₹2 999
  Referral (PILOT500) –₹500
  Coupon (WELCOME)    –₹200
  ─────────────────────────
  You pay             ₹2 299
  ```

  Today only the final amount is shown (`join/[username]/page.tsx:109-114`).
- Coupon code input echoes back the normalised uppercase value: *"Code: WELCOME applied — ₹200 off"*.
- Payment method shown explicitly even if only Razorpay is wired today.

### 4.4 `/checkout/*`

- Mock checkout: dismissible **"TEST MODE — no real payment"** banner; the route should not be reachable from a release build at all.
- Real checkout: skeleton matching the Razorpay handoff card; clear *"Redirecting to Razorpay…"* state.

---

## 5. The mock-data hangover (eliminate before pilot)

Everything below currently renders to a real user somewhere in the binary. **Each must be replaced with either a per-org real value, a localised placeholder, or removed.**

| Mock | Where | Replace with |
| --- | --- | --- |
| `Pilot Strength`, `Aarogya Koregaon Park` | `apps/web/src/lib/data.ts:61-72`, `public-gym-read-models.ts:170-241` | Real org name from `Organization.name`; placeholder `[Your gym name]` only in setup |
| `PILOT500`, `PILOTFIT` | README demo paths, fixtures | Real referral codes per org (already supported); strip from production seed |
| `ZK-7319` | Demo entry code | Real `entryCode` from `AttendanceRecord` |
| `Pilot Member`, `Rohan` | Trainer/member names in fixtures | Strip from production seed; only available behind `SEED_DEMO_USERS_ENABLED=true` (already gated, but seed itself should refuse if `APP_ENV=production`) |
| `Pilot Gym`, `partner-gym` placeholder text | `apps/mobile/app/find-gyms.tsx:122` | `"Search by gym, area, or pin code"` |
| `Pune, Bengaluru, Mumbai, Delhi` hardcoded chip list | `find-gyms.tsx:24` | Device-location chip + recent searches; full list behind a sheet |
| `pilot-owner.test` shown in dashboard sidebar | `dashboard-sidebar.tsx` | Owner's real email or hide entirely |
| `Recovery Drink`, `Training Bottle` demo products | Mobile shop demo path | Real per-org products from `/api/orgs/:orgId/shop/products` |
| Mock-payment fallback in mobile | `apps/mobile/app/shop.tsx:150` | Block at build time when `EXPO_PUBLIC_API_MODE=backend` |
| `pickupQrCells()` fake QR | `apps/mobile/app/shop.tsx:95-107` | Real `react-native-qrcode-svg` rendering of the real pickup token |
| Mobile greeting from device clock | `apps/mobile/app/index.tsx:37-42` | Server-provided greeting or drop |
| Hardcoded weekly workout goal `5` | `apps/mobile/app/tracking.tsx:83` | Per-user setting on profile |

**Production seed safety (blocker).** `packages/db/prisma/seed.ts` currently has no `APP_ENV` guard. Add one — refuse to run if `APP_ENV=production`. Today the only safety is the release-env preflight, which a sloppy `pnpm db:seed` could bypass.

---

## 6. Feedback, motion, and micro-interactions

A unified spec — apply across both apps.

### 6.1 Loading states

| Surface | Treatment |
| --- | --- |
| Hero card / metric card | Shape-matched skeleton with shimmer; never spinners. |
| Lists / tables | 3–5 row skeletons; preserve column widths so the table doesn't reflow when data lands. |
| Buttons | `idle → loading (spinner + label change) → success (✓ + tick animation 250ms) → idle`. |
| Form fields on async validate | Right-aligned inline spinner inside the input. |
| Page-level (rare, post-login) | Logo + animated dot row; never blank screen. |

### 6.2 Success / error feedback

- **Mutations always emit a toast** (success: `default` tone, error: `danger`).
- **Optimistic UI** for: mark-read, approve/reject, add-to-cart, mark-exercise-done. Rollback with a toast if the request fails.
- **Haptics** (mobile): `Light` on approve, `Success` on payment, `Error` on rejected scan, `Warning` on duplicate scan.
- **Sound**: off by default, optional in settings.

### 6.3 Animations (timings & where)

| Where | What | Duration |
| --- | --- | --- |
| Page transitions (mobile stack) | Slide + fade | 220ms ease-out |
| Bottom sheet | Spring (medium) | iOS default |
| Approve / mark-read row | Slide-out + height collapse | 200ms |
| Number counter on metrics | Tween from previous value | 600ms ease-out |
| Streak / progress ring | Stroke-dashoffset tween | 800ms |
| Toast | Slide-in from top, auto-dismiss | 4 s default |
| Status icon on scan result | Scale 0.9 → 1.0 + opacity | 250ms |
| Skeleton shimmer | Linear gradient sweep | 1 200ms loop |

Anything more (e.g. parallax, attention-grabbing loops) is banned by default.

### 6.4 Empty states (designed, not generic)

Every list must define its empty state with: illustration, one-line headline, one-line subhead, one CTA. Examples:

- Members: *"No members yet — share your join link to get started."* CTA *Copy join link*.
- Notifications: *"You're all caught up."* No CTA.
- Plans: *"No plans assigned yet — your trainer will create one."* CTA *Message trainer*.
- Filtered list with no result: *"No matches for 'X'."* CTA *Clear filters*.

### 6.5 Errors

- Inline errors next to the field, in red, with the **expected format** spelled out. ("Phone must include +91 and 10 digits, e.g. +91 98765 43210.")
- Page-level errors offer **Retry** and a request ID for support ("Reference: req_abc123").

---

## 7. Information architecture & "what lives where"

Today, several pieces of information live in the wrong place. This is the proposed canonical home for each.

| Info | Canonical home | Surface as | Reason |
| --- | --- | --- | --- |
| Membership renewal date | Profile + Member Home | Pill near "Renew" CTA | Decision happens at the action |
| Pickup code | Shop > Orders + push notification | QR + alphanumeric fallback | Avoid burying behind 3 taps |
| Today's check-ins | `/dashboard` metric + `/dashboard/attendance` list | Number + drill-down | Snapshot vs detail |
| Pending approvals | Owner mobile + `/dashboard` + `/dashboard/members` join tab | One source of truth, 3 surfaces | Currently inconsistent counts |
| Trial end | `/dashboard` top banner if <7 days else sidebar pill | Banner = urgent, pill = ambient | Today buried |
| Plan price after discount | Plan card on `/g/[slug]`, gym detail mobile, join page breakdown | Always pre-computed | Don't make user open checkout to learn |
| Provider status | `/platform/diagnostics` | Read-only, redacted | Already correct |
| Audit log entries | `/dashboard/audit` | Filterable table + diff drawer | Compliance |
| Failed-payment alerts | `/dashboard` command board + email | Banner with retry CTA | Money on the table |
| Low-stock alerts | `/dashboard/shop` + `/dashboard` command board | Pill + banner | Two-step visibility |
| User language preference | Profile > Settings | Toggle (en/hi) | Today exists in code, not UI |

**Lists — collapsible vs expanded:**

| List | Default | Justification |
| --- | --- | --- |
| Today's check-ins | Expanded, paginated 25/page | Most-used surface |
| Pending approvals | Top 5, link to all | Above-fold focus |
| Notifications "Today" | Expanded (5) | Most relevant |
| Notifications older buckets | Collapsed | Long tail |
| Audit log | Paginated, filtered | Volume |
| Trainers on gym page | Show 6, "+N more" | Visual budget |
| Amenities chips | Show 8, "+N more" | Visual budget |
| Settings sub-sections | Each section collapsed by default on mobile, expanded on web | Mobile real estate |

---

## 8. Accessibility, i18n, and India-first parity

- **WCAG AA contrast** across both apps (web glass cards currently fail in spots).
- **Visible focus rings** on every interactive element on web.
- **Screen reader**: all icons buttons must have `accessibilityLabel` (mobile) / `aria-label` (web). Status pills must announce status text, not colour.
- **Keyboard**: full tab order through forms; OTP autofill from SMS on iOS (`textContentType="oneTimeCode"`).
- **Haptics on mobile** for success/failure/duplicate.
- **i18n**:
  - Mobile: en + hi already exist (`apps/mobile/src/lib/i18n.tsx`). Expose the toggle in Profile > Language. Add Marathi + Tamil + Bengali post-pilot.
  - Web: `next-intl` is wired but the message catalogues are English-only today. Backfill Hindi.
  - Use `Intl.DateTimeFormat('en-IN')` and `Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })` everywhere — no `toLocaleString()` without a locale.
  - Use `libphonenumber-js` for +91 formatting and validation (display: `+91 98765 43210`).
- **Currency**: keep INR-only for the pilot; abstract behind `Org.currency` so multi-currency is a config change, not a refactor.

---

## 9. Production-readiness checklist

This is the launch gate. Each item is binary: **done / not done**.

### 9.1 Blockers (must be done before any external pilot)

| # | Item | Where | Status |
| --- | --- | --- | --- |
| B1 | Razorpay live credentials, signed-webhook test under load | `packages/core/src/providers/payment.ts`, `apps/web/src/server/api-router.ts` payment webhook | ❌ |
| B2 | S3/R2 production bucket + CDN certified per `docs/security-privacy.md:102-113` | `packages/core/src/providers/storage.ts` | ❌ |
| B3 | OpenAI live keys, quota, error-path tests (401/429/500) | `packages/core/src/providers/ai.ts`, `registry.ts:593-660` | ❌ |
| B4 | Expo push verified on real iOS + Android, deep-link tap QA | `packages/core/src/providers/push.ts`, `registry.ts:811-885` | ❌ |
| B5 | Sentry SDK fully integrated (today only console-logs scaffold) | `apps/web/src/server/sentry.ts`, `error-reporter.ts` | ❌ |
| B6 | Distributed rate limit store (Upstash Redis) verified in prod env | `apps/web/src/server/rate-limit.ts:160-186` | ❌ |
| B7 | Production guard on seed script — refuse `APP_ENV=production` | `packages/db/prisma/seed.ts`, `scripts/seed-demo.ts` | ❌ |
| B8 | Replace fake QR `pickupQrCells` in mobile shop with real QR | `apps/mobile/app/shop.tsx:95-107` | ❌ |
| B9 | Strip every demo string from production binaries (table in §5) | Multiple | ❌ |
| B10 | Acceptance run on a clean staging org with no seed data | — | ❌ |

### 9.2 Important (must be done before public launch)

- I1 Multi-tenant isolation integration tests (cross-org leakage, paginated leaks, concurrent contexts).
- I2 Per-endpoint rate-limit assertion test (every sensitive endpoint calls `assertRateLimit`).
- I3 Add CSV-export rate limit (`reportExportByActor: 10 / 24 h`).
- I4 Tighten CSP — drop `unsafe-eval`, switch inline scripts to nonces (`apps/web/next.config.ts:9`).
- I5 Add Prisma indexes confirmed on `attendanceRecord(orgId, status, branchId, createdAt)`, `payment(orgId, status, createdAt)`, `memberSubscription(orgId, status)`. Run `EXPLAIN ANALYZE` on the dashboard's heaviest queries.
- I6 Audit-log every PATCH/DELETE — staff invites, permission changes, settings updates, file uploads/deletes.
- I7 Migration runbook — pre-deploy step in CI, rollback documented.
- I8 Load test (k6) — 100 concurrent users on staging; bail-out criteria documented.
- I9 Define account-deletion retention window and auto-purge job (today the system records the request but never hard-deletes — `docs/security-privacy.md:79-80`).
- I10 Web a11y pass (axe + manual screen reader on `/dashboard`, `/login`, `/g`, `/join`).
- I11 Bundle analysis on web — split heavy admin routes from public routes.
- I12 Mobile crash-free target set + tracked (Sentry/Crashlytics).

### 9.3 Nice-to-have (post-launch, scheduled)

- N1 OpenTelemetry tracing across API.
- N2 Image-upload optimization (signed URL → resize on ingress).
- N3 Hindi parity in web message catalogues.
- N4 Marathi / Tamil / Bengali in mobile.
- N5 Multi-currency abstraction (`Org.currency`).
- N6 Admin export formats (PDF, scheduled email).
- N7 Bulk actions in `/dashboard/members`.

### 9.4 Strengths to keep

- Release-env preflight (`scripts/check-release-env.ts`) is genuinely excellent — it blocks fixed OTP, mock providers, weak secrets, seeded demo users, and silent offline-demo in production. **Don't dilute this.**
- RBAC matrix test (`apps/web/tests/rbac-matrix.spec.ts`) and `requireOrgPermission` enforcement.
- Audit logging primitives (`writeAuditLog`, `redactPII`).
- Request-ID propagation.
- QR-token signing with strong-secret check.
- Minor / guardian consent gating.
- Health + readiness endpoints checking real dependencies.
- Mock-first provider abstraction means swapping to live is a config change, not a rewrite.

---

## 10. Phased rollout plan

### Phase 1 — UX & data hygiene (Week 1–2, parallelise with Phase 2)

**Goal:** the binary is shippable. Nothing demo-flavoured leaks to a real user; every action gives feedback.

- All §5 mock-data swaps completed.
- All B7, B8, B9, B10 closed.
- Toast library + skeleton library standardised (mobile + web).
- Empty / error / loading states designed for top-10 surfaces (Member Home, Find Gyms, Gym Detail, Scan, Plans, Notifications, Shop, Profile, `/dashboard`, `/dashboard/members`).
- Above-the-fold redesign per §2 and §3.
- A11y AA pass on web.

**Gate:** internal dogfood across all 4 roles for 5 days, no demo strings observed, no silent mutations.

### Phase 2 — Provider certification (Week 1–3)

**Goal:** B1–B6 closed.

- Razorpay live + webhook certified.
- S3/R2 staging certified, CDN warm.
- OpenAI live keys, error-path coverage.
- Expo push end-to-end on iOS + Android with deep-links.
- Sentry SDK shipping events + breadcrumbs (with PII redactor verified).
- Upstash Redis rate-limit store.

**Gate:** staging clean for 72 h, all health/ready endpoints green under load.

### Phase 3 — Closed pilot (Week 3–5)

**Goal:** 3–5 real gyms, real members.

- I1, I2, I3, I5, I6, I7, I8, I9 closed before pilot kick-off.
- Daily review of Sentry, audit log, and rate-limit incidents.
- Weekly retro with each pilot gym.
- I10, I11 closed mid-pilot.

**Gate:** ≥30 days, ≥1000 successful check-ins, ≥1 successful Razorpay payout cycle, no P0/P1 incidents in last 14 days.

### Phase 4 — Public launch (Week 5–6)

**Goal:** open `/g/[slug]` discovery, App Store / Play Store submissions.

- Marketing site (`apps/website`) parity check.
- App store assets, privacy policy, terms.
- Status page.
- On-call rota.
- N1 (tracing) and N2 (image pipeline) ideally landed; otherwise scheduled.

---

## 11. What success looks like

- A first-time member opens the mobile app, sees one greeting, one number, one button — taps it, scans, gets a haptic + check-mark, done. No demo strings, no "syncing…" placeholder text.
- An owner opens `/dashboard`, sees four numbers, knows in three seconds whether today is normal. Anything urgent surfaces as a banner — never as the user's job to spot.
- A receptionist opens the queue, every approve/reject animates the row out and emits a toast, the queue empties visibly.
- A trainer drafts a plan with AI, reviews, publishes — every step has a clear state, no ambiguity about what's real vs. assistant-generated.
- A platform admin sees provider health and abuse flags sorted by severity, with one-click navigation into the offending org.
- Sentry, audit log, and rate-limit dashboards are all live and watched.
- Zero strings in the production binary mention `pilot`, `nisha`, `rohan`, `partner-gym`, or `zook.local`.

---

## 12. Open questions for product / design alignment

1. **Renewal grace window** — is there one? Today the UI binarises "active" vs "expired"; a 3-day grace pill ("Expires in 2 days · renew now") would soften.
2. **Trainer-publishes-AI-plan** — does the member see a "this was AI-assisted" disclosure? Compliance / trust call.
3. **Multi-branch UI** — README §216-224 marks this as "Default-Branch-centred". Are we deferring branch switching in the dashboard to v1.1?
4. **Pickup-order expiry** — when does a pickup code expire? Should it auto-cancel and restock?
5. **Member privacy** — can a trainer see another trainer's clients' body progress? Today RBAC scopes by `trainerId`; confirm UI matches.
6. **Hindi UI parity** — pilot launch in Hindi-speaking gyms? If yes, web `next-intl` catalogue must ship before pilot.
7. **App store review readiness** — Expo build channels, signing, privacy-manifest, in-app purchases policy (Razorpay vs Apple IAP for digital goods)?

---

_End of proposal. 170+ findings synthesised; full per-screen, per-route, and per-blocker references in §2, §3, §5, §9._
