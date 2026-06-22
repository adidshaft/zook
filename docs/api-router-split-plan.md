# API Router Split Plan

Last updated: 2026-06-18

`apps/web/src/server/api-router.ts` is now a compatibility shim. Runtime wrapping and handler ordering live in `apps/web/src/server/api-router/runtime.ts` and `apps/web/src/server/api-router/registry.ts`; shared helper/schema support lives in `apps/web/src/server/api-router/core.ts`.

## Goal

Keep the public API contract unchanged while moving handler groups into focused modules.

## Constraints

- Do not change route paths.
- Do not change response shapes.
- Do not change auth, org-scope, audit, or permission behavior.
- Keep the existing top-level route wrapper as the contract boundary until every moved handler has tests.

## Completed Mechanical Split

1. Public import path preserved at `apps/web/src/server/api-router.ts`.
2. Request ID, CSRF/mutation guard, idempotency, error reporting, and logging moved to `runtime.ts`.
3. Handler dispatch order moved to `registry.ts`.
4. Existing handler implementation was first moved without route-path or response-shape changes to `core.ts`.
5. Route groups were then extracted from `core.ts` into focused handler modules while preserving dispatch order.

## A4.1 Extraction Status

Complete as of 2026-06-18.

- `core.ts` no longer exports a catch-all API route handler. It remains as shared helpers,
  schemas, runtime guards, and cross-cutting utilities used by the focused modules.
- `registry.ts` now dispatches directly to domain handlers before falling through to
  unmatched-route handling.
- Extracted modules include:
  - `ai.ts`
  - `attendance.ts`
  - `auth.ts`
  - `classes.ts`
  - `coupons-referrals.ts`
  - `cron.ts`
  - `files.ts`
  - `health-readiness.ts`
  - `manual-payments.ts`
  - `me-data.ts`
  - `member-memberships.ts`
  - `member-plans-goals.ts`
  - `membership-payments.ts`
  - `membership-subscription-actions.ts`
  - `notifications-inbox.ts`
  - `organization-audit-logs.ts`
  - `organization-billing.ts`
  - `organization-branches.ts`
  - `organization-join-requests.ts`
  - `organization-members.ts`
  - `organization-membership-plans.ts`
  - `organization-notifications.ts`
  - `organization-overview.ts`
  - `organization-payments.ts`
  - `organization-permissions.ts`
  - `organization-profile.ts`
  - `organization-root.ts`
  - `payment-sessions.ts`
  - `personal-training.ts`
  - `plans-challenges.ts`
  - `platform-audit.ts`
  - `platform-broadcasts.ts`
  - `platform-flags.ts`
  - `platform-moderation.ts`
  - `platform-monitoring.ts`
  - `platform-org-admin.ts`
  - `platform-payments.ts`
  - `platform-settings.ts`
  - `platform-users.ts`
  - `privacy.ts`
  - `products.ts`
  - `public-organizations.ts`
  - `push-devices.ts`
  - `reports.ts`
  - `shop-orders.ts`
  - `staff.ts`
  - `support.ts`
  - `tracking.ts`
  - `trainer-client-wellness.ts`
  - `trainer-operations.ts`

## Follow-Up Hardening

The split preserved behavior and route contracts. Future work should continue improving
route-specific coverage where a module has only indirect test coverage.

## Required Tests Per Extraction

- Happy path for the moved handler group.
- Wrong-role denial.
- Wrong-org denial.
- Missing auth behavior.
- Input validation failure.
- Audit/log side effect when applicable.

## Stop Conditions

- Any behavior change outside import paths.
- Any circular dependency between handler modules.
- Any extracted module needing direct access to unrelated domain state.
- Any test that must be rewritten because the API contract changed.
