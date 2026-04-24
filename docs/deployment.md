# Deployment Guide

Last updated: 24 April 2026

## Recommended Stack

- Web/API: Vercel, Render, Railway, or Fly.io
- Database: Neon, Supabase Postgres, Railway Postgres, or self-managed Postgres
- Storage: local for development, S3-compatible object storage or Cloudflare R2 for staging
- Email: SMTP or Resend
- Maps: Google Maps optional
- AI: OpenAI optional
- Payments: mock by default today; keep Razorpay env reserved for the next rollout
- Mobile: Expo + EAS for preview and production binaries

## Environment Matrix

### Local

- `PAYMENT_PROVIDER=mock`
- `EMAIL_PROVIDER=mock`
- `MAP_PROVIDER=mock`
- `AI_PROVIDER=mock`
- `PUSH_PROVIDER=mock`
- `STORAGE_PROVIDER=local`
- `DATABASE_URL` points at a local Postgres instance

### Staging

- keep `PAYMENT_PROVIDER=mock` unless webhook handling is explicitly finished and tested
- switch `EMAIL_PROVIDER` to `smtp` or `resend` only when keys are present
- switch `MAP_PROVIDER=google` only when `GOOGLE_MAPS_API_KEY` is present
- switch `AI_PROVIDER=openai` only when `OPENAI_API_KEY` is present
- switch `STORAGE_PROVIDER=s3` or `r2` only when bucket credentials are present
- use HTTPS and a strong `SESSION_SECRET`

### Production

- only promote providers that have already been exercised in staging
- do not seed demo users unless explicitly required
- rotate provider keys and verify platform diagnostics after deploy

## Database And Migrations

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

- Use `pnpm db:seed` in local and demo staging only.
- Skip demo seeding in production unless you intentionally want sample data.
- `pnpm db:reset` is for local rebuilds and demo refreshes, not shared environments.

## Web Runtime

- Set `SESSION_SECRET` to a long random value.
- Use HTTPS in staging and production.
- Keep cookie auth on the web side and bearer auth on mobile.
- The current app already applies hardened response headers in `apps/web/next.config.ts`.

## Mobile Runtime

- `MOBILE_API_BASE_URL` should point to the deployed `/api` origin for preview and production.
- `NEXT_PUBLIC_WEB_URL` should point to the deployed web origin.
- `APP_SCHEME=zook` is already used for the app deep link scheme.
- Expo config currently reads the base URLs from env at build time.

Suggested EAS profiles:

- `development`: simulator/device builds against local or preview API
- `preview`: internal testing build against staging API
- `production`: store-ready build against production API

## Storage

- Local storage writes to `STORAGE_LOCAL_DIR`.
- Private local assets are served through signed internal URLs.
- Public local assets are served through an internal public file route.
- S3/R2 storage uses presigned delivery for private files and `S3_PUBLIC_BASE_URL` for stable public assets.

## Provider Readiness

Live-ready today:

- email via SMTP or Resend
- storage via local, S3-compatible, or R2-style endpoint
- maps via Google Maps
- AI via OpenAI

Still mock-first today:

- payments
- push delivery

Use `GET /api/platform/provider-status` as a final safe readiness check after deploy.

## Monitoring And Operations

- keep request IDs enabled in logs
- monitor provider setup errors from the API logs
- review org and platform audit logs regularly
- ensure database backups are enabled at the hosting layer
- add bucket lifecycle rules for nonessential file retention when moving past pilot

## Acceptance Notes

- `pnpm preflight` is the fastest local readiness check before starting web/mobile services
- `pnpm test:acceptance` prints DB-gated instructions when the local database env is not present
- `RUN_DB_WEB_TESTS=1 pnpm test:web` should only be used when the database is reachable and seeded

## Current Gaps

- Razorpay webhook hardening and real payment activation are not complete in this branch
- push delivery remains mock-only
- deployment automation files such as Docker or EAS profile config still need a dedicated rollout pass
