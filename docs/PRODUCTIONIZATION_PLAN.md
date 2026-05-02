# Zook Productionization Plan

Last audited: 2026-05-03
Branch: `ui-ux-production-polish-pass`
Baseline commit: `c9e23ce`

## Current Architecture Map

Zook is a pnpm/Turbo monorepo.

- Mobile: Expo SDK 54, React Native 0.81, Expo Router, React Query, SecureStore-backed auth in `apps/mobile`.
- Web and API: Next.js App Router in `apps/web`; the API is a single catch-all route at `apps/web/app/api/[[...path]]/route.ts` that delegates to `apps/web/src/server/api-router.ts`.
- Backend services: core business rules and provider interfaces in `packages/core`.
- Database: Prisma/PostgreSQL in `packages/db/prisma/schema.prisma`.
- Providers: email, payment, map, AI, push, and storage are selected through env-backed provider factories in `packages/core/src/providers/registry.ts`.
- Tests: Vitest for core/server/mobile utility tests, Playwright for web/acceptance smoke flows.

## What Is Real Today

- Email OTP auth persists `OtpChallenge` and `UserSession` records; web uses an HTTP-only `zook_session` cookie and mobile uses bearer tokens stored in SecureStore.
- RBAC and org context are resolved on the backend through `OrganizationRoleAssignment`, permissions, and `x-zook-org-id`.
- Core schemas already exist for users, orgs, branches, memberships, join requests, payments, payment events/webhook attempts, attendance QR tokens, attendance records, trainer assignments, plans, plan assignments/progress, AI conversations/usage, notifications, privacy jobs, files, shop orders, inventory, audit logs, platform diagnostics, and provider health.
- Most mobile screens already call backend-shaped endpoints through `apps/mobile/src/lib/api.ts` and `apps/mobile/src/lib/query-hooks.ts`.
- Web owner/admin/platform panels mostly read from Prisma-backed API/read-model endpoints.
- Payment activation semantics are largely correct: checkout sessions are server-created, membership/order activation happens in backend payment confirmation/webhook code, and shop inventory changes after payment success.
- In-app notifications persist through `Notification` and `NotificationRecipient`; push is provider-backed best effort.

## What Is Mocked Or Demo-Only

- Mobile offline demo mode intercepts all API calls through `apps/mobile/src/lib/demo-api.ts`.
- Core demo fixtures live in `packages/core/src/demo-fixtures.ts`.
- Web dashboard data currently falls back to demo fixture data when read models throw.
- Public gym/join pages still use fixture-shaped data in several paths.
- Mock providers remain the low-cost local default for email, payment, AI, maps, and push.
- Mock checkout completion is available for local/demo payment confirmation.
- Rate limiting is in process memory, not shared across deployed replicas.

## What Is Hardcoded

- Default mobile API/web URLs are profile-based in `apps/mobile/app.config.ts`.
- Local dev OTP `000000` is controlled by `OTP_FIXED_CODE_DEV`.
- Seed/demo users and Iron Temple Gym data are deterministic in `packages/db/prisma/seed.ts`.
- Some staff UI labels and fallback metrics still use demo-style language when data is unavailable.
- Prisma migrations are not present yet; the repo is still `db push` oriented for local/test.

## What Will Be Replaced Now

- Make runtime mode explicit: `APP_ENV=local|staging|production` and `API_MODE=backend|offline-demo`.
- Default mobile API mode to backend; allow offline demo only when explicitly selected.
- Add build/runtime guardrails so staging/production cannot silently boot offline demo mode.
- Add visible mobile demo-mode indication only when offline demo is active.
- Stop silent demo fallbacks in web dashboard outside explicit demo/local mode.
- Remove the stale duplicate `apps/mobile/src/components/primitives (1).tsx`.
- Treat generated iOS prebuild output, screenshots, and icon exports as ignored/generated artifacts unless intentionally promoted later.
- Update env examples and README with backend mode vs offline demo mode.
- Harden OTP/mock provider gates so production cannot accept universal demo OTP or mock payment completion.
- Add focused tests for runtime mode guardrails and demo fallback behavior.

## Progress In This Pass

- Added explicit mobile/backend runtime mode helpers and release guardrails.
- Ignored generated iOS prebuild output, screenshots, icon exports, and removed the duplicate primitives file.
- Centralized mobile screen mutations behind named domain clients.
- Replaced direct public web fixture reads with Prisma-backed public gym read models and local/offline-demo fallback only.
- Added backend plan update/version/audit support and wired trainer mobile plan create, AI draft edit, save, and assign.
- Added backend receptionist code verification for entry and pickup codes, deterministic entry codes for backend scans, and real fulfilled-order counts.
- Removed demo fixture initial provider diagnostics from platform admin.
- Gated `/checkout/mock/demo` behind mock-payment environment rules and tightened activation copy.
- Added backend-backed mobile privacy request status display.
- Added `docs/QA_CHECKLIST.md` and `docs/PRODUCTION_READINESS_HANDOFF.md`.

## What Stays Mock Or Provider-Ready

- Local provider defaults can remain mock for fast local development.
- AI can remain mock when explicitly configured or disabled when a real provider is not configured.
- Push can remain mock/no-op for offline demo while in-app notifications persist.
- Razorpay remains provider-ready until a full staging/provider certification pass is completed.
- EAS/Expo native prebuild artifacts remain generated rather than committed unless the team chooses a checked-in native workflow.
- Prisma migration history remains a launch blocker if not generated in this pass.

## Risks

- No Prisma migration history means shared/staging/prod DB changes cannot be promoted safely yet.
- In-process rate limiting is not enough for OTP, AI, payment, upload, and QR scan abuse in distributed deployments.
- Existing local `.env` values may still select mock providers; release checks must be run before staging/prod builds.
- Demo fallbacks have historically masked backend failures; production/staging should show degraded states instead.
- Razorpay, Expo push, OpenAI, and object storage need live credentials and end-to-end QA before they can be called production-ready.
- Multi-branch data exists, but UI still assumes a default branch in many flows.
- Generated mobile screenshots/native folders can return after local commands; `.gitignore` should keep them out of status.

## Acceptance Checklist

- Repo status shows no accidental untracked duplicate source files.
- Generated native/screenshots/icon artifacts are ignored or intentionally committed with rationale.
- `.env.example`, `.env.test.example`, README, and docs explain backend mode and explicit offline demo mode.
- Mobile non-demo builds use backend API by default.
- Missing backend URL in backend mode shows a clear fatal configuration screen.
- Offline demo shows a visible Demo Mode badge and never silently intercepts staging/production builds.
- Production cannot use demo OTP, mock payment completion, or offline demo mode.
- Web dashboard does not silently fall back to demo data outside explicit demo/local mode.
- Existing backend-backed member, trainer, receptionist, owner/admin flows continue to compile.
- Tests/checks are run, or exact blockers are documented.
