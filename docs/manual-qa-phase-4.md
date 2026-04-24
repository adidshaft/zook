# Manual QA Phase 4

Last updated: 24 April 2026

## Owner

1. Login with OTP.
2. Open `/dashboard`.
3. Create a membership plan.
4. Create a coupon and referral code.
5. Review reports and audit logs.
6. Confirm payment and notification surfaces load without placeholder failures.

## Member

1. Search public gyms.
2. Open a gym profile.
3. Start membership checkout.
4. Complete mock checkout or a controlled staging handoff.
5. Confirm membership becomes active only after backend completion.
6. Create a shop order and confirm pickup readiness after payment success.

## Receptionist

1. Review attendance approval queue.
2. Approve one scan and reject one scan.
3. Record a manual payment.
4. Fulfill a ready pickup order.

## Trainer

1. Open assigned clients.
2. Generate an AI draft plan.
3. Assign the plan.
4. Send a scoped notification.

## Platform Admin

1. Open `/platform`.
2. Review provider diagnostics.
3. Confirm `/api/health` and `/api/ready`.
4. Suspend and reactivate a pilot org in a non-production environment.

## Payments

1. Create a payment session.
2. Complete a mock payment.
3. Confirm `PaymentEvent` persists.
4. If staging Razorpay is enabled, send a signed test webhook and confirm duplicate handling.

## Push

1. Register a push device through the API.
2. Send an in-app notification with push enabled.
3. Confirm `PushDelivery` rows are created.
4. Confirm invalid tokens are marked inactive when simulated by provider responses.

## Minor And Guardian

1. Login as a minor account.
2. Request guardian consent.
3. Verify guardian OTP.
4. Confirm `guardianPending` clears after verification.

## Data Export And Deletion

1. Request a data export.
2. Confirm a `DataExportJob` is created.
3. Confirm a signed export URL is returned on success.
4. Request account deletion.
5. Confirm an `AccountDeletionJob` is queued and linked.

## QR And Deep Links

1. Open `/dashboard/attendance/qr-display`.
2. Scan or paste the token in mobile.
3. Open a `zook://` deep link using the configured QA routes in `docs/mobile-private-pilot-qa.md`.

## Reports

1. Export at least one CSV report from the dashboard.
2. Confirm audit log export still respects permissions.
