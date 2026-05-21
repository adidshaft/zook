# Zook Redesign Rollout Runbook

Last verified: 2026-05-21

## 1. DNS

[DASHBOARD] Create `dashboard.zookfit.in` as a CNAME:

| Record | Name | Value | Notes |
| --- | --- | --- | --- |
| CNAME | `dashboard` | `cname.vercel-dns.com` | Preferred Vercel subdomain target. |

[HUMAN-ONLY] Do not change apex DNS during this rollout. Keep `zookfit.in` on the existing production target.

Rollback: remove or disable only the `dashboard` CNAME. Existing `zookfit.in` traffic is unaffected.

## 2. Vercel Domain Provisioning

[CLI] If the Vercel CLI is authenticated to the production project:

```sh
vercel domains add dashboard.zookfit.in
vercel domains inspect dashboard.zookfit.in
```

[DASHBOARD] If CLI auth is not available, add `dashboard.zookfit.in` to the same Vercel project that serves `zookfit.in`, then wait for Vercel verification.

[BOTH] Confirm both domains resolve to the same web deployment:

```sh
curl -I https://zookfit.in
curl -I https://dashboard.zookfit.in/dashboard
```

Rollback: remove the Vercel domain assignment for `dashboard.zookfit.in`; keep the DNS record only if Vercel still reports it as safely detached.

## 3. Production Web Environment

[DASHBOARD] Set production web env vars before deploy. Use staging equivalents on preview/staging and live provider values on production.

| Var | Staging example | Production example |
| --- | --- | --- |
| `ACCOUNT_DELETION_RETENTION_DAYS` | `30` | `30` |
| `AI_FEATURES_ENABLED` | `false` | `true` or `false` |
| `ANALYZE` | unset | unset |
| `API_MODE` | `backend` | `backend` |
| `APP_ENV` | `staging` | `production` |
| `CACHE_PROVIDER` | `memory` | `redis` |
| `CRON_SECRET` | staging secret | production secret |
| `DATABASE_URL` | staging pooled Postgres URL | production pooled Postgres URL |
| `ENV_PROFILE` | `staging` | `production` |
| `ERROR_REPORTER` | `mock` or `sentry` | `sentry` |
| `FILE_UPLOADS_ENABLED` | `true` | `true` |
| `HOME` | CI-provided | CI-provided |
| `MAESTRO_BIN` | unset | unset |
| `MAESTRO_FLOW_TIMEOUT_MS` | unset | unset |
| `MAESTRO_IOS_UDID` | unset | unset |
| `NEXT_DIST_DIR` | unset | unset |
| `NEXT_PUBLIC_ANDROID_APP_URL` | internal test URL | Play Store URL |
| `NEXT_PUBLIC_APPLE_CLIENT_ID` | staging service id | production service id |
| `NEXT_PUBLIC_APPLE_REDIRECT_URI` | `https://staging.zookfit.in/api/auth/apple/callback` | `https://zookfit.in/api/auth/apple/callback` |
| `NEXT_PUBLIC_APP_NAME` | `Zook Staging` | `Zook` |
| `NEXT_PUBLIC_APP_URL` | `https://staging.zookfit.in` | `https://zookfit.in` |
| `NEXT_PUBLIC_DASHBOARD_URL` | `https://dashboard-staging.zookfit.in` | `https://dashboard.zookfit.in` |
| `NEXT_PUBLIC_ENV_PROFILE` | `staging` | `production` |
| `NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID` | staging OAuth client | production OAuth client |
| `NEXT_PUBLIC_IOS_APP_URL` | TestFlight link | App Store URL |
| `NEXT_PUBLIC_MOBILE_WEB_URL` | `https://staging.zookfit.in` | `https://zookfit.in` |
| `NEXT_PUBLIC_PAYMENT_PROVIDER_LABEL` | `Razorpay Test` | `Razorpay` |
| `NEXT_PUBLIC_SENTRY_DSN` | staging DSN | production DSN |
| `NEXT_PUBLIC_SENTRY_ENVIRONMENT` | `staging` | `production` |
| `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE` | `0.05` | `0.05` |
| `NEXT_PUBLIC_WEB_URL` | `https://staging.zookfit.in` | `https://zookfit.in` |
| `NEXT_RUNTIME` | platform-provided | platform-provided |
| `NODE_ENV` | `production` | `production` |
| `OTP_FIXED_CODE_DEV` | unset | unset |
| `RATE_LIMIT_NAMESPACE` | `zook-staging` | `zook-prod` |
| `RATE_LIMIT_PROVIDER` | `disabled` or `upstash` | `upstash` |
| `RUN_DB_WEB_TESTS` | unset | unset |
| `SENTRY_AUTH_TOKEN` | staging token | production token |
| `SENTRY_DSN` | staging DSN | production DSN |
| `SENTRY_ENVIRONMENT` | `staging` | `production` |
| `SENTRY_ORG` | org slug | org slug |
| `SENTRY_PROJECT` | web project slug | web project slug |
| `SENTRY_TRACES_SAMPLE_RATE` | `0.05` | `0.05` |
| `SENTRY_WEB_PROJECT` | web project slug | web project slug |
| `SERVER_CACHE_NAMESPACE` | `zook-staging` | `zook-prod` |
| `SERVER_CACHE_PROVIDER` | `memory` or `redis` | `redis` |
| `UPSTASH_REDIS_REST_TOKEN` | staging token | production token |
| `UPSTASH_REDIS_REST_URL` | staging URL | production URL |
| `WALKTHROUGH_INCLUDE_PUBLIC` | unset | unset |
| `WALKTHROUGH_ROLES` | unset | unset |
| `WEB_DEMO_FALLBACK` | `false` | `false` |
| `ZOOK_BUILD_VERSION` | git SHA | git SHA |
| `ZOOK_SAAS_MONTHLY_AMOUNT_PAISE` | `99900` | agreed production amount |

Rollback: restore the previous env snapshot and redeploy the previous Vercel deployment. Do not remove secrets during an incident unless the secret itself is compromised.

## 4. Production DB Migration

[CLI] Confirm the slug migration is additive-only:

```sh
sed -n '1,80p' packages/db/prisma/migrations/20260521090000_member_slugs/migration.sql
```

Expected SQL only adds nullable `User.slug` and a unique index:

```sql
ALTER TABLE "User" ADD COLUMN "slug" VARCHAR(32);
CREATE UNIQUE INDEX "User_slug_key" ON "User"("slug");
```

[CLI] Deploy migrations with the production connection string:

```sh
DATABASE_URL="$PROD_DATABASE_URL" pnpm db:deploy
```

Rollback: this migration is forward-compatible and nullable. Prefer app rollback only. Do not drop the column/index during rollout; schedule a separate DBA-reviewed rollback only if production writes prove impossible.

## 5. Slug Backfill

[CLI] Run after the migration:

```sh
DATABASE_URL="$PROD_DATABASE_URL" pnpm --filter @zook/db exec tsx scripts/backfill-member-slugs.ts
```

[BOTH] Idempotency check: `packages/db/scripts/backfill-member-slugs.ts` selects only users where `slug: null`, generates an 8-character slug, retries unique conflicts, and prints the updated count. A second run should print `Backfilled member slugs for 0 user(s).`

Rollback: leave generated slugs in place. They are additive public identifiers and old `/me` links still redirect/auth-gate.

## 6. Mobile EAS Builds

[CLI] Production profile now sets `EXPO_PUBLIC_INCLUDE_DEMO=false` in `apps/mobile/eas.json`. Build both platforms:

```sh
cd apps/mobile
EXPO_PUBLIC_INCLUDE_DEMO=false eas build --platform ios --profile production
EXPO_PUBLIC_INCLUDE_DEMO=false eas build --platform android --profile production
```

[HUMAN-ONLY] Submit/release from App Store Connect and Play Console only after prod smoke is green.

Rollback: keep the last approved store build available. If API rollout fails, pause phased release and point users back to the previous build.

## 7. Post-Rollout Smoke

[BOTH] Immediately verify:

| Area | Check |
| --- | --- |
| Public host | `https://zookfit.in/`, `/login`, `/g/<username>`, `/m/<slug>` load or auth-gate correctly. |
| Dashboard host | `https://dashboard.zookfit.in/dashboard`, `/desk`, `/coach`, `/platform` redirect unauthenticated users to login. |
| Host split | Public paths on dashboard host redirect back to `zookfit.in`; staff paths on public host redirect to dashboard host. |
| Auth | Email/OTP login, Google/Apple sign-in, refresh, logout. |
| Session payload | `/api/auth/session` returns member slug for authenticated member. |
| Permissions | Negative role checks return 403, especially platform/admin/staff boundaries. |
| Member | `/m/<slug>`, membership, plan, workout log, shop checkout, QR check-in. |
| Staff | Dashboard, desk check-in approve/reject, trainer roster, platform admin. |
| Payments | Razorpay test-mode checkout and webhook signature validation in staging; live webhook delivery in production. |
| Cron | `/api/cron/renewal-reminders` rejects without `CRON_SECRET` and succeeds with it. |
| Themes | Toggle light/dark on web and mobile; refresh and confirm persistence. |

