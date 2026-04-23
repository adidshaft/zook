# Zook

Zook is an India-first operating system for small and medium gyms. This monorepo contains the mobile app, web dashboard, API backend, Prisma database package, shared core domain logic, and provider abstractions for local-first development.

## What Is Built

- Expo Router mobile app for iOS/Android with member, owner, receptionist, and trainer flows.
- Next.js App Router web dashboard, public gym pages, referral fallback pages, and mock checkout.
- Next.js API route handlers backed by a service-layer architecture and Prisma.
- PostgreSQL schema covering auth, tenancy, RBAC, memberships, payments, coupons, referrals, QR attendance, PT, plans, AI, notifications, goals, shop, privacy, and platform admin.
- Deterministic mock providers for email OTP, payments, maps, AI, push, SMS, and storage.
- Seed data for Iron House Fitness and PeakLab Gym.
- Vitest unit tests for core business rules and Playwright smoke tests for web flows.

## Quick Start

```bash
pnpm install
cp .env.example .env
docker compose up -d
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

See [docs/local-development.md](docs/local-development.md) for full run instructions and the manual acceptance checklist.

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
- `POST /api/orgs/:orgId/membership-plans`
- `POST /api/orgs/:orgId/subscriptions`
- `POST /api/payments/checkout`
- `POST /api/payments/mock/:sessionId/complete`
- `POST /api/orgs/:orgId/attendance/qr-token`
- `POST /api/attendance/scan`
- `POST /api/ai/chat`
- `POST /api/shop/orders`
- `GET /api/platform/orgs`

Mobile:

- `/` member home with dominant Scan QR action
- `/find-gyms`
- `/scan`
- `/plans`
- `/shop`
- `/profile`
- `/owner`
- `/reception`
- `/trainer`

## Mock Providers Included

- `MockEmailProvider`: prints/stores OTP delivery.
- `MockPaymentProvider`: hosted checkout session lifecycle.
- `MockMapProvider`: India city coordinates and Google Maps link fallback.
- `MockAIProvider`: deterministic text, structured plan, image placeholder, scope and safety classification.
- `MockPushProvider`: delivery recording.
- `MockSmsProvider`: future OTP stub.
- `LocalStorageProvider`: local signed URL/file metadata shape.

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
pnpm --filter @zook/core test
pnpm --filter @zook/web typecheck
pnpm --filter @zook/mobile typecheck
pnpm test:web
```

Database-backed Playwright login/mutation checks are gated with:

```bash
RUN_DB_WEB_TESTS=1 pnpm test:web
```

## Known MVP Limitations

- Mock checkout and provider mocks are intentionally local-only.
- Mobile screens are functional MVP surfaces with mocked local state; production API sync can be wired through TanStack Query.
- QR scan UI uses Expo Camera; simulator testing may require a physical device or pasted QR payload.
- Multi-branch data model exists, but UI focuses on one branch.
- OpenAI, Google Maps, real payments, SMS, production push, and S3/R2 are prepared but not implemented with live credentials.
- The physical iOS dev build omits the native `expo-notifications` package until an Apple provisioning profile with Push Notifications is configured; the backend push abstraction remains mocked.
- Database-dependent commands require local PostgreSQL via Docker.

## Acceptance Checklist

- Owner signs in, creates organization, configures location, plan, coupon, referral, staff, and dashboard.
- Member completes profile, searches gyms, uses referral/coupon, checks out, scans QR, views plans/goals/notifications, and buys pickup item.
- Receptionist handles check-ins, manual overrides, cash payments, pickup, and operational notices.
- Trainer manages clients, records offline PT, drafts AI plans, publishes to assigned clients, and sends scoped notifications.
- Admin/owner manages permissions, reports, audit, shop inventory, AI usage, billing, and privacy.
- Platform admin views organizations, updates org status, and inspects AI/abuse data.
- Minor is blocked before guardian consent and uses minor-safe defaults after consent.
