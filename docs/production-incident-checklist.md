# Production Incident Checklist

Last updated: 2026-05-17

Use this during live support. The goal is to protect customers first, preserve evidence, and avoid destructive fixes while the blast radius is unclear.

## First 10 Minutes

1. Name the incident.
2. Record start time, reporter, affected surface, and first symptom.
3. Check `/api/health`, `/api/ready`, and `/api/platform/provider-status`.
4. Identify affected roles: public visitor, member, receptionist, trainer, owner/admin, or platform.
5. Check whether the issue is read-only, login-blocking, payment-blocking, attendance-blocking, or data-integrity-sensitive.
6. Assign incident owner and rollback owner.
7. Pause risky tenant actions if data integrity or payments are uncertain.

## Provider Triage

Payments:

- Check Razorpay dashboard health and recent webhook delivery.
- Compare Zook payment rows, provider order/payment IDs, and webhook event IDs.
- Do not manually mark payment success until amount, currency, org, user, and purpose match.

Push:

- Check Expo push receipts and device token validity.
- Confirm the product action still completed even if notification delivery failed.

Email:

- Check Resend/SMTP quota, DNS alignment, and send logs.
- If OTP email is blocked, use approved support recovery only after identity verification.

Storage:

- Check upload errors, signed URL expiry, bucket permissions, and file audit logs.
- Do not make private buckets public to fix a single asset.

AI:

- Disable the AI feature flag if model/provider behavior is unsafe.
- Preserve prompt summary, safety flags, org ID, and actor role.

Rate limiting:

- Check Upstash availability and namespace.
- Avoid disabling limits globally during an auth/payment incident.

## Customer Communication

- Tell pilot users what is affected, what still works, and when the next update will come.
- Avoid promising data recovery until the database and provider logs agree.
- Keep owner/admin users informed first if desk or payment workflows are affected.

## Recovery

1. Roll back app deployment if the issue is code-related and rollback is compatible with the current schema.
2. If migrations were involved, confirm whether they are backward-compatible before database rollback.
3. Re-run health, ready, provider status, and the smallest failing workflow.
4. Record the exact commit, deployment URL, database migration state, and provider event IDs.
5. Add a follow-up issue for permanent prevention.

## Production Smoke After Recovery

- Public home and one public gym profile load.
- Login page loads.
- Owner dashboard loads for one internal account.
- Platform provider status loads.
- Payment routes are read-only checked unless a controlled live smoke is approved.
