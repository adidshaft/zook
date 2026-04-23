# Zook Product Spec

## Product

Zook is an India-first operating system for small and medium gyms. It supports a mobile app for members and staff plus a responsive web dashboard for owners, admins, receptionists, trainers, and platform super-admins.

The MVP is local-first and mock-provider-first. Real providers for payments, maps, SMS, push, storage, and AI are isolated behind interfaces and selected by environment variables.

## Tenancy

Each gym is an `Organization` with a default `Branch`. Data is branch-ready even though the MVP UI exposes one branch by default. Every privileged service method requires a request context containing the user, active organization, active branch when relevant, roles, permissions, and audit metadata.

## Roles

- `PLATFORM_ADMIN`: cross-organization controls, abuse, org suspension, global settings.
- `OWNER`: full organization access, billing, staff, permissions, reports, privacy.
- `ADMIN`: operational management except ownership transfer and platform override.
- `RECEPTIONIST`: member search, check-ins, manual payments, pickup, operational notices.
- `TRAINER`: assigned clients, PT records, plans, AI drafts, assigned-client notifications.
- `MEMBER`: own memberships, attendance, plans, AI, shop orders, goals, privacy.

Users can hold roles in multiple organizations and multiple roles in one organization.

## MVP Modules

- Email OTP authentication and hashed session tokens.
- Organization onboarding with free one-month trial.
- Public gym discovery by name, city, location, referral, invite, deep link.
- Membership plans, subscriptions, mock checkout, offline payments, coupons, referrals.
- Rolling signed QR attendance with approval modes and manual override.
- Trainer/client assignments, offline PT subscriptions, plan and diet content.
- Backend-only AI gateway with quotas, scope guard, minor-safe mode, and usage logs.
- In-app notifications with optional mock push delivery.
- Goals, habit checklist, private badges, opt-in challenge data model.
- Shop inventory with mock pay-online-and-pickup.
- Privacy controls, consent records, account deletion/export request stubs.
- Platform admin organization status and abuse monitoring.

## Key MVP Decisions

- OTP is email-only. Phone is collected but unverified.
- Payment checkout is hosted mock web checkout. Client redirects never activate purchases.
- PT payments are offline only in MVP.
- No face recognition. Profile photo is used for receptionist visual verification.
- No Apple Health or Google Fit integration.
- No uncontrolled AI web browsing. AI may cite only approved resource library entries.
- Minors are blocked from membership, attendance, personalized AI, and plans until guardian consent is recorded.

## Deep Links

- `zook.app/g/{gymUsername}`
- `zook.app/join/{gymUsername}?ref={referralCode}`
- `zook.app/r/{referralCode}`
- `zook://g/{gymUsername}`
- `zook://join/{gymUsername}?ref={referralCode}`

## Acceptance Flows

The seed data and mocks support owner onboarding, membership purchase, QR attendance, receptionist approval, trainer plan publishing, AI plan drafting, shop pickup, platform suspension, and minor guardian consent checks.
