# Zook End-to-End Demo Check Script

Last updated: 2026-05-08

Use this script as the final product rehearsal before deploying. It combines automated release checks with a role-by-role manual demo pass across web, mobile, backend, payments, attendance, shop, plans, notifications, privacy, platform diagnostics, and deployment gates.

## Demo Goal

Prove that Zook works as one connected product:

- Public gym discovery leads to joining and checkout.
- Member, Reception, Trainer, Owner/Admin, and hidden platform-operator experiences all read and write backend data.
- Attendance, memberships, shop pickup, plans, notifications, reports, audit logs, provider diagnostics, and privacy requests all behave correctly.
- Local-only demo behavior is clearly separated from staging/production behavior.
- Deployment gates block unsafe configuration before release.

## Pass Criteria

Mark the demo as passed only when all of these are true:

- All automated checks in the preflight section pass, or every failure has a documented owner and deployment decision.
- Every role can sign in with the expected permissions.
- Every critical user journey below reaches the expected final state.
- Provider diagnostics expose readiness and missing configuration without showing secret values.
- No production build path uses offline demo mode, fixed OTP, mock payment completion, or weak/local-only secrets.
- Screenshots, terminal output, and notes are captured for any issue found.

## Test Environment

Recommended final rehearsal environment:

- Local backend mode for deterministic full-product walkthrough.
- Staging backend mode for provider and deployment certification.
- Physical mobile device or release-like build for camera and push checks when available.

Do not treat offline demo mode as deployment evidence. Offline demo mode is useful for UI demos only.

## Required Accounts

Development OTP: `000000`

| Role | Email | Expected access |
| --- | --- | --- |
| Internal platform operator | `platform@zook.local` | Platform diagnostics and org controls |
| Owner | `owner@zook.local` | Full Aarogya Strength owner dashboard |
| Admin | `admin@zook.local` | Org operations without owner-only settings |
| Reception | `reception@zook.local` | Desk, attendance, payments, pickup |
| Trainer | `trainer@zook.local` | Clients, plans, reports, AI/manual drafts |
| Member | `member@zook.local` | Membership, scan, plans, shop, privacy |
| Minor member | `minor@zook.local` | Guardian consent and minor-safe behavior |
| Fresh account | `fresh@zook.local` | First-run onboarding and empty states |

## URLs And App Surfaces

Replace `http://localhost:3000` with staging or production URL when certifying a hosted environment.

| Surface | Path |
| --- | --- |
| Web login | `/login` |
| Owner dashboard | `/dashboard` |
| Attendance QR display | `/dashboard/attendance/qr-display` |
| Reports | `/dashboard/reports` |
| Audit | `/dashboard/audit` |
| Reception desk | `/desk` |
| Internal platform operator | `/platform` |
| Public gym profile | `/g/aarogya-strength` |
| Public join | `/join/aarogya-strength?plan=plan-hybrid-pro&ref=ROHAN500` |
| Referral fallback | `/r/NISHAFIT` |
| Mock checkout | `/checkout/mock/{sessionId}` |
| Provider status API | `/api/platform/provider-status` |
| Health API | `/api/health` |
| Readiness API | `/api/ready` |

Mobile routes to cover:

- Home `/`
- Find Gyms `/find-gyms`
- Gym profile `/gym/[username]`
- Scan `/scan`
- Plans `/plans`
- Plan detail `/plans/[assignmentId]`
- Notifications `/notifications`
- Shop `/shop`
- Cart `/shop/cart`
- Checkout `/shop/checkout`
- Pickup order `/shop/pickup/[orderId]`
- Profile `/profile`
- Tracking `/tracking`
- Tracking entry `/tracking-entry`
- Tracking history `/tracking-history`
- Reception `/reception`
- Trainer `/trainer`
- Owner `/owner`
- Platform `/platform`

## Evidence Log

Create a short evidence record while testing.

| Item | Result | Evidence |
| --- | --- | --- |
| Commit / build tested |  | `git rev-parse --short HEAD` |
| Environment |  | Local / staging / production |
| Database migration state |  | Command output |
| Automated tests |  | Terminal output |
| Web role walkthrough |  | Screenshots / notes |
| Mobile role walkthrough |  | Screenshots / notes |
| Provider diagnostics |  | Screenshot / redacted JSON |
| Known issues |  | Link to issue or note |
| Final decision |  | Go / no-go |

## Phase 1: Clean Setup

### 1. Confirm Working Copy And Environment

```bash
git status --short
pnpm install
cp .env.example .env
```

Expected:

- Dependencies install successfully.
- `.env` exists locally.
- Any unrelated working-tree changes are identified before the test run.

### 2. Start Database And Seed Demo Data

```bash
pnpm db:local:setup
```

Manual equivalent:

```bash
docker compose up -d postgres
pnpm db:generate
pnpm db:deploy
pnpm seed:demo
APP_ENV=local API_MODE=backend pnpm preflight
```

Expected:

- Postgres starts.
- Prisma client generates.
- Migrations apply.
- Demo accounts and gyms are seeded.
- Preflight passes in local backend mode.

### 3. Start Apps

In terminal 1:

```bash
pnpm dev:web
```

In terminal 2:

```bash
pnpm dev:mobile
```

Expected:

- Web app is available at `http://localhost:3000`.
- Expo app starts with backend mode.
- Mobile app does not show `DEMO MODE` in backend mode.

## Phase 2: Automated Release Checks

Run these before manual demo checks.

```bash
pnpm typecheck
pnpm test:unit
pnpm test:services
pnpm test:acceptance
pnpm release:preflight
pnpm env:check
pnpm check:launch-gates
```

Expected:

- All commands pass.
- Any skipped DB-gated checks clearly explain the missing prerequisite.
- Release preflight does not report blocking production issues.

Run DB-backed browser and acceptance evidence on a disposable seeded database:

```bash
pnpm test:db:prepare
RUN_DB_WEB_TESTS=1 pnpm test:web
pnpm test:acceptance:db
```

Expected:

- Public profile and join behavior are covered.
- Local mock checkout activation is covered.
- Shop pickup verification and fulfillment are covered.
- Reception attendance approve/reject is covered.
- Trainer plan assignment and member workout report visibility are covered.
- Privacy export/delete requests are covered.
- Provider diagnostics and selected RBAC boundaries are covered.

## Phase 3: Public Web And Join Flow

### 1. Public Gym Profile

1. Open `http://localhost:3000/g/aarogya-strength`.
2. Confirm gym name, location, public plans, trainers, and public assets render.
3. Confirm no private member/admin data is visible.
4. Select a public plan.

Expected:

- Only published public plans show join calls to action.
- The page has honest empty states if optional data is missing.
- The selected plan leads to the join flow.

### 2. Referral Route

1. Open `http://localhost:3000/r/NISHAFIT`.
2. Confirm the referral resolves to the correct gym/join context.
3. Try an unknown referral code.

Expected:

- Active referral codes resolve correctly.
- Unknown or inactive referral codes do not silently activate a different gym outside explicit local demo fixtures.

### 3. Join Page And Checkout Handoff

1. Open `http://localhost:3000/join/aarogya-strength?plan=plan-hybrid-pro&ref=ROHAN500`.
2. Confirm selected plan and referral/coupon information are shown.
3. Continue to login if required.
4. Complete OTP with `000000`.
5. Start checkout.
6. In local mode only, complete `/checkout/mock/{sessionId}`.

Expected:

- Join mode is enforced from backend data, not URL overrides.
- Checkout session is created by the backend.
- Membership activates only after backend payment confirmation.
- Mock checkout is clearly local-only and blocked in production.

## Phase 4: Member Mobile Flow

Sign in as `member@zook.local` with OTP `000000`.

### 1. Home And Membership

1. Open mobile Home.
2. Confirm active gym and role context.
3. Confirm current membership, renewal/status details, and primary Scan QR action.
4. Restart the app or refresh session.

Expected:

- Session restores.
- Membership data comes from backend.
- No offline demo badge appears.

### 2. Find Gyms And Gym Profile

1. Open Find Gyms.
2. Search for `Aarogya Strength`.
3. Open the gym profile.
4. Confirm plan and joining content matches the public web profile.

Expected:

- Search returns backend gyms.
- Public gym detail is consistent between mobile and web.

### 3. Attendance Scan

1. As Owner or Reception on web, open `/dashboard/attendance/qr-display`.
2. On mobile, open Scan.
3. Scan the QR code, or use the manual token path if camera testing is unavailable.
4. Capture the result screen.

Expected:

- Approved scan shows a successful check-in and entry code.
- Pending scan shows a waiting state.
- Duplicate or invalid scan shows a controlled error.
- Attendance record appears in Reception/Owner surfaces.

### 4. Plans And Workout Tracking

1. Open Plans.
2. Open the assigned plan.
3. Mark workout progress.
4. Add feedback or completion details.
5. Open Tracking.
6. Add a workout/body/habit entry.
7. Open Tracking History.

Expected:

- Assigned plans load from backend.
- Workout completion persists after refresh.
- Trainer can later see the progress report.
- Tracking entries appear in history.

### 5. Notifications

1. Open Notifications.
2. Open a plan, order, membership, or attendance notification.
3. Mark notifications as read.
4. Return to Home and check unread count.

Expected:

- Inbox loads persisted notifications.
- Deep links route to the expected screen.
- Read state persists.
- Unread count decreases.

### 6. Shop Checkout

1. Open Shop.
2. Add `Protein Shake` and `Zook Shaker`, or any seeded products.
3. Open Cart.
4. Start checkout.
5. Complete local mock checkout.
6. Open pickup order details and note pickup code.

Expected:

- Stock availability is respected.
- Payment confirmation changes order to `READY_FOR_PICKUP`.
- Pickup code appears only after paid state.
- Order is visible to Reception for fulfillment.

### 7. Profile And Privacy

1. Open Profile.
2. Update profile fields and photo if storage is enabled.
3. Review notification preferences.
4. Request data export.
5. Request account deletion.

Expected:

- Profile changes persist.
- Notification preferences persist.
- Data export and deletion requests create backend jobs and audit records.

## Phase 5: Reception Flow

Sign in as `reception@zook.local` with OTP `000000`.

### 1. Desk Overview

1. Open mobile Reception or web `/desk`.
2. Confirm pending/flagged attendance queue loads.
3. Confirm today's check-ins, manual actions, payments, and pickup surfaces are visible.

Expected:

- Reception can access desk operations.
- Reception cannot access owner-only settings.

### 2. Attendance Approval

1. Create or locate a pending scan.
2. Approve one attendance record.
3. Reject another attendance record with a reason.
4. Check member notifications.
5. Check audit logs as owner/admin.

Expected:

- Approval updates attendance status.
- Rejection requires and stores a reason.
- Member receives notification.
- Audit logs record approval/rejection actions.

### 3. Manual Attendance

1. Search for a member.
2. Create manual attendance.
3. Enter a reason.
4. Confirm attendance appears in owner dashboard/report.

Expected:

- Manual attendance requires a reason.
- Visit counters and reports update.
- Audit log captures the manual override.

### 4. Offline Payment

1. Search for member `Nisha` or another seeded member.
2. Record a Direct UPI or cash payment.
3. Attach payment proof if storage is enabled.
4. Save the payment.

Expected:

- Reason/reference is required.
- Payment appears in member and owner/admin payment views.
- Audit log records the transaction.

### 5. Shop Pickup Fulfillment

1. Enter the member pickup code from Phase 4.
2. Verify the order.
3. Fulfill the order.
4. Refresh shop/order views.

Expected:

- Valid pickup code resolves the right order.
- Fulfillment changes order state.
- Fulfilled count and inventory state update.
- Reusing the same pickup code is blocked or shown as already fulfilled.

## Phase 6: Trainer Flow

Sign in as `trainer@zook.local` with OTP `000000`.

### 1. Client List And Permissions

1. Open Trainer.
2. Confirm only assigned clients are visible.
3. Open assigned client `Nisha Menon` or the seeded member.
4. Try to access an unassigned client if a direct link is available.

Expected:

- Assigned clients load.
- Unassigned clients are hidden or denied.

### 2. Plan Draft, Review, And Assignment

1. Open the client plan area.
2. Confirm AI assistant state:
   - If `AI_FEATURES_ENABLED=false`, it should show neutral unavailable-state copy.
   - If local mock AI is enabled, draft generation should be deterministic and clearly review-gated.
3. Create or generate a structured plan.
4. Edit exercises, sets, reps, notes, or schedule.
5. Save the draft.
6. Review the final plan.
7. Assign/publish to the member.

Expected:

- Trainer review is required before assignment.
- Draft edits persist.
- Assigned member receives a notification.
- Member can open the assigned plan.

### 3. Progress Report

1. After member completes workout progress, reopen the trainer client detail.
2. Review workout report and feedback.

Expected:

- Trainer sees only assigned member reports.
- Workout completion and feedback match member input.

## Phase 7: Owner/Admin Flow

Sign in as `owner@zook.local` with OTP `000000`.

### 1. Mobile Owner Command View

1. Open Owner on mobile.
2. Review active members, check-ins, revenue, approvals, stock, and needs-attention items.

Expected:

- Metrics load from backend.
- Empty/error/unavailable states are honest.
- Owner can navigate to pending operational work.

### 2. Web Dashboard Overview

1. Open `/dashboard`.
2. Confirm branch context and Default Branch label.
3. Review today's command board.
4. Review member, attendance, payment, shop, staff, plan, notification, and settings surfaces.

Expected:

- Dashboard data is backend-backed.
- Branch filters apply where available.
- Cross-org branch IDs are rejected by API filters.

### 3. Membership Plan, Coupon, And Referral

1. Open plan controls.
2. Create or edit a membership plan.
3. Confirm the plan is attached to the Default Branch when applicable.
4. Create or verify coupon `ROHAN500`.
5. Create or verify referral links.

Expected:

- Plan changes persist.
- Public join page reflects published plan changes.
- Referral APIs return `/join/{username}?ref={code}` and `/r/{code}` style links.

### 4. Notifications Composer

1. Create a selected-member notification.
2. Send it.
3. Sign in as member and verify inbox delivery.
4. Mark as read.

Expected:

- Notification persists.
- Recipient targeting is correct.
- In-app notification remains canonical even if push provider is disabled.

### 5. Reports And Audit

1. Open `/dashboard/reports`.
2. Export at least one CSV report.
3. Open `/dashboard/audit`.
4. Confirm recent actions appear.

Expected:

- Report downloads succeed.
- Export/settings/payment/attendance actions create audit entries.
- Audit log does not expose secrets.

### 6. Staff And RBAC

1. Review staff list.
2. Confirm Owner/Admin/Reception/Trainer roles are present.
3. Attempt one owner-only action as Admin or Reception.

Expected:

- Role permissions match product expectations.
- Unauthorized actions are denied with a controlled error.

## Phase 8: Minor And Guardian Consent

Sign in as `minor@zook.local` with OTP `000000`.

1. Open mobile Home/Profile.
2. Confirm restricted state before guardian consent.
3. Start guardian consent request.
4. Verify guardian consent with local OTP where available.
5. Return to minor account.
6. Try plan, shop, tracking, and notification surfaces.

Expected:

- Minor is blocked before consent.
- Consent status persists after verification.
- Minor-safe defaults apply after consent.
- Any restricted action shows a clear blocked state.

## Phase 9: Internal Platform Operator Flow

Sign in as `platform@zook.local` with OTP `000000`.

### 1. Provider Diagnostics

1. Open `/platform`.
2. Open provider diagnostics.
3. Also call `/api/platform/provider-status` while authenticated if needed.

Expected:

- Providers show configured, disabled, missing, unsupported, or unhealthy states.
- Diagnostics include request IDs and missing env names only.
- Secret values are never displayed.

### 2. Organization Operations

1. Review organization list.
2. Suspend a non-critical test org.
3. Confirm public/member access changes appropriately.
4. Reactivate the org.

Expected:

- Org status changes persist.
- Suspended org behavior is clear and controlled.
- Reactivation restores expected access.
- Audit logs record status changes.

## Phase 10: API Health And Safety Checks

Run against the active environment.

```bash
curl -i http://localhost:3000/api/health
curl -i http://localhost:3000/api/ready
```

Expected:

- Health endpoint returns success when app is alive.
- Readiness endpoint reflects database/provider readiness.
- Errors are structured and do not leak secrets.

Check production-blocking behavior with production-like env settings:

```bash
APP_ENV=production API_MODE=backend pnpm release:preflight
```

Expected:

- Offline demo mode is blocked.
- Fixed OTP is blocked.
- Mock payment completion is blocked.
- Memory or disabled production rate limiting is blocked.
- Required live provider settings are enforced or explicitly disabled.

## Phase 11: Provider Certification Checks

Use staging for these checks. Do not run live-provider certification against production first.

### Razorpay

1. Configure live or staging Razorpay keys and webhook secret in the secret store.
2. Create a membership checkout.
3. Complete payment.
4. Send success, failure, duplicate, and out-of-order webhook events.

Expected:

- Payment events are idempotent.
- Membership activates only after valid backend confirmation.
- Invalid signatures are rejected.
- Webhook payloads do not leak secrets in logs.

### Storage

1. Configure Supabase, S3, or R2 storage.
2. Upload profile photo.
3. Upload org logo, cover, and gallery image.
4. Upload payment proof.
5. Upload product image or invoice PDF where supported.
6. Request a private file from the wrong org.

Expected:

- Content-type and file-size validation work.
- Public assets render on public pages.
- Private signed URLs expire.
- Wrong-org access is denied.
- File-read/upload audit records are created.

### OpenAI

Keep `AI_FEATURES_ENABLED=false` for pilot launch unless staging certification is complete.

If certifying:

1. Set `AI_PROVIDER=openai`, `AI_FEATURES_ENABLED=true`, and required OpenAI env vars in staging.
2. Generate a safe trainer plan.
3. Test timeout, quota/429, invalid key/401, malformed response, and unsafe prompt cases.

Expected:

- Safe generation creates review-gated draft only.
- Unsafe/out-of-scope prompts return controlled validation errors.
- Failures are logged with structured audit and no secret leakage.

### Expo Push

1. Install an EAS/dev-client or release build on a physical device.
2. Register push permission and token.
3. Send plan, order, attendance, and membership notifications.
4. Test foreground, background tap, and cold-start deep links.

Expected:

- In-app notification is created regardless of push provider state.
- Remote push sends only when configured.
- Payload contains only `notificationId` and `type`.
- Tap opens the intended screen.
- Permission denial does not break the inbox.

### Sentry

1. Configure web and mobile Sentry projects.
2. Trigger one handled test exception.
3. Trigger one unhandled staging exception.
4. Verify source maps, breadcrumbs, release association, and redaction.

Expected:

- Events arrive in the correct project/environment.
- Sensitive data is redacted.
- Release version matches tested build.

### Rate Limiting

1. Configure `RATE_LIMIT_PROVIDER=upstash`.
2. Exhaust OTP, payment, or AI limit from two app processes.

Expected:

- Shared limit blocks both processes.
- Diagnostics do not expose Upstash URL or token.

## Phase 12: Mobile Release Build Checks

From `apps/mobile`:

```bash
APP_ENV=production API_MODE=backend EXPO_PUBLIC_API_MODE=backend pnpm exec eas build --platform ios --profile production
```

Expected:

- Installed build launches without Metro.
- Build does not show `DEMO MODE`.
- Missing backend URL produces a fatal configuration screen, not silent test data.
- Login, role selection, scan, notifications, and logout work against selected backend.
- Push permission denial keeps in-app inbox usable.
- Physical device camera scan works for attendance QR.

## Phase 13: Offline Demo Mode Guardrail

Run only when intentionally validating demo mode:

```bash
APP_ENV=local API_MODE=offline-demo EXPO_PUBLIC_API_MODE=offline-demo pnpm dev:mobile
```

Expected:

- Mobile visibly shows `DEMO MODE`.
- Demo badge does not overlap role chips, account controls, or primary CTAs.
- Demo login shortcuts work only in this mode.
- Backend mode never silently falls back to demo success labels.
- Production/staging release checks reject offline demo mode.

## Phase 14: Final Go / No-Go Checklist

| Gate | Status | Notes |
| --- | --- | --- |
| `pnpm typecheck` passed |  |  |
| `pnpm test:unit` passed |  |  |
| `pnpm test:services` passed |  |  |
| `pnpm test:web` passed or documented |  |  |
| `pnpm test:acceptance:db` passed or documented |  |  |
| `pnpm release:preflight` passed |  |  |
| Web login works for all roles |  |  |
| Mobile login/session restore works |  |  |
| Public gym/join/checkout works |  |  |
| Membership activation is backend-confirmed |  |  |
| Attendance QR scan works |  |  |
| Reception approval/rejection works |  |  |
| Shop checkout and pickup works |  |  |
| Trainer plan review/assignment works |  |  |
| Member plan progress is visible to trainer |  |  |
| Notifications and deep links work |  |  |
| Reports and audit logs work |  |  |
| Privacy export/delete requests work |  |  |
| Minor consent gates work |  |  |
| Platform diagnostics are secret-safe |  |  |
| Provider staging checks complete |  |  |
| Mobile release build smoke complete |  |  |
| Known issues triaged |  |  |

## Suggested Demo Order For Stakeholders

Use this shorter order when presenting the product after completing the full QA pass:

1. Owner web dashboard: command board, plans, coupon/referral, reports, audit.
2. Public gym profile: plan selection and join checkout.
3. Member mobile: active membership, QR scan, plan progress, notifications, shop order.
4. Reception: approve attendance, record manual payment, fulfill pickup.
5. Trainer: review and assign a plan, see member progress.
6. Owner mobile: needs attention, revenue, approvals, stock.
7. Internal platform operator: provider diagnostics and org controls.
8. Deployment gates: release preflight, production guardrails, provider certification status.

## Common No-Go Findings

Do not deploy until resolved or explicitly accepted:

- Release preflight blocks production configuration.
- Production build can enter offline demo mode.
- Fixed OTP works in production.
- Mock checkout completion works in production.
- Provider diagnostics show secret values.
- Membership activates before backend payment confirmation.
- Attendance approval/rejection does not create audit records.
- Shop pickup code can be reused after fulfillment.
- Trainer can assign a plan without review.
- Member or trainer can access another org's data.
- Minor can bypass guardian consent.
- Push failure prevents in-app notification delivery.
- Privacy export/delete request does not create a backend job.

## Sign-Off

| Name | Role | Decision | Date | Notes |
| --- | --- | --- | --- | --- |
|  | Product | Go / No-go |  |  |
|  | Engineering | Go / No-go |  |  |
|  | Operations | Go / No-go |  |  |
|  | Support | Go / No-go |  |  |
