# Phase 5 Plan

Last updated: 24 April 2026

## Phase Name

Phase 5: Staging Pilot Validation and Production Readiness

## Current Repo Status

Zook is continuing from the Phase 4 private-pilot release-candidate baseline, not from a greenfield reset.

Current repository status from inspection:

- Next.js App Router web app and API are live in `apps/web`
- Expo Router mobile app is live in `apps/mobile`
- Prisma/PostgreSQL schema already includes payment events, webhook attempts, push devices, push deliveries, privacy jobs, guardian challenges, incidents, abuse flags, and provider health records
- provider registry already supports mock defaults plus optional `razorpay`, `expo`, `resend`, `smtp`, `google`, `openai`, `s3`, and `r2`
- health/readiness routes, release preflight checks, Docker baseline files, and EAS profiles already exist
- DB-gated Playwright acceptance coverage exists, but environment forwarding and bootstrap reliability still need hardening
- push backend plumbing is ready, but native mobile token registration, tap routing, and device QA are still incomplete
- guardian consent APIs and privacy job records exist, but the guardian fallback web UX and broader operator flows still need completion
- reports, exports, platform diagnostics, and pilot seed data exist, but they need broader validation coverage and higher pilot-operability polish

## Staging Validation Goals

Phase 5 will focus on making the existing product credible in a controlled staging pilot with a small number of real gyms.

Primary staging validation goals:

- make DB-backed acceptance tests runnable and predictable across local and staging-like shells
- verify that staging env loading matches Playwright, Next.js, Prisma, and helper scripts
- validate provider setup behavior for both mock and live-ready modes without exposing secrets
- verify core owner, member, receptionist, trainer, platform, privacy, and minor journeys end to end
- harden operator workflows for payments, incidents, provider health, exports, and audit review
- reduce physical-device testing friction for iOS and Android pilot devices

## Provider Validation Plan

Payments:

- keep `PAYMENT_PROVIDER=mock` as the safe local default
- harden Razorpay test-mode validation, diagnostics, webhook verification, and idempotent replay handling
- surface reconciliation data for payment sessions, payments, events, and webhook attempts

Push:

- keep `PUSH_PROVIDER=mock` as the safe local default
- finish Expo push token registration and mobile preference wiring
- validate tap-routing payload handling and delivery persistence

Email:

- preserve mock email for local development
- validate guardian and OTP email content in mock mode and live-ready diagnostics

Storage:

- validate export artifact generation and signed URL flow through the configured storage provider

AI and Maps:

- keep mock providers available
- validate diagnostics, safe fallbacks, and server-only provider usage

## Mobile-Device Validation Plan

- verify app config, scheme, bundle/package identifiers, runtime version, and EAS profiles
- harden environment switching for `local`, `staging`, and `production`
- remove assumptions that physical devices can use `localhost`
- validate API base URL resolution for iOS simulator, Android emulator, local LAN devices, staging, and production
- complete notification permission, token registration, tap routing, and notification center refresh behavior
- document simulator, emulator, Expo Go, development build, and physical-device constraints honestly
- validate QR scan handling for denied permissions, unavailable camera, expired token, pending approval, and success flows

## Acceptance Test Plan

Phase 5 acceptance coverage should expand from smoke checks into DB-gated private-pilot journeys:

- owner flow
- member flow
- receptionist flow
- trainer flow
- attendance flow
- shop flow
- payment webhook flow
- push flow
- minor and guardian flow
- privacy export and deletion flow
- platform admin flow

Test execution expectations:

- `pnpm test:web` remains usable without a database and skips DB-gated flows unless explicitly requested
- `RUN_DB_WEB_TESTS=1 pnpm test:web` fails loudly when DB env is missing
- `pnpm test:acceptance:db` becomes the explicit DB-required acceptance entry point
- add a shared test DB bootstrap command so contributors can prepare the database consistently

## Security And Privacy Validation Plan

- verify tenant isolation, RBAC, and platform-only boundaries on new and existing pilot routes
- keep provider secrets server-side only and ensure provider diagnostics never expose raw credentials
- enforce minor restrictions server-side for membership activation, attendance, AI personalization, trainer visibility, and promotional messaging
- complete guardian consent fallback UX with safe identity display and expiry handling
- operationalize data export and account deletion jobs with auditability, scoped data generation, and safe status transitions
- confirm dangerous mutations, exports, and privacy status changes write audit logs
- verify production responses avoid leaking stack traces

## Known Risks

- DB-backed verification still depends on a real `DATABASE_URL`, so some acceptance coverage may remain environment-blocked in this shell
- staging-like provider validation is only as strong as the configured credentials and webhook reachability in the target environment
- Expo push behavior differs across Expo Go, simulator/emulator, dev builds, and physical devices
- Razorpay test-mode integration can be validated realistically, but production traffic behavior still requires controlled observation
- privacy and minor flows cross web, mobile, email, storage, and audit surfaces, so regressions can hide in integration seams
- the repo already contains broad Phase 4 scope, so careful incremental changes are required to avoid destabilizing stable mock-first flows

## Rollback Plan

- keep changes additive and behind existing provider selection and environment-profile boundaries where possible
- preserve mock providers and current default local flows at every step
- use small, reviewable commits per validation area so any regression can be reverted surgically
- rely on Prisma additive changes and avoid destructive data migrations for pilot readiness work
- if staging validation fails, fall back to mock provider operation for internal demos while the failing live-ready surface is isolated
- document any environment-specific blockers in `docs/phase-5-results.md` instead of claiming unsupported readiness
