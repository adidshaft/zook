# Zook Platform — Codex Handoff Document

> **Monorepo layout**: `apps/web` (Next.js 14 App Router, API routes at `apps/web/src/server/`) and `apps/mobile` (Expo SDK 52, Expo Router v3). Shared packages live in `packages/`. All server API routes are dispatched from `apps/web/src/app/api/[[...path]]/route.ts` through handler functions in `apps/web/src/server/api-router/`. Marketing website is a standalone Vite/React app at `apps/website/`.

> **Product state (2026-06-27):** All 26 tasks from the previous handoff are implemented. Only 3 small gaps remain: two missing `vercel.json` cron registrations, one missing rate-limit call on class enrollment, and one missing export button in the reports panel.

---

## Environment Quick Reference

| Concern | Detail |
|---|---|
| Test device (iOS) | iPhone 16 Pro sim `16E85351-C822-4E5D-8C0F-15A50B8BFA5C` |
| Role switching (demo) | `GET /__demo-role?role=OWNER\|TRAINER\|RECEPTIONIST\|MEMBER` |
| Demo API state | Module-level arrays in `apps/mobile/src/lib/demo-api.ts` are reset on JS runtime restart only |
| Light-mode gradient rule | Never use `palette.text.*` or `palette.accent.base` as text colour on always-dark `LinearGradient`; use hardcoded light constants |
| Restore broken demo session | `xcrun simctl keychain booted reset` then relaunch |

---

## Global Gotchas

1. **Demo API statefulness.** `demo-api.ts` module-level arrays persist for the JS runtime lifetime. Tests needing clean state must restart the bundler.
2. **Light-mode gradient collapse.** Always pass `mode` to `classTypeGradient(classType, mode)` and branch on `mode === 'light'` for light-safe palettes.
3. **`PENDING_APPROVAL` already in `/me/coaching` filter.** `me-data.ts` already includes it — do not add again.
4. **`pathMatches` order matters.** Shorter paths must be registered before longer overlapping prefixes.
5. **Prisma `clean()` helper.** Always wrap `data:` objects with `clean({...})` when any field is optional.
6. **Two pre-existing TypeScript errors** in `platform-operations-panel.tsx` and `trainer-diet-plans-panel.tsx` (DataTable `empty` prop) are unrelated to any task here.

---

## Task 1 — Register New Cron Endpoints in `vercel.json`

**Effort**: XS | **Priority**: P0 | **Layer**: backend

The two cron handlers added to `cron.ts` (`send-scheduled-notifications` and `subscription-expiry`) are implemented but never scheduled — they will never fire in production until registered here.

### Context

`apps/web/src/server/api-router/cron.ts` already has both handlers:
- `POST /cron/send-scheduled-notifications` (lines ~427+) — flushes up to 50 `SCHEDULED` notifications whose `scheduledAt <= now`
- `POST /cron/subscription-expiry` (lines ~476+) — transitions `ACTIVE` subscriptions with `endsAt < now` to `EXPIRED`

The current `vercel.json` has 5 crons (`renewal-reminders`, `account-deletion-purge`, `refund-reconcile`, `trainer-payouts-draft`, `rewards-settle`). Neither new cron is listed.

### File to Change

- `apps/web/vercel.json`

### Approach

Add to the `"crons"` array:

```json
{
  "path": "/api/cron/send-scheduled-notifications",
  "schedule": "*/5 * * * *"
},
{
  "path": "/api/cron/subscription-expiry",
  "schedule": "0 * * * *"
}
```

### Acceptance Criteria

- `vercel.json` `crons` array contains both new entries with the correct paths and schedules
- Manual `curl -X POST https://<domain>/api/cron/send-scheduled-notifications -H "Authorization: Bearer $CRON_SECRET"` returns `{ ok: true, processed: N }`
- Manual `curl -X POST https://<domain>/api/cron/subscription-expiry -H "Authorization: Bearer $CRON_SECRET"` returns `{ ok: true, expired: N }`
- Vercel dashboard shows both crons in the Cron Jobs section after next deployment

### Testing

```bash
# Verify the cron handles run (local)
curl -X POST http://localhost:3000/api/cron/send-scheduled-notifications \
  -H "Authorization: Bearer $CRON_SECRET"
curl -X POST http://localhost:3000/api/cron/subscription-expiry \
  -H "Authorization: Bearer $CRON_SECRET"
```

---

## Task 2 — Rate Limit: Class Enrollment

**Effort**: XS | **Priority**: P2 | **Layer**: backend

Prevents automated scripts from filling class rosters (capacity exhaustion attack or accidental infinite retry loops).

### Context

`assertRateLimit` is already applied to PT session logs (`ptSessionByOrg`) and shop orders (`shopOrderByUser`) in their respective handlers. The class enrollment `POST /orgs/:orgId/classes/:classId/enroll` handler in `classes.ts` is the one high-value mutation without a rate limit. PT subscription creation rate limiting is also worth confirming.

### File to Change

- `apps/web/src/server/api-router/classes.ts`

### Approach

In the enroll handler (find `POST` + `pathMatches(path, ["orgs", /.+/, "classes", /.+/, "enroll"])`) add immediately after `requireAuth`:

```ts
await assertRateLimit("classEnrollByUser", userId, "Too many enrollment requests.");
```

The default window/limit in `assertRateLimit` (10/min per key) is appropriate here. If the helper signature requires explicit limit and window, use `10, 60`.

### Acceptance Criteria

- `POST /orgs/:orgId/classes/:classId/enroll` returns 429 after 10 requests in under a minute from the same user
- A user making 5 enrollment requests (well within the limit) receives normal responses
- The existing class enrollment success path is unchanged for legitimate usage

### Testing

```bash
# Script: loop 11 times rapidly as the same user
for i in {1..11}; do
  curl -X POST http://localhost:3000/api/orgs/<orgId>/classes/<classId>/enroll \
    -H "Cookie: zook_session=<token>" -H "x-zook-intent: enroll"
done
# The 11th should return 429
```

---

## Task 3 — Reports Panel: Add Shop CSV Export Button

**Effort**: XS | **Priority**: P2 | **Layer**: web

Owners can export shop order data from the Reports panel — the server implementation exists and is wired up but the UI button is absent.

### Context

`apps/web/src/server/api-router/reports.ts` has `"shop.csv": "shop"` in the `reportRoutes` map (line ~59) and `ReportsService.shopReport()` is fully implemented. The `exportReports` array in `apps/web/src/components/dashboard/read-only/reports-panel.tsx` (line ~129) drives which export buttons are rendered — `'shop'` is not in it.

### File to Change

- `apps/web/src/components/dashboard/read-only/reports-panel.tsx`

### Approach

Find the `exportReports` array definition (around line 129). Add a shop entry in the same shape as existing entries:

```ts
{ id: "shop", label: "Shop orders", icon: "bag-outline" },
```

The `buildExportHref` function already generates the correct download URL from the `id` field — no other changes needed.

### Acceptance Criteria

- A "Shop orders" export button appears in the Reports panel alongside existing export buttons
- Clicking it downloads a CSV file containing shop order data
- The button is visible to users with the `ORG_VIEW_REPORTS` permission
- No regression to existing export buttons (attendance, payments, members, etc.)

### Testing

1. Log in as gym owner → navigate to Dashboard → Reports
2. Verify "Shop orders" button is present
3. Click it → verify a CSV downloads with order data (headers + rows)
4. Verify existing export buttons (e.g. Payments CSV) still work

---

## Deployment Gap — Verify `CRON_SECRET` in Production

Both new cron endpoints (Task 1) require the `CRON_SECRET` environment variable in the production environment. The handlers call `requireCronSecret(request)` which checks for `Authorization: Bearer $CRON_SECRET`.

Verify: in the Vercel project's Environment Variables settings, confirm `CRON_SECRET` is set for the Production environment. If absent, generate a 32-byte random hex string and add it. The same value is already used by the existing 5 cron jobs — if those are running in production, the secret is already set correctly and no change is needed.

```bash
# Verify existing crons work (confirms CRON_SECRET is set)
curl -X POST https://<production-domain>/api/cron/rewards-settle \
  -H "Authorization: Bearer $CRON_SECRET"
# Expected: { ok: true }
```
