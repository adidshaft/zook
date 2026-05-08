# Testing

## Commands

```bash
pnpm test:unit
pnpm test:services
pnpm test:web
pnpm test:acceptance
pnpm test:acceptance:db
pnpm lint
pnpm typecheck
```

## What Runs Where

### `pnpm test:unit`

Runs Vitest through the root config. Playwright specs are excluded so browser tests do not collide with service tests anymore.

Current coverage includes:

- auth OTP lifecycle and logout
- membership validity and renewal windows
- coupon calculation
- referral anti-self-referral
- payment session transitions
- manual payment adjustments
- QR signing and validation
- attendance duplicate protection and approval mode mapping
- RBAC and notification permission logic
- AI safety, scope, and quota rules
- shop order calculations
- personal tracking helpers
- provider registry defaults and fallbacks

### `pnpm test:services`

Runs the service-layer Vitest suite directly for backend business rules.

### `pnpm test:web` / `pnpm test:acceptance`

Runs Playwright against the web app.

Two layers exist:

- always-on smoke coverage for static rendering and route availability
- DB-gated acceptance coverage for seeded auth and mutation flows

Enable DB-backed web acceptance flows with:

```bash
pnpm test:db:prepare
RUN_DB_WEB_TESTS=1 pnpm test:web
```

`pnpm test:acceptance:db` runs the same DB-backed acceptance suite through the shortcut script.

Those acceptance flows now cover:

- login with OTP
- owner dashboard access
- membership plan creation
- public gym discovery surfaces
- join-mode guards and referral username links
- membership checkout and activation
- payment access/idempotency boundaries
- shop order success, pickup code verification, and fulfillment
- default-branch filters and QR target behavior
- Reception attendance approve/reject with member notifications and audit logs
- notification creation
- tracking workout creation
- trainer AI draft assignment and trainer-visible workout reports
- privacy export/delete job creation and audit logs
- platform diagnostics and organization status controls
- QR display route rendering

## Manual Acceptance Flows

The current local acceptance checklist is:

1. Owner logs in and reaches dashboard metrics from the database
2. Owner creates a plan and reviews join requests
3. Member logs in on mobile, joins or requests to join a gym, completes mock checkout, and sees an active membership
4. Member scans or pastes a QR token and sees attendance status from the backend
5. Member logs a workout session and sees tracking history persist
6. Trainer generates an AI draft, assigns it to a client, records PT, and sends a scoped notification
7. Reception reviews attendance approvals, records a manual payment, and fulfills pickup
8. Internal platform operator views org metrics and status controls

## Known Constraints

- DB-backed acceptance coverage requires local PostgreSQL and seed data.
- Physical-device mobile QA is still best for camera validation.
- Mock providers keep external-network requirements low; they are not a replacement for live-provider certification.
