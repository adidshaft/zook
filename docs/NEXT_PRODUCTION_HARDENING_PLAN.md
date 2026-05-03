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
- `STORAGE_PROVIDER=local|s3|r2|disabled`

Current implementation now accepts `disabled` as a first-class payment, AI, and push provider mode. Production/staging env still needs real provider choices and staging validation before launch.

## Phase 1: Runtime Configuration And Provider Guards

Status: completed in commit `ce0f9f1`.

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

Status: partially completed in the 2026-05-03 payment hardening pass. Backend trust-boundary, expiry, idempotency, provider-failure cleanup, and webhook quarantine work has landed locally; Razorpay certification and full payment UI/reconciliation remain open.

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

Completed in this pass:

- Generic checkout rejects membership/shop payment purposes and direct `subscriptionId`/`shopOrderId` metadata.
- Membership/shop confirmation verifies backend-owned target org, user, purpose, and amount before paid side effects.
- Mock success completion fails for expired sessions.
- Checkout provider failures mark payment sessions failed and related pending subscriptions/orders cancelled.
- `Payment.sessionId` is unique and confirmation uses session-scoped upsert.
- Shop inventory movement and pickup-code creation happen only after a conditional `PENDING_PAYMENT` order transition.
- Verified Razorpay webhooks that fail business-state application are quarantined with attempt details.
- DB-gated acceptance coverage was added for generic checkout boundaries, expired mock completion, and duplicate confirmation idempotency.

Still open:

- Exercise Razorpay test order creation and signed webhook delivery with real test credentials.
- Complete the non-mock user-facing checkout handoff/result UX.
- Add owner/platform reconciliation views for event/attempt review.
- Run high-concurrency duplicate webhook acceptance against staging-like Postgres.

## Phase 3: Push Notifications And Deep Links

Status: partially completed in the 2026-05-03 push hardening pass. In-app persistence remains canonical, provider-disabled/provider-failure push attempts no longer break product actions, scheduled inbox leakage is blocked, and join-request tap routing is covered. Physical-device Expo push QA remains open.

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

Completed in this pass:

- Disabled push provider delivery attempts are recorded as `provider_disabled` failures instead of trying to resolve a disabled provider.
- Expo/provider send exceptions are recorded as failed `PushDelivery` rows instead of failing the originating attendance/payment/plan action after in-app records exist.
- Scheduled notification recipients are hidden from `/me/notifications` until dispatch changes their delivery status.
- Push devices are stored as user/global device records so switching active org does not move a token out of another org's notification scope.
- Mobile notification routing handles membership join request approval/rejection payloads.
- Focused web/mobile tests cover provider-disabled delivery recording, provider-send failure recording, and join-request deep-link routing.

Still open:

- Build the scheduled notification dispatcher/worker.
- Add a local/staging admin-only test notification endpoint or surface.
- Perform physical-device push registration, delivery, receipt, and tap-through QA with an EAS/dev-client build.

## Phase 4: AI Provider And Trainer Planning

Status: partially completed in the 2026-05-03 AI/trainer hardening pass. Backend role/tenant gates, assigned-client draft scope, safety-block persistence, structured plan validation, review-before-assign, member workout completion safeguards, and trainer-visible report summaries landed locally. Live OpenAI credential QA remains open.

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

Completed in this pass:

- OpenAI provider now uses server-side Responses API calls for text/structured plan generation with JSON-schema-shaped output validation and timeout handling.
- OpenAI image generation now calls the server-side image generation endpoint instead of returning a synthetic URL.
- AI generate-plan requires an organization context, trainer permission, active trainer assignment for the target client, and the user's actual AI consent.
- AI safety, consent, guardian, out-of-scope, and quota blocks throw controlled guard errors and persist usage/audit records with zero quota consumed.
- AI-generated trainer drafts are saved as unreviewed plan content and cannot be assigned until the review endpoint marks them reviewed.
- Workout-like plans with no exercises cannot be reviewed, assigned, or completed as a member workout.
- Member workout report creation now derives org context from the assignment/attendance record and rejects cross-user or cross-org ids.
- Trainer client summaries now include recent member feedback and trainer-visible workout sessions from real persisted records.
- Mobile trainer AI draft screens handle loading/error states, send `targetUserId`, preserve structured exercises when saving edits, and call review before assignment.
- Core/provider and DB-backed acceptance tests cover structured OpenAI request shape, server-side image generation, assigned-client draft restrictions, review-before-assign, safety/consent logging, member notification on assignment, and trainer-visible workout reports.

Still open:

- Exercise OpenAI mode with real staging credentials and model responses.
- Add broader AI safety evaluation beyond deterministic keyword/scope guards.
- Store generated AI images through the file-storage boundary once storage is production-certified.
- Add richer trainer planning UX for comparing draft versions and explaining safety blocks.

## Phase 5: File Storage And Media

Status: partially completed in the 2026-05-03 storage hardening pass. Local storage safety, explicit disabled storage diagnostics, public-file access checks, file-backed org gallery category support, public trainer visibility, and mobile public-media fallbacks were tightened. Object storage remains provider-ready, not certified.

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

Completed in this pass:

- `STORAGE_PROVIDER=disabled` is a first-class diagnostics state.
- File upload routes return a controlled disabled error when `FILE_UPLOADS_ENABLED=false`.
- Local public file serving now requires a matching non-deleted `FileAsset` with `visibility=public`.
- File reads/deletes now fail clearly if the file was stored under a different provider than the active storage provider.
- Upload validation rejects filename extension and MIME-type mismatches, including JSON export typing.
- Added `org_gallery` as a public, provider-backed file category for gym gallery assets.
- Owner profile update can now accept file-backed gallery asset IDs and persist their delivery URLs.
- Public trainer read models and mobile public gym APIs filter out trainers with `visibleToMembers=false`.
- Mobile public gym discovery/profile screens no longer substitute Unsplash images when backend media is missing.

Still open:

- Wire owner web upload controls for logo, cover, and gallery instead of relying on URL fields for local setup.
- Validate S3/R2 public object delivery with a real bucket/CDN policy.
- Add API-level upload/content/delete acceptance tests with multipart files.
- Migrate any existing raw external public media URLs into `FileAsset` records before production.

## Phase 6: Backend Security, RBAC, Tenant Isolation, Rate Limiting

Status: partially completed in the 2026-05-03 security hardening pass. The rate limiter now has a memory local provider and an Upstash Redis REST provider with safe diagnostics; production runtime/preflight rejects memory or disabled rate limiting. Platform admins no longer bypass normal tenant routes automatically, suspended/cancelled orgs are blocked at the shared org-permission guard, payment session reads require ownership or org payment permission, and several target-user flows now validate active same-org member/trainer membership.

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

Implemented in this pass:

- `RATE_LIMIT_PROVIDER=memory|upstash|disabled` with `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, and optional `RATE_LIMIT_NAMESPACE`.
- Safe rate-limit diagnostics are included in readiness/provider status without exposing Redis URL or token.
- Production rejects `RATE_LIMIT_PROVIDER=memory` and `RATE_LIMIT_PROVIDER=disabled`.
- Platform admin is web/platform-first and no longer acts as an unaudited blanket tenant operator through `requireOrgPermission`.
- `GET /api/payments/session/:id` now requires the session owner or same-org `PAYMENTS_VIEW`.
- Manual attendance, offline payment, selected notification recipients, PT routes, and plan assignment now validate active same-org target users.

Still open:

- Route-by-route RBAC review is not complete.
- Add broader automated wrong-role/wrong-org tests for every route family.
- Consider a dedicated audited break-glass/impersonation path for platform support.
- Add rate limits to additional non-core mutation routes such as join requests, referral redemption, reception code verify, staff/permission mutation, and platform status changes.
- Expand audit metadata for before/after/risk-level fields.

## Phase 7: Default-Branch-Centered Multi-Branch Readiness

Status: partially completed in the 2026-05-03 default-branch readiness pass. Branch-required backend flows now resolve an active org branch through one guard instead of silently writing nullable/default values. Membership plan creation stores the Default Branch, membership checkout/manual activation use the plan branch when present and otherwise the Default Branch, dashboard/report/attendance endpoints validate `branchId` filters, and owner/reception/web surfaces show Default Branch context. Shop inventory and payments remain org-wide because the current schema has no branch field for products, stock movements, orders, or payments.

Deliverables:

- Audit branch usage in attendance, member home, receptionist queue, owner dashboard, shop inventory, plans, payments, and reports.
- Make default branch explicit.
- Add branch filters only where backend supports them now.
- Avoid building a full multi-branch product in this pass.

Acceptance:

- No silent null branch for branch-required membership/attendance entities.
- UI and docs clearly say MVP is default-branch-centered but data model is multi-branch-ready.

Still open:

- Shop inventory, shop orders, payment records, and revenue/manual-cash reports are org-wide until branch fields are added.
- Public member home/current membership responses still center on the active org/latest active membership; a full member-facing branch selector is out of scope.
- Attendance QR generation is intentionally Default Branch only in this MVP pass.
- Broader branch selector UI for web owner reports can be added after branch-backed stock/payment semantics exist.

## Phase 8: Mobile Role UI Retest

Status: partially completed in the 2026-05-03 mobile role polish pass. A local Expo Go iOS Simulator spot pass was run on iPhone 15 Pro / iOS 26.2 in explicit `APP_ENV=local API_MODE=offline-demo` mode. Trainer home, clients, trainer client detail, AI Draft Review, generated draft lower controls, profile role switching, and owner `Needs attention` were visually checked. This is not physical-device QA and does not certify native push.

Deliverables:

- Simulator/device pass for member, trainer, receptionist, and owner/admin surfaces.
- Fix duplicate identity/context headers.
- Reduce dense staff text and internal jargon.
- Keep bottom controls safe-area-aware.
- Preserve the approved dark glass/lime visual direction.

Completed in this pass:

- Removed mobile `Command`, `Scoped`, `Coach cockpit`, and excessive `Assigned client` framing from searched role surfaces.
- Owner mobile now labels the command surface as `Needs attention`; the compact bottom tab uses `Needs`.
- Trainer home/client copy now uses `Clients`, `Create Plan`, `Client Detail`, `AI Draft Review`, and `Assign Plan` language.
- Trainer active-plan copy now pluralizes correctly.
- The global local/offline demo badge is centered below the iOS safe area so it remains visible without overlapping owner role controls.
- AI draft editor lower controls were visible above the bottom dock after scrolling in the simulator.
- Mobile lint warnings from unused symbols were removed.

Still open:

- Full simulator/device retest for member shop, gym details, settings/privacy, receptionist desk/manual attendance/payment/pickup, owner approvals/revenue/stock/member detail, and backend login mode.
- Physical-device QA for camera and push remains open.

Acceptance:

- No major CTA overlap.
- No member screen exposes trainer/admin controls.
- Owner/admin mobile stays lightweight.

## Phase 9: Web/Public/Control-Room Hardening

Status: partially completed in the 2026-05-03 public web hardening pass. Public profile, join, referral, and dashboard fallback semantics were tightened, and a DB-backed acceptance test now proves the join page honors persisted backend join mode instead of URL query overrides. This pass did not complete every owner setup/dashboard table requirement.

Deliverables:

- Audit `/g/[username]`, `/in/[username]`, `/join/[username]`, `/qr/[username]`, and `/r/[code]`.
- Confirm owner setup persistence and username uniqueness.
- Remove fixture fallback outside explicit local/demo.
- Add loading/error/empty states and pagination/debounced search where heavy tables need it.
- Keep platform diagnostics safe.

Completed in this pass:

- `/g/[username]` no longer presents a fake zero-rupee membership CTA when no public plans exist; it shows a real empty state and only exposes join CTAs for published public plans.
- Public trainer sections use stored profile photos when present and show an honest empty state when no public trainers are visible.
- `/join/[username]` no longer trusts `?mode=` overrides. It reads the persisted org join mode, preserves plan/referral handoff through login, and avoids fake "submitted" success copy before an authenticated request exists.
- Invite-only join mode requires an active referral code. Invalid or inactive referral codes do not silently proceed.
- `/r/[code]` no longer hardcodes `iron-house` fallback outside explicit local/demo fixture mode; unknown referral codes 404.
- Referral creation now returns `/join/{username}?ref={code}` web links instead of leaking org IDs into username routes.
- Join QR images now encode `/join/{username}` for `target=join`, keep `/in/{username}?source=qr` for profile QR, and use the public read model so known local demo gyms can render QR images only in explicit demo fallback.
- Dashboard/platform runtime pills distinguish explicit Demo Mode from a backend read-model unavailable state.
- Public trainer image URLs keep approved `/api/files/{id}/content` file assets while still rejecting empty, path-traversal, and `file:` URLs.
- Explicit demo fixture fallback now returns only known fixture usernames instead of rewriting unknown public slugs to the first fixture gym.

Still open:

- `/in/[username]`, `/qr/[username]`, and `/r/[code]` need a broader manual browser pass across hidden org, invite, and expired-code cases.
- Owner setup persistence still needs deeper browser coverage for username uniqueness, facilities/amenities, gallery/photos, trainer public details, app links, and join mode.
- Heavy dashboard tables still need pagination/debounced-search hardening.
- Platform provider diagnostics remain safe, but the broader UI still needs staging data and provider-disabled visual QA.
- The known Prisma `Decimal` Server-to-Client warning on platform admin location fields is still open.

Acceptance:

- Public profile empty-plan/trainer states are honest.
- Join mode is persisted/backend-owned and query parameters cannot force open checkout.
- Referral fallback is explicit demo-only; unknown codes fail closed.
- Referral and QR links target username-based public routes.
- Dashboard fallback wording does not mislabel read-model failures as Demo Mode.
- Provider diagnostics hide secrets.

## Phase 10: E2E Product Flows

Status: completed as a documentation/evidence mapping pass in `docs/E2E_PRODUCT_FLOWS.md`. This phase did not certify provider/device flows; it maps current DB-backed automation to each journey and names the manual/device gaps.

Create `docs/E2E_PRODUCT_FLOWS.md` and verify/document:

- Member purchase and check-in.
- Pending attendance and receptionist approval.
- Trainer plan assignment.
- Shop pickup.
- Owner/admin operations.
- Privacy export/delete request.

Completed in this pass:

- Created `docs/E2E_PRODUCT_FLOWS.md`.
- Mapped the six primary journeys to existing DB-backed Playwright tests, core tests, mobile utility tests, and manual QA.
- Marked partial or missing automation for receptionist approve/reject, shop fulfillment, privacy export/delete, draft-edit-before-assign, mobile backend flow retest, physical camera, push deep links, Razorpay, OpenAI, and object storage.

Still open:

- Continue broadening full-journey browser/mobile automation after Phase 11; provider/device flows remain staging/manual.
- Continue treating provider/device flows as staging/manual until actually run.

Automate what is practical, and mark manual-only mobile/device steps honestly.

## Phase 11: Regression Coverage

Status: partially completed in the 2026-05-03 regression coverage pass. DB-backed Playwright now exercises receptionist attendance approval/rejection with member notifications and audit logs, shop pickup code verification and fulfillment after paid state, and privacy export/delete request job creation with audit logs. Full mobile E2E, provider/device certification, every route family's wrong-role/wrong-org matrix, and high-concurrency provider tests remain open.

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

Completed in this pass:

- Extended the open-join checkout acceptance path to verify receptionist pickup-code lookup, order fulfillment, pickup-code fulfillment status, and `shop_order.fulfilled` audit logging after payment confirmation.
- Added DB-backed receptionist queue coverage for pending attendance approve/reject, status persistence, member notification recipients, and `attendance.approved`/`attendance.rejected` audit logs.
- Added DB-backed privacy coverage for member data export request/job, account deletion request/job, `/api/me/consents` visibility, and `privacy.data_export_requested`/`privacy.account_deletion_requested` audit logs.
- Updated `docs/E2E_PRODUCT_FLOWS.md`, `docs/testing.md`, and this plan so the documented automation map matches the current suite.

Still open:

- Full browser-plus-mobile journeys for member purchase/check-in, trainer/member plan UI consumption, and owner mobile operations.
- Real Razorpay, Expo push, OpenAI, Upstash, and object storage staging/device tests.
- Exhaustive wrong-role/wrong-org coverage across every API route family.
- High-concurrency duplicate payment/webhook and rate-limit behavior against staging-like infrastructure.

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
- `pnpm test` passes and now runs package-local core, web, and mobile tests. Coverage remains incomplete.
- Production release preflight correctly fails against local `.env`, which is the right safety behavior.
- DB-backed acceptance has now been run locally for the covered payment/push/AI paths. Remote EAS builds, physical-device push QA, OpenAI live-provider QA, Razorpay webhook QA with real credentials, and object storage QA were not run.
