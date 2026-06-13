# Zook Production Readiness Handoff

Last updated: 2026-06-13
Branch: `main`
Latest committed baseline before this pass: `7b95a47`

## 2026-06-13 Launch Deployment Evidence

Current launch state from the production deployment and store tooling:

- `main` is clean and synced to `origin/main` at `7b95a47` (`build: bump ios store build number`).
- The launch repair branch work has been merged into `main`; the defensive mobile provider guard and member unread-update pluralization fix are committed.
- Production web is live on `https://zookfit.in`, `https://dashboard.zookfit.in`, `https://app.zookfit.in`, and `https://www.zookfit.in`, all resolving to `13.204.196.160`.
- `https://zookfit.in/api/ready` reports `ready: true`, `envProfile: production`, database reachable, schema ready, migrations applied, and live configured providers for Resend email, Razorpay payments, Google Maps, Expo push, MSG91 SMS, S3 storage, Redis rate limiting, and Redis server cache. AI and WhatsApp are intentionally disabled for this release.
- `pnpm check:launch-gates` passes on `main`.
- `pnpm mobile:release:check` passes against production config with warnings for missing physical-device push evidence, low-light QR evidence, and checkout/webhook evidence.
- Exact local `pnpm release:preflight` still does not pass from `.env.production.local` because that file has an unresolvable/malformed `DATABASE_URL` host (`ENOTFOUND`). Do not claim this command passed until it is rerun with the actual deploy production env.
- EAS iOS store build is finished: build `282c6ef6-8ef5-4772-82d7-529993a6a687`, `0.1.0 (5)`, production profile, store distribution, commit `7b95a47`, archive URL present.
- EAS iOS submission is successful: submission `1bb5152b-01c2-4402-b7e7-4cce38f7ff8a`, build `0.1.0 (5)`, log step `Upload to App Store Connect` completed.
- App Store Connect/TestFlight UI verification passed after Apple login: build `0.1.0 (5)` is visible, upload status is `Complete`, and TestFlight status is `Ready to Submit`.
- On 2026-06-13, TestFlight test information was completed for build `0.1.0 (5)`, tester `aman0902pandey@gmail.com` was added as the only individual tester, and the build was submitted for Apple Beta App Review. App Store Connect then showed `1 tester has been added`, `Remove from Review`, and the tester row status `No Builds Available`, so install availability is pending Apple review/processing.
- EAS Android store build is finished: build `3d9c0f8e-8fe9-4cdc-be06-e1468b5c7431`, `0.1.0` versionCode `4`, production profile, store distribution, archive URL present.
- Google Play Console internal testing shows release `4 (0.1.0)` available to internal testers, released Jun 12 11:37 PM, not reviewed yet.
- Production demo login smoke passed on 2026-06-13: `member@zook.local` requested an OTP and verified successfully with code `000000` against `https://zookfit.in/api/auth/verify-otp`.

Open before calling the launch fully accepted:

- Complete the physical iOS and Android pass in `docs/real-device-qa-log.md`, including light/dark login, workout loop, scan/check-in plus geofence, owner setup checklist, desk verify, push, low-light QR, and one real payment/webhook.
- Wait for Apple Beta App Review/TestFlight processing, then install build `0.1.0 (5)` from TestFlight on the physical iPhone.
- Rerun `pnpm release:preflight` with the actual production env or an equivalent deployed-env runner, without exposing secrets.

## 2026-05-17 Production Rehearsal Update

The current pass adds product-readiness surfaces rather than new schemas:

- Platform health cockpit and incident checklist on `/platform`.
- Owner/admin next-best-action cards and payment reconciliation lane.
- Member roster render cap for large loaded lists, with search/load-more guidance.
- Mobile reception verification debounce/copy, trainer day view/templates/progress timeline, and clearer membership/payment status guidance.
- Public gym trust, pricing, and after-joining explanation.
- Release evidence docs:
  - `docs/production-provider-certification.md`
  - `docs/production-incident-checklist.md`
  - `docs/real-device-qa-log.md`
  - `docs/store-readiness.md`
  - `docs/api-router-split-plan.md`

## Current Status

Zook is a backend-first full-stack MVP skeleton moving toward a durable production-shaped application. Backend mode is the default, offline demo mode is explicit/local-only, core role flows are increasingly persisted through Prisma, and provider behavior is selected through server-side registries and runtime checks.

This is not a production launch certification. Razorpay, Expo push, OpenAI, object storage, distributed rate limiting with real Upstash Redis credentials, full mobile simulator/device QA, and complete E2E coverage still require staging or device validation before production claims. The 2026-05-03 AI/trainer hardening pass made trainer planning more permanent and testable, but did not certify live OpenAI behavior.

## Stack Summary

- Monorepo: pnpm 10.16.0 and Turbo.
- Mobile: Expo SDK 54, Expo Router, React Query, SecureStore-backed bearer auth.
- Web/API: Next.js App Router with `apps/web/app/api/[[...path]]/route.ts` delegating to `apps/web/src/server/api-router.ts`.
- Backend/domain: `packages/core`.
- Database: Prisma/Postgres in `packages/db`.
- Providers: email, payment, maps, AI, push, and storage selected through `packages/core/src/providers/registry.ts`.

## Runtime Modes

- `APP_ENV=local|staging|production`
- `API_MODE=backend|offline-demo`
- `PAYMENT_PROVIDER=mock|razorpay|disabled`
- `AI_PROVIDER=disabled|mock|openai`
- `AI_FEATURES_ENABLED=false`
- `PUSH_PROVIDER=mock|expo|disabled`
- `STORAGE_PROVIDER=supabase|local|s3|r2|disabled`
- `RATE_LIMIT_PROVIDER=memory|upstash|disabled`

Current guardrails:

- Local can run backend mode or explicit offline demo mode.
- Staging and production release checks fail when offline demo is enabled.
- Mobile app config refuses non-local builds with `API_MODE=offline-demo`.
- Production release checks fail for fixed demo OTP, seeded demo users, mock payments, mock email, weak secrets, and localhost mobile URLs.
- Mock payment completion is server-gated by `isMockPaymentCompletionAllowed`.
- Provider diagnostics expose provider names, status, missing env names, and boolean env presence only.
- Production runtime validation rejects in-process memory or disabled rate limiting; use `RATE_LIMIT_PROVIDER=upstash` with `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.

Phase 1 runtime hardening adds first-class `disabled` provider diagnostics for payments, AI, and push. Feature routes surface controlled unavailable errors when disabled is selected.

Additional runtime audit findings to keep fixing:

- Production release checks must be rerun with real staging/production env after provider choices are selected.
- R2/object-storage configuration still needs staging validation.

## Backend-Backed Flows

- OTP auth challenges, hashed session tokens, logout, web HTTP-only session cookie, and mobile SecureStore token persistence.
- Role/org context through organization role assignments and `x-zook-org-id`.
- Member home, memberships, attendance, plan assignments/progress, shop orders, notifications, profile/settings, and privacy requests.
- QR attendance with backend scan validation and deterministic entry code for approved scans.
- Receptionist queue, approve/reject, manual attendance, backend entry/pickup code verification, offline payment records, and pickup fulfillment.
- Trainer assigned-client list, assigned-client-only AI draft generation, editable draft save, review-before-assign, plan assignment, plan update/versioning, assignment notifications, and trainer-visible feedback/workout report summaries.
- Owner/admin mobile metrics for approvals, revenue, stock, members, and command-style summaries.
- Owner/admin web dashboard and platform diagnostics from API/read-model endpoints.
- Public gym and join pages read from Prisma first, with fixture fallback only in explicit local/offline-demo conditions.

## Mocked Or Provider-Ready Flows

- Mobile offline demo remains in `apps/mobile/src/lib/demo-api.ts` and must stay explicit/local-only.
- Mock payment provider remains for local checkout and local mock completion. Production completion is blocked.
- Razorpay provider code supports order creation and signed webhook parsing. The 2026-05-03 payment hardening pass tightened backend activation semantics, expiry, idempotency, and webhook quarantine behavior, but test credentials and real webhook delivery were not verified.
- AI can use mock locally or OpenAI when configured. The OpenAI provider path is server-only, uses structured plan response validation and server-side image generation requests, and blocks unsafe/consent/guardian/out-of-scope cases through persisted usage/audit records. OpenAI credentials, live model output behavior, and safety behavior were not verified in this audit.
- Push persists in-app notifications, device records, and delivery attempts. The Phase 3 slice now records provider-disabled/provider-failure attempts without breaking product actions, hides scheduled recipients from the member inbox before dispatch, and maps join-request notifications to membership continuation. Expo physical-device push was not verified.
- Storage supports local disk, explicit disabled mode, and S3/R2-compatible providers. The storage hardening pass blocks local public-file serving unless a `FileAsset` is public, rejects MIME/extension mismatches, avoids resolving storage on unrelated API paths, adds file-backed org gallery assets, and prevents current-provider reads/deletes for files stored under another provider. Object storage env and signed URL behavior were not verified against real infrastructure.
- Web and dashboard fixture fallback must remain constrained to explicit local/offline-demo paths.

## Remaining Hardcoded Values

- Local `.env` uses `OTP_FIXED_CODE_DEV=000000`, local URLs, mock providers, and seeded demo users.
- Mobile `apps/mobile/app.config.ts` has profile fallback URLs for local, staging, and production.
- Seed data in `packages/db/prisma/seed.ts` is deterministic.
- Some docs still mention future payment providers beyond the implemented registry; those should be clarified during provider hardening.

## Mobile UI Polish Gaps

Phase 8 spot retest completed:

- iOS Simulator: iPhone 15 Pro / iOS 26.2, Expo Go, `APP_ENV=local API_MODE=offline-demo`.
- Confirmed trainer home, clients, trainer client detail, AI Draft Review, generated draft lower controls, profile role switching, and owner `Needs attention` render without major CTA overlap.
- The local/offline Demo Mode badge remains visible and was moved away from owner role/header controls.
- Mobile role copy was tightened to remove `Command`, `Scoped`, `Coach cockpit`, and excessive `Assigned client` framing from searched role surfaces.

Simulator/device retest is still needed for:

- Member shop, gym details, plan detail, notifications, and privacy/settings.
- Receptionist desk, member search, manual attendance, payment entry, and pickup verification.
- Owner/admin command, approvals, revenue, stock, members, and member detail.
- Backend login mode for the same role surfaces.
- Physical-device camera and push behavior.

Known polish themes:

- Reduce duplicate identity/context framing.
- Tighten dense staff surfaces without doing a full redesign.
- Keep member language simple: Check in, Plan, Progress, Shop, Pickup, Renew.
- Keep owner/admin mobile lightweight and avoid platform-admin framing on mobile.
- Recheck safe-area spacing for bottom controls on the remaining untested routes.

## Web And Dashboard Gaps

- Public profile, join, referral, and join-QR pages now fail closed more honestly outside explicit local/demo fallback: no fake zero-rupee plan CTA when no public plans exist, no URL query override of persisted join mode, no fake approval success before auth/request submission, invite-only requires an active referral, unknown referral codes no longer hardcode `iron-house`, demo fixture fallback no longer rewrites unknown public slugs to the first fixture gym, referral creation returns username-based web links, and `target=join` QR images point to `/join/{username}`. Result pages still need the same depth of fallback audit.
- Owner setup persistence needs deeper coverage for username uniqueness, amenities/facilities, gallery, trainer details, app links, and join mode.
- Dashboard heavy tables still need pagination/search hardening in several areas.
- Dashboard/platform runtime pills now distinguish explicit Demo Mode from backend read-model unavailable state. Platform diagnostics are safe today but still need broader staging data/provider-disabled visual QA.
- DB-backed platform admin acceptance currently passes but logs a Next.js warning about Prisma `Decimal` latitude/longitude values crossing a Server-to-Client component boundary. Normalize those values before the web hardening pass claims that surface is clean.

## Provider Integration Gaps

- Payments: Razorpay test-mode checkout and webhook must be verified with real test credentials. Live readiness is not claimed. The generic checkout route no longer accepts membership/shop activation targets, and backend confirmation now verifies org/user/purpose/amount before activating membership or shop records.
- Push: Expo token/device flow needs physical iOS/Android QA and receipt polling is incomplete.
- Push scheduling: scheduled notification rows are hidden until dispatch, but the scheduler/worker to send them is still not implemented.
- AI: OpenAI path has timeout handling, structured response validation, and durable safety-block records. It still needs configured-provider QA, broader safety evaluation, and staging evidence before production readiness is claimed.
- Storage: production object storage needs configured S3/R2 credentials, upload/download QA, and public/private asset validation against real infrastructure.
- Rate limiting: local uses in-process memory. Phase 6 added an Upstash Redis REST-backed store, safe diagnostics, and production runtime/preflight guards against memory or disabled rate limiting. A real Upstash database has not been configured or load-tested yet.
- Branch readiness: the MVP is Default-Branch-centered but multi-branch-ready in the data model. Membership and attendance branch-required flows now fail if the active/default branch is missing; membership checkout/manual activation use the plan branch when a plan is branch-specific. Owner/reception/web surfaces show Default Branch context. Shop inventory, shop orders, payment records, and revenue/manual-cash reports remain org-wide because those tables do not yet carry `branchId`.

Payment-specific hardening gaps found in the audit:

- Razorpay currently returns checkout data but no complete embedded user-facing Razorpay Checkout flow.
- Payment application is more idempotent, but high-concurrency duplicate webhook delivery still needs DB-backed staging validation.
- Owner/platform reconciliation screens for webhook events and attempts remain basic.
- Refund/dispute operations UI is still incomplete.
- Existing environments should be checked for duplicate `Payment.sessionId` rows before applying the unique-index migration outside this local database.

## Test Coverage Gaps

- `pnpm test` now discovers core, web server, and mobile utility tests through package scripts.
- Existing tests cover provider registry, runtime env basics, auth service, storage, push provider, payment provider, service helpers, mobile notification routing/preferences, and several web server helpers.
- Fast Playwright smoke coverage runs with `pnpm test:web`. DB-backed acceptance coverage is gated behind `RUN_DB_WEB_TESTS=1` or `pnpm test:acceptance:db`.
- Missing or incomplete automated coverage remains for full Razorpay confirmation flows with real credentials, complete web dashboard org scoping, public result fallback modes, mobile role flows, provider-disabled UX, high-concurrency payment/webhook/rate-limit behavior, and wrong-org/wrong-role denial across every API route. Trainer AI draft assignment, trainer-visible workout reports, default-branch routing, join-mode query-override denial, referral username links, QR target selection, receptionist attendance approve/reject, shop pickup verification/fulfillment, and privacy export/delete request jobs now have automated coverage.
- `docs/E2E_PRODUCT_FLOWS.md` maps the six primary product journeys to current automated evidence and manual/device/provider gaps.

## Deployment Gaps

- The deployment, mobile runtime, EAS, QA, and README runbooks now document release commands, env modes, fail-safe UX, observability, and provider/device certification limits.
- Staging/prod env values are not configured in this local audit, and the launch runbook has not been executed against a real staging environment.
- Production release preflight correctly fails with the current local env because secrets are weak, local URLs are selected, fixed OTP is enabled, seeded demo users are enabled, and mock payment/email providers are active.
- Prisma baseline migration exists and local deploy reports no pending migrations; this still needs staging apply/rollback rehearsal.
- Remote EAS builds were not run.
- Physical iPhone release install was not performed.

## Launch Blockers

- Razorpay provider certification with test credentials and webhook delivery.
- Full payment provider handoff UI and reconciliation workflows beyond the hardened backend confirmation path.
- Production secrets, real URLs, non-demo seed posture, real email provider, and provider env configuration.
- Fail-closed runtime profile validation and aligned mobile/server runtime precedence.
- Distributed/shared rate limiting configured and validated with real Upstash Redis credentials.
- Object storage staging validation.
- Expo push device QA.
- Scheduled notification dispatcher and local/staging test-notification hook.
- OpenAI provider and safety validation.
- Broader mobile/browser E2E coverage, full wrong-role/wrong-org route matrix, and manual mobile simulator/device pass.
- Full multi-branch product semantics for shop stock, payments, revenue reports, and member-facing branch switching.

## Checks Run In This Audit

- `pnpm install --frozen-lockfile`: passed; lockfile already up to date. pnpm warned that `esbuild` build scripts are ignored until approved.
- `pnpm lint`: passed with 7 existing mobile unused-var warnings.
- `pnpm typecheck`: passed.
- `pnpm test`: passed. Core ran 53 tests; `@zook/mobile` and `@zook/web` package test targets reported no test files found.
- `pnpm db:generate`: passed; Prisma client generated. Prisma warned that `package.json#prisma` is deprecated for Prisma 7.
- `pnpm db:deploy`: passed against local `zook` database; no pending migrations.
- `pnpm --filter @zook/db exec prisma validate --schema prisma/schema.prisma`: failed without loaded env because `DATABASE_URL` was missing in that direct command environment. Use the repo scripts or source `.env` first.
- `APP_ENV=local API_MODE=backend pnpm preflight`: passed with warnings for weak local secrets, localhost mobile URL, mock payments, and mock push.
- `APP_ENV=production API_MODE=backend pnpm release:preflight`: failed as expected on local env values: weak secrets, localhost mobile URL, fixed OTP, seeded demo users, mock payments, and mock email.
- `APP_ENV=production API_MODE=backend EXPO_PUBLIC_API_MODE=backend pnpm --filter @zook/mobile exec expo config --type public`: passed and resolved `offlineDemo=false`.
- `APP_ENV=local API_MODE=backend pnpm dev:web`: started Next.js on `http://localhost:3002` because port 3000 was already in use.
- `GET /api/health` on the dev server: returned 200.
- `GET /api/ready` on the dev server: returned 200 with local mock/local provider diagnostics.

## Additional Checks Run After Phase 1 Runtime Hardening

- `pnpm --filter @zook/core test`: passed 57 tests.
- `pnpm --filter @zook/web test`: passed 9 web server test files and 26 tests.
- `pnpm --filter @zook/mobile test`: passed 2 mobile utility test files and 12 tests.
- `pnpm typecheck`: passed.
- `pnpm lint`: passed with the same 7 existing mobile unused-var warnings.
- `pnpm test`: passed and now exercises core, web, and mobile package tests.
- `APP_ENV=local API_MODE=backend pnpm preflight`: passed with local warnings.
- Production-like `pnpm release:preflight` with disabled payment/AI/push, object storage selected, strong secrets, and non-local URLs: passed with warnings for intentionally disabled AI/push.
- `APP_ENV=production API_MODE=offline-demo pnpm release:preflight`: failed as expected.
- Invalid `APP_ENV=prodution` release preflight: failed as expected.
- Production mobile config with backend API mode: passed.
- Production mobile config with offline demo: failed as expected.
- Local web dev smoke: `/api/health` and `/api/ready` returned 200.

## Additional Checks Run During Payment Hardening

- `pnpm db:generate`: passed after adding the payment session uniqueness migration.
- `pnpm db:deploy`: applied `20260503010000_payment_session_unique` locally.
- `pnpm --filter @zook/web typecheck`: passed.
- `pnpm --filter @zook/db typecheck`: passed.
- `pnpm --filter @zook/web test`: passed 9 web server test files and 26 tests.
- `pnpm test:web`: passed 4 browser smoke tests; 9 DB-gated acceptance tests were skipped because `RUN_DB_WEB_TESTS` was not enabled.
- `RUN_DB_WEB_TESTS=1 pnpm test:web`: passed 12 DB/browser acceptance tests; 1 guardian-minor test skipped because this local seeded minor already had a membership in progress.

## Additional Checks Run During Push Hardening

- `pnpm --filter @zook/web test`: passed 10 web server test files and 28 tests.
- `pnpm --filter @zook/mobile test`: passed 2 mobile utility test files and 13 tests.
- `pnpm --filter @zook/web typecheck`: passed.
- `pnpm typecheck`: passed.
- `pnpm test`: passed.
- `pnpm lint`: passed with the same 7 existing mobile unused-var warnings.

## Additional Checks Run During AI/Trainer Hardening

- `pnpm --filter @zook/core typecheck`: passed.
- `pnpm --filter @zook/web typecheck`: passed.
- `pnpm --filter @zook/mobile typecheck`: passed.
- `pnpm --filter @zook/core test`: passed 11 core test files and 59 tests.
- `pnpm --filter @zook/web test`: passed 10 web server test files and 28 tests.
- `pnpm --filter @zook/mobile test`: passed 2 mobile utility test files and 13 tests.
- `pnpm test:web`: passed 4 browser smoke tests with 11 DB-gated tests skipped when `RUN_DB_WEB_TESTS` was not enabled.
- `pnpm test:db:prepare && RUN_DB_WEB_TESTS=1 pnpm test:web`: passed 15 DB-backed browser acceptance tests.

## Additional Checks Run During Storage Hardening

- `pnpm --filter @zook/core test`: passed 11 core test files and 62 tests.
- `pnpm --filter @zook/web test`: passed 10 web server test files and 29 tests.
- `pnpm --filter @zook/mobile test`: passed 2 mobile utility test files and 13 tests.
- `pnpm --filter @zook/core typecheck`: passed.
- `pnpm --filter @zook/web typecheck`: passed.
- `pnpm --filter @zook/mobile typecheck`: passed.
- `pnpm lint`: passed with the same 7 existing mobile unused-var warnings.
- `pnpm test:db:prepare && RUN_DB_WEB_TESTS=1 pnpm test:web`: passed 16 DB-backed browser acceptance tests.

## Additional Checks Run During Mobile Role Polish

- `pnpm --filter @zook/mobile typecheck`: passed.
- `pnpm --filter @zook/mobile lint`: passed after removing the remaining mobile unused-symbol warnings.
- `pnpm --filter @zook/mobile test`: passed 2 mobile utility test files and 13 tests.
- `APP_ENV=local API_MODE=offline-demo pnpm --filter @zook/mobile exec expo export --platform ios --output-dir /tmp/zook-mobile-export-phase8`: passed.
- `pnpm typecheck`: passed.
- `pnpm test`: passed.
- `pnpm lint`: passed.
- `git diff --check`: passed.

## Additional Checks Run During Public Web Hardening

- `pnpm --filter @zook/web typecheck`: passed.
- `pnpm --filter @zook/web lint`: passed.
- `pnpm --filter @zook/web test`: passed 11 web server test files and 34 tests.
- `pnpm test:db:prepare && RUN_DB_WEB_TESTS=1 pnpm test:web`: passed 21 DB-backed browser acceptance tests after adding the join-mode query-override and referral-link regressions.
- `pnpm typecheck`: passed.
- `pnpm test`: passed.
- `pnpm lint`: passed.
- `git diff --check`: passed.
- Local Chrome smoke with env-loaded Next dev server checked `/g/iron-house` and `/join/iron-house?mode=OPEN_JOIN`; no Brave or Safari was used. The first dev-server attempt without `.env` failed on missing Prisma `DATABASE_URL`, then the env-loaded retry rendered correctly.

## Additional Checks Run During E2E Flow Documentation

- `git diff --check`: passed for this docs-only pass.

## Additional Checks Run During Regression Coverage

- `pnpm --filter @zook/web typecheck`: passed.
- `pnpm --filter @zook/web lint`: passed.
- `pnpm --filter @zook/web test`: passed 11 web server test files and 34 tests.
- `pnpm test:db:prepare && RUN_DB_WEB_TESTS=1 pnpm test:web`: passed 23 DB-backed browser acceptance tests after adding receptionist approve/reject, shop pickup fulfillment, and privacy export/delete coverage. Expected negative-path server error logs appeared during failure-mode assertions.
- `pnpm typecheck`: passed.
- `pnpm lint`: passed.
- `pnpm test`: passed. Core ran 63 tests; mobile ran 13 utility tests; web ran 34 server tests.
- `git diff --check`: passed.

## Additional Checks Run During Deployment Readiness

- Docs-only release-readiness pass updated `README.md`, `docs/deployment.md`, `docs/eas-builds.md`, `docs/mobile-runtime.md`, and `docs/QA_CHECKLIST.md`.
- The release runbook, iPhone install checklist, and fail-safe UX checklist were documented but not executed against staging or a physical iPhone.
- `git diff --check`: passed for the docs-only release-readiness pass.

## What This Phase Should Fix

- Runtime validation and disabled provider modes are implemented.
- Payment activation now trusts backend-owned membership/shop routes, not caller-supplied generic checkout metadata.
- Mock success completion enforces session expiry.
- Provider checkout failures mark the pending session and related membership/order as failed or cancelled.
- Duplicate confirmation is guarded with a unique `Payment.sessionId` and conditional shop-order state transition.
- Razorpay webhook processing quarantines verified events when business-state application fails.
- Trainer AI generation is now scoped to the active org, trainer role, an assigned target client, and real AI consent.
- AI safety/consent blocks persist usage and audit records instead of disappearing as transient validation failures.
- AI-generated workout drafts require exercise content and a human review step before assignment.
- Member workout completion cannot mark empty workout plans complete, and trainer client summaries now read real feedback/workout report records.
- Storage routes now fail closed for disabled uploads, public local file content requires public `FileAsset` visibility, and file reads/deletes no longer silently use the wrong active provider.
- Public trainer visibility is enforced on public web/API surfaces, and mobile no longer uses stock media fallbacks for missing backend gym/trainer images.
- Default Branch handling is now explicit in branch-required membership/attendance flows; DB-backed acceptance includes Default Branch plan/dashboard/QR validation.
- Public web join/profile/referral/QR semantics are now stricter: persisted join mode wins over URL overrides, approval/invite states no longer imply fake success, unknown referral codes and unknown public demo slugs fail closed outside explicit demo fallback, generated referral links target public usernames, join QR images target `/join/{username}`, public trainer/file assets use persisted data, and dashboard fallback copy no longer calls read-model outages Demo Mode.
- Regression coverage now includes receptionist attendance approve/reject with member notifications and audit logs, shop pickup code verification/fulfillment, and privacy export/delete request job and audit persistence.
- Deployment readiness docs now include a launch runbook, production/mobile release preflights, iPhone install QA, observability, and fail-safe UX guidance. This pass did not run real staging provider checks or install a release build.

## Intentionally Out Of Scope For This Audit Commit

- Claiming Razorpay, push, OpenAI, or object storage production readiness.
- Building full multi-branch UI or claiming branch-scoped shop/payment semantics.
- Running remote EAS builds.
- Running physical-device push or iPhone release QA.
- Certifying distributed rate limiting with real Upstash Redis credentials and production traffic/load settings.
- Completing all web/mobile UI polish and E2E flows in a single commit.
- Claiming OpenAI live-provider readiness without staging credentials and safety QA.
- Claiming complete web control-room hardening; owner setup persistence, heavy-table pagination/search, QR/result fallback audit, and platform staging visual QA remain open.
