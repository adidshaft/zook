# Zook Production Hardening Plan — 2026-05-24

Owner: Aman Pandey
Branch: main (land in main, deploy manually)
Audit basis: README, docs/launch-readiness-report.md, prisma schema, api-router/core.ts (14.9k LOC / 223 endpoints), dashboard pages, mobile routes.

## How to use this doc with Codex

Each `Phase` below is a self-contained Codex `/goal`. Phases are sequenced so earlier phases unblock later ones. Phase 0 (schema) must land first. Phases 1–4 can land in any order after Phase 0. Phases 5–10 depend on the noted prerequisites.

Codex prompt template per phase:

```
/goal Execute Phase {N} from docs/PRODUCTION_HARDENING_PLAN_2026_05_24.md.
Acceptance is the "Acceptance" subsection. Do not start later phases.
Run typecheck + lint + test:unit + test:services + relevant playwright suite.
Open a PR titled "phase-{N}: {short title}" with the checklist filled in.
```

Codex must not push to production. Open PRs against `main`, Aman reviews and merges.

---

## Section A — Trainer Payouts: how it works in real life (product/user behavior)

Today the schema has `TrainerCommission` and `TrainerPayout` but no UI and no wired flow. Here is the rollout model.

### Real-world setup (Indian gym context)

Trainers at small/medium Indian gyms typically earn in one of three ways. We will support all three with the same payout primitive:

1. **Flat monthly salary** — base pay, recorded as a fixed line per cycle. Most receptionists and beginner trainers.
2. **Percentage of PT pack sold** — e.g., trainer keeps 40% of every Personal Training subscription they sell or are assigned to. Most senior trainers.
3. **Per-session fee** — e.g., ₹200 per logged PT session attended. Hybrid trainers.

A real trainer's monthly take-home is usually `base + commission_on_PT + per_session_pool − advances/penalties`. Owner pays cash, UPI, or bank transfer outside the app on the 1st–5th of each month. Zook's job is **record, compute, and prove** — not move money.

### What the product must do (user flows)

**Owner sets up payout rules (one-time, per trainer):**
- Open `Dashboard → Staff → {trainer} → Payouts tab`
- Configure: base monthly amount (₹), PT commission % (0–100), per-session fee (₹), payment day (1–28).
- Owner can also mark a trainer as "no commission" for full-salary cases.

**Automatic accrual (no UI, runs on events):**
- When a PT subscription is activated and paid → `TrainerCommission` row created with `kind="PT_COMMISSION"`, amount = `% × PT subscription value`, status `ACCRUED`, period = current month.
- When a `PersonalTrainingSessionLog` is recorded → `TrainerCommission` row with `kind="SESSION_FEE"`, amount = per-session fee.
- On the 1st of every month, a cron creates a `TrainerPayout` draft per trainer aggregating all `ACCRUED` commissions + base amount − any advances.

**Owner reviews and confirms payout (monthly, 5 minutes):**
- `Dashboard → Payouts` lists all draft payouts for current month.
- Owner can: add an advance/penalty line, mark "paid by cash/UPI/bank with note", attach proof image.
- Confirming flips commissions from `ACCRUED` → `PAID` and creates an `AuditLog` row.

**Trainer self-view (mobile):**
- `/trainer/payouts` screen: this month's accrued total, last 3 months paid totals, breakdown by source (PT/sessions/base/adjustments).
- Build trust — most trainers today have no visibility into how their commission was calculated.

### Edge cases to handle in the flow

- **PT cancellation/refund within commission window** → commission claw-back: refund triggers a negative `TrainerCommission` row for the same trainer.
- **Trainer reassignment mid-pack** → commission split is *not* supported in v1; whichever trainer the PT subscription points to at activation time gets the commission. Owners can manually adjust via penalty/credit lines.
- **Trainer leaves mid-month** → owner marks `endedAt` on staff record; cron still drafts a final payout, owner can pay out, mark closed.

### Why this matters for Zook's positioning

This is the #1 underserved problem in Indian gym SaaS. Most owners track this in WhatsApp screenshots and a notebook. A clean "trainer ledger you can show your trainer" is a sales feature. Spec this loud in marketing.

See Phase 9 for the implementation.

---

## Section B — Referrals: how they roll out in real life (product/user behavior)

Today the schema and APIs are complete (`/orgs/:orgId/referrals`, `/r/:code`, redemption flows, policy config, analytics). What is missing is the **real-world rollout playbook** for the gym owner.

### How referrals actually convert in Indian gyms

Three personas drive 95% of referral signups:

1. **Trial member nearing end of trial month** (~25%). They invite 1–2 friends because the friend asked "what gym are you at?". Conversion lift: highest when the offer is "1 free month for both."
2. **Existing happy member at 4–6 months in** (~50%). They invite at the gym, in person. Code is shouted across the floor. Conversion happens face-to-face, not via a link. The link is a *receipt of the introduction*, not the introduction itself.
3. **High-status member (the personal trainer's own friend, doctor, local celebrity)** (~20%). They invite hand-picked people. Conversion is closer to 80%. Owners usually want a way to give them a bigger reward.

### Default product behavior we ship

**Referrer experience:**
- Every member has a referral code on `Profile → Refer a friend`.
- The screen shows: your code, copy/share button (opens system share sheet with prefilled message: "I work out at {Gym Name}. Use my code {CODE} to get ₹500 off your first month: zookfit.in/r/{CODE}"), how many you've invited, how many joined, your earned credit.
- Reward forms supported:
  - **Discount on next renewal** (default, simplest): ₹X off referrer's next renewal, ₹Y off invitee's first month.
  - **Free days extension**: invitee join extends referrer's current membership by N days. Strongest because no money moves.
  - **Cash credit** (off-platform): owner pays referrer in cash; Zook just records owed amount and a "Mark paid" button on the owner side.

**Invitee experience:**
- Lands on `zookfit.in/r/{CODE}` → redirects to `/join/{gymUsername}?ref={CODE}`.
- Plan checkout shows the discount line pre-applied.
- After successful payment, both referrer and invitee see a confirmation notification.

**Owner controls (`Dashboard → Plans → Referrals`):**
- Set referrer reward, invitee reward, max redemptions per code, total budget per month, expiry days.
- See leaderboard of top referrers (this exists in DB; we are not building a member-facing leaderboard, but the owner needs to see who their advocates are).
- One-click "pay out cash credit" with a Mark-paid + audit log.

### Anti-abuse defaults (already partially built, need polish in Phase 10)

- Referrer cannot redeem their own code (already enforced).
- A phone number can only redeem one referral code ever per org.
- Cap of N redemptions per referrer per month (default 10, owner-configurable).
- Owner notification when one code is redeemed >5 times in 24h.
- Platform-side abuse flag on suspicious patterns (already in `OrganizationAbuseFlag` model).

### Real-world owner rollout (the conversation)

When a gym goes live on Zook, the owner needs a 60-second prompt to set this up. Phase 10 adds an onboarding nudge in the Dashboard that says:
> "70% of small gyms get 30% of new members from referrals. Set up your referral policy in 60 seconds."

The CTA opens a wizard: pick a referrer reward (3 presets — "1 free week", "₹500 off renewal", "₹1000 cash"), pick an invitee reward, save. Done.

See Phase 10 for the implementation.

---

## Phase 0 — Schema migrations (lands first, one atomic migration)

### Goal
Add all new tables/columns needed by later phases in a single migration. Land before any UI phase.

### Schema changes (file: `packages/db/prisma/schema.prisma`)

1. **Remove minor gating** — keep `GuardianConsent*` tables intact for now (data preservation), but `MemberProfile` no longer hard-blocks unverified minors. The "minor" runtime gate becomes a no-op (Phase 1).

2. **Body measurements expansion** — extend `BodyProgressEntry`:
   ```
   hipCm           Decimal? @db.Decimal(6, 2)
   thighCm         Decimal? @db.Decimal(6, 2)
   neckCm          Decimal? @db.Decimal(6, 2)
   shoulderCm      Decimal? @db.Decimal(6, 2)
   forearmCm       Decimal? @db.Decimal(6, 2)
   calfCm          Decimal? @db.Decimal(6, 2)
   muscleMassKg    Decimal? @db.Decimal(6, 2)
   visceralFatRating Int?
   restingHeartRate  Int?
   recordedByUserId  String?  // trainer or member
   ```

3. **Diet plan & meal logging** — new models:
   ```
   model DietPlan {
     id, orgId, branchId, trainerId, memberId, title, calorieTarget,
     proteinG, carbsG, fatsG, status (DRAFT|PUBLISHED), createdAt, updatedAt
   }
   model DietPlanMeal {
     id, dietPlanId, name (e.g. "Breakfast"), timeOfDay, items (Json),
     calories, proteinG, carbsG, fatsG, order
   }
   model MealLog {
     id, userId, organizationId?, dietPlanId?, mealName, loggedAt,
     calories, proteinG, carbsG, fatsG, photoAssetId?, notes
   }
   ```

4. **Invoice** — new model (invoice PDF is generated on-demand, URL persisted):
   ```
   model Invoice {
     id, orgId, branchId?, memberId?, paymentId?, kind (MEMBERSHIP|SHOP|PT|SAAS|MANUAL),
     number (sequential per org per FY, e.g. ZK-2026-27/00042),
     financialYear (e.g. "2026-27"), issueDate,
     subtotalPaise, taxPaise, totalPaise, currency "INR",
     gstNumber? (gym GST), buyerName, buyerAddress?, buyerPhone?, buyerGstin?,
     lineItems (Json), pdfFileAssetId?, createdAt
   }
   ```

5. **Platform broadcast** — new model:
   ```
   model PlatformBroadcast {
     id, title, body, severity (INFO|WARN|CRITICAL),
     targetOrgIds (String[]) — empty = all orgs,
     targetRoles (Role[]) — empty = all roles,
     scheduledAt?, expiresAt?, publishedAt?, status (DRAFT|SCHEDULED|LIVE|EXPIRED),
     createdByUserId, createdAt
   }
   ```

6. **Feature flags** — new model:
   ```
   model FeatureFlag {
     key      String  @id   // e.g. "ai.assistant", "shop.pickup-qr"
     enabled  Boolean @default(false)
     description String?
     rolloutPercent Int @default(0)
     overrideOrgIds String[] @default([])
     updatedAt DateTime @updatedAt
     updatedByUserId String?
   }
   ```

7. **Impersonation audit** — new model:
   ```
   model ImpersonationSession {
     id, platformAdminUserId, targetUserId, targetOrgId?,
     reason String,            // ticket id or note, required
     startedAt, endedAt?,
     ipHash, userAgentHash,
     actionsCount Int @default(0)
   }
   ```
   Critical: every API call made during an impersonation session writes `impersonationSessionId` into `AuditLog.metadata`.

8. **Content moderation** — new model:
   ```
   model ContentModerationFlag {
     id, orgId, kind (ORG_COVER|ORG_LOGO|PRODUCT|MEMBER_PROFILE),
     fileAssetId?, targetId?, status (PENDING|APPROVED|REMOVED),
     reporterUserId?, reason?, reviewedByUserId?, reviewedAt?, createdAt
   }
   ```

9. **SaaS plan editing** — extend `SaaSSubscription`:
   ```
   tier (FREE|STARTER|GROWTH|PRO) — already may exist, verify
   trialExtendedDays Int @default(0)
   creditPaise Int @default(0)            // owner credit applied to next invoice
   noteForPlatform String?                // platform-admin-set internal note
   ```

10. **Branch scoping for shop/payments** — already mostly modelled (`Product.branchId`, `ShopOrder.branchId`, `Payment.branchId`). Add `@@index` confirmations:
    - `Product` index on `(orgId, branchId, status)` — verify exists
    - `Payment` index on `(orgId, branchId, createdAt)` — verify exists
    - `ShopOrder` index on `(orgId, branchId, status, createdAt)` — verify exists
    If `branchId` is currently nullable on these, **keep it nullable** for backward compat but treat null as default branch in the UI (Phase 7).

11. **Cross-tenant audit** — new view (not table). Codex implementation note: extend `AuditLog` queries from the platform side rather than create a separate table. Add a covering index:
    ```
    @@index([createdAt, orgId])
    ```
    on `AuditLog`.

### Migration safety
- Migration name: `20260524000000_hardening_pass_phase0`.
- All new columns are nullable / have defaults. Zero data backfill needed.
- Test on a Supabase staging clone before prod deploy.
- Production deploy command: `pnpm db:deploy` after `pnpm release:preflight` passes.

### Acceptance
- `pnpm db:migrate` runs clean on a fresh DB.
- `pnpm db:generate` regenerates the Prisma client.
- `pnpm test:services` passes.
- `pnpm typecheck` passes against the new client.

---

## Phase 1 — Remove minor/guardian gating

### Goal
Minors enroll as normal members. Strip the gate from the runtime paths but keep the data tables and existing rows intact (don't drop, just stop reading them in gates).

### Files to touch
- `apps/web/src/server/domains/*` — any guard that checks `MemberProfile.isMinor` or `GuardianConsent` status. Convert to no-op or remove.
- `apps/web/src/server/api-router/core.ts` — search for `guardian-consent` handlers; leave the endpoints returning a deprecation message for 60 days, then remove.
- `apps/web/app/guardian/`, `apps/web/app/guardian-consent/` — keep routes but render a generic redirect to home (do not 404; old emails may still link here).
- `apps/mobile/src/features/minor*` — remove gates, remove banners.
- `packages/core/src/policies/minor*` — drop the policy or make `isBlockedForMinor()` always return false.
- `docs/minors-and-consent.md` — mark deprecated with a header pointing to this plan.
- Seed data: remove `minor@zook.local` seed user (or convert to a regular member with adult DOB).

### Tests to update
- `apps/web/tests/acceptance.spec.ts` — remove or skip minor-blocked tests.
- Any vitest checking minor policy.

### Acceptance
- A 12-year-old's DOB does not block membership activation, attendance, plan assignment, or PT.
- Existing guardian consent rows remain in DB (no data loss).
- `pnpm test:web`, `pnpm test:services`, `pnpm test:acceptance` all pass.
- No UI surface still mentions "guardian consent" except the deprecated routes.

### Risk
- Privacy posture statement in App Store / Play Store says we collect minor-safe defaults. Owner must update store metadata to remove minor-specific language. Track in `docs/production-launch-todos.md`.

---

## Phase 2 — Platform support console (the big one)

### Goal
Stop needing DB access to do day-1 support. Build a real platform admin console.

### New routes (web, under `/platform`)
- `/platform/users` — search by email/phone, view user detail.
- `/platform/users/[userId]` — sessions, devices, orgs, recent payments, recent audit, danger zone (revoke sessions, force logout, start impersonation).
- `/platform/payments` — cross-tenant payment search by id, member phone, amount, date.
- `/platform/payments/[paymentId]` — full timeline (PaymentEvent + PaymentWebhookAttempt), refund button.
- `/platform/webhooks` — list `PaymentWebhookAttempt` with filters (status, provider, org). Inline "retry" and "view payload" actions.
- `/platform/audit` — global audit log across all orgs with filters (org, user, risk level, date).
- `/platform/broadcasts` — list, create, schedule, publish, expire.
- `/platform/flags` — feature flag table with toggle + rollout % + per-org override.
- `/platform/moderation` — review pending `ContentModerationFlag` rows; approve/remove.
- `/platform/orgs/[orgId]` — extend existing org detail with: rename org, extend trial, set credit, change SaaS tier, soft-delete with reason, change owner.
- `/platform/impersonations` — list active and historical impersonation sessions with the audit trail.

### New API endpoints (extend `apps/web/src/server/api-router/core.ts`)
All require `requirePlatformSession()`.

- `GET /api/platform/users?q={query}` — search by email/phone fragment, limit 25.
- `GET /api/platform/users/:userId` — full detail.
- `POST /api/platform/users/:userId/sessions/revoke` — all sessions or specific session.
- `POST /api/platform/users/:userId/impersonate` — body `{ reason, ttlMinutes }`. Creates `ImpersonationSession`, returns a short-lived session token bound to that impersonation. **Token TTL max 60 minutes, hard cap.**
- `POST /api/platform/impersonations/:id/end` — explicit end.
- `GET /api/platform/payments?q=...` — paginated search.
- `POST /api/platform/payments/:paymentId/refund` — same as org refund but does not require org context.
- `GET /api/platform/webhooks` — paginated.
- `POST /api/platform/webhooks/:attemptId/replay` — re-dispatch the persisted payload through the same handler.
- `GET /api/platform/audit` — paginated, filtered.
- `GET|POST|PATCH|DELETE /api/platform/broadcasts` — CRUD.
- `GET|PATCH /api/platform/flags` — read/toggle.
- `POST /api/platform/orgs/:orgId/trial/extend` — body `{ days, reason }`.
- `POST /api/platform/orgs/:orgId/credit` — body `{ paise, reason }`.
- `PATCH /api/platform/orgs/:orgId/tier` — body `{ tier, effectiveAt }`.
- `POST /api/platform/orgs/:orgId/rename` — body `{ name, username, reason }`.
- `POST /api/platform/orgs/:orgId/soft-delete` — body `{ reason }`. Sets status `DELETED`, schedules purge in 30d via the existing account-deletion mechanism extended to orgs.
- `POST /api/platform/orgs/:orgId/transfer-ownership` — body `{ newOwnerUserId, reason }`.
- `POST /api/platform/orgs/:orgId/bulk-import-members` — same shape as the per-org endpoint, but callable by platform admin without org membership.
- `GET|POST /api/platform/moderation` — list / decide on flags.

### Impersonation behavior (security-critical)
- Session cookie carries an `impersonatedAs` claim. Every middleware that reads session must check this claim.
- Banner across the entire app while impersonating: red bar, target user email, "End impersonation" button. Cannot be dismissed.
- All writes during impersonation get `metadata.impersonationSessionId` in the audit log entry.
- Impersonation **cannot** be used to:
  - Approve refunds (use the platform refund endpoint instead, no impersonation needed).
  - Delete account / data export / change phone / change email.
  - Modify another platform admin.
- Impersonation TTL hard cap = 60 minutes. After expiry, fall back to original session.
- Slack/email notification to the platform admin team whenever impersonation starts (env-gated; ok if not wired at launch — log to audit unconditionally).

### Tests
- `apps/web/tests/platform-console.spec.ts` (new): impersonation start/end, session revoke, payment refund cross-tenant, broadcast lifecycle, flag toggle, webhook replay.
- Vitest coverage in `apps/web/src/server/domains/*` for the new platform domain.

### Acceptance
- A support ticket about "I can't log in" can be resolved end-to-end without psql.
- A duplicate Razorpay charge can be refunded via platform without logging into the gym's dashboard.
- A misbehaving gym can be soft-deleted with reason and audit trail.
- Impersonation is impossible to abuse silently.

### Risk
- Impersonation is a security minefield. Land it behind a feature flag `platform.impersonation` defaulting OFF in production until pen-tested.

---

## Phase 3 — Webhook delivery monitor + feature flags + broadcast (smaller wins)

Already partially scoped in Phase 2. This phase is the UI + acceptance work assuming Phase 2 backend lands.

### Files
- `apps/web/src/components/platform/webhook-monitor.tsx`
- `apps/web/src/components/platform/feature-flags-panel.tsx`
- `apps/web/src/components/platform/broadcasts-panel.tsx`

### Member-side broadcast fanout
- When a `PlatformBroadcast` is published, create one `Notification` per targeted user (use existing in-app notification model). Push via existing push pipeline. Throttle: max 500 push devices per minute to avoid Expo rate limit.

### Acceptance
- Toggle `ai.assistant` to OFF via panel → AI chat endpoint immediately returns gated message without redeploy.
- Publish broadcast "Scheduled maintenance Sunday 2-3 AM" → all members get in-app notification within 60s.
- Replay a quarantined webhook from the monitor → side effects apply idempotently (no double-activation).

---

## Phase 4 — Refund flow UI (gym side + platform side)

### Backend
`PaymentRefund` model exists, `POST /api/orgs/:orgId/payments/:paymentId/refund` exists. Audit:
1. Verify it handles partial refunds (`amountPaise` < `payment.amountPaise`).
2. Verify Razorpay live mode submits to Razorpay API (`razorpay.payments.refund`), persists `providerRefundId`, and updates status via webhook (`refund.processed` event).
3. Add a daily cron `/api/cron/refund-reconcile` that polls Razorpay for any `REQUESTED` refunds older than 10 minutes and updates state.

### UI (gym side, `/dashboard/payments`)
- Add a "Refund" button on each row in `Recent Payments`.
- Modal: amount (max = payment amount minus prior refunds), reason (required, free text), confirm.
- After submit: row shows "Refund pending" → "Refunded ₹X (Razorpay)" once webhook confirms.
- `/dashboard/payments/refunds` shows all refund records with status, requester, reason, audit drill-down.

### UI (platform side, `/platform/payments/[paymentId]`)
- Same modal accessible via the cross-tenant payment detail.
- Always carries `platformRefund=true` flag in audit.

### Member-side
- Mobile + web: refunded payments show "Refunded ₹X on {date}" badge on receipts.
- A `Notification` is sent to the member on refund completion.

### Tests
- Vitest: partial refund math, idempotency on duplicate webhook, reason required.
- Playwright (DB-gated): full refund flow.

### Acceptance
- Owner can refund a duplicate ₹3000 cash payment in <30 seconds.
- Platform admin can refund without logging into the gym's account.
- Razorpay refunds in live mode update via webhook within 2 minutes.

---

## Phase 5 — Trial→paid SaaS upgrade

### Goal
Today every new gym gets a free month. When the trial ends, owner has no in-product way to upgrade. Wire it.

### Pricing model (suggested defaults — Aman to confirm)
- **Starter** (≤100 active members): ₹1,499/mo or ₹14,990/yr
- **Growth** (≤500 active members): ₹3,999/mo or ₹39,990/yr
- **Pro** (unlimited): ₹7,999/mo or ₹79,990/yr
- Free tier remains during trial only.

These should be configurable via `PlatformSetting` so you can change without redeploy.

### Backend
- Extend `SaaSSubscription` to carry `tier`, `billingCycle (MONTHLY|YEARLY)`, `nextRenewalAt`, `priceLockedPaise`.
- New endpoints:
  - `GET /api/me/saas-subscription` — current org's plan
  - `POST /api/orgs/:orgId/saas-subscription/upgrade` — body `{ tier, billingCycle }` → creates a Razorpay subscription (or hosted checkout for first payment).
  - `POST /api/orgs/:orgId/saas-subscription/cancel` — cancels at period end.
  - Webhook handler for SaaS subscription Razorpay events (separate from member subscription).
- Trial-ending notifications at T-7d, T-3d, T-1d, T+0 (use existing `SubscriptionReminder` table with `kind=SAAS_TRIAL_END`).
- Grace period: 7 days after trial end before owner dashboard goes read-only. After 7d, owner sees a hard upgrade wall before any write action.

### UI
- `/dashboard/billing` — extend existing billing page:
  - Show current plan, member count, days until renewal/trial-end.
  - "Upgrade plan" button → modal with tier comparison.
  - "Change billing cycle" toggle.
  - Invoice history for SaaS fees (uses new `Invoice` model from Phase 6).
- Trial banner in `apps/web/src/components/dashboard/shell/*` shows "Trial ends in N days. Upgrade now" with CTA.
- After upgrade, banner converts to subtle "Pro plan • renews on {date}" pill.

### Read-only mode (grace expired)
- All write API routes for that org return `403 SAAS_PAYMENT_REQUIRED`.
- Members can still attend, pay memberships, etc. — only owner/admin writes are blocked.
- A persistent banner: "Your Zook subscription expired. Renew to manage your gym."

### Acceptance
- A trial gym hits T+0, the dashboard shows hard upgrade wall after 7d.
- Owner upgrades via hosted Razorpay checkout, gets a SaaS invoice PDF.
- Cancel-at-period-end works; no surprise charge.

### Risk
- Real money. Test with a sandbox Razorpay account end-to-end before flipping prod.

---

## Phase 6 — In-app PDF invoices (member↔gym, gym↔platform)

### Library choice
- Use `@react-pdf/renderer` server-side (already runs in Node, no headless Chrome needed, easy to template). Add to `apps/web` only.

### Invoice types
1. **Member → Gym** (membership/PT/shop): buyer = member, seller = gym. GST handled per-gym if they have a GSTIN.
2. **Gym → Zook** (SaaS subscription): buyer = gym (legal name + GSTIN from `BillingProfile`), seller = Kyoka Suigetsu LLP (from `PlatformSetting`).
3. **Manual invoice** (offline payment recorded by Reception): same as #1 but generated on demand.

### Sequential numbering
- Per org per FY (April–March). Format: `ZK-{ORGCODE}-{FY}/{SEQ}` (e.g. `ZK-AAROGYA-2026-27/00042`). `ORGCODE` derived from `Organization.username.toUpperCase().slice(0,8)`.
- For SaaS invoices: `ZK-SAAS-{FY}/{SEQ}` (Kyoka-side numbering).
- Track sequence atomically in DB.

### Backend
- `POST /api/orgs/:orgId/invoices/:paymentId` — generates invoice from a payment, persists Invoice row + PDF asset, returns signed URL.
- `GET /api/orgs/:orgId/invoices/:id/pdf` — re-fetches the PDF asset.
- Auto-generate on every successful payment (mock + Razorpay): hook into the payment-success path.
- `GET /api/me/invoices/:id/pdf` — member side.

### PDF template structure (apps/web/src/server/invoices/templates/)
- `MembershipInvoiceTemplate.tsx`, `SaasInvoiceTemplate.tsx`, `ShopInvoiceTemplate.tsx`.
- Header: Zook logo, "Tax Invoice" (if GST) or "Receipt" (if no GST).
- Buyer block: name, phone, address, GSTIN if present.
- Seller block: gym legal name, address, GSTIN, contact.
- Line items: plan/product name, qty, unit price, discount, taxable value, CGST/SGST or IGST (if applicable), total.
- Footer: payment ref id, mode (UPI/cash/card), terms, "This is a system-generated invoice."
- For SaaS invoices: legal entity Kyoka Suigetsu LLP, default address (placeholder until finalized per `docs/production-launch-todos.md`).

### UI
- Mobile: member tapping a past payment → "Download invoice" button.
- Web: same on `/dashboard/payments/[paymentId]` and `/dashboard/billing` for SaaS.

### Acceptance
- Every successful payment in mock and Razorpay mode generates an invoice within 60s.
- Invoice has the gym's GSTIN if set, else marked "Not GST registered".
- Member can download their own invoice from mobile or web.
- SaaS invoices use Kyoka Suigetsu LLP details.
- Invoice numbers are gapless within (org, FY).

### Risk
- Indian GST templating is finicky. If the gym is not GST-registered, do not show CGST/SGST lines. If unsure, default to "Bill of Supply" (non-GST receipt) until owner sets GSTIN.

---

## Phase 7 — Branch-scoped shop & payments (multi-branch UI fix)

### Goal
A gym with 2 branches must see/manage shop inventory and payments per branch, not globally.

### Backend
- `Product` already has `branchId`. Verify queries in the shop domain filter on it. Many likely do `where: { orgId }` and ignore branch. Audit and fix.
- `ShopOrder.branchId`, `Payment.branchId` — same audit.
- `MemberSubscription.branchId` — verify member is enrolled at a specific branch. Currently may be null; backfill to default branch.
- `AttendanceRecord.branchId` — already branch-scoped, verify reporting respects it.

### API changes
- All `/api/orgs/:orgId/shop/*`, `/api/orgs/:orgId/payments/*`, `/api/orgs/:orgId/products*` endpoints accept `?branchId={id}` query.
- When omitted, default to "active branch" from session context, NOT to "all branches" — explicit opt-in via `?branchId=all`.

### UI
- `/dashboard/shell` already has a branch switcher. Extend its scope so it gates shop, payments, products, members, reports views.
- Add a clear visual indicator at top of every section: "Showing {branch name} | Switch branch".
- "All branches" view is allowed for owners/admins, hidden for receptionists.

### Mobile
- Reception app already has active-branch context. Audit shop and payment screens to use it.
- Members stay branch-agnostic (a member's membership specifies their home branch, but they can attend any branch within the org if the gym allows — this is the current contract, keep it).

### Tests
- New playwright: 2-branch gym, owner sees branch A's stock, switches to branch B, sees branch B's stock.
- Vitest: shop domain branch filter coverage.

### Acceptance
- Gym with 2 branches sees each branch's inventory independently.
- Cross-branch transfer is not built in v1 (out of scope, add to roadmap).
- Reports CSV exports respect the selected branch.

### Risk
- Backfill: existing single-branch gyms have all data on `branchId = defaultBranchId`. Run a one-shot script to ensure no `Product`/`ShopOrder`/`Payment` has null `branchId`.

---

## Phase 8 — Body measurements expansion + Diet/meal logging

### Body measurements
Phase 0 added columns. Now wire UI.

**Mobile (`apps/mobile/app/tracking-entry.tsx`):**
- Add a "Body measurements" mode (toggled alongside Workout / Body / Habit).
- Fields: weight, body fat %, muscle mass, waist, hips, chest, shoulders, arms, forearms, thighs, calves, neck, visceral fat, resting heart rate, photo (front/side/back via existing photoAssetId flow).
- Save → `POST /me/tracking/body-progress` (extend handler in core.ts).

**Mobile (`apps/mobile/app/tracking-history.tsx`):**
- Body progress section shows a multi-metric trend chart (weight + waist by default, others toggleable).

**Trainer side (web + mobile):**
- Trainer can record body progress on behalf of an assigned client (uses `recordedByUserId`). Surfaced in `trainer/client/[id]` → "Body progress" tab.

### Diet plan & meal logging

**Schema is added in Phase 0.**

**Trainer side (mobile + web):**
- `Dashboard → Trainers → {client} → Diet plan` (web) and `/trainer/client/[id]/diet` (mobile).
- Create a diet plan: title, daily calorie target, macros, meals (breakfast/snack/lunch/snack/dinner with calorie/macro/items per meal).
- Publish to the assigned client (uses existing PlanAssignment-style fanout).

**Member side (mobile):**
- New tab in member home: `/diet` (or extend `/plan` to be tabs: Workout | Diet).
- Today's meals from active diet plan.
- "Log meal" button: pick from plan or freeform (name, calories, macros, time).
- Day rollup: kcal in vs target, macros breakdown bars.

**Web member view:**
- Read-only diet plan view on `/m/diet` (member-side).

**AI tie-in (future, post-launch):**
- AI assistant can generate diet drafts using the same scope guard pattern as workout plans. Out of scope for this phase.

### Tests
- Vitest: meal log calorie/macro rollup, diet plan publish creates assignment.
- Playwright: trainer creates diet plan → member sees today's meals on mobile.

### Acceptance
- Trainer can build and publish a diet plan with 4 meals in under 3 minutes.
- Member can log a meal (deviation from plan) in under 15 seconds.
- Trainer can record body measurements for a client.

### Risk
- Meal logging UX must stay fast — Indian users hate typing macros. Provide presets ("1 roti = 80 kcal / 16g carbs / 3g protein") via a static lookup table seeded in `packages/core`.

---

## Phase 9 — Trainer payouts UI

### Backend
- New domain `apps/web/src/server/domains/payouts/*`.
- Endpoints:
  - `GET /api/orgs/:orgId/trainers/:trainerId/payout-config`
  - `PUT /api/orgs/:orgId/trainers/:trainerId/payout-config` — body `{ baseMonthlyPaise, ptCommissionPercent, perSessionFeePaise, payDay }`.
  - `GET /api/orgs/:orgId/payouts?month=YYYY-MM` — list draft + paid payouts.
  - `POST /api/orgs/:orgId/payouts/:id/adjust` — add advance/penalty line.
  - `POST /api/orgs/:orgId/payouts/:id/mark-paid` — body `{ method, note, proofFileAssetId? }`.
- Auto-accrual hooks:
  - Hook into `PT subscription activated` → create commission row.
  - Hook into `PT session logged` → create per-session fee row.
  - Cron `1 0 1 * *` (1st of month) → draft payouts for all trainers.
- Refund/cancellation: claw-back via negative commission row.

### UI (web, owner side)
- `/dashboard/staff/[trainerId]` — extend with "Payouts" tab.
  - Top: config form (base, commission %, per-session fee).
  - Bottom: month-by-month history.
- `/dashboard/payouts` — monthly dashboard.
  - Filter by month.
  - Cards per trainer: trainer name, total earned, breakdown.
  - "Mark paid" inline action.

### UI (mobile, trainer side)
- `/trainer/payouts` — new screen accessible from trainer home.
  - This month accrued (live).
  - Last 3 months paid.
  - Tap month → breakdown (base + N PT commissions + M sessions ± adjustments).

### Tests
- Vitest: accrual math, claw-back on PT refund, cron drafts correctly.
- Playwright: owner sets commission %, PT subscription activated, commission appears in payout.

### Acceptance
- Trainer can see their earnings update in near real time.
- Owner closes the month in <5 minutes by reviewing and marking paid.
- Claw-backs work correctly when a PT subscription is refunded mid-month.

---

## Phase 10 — Referral product polish (rollout playbook)

### Onboarding nudge
- On first dashboard visit by owner, show a 3-step setup checklist if referral policy is at defaults: "Set up referrals (60s)".
- Wizard: 3 referrer-reward presets + 3 invitee-reward presets, pick one each, save.

### Owner UX
- `/dashboard/plans/referrals` — already exists. Polish:
  - Add "Top advocates" leaderboard (this is owner-only, not member-facing).
  - Add "Mark cash credit paid" inline button on each referrer row.
  - Add the abuse signals: number of redemptions in 24h, unique invitee phones, suspicious clustering.

### Member UX
- `apps/mobile/app/profile.tsx` → "Refer a friend" tile is the top section.
  - Big code, big share button (system share sheet).
  - "Your friends: 3 joined, 2 pending" stat.
  - Referrer benefit display: "You'll get 7 free days for every friend who joins."

### Anti-abuse
- Cap of 10 redemptions per referrer per month (configurable per org).
- Owner notification when >5 redemptions in 24h.
- Platform abuse flag auto-created.

### Acceptance
- Owner can stand up referrals from a cold start in 60 seconds.
- Top 5 advocates per gym are easy to identify and reward.
- Referral abuse is flagged and visible to both owner and platform.

---

## Phase 11 — Validation tooling for manual gates

These are the launch gates that require humans + real devices + real money. I (or Codex) cannot complete them, but Phase 11 builds the tooling so each attempt is fast and the result is clearly recorded.

### Razorpay live webhook certification harness
- New script: `scripts/razorpay-webhook-cert.ts`
  - Reads a list of signed webhook fixtures (success, failure, duplicate, out-of-order, refund).
  - Submits each to the production webhook URL via `curl`/`fetch` with the correct signature.
  - Asserts: idempotent state, no double-activation, audit logged.
- New report file: `docs/razorpay-webhook-certification.md` — checklist owner fills as they certify in dashboard.

### OAuth real-device smoke
- `docs/oauth-smoke-checklist.md` with 6 boxes: Google on Chrome web, Google on iOS Safari, Google in iOS app, Google in Android app, Apple on iOS Safari, Apple in iOS app.
- Each box: expected app behavior + screenshot path.

### Expo push physical-device QA
- `docs/expo-push-device-qa.md`: matrix of states (foreground / background / cold-start) × devices (iPhone SE, iPhone 15, Pixel 6, mid-range Android).
- Each cell: send a known notification via `/api/me/push-devices`, observe behavior, paste device log.

### Sentry test exceptions
- New endpoint `POST /api/diagnostics/throw` (platform-admin-only, staging-only via env gate): throws a handled and unhandled error. Used to verify Sentry redaction, source-maps, release association.
- `docs/sentry-cert.md`: checklist with screenshots from Sentry showing the event with redacted payload.

### Supabase backup posture
- `docs/supabase-backup-cert.md`: confirm daily backups enabled, PITR plan-dependent decision, service-role key audit.

### Resend transactional smoke
- `scripts/resend-smoke.ts`: sends one transactional email to an internal mailbox, prints SPF/DKIM/DMARC verification result via header inspection.

### Production load smoke
- Install `k6` via Homebrew (`brew install k6`) and run `pnpm test:load` against staging.
- Capture report to `docs/load-smoke-{date}.md`.

### Account-deletion cron
- Add Vercel cron config in `vercel.json` for `0 3 * * *` calling `/api/cron/account-deletion-purge`.
- Idempotent guard: skip if previous run is still in progress.

### Acceptance
- Each manual gate has a one-page checklist that an engineer can complete in <30 minutes.
- All checklists are linked from `docs/launch-runbook.md`.

---

## Sequencing summary

```
Phase 0 (schema)  ──┬─→ Phase 1 (minor removal)
                    ├─→ Phase 2 (platform console)  ──→ Phase 3 (broadcast/flags/webhook UI)
                    ├─→ Phase 4 (refund UI)         ──→ depends on Phase 2 platform refund
                    ├─→ Phase 5 (SaaS upgrade)      ──→ depends on Phase 6 for SaaS invoice
                    ├─→ Phase 6 (PDF invoices)
                    ├─→ Phase 7 (branch scoping)
                    ├─→ Phase 8 (body + diet)
                    ├─→ Phase 9 (payouts)
                    ├─→ Phase 10 (referral polish)
                    └─→ Phase 11 (validation tooling)
```

Suggested order over ~3 weeks:

- **Week 1:** Phase 0 → Phase 1 → Phase 2 → Phase 4. (Unblocks support and refund pain immediately.)
- **Week 2:** Phase 3 → Phase 6 → Phase 5. (Billing surface ready end to end.)
- **Week 3:** Phase 7 → Phase 8 → Phase 9 → Phase 10 → Phase 11. (Multi-branch + new domain + payouts + referrals + validation.)

---

## Risk register

| Risk | Mitigation |
|------|------------|
| Production DB migration fails | Test on Supabase staging clone first. All new columns nullable / defaulted. Rollback = `pnpm db:migrate resolve --rolled-back` on the named migration. |
| Impersonation abused by an internal account | Feature-flag default OFF. Hard TTL. Mandatory reason. Audit every action. Platform admin team gets notified on start. |
| PDF invoice numbering gap (illegal under GST) | Atomic sequence allocation via DB transaction. Test concurrent payment race. |
| Branch scoping breaks existing single-branch reports | Backfill `branchId` to default branch on all child rows. Default behavior = active branch, not "all". |
| Refund flow refunds the wrong amount | Modal forces explicit amount entry, hard cap = original − prior refunds. Reason required. Audit logged. |
| SaaS read-only mode locks owner out before they can pay | 7-day grace period after trial end. Banner from T-7d. Multiple email/push reminders. Owner can always pay even in read-only state. |
| Removing guardian gate breaks Play/App Store privacy posture | Update store metadata before submitting next build. Track in `docs/production-launch-todos.md`. |
| Cross-tenant audit page is slow | Use the new `(createdAt, orgId)` index. Paginate aggressively. Don't join, use ID-then-fetch. |

---

## Out of scope for this plan (explicit)

- AI plan assistant — stays "coming soon", future roadmap.
- Class booking UI — future scope.
- Member messaging — future scope.
- Family/corporate plans — future scope.
- Multi-currency — INR only, gateway handles the rest.
- Member-facing leaderboard — not building.
- Cross-branch product transfer — not in v1 of multi-branch.
- AI-driven diet plans — out of scope; trainer manual diet plans only.

---

## Final answers to the six questions (in this plan's context)

### Is there anything missing from the product point of view?
Yes, and this plan addresses it. The big functional gaps that this plan closes are: real refund flow with UI, SaaS upgrade self-serve, GST-aware PDF invoices both directions, branch-scoped shop/payments, body measurements depth + diet logging, trainer payouts ledger, a complete platform support console with impersonation, feature flags, broadcasts, webhook monitor, and a referral rollout playbook. After Phase 11, the only missing-but-deferred items are explicitly out-of-scope (AI, classes, messaging, family plans).

### Does the product actually do what it claims?
After this plan, yes — every claim on the marketing site and the README maps to a working flow. Today the misleading claims are: "trainer commissions" (schema only, no UI), "multi-branch" (schema only, UI is single-branch), "refunds" (endpoint only, no UI). All three are explicitly fixed.

### Is every function, every workflow working and practical?
After Phases 0–10, yes. Phase 11 produces the tooling to *prove* the last mile (Razorpay live, OAuth devices, Expo push physical, Sentry redaction, Supabase backups). Those manual gates remain your responsibility — code cannot complete them.

### Is there product clarity for the real world, and what manual work remains for you?
Clarity: each phase has a defined acceptance criterion that maps to an owner-facing or member-facing outcome. Your remaining manual work is:
- Confirm SaaS pricing tiers (Phase 5 has suggested defaults).
- Complete Razorpay live webhook certification using the Phase 11 harness.
- Complete OAuth and push device smokes using the Phase 11 checklists.
- Finalize Kyoka Suigetsu LLP address for SaaS invoices.
- App Store / Play Store metadata refresh after guardian gate is removed.
- Sign off on impersonation feature being flipped ON after pen-test.
- Schedule daily account-deletion cron in production (Phase 11).
- Approve the 14-day Play closed test cohort.
- MSG91 DLT template approval — still on your side, independent of this plan.

### Is there an admin board that lets you manage data and shoot individual actions?
Today: only org-level suspend/reactivate + abuse review + AI usage.
After Phase 2 + 3: a real platform support console — user search, session revoke, impersonation, payment refund cross-tenant, webhook replay, broadcasts, feature flags, audit log, moderation queue, org rename/trial-extend/credit/tier-change/soft-delete/ownership-transfer, bulk member import.

### What would you implement next or improve in the product?
After this plan lands, the next-best-leverage moves are (rough order):
1. **AI plan assistant** out of "coming soon" — staging cert + flag flip, then iterate on trainer review UX.
2. **Class booking UI** — schema and endpoints exist, real-life demand is high in larger gyms.
3. **Member ↔ trainer messaging** — biggest member retention lever after plans.
4. **GST e-invoicing** — once invoice volume crosses 5 cr/yr, mandatory in India; we'll already be 80% there from Phase 6.
5. **Trainer mobile-first redesign** — current trainer UX is web-leaning; mobile-first is more realistic for India.
6. **Web member portal** — currently member-side web is light; some members will prefer it for invoice/payment history.
7. **Marathi/Tamil/Bengali catalogues** — after measuring Hindi pickup.
8. **OpenTelemetry tracing** — once volume justifies it; Sentry covers errors for now.
9. **Cross-branch product transfer** + branch-level analytics — once multi-branch gyms onboard.
10. **Public gym page SEO polish** — discovery via Google is currently weak.
