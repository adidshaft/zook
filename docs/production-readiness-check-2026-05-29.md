# Zook Launch-Week Readiness & Workflow — 2026-05-29

Author: production audit (automated gates + code-level deep dive + UI inspection)
Branch: `main`
Live production: `https://zookfit.in`, `https://app.zookfit.in`, `https://dashboard.zookfit.in`
Target: **public launch in the upcoming week.**

## Status in one line

The platform is live and the backend is genuinely solid, but **it is not yet
launch-proven**: the live money path has never been run once, the UI has real motion/polish
defects (one already fixed below), and a few product surfaces are half-shipped. This doc
divides the remaining work into owned workstreams with a day-by-day sequence.

## Decisions locked for this launch (per product direction)

- **AI** — do **not** build now. Keep the assistant/plan-AI surfaces **visible as
  "Coming Soon!"**, not hidden.
- **WhatsApp** — do **not** enable now. Keep it **visible as "Coming Soon!"** in
  notification settings (the backend fan-out is already built; it stays off).
- **Languages** — ship **English + Hindi** only. Show additional Indian languages
  (Tamil/Telugu/Kannada/Marathi/Bengali) as **visible "Coming Soon!"** options.

These three are now *intentional, signposted* states — not gaps. They move into Workstream C
as small "make it say Coming Soon, visibly" tasks, not build tasks.

## Implemented today (2026-05-30) — code changes landed

All verified with `pnpm --filter @zook/mobile typecheck`, full `pnpm lint` (+ i18n + launch
gates), and `pnpm --filter @zook/mobile test` (31 tests) — all green. No new dependencies added.

- ✅ **QR scanner laser (B1).** Replaced the broken `[-128,128]`-in-a-280px-frame travel +
  zero-duration teleport with a smooth eased ping-pong sweep derived from the real frame size,
  with soft fades at the turn-arounds. `member-scan-route.tsx`.
- ✅ **Type floor raised (A2).** `body`/`bodyStrong` 13.5→**15px**, `small` 12→**13px**,
  `caption` 11.5→**12.5px**, line-heights bumped to match. App-wide via `tokens-static.ts`.
  Single highest-ROI readability lift for the Indian market.
- ✅ **Onboarding role copy (P2).** Removed the leaked dev language. Trainer/front-desk now read
  *"Your gym adds you — sign in once they send an invite"* (accurate: staff are invited by the
  owner); owner reads *"Set up your gym on the web dashboard."* `onboarding-step-route.tsx`.
- ✅ **Pure-black token cleanup.** The one *mismatched* hardcoded `#000000` pill background in
  `you.tsx` now uses the `palette.bg.app` token (same value, no drift). (Note: dark `bg.app`
  is intentionally `#000000` — an OLED-black brand choice — and was left as-is.)
- ✅ **Tab-bar backdrop perf (S2).** Extracted the 15-segment fade into a memoized
  `TabBarBackdrop`, so it no longer rebuilds on every tab switch / unread-count change. No new
  dep, no visual change. `(member)/_layout.tsx`.

### B–E pass (2026-05-30, second batch — branch `launch-coming-soon-signposting`)

- ✅ **B3 animation audit — clean.** Reviewed every animation surface (`motion.ts`, `toast-host`,
  `foundation`, `buttons`, `animated-appear`, `reanimated-lite`). The shared motion library is
  premium-grade: respects `reduce-motion` (accessibility), spring physics, ease-in-out loops,
  ping-pong reversal. The scanner was the **only** defect (it bypassed the lib with raw
  `RNAnimated`); now fixed. No further motion defects found.
- ✅ **C1 AI assistant — already correct.** The assistant route already renders a proper
  "Coming Soon!" screen (`assistant-route.tsx`); left as-is, visible and on-brand.
- ✅ **C2 WhatsApp — added.** Notification settings now shows a visible "Coming Soon!" WhatsApp
  channel row (`settings/notifications.tsx`).
- ✅ **C3 Languages — added.** Onboarding + settings language pickers now show display-only
  "Coming Soon!" chips for Tamil/Telugu/Kannada/Marathi/Bengali in native script; English + Hindi
  remain the selectable launch languages.
- ✅ **B4 tab-bar perf** — done in first batch (memoized backdrop).
- ✅ **D1 classes — shipped.** Owner web scheduling plus member mobile booking are now visible
  and backed by the existing classes API.
- ✅ **D2 multi-branch — finished for selected branch scope.** Shop stock, payments, revenue,
  classes, and mobile owner/member queries now carry selected branch context where applicable.
- ✅ **D3 staff web i18n decision — English + Hindi for launch.** Dashboard and desk layouts load
  `apps/web/messages/dashboard/{en,hi}.json` from `User.preferredLocale`; broader regional staff
  web localization remains fast-follow, matching the launch language decision.
- ⚠️ **E1 config reconcile — needs founder.** Flipping the local `.env.production.local`
  `SMS_PROVIDER` to match the deployed `msg91` requires the real MSG91 credentials (which would
  otherwise fail preflight), and the file is gitignored. Founder action; documented here.
- ✅ **E2 commit — done.** Remaining work committed on branch
  `launch-coming-soon-signposting` (the bulk was already committed to `main` as
  `b666c03 "Polish mobile launch readiness"`).

**Net: B, C, and the code-doable parts of D and E are complete. What genuinely remains is
non-code:** the live Razorpay transaction (A — you're doing it later), on-device QA + push +
low-light scan (B2/B5), store metadata (E3), the MSG91 env reconcile (E1), and UPI-first
emphasis (A4 — lives in Razorpay's hosted checkout, not our code).

### Deliberately NOT done today (with reasons)

- ⏸ **In-app checkout (P1).** Requires a new native dep (`expo-web-browser`) **and** on-device
  testing of the payment return/deep-link. Changing the most critical money flow blind, days
  before launch, is the wrong risk. Scope + device-test first.
- ⏸ **`legacy-` rename / route consolidation (S1, B6).** ~40 files of pure churn touching
  expo-router export aliases. High blast radius, zero behavior change — correct as a post-launch
  fast-follow.
- ⏸ **Full accent-token unification (A1).** The dark-mode limes already match via the token; the
  tab-bar lime is an *intentional mode-invariant brand color* (light-mode `accent.base` is dark
  green, which would break the lime scan button). A full static-vs-theme color-system merge is a
  larger refactor, not a launch-week change.
- ⏸ **Device-only work (B2/B3/B5), live money path (WS-A), store metadata (WS-E3),
  characterful font (A3), broader regional staff-web localization, and UPI-first
  (A4 — lives in Razorpay's hosted checkout config, not our RN code).** Not code-completable
  from here.

## Correction to my earlier assessment

In the first pass I called the mobile UI "polished and well-built" from reading the code.
That was wrong — testing shows it is not. Concrete proof: the QR scanner's scan-line was
janky. I verified the cause in code and **fixed it** (see WS-B1). I'm treating UI as
**not-yet-acceptable** until a real device walkthrough signs off each screen, not until the
code "looks fine."

Severity: 🔴 launch blocker · 🟠 should-fix before launch · 🟡 fast-follow ok.

---

# The divided workflow

Five workstreams. A/B/E are the launch-blocking spine; C/D can partly run in parallel.

| WS | Theme | Blocking? | Rough size |
|---|---|---|---|
| **A** | Money path proven (Razorpay live) | 🔴 yes | 0.5 day + 1 live txn |
| **B** | Device QA + UI motion/polish | 🔴 yes | 2–3 days |
| **C** | "Coming Soon" signposting (AI/WhatsApp/languages) | 🟠 | 0.5–1 day |
| **D** | Half-shipped product surfaces (classes, multi-branch) | 🟠 decide | 0.5 day decision |
| **E** | Store submission + config hygiene | 🔴 for store | 1 day |

---

## Workstream A — Prove the live money path 🔴 (owner: backend + founder)

The single highest risk. Code is correct by inspection (signature verify, idempotent
`provider_providerEventId`, quarantine of invalid events — `api-router/core.ts:10625`), but
`RAZORPAY_MODE=live` has **never been exercised end-to-end**. A wrong webhook secret or a
Razorpay dashboard URL typo would not show in any test or `/api/ready`; it would only surface
as a paying member whose membership silently never activates.

- [ ] **A1** Run one real live checkout (small amount) on a real device → confirm Razorpay
      webhook fires → confirm membership activates → refund it. Capture `ZOOK_CHECKOUT_WEBHOOK_EVIDENCE`.
- [ ] **A2** Repeat once for a **shop order** (order → pay → pickup code → fulfill).
- [ ] **A3** Verify the Razorpay dashboard webhook URL points at
      `https://zookfit.in/api/payments/webhooks/razorpay` and the secret matches the deployed env.
- [ ] **A4** Confirm a failed/cancelled payment leaves membership/order in the correct
      non-active state (no false "active").

**Exit:** one real rupee in and back out, membership + order both proven, evidence attached.

---

## Workstream B — Device QA + UI motion/polish 🔴 (owner: mobile)

The codebase is structurally clean (no fixed-`Dimensions` layouts, loading/error/empty states
mostly present), so the polish gap is in **motion, timing, and micro-interaction feel** — the
exact class of bug you hit with the scanner. These don't show up in typecheck/lint; they need a
real device.

- [x] **B1 — QR scanner laser fixed.** Root cause: the line was hardcoded to travel
      `[-128,128]` (256px) inside a **280px** frame so it never reached the edges, and the
      reset was a zero-duration jump that teleported the line from bottom back to top.
      Replaced with a smooth ping-pong sweep derived from the real frame size, with soft
      fades at the turn-arounds (`member-scan-route.tsx:95`). Mobile typecheck passes.
      *Still needs on-device confirmation in B2.*
- [ ] **B2 — Full device walkthrough, every screen, both roles-per-device.** iPhone + a
      low/mid Android (common in India). For each screen check: motion smoothness, no layout
      jump on load, safe-area spacing, tap targets, keyboard behavior, back/scroll. Sign off
      screen-by-screen — "code looks fine" does not count.
- [ ] **B3 — Audit every animation** the way the scanner was wrong: tab-bar show/hide, sheet
      transitions, skeleton→content swaps, pull-to-refresh, button press feedback. Look for
      teleports, hardcoded travel distances, and `useNativeDriver` gaps.
- [ ] **B4 — 🟡 Tab-bar backdrop perf.** `(member)/_layout.tsx:120` fakes a gradient with 15
      stacked absolute `View`s every render. Replace with one `expo-linear-gradient` (or cached
      image) — matters on low-end Android.
- [ ] **B5 — Real-device push** (iOS + Android) and **low-light QR scan** validation
      (`ZOOK_REAL_DEVICE_PUSH_EVIDENCE`, `ZOOK_QR_LOW_LIGHT_EVIDENCE`).
- [ ] **B6 — 🟡 Rename `legacy-*` live screens.** Member plan/membership/settings + many
      owner/trainer screens import `*-legacy.tsx`; these are the *active* screens, and the name
      is a deletion trap. Rename, no behavior change. (Can be fast-follow.)

**Exit:** signed-off screen-by-screen device pass on iOS + Android; scanner confirmed smooth.

---

## Workstream C — "Coming Soon" signposting 🟠 (owner: mobile + web)

Make the deferred features *intentional and visible*, not dead buttons or hidden capability.

- [ ] **C1 — AI assistant.** Keep the entry point **visible** with a clear "Coming Soon!"
      state (badge + disabled CTA + one-line "AI plans & assistant arrive soon"). Today the
      backend returns "coming soon" copy (`core.ts:4735`) and the trainer draft panel says AI is
      off — make sure the member-facing entry is visible and on-brand, not just an error string.
- [ ] **C2 — WhatsApp.** In notification settings, show a **WhatsApp channel row marked
      "Coming Soon!"** (disabled toggle). Backend fan-out already exists; do not enable the
      provider.
- [ ] **C3 — Languages.** In the language picker (`onboarding/language.tsx` + settings), keep
      English + Hindi selectable and list Tamil/Telugu/Kannada/Marathi/Bengali as **disabled
      "Coming Soon!"** rows.
- [ ] **C4** Ensure no store listing / marketing copy promises AI, WhatsApp, or languages
      beyond English + Hindi as *available now*.

**Exit:** all three read as deliberate "Coming Soon," consistent across mobile + web + store copy.

---

## Workstream D — Half-shipped surfaces: decide ship-or-hide 🟠 (owner: founder + eng)

These have backend logic but no clean front. Each needs a yes/no, not silent half-shipping.

- [x] **D1 — Group classes.** Decision: ship the minimal UI. Owner web can create/list classes
      and member mobile can browse/book branch-scoped classes.
- [x] **D2 — Multi-branch.** Decision: finish selected-branch scoping. Shop stock, payments,
      revenue, classes, and owner/member mobile reads now honor selected branch context where
      applicable.
- [x] **D3 — 🟡 Web dashboard i18n.** Decision: support English + Hindi for staff web launch.
      Dashboard and desk layouts resolve `User.preferredLocale` and load matching dashboard
      message bundles; Tamil/Telugu/Kannada/Marathi/Bengali staff-web localization remains a
      fast-follow, consistent with the launch language decision.

**Exit:** explicit ship/hide decisions recorded for classes, multi-branch, and staff-web Hindi
scope.

---

## Workstream E — Store submission + config hygiene 🔴-for-store (owner: founder)

- [ ] **E1 — Reconcile `.env.production.local` with deployed Vercel env.** The local file says
      `SMS_PROVIDER=disabled` but live runs `msg91`. Make the local file authoritative or mark
      it a template, so preflight reflects reality.
- [ ] **E2 — Commit/stash the dirty working tree** (~25 modified mobile files + deleted docs;
      not in production today). Get the mobile changes + the scanner fix reviewed and committed
      before the release cut.
- [ ] **E3 — Store metadata** (`production-launch-todos.md`): App Store age rating, Play Data
      Safety, screenshots, support phone, final refund/cancellation wording. Remove any
      guardian-consent language. Ensure screenshots don't show AI/extra-language features.
- [ ] **E4 — UPI-first checkout.** Confirm the Razorpay checkout surfaces **UPI prominently**
      (most Indian users pay by UPI) rather than defaulting to card.

---

# Suggested day-by-day for the week

- **Day 1:** A1–A4 (money path, blocking) + E1/E2 (config + commit so QA tests the real build).
- **Day 2–3:** B2/B3 device walkthrough + animation audit (the big one); fold in C1–C3 as
  screens are touched. Confirm B1 scanner on device.
- **Day 3:** D1/D2/D3 ship-or-hide/scope decisions; execute the chosen paths.
- **Day 4:** B5 real-device push + low-light QR; B4 tab-bar perf; E4 UPI check; C4 copy sweep.
- **Day 5:** E3 store metadata + screenshots; regression pass (`pnpm lint && pnpm typecheck &&
  pnpm test:unit`); final `/api/ready` check; submit.
- **Fast-follow (post-launch):** B6 rename, broader regional staff-web localization, and any
  classes/multi-branch expansion beyond the launch-selected scope.

---

# Appendix — verification evidence (all green as of this audit)

| Check | Result |
|---|---|
| `pnpm typecheck` (incl. scanner fix) | ✅ pass |
| `pnpm lint` (+ i18n + launch gates) | ✅ pass |
| `pnpm check:launch-gates` | ✅ pass |
| `pnpm test:unit` | ✅ 253 tests / 52 files |
| `APP_ENV=production pnpm release:preflight` (live DB) | ✅ pass (2 expected warnings) |
| `pnpm mobile:release:check` | ✅ pass (5 warnings — push/QR/checkout evidence + AI/WhatsApp off) |
| Live `/api/health`, `/api/ready` | ✅ `ready=true`, DB reachable, migrations applied |
| Public pages `/ /pricing /privacy /support /terms /login` | ✅ 200 |
| Unsigned Razorpay webhook | ✅ quarantined, not processed |

**Live providers:** DB ✅, Resend ✅, Razorpay ✅ **live**, Supabase ✅, Expo push ✅, Google
Maps ✅, MSG91 SMS ✅ **live**, Upstash rate-limit ✅. AI / WhatsApp = intentionally off
("Coming Soon").

**What automated gates do NOT cover** (hence WS-A/B): live real-money flow, on-device motion
smoothness, push delivery on physical devices, low-light camera scanning. These are the
launch-proving work, and they are the point of this workflow.

---

# Rigorous product test — premium-bar verdict (2026-05-30)

Method: opinionated teardown of the *actual* implemented screens, flows, copy, design tokens,
and edge states, judged against a premium-launch taste rubric (motion, materiality, color
calibration, typography, interaction states, anti-slop copy). Deferred features
(AI/WhatsApp/classes/languages) are out of scope — they stay visible "Coming Soon!".

## The verdict, plainly

**It is not yet "premium launch-level."** It is a genuinely well-built *good* product — the
architecture and state-handling are above average — but the surface it presents does not yet feel
premium. Today it reads as **"a competent, well-engineered app," not "an expensive, considered
product."** The gap is real but closable inside the launch week; none of it is structural.

**Scorecard (1–5, 5 = premium):**

| Dimension | Score | One-line |
|---|---|---|
| Architecture & state handling | **4.5** | Per-state home cards, skeletons, toasts+haptics, real empty/error/expired states. Genuinely strong. |
| Backend / money correctness | **4.5** | Idempotent, signature-verified, quarantined. (Still needs one live txn — WS-A.) |
| India-market copy & basics | **4** | ₹ everywhere, +91, "Pune, Mumbai, Bengaluru… 50+ cities". Concrete, not filler. |
| Visual identity / typography | **2.5** | Inter everywhere + small type + two different limes. Functional, not distinctive. |
| Motion / micro-interaction feel | **2.5** | The thing you felt. Scanner was broken; needs a full motion pass. |
| Money-moment experience | **2.5** | Correct, but bounces to the system browser to pay. Not premium, drop-off risk. |
| Onboarding / role clarity | **2** | Leaks dev language; 3 of 4 roles dead-end on mobile. |
| **Overall** | **~3.2 / 5** | "Premium-capable, not yet premium-delivered." |

## The experience — what's genuinely good (keep)

- **State design is premium-grade.** Member home has distinct, well-composed cards for
  no-org / no-plan / rest-day / expired / first-run / in-progress / logged
  (`features/member/home/cards/*`). Most teams ship one generic empty state; this is real care.
- **Feedback loop is right.** Mutations pair with success/error toasts + haptics + skeleton
  loaders (enforced by the launch gate). This is the connective tissue of a quality app.
- **Copy is concrete and localized** where it counts ("Scan in seconds. Track every workout.").

## The loopholes & experience breaks (fix before launch)

- 🔴 **P1 — Payment bounces to the system browser.** `renewMembership` (and shop checkout) call
  `Linking.openURL(checkoutUrl)` (`membership-legacy.tsx:325`), ejecting the user to Safari/Chrome
  to pay, then relying on a deep-link return + polling (`waitingCheckoutSessionId`). For the single
  most important moment in the product this is jarring and fragile — if the return link misses, the
  user is stranded mid-payment unsure if money left their account. **Premium fix:** keep checkout
  in-app via the Razorpay SDK or an in-app `WebBrowser` sheet with a guaranteed return. At minimum,
  harden the return/poll and add an explicit "payment status" reconciliation screen.
- 🟠 **P2 — Onboarding role-select dead-ends 3 of 4 roles with leaked copy.** Role options read
  *"Remember trainer interest for coach tools"* and *"Remember desk interest for reception tools"*
  (`onboarding-step-route.tsx:51-56`). That is internal/dev language shipped to users, and it tells
  trainers/receptionists the app will merely "remember" them. Only "member" gets a real flow; owner
  is bounced to web. **Fix:** rewrite to honest, human copy ("Trainers & front-desk staff are added
  by your gym — ask them to invite you") or hide the non-functional roles on mobile entirely.
- 🟠 **P3 — Motion is unfinished, not just the scanner.** The scanner laser was objectively broken
  (fixed in WS-B1). Treat that as a signal: every animation needs the same scrutiny (tab-bar
  show/hide, sheet transitions, skeleton→content swaps). Premium = consistent spring/eased motion,
  zero teleports. This is WS-B3.

## The subtractions (premium is what you remove)

- 🟡 **S1 — Kill the route sprawl & "legacy" naming.** `plan` vs `plans` vs `plans/[id]` all map to
  one `legacy-plan-detail`; member plan/membership/settings import `*-legacy.tsx`. Pick one route
  each, drop the `legacy-` prefix. Less surface = fewer divergence bugs and a cleaner mental model.
- 🟡 **S2 — Remove the 15-View fake gradient** behind the tab bar (`(member)/_layout.tsx:120`) →
  one `expo-linear-gradient`. Cheaper on low-end Android and simpler.
- 🟡 **S3 — Trim dead role stubs** from onboarding (see P2) rather than half-presenting them.

## The additions (small, high-leverage)

- 🟠 **A1 — Unify the accent.** Two limes ship today: `#A6E044` (tokens) and a hardcoded `#B9F455`
  (tab-bar scan button). Move every accent through one token. A premium product never lets its hero
  color drift.
- 🟠 **A2 — Raise the type floor.** Body is 13.5px, caption 11.5px. On phones this reads cramped and
  hurts older gym-owners / varied eyesight in the Indian market. Lift body to ~15px and small/caption
  to ~13px; let the screen breathe. Single highest-ROI visual change.
- 🟡 **A3 — Consider a characterful display font.** Inter across the entire app is the "safe/default"
  tell. A distinctive display face for headlines/metrics (body can stay neutral) would instantly lift
  the perceived tier. Optional, but it's the difference between "clean" and "designed".
- 🟠 **A4 — Make UPI the obvious default** in checkout (ties to P1 + WS-E4). Most Indian members pay
  by UPI; the checkout should lead with it, not cards.

## Bottom line for the founder

Ship-ready bones, not yet ship-ready skin. If you only do three things before launch:
**(1)** keep payment in-app and bulletproof the return (P1),
**(2)** raise body type to ~15px and unify the lime (A2 + A1),
**(3)** fix the onboarding role copy (P2).
Those three move the *felt* quality from "competent" to "premium" more than anything else on this
list, and all three fit in the launch week. The scanner (B1) is already done as the template for
the motion pass.
