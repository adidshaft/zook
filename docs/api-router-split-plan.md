# API Router Split Plan

Last updated: 2026-05-17

`apps/web/src/server/api-router.ts` is now a compatibility shim. Runtime wrapping and handler ordering live in `apps/web/src/server/api-router/runtime.ts` and `apps/web/src/server/api-router/registry.ts`; the behavior-preserving handler body lives in `apps/web/src/server/api-router/core.ts`.

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
4. Existing handler implementation moved without route-path or response-shape changes to `core.ts`.

## Remaining Suggested Order

1. Extract pure helpers and shared response utilities.
2. Extract auth/session handlers.
3. Extract public gym, join, and checkout handlers.
4. Extract member/mobile handlers.
5. Extract reception handlers.
6. Extract trainer handlers.
7. Extract owner dashboard handlers.
8. Extract platform handlers.
9. Extract provider diagnostics and health/ready handlers.

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
