# Phase 2 Results

Last updated: 24 April 2026

## Phase Name

**Phase 2: Backend-Integrated Beta Foundation**

## Current Stage

Zook is now best described as a **backend-integrated beta foundation**.

It is no longer mainly a UI-first scaffold:

- web and mobile now share the same OTP/session backend
- major screens pull persisted data from API/database paths
- membership, attendance, notifications, tracking, plans, and shop flows all have real server-backed behavior

It is still not production-ready. The remaining gaps are mostly around live-provider rollout, broader UI completion, and operational hardening rather than basic architecture.

## What Is Done

### Foundation

- pnpm monorepo stabilized
- root scripts cleaned and separated for unit vs Playwright coverage
- complete `.env.example`
- Prisma schema and seed data kept intact and extended

### Auth And Sessions

- unified email OTP backend for web and mobile
- hashed OTP and hashed session storage
- secure cookie path for web
- bearer token path for mobile
- SecureStore session persistence with safe fallback for dev runtimes
- `/api/auth/me` and `/api/auth/session` usable from both clients

### Tenant Context / RBAC / Audit

- consistent request context resolution
- tenant-scoped permission checks hardened
- platform-admin isolation preserved
- privileged mutations write audit logs
- error model normalized

### API/Data Wiring

- member home, memberships, attendance, notifications, goals, shop orders, tracking, owner dashboard, trainer clients, and reception queue now use API-backed queries
- web dashboard and platform pages now use persisted summary metrics instead of seeded constants

### Tracking

- workout sessions persisted
- exercise entries persisted
- body progress persisted
- habits and habit logs persisted
- member home and tracking history read from the database

### Membership / Join / Payments

- open join, approval required, and invite-only behavior enforced
- join requests persisted, approvable, and rejectable
- mock checkout activation happens server-side
- coupon and referral redemptions are persisted
- manual/offline membership activation is persisted and audited

### Attendance

- signed rolling QR tokens
- scan-to-server validation
- duplicate protection and replay checks
- visit-pack consumption on approval
- approval queue and reject flow
- manual override with required reason

### Notifications

- notification records and recipients persisted
- read state persisted
- preference records persisted
- promotional/minor preference filtering enforced
- trainer assigned-client messaging scope enforced

### Plans / AI / Trainer

- plan library listing route
- plan creation persists version 1 snapshot
- plan assignment is restricted to assigned clients unless elevated permission exists
- member progress updates are ownership-checked
- member AI chat flows through the backend only
- trainer AI plan generation can persist a draft plan
- AI usage logging persists provider, role, request type, and quota consumption

### Shop / Inventory

- product CRUD persists
- orders persist
- stock changes only after payment success
- inventory movements persist
- pickup codes persist
- fulfillment persists and audits

### Mobile Runtime

- better API base URL defaults for iOS simulator vs Android emulator
- QR screen handles permission-unavailable paths more clearly
- manual token path stays available for simulator/dev testing

### Dashboards

- owner/admin dashboard cards are backed by DB summary data
- platform page uses DB-backed org, AI, and abuse summaries
- dashboard shell now shows honest empty states instead of decorative fallback rows

## What Is API/Database-Backed Now

These flows are now materially backed by persisted server state:

- login OTP request and verification
- web + mobile session restore
- org dashboard summary
- gym public profile lookup
- join request creation
- membership checkout creation
- mock payment completion
- membership activation
- attendance QR generation
- attendance scan validation
- attendance approvals and rejections
- manual attendance
- manual payments
- notifications and read state
- workout tracking
- plan listing and progress
- trainer client listing
- AI usage logging
- shop order creation
- shop payment completion
- pickup code generation
- shop fulfillment
- platform org listing/status change

## What Is Still Mock

- email delivery transport by default
- payment provider by default
- map/geocode provider by default
- AI provider by default
- push delivery by default
- storage provider by default

These are mock by design, not because the architecture is missing.

## What Is Still Lightweight Or Incomplete

- dashboard sections beyond the main summary shell are still intentionally minimal
- trainer and receptionist mobile surfaces are functional but not yet deep operational suites
- no realtime infra; polling is used where needed
- physical-device push remains mocked
- live-provider certification and webhook security for real processors still need a later phase
- multi-branch is modeled but the UI remains effectively single-branch

## What Needs Attention Next

1. Add one real provider path per critical category:
   - email
   - payments
   - storage
   - optionally maps

2. Deepen operational web surfaces:
   - join request table actions
   - product management forms
   - reports views
   - audit views

3. Expand member and trainer mobile flows:
   - plan detail screen
   - more polished AI conversation UI
   - richer PT and client detail flows

4. Add more DB-backed acceptance coverage:
   - attendance scan simulation
   - receptionist flows
   - platform status mutation verification

5. Prepare deployment/runtime work:
   - production env handling
   - secure cookie configuration
   - provider secrets
   - observability

## Live vs Mock

### Live

- Next.js app and API
- Prisma/PostgreSQL model
- request context and RBAC
- OTP/session auth logic
- dashboard summary metrics
- tracking persistence
- membership state transitions
- attendance approval loop
- notification recipient persistence
- plan assignment/progress
- shop order/inventory state

### Mock

- email send transport
- external payment processor
- maps
- AI provider by default
- push delivery
- storage backend

## Seed Accounts

- `platform@zook.local`
- `pilot-owner.test`
- `admin@zook.local`
- `reception@zook.local`
- `trainer@zook.local`
- `member@zook.local`
- `minor@zook.local`

Development OTP: `000000`

## Verification Snapshot

Commands run during final verification:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test:services`
- `pnpm test:unit`
- `pnpm test:web`

Observed results:

- `pnpm lint` passed
- `pnpm typecheck` passed
- `pnpm test:services` passed
- `pnpm test:unit` passed
- `pnpm test:web` passed with 4 smoke tests green and 4 DB-gated tests skipped by default

Additional DB-gated attempt:

- `RUN_DB_WEB_TESTS=1 pnpm test:web` failed in the current local environment because the Playwright-started Next.js server did not have `DATABASE_URL` set, so `POST /api/auth/request-otp` returned Prisma `Environment variable not found: DATABASE_URL` before the OTP field could appear.

To rerun the full seeded acceptance flow successfully, ensure:

1. PostgreSQL is running
2. `.env` exists with `DATABASE_URL`
3. the web server is started in an environment that actually exports that variable

## Best Next Prompt For A Follow-On Model

If you hand this to another model, describe Zook like this:

- existing pnpm monorepo
- Next.js App Router web/API
- Expo Router mobile app
- Prisma/PostgreSQL
- Zod + service-layer business logic
- provider registry with mock defaults
- Phase 2 complete: auth, tracking, memberships, attendance, notifications, plans/AI, shop, dashboards are backend-integrated
- next priority is deepening operational UI and introducing selected real providers without breaking low-cost local development
