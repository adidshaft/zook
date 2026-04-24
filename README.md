# Zook

Zook is an India-first operating system for small and medium gyms. This monorepo contains the mobile app, web dashboard, API backend, Prisma database package, shared core domain logic, and provider abstractions for local-first development.

This repository is currently at **Phase 3: Operational Beta, Provider Readiness, and Deployment Hardening**. Zook now has deeper web/mobile operational surfaces, stricter provider diagnostics, storage-backed uploads, CSV exports, and better local/staging readiness while keeping mock providers as the default low-cost runtime.

## What Is Built

- Expo Router mobile app for member, owner, receptionist, and trainer operations.
- Next.js App Router web dashboard, public gym pages, referral fallback pages, provider diagnostics, and mock checkout.
- Next.js API route handlers backed by a service-layer architecture and Prisma.
- PostgreSQL schema covering auth, tenancy, RBAC, memberships, payments, coupons, referrals, QR attendance, PT, plans, AI, notifications, goals, shop, privacy, and platform admin.
- Deterministic mock providers plus optional live adapters for email, storage, maps, and AI.
- Unified OTP/session auth across web and mobile.
- Persistent personal tracking for workouts, exercise entries, body progress, and habits.
- Real join-mode enforcement for open join, approval-required gyms, invite-only access, and manual/offline activation.
- Real QR attendance validation, approval queue actions, visit consumption, and manual override logging.
- Persisted in-app notifications with recipient fanout, read state, and preference records.
- Shop stock movement, pickup code creation, and inventory adjustment records tied to mock payment success.
- Seed data for Iron House Fitness and PeakLab Gym.
- Vitest unit tests for core business rules and Playwright smoke tests for web flows.

## Quick Start

```bash
pnpm install
cp .env.example .env
pnpm preflight
pnpm db:generate
pnpm db:push
pnpm db:seed
pnpm dev:web
pnpm dev:mobile
```

Development OTP: `000000`

Seed accounts:

| Role | Email |
| --- | --- |
| Platform admin | `platform@zook.local` |
| Owner | `owner@zook.local` |
| Admin | `admin@zook.local` |
| Receptionist | `reception@zook.local` |
| Trainer | `trainer@zook.local` |
| Member | `member@zook.local` |
| Minor member | `minor@zook.local` |

See [docs/local-development.md](docs/local-development.md), [docs/manual-qa-phase-3.md](docs/manual-qa-phase-3.md), and [docs/mobile-runtime.md](docs/mobile-runtime.md) for full run instructions and QA flows.

## Key Routes

Web:

- `/login`
- `/dashboard`
- `/dashboard/attendance/qr-display`
- `/platform`
- `/g/iron-house`
- `/join/iron-house?ref=NISHAFIT`
- `/r/NISHAFIT`
- `/checkout/mock/{sessionId}`

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
- `POST /api/orgs/:orgId/attendance/qr-token`
- `POST /api/attendance/scan`
- `POST /api/ai/chat`
- `POST /api/shop/orders`
- `GET /api/platform/orgs`
- `GET /api/platform/provider-status`

Mobile:

- `/` member home with dominant Scan QR action
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
- `AI_PROVIDER=openai`

## Switching To Real Providers Later

Keep client apps unchanged. Add provider implementations behind the interfaces in `packages/core/src/providers`, then select them from backend factories using `.env`:

- `AI_PROVIDER=openai` with `OPENAI_API_KEY`
- `MAP_PROVIDER=google` with `GOOGLE_MAPS_API_KEY`
- `PAYMENT_PROVIDER=razorpay|cashfree|phonepe|payu`
- `STORAGE_PROVIDER=s3` with S3/R2-compatible credentials
- `SMS_PROVIDER=...`, `PUSH_PROVIDER=...`

AI, payments, maps, push, and storage are never called directly from the mobile app.

## Testing

```bash
pnpm test:unit
pnpm test:services
pnpm typecheck
pnpm test:web
pnpm test:acceptance
```

Database-backed Playwright login/mutation checks are gated with:

```bash
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

## Known MVP Limitations

- Payments are still mock-first in this branch.
- Push delivery remains mocked.
- Multi-branch data model exists, but the UI still centers one branch.
- QR scan simulator testing still works best with the manual-token path.
- Deployment guidance exists, but automated container/EAS rollout files still need a dedicated pass.

## Acceptance Checklist

- Owner signs in, creates organization, configures location, plan, coupon, referral, staff, and dashboard.
- Member completes profile, searches gyms, uses referral/coupon, checks out, scans QR, views plans/goals/notifications, and buys pickup item.
- Receptionist handles check-ins, manual overrides, cash payments, pickup, and operational notices.
- Trainer manages clients, records offline PT, drafts AI plans, publishes to assigned clients, and sends scoped notifications.
- Admin/owner manages permissions, reports, audit, shop inventory, AI usage, billing, and privacy.
- Platform admin views organizations, updates org status, and inspects AI/abuse data.
- Minor is blocked before guardian consent and uses minor-safe defaults after consent.
