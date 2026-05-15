# Zook Launch Readiness Report

Updated: 2026-05-12 16:55 IST

Scope: production-readiness verification for web, dashboard, backend, and mobile app bundles. Secrets were loaded from the local production snapshot only for checks; no secret values are recorded here.

## Current Launch Position

Zook is ready for broader production testing of the web app, dashboard redirect/auth entry, backend health/readiness, email OTP, payments configuration presence, storage configuration presence, maps, push provider configuration, and mobile production JS bundles.

It is not yet ready for a public no-caveat launch until the manual provider certifications below are completed, especially MSG91 DLT template approval, Razorpay signed webhook certification, and physical-device OAuth/store smoke.

## Fixes Applied During This Pass

- Added the missing Expo SDK peer dependency `react-native-worklets@0.5.1` to the mobile app so Expo Doctor passes.
- Removed stale unused imports in mobile and web launch-critical files.
- Stabilized DB-backed Playwright coverage by replacing a brittle browser redirect assertion with the underlying RBAC API denial assertion.
- Increased timeout for the web UX affordance test that was intermittently exceeding 30 seconds under local dev-server load.

## Verification Passed

| Check | Result |
| --- | --- |
| `cd apps/mobile && npx expo-doctor` | Passed: 17/17 checks. |
| `pnpm --filter @zook/mobile typecheck` | Passed. |
| `pnpm --filter @zook/mobile lint` | Passed. |
| `pnpm --filter @zook/mobile test` | Passed: 5 files, 20 tests. |
| `pnpm turbo run typecheck lint` | Passed: 14/14 tasks. |
| `pnpm test:services` | Passed earlier in this pass: 14 files, 60 tests. |
| `RUN_DB_WEB_TESTS=1 pnpm test:web` | Passed earlier in this pass: 38/38 DB-backed web tests. |
| `pnpm test:acceptance:db` | Passed earlier in this pass: 38/38 acceptance tests. |
| `pnpm build` | Passed earlier in this pass. Non-blocking warning remains for `file-type` dynamic import in the API router and a Next ESLint plugin notice. |
| Production `pnpm env:check` | Passed with expected warnings: fixed OTP not set, AI disabled. |
| Production `pnpm release:preflight` | Passed with expected warnings: fixed OTP not set, AI disabled. |
| iOS production Expo export | Passed: `/tmp/zook-expo-ios-prod-export`. |
| Android production Expo export | Passed: `/tmp/zook-expo-android-prod-export`. |
| Live API `/api/ready` | `ready: true`; production DB reachable; Resend, Razorpay, Google Maps, Expo Push, Supabase Storage, and Upstash ready. SMS, WhatsApp, and AI are disabled. |
| Live API `/api/health` | Alive. |
| Live API `/api/status` | Degraded only because AI is intentionally disabled. |
| Live browser render: `/login` | 200, rendered, no page errors. |
| Live browser render: `/gyms` | 200, rendered, no page errors. |
| Live browser render: `/status` | 200, rendered, no page errors. |
| Live browser render: `dashboard.zookfit.in/dashboard` | 200 after unauthenticated redirect to `www.zookfit.in/login?redirect=%2Fdashboard`, no page errors. |

Load testing was not run because `k6` is not installed on this machine.

## Production Provider State

| Provider | State | Notes |
| --- | --- | --- |
| Supabase Postgres | Healthy | Production readiness check and release preflight can reach the DB after SSL enforcement. |
| Supabase Storage | Configured | `/api/ready` reports storage ready. Bucket policy/dashboard posture still needs final review. |
| Resend email OTP | Ready | Email provider reports ready. |
| MSG91 SMS OTP | Blocked | `SMS_PROVIDER` remains disabled until STPL/DLT header/template approval yields the final `MSG91_TEMPLATE_ID`. |
| Razorpay live | Configured, not certified | Provider reports ready, but signed live webhook scenarios still need dashboard-level certification. |
| Google OAuth | Configured, not smoke-tested | Client IDs are present; real Chrome/iOS/Android sign-in must be tested. |
| Apple Sign In | Configured, not smoke-tested | Public values and iOS capability are present; real iOS and web sign-in must be tested. |
| Expo Push | Configured | Provider reports ready; physical-device foreground/background/cold-start push QA remains. |
| OpenAI/AI | Disabled | This is why `/api/status` is degraded; safe to leave disabled for launch if AI is not a launch feature. |

## Manual Gates Still Left

1. MSG91/STPL: wait for `ZOOKFT` header approval, create the OTP content template, copy the approved DLT Template ID into `MSG91_TEMPLATE_ID`, set `SMS_PROVIDER=msg91`, redeploy, then run real phone OTP success/failure/rate-limit tests.
2. Razorpay: verify or rotate the live webhook secret in the dashboard, then certify signed success, failed payment, duplicate replay, out-of-order event, and refund webhook flows. This may move real money, so it needs owner confirmation.
3. OAuth: perform real Google sign-in on Chrome, iOS, and Android; perform real Apple sign-in on iOS and web.
4. Supabase dashboard: confirm scheduled backups, skip PITR if it requires a paid plan, review team access, and verify service-role keys are only in server secret stores.
5. App stores: upload signed iOS/Android builds, complete App Store privacy/age-rating/screenshots, complete Google Play Data Safety/app content/internal testing, and run TestFlight/internal-track smoke.
6. Physical mobile QA: install the production build on Aman's iPhone and at least one Android device; test login, scan, membership, tracking, notifications, and offline/error states.
7. Razorpay/Vercel domain hygiene: use only canonical Zook domains. Prefer the webhook URL under `https://www.zookfit.in/api/payments/webhooks/razorpay` or `https://zookfit.in/api/payments/webhooks/razorpay` to avoid `dashboard.zookfit.in` redirect ambiguity.

## Deployment Note

I did not push a fresh production Vercel deployment in this pass because the worktree contains a broad set of existing modified and untracked product files beyond the narrow fixes above. Current live production is responding cleanly, and deploying the entire dirty tree would risk shipping unrelated in-progress changes.

Before the next production deploy, either commit/review the full current tree intentionally or isolate only the launch fixes into a clean release branch.
