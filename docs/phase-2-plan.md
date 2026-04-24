# Phase 2: Backend-Integrated Beta Foundation

Last updated: 24 April 2026

## Why this phase exists

Zook already has a solid alpha scaffold: Prisma models, a shared service layer, a Next.js API host, a web dashboard shell, an Expo mobile app, seed data, provider abstractions, and tests. The biggest remaining gap is not product breadth. It is consistency and persistence.

This phase upgrades Zook from UI-first demo flows into a more reliable beta foundation by connecting major surfaces to real API/database state, unifying auth across web and mobile, and persisting member tracking.

## Current repository findings

- `apps/web/src/server/api-router.ts` already exposes a broad API surface, but it is monolithic and mixes auth, validation, permission checks, and persistence concerns.
- `apps/web/src/server/context.ts` resolves sessions, but org context and permission enforcement need stronger shared helpers.
- Web login already uses `/api/auth/request-otp` and `/api/auth/verify-otp`.
- Mobile login still stores a local mock session token in `expo-secure-store` instead of using the backend auth/session flow.
- Many mobile and web screens still rely on `packages/core/src/sample-data.ts` or UI-local constants.
- Prisma models already cover most MVP domains, but personal tracking persistence is not in the database yet.
- Vitest and Playwright are present, but root test commands are not separated cleanly enough.
- Provider abstractions exist in `packages/core/src/providers`, but provider selection is still mostly hard-coded to mock classes.

## Phase goals

1. Stabilize scripts, test separation, and environment config.
2. Unify OTP/session auth across web and mobile.
3. Harden request context, tenant isolation, RBAC, and audit logging.
4. Replace major authenticated UI fallback data paths with API/database-backed queries.
5. Add persistent personal tracking for workouts, habits, and body progress.
6. Strengthen membership, join, attendance, notifications, plans, AI, and shop flows so they operate on persisted state.
7. Improve provider switching readiness without requiring paid services.
8. Stabilize Expo runtime behavior and document local mobile development paths.
9. Upgrade dashboard summaries to real metrics from the database.
10. Expand tests and docs to reflect the new beta foundation.

## Workstreams

### 1. Repo Stabilization

- add a root Vitest config that excludes Playwright specs
- keep Playwright isolated to `apps/web/tests`
- normalize root scripts:
  - `dev:web`
  - `dev:mobile`
  - `db:generate`
  - `db:push`
  - `db:migrate`
  - `db:seed`
  - `typecheck`
  - `lint`
  - `test:unit`
  - `test:web`
  - `test:services`
  - `test:acceptance`
- expand `.env.example` with provider registry and runtime settings

### 2. Unified Auth

- keep OTP email-only for MVP
- support fixed dev OTP only when enabled in development
- store only OTP hashes and session token hashes
- add or harden:
  - `POST /api/auth/request-otp`
  - `POST /api/auth/verify-otp`
  - `POST /api/auth/logout`
  - `GET /api/auth/me`
  - `GET /api/auth/session`
- implement a shared fetch client for web and mobile
- replace mobile local mock login with the real backend flow
- store mobile session token in `expo-secure-store`

### 3. Request Context / RBAC / Audit

- add a request-context factory with:
  - resolved user/session
  - resolved org context
  - `requireAuth()`
  - `requireOrgRole()`
  - `requirePlatformAdmin()`
- add a consistent API error model
- harden org-scoped service calls to require explicit `orgId`
- write audit logs for high-impact privileged actions

### 4. Data Wiring

- add query helpers/hooks for the main mobile and web views
- stop using sample data for authenticated screens when API-backed data exists
- retain seed/fallback content only where needed for local demos or docs

Priority screens:

- mobile member home
- mobile gym discovery/profile
- mobile memberships, attendance, plans, shop, notifications, profile
- mobile owner, receptionist, and trainer dashboards
- web dashboard summary
- web members, plans, join requests, attendance, notifications, shop, AI usage, platform orgs

### 5. Personal Tracking Persistence

- add Prisma models for:
  - `WorkoutSession`
  - `WorkoutExerciseEntry`
  - `BodyProgressEntry`
  - `MemberHabit`
  - `MemberHabitLog`
- create `PersonalTrackingService`
- add `/api/me/tracking/*` routes
- wire mobile tracking screens to persisted data
- surface privacy-respecting tracking views for staff where allowed

### 6. Membership + Attendance + Notifications + Plans + Shop

- harden join and membership activation flows around mock checkout state
- strengthen QR attendance validation and approval logic
- persist notifications and recipient read state
- persist plan publish/assign/progress flows
- persist shop order/payment/pickup/inventory flows

### 7. Provider Registry

- introduce env-driven provider factories:
  - `getEmailProvider()`
  - `getPaymentProvider()`
  - `getMapProvider()`
  - `getAIProvider()`
  - `getStorageProvider()`
  - `getPushProvider()`
- keep mocks as the default
- add optional real-provider scaffolds without making them required for local development

### 8. Mobile Runtime Stability

- normalize Expo runtime docs and API base URL configuration
- keep QR scan working with:
  - camera permissions
  - simulator fallback
  - manual token entry in development
- preserve Expo Go compatibility where practical

### 9. Dashboard Metrics

- power owner/admin/platform dashboards from database summaries
- keep charts simple, but ensure metric values come from persisted data

### 10. Tests and Docs

- add auth/session route tests
- add tenant/RBAC tests
- add tracking tests
- extend membership, attendance, notification, plan, AI, and shop coverage
- document environment, runtime, provider switching, and actual limitations

## Delivery order

1. stabilization and plan
2. auth/session
3. request context and API consistency
4. data-backed hooks and major screen migration
5. tracking persistence
6. membership and attendance hardening
7. notifications, plans, AI, and shop
8. provider registry and Expo cleanup
9. dashboard metrics
10. docs, tests, final verification

## Success criteria for this phase

By the end of Phase 2:

- web and mobile use the same OTP/session backend
- major dashboards and member surfaces read from the database
- personal tracking is persisted
- membership activation depends on confirmed backend payment state
- attendance QR scan and approval paths work end to end with mock providers
- notifications, plans, and shop state are persisted
- provider selection is environment-driven and mock-safe by default
- test commands are separated cleanly
- docs reflect what is real, what is mocked, and how to run the beta foundation locally
