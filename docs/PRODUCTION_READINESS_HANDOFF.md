# Zook Production Readiness Handoff

Last updated: 2026-05-03
Branch: `ui-ux-production-polish-pass`
Audit commit: `973080cd3ea0f76e090dc4601a323e4ab33a0c66`

## Current Status

Zook is a backend-first full-stack MVP skeleton moving toward a durable production-shaped application. Backend mode is the default, offline demo mode is explicit/local-only, core role flows are increasingly persisted through Prisma, and provider behavior is selected through server-side registries and runtime checks.

This is not a production launch certification. Razorpay, Expo push, OpenAI, object storage, distributed rate limiting, full mobile simulator/device QA, and complete E2E coverage still require staging or device validation before production claims.

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
- `PAYMENT_PROVIDER=mock|razorpay`
- `AI_PROVIDER=mock|openai`
- `PUSH_PROVIDER=mock|expo`
- `STORAGE_PROVIDER=local|s3|r2`

Current guardrails:

- Local can run backend mode or explicit offline demo mode.
- Staging and production release checks fail when offline demo is enabled.
- Mobile app config refuses non-local builds with `API_MODE=offline-demo`.
- Production release checks fail for fixed demo OTP, seeded demo users, mock payments, mock email, weak secrets, and localhost mobile URLs.
- Mock payment completion is server-gated by `isMockPaymentCompletionAllowed`.
- Provider diagnostics expose provider names, status, missing env names, and boolean env presence only.

Phase 1 should still add first-class `disabled` provider modes because the target runtime contract includes `PAYMENT_PROVIDER=disabled`, `AI_PROVIDER=disabled`, and `PUSH_PROVIDER=disabled`, but the current provider registry does not yet accept those values.

Additional runtime audit findings to fix early:

- Invalid `APP_ENV` values currently fall back to local in core/scripts instead of failing closed.
- Mobile profile precedence does not fully match core precedence; `APP_ENV` should be authoritative.
- Web API module load eagerly resolves email, maps, AI, and storage providers, which can prevent health/readiness diagnostics from responding if a provider is misconfigured.
- `/api/ready` should redact raw database error messages.
- Production release checks currently fail mock payment/email but only warn or pass for mock push, mock AI, and local storage.
- R2 preflight requirements differ from runtime requirements.

## Backend-Backed Flows

- OTP auth challenges, hashed session tokens, logout, web HTTP-only session cookie, and mobile SecureStore token persistence.
- Role/org context through organization role assignments and `x-zook-org-id`.
- Member home, memberships, attendance, plan assignments/progress, shop orders, notifications, profile/settings, and privacy requests.
- QR attendance with backend scan validation and deterministic entry code for approved scans.
- Receptionist queue, approve/reject, manual attendance, backend entry/pickup code verification, offline payment records, and pickup fulfillment.
- Trainer assigned-client list, AI draft generation, editable draft save, plan assignment, plan update/versioning, and assignment notifications.
- Owner/admin mobile metrics for approvals, revenue, stock, members, and command-style summaries.
- Owner/admin web dashboard and platform diagnostics from API/read-model endpoints.
- Public gym and join pages read from Prisma first, with fixture fallback only in explicit local/offline-demo conditions.

## Mocked Or Provider-Ready Flows

- Mobile offline demo remains in `apps/mobile/src/lib/demo-api.ts` and must stay explicit/local-only.
- Mock payment provider remains for local checkout and local mock completion. Production completion is blocked.
- Razorpay provider code supports order creation and signed webhook parsing, but test credentials and webhook delivery were not verified in this audit.
- AI can use mock locally or OpenAI when configured. OpenAI credentials and safety behavior were not verified in this audit.
- Push persists in-app notifications and device records; Expo push path is provider-ready but physical-device push was not verified.
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

## Provider Integration Gaps

- Payments: Razorpay test-mode checkout and webhook must be verified with real test credentials. Live readiness is not claimed. The generic checkout path also needs a stricter trust boundary before production because it accepts caller-supplied purpose, amount, and metadata that payment application later trusts.
- Push: Expo token/device flow needs physical iOS/Android QA and receipt polling is incomplete.
- AI: OpenAI path needs configured-provider QA, timeout handling, structured response validation, and durable safety-block records.
- Storage: production object storage needs configured S3/R2 credentials, upload/download QA, and public/private asset validation.
- Rate limiting: current store is in-process memory and not distributed-ready for production replicas.

Payment-specific hardening gaps found in the audit:

- Generic checkout metadata must not be trusted for subscription/order activation without org/user ownership and amount verification.
- Razorpay currently returns checkout data but no complete user-facing Razorpay Checkout/result flow.
- Provider failure during checkout creation can leave pending subscriptions/orders without a retry/cleanup path.
- Payment application should be made more atomic for real webhook concurrency.
- Webhook processing needs local failure/quarantine updates when business-state application throws.
- Session expiry is recorded but not consistently enforced during mock completion/status application.

## Test Coverage Gaps

- `pnpm test` passes core tests but reports no package-local mobile/web tests through their package scripts because current include/exclude patterns miss or exclude those files.
- Existing tests cover provider registry, runtime env basics, auth service, storage, push provider, payment provider, service helpers, mobile notification routing/preferences, and several web server helpers.
- DB-backed acceptance and Playwright coverage were not run in this audit.
- Missing or incomplete automated coverage remains for full payment confirmation flows, trainer plan assignment E2E, shop pickup E2E, web dashboard org scoping, public profile/join modes, mobile role flows, provider-disabled UX, and wrong-org/wrong-role denial across every API route.

## Deployment Gaps

- Staging/prod env values are not configured in this local audit.
- Production release preflight correctly fails with the current local env because secrets are weak, local URLs are selected, fixed OTP is enabled, seeded demo users are enabled, and mock payment/email providers are active.
- Prisma baseline migration exists and local deploy reports no pending migrations; this still needs staging apply/rollback rehearsal.
- Remote EAS builds were not run.
- Physical iPhone release install was not performed.

## Launch Blockers

- Payment trust-boundary hardening for generic checkout metadata, amount validation, idempotency, concurrency, expiry, and webhook failure handling.
- Razorpay provider certification with test credentials and webhook delivery.
- Production secrets, real URLs, non-demo seed posture, real email provider, and provider env configuration.
- Fail-closed runtime profile validation and aligned mobile/server runtime precedence.
- Distributed/shared rate limiting.
- Object storage staging validation.
- Expo push device QA.
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

## What This Phase Should Fix

- Add central runtime validation for server and provider modes.
- Add first-class disabled provider modes for payment, AI, and push.
- Block production local storage when production upload is enabled.
- Tighten diagnostics and tests so provider states are safe and explicit.
- Update env/docs to match actual accepted provider selections.

## Intentionally Out Of Scope For This Audit Commit

- Claiming Razorpay, push, OpenAI, or object storage production readiness.
- Building full multi-branch UI.
- Running remote EAS builds.
- Running physical-device push or iPhone release QA.
- Replacing in-process rate limiting.
- Completing all web/mobile UI polish and E2E flows in a single commit.
