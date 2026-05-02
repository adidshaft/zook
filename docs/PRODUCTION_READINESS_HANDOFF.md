# Zook Production Readiness Handoff

Last updated: 2026-05-03
Branch: `ui-ux-production-polish-pass`

## Current Status

Zook is now closer to a durable full-stack MVP than an offline prototype. Backend mode is the default, offline demo mode is explicit/local-only, public web gym pages and mobile role flows are increasingly backend-backed, and mock/provider behavior is guarded by environment rules.

This is not a final launch certification. Payments, push, AI, object storage, the initial Prisma migration deploy, and distributed rate limits still need provider/staging validation before production claims.

## Backend-Backed Now

- OTP auth, sessions, logout, role/org context, and secure mobile token storage.
- Member home, memberships, attendance, plan assignments/progress, shop orders, notifications, profile/settings, and privacy request creation.
- QR attendance scanning now returns a deterministic entry code for real backend scans.
- Receptionist queue, approve/reject, manual attendance, backend code verification, offline payment records, pickup fulfillment, and fulfilled-count summary.
- Trainer assigned clients, mobile plan draft creation, AI draft generation, editable draft save, assignment, notification fanout, and plan update audit/versioning.
- Owner mobile dashboard reads, approvals, revenue, stock, and members.
- Owner/admin web dashboard/read-model panels and platform provider diagnostics.
- Public web gym/join pages read from Prisma first, with fixture fallback only in explicit local/offline-demo mode.

## Still Mocked Or Provider-Ready

- Offline mobile demo remains in `apps/mobile/src/lib/demo-api.ts` for local demos.
- Mock payment provider remains for local checkout confirmation; staging requires explicit opt-in and production blocks mock completion.
- AI provider can be mock in local, OpenAI when configured, or unavailable if misconfigured in non-local modes.
- Push can use mock/local records or Expo when configured; real push still needs device QA.
- Local storage provider remains the default for local files; S3/R2 are provider-ready but need environment setup and QA.
- Public `/checkout/mock/demo` is only a local visual/demo path and does not claim live activation.

## Launch Gaps

- Apply and validate the initial Prisma migration baseline against a disposable staging database before using a shared staging/prod database.
- Replace in-process rate limiting with shared infrastructure for OTP, AI, attendance scan, payments, and uploads.
- Complete Razorpay test-mode hosted checkout and webhook certification.
- Complete Expo push device testing on physical iOS/Android devices.
- Confirm OpenAI/provider safety behavior with real credentials and role-specific prompts.
- Finish multi-branch UI beyond the default-branch happy path.
- Expand DB-backed integration and E2E coverage across all role flows.

## How To Test Each Role

- Member: login as `member@zook.local`; verify Home, Check in, Plan, Notifications, Shop, Profile, and Privacy.
- Trainer: login as `trainer@zook.local`; open assigned client, create/save plan, generate AI draft, edit/save draft, assign, and confirm member notification.
- Receptionist: login as `reception@zook.local`; review queue, verify entry/pickup codes, record manual attendance, record offline payment, fulfill pickup.
- Owner/admin: login as `owner@zook.local` or `admin@zook.local`; check owner mobile command view and web dashboard control-room screens.
- Platform admin: login as `platform@zook.local`; inspect orgs, provider diagnostics, AI usage, and abuse flags.

## Run Commands

```bash
pnpm install
APP_ENV=local API_MODE=backend pnpm preflight
pnpm db:generate
pnpm db:deploy
pnpm seed:demo
pnpm dev:web
pnpm dev:mobile
```

Offline demo:

```bash
APP_ENV=local API_MODE=offline-demo EXPO_PUBLIC_API_MODE=offline-demo pnpm dev:mobile
```

Checks:

```bash
pnpm --filter @zook/core test
pnpm --filter @zook/core typecheck
pnpm --filter @zook/web typecheck
pnpm --filter @zook/mobile typecheck
pnpm --filter @zook/db typecheck
pnpm release:preflight
```

## iPhone Release

From `apps/mobile`:

```bash
APP_ENV=production API_MODE=backend EXPO_PUBLIC_API_MODE=backend pnpm exec eas build --platform ios --profile production
```

Before install, confirm `EXPO_PUBLIC_API_BASE_URL` points at the real backend API and `EXPO_PUBLIC_WEB_URL` points at the matching web host. The release build should not require Metro and should never show `DEMO MODE`.

## Environment Modes

- `APP_ENV=local | staging | production`
- `API_MODE=backend | offline-demo`
- `PAYMENT_PROVIDER=mock | razorpay | disabled`
- `AI_PROVIDER=mock | openai | disabled`
- `PUSH_PROVIDER=mock | expo | disabled`

Rules:

- Local can use backend or explicit offline demo.
- Staging/production must use backend mode.
- Production blocks fixed OTP, mock payment completion, and offline demo.
- Staging allows fixed OTP or mock payment only with explicit override envs.

## Next Recommended Step

Create a staging environment with a disposable Postgres database, run the committed Prisma migration baseline with `pnpm db:deploy`, configure Razorpay test credentials, and run the DB-backed acceptance suite plus manual iPhone release QA against that staging backend.
