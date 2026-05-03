# Zook Production Readiness Handoff

Last updated: 2026-05-03
Branch: `ui-ux-production-polish-pass`
Audit commit: `973080cd3ea0f76e090dc4601a323e4ab33a0c66`
Runtime hardening commit: `ce0f9f1`

## Current Status

Zook is a backend-first full-stack MVP skeleton moving toward a durable production-shaped application. Backend mode is the default, offline demo mode is explicit/local-only, core role flows are increasingly persisted through Prisma, and provider behavior is selected through server-side registries and runtime checks.

This is not a production launch certification. Razorpay, Expo push, OpenAI, object storage, distributed rate limiting, full mobile simulator/device QA, and complete E2E coverage still require staging or device validation before production claims. The 2026-05-03 AI/trainer hardening pass made trainer planning more permanent and testable, but did not certify live OpenAI behavior.

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
- `AI_PROVIDER=mock|openai|disabled`
- `PUSH_PROVIDER=mock|expo|disabled`
- `STORAGE_PROVIDER=local|s3|r2`

Current guardrails:

- Local can run backend mode or explicit offline demo mode.
- Staging and production release checks fail when offline demo is enabled.
- Mobile app config refuses non-local builds with `API_MODE=offline-demo`.
- Production release checks fail for fixed demo OTP, seeded demo users, mock payments, mock email, weak secrets, and localhost mobile URLs.
- Mock payment completion is server-gated by `isMockPaymentCompletionAllowed`.
- Provider diagnostics expose provider names, status, missing env names, and boolean env presence only.

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
- Storage supports local disk and S3/R2-compatible providers; object storage env and signed URL behavior were not verified against real infrastructure.
- Web and dashboard fixture fallback must remain constrained to explicit local/offline-demo paths.

## Remaining Hardcoded Values

- Local `.env` uses `OTP_FIXED_CODE_DEV=000000`, local URLs, mock providers, and seeded demo users.
- Mobile `apps/mobile/app.config.ts` has profile fallback URLs for local, staging, and production.
- Seed data in `packages/db/prisma/seed.ts` is deterministic.
- Some docs still mention future payment providers beyond the implemented registry; those should be clarified during provider hardening.

## Mobile UI Polish Gaps

Simulator/device retest is still needed for:

- Trainer home, client detail, AI draft, and draft editor lower controls.
- Member shop, gym details, plan detail, notifications, and privacy/settings.
- Receptionist desk, member search, manual attendance, payment entry, and pickup verification.
- Owner/admin command, approvals, revenue, stock, members, and member detail.

Known polish themes:

- Reduce duplicate identity/context framing.
- Tighten dense staff surfaces without doing a full redesign.
- Keep member language simple: Check in, Plan, Progress, Shop, Pickup, Renew.
- Keep owner/admin mobile lightweight and avoid platform-admin framing on mobile.
- Recheck safe-area spacing for bottom controls.

## Web And Dashboard Gaps

- Public profile, join, QR, referral, and result pages need full real-data fallback audit outside demo/local.
- Owner setup persistence needs deeper coverage for username uniqueness, amenities/facilities, gallery, trainer details, app links, and join mode.
- Dashboard heavy tables still need pagination/search hardening in several areas.
- Platform diagnostics are safe today but should surface disabled/misconfigured provider states more explicitly once disabled modes exist.
- DB-backed platform admin acceptance currently passes but logs a Next.js warning about Prisma `Decimal` latitude/longitude values crossing a Server-to-Client component boundary. Normalize those values before the web hardening pass claims that surface is clean.

## Provider Integration Gaps

- Payments: Razorpay test-mode checkout and webhook must be verified with real test credentials. Live readiness is not claimed. The generic checkout route no longer accepts membership/shop activation targets, and backend confirmation now verifies org/user/purpose/amount before activating membership or shop records.
- Push: Expo token/device flow needs physical iOS/Android QA and receipt polling is incomplete.
- Push scheduling: scheduled notification rows are hidden until dispatch, but the scheduler/worker to send them is still not implemented.
- AI: OpenAI path has timeout handling, structured response validation, and durable safety-block records. It still needs configured-provider QA, broader safety evaluation, and staging evidence before production readiness is claimed.
- Storage: production object storage needs configured S3/R2 credentials, upload/download QA, and public/private asset validation.
- Rate limiting: current store is in-process memory and not distributed-ready for production replicas.

Payment-specific hardening gaps found in the audit:

- Razorpay currently returns checkout data but no complete embedded user-facing Razorpay Checkout flow.
- Payment application is more idempotent, but high-concurrency duplicate webhook delivery still needs DB-backed staging validation.
- Owner/platform reconciliation screens for webhook events and attempts remain basic.
- Refund/dispute operations UI is still incomplete.
- Existing environments should be checked for duplicate `Payment.sessionId` rows before applying the unique-index migration outside this local database.

## Test Coverage Gaps

- `pnpm test` now discovers core, web server, and mobile utility tests through package scripts.
- Existing tests cover provider registry, runtime env basics, auth service, storage, push provider, payment provider, service helpers, mobile notification routing/preferences, and several web server helpers.
- Fast Playwright smoke coverage runs with `pnpm test:web`. Additional payment hardening acceptance tests are DB-gated behind `RUN_DB_WEB_TESTS=1`.
- Missing or incomplete automated coverage remains for full Razorpay confirmation flows with real credentials, shop pickup E2E, web dashboard org scoping, public profile/join modes, mobile role flows, provider-disabled UX, and wrong-org/wrong-role denial across every API route. Trainer AI draft assignment and trainer-visible workout reports now have DB-backed acceptance coverage.

## Deployment Gaps

- Staging/prod env values are not configured in this local audit.
- Production release preflight correctly fails with the current local env because secrets are weak, local URLs are selected, fixed OTP is enabled, seeded demo users are enabled, and mock payment/email providers are active.
- Prisma baseline migration exists and local deploy reports no pending migrations; this still needs staging apply/rollback rehearsal.
- Remote EAS builds were not run.
- Physical iPhone release install was not performed.

## Launch Blockers

- Razorpay provider certification with test credentials and webhook delivery.
- Full payment provider handoff UI and reconciliation workflows beyond the hardened backend confirmation path.
- Production secrets, real URLs, non-demo seed posture, real email provider, and provider env configuration.
- Fail-closed runtime profile validation and aligned mobile/server runtime precedence.
- Distributed/shared rate limiting.
- Object storage staging validation.
- Expo push device QA.
- Scheduled notification dispatcher and local/staging test-notification hook.
- OpenAI provider and safety validation.
- Full DB-backed acceptance coverage and manual mobile simulator/device pass.
- Multi-branch assumptions documented in UI and validated in branch-required flows.

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

## Intentionally Out Of Scope For This Audit Commit

- Claiming Razorpay, push, OpenAI, or object storage production readiness.
- Building full multi-branch UI.
- Running remote EAS builds.
- Running physical-device push or iPhone release QA.
- Replacing in-process rate limiting.
- Completing all web/mobile UI polish and E2E flows in a single commit.
- Claiming OpenAI live-provider readiness without staging credentials and safety QA.
