# Architecture

## Monorepo

```text
apps/
  mobile/  Expo Router mobile app
  web/     Next.js App Router dashboard and API host
packages/
  core/    shared types, validators, permissions, service logic, providers
  db/      Prisma schema, client, seed
  ui/      design tokens and reusable primitives
  config/  shared TypeScript, ESLint, Prettier config
docs/
```

## Runtime Shape

The web app hosts API route handlers under `/api`. Route handlers parse Zod input, build a request context, call service-layer functions, and return typed JSON. Business rules live in `@zook/core`, which keeps service tests fast and mostly database-free.

Prisma is the database layer for local PostgreSQL. The seed script creates realistic users, organizations, plans, coupons, attendance, notifications, products, AI logs, and shop orders.

## Provider Boundaries

Provider factories choose mocks by default:

- `EmailProvider`: mock OTP and notification email.
- `SmsProvider`: future OTP/SMS integration stub.
- `PaymentProvider`: mock hosted checkout with simulated completion.
- `MapProvider`: mock geocoding and Google Maps link resolution.
- `AIProvider`: deterministic mock; OpenAI-ready when `OPENAI_API_KEY` exists.
- `PushProvider`: mock push delivery logs.
- `StorageProvider`: local storage with S3/R2-compatible interface.

## Service Layer

Core services:

- `AuthService`
- `OrganizationService`
- `PermissionService`
- `StaffService`
- `MembershipService`
- `PaymentService`
- `CouponService`
- `ReferralService`
- `MapService`
- `AttendanceService`
- `TrainerService`
- `PTService`
- `PlanService`
- `AIService`
- `NotificationService`
- `GoalService`
- `GamificationService`
- `ShopService`
- `PrivacyService`
- `AuditLogService`
- `PlatformAdminService`

Services receive repositories and providers through dependency injection. Tests use in-memory repositories and deterministic providers.

## UI Architecture

The dashboard is dark-first and data-friendly: sidebar navigation, glass cards, responsive tables, filters, and primary-action panels. The mobile app uses Expo Router with role-based route groups and a floating dock pattern. Shared Zook tokens live in `@zook/ui`.

## Data Isolation

All tenant-scoped models include `orgId` and are indexed by organization. Service methods reject org-scoped operations without a matching membership, role, or platform-admin context. Platform routes are separate and require `PLATFORM_ADMIN`.
