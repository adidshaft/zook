# Phase 3: Operational Beta, Provider Readiness, and Deployment Hardening

Last updated: 24 April 2026

## Why this phase exists

Phase 2 moved Zook from a mostly UI-led alpha into a backend-integrated beta foundation. The next step is not a rewrite. It is operational depth.

The repository already has the right backbone:

- a pnpm monorepo with `apps/web`, `apps/mobile`, `packages/core`, `packages/db`, and `packages/ui`
- a Next.js App Router dashboard/API host
- an Expo Router mobile app
- Prisma/PostgreSQL data models and seed data
- a service-layer architecture for auth, attendance, payments, plans, referrals, notifications, AI, privacy, and platform admin
- provider abstractions with mock-first defaults
- shared Zod validators, types, and permission policies

What is missing is private-pilot readiness:

- live provider paths are only partially implemented
- DB-gated acceptance runs are not reliable enough
- web operational sections are still summary-first rather than operator-first
- mobile staff flows are usable but still thin
- reporting, CSV export, consent tooling, and deployment guidance need another pass
- webhook, rate limit, audit, and privacy controls need stronger hardening

This phase upgrades Zook into an operational beta that stays cheap locally with mocks while becoming staging-ready for controlled real-gym demos.

## Current repository findings

- `apps/web/src/server/api-router.ts` already hosts a wide API surface through a centralized handler. It includes auth, public gym discovery, memberships, attendance, plans, notifications, shop, privacy, and platform actions.
- `packages/core/src/providers/registry.ts` already exposes the intended selection seams:
  - `getEmailProvider()`
  - `getPaymentProvider()`
  - `getMapProvider()`
  - `getAIProvider()`
  - `getStorageProvider()`
  - `getPushProvider()`
- Current provider selection is still permissive and mostly silent:
  - email supports mock and Resend, but SMTP is not implemented
  - payments are still mock-only
  - maps support mock and a lightweight Google path
  - AI supports mock and a thin OpenAI path
  - storage is local-only in practice
  - push is mock-only
- `playwright.config.ts` starts Next.js without explicitly loading the env matrix that DB-gated runs depend on.
- `apps/web/app/dashboard/[[...section]]/page.tsx` and `apps/web/src/components/dashboard-shell.tsx` already support a catch-all dashboard model, but most sections still render broad summary cards and a few targeted panels instead of full operational screens.
- `apps/mobile` already uses backend auth, org-aware queries, and API-backed flows for members and staff. The app structure is well suited for deeper role-based screens without changing the navigation foundation.
- `packages/db/prisma/schema.prisma` already models most of the required domains:
  - organizations, branches, roles, permissions
  - memberships, join requests, coupons, referrals
  - attendance QR and approval records
  - payments, manual adjustments, invoices
  - plans, AI conversations and usage
  - notifications
  - shop, inventory, pickup
  - consent and guardian flows
  - audit logs and abuse flags
- Some Phase 3 models are still missing or need extension:
  - `PaymentEvent`
  - explicit data-export and deletion request models, or a stronger replacement over the current consent-only placeholder
  - richer file asset ownership and visibility metadata
  - additional audit metadata for exports and security events

## Phase goals

1. Stabilize the local and DB-backed test/runtime environment.
2. Upgrade provider factories so real integrations are optional, validated, and diagnostics-friendly.
3. Add one credible live-provider path per critical category while preserving mock-first local development.
4. Expand owner/admin/receptionist/trainer web operations beyond summary cards.
5. Deepen mobile member, trainer, receptionist, and owner workflows.
6. Improve maps, deep links, referrals, install fallback, and public discovery.
7. Add reporting, analytics, and CSV exports with RBAC and audit coverage.
8. Strengthen AI safety, history, quotas, and plan drafting.
9. Harden privacy, consent, minors, deletion/export requests, and security controls.
10. Document deployment, staging, and private-pilot operations clearly.

## Provider choices

Zook will remain mock-first by default. Real providers activate only when explicitly selected and fully configured on the server.

### Email

- default: `mock`
- live path: `smtp`
- optional live path: `resend`

Why:

- SMTP is staging-friendly and broadly deployable.
- Resend is easy to support as an optional API provider.
- The auth flow should continue to depend only on `EmailProvider`, not on transport-specific logic.

### Payments

- default: `mock`
- live path: `razorpay`

Why:

- Razorpay is the best India-first fit for hosted web checkout and server-verified webhook flows.
- Mobile and web clients will never call Razorpay directly.
- Activation remains strictly server-side after verified success.

### Storage

- default: `local`
- live path: `s3`
- compatible path: `r2`

Why:

- A single S3-compatible implementation covers AWS S3, Cloudflare R2, and other low-cost object stores.
- Local development can keep using the filesystem and signed/local URLs.

### Maps

- default: `mock`
- live path: `google`

Why:

- Google Maps gives the easiest search/geocode/deep-link parity for gym discovery and owner location setup.
- The app must still degrade gracefully to list-only and manual coordinates.

### AI

- default: `mock`
- live path: `openai`

Why:

- The repository already contains an OpenAI provider seam.
- Phase 3 should improve guardrails, structured output handling, quotas, and storage-backed image generation without exposing any secrets to clients.

### Push

- default: `mock`
- optional future-ready path: `expo`

Why:

- Physical-device push is still not required for local development.
- Phase 3 should make the selection path and diagnostics cleaner, while keeping mock delivery as the safe default.

## Workstreams and implementation order

### 1. Runtime and acceptance stability

- fix Playwright web server env forwarding and dotenv loading
- split smoke vs DB-gated test behavior
- add `pnpm preflight`
- add runtime checks:
  - Node/pnpm version
  - `DATABASE_URL`
  - database reachability
  - Prisma client presence
  - required local envs
  - provider configuration warnings
  - Expo/mobile base URL hints
- normalize root scripts and `.env.example`
- add `docs/phase-3-results.md` notes whenever an environmental failure cannot be solved in-code

### 2. Provider registry hardening

- make each provider factory explicit, validated, and diagnostic
- return mock/default when no live provider is selected
- throw helpful setup errors when a live provider is selected but env is incomplete
- expose safe diagnostics for platform admins at `/api/platform/provider-status`

### 3. Email transport and templates

- expand `EmailProvider` for OTP, notifications, invites, guardian consent, and lifecycle emails
- add branded dark Zook email templates
- implement `SMTPEmailProvider`
- improve `ResendEmailProvider`
- ensure mock delivery is safe and testable

### 4. Storage-backed uploads

- expand `StorageProvider`
- add local filesystem-backed persistence and S3-compatible implementation
- store upload metadata in `FileAsset`
- add file category rules, tenant-aware access control, and safe key generation
- wire uploads into profile photos, org branding, UPI QR, product images, plan images, and proof/photo flows that already exist in the schema

### 5. Payment hardening

- keep mock hosted checkout working
- add `RazorpayPaymentProvider`
- add a verified webhook ingestion route
- add `PaymentEvent`
- harden payment state transitions, idempotency, and reconciliation visibility
- ensure membership/shop activation occurs only once after verified success

### 6. Maps, discovery, and location editing

- improve `MapProvider`
- add Google Maps optional integration
- deepen owner location setup with address/manual lat-lng/link parsing/place search
- make public/member discovery more practical with search, nearby sort, chips, and visibility rules

### 7. Deep links and referrals

- configure `zook://` deep links in Expo
- preserve referral state through auth and join
- add better referral management on web
- improve web fallback pages for install and open-in-app behavior

### 8. Web operational expansion

- deepen the dashboard shell with practical data tables, forms, drawers, status badges, exports, and filters
- add or improve routes for:
  - members
  - join requests
  - membership plans
  - payments/manual payments
  - attendance/approvals/QR
  - staff/permissions
  - notifications
  - plans/PT/trainers
  - shop products/orders
  - audit
  - reports
  - billing
- keep role-aware access control and audit logging on all mutations and exports

### 9. Mobile product expansion

- member:
  - richer home
  - better gym discovery/profile
  - membership detail
  - QR states
  - tracking and plan flows
  - safer AI chat
  - notifications/shop/profile privacy
- trainer/reception/owner:
  - deeper operational dashboards
  - scoped client/member flows
  - PT/payment/join/shop actions where allowed

### 10. Reporting, AI safety, privacy, and security

- add `ReportsService` and CSV exports
- improve AI guardrail services, history, quota visibility, and draft review flows
- strengthen consent, guardian, export, and deletion workflows
- add rate limiting, webhook protection, request IDs, safer errors, and headers

### 11. Platform admin expansion

- deepen org oversight, provider status, payments, AI usage, abuse, audit, and users
- ensure suspended org behavior is enforced in the product surface as well as in services

### 12. UI polish and deployment readiness

- standardize premium glassmorphic components for web and mobile
- improve empty/loading/error states
- ensure responsive and safe-area-friendly layouts
- add deployment guidance, EAS/deep-link/app config updates, and low-cost staging recommendations

## Testing plan

### Unit and service coverage

- provider registry behavior
- provider validation failures
- email, storage, payment, maps, referral, report, privacy, AI, and security service rules
- RBAC and cross-tenant denial paths
- rate limit behavior
- webhook verification and idempotency

### Web acceptance coverage

- default smoke tests stay runnable without a seeded DB where possible
- DB-gated flows run only when:
  - `RUN_DB_WEB_TESTS=1`
  - `DATABASE_URL` is present
  - the Next.js server started by Playwright sees the same env
- add seeded owner/member/receptionist/trainer/platform acceptance flows

### Mobile verification

- add component/unit coverage where current test setup allows
- document a practical Phase 3 manual QA checklist for Expo on simulator/device

### Final verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test:services`
- `pnpm test:unit`
- `pnpm test:web`
- `RUN_DB_WEB_TESTS=1 pnpm test:web` when DB is available

## Major risks

- `apps/web/src/server/api-router.ts` is already large. Phase 3 should keep using the central route surface, but extract helpers where necessary to avoid a maintenance cliff.
- New Prisma models will require careful seed updates and DB reset/reseed testing.
- Real provider paths can fail in partially configured staging environments, so factory validation and diagnostics must be explicit.
- File upload and webhook routes introduce the highest security risk in this phase and need stricter validation than the Phase 2 baseline.
- Mobile deep links, referral persistence, and staged provider fallback behavior can regress across web and native if not tested together.
- Dashboard and mobile surface expansion can create visual sprawl if UI primitives are not standardized early in the phase.

## Rollback notes

- Mocks remain the default path, so provider rollout can be disabled by environment change instead of code removal.
- New real-provider adapters will be additive and factory-gated.
- New web/mobile operational screens should continue to degrade to empty states instead of blocking existing routes.
- Payment webhook handling and event persistence should be additive to the mock checkout path, not a replacement.
- If a new model or route proves unstable, keep the seeded demo path functional and document the limitation in `docs/phase-3-results.md`.

## Definition of done

Phase 3 is complete when:

- local development still works with mock providers and seeded data
- staging can optionally use SMTP/Resend, S3/R2, Google Maps, OpenAI, and Razorpay paths
- operational web routes are useful for day-to-day demo operations
- mobile member and staff flows feel product-ready rather than placeholder-heavy
- reports and CSV exports exist with RBAC and audit coverage
- provider diagnostics, referral/deep-link flows, privacy tools, and security hardening are in place
- acceptance coverage is more reliable and clearly split between smoke and DB-backed runs
- deployment and private-pilot docs reflect the real Phase 3 runtime
