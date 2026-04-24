# Phase 4 Plan: Private Pilot Release Candidate

Last updated: 24 April 2026

## Current Repo Summary

Zook is already operating on a real monorepo baseline rather than a demo shell:

- `apps/web` is a Next.js App Router app with a centralized API adapter in `apps/web/src/server/api-router.ts`, org and platform dashboard shells, public gym routes, mock checkout, CSV report exports, request IDs, audit logging, rate limits, and provider diagnostics.
- `apps/mobile` is an Expo Router app with member, owner, receptionist, and trainer surfaces backed by the same API, camera-based QR scan, org switching, and privacy/profile readouts.
- `packages/core` owns service logic, provider abstractions, RBAC, validators, policies, and deterministic mock providers with optional live email, storage, maps, and AI adapters.
- `packages/db` owns Prisma schema and seed data. Phase 3 already added `PaymentEvent`, `GuardianConsent`, `ConsentRecord`, `DataExportRequest`, `AccountDeletionRequest`, audit log request IDs, and persisted operational records across membership, attendance, notifications, plans, shop, AI, and tracking.
- Payments and push are still mock-first. The current code path already persists `PaymentSession`, `Payment`, `PaymentEvent`, shop readiness, membership activation, and notification preferences, which gives Phase 4 a strong extension point instead of a blank slate.

## Phase 4 Goals

Phase 4 turns the current operational beta into a private-pilot release candidate that is still cheap locally but safer and more production-like in staging:

- add Razorpay-ready server-only checkout and webhook verification without breaking mock checkout
- add Expo-push-ready device registration and delivery tracking while keeping in-app notifications canonical
- deepen guardian consent, privacy requests, data export, and account deletion flows
- harden environment validation, release preflight, health/readiness, and deployment guidance
- improve mobile device realism with deep links, push, QR edge states, and environment handling
- expand owner/platform operational surfaces for reconciliation, privacy requests, pilot monitoring, and exports
- strengthen structured logging, incident handling, confirmation/audit for dangerous actions, and rate-limit coverage
- expand DB-gated Playwright coverage around private-pilot critical journeys

## Implementation Sequence

1. Baseline and release hygiene
   - run current lint/type/test/preflight commands
   - improve env checking into profile-aware release preflight
   - add staging/production guardrails before enabling live providers
2. Schema and seed hardening
   - extend existing Phase 3 models instead of duplicating them
   - add payment webhook attempts, push devices/deliveries, provider health, incident logging, and stronger privacy job state
   - refresh demo seed data for realistic pilot flows
3. Payments and webhook processing
   - extend the provider interface
   - add Razorpay-ready provider support in the registry
   - centralize payment activation/idempotency
   - add webhook ingestion and reconciliation read models/UI
4. Push and mobile readiness
   - extend push providers and notification delivery persistence
   - add mobile token registration, tap routing, and preference controls
   - improve Expo config, environment mapping, deep links, and QR edge states
5. Privacy, operations, reports, and security
   - implement guardian consent challenge handling and minor gating
   - add export/deletion job flows and operational dashboards
   - expand reports/CSV exports, request logging, incident logging, and dangerous-action confirmation
6. Acceptance, deployment, and docs
   - expand DB-gated Playwright coverage and env forwarding
   - add health/readiness routes and deployment automation files
   - finish Phase 4 docs, manual QA, and results summary

## Provider Rollout Assumptions

- Local development remains mock-first by default for payments, push, email, maps, AI, and storage where already supported.
- Razorpay is server-only and optional. `PAYMENT_PROVIDER=mock` remains the default local path; `PAYMENT_PROVIDER=razorpay` is introduced as an explicit opt-in with test/live mode separation.
- Expo push is server-mediated and optional. `PUSH_PROVIDER=mock` remains the default local path; `PUSH_PROVIDER=expo` is enabled only when its required env is present.
- Live providers must never silently fall back after being explicitly selected. Selection should be either ready or misconfigured.
- Mobile and web clients continue to receive only safe checkout metadata, signed URLs, request IDs, and non-secret diagnostics.

## Staging And Deployment Assumptions

- `ENV_PROFILE` becomes the top-level deployment posture with `local`, `staging`, and `production` rules.
- Staging is allowed to mix real and mock providers when that tradeoff is explicitly documented and surfaced by diagnostics.
- Production must forbid weak session secrets, fixed OTP, seed/demo defaults, and mock providers for critical channels unless an explicit maintenance override is set.
- Readiness checks should verify DB reachability and safe provider configuration summary, but public health routes must not leak secrets.
- The existing Next.js web app remains the single deployable web/API artifact. Mobile builds remain Expo/EAS-based with profile-aware env injection.

## Testing Strategy

- keep the fast layers green first: `pnpm preflight`, `pnpm lint`, `pnpm typecheck`, `pnpm test:services`, `pnpm test:unit`, `pnpm test:web`
- add profile-aware env checks and a stronger `pnpm release:preflight`
- extend unit/service coverage for payment transitions, webhook signatures, push eligibility, guardian consent restrictions, exports, incidents, and dangerous actions
- expand DB-gated Playwright around owner, member, receptionist, trainer, privacy/minor, push, payment, and platform flows
- keep smoke coverage separate from DB-backed acceptance so basic route confidence stays fast
- if DB-gated flows cannot run in the current environment, document the exact missing prerequisite in `docs/phase-4-results.md` rather than claiming success

## Known Risks

- `apps/web/src/server/api-router.ts` already carries a lot of cross-domain logic; Phase 4 should extract helpers where it lowers duplication and idempotency risk instead of growing one fragile route block further.
- Payment activation and shop stock movement are currently embedded in the mock completion route, so migration to a shared activation service must preserve existing audit and notification behavior.
- Existing privacy flows use `DataExportRequest` and `AccountDeletionRequest`; schema evolution needs compatibility-aware migration instead of hard replacement.
- The web dashboard is route-shell based with mode-specific operational panels. Adding too many one-off tables without shared primitives will regress consistency quickly.
- Expo push, EAS, and physical-device flows are environment-sensitive; docs and preflight messaging need to be explicit whenever local machines lack device-ready config.

## Rollback Notes

- Keep mock providers and current mock checkout operational throughout Phase 4 so staging or local verification can fall back cleanly.
- Introduce new schema fields and tables additively where possible, and avoid destructive migration steps in this phase.
- Gate live-provider behavior behind explicit env selection and mode checks so rollback is primarily a config change.
- Preserve current API response shapes where existing web/mobile screens depend on them, or update both callers and tests in the same change set.
- Treat private-pilot-only admin actions as audited overlays on top of current platform/org behavior rather than replacing current flows outright.
