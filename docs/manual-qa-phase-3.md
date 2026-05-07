# Phase 3 Manual QA

Last updated: 24 April 2026

## Before You Start

```bash
pnpm install
cp .env.example .env
pnpm preflight
pnpm db:generate
pnpm db:push
pnpm db:seed
pnpm dev:web
pnpm dev:mobile
```

Development OTP: `000000`

Seed accounts:

- `platform@zook.local`
- `pilot-owner.test`
- `admin@zook.local`
- `reception@zook.local`
- `trainer@zook.local`
- `member@zook.local`
- `minor@zook.local`

## Owner

1. Sign in on web as `pilot-owner.test`.
2. Open `/dashboard`.
3. Verify the dashboard sidebar, metrics, and route-aware operational panels render.
4. Open `/dashboard/members` and confirm DB-backed member rows appear.
5. Open `/dashboard/reports` and verify the operational report pack renders.
6. Open `/dashboard/shop/products` and confirm product inventory is visible.
7. Use `/dashboard/attendance/qr-display` to verify the live QR surface renders.
8. Open `/dashboard/notifications` and send a transactional or operational notification.
9. Download at least one CSV export:
   `/api/orgs/{orgId}/reports/attendance.csv`

## Member

1. Sign in on mobile as `member@zook.local`.
2. Open the home screen and verify membership, notifications, plan, and QR actions render.
3. Open Find Gyms and search by gym name and city.
4. Open a gym profile and verify join-mode badges, visible plans, and referral messaging.
5. Start a membership checkout and confirm the mock hosted checkout handoff opens the web flow.
6. Open Notifications and verify message history loads.
7. Open Profile and verify consent, guardian, and account-action sections render.

## Receptionist

1. Sign in on mobile as `reception@zook.local`.
2. Open the receptionist dashboard.
3. Verify attendance queue, payments, and pickup operations render.
4. Approve or reject an attendance item if one is available.
5. Confirm the dashboard updates after the action.

## Trainer

1. Sign in on mobile as `trainer@zook.local`.
2. Open the trainer dashboard and client list.
3. Verify client summaries, AI draft actions, and PT workflow cards render.
4. Open a client detail path and confirm assignment/plan controls appear where available.

## Platform Admin

1. Sign in on web as `platform@zook.local`.
2. Open `/platform`.
3. Verify organization metrics, provider diagnostics, AI usage, and abuse surfaces render.
4. Open `/api/platform/provider-status` and confirm secrets are not exposed.
5. Suspend and reactivate an org from the platform surface if you want to validate status actions.

## Minor Account

1. Sign in as `minor@zook.local`.
2. Verify the guardian state is visible on mobile.
3. Attempt membership purchase or personalized flows and confirm guardian restrictions still apply.

## File Upload And Storage

1. Use `POST /api/files/upload` from the app or an API client with auth.
2. Upload a valid image to `product_image` or `profile_photo`.
3. Verify the response includes `deliveryUrl` and `signedUrl`.
4. Open the signed URL and confirm the asset resolves.
5. Try an invalid MIME type and confirm the API rejects it.

## Reports And Exports

1. Use an owner or admin session.
2. Export:
   - `/api/orgs/{orgId}/reports/attendance.csv`
   - `/api/orgs/{orgId}/reports/revenue.csv`
   - `/api/orgs/{orgId}/reports/manual-cash.csv`
   - `/api/orgs/{orgId}/reports/expiring-members.csv`
   - `/api/orgs/{orgId}/reports/referrals.csv`
   - `/api/orgs/{orgId}/reports/shop.csv`
   - `/api/orgs/{orgId}/reports/ai-usage.csv`
   - `/api/orgs/{orgId}/audit-logs.csv`
3. Verify the first CSV line contains generated metadata.

## Location And Discovery

1. Call `POST /api/orgs/{orgId}/location/resolve` with a Google Maps link and confirm it resolves or fails cleanly.
2. Call `PATCH /api/orgs/{orgId}/location` with manual coordinates and confirm the org updates.
3. Call `/api/orgs/public/search?city=Pune&nearLat=18.52&nearLng=73.85` and verify public gyms are returned with distance ordering.
