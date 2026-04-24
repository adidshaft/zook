# Phase 5 Results

Last updated: 24 April 2026

## Phase Summary

Phase 5 moved the repo further from a private-pilot release candidate toward a staging-validatable build, with the strongest progress in:

- DB-gated test environment hardening
- mobile push registration and notification routing
- guardian web fallback UX
- deeper server-side minor consent gates
- additional private-pilot acceptance coverage

This pass does not complete every requested Phase 5 surface. The remaining gaps are documented below so staging work can continue honestly from the current branch.

## What Changed

### Test And Staging Readiness

- Added shared env loading precedence for tests: `.env.test.local`, `.env.test`, `.env.local`, `.env`
- Added `.env.test.example`
- Added `scripts/test-db-bootstrap.ts`
- Added root scripts:
  - `pnpm test:db:prepare`
  - `pnpm test:acceptance:db`
  - `pnpm test:acceptance:db:headed`
  - `pnpm test:acceptance:db:debug`
- Updated Playwright and Vitest env loading so DB-gated flows fail loudly only when explicitly requested
- Expanded Playwright helpers for OTP login, org seeding, mock checkout, API assertions, and console checks

### Mobile Readiness

- Added Expo push client wiring through `expo-notifications`
- Added push permission handling, Expo token registration, token refresh handling, and best-effort unregister on logout
- Added mobile push settings and device visibility in `Profile`
- Added deep-link and notification routing helpers plus dedicated mobile routes for:
  - `zook://g/:username`
  - `zook://join/:username?ref=CODE`
  - `zook://r/:code`
  - `zook://plan/:assignmentId`
  - `zook://order/:orderId`
  - `zook://membership`
  - `zook://notifications/:id`
- Added a dedicated mobile membership screen
- Added a dedicated attendance result screen for push follow-up
- Preserved authenticated redirect targets through login for protected deep links
- Added `apps/mobile/eas.json`

### Guardian And Minor Safety

- Added public guardian consent routes and UI:
  - `/guardian/consent/[challengeId]`
  - `/guardian-consent` redirect compatibility page
- Added shared server-side guardian verification handling
- Added org-aware guardian consent emails and challenge metadata
- Expire older pending guardian challenges when a newer one is created
- Enforced guardian consent before:
  - membership activation in payment runtime
  - attendance check-in
  - manual attendance override
  - PT subscription activation
  - plan assignment

### Payment Validation

- Tightened provider event identity generation for Razorpay-style webhook parsing so duplicate detection is more reliable in test coverage
- Updated payment provider tests for the new event identity behavior

## Acceptance Tests Added

DB-gated Playwright coverage now includes:

- owner pilot settings, report export, and audit trail validation
- guardian web consent flow unblocking membership checkout
- platform provider inspection plus suspend/reactivate flow

These are additive to the earlier Phase 4 acceptance coverage already present in the repo.

## Commands Run

### Passed

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test:services`
- `pnpm test:unit`
- `pnpm test:web`

### Failed For Expected Environment Reasons

- `pnpm release:preflight`
  - failed because `DATABASE_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_WEB_URL`, and mobile API URL env were not set in this workspace
- `pnpm test:db:prepare`
  - failed immediately with a clear `DATABASE_URL is not set` message
- `pnpm test:acceptance:db`
  - failed immediately with a clear `DATABASE_URL is not set for DB-gated acceptance tests` message
- `RUN_DB_WEB_TESTS=1 pnpm test:web`
  - smoke tests passed
  - DB-gated tests failed loudly with the expected missing `DATABASE_URL` message from `requireDb()`

## DB-Gated Test Status

- DB-gated acceptance execution is still blocked in this environment because `DATABASE_URL` is not configured.
- The fail-loud behavior required for Phase 5 is now implemented and verified.
- Do not claim DB-backed acceptance passed until `.env.test.local` or `.env.test` is populated and `pnpm test:db:prepare` succeeds against a real Postgres instance.

## Provider Validation Status

- Local/default provider path remains mock-first and safe for development
- Payment provider event parsing has stronger duplicate-event identity coverage
- Push provider selection and mobile registration flow are wired through the backend
- Full staging provider validation still needs a real staging env with:
  - `DATABASE_URL`
  - session and QR secrets
  - public app URLs
  - Expo project ID
  - optional live provider credentials for the selected staging profile

## Mobile Readiness Status

- Mobile push registration and tap routing are materially more complete
- Physical-device QA guidance now exists in:
  - `docs/mobile-private-pilot-qa.md`
  - `docs/eas-builds.md`
- Deep-link aliases and login redirect preservation are in place
- Remaining gaps:
  - no completed physical-device QA run recorded yet
  - local reminders and broader role-switch cleanup still need deeper implementation
  - push validation still depends on a real device build and configured Expo project credentials

## Staging Readiness Status

The repo is closer to staging validation, but not yet fully staging-ready from this workspace alone.

Blocking items still visible in current verification:

- no configured `DATABASE_URL`
- no configured public app URLs
- no configured mobile API base URL
- no full release preflight pass yet

## Known Limitations

- The full Phase 5 platform operations, reconciliation UI, privacy job operations, and owner-reporting scope are not all finished in this pass.
- DB-backed end-to-end acceptance has not run because the workspace does not have a real test database configured.
- Release preflight is still red for missing environment configuration.
- Mobile push behavior has unit coverage and UI plumbing, but not a recorded physical-device pilot run in this branch.

## Recommended Phase 6

- Stand up and validate a real staging environment with the full env matrix
- Run `pnpm test:db:prepare`, `RUN_DB_WEB_TESTS=1 pnpm test:web`, and `pnpm test:acceptance:db` against staging-compatible test data
- Finish payment reconciliation, incident operations, privacy job operations, and report/dashboard gaps
- Record physical-device QA on iOS and Android development or preview builds
- Add the remaining private-pilot journey coverage once DB-backed staging is available
