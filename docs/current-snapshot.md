# Zook Current Snapshot

Last updated: 24 April 2026

## Stage

Zook is currently in an **alpha MVP prototype** stage.

The repo is not a thin mockup anymore: it has a real monorepo layout, typed domain model, Prisma schema, service-layer business logic, a working Next.js app, an Expo mobile app, seed data, tests, and provider abstractions. At the same time, it is **not production-ready** yet because many user-facing flows still run on seeded data, mock providers, or UI-first fallbacks instead of full backend-integrated state.

The best description is:

- **Product stage:** MVP feature-complete scaffold
- **Engineering stage:** strong foundation with partial end-to-end execution
- **Readiness:** excellent for the next implementation phase, not ready for public deployment

## What Is Done

### Monorepo and Tooling

- `pnpm` workspace monorepo with `apps/web`, `apps/mobile`, `packages/db`, `packages/core`, `packages/ui`, `packages/config`
- shared TypeScript config, linting, formatting, and package boundaries
- local PostgreSQL via `docker-compose.yml`
- seed accounts, docs, README, and `.env.example`

### Core Product Model

- roles, permissions, org-scoped RBAC primitives
- validation with Zod
- shared domain types for orgs, memberships, attendance, notifications, payments, referrals, AI, privacy, shop, and now personal tracking
- mock data exports for demo and UI fallback paths

### Database Layer

- Prisma schema covering the requested MVP entities
- seed script for platform admin, owner, admin, receptionist, trainer, member, and minor
- realistic demo orgs, plans, coupons, referrals, products, notifications, PT setup, and AI usage data

### Backend / API

- Next.js route handlers with service-layer architecture
- auth/session/OTP primitives
- organization onboarding and tenant context groundwork
- membership, coupon, referral, payment, attendance, AI, notification, shop, privacy, and platform service slices
- mock hosted checkout flow and mock provider abstractions

### Web App

- dark glassmorphic dashboard shell
- public gym profile and join/referral pages
- mock checkout page
- owner/admin/reception/trainer/platform surfaces
- seeded dashboard views for core Zook workflows

### Mobile App

- Expo Router app with member, owner, receptionist, trainer routes
- secure local session mock login flow
- member flows for home, plans, scan, shop, profile, and gym discovery
- owner/reception/trainer dashboard slices
- **new personal tracking slice**:
  - member home preview
  - tracking dashboard
  - tracking history
  - workout entry screen

### Testing and Verification

- Vitest service coverage for membership, coupons, referrals, payments, attendance, RBAC, notifications, AI, minors, and shop logic
- web acceptance coverage for key flows
- monorepo typecheck passing
- note: root `pnpm test:unit` still needs cleanup because Vitest currently collides with the Playwright acceptance spec; use package-scoped tests or `pnpm test:web` separately

## What Needs Attention Next

### 1. Move UI Fallback Data to Real Queries

The biggest remaining gap is not architecture; it is **state realism**.

Many surfaces already look and feel like product, but the data often comes from:

- `packages/core/src/sample-data.ts`
- UI-side demo constants
- service mocks instead of persisted API-backed queries

Next phase should connect:

- mobile member home
- mobile tracking
- mobile plans/shop/profile
- web dashboard summary cards
- public gym pages

to real route handlers and database-backed query hooks.

### 2. Finish True Auth Integration Across Clients

The auth model exists, but the mobile app still uses a local secure-store mock session path instead of the full backend OTP/session roundtrip everywhere.

Next phase:

- wire mobile login to `/api/auth/request-otp` and `/api/auth/verify-otp`
- unify session handling between web and mobile
- expose a single authenticated current-user/current-org query path

### 3. Productionize Provider Switching

Provider abstractions are in place, but real providers are not fully wired.

Next phase should prioritize:

- OpenAI backend provider
- one real email/OTP provider
- one real payment provider for hosted checkout
- one real storage provider
- optionally one map geocoding provider

### 4. Close the Mobile Build Gap

Current Expo/mobile state works for local development, but it needs cleanup:

- Expo SDK / Expo Go alignment needs attention
- generated Expo files should be normalized
- native dev-build vs Expo Go path should be made explicit in docs/scripts
- camera and push should be validated in a cleaner native run path

### 5. Persist Personal Tracking Properly

The new personal tracking module is currently **simple workout journaling**, UI-first, and mock-backed.

Next phase options:

- store workout sessions, timing, notes, and exercises in the DB
- connect tracking to attendance, goals, and plan progress
- keep privacy-first defaults and member-private visibility

## Current Stage by Module

| Module | Status | Notes |
|---|---|---|
| Auth | Partial | Backend model exists, web/mobile not fully unified |
| Organizations / onboarding | Good MVP scaffold | Works as seeded/demo flow, needs full query wiring |
| Staff / permissions | Good MVP scaffold | RBAC model and UI exist, needs deeper persistence wiring |
| Memberships | Good MVP scaffold | Strong service logic and schema, selective UI fallback data |
| Coupons / referrals | Good MVP scaffold | Core logic exists, demo flows present |
| Payments | Mock-complete | Hosted mock checkout works; real provider not wired |
| Attendance / QR | Good MVP scaffold | Service logic exists; mobile scanner and staff approval UI present |
| PT / trainer | Good MVP scaffold | Trainer routes and PT modeling exist, mostly seeded/mock state |
| Plans / diets | Good MVP scaffold | Member and trainer surfaces exist; needs richer persistence |
| AI | Guarded mock-ready | Backend abstraction and quota logic exist; real model use optional |
| Notifications | Good MVP scaffold | Permission model and UI exist, delivery mostly mock |
| Shop | Mock-complete | Mock order/pickup flows and seeded inventory exist |
| Privacy / minors | Good MVP scaffold | Guardrail logic and privacy screens exist, some flows still placeholder |
| Platform admin | MVP scaffold | Core platform views and controls exist |
| Personal tracking | New mock-first slice | Mobile-only simple workout logs, not yet persisted |

## Mock vs Live

### Live in Local Development

These are real code paths that run locally right now:

- Next.js app and route handlers
- Prisma schema and DB client
- service-layer TypeScript business logic
- mobile Expo app routes
- mock checkout pages and transitions
- typechecked/shared packages
- test suite and docs

### Mocked by Design

These are intentionally mocked or fallback-driven right now:

- email OTP delivery
- SMS
- hosted payment provider
- maps/geocoding/place lookup
- AI generation by default
- push notifications
- file storage
- member personal tracking data
- several dashboard summary widgets and mobile role screens

### Live-ish But Not Fully Production-Real

These work conceptually but still need real integration hardening:

- auth/session flow
- mobile secure session handling
- attendance scan-to-server approval loop
- staff invites / permission editing persistence
- membership purchase activation from UI
- shop order fulfillment from end-user action through backend state

## Risks / Technical Debt to Address

- Expo SDK mismatch / simulator path is noisy and should be normalized
- some mobile routes still rely on view-local state
- personal tracking is presentational right now, not DB-backed
- web dashboard still uses seeded fallbacks for some cards/tables
- root unit-test script separation should be cleaned up so Vitest and Playwright do not overlap
- provider selection is abstracted but not yet fully exercised with real services
- Docker/Postgres local setup should be re-verified whenever environment changes

## Best Next Phase

If another model or teammate is taking over, the best next phase is:

1. stabilize mobile runtime and auth
2. connect UI screens to real API queries/mutations
3. wire one real provider per critical category
4. persist personal tracking and connect it to goals/attendance/plans
5. harden acceptance flows from seeded demo to real multi-tenant behavior

## Recommended Prompt Context for the Next Model

Tell the next model:

- Zook is an India-first multi-tenant gym operating system
- keep the existing stack: Next.js App Router, Expo Router, Prisma, PostgreSQL, Zod, TypeScript
- preserve provider abstractions; do not hardwire paid services directly
- keep dark-first glassmorphic design
- current repo is an alpha MVP scaffold with mock-first flows
- personal tracking is now a mobile feature slice and should be made persistent next
- prioritize real data wiring and runtime stability over adding many new surfaces
