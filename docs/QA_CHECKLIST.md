# Zook QA Checklist

Last updated: 2026-05-03

## Local Backend Mode

Use this for normal development.

```bash
cp .env.example .env
pnpm db:local:setup
```

Manual equivalent:

```bash
docker compose up -d postgres
pnpm db:generate
pnpm db:deploy
pnpm seed:demo
APP_ENV=local API_MODE=backend pnpm preflight
pnpm dev:web
pnpm dev:mobile
```

- Web `/login`: request OTP for each seeded role and verify with the returned/dev OTP.
- Mobile login: member, trainer, receptionist, owner/admin restore session after app restart.
- Member: Home loads backend membership, scan QR from `/dashboard/attendance/qr-display`, open assigned plan, complete workout/progress, read notification, request privacy export/delete.
- Trainer: assigned-client list only shows assigned clients; create plan saves a backend draft; AI draft opens editable review; save edits persists; assign creates member notification.
- Receptionist: pending/flagged queue loads; approve/reject persists; manual attendance requires reason; offline payment requires reason; pickup code verifies via backend; fulfilled count updates after fulfillment.
- Owner mobile: active members, check-ins, revenue, approvals, stock, and members use backend reads.
- Owner/admin web: dashboard, members, attendance, plans, payments, notifications, shop, reports, staff, audit, and provider diagnostics load from API/read models.
- Platform admin: provider diagnostics load from `/api/platform/provider-status` and do not expose secret values.

## Offline Demo Mode

Use this only for UI demos when backend services are unavailable.

```bash
APP_ENV=local API_MODE=offline-demo EXPO_PUBLIC_API_MODE=offline-demo pnpm dev:mobile
```

- Mobile shows the visible `DEMO MODE` badge.
- Demo login supports role shortcuts and local demo OTP only in this mode.
- Offline demo API calls are contained in `apps/mobile/src/lib/demo-api.ts`.
- Push can no-op, but in-app demo notifications should still render.

## Staging Mode

```bash
APP_ENV=staging API_MODE=backend pnpm release:preflight
APP_ENV=staging API_MODE=backend pnpm db:deploy
```

- `API_MODE=offline-demo` must fail release checks and mobile config.
- `OTP_FIXED_CODE_DEV` must not work unless `ALLOW_FIXED_OTP_IN_STAGING=true`.
- Mock payment completion must be disabled unless `ALLOW_MOCK_PAYMENT_COMPLETION=true`.
- Provider diagnostics should show configured, disabled, missing, or unsupported providers without secrets.

## Production Mode

```bash
APP_ENV=production API_MODE=backend pnpm release:preflight
```

- Offline demo must be blocked.
- Universal fixed OTP must be blocked.
- Mock payment completion must be blocked.
- Mock payment, AI, and push providers must be blocked; use provider-backed mode or `disabled` for a controlled unavailable state.
- If a required provider is missing, the feature should fail closed or show unavailable state.

## iPhone Release Build

From `apps/mobile`:

```bash
APP_ENV=production API_MODE=backend EXPO_PUBLIC_API_MODE=backend pnpm exec eas build --platform ios --profile production
```

- Confirm the installed build launches without Metro.
- Confirm it does not show `DEMO MODE`.
- Confirm missing backend URL produces a fatal configuration screen, not silent demo data.
- Confirm login, role selection, scan, notifications, and logout work against the selected backend.

## Regression Checks

```bash
pnpm --filter @zook/core test
pnpm --filter @zook/core typecheck
pnpm --filter @zook/web typecheck
pnpm --filter @zook/mobile typecheck
pnpm --filter @zook/db typecheck
set -a; source .env; set +a; pnpm --filter @zook/db exec prisma validate --schema prisma/schema.prisma
pnpm release:preflight
```

Database-backed acceptance:

```bash
RUN_DB_WEB_TESTS=1 pnpm test:web
pnpm test:acceptance:db
```

Only run DB-backed checks when `DATABASE_URL` points to a seeded disposable database.
