# Zook E2E Product Flows

Last updated: 2026-05-03

This document tracks the primary end-to-end flows for Zook in backend mode. It is not a production launch certification. Local DB-backed tests use seeded data and mock/local providers where explicitly configured. Razorpay, Expo push, OpenAI, object storage, physical-device camera, and iPhone release behavior still need staging/device validation before production claims.

## How To Run The Automated E2E Evidence

```bash
pnpm test:db:prepare
RUN_DB_WEB_TESTS=1 pnpm test:web
```

The DB-backed Playwright suite lives in `apps/web/tests/acceptance.spec.ts`. It currently covers public gym/join behavior, checkout activation semantics, shop order payment state and pickup fulfillment, receptionist attendance approval/rejection, owner operations, trainer AI assignment, trainer-visible workout reports, privacy export/delete request persistence, provider diagnostics, and selected RBAC boundaries.

## Flow 1: Member Purchase And Check-In

Target journey:

1. Member opens public gym page.
2. Member chooses a public plan.
3. Backend creates checkout session.
4. Provider or explicit local mock confirms payment.
5. Membership becomes active only after backend confirmation.
6. Mobile member home updates from backend.
7. Member scans QR.
8. Attendance is approved or pending.
9. Entry code/result is shown.

Automated evidence:

- `public gym and referral fallbacks render`
- `public join page honors backend join mode instead of query overrides`
- `open join checkout activates membership and shop order success stays server-backed`
- `receptionist approval queue updates attendance notifications and audit`
- `default branch scope is explicit for plans, dashboard filters, and QR tokens`
- Core attendance duplicate/status mapping in `packages/core/src/__tests__/services.test.ts`
- Mobile notification and routing utilities in `apps/mobile/src/lib/*.test.ts`

Manual QA checklist:

- Run web in backend mode and open `/g/iron-house`.
- Confirm only published public plans show join CTAs.
- Complete local mock checkout through `/checkout/mock/{sessionId}`.
- Confirm `/api/me/memberships` and mobile member home show an active membership.
- Open `/dashboard/attendance/qr-display` as owner/reception.
- Scan or paste the QR in mobile backend mode.
- Confirm approved scans show an entry code and pending scans show a waiting state.

Open gaps:

- Real Razorpay checkout and webhook are not provider-certified.
- Physical-device camera scan and mobile home refresh were not reverified in this phase.
- Full member purchase-to-scan browser/mobile automation is still manual.

## Flow 2: Pending Attendance And Receptionist Approval

Target journey:

1. Member scan returns pending or flagged.
2. Receptionist queue shows the attempt.
3. Receptionist approves or rejects.
4. Member sees updated result and notification.
5. Audit log is created.

Automated evidence:

- Core pending/approval behavior in `packages/core/src/__tests__/mock-services.test.ts`.
- `receptionist approval queue updates attendance notifications and audit`
- API route coverage asserts manual attendance permission boundaries in `platform admins cannot perform tenant operations through org routes`.
- Default Branch attendance token/filter behavior is covered in DB-backed Playwright.

Manual QA checklist:

- Sign in as member and create a pending/flagged scan.
- Sign in as `reception@zook.local`.
- Open receptionist pending queue.
- Approve one record and reject another with a reason.
- Confirm member inbox/result updates.
- Confirm audit log entries for `attendance.approved` and `attendance.rejected`.

Open gaps:

- DB-backed acceptance creates pending attendance records directly and approves/rejects through receptionist APIs; it does not yet drive the actual member QR scan into a pending state.
- Device scan and live notification tap are manual.

## Flow 3: Trainer Plan Assignment

Target journey:

1. Trainer opens assigned client.
2. Trainer generates AI draft.
3. Trainer edits and saves draft.
4. Trainer reviews and assigns plan.
5. Member receives notification.
6. Member sees assigned plan.
7. Member completes workout.
8. Trainer sees progress report.

Automated evidence:

- `trainer AI draft requires assigned client, consent, review, and then assignment`
- `member workout reports are assignment-scoped and visible to the trainer`
- Core trainer assignment guard in `packages/core/src/__tests__/services.test.ts`
- Mobile notification routing utility coverage for plan routes.

Manual QA checklist:

- Sign in as `trainer@zook.local` on mobile.
- Open Clients, then Client Detail for an assigned member.
- Confirm the Plan Assistant shows the launch coming-soon state.
- Create a manual structured plan and save it.
- Review, assign, and confirm member notification.
- Sign in as member, open the assigned plan, complete workout, and add feedback.
- Return as trainer and confirm progress/report visibility.

Open gaps:

- DB-backed acceptance verifies generation/review/assign and workout report visibility, but does not yet automate editing draft content before review.
- OpenAI provider path and safety behavior were not validated with live credentials.
- Physical-device push/deep-link behavior is not certified.

## Flow 4: Shop Pickup

Target journey:

1. Member adds shop item.
2. Backend checkout session is created.
3. Payment confirmation succeeds.
4. Pickup code is generated after paid state.
5. Receptionist verifies pickup code.
6. Order is fulfilled.
7. Inventory and fulfilled counts update.

Automated evidence:

- `open join checkout activates membership and shop order success stays server-backed` verifies shop order payment confirmation, idempotent payment creation, `READY_FOR_PICKUP`, pickup code generation, receptionist code verification, fulfillment, pickup-code status update, and fulfillment audit.
- Payment boundary tests prevent generic checkout metadata from activating shop records.

Manual QA checklist:

- Sign in as member and create a shop order.
- Complete local mock checkout.
- Confirm order status is `READY_FOR_PICKUP` and pickup code exists.
- Sign in as receptionist.
- Verify the pickup code through the desk/code verification surface.
- Fulfill the order.
- Confirm fulfilled count and inventory state update.

Open gaps:

- Razorpay payment confirmation and refund/cancel flows are provider-ready but not certified.
- Shop inventory remains org-wide in the MVP schema.

## Flow 5: Owner/Admin Operations

Target journey:

1. Owner opens mobile command/needs-attention surface.
2. Owner sees backend metrics.
3. Owner opens web dashboard.
4. Owner reviews members, payments, attendance, shop, notifications, reports, and audit.
5. Platform admin reviews provider diagnostics and org status.

Automated evidence:

- `owner login and membership plan creation use the live auth and api path`
- `owner can create a persisted notification through the web session`
- `owner can configure pilot settings, export a report, and leave an audit trail`
- `platform admin can inspect providers and suspend then reactivate an organization`
- Provider secret redaction coverage in `packages/core/src/__tests__/provider-registry.test.ts`.

Manual QA checklist:

- Sign in as owner on mobile and verify Needs attention, revenue, approvals, stock, and members load from backend.
- Sign in as owner/admin on web and walk the dashboard sections.
- Confirm loading, empty, error, and unavailable states are honest.
- Export at least one report.
- Confirm audit entries are visible for report/export/settings actions.
- Sign in as platform admin and inspect provider diagnostics without secrets.

Open gaps:

- Heavy web dashboard tables still need broader pagination/search hardening.
- Owner setup gallery/trainer/app-link persistence needs deeper browser coverage.
- Owner/admin mobile is intentionally lightweight; platform admin remains web-first.

## Flow 6: Privacy Export And Delete

Target journey:

1. Member requests data export.
2. Backend creates export request and job.
3. Export status is visible.
4. Member requests account deletion.
5. Backend creates deletion request and job.
6. Audit logs are created.

Automated evidence:

- Privacy routes are implemented in `apps/web/src/server/api-router.ts`.
- `member privacy export and deletion requests create jobs and audit trail`
- Storage provider tests cover private JSON export file typing in `packages/core/src/__tests__/storage-provider.test.ts`.
- Mobile profile/query hooks expose privacy request state.

Manual QA checklist:

- Sign in as member in backend mode.
- Request data export from mobile profile/privacy.
- Confirm `/api/me/consents` shows export request/job status and export URL when generated.
- Request account deletion.
- Confirm deletion request/job status.
- Confirm audit log entries for `privacy.data_export_requested` and `privacy.account_deletion_requested`.

Open gaps:

- Production background workers, retention policy, and operator privacy-job dashboards remain out of scope.
- Object storage for production privacy exports is provider-ready but not certified.

## Current E2E Coverage Summary

- Covered with DB-backed automation: public profile/join fallback semantics, local mock checkout activation, payment idempotency, shop pickup code generation and fulfillment, pending attendance approve/reject, privacy export/delete job creation, owner setup/report/audit basics, notifications composer persistence, platform diagnostics/status controls, trainer assigned-client AI flow, member workout report visibility.
- Partially covered: member purchase/check-in, owner mobile operations, mobile trainer/member plan UI consumption.
- Manual/device-only today: camera scan reliability, physical push delivery/deep-link taps, iPhone release install, real provider checkout/webhook, live OpenAI behavior, object-storage download/upload.
