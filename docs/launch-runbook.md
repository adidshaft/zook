# Zook Launch Runbook

## Pre-Deploy

1. Set `APP_ENV=production`, `API_MODE=backend`, `RATE_LIMIT_PROVIDER=upstash`, and all live provider env vars in the deployment secret store.
2. Run the full release suite:

   ```bash
   pnpm install --frozen-lockfile
   pnpm typecheck
   pnpm test:unit
   pnpm test:services
   pnpm test:web
   pnpm test:acceptance
   pnpm db:generate
   pnpm release:preflight
   APP_ENV=local API_MODE=backend pnpm preflight
   pnpm env:check
   pnpm check:i18n
   pnpm check:launch-gates
   pnpm audit --audit-level high
   ```

3. Apply migrations with `pnpm db:deploy` before promoting web traffic.
4. Run the load smoke baseline with `ZOOK_BASE_URL=https://staging.example pnpm test:load`.
5. Schedule `pnpm account-deletion:purge` daily. Default retention is `ACCOUNT_DELETION_RETENTION_DAYS=30`.
6. Keep staging/prod HTTPS-only. Session cookies are always `secure`.

## Rollback

1. Stop traffic promotion.
2. Roll the app deployment back to the previous artifact.
3. If the failed release included a migration, inspect whether it is backward-compatible before database rollback.
4. Re-run `pnpm release:preflight` and provider readiness checks before retrying promotion.

## Provider Certificates

Use `docs/production-provider-certification.md` as the evidence checklist and
`docs/production-incident-checklist.md` as the live support checklist. Do not
mark a provider certified from code inspection alone.

Razorpay:
- Configure live key ID, secret, and webhook secret.
- Send signed staging and production webhooks for success, failure, duplicate event, and out-of-order event paths.
- Confirm event IDs are idempotent in `PaymentEvent`.

Storage:
- For Supabase, set `STORAGE_PROVIDER=supabase`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_STORAGE_BUCKET`.
- For S3/R2, set the matching S3/R2 credentials.
- Verify bucket scope per org, max file size, content-type whitelist, magic-byte rejection, signed URL expiry, public CDN host, delete permissions, and file-read audit entries.
- Upload profile photo, payment proof, org cover, product image, invoice PDF, and privacy export samples.

OpenAI:
- Keep `AI_FEATURES_ENABLED=false` for pilot launch unless staging certification is complete.
- To certify AI after launch, set `AI_PROVIDER=openai`, `AI_FEATURES_ENABLED=true`, and `OPENAI_API_KEY` in staging only.
- Verify quota, 401, 429, malformed response, prompt-injection rejection, and 5xx behavior in staging with structured audit records before enabling the feature flag anywhere else.

Push:
- Run physical-device QA on iOS and Android.
- Confirm foreground notification, background tap, and cold-start deep-link payload routing.
- Confirm payloads contain only `notificationId` and `type`.

Sentry:
- Set `ERROR_REPORTER=sentry`, `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `EXPO_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_AUTH_TOKEN`, and `SENTRY_ENVIRONMENT`.
- Set `SENTRY_WEB_PROJECT` and `SENTRY_MOBILE_PROJECT`. `SENTRY_PROJECT` remains accepted only as a fallback when both targets intentionally share a project.
- Promote Sentry secrets through the deployment secret store, not source control.
- Trigger one handled and one unhandled test exception in staging and verify redaction, breadcrumbs, source maps, and release association.

Upstash:
- Set `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, and `RATE_LIMIT_NAMESPACE`.
- Confirm production preflight fails if the provider is unset, memory, disabled, or missing credentials.

Resend:
- Set `EMAIL_PROVIDER=resend`, `RESEND_API_KEY`, and `EMAIL_FROM` through the deployment secret store.
- The Resend account reached 100% of its daily limit on 2026-05-08 (Asia/Kolkata). Do not run staging transactional email smokes until the quota resets or the sending limit is raised.
- Before pilot traffic, send one staging transactional email to an internal address and confirm SPF/DKIM/DMARC alignment.

## Membership Operations

Phase 2 platform support console:
- Platform admins can handle day-1 support from `/platform`: user lookup, session revocation,
  impersonation start/end, cross-tenant payment search/refund, webhook replay, global audit,
  broadcasts, feature flags, moderation decisions, and org danger actions.
- Production migration to apply before the Phase 2 app artifact is promoted:
  `20260524160000_phase2_platform_console`. It adds impersonation-bound session columns,
  impersonation expiry, and `OrganizationStatus.DELETED`.
- Keep the `platform.impersonation` feature flag OFF in production until the impersonation flow
  is pen-tested. The console may create/read the flag row, but production rollout should remain
  disabled unless explicitly approved.
- Impersonation sessions have a 60-minute hard cap, show a global red banner, write
  `impersonationSessionId`/`originalUserId` into audit metadata, and cannot be used for refunds,
  account deletion, data export, email changes, phone changes, or platform-admin targets.
- Phase 2 local verification on 2026-05-24 passed `pnpm db:generate`, `pnpm --filter @zook/web
  typecheck`, `pnpm typecheck`, `pnpm lint`, `pnpm test:unit`, `pnpm test:services`, `pnpm
  test:db:prepare`, `pnpm test:web`, and targeted Playwright
  `apps/web/tests/platform-console.spec.ts`. The broad DB acceptance aggregate was intentionally
  skipped after an unrelated members workflow timeout per the local-only merge direction.
- Production deployment and live smoke for Phase 2 are deferred to the end of the full hardening
  sequence.

Phase 1 hardening:
- Guardian-consent gating is deprecated. Under-18 DOBs must not block membership activation,
  attendance, plan assignment, notification delivery, AI consent, or PT subscription activation.
- Keep historical `GuardianConsent` records intact for privacy export, deletion, and audit review.
- Legacy guardian routes should redirect home, and legacy guardian APIs should return deprecation
  responses without creating new challenges.
- Production deployment on 2026-05-24 20:47 IST shipped PR #44 through Vercel deployment
  `https://zook-gym-lkq7uwgb3-adidshafts-projects.vercel.app`, aliased to `https://zookfit.in`,
  `https://app.zookfit.in`, `https://www.zookfit.in`, and `https://dashboard.zookfit.in`.
- Production migration gate applied `20260524000000_hardening_pass_phase0`; Phase 1 added no
  destructive data migration.
- Supabase backups before deploy: schema
  `/Users/amanpandey/Documents/keys/zook/db-backups/supabase-before-phase1-deploy-20260524-204435.sql`
  and data
  `/Users/amanpandey/Documents/keys/zook/db-backups/supabase-before-phase1-deploy-data-20260524-204700.sql`.
- Smoke on 2026-05-24 20:51 IST: `/api/ready` returned `ready=true` and
  `database.reachable=true`; `/guardian-consent` and `/guardian/consent/phase1-smoke` returned
  200 without active "guardian consent" copy.

Plan switching:
- Members can request a switch from their membership view.
- Owners/admins can switch a member subscription from the members dashboard.
- Proration policy: unused value on the current plan is converted into extra days on the new plan using the new plan's daily rate. Cash refunds remain a manual finance decision.

Pause/freeze:
- Default pause cap is 30 days per subscription year.
- Override with org settings `membershipPauseCapDaysPerYear` or `pauseCapDaysPerYear`.
- Pausing records `pausedAt`, `resumesAt`, `pauseDaysUsed`, and audit metadata. Resuming clears `pausedAt`/`resumesAt` and keeps the cumulative day count.

Plan-published fanout:
- Publish sends in-app and push notifications.
- Email fanout is opt-in and provider-gated. If Resend quota is exhausted, retry after quota reset or switch to a certified provider.

## On-Call Template

- Primary: Aman Pandey — phone TBD, Slack @aman
- Secondary: (assign before widening beyond pilot)
- Escalation: If primary unreachable for 30 min, secondary takes over. If both unreachable, roll back to last known good deployment.
- Provider contacts:
  - Razorpay support: https://dashboard.razorpay.com/support
  - Resend support: https://resend.com/support
  - Supabase support: https://supabase.com/dashboard/support
  - Vercel support: https://vercel.com/support
  - Sentry: https://sentry.io/support/
- Rollback approver: Aman Pandey (primary)
