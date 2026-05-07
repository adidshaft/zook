# Zook Launch Runbook

## Pre-Deploy

1. Set `APP_ENV=production`, `API_MODE=backend`, `RATE_LIMIT_PROVIDER=upstash`, and all live provider env vars in the deployment secret store.
2. Run `pnpm install`, `pnpm db:generate`, `pnpm typecheck`, `pnpm test:unit`, `pnpm test:services`, `pnpm test:web`, `pnpm test:acceptance`, `pnpm release:preflight`, and `pnpm env:check`.
3. Apply migrations with `pnpm db:deploy` before promoting web traffic.
4. Run the load smoke baseline with `ZOOK_BASE_URL=https://staging.example pnpm test:load`.
5. Schedule `pnpm account-deletion:purge` daily. Default retention is `ACCOUNT_DELETION_RETENTION_DAYS=30`.

## Rollback

1. Stop traffic promotion.
2. Roll the app deployment back to the previous artifact.
3. If the failed release included a migration, inspect whether it is backward-compatible before database rollback.
4. Re-run `pnpm release:preflight` and provider readiness checks before retrying promotion.

## Provider Certificates

Razorpay:
- Configure live key ID, secret, and webhook secret.
- Send signed staging and production webhooks for success, failure, duplicate event, and out-of-order event paths.
- Confirm event IDs are idempotent in `PaymentEvent`.

Supabase Storage or S3/R2:
- For Supabase, set `STORAGE_PROVIDER=supabase`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_STORAGE_BUCKET=zook-uploads`.
- For S3/R2, set the matching S3/R2 credentials.
- Verify bucket scope per org, max file size, content-type whitelist, signed URL expiry, public CDN host, and delete permissions.
- Upload profile photo, payment proof, org cover, product image, invoice PDF, and privacy export samples.
- Local provider smoke passed against Supabase `zook-uploads` for list, upload, signed URL, and delete.

OpenAI:
- Keep `AI_FEATURES_ENABLED=false` for pilot launch; trainer manual plan creation, review, assignment, and member visibility are the launch workflow.
- To certify AI after launch, set `AI_PROVIDER=openai`, `AI_FEATURES_ENABLED=true`, and `OPENAI_API_KEY` in staging only.
- Verify quota, 401, 429, and 5xx behavior in staging with structured logs and audit records before enabling the feature flag anywhere else.

Push:
- EAS project is linked from `apps/mobile` to `@man22invisible/zook` with project ID `3ac0a41f-b9fd-4d91-accf-0e46f3313539`.
- Run physical-device QA on iOS and Android.
- Confirm foreground notification, background tap, and cold-start deep-link payload routing.

Sentry:
- Web project: `zook-web` in org `kyoka-suigetsu`.
- Mobile project: `zook-mobile` in org `kyoka-suigetsu`.
- Set `ERROR_REPORTER=sentry`, `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `EXPO_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`, and `SENTRY_ENVIRONMENT`.
- Local Sentry auth-token smoke passed against both Zook projects. Promote the token through the deployment secret store, not source control.
- Trigger one handled and one unhandled test exception in staging and verify breadcrumbs.

Upstash:
- Set `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, and `RATE_LIMIT_NAMESPACE`.
- Current database: `zook-rate-limit` in AWS Mumbai (`ap-south-1`).
- Local REST SET/GET/DEL smoke passed with the configured token.
- Confirm production preflight fails if the provider is unset, memory, disabled, or missing credentials.

Resend:
- Local Resend API smoke passed and the configured sender domain is verified.
- Promote `EMAIL_PROVIDER=resend`, `RESEND_API_KEY`, and `EMAIL_FROM` through the deployment secret store.
- Send one staging transactional email to an internal address and confirm SPF/DKIM/DMARC alignment before pilot traffic.

Supabase access note:
- The code-side Supabase Storage integration is complete and the CLI-authenticated smoke test passed against `zook-uploads` for list, upload, signed URL, and delete.
- Copy the same Supabase env values from local secret storage into staging/production deployment secret stores before release.

## On-Call Template

- Primary:
- Secondary:
- Escalation:
- Provider contacts:
- Rollback approver:
