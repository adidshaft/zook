# API Router Split Plan

Last updated: 2026-05-17

`apps/web/src/server/api-router.ts` remains intentionally large. It is working, but it is now a maintainability risk. Split it mechanically after the current production rehearsal, not during a provider or UI stabilization pass.

## Goal

Keep the public API contract unchanged while moving handler groups into focused modules.

## Constraints

- Do not change route paths.
- Do not change response shapes.
- Do not change auth, org-scope, audit, or permission behavior.
- Keep the existing top-level route wrapper as the contract boundary until every moved handler has tests.

## Suggested Order

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
