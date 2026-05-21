# Zook Redesign E2E Matrix

Last verified: 2026-05-21

## Test Evidence

| Signal | Result | Notes |
| --- | --- | --- |
| `pnpm -w typecheck` | Pass | Baseline clean before fixes. Re-run required after doc/fix edits. |
| `pnpm -w test` | Pass | Baseline clean before fixes. Re-run required after doc/fix edits. |
| `pnpm test:web` | Pass | Non-DB wrapper skipped DB-gated rows unless `RUN_DB_WEB_TESTS=1`. |
| `RUN_DB_WEB_TESTS=1 pnpm test:web` | Pass | Existing DB-backed web acceptance and walkthrough passed after applying local additive slug migration/backfill. |
| Focused walkthrough after fix | Pass | `platform /dashboard` passed with no hydration console issues. |
| Web dev server | Pass | Host split curl smoke completed on `localhost:3120` and `dashboard.localhost:3120`. |
| Theme smoke | Pass with caveat | Light/dark cookies resolved on public and auth-gated routes; unauthenticated public pages still request `/api/auth/session` and browser logs 401 resource lines. |
| Mobile Metro | Pass with warning | `pnpm --filter @zook/mobile start` booted on port 8082; existing port 8081 was occupied and Watchman reported recrawl warnings. |

Local DB note: the first DB-backed web run failed because the local DB lacked `User.slug`. I applied the additive migration SQL from `packages/db/prisma/migrations/20260521090000_member_slugs/migration.sql` locally and ran `packages/db/scripts/backfill-member-slugs.ts`; production commands are in `ROLLOUT.md`.

## Host And Redirect Matrix

Test slug: `7hgt3rr3`. Test gym username: `aarogya-strength`.

| Host | Path | Observed chain | Status |
| --- | --- | --- | --- |
| `localhost` | `/` | `200` | Pass |
| `localhost` | `/dashboard` | `308 dashboard.localhost/dashboard` -> `307 /login?redirect=%2Fdashboard` -> `200` | Pass |
| `localhost` | `/me` | `200` | Pass |
| `localhost` | `/m/7hgt3rr3` | `307 /login?redirect=%2Fm%2F7hgt3rr3` -> `200` | Pass |
| `localhost` | `/g/aarogya-strength` | `200` | Pass |
| `localhost` | `/desk` | `308 dashboard.localhost/desk` -> `307 /login?redirect=%2Fdesk` -> `200` | Pass |
| `localhost` | `/coach` | `308 dashboard.localhost/coach` -> `307 /login?redirect=%2Fcoach` -> `200` | Pass |
| `localhost` | `/platform` | `308 dashboard.localhost/platform` -> `307 /login?redirect=%2Fplatform` -> `200` | Pass |
| `localhost` | `/login` | `200` | Pass |
| `dashboard.localhost` | `/` | `307 /login?redirect=%2F` -> `200` | Pass |
| `dashboard.localhost` | `/dashboard` | `307 /login?redirect=%2Fdashboard` -> `200` | Pass |
| `dashboard.localhost` | `/me` | `308 localhost./me` -> `200` | Pass |
| `dashboard.localhost` | `/m/7hgt3rr3` | `308 localhost./m/7hgt3rr3` -> `307 /login?redirect=%2Fm%2F7hgt3rr3` -> `200` | Pass |
| `dashboard.localhost` | `/g/aarogya-strength` | `308 localhost./g/aarogya-strength` -> `200` | Pass |
| `dashboard.localhost` | `/desk` | `307 /login?redirect=%2Fdesk` -> `200` | Pass |
| `dashboard.localhost` | `/coach` | `307 /login?redirect=%2Fcoach` -> `200` | Pass |
| `dashboard.localhost` | `/platform` | `307 /login?redirect=%2Fplatform` -> `200` | Pass |
| `dashboard.localhost` | `/login` | `200` | Pass |

## Web Route Matrix

| Area | Routes | Coverage | Status |
| --- | --- | --- | --- |
| Public shell | `/`, `/login`, `/verify-otp`, `/privacy`, `/terms`, `/support`, `/status` | Public walkthrough, curl smoke, light/dark smoke | Pass |
| Gym discovery | `/gyms`, `/g/[username]`, `/g/[username]/opengraph-image`, `/in/[username]`, `/join/[username]`, `/r/[code]`, `/qr/[username]` | Public walkthrough for HTML routes; SVG/OG route code audited | Pass |
| Checkout/guardian/staff invite | `/checkout/[sessionId]`, `/checkout/mock/[sessionId]`, `/guardian-consent`, `/guardian/consent/[challengeId]`, `/staff/invite/[token]` | Existing web acceptance covers checkout/guardian; staff invite route code audited | Manual verify staff invite token |
| Member web | `/me`, `/me/[handle]`, `/m/[slug]` | DB walkthrough and curl auth-gate | Pass |
| Owner/admin dashboard | `/dashboard`, `/dashboard/ai`, `/dashboard/attendance`, `/dashboard/attendance/qr-display`, `/dashboard/audit`, `/dashboard/billing`, `/dashboard/branches`, `/dashboard/members`, `/dashboard/members/join-requests`, `/dashboard/membership-plans`, `/dashboard/notifications`, `/dashboard/notifications/history`, `/dashboard/notifications/templates`, `/dashboard/payments`, `/dashboard/payments/refunds`, `/dashboard/plans`, `/dashboard/plans/coupons`, `/dashboard/plans/offers`, `/dashboard/plans/referrals`, `/dashboard/profile`, `/dashboard/public-profile`, `/dashboard/reports`, `/dashboard/settings`, `/dashboard/shop`, `/dashboard/shop/orders`, `/dashboard/staff`, `/dashboard/trainers` | DB walkthrough for role routes and API acceptance rows | Pass |
| Receptionist | `/desk`, `/desk/members`, `/desk/orders`, `/desk/payments`, `/desk/payments/new`, `/desk/qr` | DB walkthrough and API acceptance rows | Pass |
| Trainer | `/coach` plus dashboard trainer/client plan endpoints | DB walkthrough and API acceptance rows | Pass |
| Platform admin | `/platform/[[...section]]` | DB walkthrough as platform role | Pass |

## Mobile Route Matrix

| Area | Routes | Coverage | Status |
| --- | --- | --- | --- |
| Auth/onboarding | `/login`, onboarding, find-gyms, gym join/referral routes | Route guard tests, static audit, Metro boot | Manual device verify |
| Member | `/(member)`, plan, scan, you, membership buy/checkout/history/receipt, workout logging, shop/cart/checkout/pickup, notifications, profile/settings | Route guard tests, static audit, Metro boot | Manual device verify |
| Trainer | `/trainer`, clients, client detail plan/sessions | Route guard tests, static audit, Metro boot | Manual device verify |
| Reception | `/reception`, members, payments, orders, verification | Route guard tests, static audit, Metro boot | Manual device verify |
| Owner/admin | `/owner`, members, approvals, revenue, stock | Route guard tests, static audit, Metro boot | Manual device verify |
| Platform | `/platform` | Route guard tests, static audit, Metro boot | Manual device verify |
| Cross-cutting | Light/dark, role switcher, demo banner, prod bundle excludes demo API | Static audit; production EAS profile fixed to set `EXPO_PUBLIC_INCLUDE_DEMO=false` | Pass pending store build |

## API And Permission Matrix

| Area | Endpoints / gates | Coverage | Status |
| --- | --- | --- | --- |
| Auth | `/api/auth/*`: login, OTP, refresh, logout, session returns slug | Existing web tests and DB acceptance | Pass |
| Permission denial | Core permission matrix in `packages/core/src/permissions.ts`; web/mobile route guards | Unit tests and DB acceptance negative cases | Pass |
| Member domain | profile, onboarding, gyms, memberships, workout logs, notifications, referral | DB acceptance | Pass |
| Staff/admin domain | orgs, branches, members, join requests, attendance, plans, coupons, offers, referrals, payments, refunds, shop, audit, reports, billing, notification templates/composer | DB acceptance | Pass |
| Payments | Razorpay checkout and webhook signature validation; mock checkout | DB acceptance for mock/test flows; live webhook manual | Manual verify live provider |
| Cron | `/api/cron/renewal-reminders` | Code audited; requires prod `CRON_SECRET` | Manual verify |
| Files/uploads | file endpoints and storage provider gates | Existing tests/static audit | Manual verify with provider |

## Manual Pre-Launch Rows

Run these on staging/prod dashboards because they depend on provider dashboards, native devices, or live credentials:

| Area | Manual check |
| --- | --- |
| OAuth | Google and Apple login callbacks on both public and dashboard hosts. |
| Razorpay | Test-mode checkout, live webhook delivery, refund path, signature failure returns rejection. |
| Cron | Trigger renewal reminders with `CRON_SECRET`; verify unauthorized request is rejected. |
| Mobile | Install iOS/Android production builds, confirm no demo banner/API, QR scan, push notification token registration, light/dark toggle. |
| DNS/Vercel | Vercel domain verification and TLS issuance for `dashboard.zookfit.in`. |
| Staff invite | Fresh invite token opens expected host and can be accepted by target staff user. |

