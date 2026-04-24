# Architecture

## Monorepo

```text
apps/
  mobile/  Expo Router app for members + staff
  web/     Next.js App Router dashboard, public pages, API host
packages/
  core/    shared types, validators, policies, services, providers
  db/      Prisma schema, client, seed
  ui/      shared tokens and web primitives
  config/  shared TS / ESLint / Prettier config
docs/
```

## Runtime Shape

- `apps/web` hosts the API through a centralized catch-all adapter at `/api`.
- Route handlers validate input with Zod, build request context, enforce RBAC, call service/policy helpers, and return a typed JSON envelope.
- `packages/core` contains policy logic and provider abstractions so most business-rule tests stay database-light.
- `packages/db` owns Prisma schema and seed data.

## Request Context

The request context resolves:

- current session from cookie or bearer token
- current user
- active organization context
- org-scoped roles and permission overrides
- platform-admin capability

Every org-scoped mutation now requires explicit `orgId` and permission checks.

## Provider Boundary

`packages/core/src/providers/registry.ts` is the provider seam for backend runtime selection.

Current selection behavior:

- email: mock by default, Resend when configured
- AI: mock by default, OpenAI when configured
- maps: mock by default, Google Maps when configured
- payment: mock default
- push: mock default
- storage: local default

This keeps local development cheap while making paid providers a backend-only swap later.

## Data Flow Highlights

- **Auth**: OTP challenge -> hashed session token -> web cookie or mobile SecureStore token -> `/api/auth/me`
- **Memberships**: join request or direct checkout -> `PaymentSession` -> mock checkout -> confirmed server-side activation
- **Attendance**: QR token generation -> signed token validation -> attendance record -> approval queue -> membership usage
- **Notifications**: sender permission check -> recipient expansion -> `Notification` + `NotificationRecipient`
- **Shop**: order -> mock checkout -> stock decrement + inventory movement + pickup code on success
- **Tracking**: workout/habit/body progress entries persist directly through `/api/me/tracking/*`

## UI Architecture

- Web is still a single dark glass dashboard shell, but key sections now host real operational panels (QR token, approvals, notifications).
- Mobile uses lightweight query-driven screens instead of a heavy global state store.
- Seed data is kept so the product remains demoable after `pnpm db:seed`.
