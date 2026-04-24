# API Overview

Zook exposes its backend through the Next.js app in `apps/web`. The public URL surface is stable, while request parsing and handler dispatch live inside the centralized API adapter.

## Request Model

Every route follows the same shape:

1. Parse input with Zod
2. Build request context
3. Authenticate session from cookie or bearer token
4. Resolve org-scoped role and permission state
5. Call service or read-model logic
6. Return `{ ok: true, data }` or a typed error envelope

## Success And Error Envelopes

Success:

```json
{
  "ok": true,
  "data": {}
}
```

Error:

```json
{
  "ok": false,
  "error": {
    "code": "forbidden",
    "message": "You do not have permission to perform this action."
  }
}
```

Primary error codes:

- `validation_error`
- `unauthorized`
- `forbidden`
- `not_found`
- `conflict`
- `rate_limited`
- `internal_error`

## Auth

- `POST /api/auth/request-otp`
- `POST /api/auth/verify-otp`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/auth/session`

Web uses the session cookie. Mobile uses the same session token through bearer auth and stores it in SecureStore.

## Member / Me Routes

- `GET /api/me/orgs`
- `GET /api/me/home`
- `GET /api/me/memberships`
- `GET /api/me/attendance`
- `GET /api/me/plans`
- `GET /api/me/plans/:assignmentId`
- `POST /api/me/plans/:assignmentId/progress`
- `GET /api/me/notifications`
- `POST /api/me/notifications/:id/read`
- `PATCH /api/me/notification-preferences`
- `GET /api/me/notification-preferences`
- `GET /api/me/goals`
- `POST /api/me/goals`
- `GET /api/me/badges`
- `GET /api/me/shop-orders`
- `GET /api/me/consents`
- `POST /api/me/data-export-request`
- `POST /api/me/account-deletion-request`

## Personal Tracking

- `GET /api/me/tracking/summary`
- `GET /api/me/tracking/workouts`
- `POST /api/me/tracking/workouts`
- `GET /api/me/tracking/workouts/:id`
- `PATCH /api/me/tracking/workouts/:id`
- `DELETE /api/me/tracking/workouts/:id`
- `GET /api/me/tracking/body-progress`
- `POST /api/me/tracking/body-progress`
- `GET /api/me/tracking/habits`
- `POST /api/me/tracking/habits`
- `POST /api/me/tracking/habits/:id/log`

## Organizations / Public Discovery

- `POST /api/orgs`
- `GET /api/orgs/current`
- `GET /api/orgs/public/search`
- `GET /api/orgs/public/:username`
- `POST /api/orgs/:orgId/location/resolve`
- `PATCH /api/orgs/:orgId/join-mode`
- `GET /api/orgs/:orgId/dashboard`
- `GET /api/orgs/:orgId/reports/summary`
- `GET /api/orgs/:orgId/members`
- `GET /api/orgs/:orgId/audit-logs`

## Memberships / Payments

- `GET /api/orgs/:orgId/membership-plans`
- `POST /api/orgs/:orgId/membership-plans`
- `POST /api/orgs/:orgId/join-requests`
- `GET /api/orgs/:orgId/join-requests`
- `POST /api/orgs/:orgId/join-requests/:id/approve`
- `POST /api/orgs/:orgId/join-requests/:id/reject`
- `POST /api/orgs/:orgId/subscriptions`
- `POST /api/payments/checkout`
- `GET /api/payments/session/:sessionId`
- `POST /api/payments/mock/:sessionId/complete`
- `POST /api/orgs/:orgId/manual-payments`

## Attendance

- `POST /api/orgs/:orgId/attendance/qr-token`
- `POST /api/attendance/scan`
- `GET /api/orgs/:orgId/attendance/live`
- `POST /api/orgs/:orgId/attendance/:recordId/approve`
- `POST /api/orgs/:orgId/attendance/:recordId/reject`
- `POST /api/orgs/:orgId/attendance/manual`

## Plans / Trainer / PT

- `GET /api/orgs/:orgId/trainers/:trainerId/clients`
- `POST /api/orgs/:orgId/trainers/:trainerId/pt-plans`
- `POST /api/orgs/:orgId/pt-subscriptions`
- `GET /api/orgs/:orgId/plans`
- `POST /api/orgs/:orgId/plans`
- `POST /api/orgs/:orgId/plans/:planId/publish`
- `POST /api/orgs/:orgId/plans/:planId/assign`

## AI

- `POST /api/ai/chat`
- `POST /api/ai/generate-plan`
- `POST /api/ai/generate-image`
- `GET /api/orgs/:orgId/ai/usage`

All AI calls remain backend-only and go through quota and safety checks before the provider runs.

## Notifications / Shop / Platform

- `POST /api/orgs/:orgId/notifications`
- `GET /api/orgs/:orgId/notifications`
- `GET /api/orgs/:orgId/products`
- `POST /api/orgs/:orgId/products`
- `PATCH /api/orgs/:orgId/products/:productId`
- `POST /api/orgs/:orgId/inventory/adjust`
- `POST /api/shop/orders`
- `GET /api/orgs/:orgId/shop/orders`
- `POST /api/orgs/:orgId/shop/orders/:orderId/fulfill`
- `GET /api/platform/orgs`
- `PATCH /api/platform/orgs/:orgId/status`
- `GET /api/platform/ai-usage`
- `GET /api/platform/abuse-flags`
