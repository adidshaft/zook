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
- Trainer: assigned-client list only shows assigned clients; AI draft generation requires an assigned client, opens editable review, save edits persists exercises, review is required before assign, and assign creates a member notification.
- AI safety: with `AI_PROVIDER=mock` locally, try an out-of-scope or unsafe prompt and confirm the API returns a controlled validation error while `AIUsageLog` and audit records persist the block. With `AI_PROVIDER=disabled`, trainer generation should show unavailable state rather than fake success.
- Receptionist: pending/flagged queue loads; approve/reject persists; manual attendance requires reason; offline payment requires reason; pickup code verifies via backend; fulfilled count updates after fulfillment.
- Owner mobile: active members, check-ins, revenue, approvals, stock, and members use backend reads.
- Owner/admin web: dashboard, members, attendance, plans, payments, notifications, shop, reports, staff, audit, and provider diagnostics load from API/read models.
- Public web: `/g/{username}` shows persisted public plans/trainers/gallery when present and honest empty states when not; no join CTA appears when no public membership plan is published.
- Public join: `/join/{username}` must honor the persisted backend join mode even if the URL includes `?mode=OPEN_JOIN`; approval-required mode must not claim a request was submitted before an authenticated request exists.
- Referral web: `/r/{code}` must resolve only active referral codes. Unknown, inactive, or hidden-org codes should not silently fall back to `iron-house` outside explicit local/offline-demo fixture mode.
- Referral creation: `/api/orgs/{orgId}/referrals` must return `/join/{username}?ref={code}` and `/r/{code}` links, never `/join/{orgId}`.
- Public QR: `/qr/{username}?target=join` must encode `/join/{username}`; default/profile QR must encode `/in/{username}?source=qr`; local demo fallback should only work for known fixture usernames.
- Dashboard fallback: explicit offline demo may show `Demo Mode`; backend/read-model failures outside demo must show an unavailable/error state, not a demo-success label.
- Default Branch: owner dashboard and QR display show Default Branch context; membership plan creation stores the Default Branch; checkout/manual activation use a plan branch when present; `branchId` filters on dashboard/attendance/report endpoints reject branches from another org.
- Multi-branch limitation: shop inventory, shop orders, payment records, and revenue/manual-cash reports are org-wide in this MVP because those tables do not yet carry `branchId`.
- Platform admin: provider diagnostics load from `/api/platform/provider-status` and do not expose secret values.
- Notifications: create a selected-member notification; confirm the in-app inbox receives it, mark-read persists, unread count falls, and tap routing opens the expected plan/order/membership/attendance screen.
- Push: with `PUSH_PROVIDER=disabled`, product actions must still create in-app notifications and record provider-disabled delivery attempts without returning fake remote success.
- Storage: upload a valid `org_logo`, `org_cover`, or `org_gallery` file and confirm public pages use the returned `/api/files/{id}/content` URL; private categories must require auth and wrong-org files must be denied.

## Offline Demo Mode

Use this only for UI demos when backend services are unavailable.

```bash
APP_ENV=local API_MODE=offline-demo EXPO_PUBLIC_API_MODE=offline-demo pnpm dev:mobile
```

- Mobile shows the visible `DEMO MODE` badge.
- On iOS simulator/device, the `DEMO MODE` badge must not overlap role chips, account controls, or primary CTAs.
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
- If testing storage, set `STORAGE_PROVIDER=s3` or `r2` with the required bucket credentials and confirm public asset URLs actually resolve from the bucket/CDN. If storage is intentionally off, set `STORAGE_PROVIDER=disabled` and `FILE_UPLOADS_ENABLED=false`.
- If testing distributed rate limiting, set `RATE_LIMIT_PROVIDER=upstash`, `UPSTASH_REDIS_REST_URL`, and `UPSTASH_REDIS_REST_TOKEN`, then exhaust an OTP/payment/AI limit from two web server processes and confirm the shared counter blocks both. Diagnostics must not expose the Redis URL or token.
- If testing OpenAI, set `AI_PROVIDER=openai`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_IMAGE_MODEL`, and `OPENAI_TIMEOUT_MS`, then generate a trainer draft for an assigned client and document whether structured output, timeout behavior, and review-before-assign work end to end.
- If testing Expo push, register a real device token from an EAS/dev-client build, send a transactional test notification, and document whether the tap opened the intended deep link.

## Production Mode

```bash
APP_ENV=production API_MODE=backend pnpm release:preflight
```

- Offline demo must be blocked.
- Universal fixed OTP must be blocked.
- Mock payment completion must be blocked.
- Mock payment, AI, and push providers must be blocked; use provider-backed mode or `disabled` for a controlled unavailable state.
- If a required provider is missing, the feature should fail closed or show unavailable state.
- `RATE_LIMIT_PROVIDER=memory` and `RATE_LIMIT_PROVIDER=disabled` must be blocked; production should use `RATE_LIMIT_PROVIDER=upstash`.

## iPhone Release Build

From `apps/mobile`:

```bash
APP_ENV=production API_MODE=backend EXPO_PUBLIC_API_MODE=backend pnpm exec eas build --platform ios --profile production
```

- Confirm the installed build launches without Metro.
- Confirm it does not show `DEMO MODE`.
- Confirm missing backend URL produces a fatal configuration screen, not silent demo data.
- Confirm login, role selection, scan, notifications, and logout work against the selected backend.
- Confirm push permission denial keeps the in-app inbox usable.
- Confirm remote push only when installed on a physical device; do not treat Expo Go or simulator behavior as production push QA.

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
