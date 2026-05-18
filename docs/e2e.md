# Zook E2E

This suite is split into web dashboard actions, mobile Maestro flows, and cross-system integration tests.

## Prerequisites

- Node and pnpm installed for this repo.
- Test database is available through `DATABASE_URL`.
- iOS simulator: iPhone 16 Pro, UDID `16E85351-C822-4E5D-8C0F-15A50B8BFA5C`.
- Android emulator or device visible to `adb devices`.
- Maestro CLI at `~/.maestro/bin/maestro`.
- Metro running on `8081` before mobile tests.
- Seeded Next.js backend running on `3000` before Maestro tests.

## Seed And Backend

Prepare the database:

```sh
pnpm test:db:prepare
```

For mobile, stop any stale `next dev` on port `3000`, then run:

```sh
cd apps/web
RUN_DB_WEB_TESTS=1 OTP_FIXED_CODE_DEV=000000 ENV_PROFILE=local \
  AI_FEATURES_ENABLED=true AI_PROVIDER=mock \
  PAYMENT_PROVIDER=mock ALLOW_MOCK_PAYMENT_COMPLETION=true \
  ERROR_REPORTER=mock RATE_LIMIT_PROVIDER=disabled \
  NEXT_DIST_DIR=.next-mobile-e2e \
  PORT=3000 pnpm dev
```

Verify the backend:

```sh
curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/api/health
curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/api/auth/session
curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/api/auth/sessions
```

Expected results are `200`, `401`, and `401`.

## Web

The render sweep and existing dashboard checks:

```sh
RUN_DB_WEB_TESTS=1 pnpm test:web
```

`test:web` runs the existing API/RBAC/accessibility checks first, then splits the walkthrough
matrix into public+owner and one-role chunks so each chunk gets a fresh Next.js dev server. This
keeps the 150s per-test budget focused on route health instead of accumulated dev-server compile
memory.

Interactive dashboard action coverage:

```sh
pnpm test:web:actions
```

The action suite sets mock providers and SSO client IDs for local smoke tests. Google and Apple tests verify configured provider initiation and callback failure handling for malformed tokens. Real provider account auth still needs a signed production/staging client and manual TestFlight/browser verification.

## Mobile

Start Metro:

```sh
pnpm dev:mobile
```

Confirm Maestro targets iOS:

```sh
~/.maestro/bin/maestro --platform ios --udid 16E85351-C822-4E5D-8C0F-15A50B8BFA5C --help
```

Confirm Android can reach the local backend and Metro:

```sh
adb devices
adb reverse tcp:3000 tcp:3000
adb reverse tcp:8081 tcp:8081
```

Run all iOS flows:

```sh
pnpm test:mobile:maestro
```

Run all Android flows:

```sh
pnpm test:mobile:maestro:android
```

The mobile script reseeds the pilot/demo dataset before launching Maestro. This keeps the mobile leg
stable when it is run after web action specs that create plans, orders, notifications, and sessions.

Screenshots should be written under `/tmp/zook-maestro/<role>/<step>.png`.

## Integration

Run cross-system tests after the seeded `:3000` backend and Metro are healthy:

```sh
pnpm test:integration
```

Integration specs call focused Maestro flows from `apps/mobile/.maestro/integration/` via
Playwright. Those flows are intentionally outside `apps/mobile/.maestro/flows/*.yaml` so the
mobile-only suite remains independently runnable.

Full suite:

```sh
pnpm test:e2e
```

## Troubleshooting

- `/api/auth/sessions` must return `401`, not `404` or `500`; it is a compatibility alias for `/api/auth/session`.
- If Maestro selects the wrong platform, pass `--platform ios` with the simulator UDID or `--platform android` explicitly.
- If Android cannot authenticate, re-run `adb reverse tcp:3000 tcp:3000` and `adb reverse tcp:8081 tcp:8081`.
- If mobile login fails, check that port `3000` is the seeded backend and `OTP_FIXED_CODE_DEV=000000` is set.
- If trainer/member AI flows fail, confirm the seeded backend was started with `AI_FEATURES_ENABLED=true AI_PROVIDER=mock`.
- If local `next dev` loads the wrong Node version in a detached shell, start it from a login shell such as `zsh -lic`.
- Keep the seeded `:3000` mobile backend on `NEXT_DIST_DIR=.next-mobile-e2e`; Playwright runs a second Next server on `:3120`, and sharing `.next` can corrupt dev chunks.
- If web actions hit rate limits, use the scripted command so `PLAYWRIGHT_RATE_LIMIT_PROVIDER=memory` is active.
- If SSO smoke fails, confirm the local test client IDs are present in the test command and that production secrets are not required for local callback rejection tests.
