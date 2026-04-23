# API Overview

The API is hosted by the Next.js app. Route handlers validate with Zod, build context, check RBAC, call services, and return JSON.

## Auth

- `POST /api/auth/request-otp`
- `POST /api/auth/verify-otp`
- `POST /api/auth/logout`
- `GET /api/auth/me`

## Organizations

- `POST /api/orgs`
- `GET /api/orgs/current`
- `PATCH /api/orgs/:orgId`
- `GET /api/orgs/public/search`
- `GET /api/orgs/public/:username`
- `POST /api/orgs/:orgId/location/resolve`
- `PATCH /api/orgs/:orgId/join-mode`

## Operations

Membership, payment, coupon, referral, attendance, PT, plans, AI, notifications, goals, shop, privacy, and platform endpoints follow the route list from the product prompt. The implementation uses a catch-all route adapter to keep route parsing centralized while preserving the public URL surface.

## Response Shape

Successful responses:

```json
{ "ok": true, "data": {} }
```

Errors:

```json
{ "ok": false, "error": { "code": "FORBIDDEN", "message": "Permission denied" } }
```
