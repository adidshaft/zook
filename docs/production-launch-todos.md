# Zook Production Launch TODOs

This file tracks launch decisions that are intentionally placeholder-backed right now. Do not treat the public legal pages or store metadata as final until every item below is resolved and rechecked.

## Legal Details To Finalize

- ~~Legal entity name for Zook.~~
- ~~Registered office or public correspondence address.~~
- ~~Public support email, privacy email, and billing/refund email.~~
- Public support phone number, if any.
- Final refund and cancellation policy for:
  - Zook platform/software fees.
  - Gym memberships purchased through Zook.
  - Duplicate, failed, or accidental Razorpay charges.
- Governing law and dispute jurisdiction. Default assumption for now: India.
- Final age/minor policy for members using guardian consent.
- Before launching any future fitness, training, medical, diet, or data-analysis vertical beyond current gym operations, update the privacy policy, store privacy labels, and in-app consent where required.

## Current Placeholder Defaults

- Production domain: `zookfit.in`.
- App identifiers: iOS bundle ID `com.zook.app`, Android package `com.zook.app`.
- Support, privacy, billing, and refund email: `support@zookfit.in`.
- Legal entity: `Kyoka Suigetsu LLP`.
- Public correspondence address: `India`.
- Refund placeholder: gyms control membership refunds; Zook reviews duplicate, failed, or accidental platform charges.
- Current data-use posture: personal data is not sold and is not used for third-party advertising or cross-app tracking.
- Future data-use posture: aggregated and operational data may support product improvement and future fitness-related services only after the privacy/store disclosures are updated as needed.

## App Store Connect Checklist

- ~~Apple Developer account/team access confirmed.~~
- ~~Bundle ID created for `com.zook.app`.~~
- ~~App category set to Health & Fitness.~~
- ~~Add privacy policy URL: `https://zookfit.in/privacy`.~~
- ~~Add support URL: `https://zookfit.in/support`.~~
- Keep terms available at `https://zookfit.in/terms` and support email at `support@zookfit.in`.
- App Privacy nutrition labels:
  - Contact Info: name, phone number, email address.
  - User Content: profile photos, support messages, gym/member uploaded media.
  - Health & Fitness: workout plans, training progress, body or fitness progress where used.
  - Purchases: membership/shop payment status, receipts, subscription records.
  - Identifiers: user ID, device token, push token.
  - Usage Data: check-ins, app interactions, notification interactions.
  - Diagnostics: crash and performance data through Sentry.
  - Location: gym/branch location and user-entered/search context only; no continuous GPS tracking.
- Mark data as linked to user identity.
- Do not mark third-party advertising or cross-app tracking.
- Camera purpose: scan gym attendance QR codes.
- Push purpose: membership, attendance, plan, payment, shop, reminder, and gym update notifications.
- Confirm account deletion/export is visible in app settings.
- Submit first build to internal TestFlight before public review.

Status on 2026-05-09: App Store Connect access is confirmed under the current logged-in Apple account. App record `6767848585` exists with bundle `com.zook.app`, version `1.0`, SKU `zook-ios-2026`, primary category Health & Fitness, secondary category Business, privacy policy URL `https://zookfit.in/privacy`, support URL `https://zookfit.in/support`, marketing URL `https://zookfit.in`, and copyright `© 2026 Kyoka Suigetsu LLP`. The public App Store listing name is `Zook Fit` because Apple would not allow the exact name `Zook`; the installed Expo app display name remains `Zook`. App metadata is partially saved. Pending: App Privacy questionnaire, age rating, regulated medical device declaration, screenshots, build/TestFlight upload, and app review contact/test credentials.

## Google Play Console Checklist

- ~~Google Play Console account access confirmed.~~
- ~~Package name confirmed as `com.zook.app`.~~
- App category set to Health & Fitness.
- Add privacy policy URL: `https://zookfit.in/privacy`.
- Complete Data Safety:
  - Personal info: name, phone number, email address.
  - Photos/files: profile photos, gym photos, product photos, payment proof where used.
  - App activity: attendance/check-ins, notifications, role flows, app interactions.
  - Financial info: payment status, receipts, membership/shop order records.
  - Health and fitness: training plan/progress data where used.
  - Device or other IDs: user ID, device token, push token.
  - Diagnostics: crash and performance data.
  - Data encrypted in transit.
  - Account deletion available in app settings and by support request.
  - No ads tracking.
- Permission declarations:
  - Camera: attendance QR scanning.
  - Notifications: membership, attendance, plan, payment, shop, and reminder updates.
  - Photos/media picker: profile, gym, shop, and proof uploads.
- Use internal testing before closed/open/production tracks.

Status on 2026-05-09: Google Play Console access is confirmed and the Zook Android app record has been created. Play app name is `Zook Fit`, package is `com.zook.app`, default language is English (United States), app type is App, pricing is Free, and Play app id is `4973333503995180622`. Pending: app category, store listing, privacy policy URL, Data Safety, permissions declarations, app content questionnaire, internal test release, closed test, and production access request.

Owner handoff remaining before production:

1. Upload the first signed Android App Bundle for `com.zook.app`.
2. Add at least 12 closed-test opted-in testers and run the required 14-day closed test.
3. Apply for production access after closed-test evidence is available.

## MSG91 SMS OTP Checklist

- ~~Confirm MSG91 account and KYC status.~~
- ~~Verify MSG91 account phone access for AuthKey creation.~~
- ~~Create restricted `ZookProdOTP` AuthKey for production OTP sending.~~
- ~~Disable MSG91 AuthKey IP security for serverless/Vercel runtime.~~
- ~~Use direct `SMS_PROVIDER=msg91`; no secured bridge endpoint is required for launch.~~
- ~~Submit India DLT registration under Kyoka Suigetsu LLP.~~
- ~~Add approved DLT Entity/PE ID `1701177833405088770` in MSG91.~~
- ~~Create Sender ID/header `KYOKA` in MSG91 for India SMS delivery.~~
- Submit Sender ID/header `ZOOKFT` in STPL and wait for operator/global approval.
- Create OTP template for phone sign-in.
- Set production env:
  - `SMS_PROVIDER=msg91` after `MSG91_TEMPLATE_ID` is available
  - ~~`MSG91_AUTH_KEY`~~
  - `MSG91_TEMPLATE_ID`
  - ~~optional `MSG91_SENDER_ID`~~
  - ~~optional `MSG91_OTP_EXPIRY_MINUTES`~~
- Test successful OTP, invalid phone, rate limit, provider failure, and retry copy.

Status on 2026-05-09: MSG91 account access is confirmed, KYC is reported complete, and AuthKey access is unlocked after mobile verification. A direct `SMS_PROVIDER=msg91` runtime provider has been added locally, so no separate SMS bridge is required for launch. AuthKey `ZookProdOTP` was created with rule `Zook OTP Send Only`, use case `zookfit.in`, active status, and IP security off for Vercel/serverless compatibility. `MSG91_AUTH_KEY` and `MSG91_OTP_EXPIRY_MINUTES` are saved in `.env.production.local` and mirrored into `/Users/amanpandey/Documents/keys/zook/zook-production-local.env`. DLT registration has been submitted under Kyoka Suigetsu LLP and is processing. Use the approved DLT Entity/PE ID from that registration when MSG91 asks for the entity ID; do not invent a separate value while approval is pending. Pending: create/approve an India Sender ID/header, create/select the OTP template, save `MSG91_TEMPLATE_ID` and optional `MSG91_SENDER_ID` in the deployment secret store, and run a real OTP send test.

Update on 2026-05-10: MSG91 Sender ID/header `ZOOKFT` was created for India with DLT Entity/PE ID `1701177833405088770`; MSG91 shows the header status as `Added`. The OTP template form is still blocked on the separate approved DLT Template ID, so `SMS_PROVIDER` remains disabled locally until `MSG91_TEMPLATE_ID` can be set without breaking production OTP requests.

Update on 2026-05-10 22:16 IST: STPL DLT header request for `ZOOKFT` was submitted after OTP verification. STPL currently lists the header with global status `Work In Progress`, so the content template form still says no header is registered and cannot associate the OTP template yet. Next step is to wait for STPL/operator approval, then create the OTP content template and capture its DLT Template ID for MSG91/Vercel.

Update on 2026-05-15: Aman confirmed the approved DLT header is `KYOKA`, so the local production snapshot now uses `MSG91_SENDER_ID=KYOKA`. `KYOKA` was also added/mapped inside the MSG91 SendOTP template flow with DLT Entity/PE ID `1701177833405088770`. The STPL OTP content template `Zook sign in OTP` was submitted under `KYOKA` as Service Implicit / Health with content `Your Zook Fit login OTP is {#var#}. It is valid for 10 minutes. Do not share this code with anyone. - KYOKA`; STPL currently shows Global Status `Work In Progress`. Pending: wait for STPL/operator approval, capture the approved DLT Template ID for `MSG91_TEMPLATE_ID`, set `SMS_PROVIDER=msg91`, create/select the MSG91 SendOTP template, redeploy, and run a real phone OTP smoke.

## Supabase Production Database Checklist

- ~~Create production Supabase Postgres project in the chosen region.~~
- ~~Generate and store production DB reset password in the private key folder.~~
- ~~Fill and owner-approve the Supabase database password reset flow.~~
- ~~Verify the new production `DATABASE_URL` connects locally.~~
- ~~Store production `DATABASE_URL` only in the deployment secret store.~~
- ~~Run migrations with `pnpm db:deploy`.~~
- ~~Resolve production schema drift before migration deploy.~~
- ~~Run release preflight against production or staging clone before traffic.~~
- ~~Enable SSL enforcement after confirming all production DB clients use SSL-compatible URLs.~~
- Configure backups, point-in-time recovery if available, and database access controls.
- Keep a separate staging database; never use production for DB-backed tests.

Status on 2026-05-09: Supabase project `zook-gym` is confirmed in Singapore/ap-southeast-1, project ref `itletisriwmnjxgeyttv`, and storage bucket `zook-uploads` exists. Supabase storage env values were captured locally without printing secrets. A strong database password was generated, saved in the ignored local file `.env.production.local`, mirrored into `/Users/amanpandey/Documents/keys/zook/`, filled into the Supabase reset dialog, and owner-approved in the browser. Prisma can connect to the production database. The existing public schema had no product/customer rows; only 2 `PaymentEvent` rows and 4 `PaymentWebhookAttempt` rows existed. A backup was saved to `/Users/amanpandey/Documents/keys/zook/db-backups/supabase-before-migration-reset-20260509-200617.sql`, then the public schema was reset and all 18 repo migrations were applied cleanly. `prisma migrate status` now reports that the database schema is up to date. The Vercel production `DATABASE_URL` now uses the verified Supabase pooler host because Vercel could not reach the direct database host. Pending: configure backups/PITR if available.
Update on 2026-05-10 17:05 IST: production migration deploy applied `20260510120000_refresh_sessions`, adding refresh-token session columns for the 15-minute access token / 30-day refresh token flow. `prisma migrate status` reports all 19 migrations applied and the production database schema up to date.
Update on 2026-05-10 20:10 IST: SSL enforcement was enabled in Supabase by the owner, and production stayed healthy afterward. Live `/api/ready` continued to report the database as reachable, and DB-backed Playwright acceptance coverage passed after the change. PITR and advanced backup controls remain plan-dependent and intentionally skipped on the Free plan unless the launch posture changes.

## Sign-In Providers Checklist

- ~~Keep phone OTP and email OTP as separate first-class sign-in choices on web and mobile.~~
- ~~Add backend callbacks for Sign in with Apple and Google Sign-In.~~
- ~~Verify Apple and Google ID tokens server-side before creating a Zook session.~~
- ~~Add linked identity storage so provider account IDs are remembered securely.~~
- ~~Wire mobile Apple/Google buttons to the backend callback endpoints.~~
- ~~Add web Apple/Google buttons with public client-id configuration.~~
- ~~Configure Google OAuth client IDs for web, iOS, and Android in production secrets.~~
- ~~Configure Apple Sign in service/app ID values in production secrets.~~
- Test Apple and Google sign-in on iOS simulator/device, Android, and Chrome.

Status on 2026-05-09: Additive auth identity schema and migration `20260509193000_auth_identities` were added. Web and mobile type checks pass after the Apple/Google/email sign-in changes. Native iOS Apple sign-in capability/config is present in Expo config. `.env.example`, `.env.production.local`, and `/Users/amanpandey/Documents/keys/zook/zook-production-local.env` now include grouped sign-in provider variables. Pending: fill the actual Google/Apple client IDs from the provider consoles and run real sign-in tests after the credentials are active.
Update on 2026-05-10 17:05 IST: Zook-owned email OTP is live-configured through `EMAIL_PROVIDER=resend`; `/api/ready` reports the email provider as `resend`/`ready` in production. The codebase does not use Supabase Auth for sign-in; Supabase is currently the production Postgres/storage provider, while Zook session auth sends OTP through the configured email provider. Google/Apple OAuth client IDs remain pending.
Update on 2026-05-10 20:10 IST: Google OAuth client IDs and Apple Sign in public values are present in the production env snapshot. Expo production config resolves all three Google mobile/web client IDs as configured, with iOS bundle `com.zook.app`, Android package `com.zook.app`, Apple Sign In enabled, API `https://zookfit.in/api`, and web URL `https://zookfit.in`. Real provider sign-in still needs browser/device smoke after OAuth propagation and store builds.

## Razorpay Live Checklist

- Confirm live account activation and KYC approval.
- ~~Generate and store live `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET` locally.~~
- ~~Set local production snapshot to `PAYMENT_PROVIDER=razorpay` and `RAZORPAY_MODE=live`.~~
- ~~Confirm webhook URL exists: `https://dashboard.zookfit.in/api/payments/webhooks/razorpay`.~~
- ~~Confirm live webhook has payment/order/refund event subscriptions enabled.~~
- ~~Submit `zookfit.in` as the Razorpay live website.~~
- ~~Wait for Razorpay approval of `zookfit.in`.~~
- Enter or rotate the generated webhook secret in Razorpay dashboard if the existing webhook secret cannot be verified.
- Certify success, failure, duplicate webhook replay, out-of-order event, and refund flow.

Status on 2026-05-09: Razorpay dashboard access is confirmed. Live mode is reachable, live API keys were generated and saved in `.env.production.local`, and a webhook secret was generated locally and mirrored into `/Users/amanpandey/Documents/keys/zook/zook-production-local.env`. The live webhook exists and is enabled at `https://dashboard.zookfit.in/api/payments/webhooks/razorpay` with 16 subscribed events. `https://zookfit.in` is verified in Razorpay and is the only public Zook product domain to use in product copy, redirects, app metadata, and checkout handoff links. Razorpay states that API keys are universal across approved websites/apps, so the existing live key can be used for Zook. Live Razorpay values were synced into the Vercel deployment secret store. Pending: verify or rotate the dashboard webhook secret to match the stored value, certify signed webhook delivery, and remove any legacy non-Zook website entries from vendor dashboards when it is safe to do so.

## Final Pre-Launch Gate

- ~~`pnpm check:i18n`~~
- ~~`pnpm typecheck`~~
- ~~`pnpm env:check` with SMS disabled until MSG91 DLT/template approval~~
- ~~`pnpm check:launch-gates`~~
- ~~Expo production public config check.~~
- ~~Web smoke for `/privacy`, `/terms`, `/login`, `/gyms`, `/dashboard`, and checkout.~~
- iOS TestFlight smoke.
- Android internal testing smoke.

Status on 2026-05-09: `pnpm check:i18n`, `pnpm typecheck`, and `pnpm check:launch-gates` passed. Local `pnpm env:check` passes with warnings for local-safe mocks and memory rate limiting. Production env remains blocked until production `DATABASE_URL`, Razorpay live keys/webhook secret, real SMS provider settings, and production provider selections are finalized. Earlier provider snapshots passed Resend email, Upstash rate limiting/cache, Google Maps, Expo push, Sentry DSNs, and Supabase storage.
Update on 2026-05-09 18:56 IST: local production snapshot now includes Supabase DB URL/password candidate, Razorpay live keys/webhook secret, and MSG91 AuthKey. Production deployment remains blocked by MSG91 DLT sender/template ID, Supabase connection verification/migration, Razorpay webhook-secret verification, and deployment secret upload.
Update on 2026-05-09 19:35 IST: `.env.production.local` has been pretty-formatted into readable provider sections and mirrored to `/Users/amanpandey/Documents/keys/zook/zook-production-local.env`. Targeted TypeScript checks pass for `apps/web`, `apps/mobile`, and `packages/core`. Production `env:check` now passes provider checks for Resend, Razorpay, Supabase Storage, Google Maps, Expo push, Sentry, and Upstash, but still has two blockers: local shell cannot find `pnpm`, and `MSG91_TEMPLATE_ID` is unavailable until DLT sender/template approval. Supabase connection is verified, but migration deploy remains blocked by schema drift/P3005.
Update on 2026-05-09 20:15 IST: the local `pnpm` PATH issue is fixed in repo scripts by resolving `/usr/local/bin/pnpm`/Homebrew fallbacks; `pnpm env:check` now detects `pnpm 10.16.0`, and `pnpm typecheck` passes through Turbo. Supabase schema drift is resolved and `pnpm db:deploy` reports no pending migrations. Production `env:check` has one remaining blocker: `MSG91_TEMPLATE_ID`, which depends on DLT sender/template approval.
Update on 2026-05-09 23:40 IST: production Vercel env is synced for Resend, Razorpay, Supabase storage/database, Google Maps, Expo push, Sentry, Upstash, and SMS disabled mode. `pnpm env:check` passes with expected warnings for fixed OTP absence and AI disabled. Vercel deployment `zook-gym-80lwie8dv-adidshafts-projects.vercel.app` is live and aliased to `zookfit.in`, `www.zookfit.in`, `app.zookfit.in`, and `dashboard.zookfit.in`; product pages should resolve canonically to `https://zookfit.in`, with stale page hosts redirected there by middleware. Smoke checks return 200 for `/login`, `/privacy`, `/terms`, `/support`, `/sitemap.xml`, `/robots.txt`, and dashboard redirects to login when unauthenticated. Expo public config resolves to production API `https://zookfit.in/api`, web `https://zookfit.in`, iOS bundle `com.zook.app`, Android package `com.zook.app`, and associated domains for `zookfit.in`/`app.zookfit.in`. EAS production env now has production profile/API mode, Sentry mobile DSN/project/auth token, Expo project id, mobile API URL, and web URL; Google OAuth client IDs are still not set.
Update on 2026-05-10 17:15 IST: local release suite passed: `pnpm turbo run typecheck lint`, `pnpm test`, `RUN_DB_WEB_TESTS=1 pnpm test:web`, `pnpm test:acceptance`, `pnpm build`, production `pnpm env:check`, and production `pnpm release:preflight`. Expo public production config resolves to API `https://zookfit.in/api`, iOS bundle `com.zook.app`, Android package `com.zook.app`, and Expo export generated iOS/Android bundles successfully into `/tmp/zook-expo-export`. Vercel production deployment `zook-gym-b98tfsjcx-adidshafts-projects.vercel.app` is Ready and aliased to `app.zookfit.in` and `dashboard.zookfit.in`; live smoke checks returned 200 for `/login`, `/privacy`, `/terms`, `/support`, `/gyms`, `/status`, and `/api/ready`, with dashboard unauthenticated traffic redirecting to login. `/api/ready` reports database reachable and live providers ready for Resend email, Razorpay, Google Maps, Expo push, Supabase storage, and Upstash-backed rate limiting; SMS remains disabled until MSG91 DLT/template completion.
Update on 2026-05-10 20:20 IST: post-SSL release verification passed: `pnpm turbo run typecheck lint`, `pnpm test:services`, `pnpm --filter @zook/mobile test`, `RUN_DB_WEB_TESTS=1 pnpm test:web` with all 38 DB-backed web tests passing, `pnpm test:acceptance:db` with all 38 passing, `pnpm preflight`, production `pnpm env:check`, production `pnpm release:preflight`, and `pnpm build`. Vercel production deployment `zook-gym-iotafsopg-adidshafts-projects.vercel.app` is Ready and aliased to `app.zookfit.in` and `dashboard.zookfit.in`; live smoke checks returned 200 for `/login`, `/privacy`, `/terms`, `/support`, `/gyms`, `/status`, and `/api/ready`. Production-profile Expo config resolves Google client IDs as configured, Apple Sign In enabled, API `https://zookfit.in/api`, and production push mode; production-profile Expo exports completed for iOS at `/tmp/zook-expo-ios-prod-export` and Android at `/tmp/zook-expo-android-prod-export`.
Update on 2026-05-12 16:55 IST: launch verification was rerun after fixing the missing Expo peer dependency `react-native-worklets`. `cd apps/mobile && npx expo-doctor` now passes 17/17 checks; `pnpm --filter @zook/mobile typecheck`, `pnpm --filter @zook/mobile lint`, `pnpm --filter @zook/mobile test`, and `pnpm turbo run typecheck lint` pass. Production-profile Expo exports completed again for iOS at `/tmp/zook-expo-ios-prod-export` and Android at `/tmp/zook-expo-android-prod-export`. Live browser-render smoke passed for `/login`, `/gyms`, `/status`, and the protected dashboard redirect with no page errors. Live `/api/ready` reports production DB reachable and Resend, Razorpay, Google Maps, Expo Push, Supabase Storage, and Upstash ready; SMS and AI remain intentionally disabled. Full details are recorded in `docs/launch-readiness-report-2026-05-12.md`.
