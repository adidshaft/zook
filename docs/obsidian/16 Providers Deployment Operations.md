# Providers, Deployment, and Operations

Zook uses provider adapters selected by environment variables. Production deploys run on Vercel for the web/API surface.

## Provider Categories

| Category | Providers |
| --- | --- |
| Payments | Razorpay, mock, disabled |
| Email | Resend, SMTP, mock |
| SMS | Mock/provider-ready |
| WhatsApp | Mock/provider-ready |
| Push | Expo, mock, disabled |
| Storage | Supabase, local, S3/R2/provider-ready |
| AI | OpenAI, mock, disabled |
| Maps | Google, mock |
| Rate limits | Upstash, memory |
| Errors | Sentry, logger |

## Readiness Endpoints

- `/api/health`: lightweight liveness.
- `/api/ready`: DB and provider readiness.
- `/api/status`: public status payload.
- `/api/platform/provider-status`: admin-only provider diagnostics.

## Deployment

Production deployment is performed with:

```bash
vercel deploy --prod --yes
```

## Vercel Crons

- `/api/cron/renewal-reminders`: daily.
- `/api/cron/account-deletion-purge`: daily.
- `/api/cron/refund-reconcile`: every 10 minutes.
- `/api/cron/trainer-payouts-draft`: first day of each month.

## Release Checks

Recommended local checks:

```bash
pnpm typecheck
pnpm lint
pnpm test:unit
pnpm test:services
pnpm test:db:prepare
RUN_DB_WEB_TESTS=1 pnpm test:web
pnpm release:preflight
```

Some CI workflows were intentionally skipped in this thread per owner instruction.

