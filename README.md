# Zook

Zook is an India-first operating system for small and medium gyms. This monorepo contains the mobile app, web dashboard, API backend, Prisma database package, shared core domain logic, and provider abstractions for local-first development.

This repository is currently aligned to the **backend-first Zook MVP product flow**: mobile execution apps for members, trainers, receptionists, and owners on the move; web control-room surfaces for owner/admin and platform operations; public join pages; and hosted checkout handoff with local mock providers only when explicitly allowed.

## What Is Built

- Expo Router mobile app for member, owner, receptionist, and trainer operations.
- Next.js App Router web dashboard, public gym pages, referral fallback pages, provider diagnostics, mock checkout, and provider-backed checkout handoff.
- Next.js API route handlers backed by a service-layer architecture and Prisma.
- PostgreSQL schema covering auth, tenancy, RBAC, memberships, payments, coupons, referrals, QR attendance, PT, plans, AI, notifications, goals, shop, privacy, and platform admin.
- Deterministic mock providers plus optional live adapters for email, storage, maps, AI, Razorpay, and Expo push.
- Unified OTP/session auth across web and mobile.
- Persistent personal tracking for workouts, exercise entries, body progress, and habits.
- Real join-mode enforcement for open join, approval-required gyms, invite-only access, and manual/offline activation.
- Real QR attendance validation, approval queue actions, visit consumption, and manual override logging.
- Persisted in-app notifications with recipient fanout, read state, preference records, push devices, and push delivery tracking.
- Shop stock movement, pickup code creation, and inventory adjustment records tied to mock payment success.
- Mock product fixtures for local pilot gyms, plus existing database seed flows for local/pilot operations.
- Vitest unit tests for core business rules and Playwright smoke tests for web flows.

## Quick Start

```bash
pnpm install
cp .env.example .env
pnpm db:local:setup
pnpm dev:web
pnpm dev:mobile
```

Manual database setup, if you do not want the helper:

```bash
docker compose up -d postgres
pnpm db:generate
pnpm db:deploy
pnpm seed:demo
APP_ENV=local API_MODE=backend pnpm preflight
pnpm env:check
pnpm release:preflight
pnpm dev:web
pnpm dev:mobile
```

Development OTP: `000000`

`pnpm db:local:setup` starts the repo Postgres container, applies migrations, safely baselines an older local `db:push` database when it matches the Prisma schema, seeds demo data, and runs release preflight. If Docker says the daemon is unreachable, start Docker Desktop first. For an older disposable local database created with `db:push`, reset/recreate the database before switching to `db:deploy`, or continue using `pnpm db:push` only for throwaway local work. Shared staging and production databases should use the committed Prisma migrations.

Runtime modes:

- Backend mode is the default: `APP_ENV=local API_MODE=backend`.
- Offline demo mode is explicit local-only: `APP_ENV=local API_MODE=offline-demo EXPO_PUBLIC_API_MODE=offline-demo pnpm dev:mobile`.
- Staging and production mobile builds must use `API_MODE=backend`; the Expo config refuses to build non-local apps with offline demo enabled.
- `OTP_FIXED_CODE_DEV=000000` is only accepted in local/test, or staging when `ALLOW_FIXED_OTP_IN_STAGING=true`. It is never accepted in production.
- Mock payment completion is local-only by default. Staging requires `ALLOW_MOCK_PAYMENT_COMPLETION=true`; production always blocks it.
- Production release checks also require durable rate limiting and reject silent offline demo, fixed OTP, weak secrets, localhost mobile URLs, seeded demo users, mock email, and mock payment completion.

Seed accounts:

| Role           | Email                  |
| -------------- | ---------------------- |
| Platform admin | `platform@zook.local`  |
| Owner          | `owner@zook.local`     |
| Admin          | `admin@zook.local`     |
| Receptionist   | `reception@zook.local` |
| Trainer        | `trainer@zook.local`   |
| Member         | `member@zook.local`    |
| Minor member   | `minor@zook.local`     |

See [docs/local-development.md](docs/local-development.md), [docs/mobile-private-pilot-qa.md](docs/mobile-private-pilot-qa.md), [docs/deployment.md](docs/deployment.md), and [docs/phase-4-results.md](docs/phase-4-results.md) for current run, QA, and rollout guidance.

## Key Routes

Web:

- `/login`
- `/dashboard`
- `/dashboard/attendance/qr-display`
- `/platform`
- `/g/iron-house`
- `/join/iron-house?plan=plan-hybrid-pro&ref=RHEA250`
- `/r/NISHAFIT`
- `/checkout/mock/demo` (local/mock mode only)
- `/checkout/mock/{sessionId}` (local/mock payment sessions)
- `/checkout/{sessionId}`

API:

- `POST /api/auth/request-otp`
- `POST /api/auth/verify-otp`
- `POST /api/orgs`
- `GET /api/orgs/public/search`
- `POST /api/files/upload`
- `GET /api/files/:fileId/signed-url`
- `POST /api/orgs/:orgId/membership-plans`
- `POST /api/orgs/:orgId/subscriptions`
- `POST /api/payments/checkout`
- `POST /api/payments/mock/:sessionId/complete`
- `POST /api/payments/webhooks/razorpay`
- `POST /api/push/register-device`
- `POST /api/push/unregister-device`
- `GET /api/me/push-devices`
- `POST /api/me/guardian-consent/request`
- `POST /api/me/guardian-consent/verify`
- `GET /api/health`
- `GET /api/ready`
- `POST /api/orgs/:orgId/attendance/qr-token`
- `POST /api/attendance/scan`
- `POST /api/ai/chat`
- `POST /api/shop/orders`
- `GET /api/platform/orgs`
- `GET /api/platform/provider-status`

Mobile:

- `/` member home with active gym/role context and dominant Scan QR action
- `/find-gyms`
- `/gym/[username]`
- `/scan`
- `/plans`
- `/notifications`
- `/shop`
- `/profile`
- `/tracking`
- `/tracking-history`
- `/tracking-entry`
- `/owner`
- `/reception`
- `/trainer`

## Mock-First Demo Paths

- OTP: `000000`.
- Member: login as `member@zook.local`, open Home, scan QR, simulate approved or pending, open Push Day, mark progress, add Protein Shake and Zook Shaker, confirm mock checkout, show pickup code.
- Receptionist: switch to Receptionist in Profile, open Desk, approve pending scan, verify `ZK-7319`, record Direct UPI payment for Aarav, fulfill pickup order.
- Trainer: switch to Trainer, open Aarav Mehta, generate/review AI draft, assign only after trainer approval.
- Owner mobile: switch to Owner, open Needs attention, review approvals, revenue, and stock.
- Public web: open `/g/iron-house`, select Hybrid Pro, apply `RHEA250`; backend-connected pages send users to login before checkout, while explicit local demo fallback can continue to `/checkout/mock/demo`.
- Owner/admin web: open `/dashboard` for Today’s Command Board, Attendance, Notifications, Shop, Reports, Staff, Audit, and Settings.
- Platform admin: open `/platform` to inspect provider diagnostics and org operations. Diagnostics show request IDs and missing env names only, never secret values.

## Provider Defaults

- `MockEmailProvider`: prints/stores OTP delivery.
- `MockPaymentProvider`: hosted checkout session lifecycle.
- `MockMapProvider`: India city coordinates and Google Maps link fallback.
- `MockAIProvider`: deterministic text, structured plan, image placeholder, scope and safety classification.
- `MockPushProvider`: delivery recording.
- `MockSmsProvider`: future OTP stub.
- `LocalStorageProvider`: local signed URL/file metadata shape.

Optional live adapters currently available:

- `EMAIL_PROVIDER=smtp|resend`
- `STORAGE_PROVIDER=s3|r2`
- `MAP_PROVIDER=google`
- `AI_PROVIDER=openai` or `AI_PROVIDER=disabled`
- `PAYMENT_PROVIDER=razorpay` or `PAYMENT_PROVIDER=disabled`
- `SMS_PROVIDER=webhook|disabled`
- `PUSH_PROVIDER=expo` or `PUSH_PROVIDER=disabled`

## Switching To Real Providers Later

Keep client apps unchanged. Add provider implementations behind the interfaces in `packages/core/src/providers`, then select them from backend factories using `.env`:

- `AI_PROVIDER=openai` with `OPENAI_API_KEY`
- `MAP_PROVIDER=google` with `GOOGLE_MAPS_API_KEY`
- `PAYMENT_PROVIDER=razorpay|disabled`
- `SMS_PROVIDER=webhook|disabled` with `SMS_WEBHOOK_URL` and optional `SMS_WEBHOOK_SECRET`
- `STORAGE_PROVIDER=s3` with S3/R2-compatible credentials
- `PUSH_PROVIDER=expo|disabled`

AI, payments, maps, push, and storage are never called directly from the mobile app.

## Testing

```bash
pnpm test:unit
pnpm test:services
pnpm typecheck
pnpm test:web
pnpm test:acceptance
pnpm test:acceptance:db
```

Database-backed Playwright login/mutation checks are gated with:

```bash
pnpm test:db:prepare
RUN_DB_WEB_TESTS=1 pnpm test:web
```

If `RUN_DB_WEB_TESTS=1 pnpm test:web` is skipped or fails before the OTP field appears, make sure:

- `.env` exists
- `DATABASE_URL` is reachable
- the database is seeded
- the Playwright-started Next.js server is inheriting the same env

`pnpm test:acceptance` will print clear instructions instead of hard-failing when DB-gated env is missing.

## Mock Checkout And QR Testing

- Start a membership or shop checkout from web or mobile to open `/checkout/mock/{sessionId}`.
- Complete the mock hosted flow to trigger server-side activation.
- Use `/dashboard/attendance/qr-display` to render a live QR token.
- Use the mobile scan surface or the manual token dev path to test attendance scanning.

## Diagnostics

- Platform admins can inspect safe provider readiness at `/api/platform/provider-status`.
- CSV exports are available at `/api/orgs/{orgId}/reports/*.csv` and `/api/orgs/{orgId}/audit-logs.csv`.

## Known Pilot Limitations

- Razorpay is provider-ready with backend confirmation and webhook signature handling, but real test credentials and signed webhook delivery were not verified in the 2026-05-03 hardening pass.
- Expo push is provider-bound and in-app notifications are canonical, but physical-device push delivery and deep-link tap QA are not certified yet.
- OpenAI is server-only with structured response validation and safety/audit records, but live provider credentials and model behavior still need staging validation.
- S3/R2-compatible object storage is implemented behind the storage boundary, but production bucket/CDN behavior is not certified yet.
- Multi-branch data model exists; the MVP UI is still Default-Branch-centered and shop/payments remain org-wide.
- QR scan simulator testing still works best with the manual-token path.
- Sentry remains a scaffold rather than a full production SDK integration.

## Acceptance Checklist

- Owner signs in, creates organization, configures location, plan, coupon, referral, staff, and dashboard.
- Member completes profile, searches gyms, uses referral/coupon, checks out, scans QR, views plans/goals/notifications, and buys pickup item.
- Receptionist handles check-ins, manual overrides, cash payments, pickup, and operational notices.
- Trainer manages clients, records offline PT, drafts AI plans, publishes to assigned clients, and sends scoped notifications.
- Admin/owner manages permissions, reports, audit, shop inventory, AI usage, billing, and privacy.
- Platform admin views organizations, updates org status, and inspects AI/abuse data.
- Minor is blocked before guardian consent and uses minor-safe defaults after consent.
