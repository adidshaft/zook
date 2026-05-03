# Next Production Hardening Plan

Last updated: 2026-05-03
Branch: `ui-ux-production-polish-pass`
Audit commit: `973080cd3ea0f76e090dc4601a323e4ab33a0c66`

## Goal

Move Zook from a backend-first MVP skeleton into a durable production-shaped product without undoing the current premium UI direction or hiding incomplete production features behind fake success states.

The product remains India-first:

- Mobile is the daily execution app for members, trainers, receptionists, and owners on the move.
- Web is the control room for owners, admins, and platform operators.
- Platform admin remains web-first.
- Offline demo remains explicit, visible, and local-only.

## Current Runtime Contract

Target modes:

- `APP_ENV=local|staging|production`
- `API_MODE=backend|offline-demo`
- `PAYMENT_PROVIDER=mock|razorpay|disabled`
- `AI_PROVIDER=mock|openai|disabled`
- `PUSH_PROVIDER=mock|expo|disabled`
- `STORAGE_PROVIDER=local|s3|r2`

Current implementation accepts `disabled` only as a user-facing concept in docs/product direction, not as a provider registry value. Adding this is the first runtime hardening task.

## Phase 1: Runtime Configuration And Provider Guards

Deliverables:

- Central server runtime validation for `APP_ENV`, `API_MODE`, provider selections, fixed OTP, mock payment completion, local storage, and diagnostics.
- First-class `disabled` provider mode for payments, AI, and push.
- Fail-closed handling for invalid `APP_ENV` and `API_MODE` values.
- Align mobile app config and mobile runtime precedence with core so `APP_ENV` wins over legacy profile aliases.
- Lazy or guarded provider resolution in the web API so `/api/health`, `/api/ready`, and provider diagnostics can respond even when a provider is misconfigured.
- Redacted readiness errors that do not expose raw Prisma/connection messages.
- Release-preflight policy for production mock AI, mock push, local storage, and R2 validation parity.
- Safe public diagnostics that never expose secret values.
- Mobile runtime validation remains fatal for non-local offline demo.
- Web/API startup and feature routes fail clearly when provider configuration is unavailable.
- Tests for production/offline demo, production/fixed OTP, production/mock payment completion, provider-disabled diagnostics, and secret redaction.

Acceptance:

- Production cannot run `API_MODE=offline-demo`.
- Production cannot use fixed OTP.
- Production cannot complete mock payments.
- Production cannot silently use mock AI; it must be real, disabled, or blocked by explicit readiness checks.
- Production cannot silently use local file storage when production file uploads are enabled.

## Phase 2: Payment Production Hardening

Deliverables:

- Audit membership checkout, shop checkout, mock completion, Razorpay webhook, redirect/result pages, mobile handoff, owner payment records, and receptionist offline payment records.
- Normalize business-facing states around pending, requires action, confirmed/paid, failed, cancelled, refunded, and expired.
- Lock the payment trust boundary: remove or restrict generic caller-supplied checkout metadata, verify org/user ownership, and compare session amount against the subscription/order total before activation.
- Keep redirect pages read-only.
- Ensure membership activation and shop inventory mutation happen only after backend-confirmed payment.
- Harden idempotency and concurrency for duplicate webhook/confirmation events with atomic payment application and conditional side effects.
- Add retry/cleanup paths for checkout provider failures that leave pending subscriptions or shop orders.
- Enforce payment session expiry during mock completion and provider status application.
- Record webhook attempt failures/quarantine details when business-state application throws.
- Add reconciliation data to owner/platform surfaces for `PaymentEvent` and `PaymentWebhookAttempt`.
- Add Razorpay setup and test instructions.

Acceptance:

- Duplicate confirmation does not double-activate membership, double-decrement inventory, duplicate pickup codes, or duplicate audit logs.
- Failed/cancelled/expired payment does not activate.
- Razorpay webhook signature is required in Razorpay mode.
- Mock completion remains local/explicit only.
- Cross-tenant or mismatched metadata cannot activate another org/user subscription or order.

Not certified until:

- Razorpay test credentials and signed webhook delivery are verified on staging.

## Phase 3: Push Notifications And Deep Links

Deliverables:

- Validate notification route payloads and role/org visibility.
- Harden mark-read and unread count persistence.
- Complete Expo token registration and logout invalidation where practical.
- Add local/staging-only test notification hook.
- Log push delivery attempts and failures without secrets.
- Document device QA paths.

Acceptance:

- In-app inbox remains canonical.
- Push disabled/misconfigured mode never reports fake success.
- Token registration requires auth.
- Wrong role cannot access notification target.

Not certified until:

- Physical iOS/Android device push and deep-link QA are documented.

## Phase 4: AI Provider And Trainer Planning

Deliverables:

- Audit AI provider selection, safety classification, draft generation, persistence, edit/save, assign, usage records, and role gating.
- Ensure no client-side provider keys or direct provider calls.
- Persist safety blocks and usage records.
- Add timeout and malformed-response handling for OpenAI mode.
- Keep trainer draft generation assigned-client-only.
- Ensure member plan visibility starts only after assignment.

Acceptance:

- Trainer can generate for assigned clients only.
- Member cannot generate trainer drafts or images.
- Disabled provider returns controlled unavailable state.
- Assignment creates plan assignment and member notification.

Not certified until:

- OpenAI credentials, safety prompts, and structured output behavior are verified.

## Phase 5: File Storage And Media

Deliverables:

- Audit upload/download/public asset routes.
- Keep local storage for local dev.
- Validate file type, size, category, ownership, and path safety.
- Ensure public assets are intentionally public and private files require auth.
- Replace confusing public profile placeholders with real empty states or seeded data.

Acceptance:

- Invalid type and oversized files are rejected.
- Private files are blocked without permission.
- Storage disabled or misconfigured returns controlled errors.

Not certified until:

- S3/R2-compatible object storage is configured and tested.

## Phase 6: Backend Security, RBAC, Tenant Isolation, Rate Limiting

Deliverables:

- Route-by-route RBAC audit for auth, members, attendance, plans, shop, payments, trainer, owner, notifications, privacy, files, AI, and platform admin.
- Enforce trainer assigned-client limits server-side.
- Enforce active org header/session validation.
- Add distributed-ready rate limit interface with memory provider for local and Redis/Upstash-compatible provider when configured.
- Ensure safe production errors and request IDs.
- Confirm audit logs for manual attendance, approvals, offline payment, pickup fulfillment, role changes, AI assignment/block, privacy jobs, provider checks, and org status changes.

Acceptance:

- Wrong role and wrong org tests deny access.
- Rate limits trigger for OTP, login/session, attendance scan, AI, payment session, file upload, and notification send.

## Phase 7: Default-Branch-Centered Multi-Branch Readiness

Deliverables:

- Audit branch usage in attendance, member home, receptionist queue, owner dashboard, shop inventory, plans, payments, and reports.
- Make default branch explicit.
- Add branch filters only where backend supports them now.
- Avoid building a full multi-branch product in this pass.

Acceptance:

- No silent null branch for branch-required entities.
- UI and docs clearly say MVP is default-branch-centered but data model is multi-branch-ready.

## Phase 8: Mobile Role UI Retest

Deliverables:

- Simulator/device pass for member, trainer, receptionist, and owner/admin surfaces.
- Fix duplicate identity/context headers.
- Reduce dense staff text and internal jargon.
- Keep bottom controls safe-area-aware.
- Preserve the approved dark glass/lime visual direction.

Acceptance:

- No major CTA overlap.
- No member screen exposes trainer/admin controls.
- Owner/admin mobile stays lightweight.

## Phase 9: Web/Public/Control-Room Hardening

Deliverables:

- Audit `/g/[username]`, `/in/[username]`, `/join/[username]`, `/qr/[username]`, and `/r/[code]`.
- Confirm owner setup persistence and username uniqueness.
- Remove fixture fallback outside explicit local/demo.
- Add loading/error/empty states and pagination/debounced search where heavy tables need it.
- Keep platform diagnostics safe.

Acceptance:

- Public profile found/not-found and join modes are tested.
- Dashboard data scopes by org.
- Provider diagnostics hide secrets.

## Phase 10: E2E Product Flows

Create `docs/E2E_PRODUCT_FLOWS.md` and verify/document:

- Member purchase and check-in.
- Pending attendance and receptionist approval.
- Trainer plan assignment.
- Shop pickup.
- Owner/admin operations.
- Privacy export/delete request.

Automate what is practical, and mark manual-only mobile/device steps honestly.

## Phase 11: Regression Coverage

Prioritize meaningful backend integration tests over superficial UI tests.

Minimum test expansion:

- OTP login/session/logout.
- Role/org context.
- Runtime guards.
- Attendance approval states.
- Offline payment/manual attendance reason requirements.
- Payment activation and idempotency.
- Shop pickup code after payment.
- Trainer assigned-client restriction.
- AI draft generate/edit/assign.
- Notification mark-read.
- Privacy request.
- Platform diagnostics secret redaction.
- Wrong-org/wrong-role denial.

Also fix test script discovery so mobile/web package tests do not report false "no files found" when useful tests exist.

## Phase 12: Deployment And Release Readiness

Deliverables:

- Backend/web env checklist.
- Migration deploy and seed strategy.
- Provider env validation.
- Health/readiness endpoint documentation.
- EAS build docs.
- Backend URL/runtime config for mobile releases.
- Camera, notification, and deep-link QA.
- Observability and fail-safe UX checklist.

Acceptance:

- Release preflight passes only with real non-local production/staging env.
- Offline demo is disabled for production builds.
- Provider unavailable states are controlled and visible.

## Current Audit Results To Carry Forward

- Install, lint, typecheck, tests, Prisma generate, local migration deploy, local preflight, web dev start, `/api/health`, `/api/ready`, and Expo production config checks were run on 2026-05-03.
- Lint passes with seven existing mobile unused-var warnings.
- `pnpm test` passes but mobile/web package scripts report no files found; coverage remains incomplete.
- Production release preflight correctly fails against local `.env`, which is the right safety behavior.
- Remote EAS builds, physical-device push QA, OpenAI provider QA, Razorpay webhook QA, object storage QA, and DB-backed acceptance were not run.
