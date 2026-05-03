# Deployment Guide

Last updated: 3 May 2026

## Private Pilot Goal

Phase 4 keeps local development mock-first while making staging realistic enough for a controlled gym pilot:

- web/API can run in a standalone container build
- `/api/health` is lightweight and safe for liveness checks
- `/api/ready` checks Prisma, database reachability, and safe provider readiness
- staging can use real email, storage, maps, AI, Razorpay test mode, and Expo push if env is configured
- production still requires stricter env validation through `pnpm release:preflight`

## Runtime Profiles

### Local

- `APP_ENV=local`
- `ENV_PROFILE=local`
- `API_MODE=backend` by default, or `API_MODE=offline-demo` for local fixture-only QA
- mock providers allowed
- fixed OTP allowed when `OTP_FIXED_CODE_DEV` is set
- seeded demo users allowed
- recommended providers:
  - `PAYMENT_PROVIDER=mock`
  - `EMAIL_PROVIDER=mock`
  - `MAP_PROVIDER=mock`
  - `AI_PROVIDER=mock`
  - `PUSH_PROVIDER=mock`
  - `STORAGE_PROVIDER=local`

### Staging

- `APP_ENV=staging`
- `ENV_PROFILE=staging`
- `API_MODE=backend`
- real database required
- strong `SESSION_SECRET` required
- fixed OTP disabled unless `ALLOW_FIXED_OTP_IN_STAGING=1`
- mock payment completion disabled unless `ALLOW_MOCK_PAYMENT_COMPLETION=1`
- recommended providers:
  - `PAYMENT_PROVIDER=razorpay` with test-mode keys, `disabled` if purchases are intentionally unavailable, or explicit `mock` for internal-only rollout
  - `EMAIL_PROVIDER=smtp|resend|mock`
  - `MAP_PROVIDER=google|mock`
  - `AI_PROVIDER=openai|mock|disabled`
  - `PUSH_PROVIDER=expo|mock|disabled`
  - `STORAGE_PROVIDER=local|s3|r2`

### Production

- `APP_ENV=production`
- `ENV_PROFILE=production`
- `API_MODE=backend`
- fixed OTP forbidden
- offline demo mode forbidden
- mock payment completion forbidden
- mock email forbidden
- mock payment forbidden unless `MAINTENANCE_MOCK_MODE=1`
- strong `SESSION_SECRET` required
- public URLs required
- seed demo users disabled by default

## Required Checks

Run these before deploy:

```bash
pnpm env:check
pnpm release:preflight
pnpm lint
pnpm typecheck
pnpm test:services
pnpm test:unit
pnpm test:web
```

Database-backed acceptance checks:

```bash
RUN_DB_WEB_TESTS=1 pnpm test:web
pnpm test:acceptance:db
```

## Environment Matrix

Core env:

- `DATABASE_URL`
- `SESSION_SECRET`
- `ZOOK_QR_SECRET`
- `NEXT_PUBLIC_WEB_URL`
- `NEXT_PUBLIC_APP_URL`
- `MOBILE_API_BASE_URL`
- `ENV_PROFILE`

Payments:

- `PAYMENT_PROVIDER=mock|razorpay|disabled`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `RAZORPAY_MODE=test|live`
- `RAZORPAY_CHECKOUT_THEME_COLOR` optional

Push:

- `PUSH_PROVIDER=mock|expo|disabled`
- `EXPO_PROJECT_ID`
- `EXPO_ACCESS_TOKEN` optional
- `PUSH_ENVIRONMENT=development|preview|production`

Email:

- `EMAIL_PROVIDER=mock|smtp|resend`
- `EMAIL_FROM`
- `RESEND_API_KEY`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`

Storage:

- `STORAGE_PROVIDER=local|s3|r2`
- `STORAGE_LOCAL_DIR`
- `S3_BUCKET`
- `S3_REGION`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `S3_ENDPOINT` optional
- `S3_PUBLIC_BASE_URL` optional
- `R2_ACCOUNT_ID` optional

AI:

- `AI_PROVIDER=mock|openai|disabled`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `OPENAI_IMAGE_MODEL`
- `OPENAI_TIMEOUT_MS`

Maps:

- `MAP_PROVIDER=mock|google`
- `GOOGLE_MAPS_API_KEY`

Observability:

- `ERROR_REPORTER=mock|sentry`
- `SENTRY_DSN`
- `SENTRY_ENVIRONMENT`

## Database And Seeding

Local/demo setup:

```bash
pnpm db:generate
pnpm db:push
pnpm seed:demo
pnpm seed:pilot
```

Shared environments:

```bash
pnpm db:deploy
```

Notes:

- use `pnpm seed:pilot` only for demo or staging environments meant to hold sample gyms
- do not run destructive reset or demo seed commands against a real pilot database
- enable managed Postgres backups at the hosting layer
- keep a rollback-ready database snapshot before Prisma migrations

## Container Deployment

Phase 4 adds:

- `Dockerfile`
- `.dockerignore`
- `docker-compose.prod.example.yml`

The Docker image builds the standalone Next.js server:

```bash
docker build -t zook-web:phase4 .
docker run --rm -p 3000:3000 --env-file .env zook-web:phase4
```

The compose example is a staging-style reference only. Replace placeholder secrets before use.

## Health And Readiness

- `GET /api/health`
  - no database dependency
  - returns app alive, version, env profile, timestamp
- `GET /api/ready`
  - checks Prisma/database reachability
  - returns safe provider summaries without leaking secrets
  - returns `503` when readiness fails

Recommended checks:

```bash
curl http://localhost:3000/api/health
curl http://localhost:3000/api/ready
```

## Web Runtime

- `apps/web/next.config.ts` now uses `output: "standalone"`
- security headers stay enabled through Next config
- request IDs are included in API responses
- request logging records method, path, status, duration, and actor context without secrets

## Mobile Builds

Phase 4 mobile release config now includes:

- app name `Zook`
- slug `zook`
- scheme `zook`
- iOS bundle identifier placeholder `com.zook.app`
- Android package placeholder `com.zook.app`
- EAS profiles:
  - `development`
  - `preview`
  - `production`

Build from `apps/mobile`:

```bash
npx eas-cli@latest build -p ios --profile development
npx eas-cli@latest build -p android --profile preview
npx eas-cli@latest build --profile production
```

Local device note:

- iOS simulator can use `127.0.0.1`
- Android emulators should use `10.0.2.2`
- physical devices must use a LAN IP or tunnel host

## Webhooks

Razorpay webhook route:

- `POST /api/payments/webhooks/razorpay`
- verifies raw-body HMAC signature
- persists webhook events and attempts
- handles duplicates idempotently
- updates payment sessions through server-side activation only

Pilot recommendation:

- keep Razorpay in `test` mode first
- point the provider webhook to staging only after `pnpm release:preflight` is green

## Cookies, Origins, And CORS

- web session cookie remains HTTP-only
- use HTTPS for staging and production
- keep `NEXT_PUBLIC_WEB_URL` and `NEXT_PUBLIC_APP_URL` aligned to public origins
- do not expose provider secrets to browser or mobile clients

## Incident And Rollback Notes

When a deploy goes wrong:

1. stop traffic or roll back the container/platform release
2. review `/api/ready`, platform provider diagnostics, and application logs
3. inspect `PaymentEvent`, `PaymentWebhookAttempt`, `PushDelivery`, and `IncidentLog` for operational fallout
4. roll back to the last known-good image and, if required, restore the pre-migration database snapshot

## Current Pilot Limitations

- mobile still opens hosted checkout and does not deep-link back automatically
- native push registration UI is not yet fully wired into the Expo app
- Sentry remains a scaffold, not a full SDK integration
- the Docker example covers the web/API runtime only, not a full managed Postgres or object-storage stack
