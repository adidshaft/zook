# Known Manual Gates

These items require owner confirmation, paid approval, physical devices, provider dashboards, or external parties. They should not be marked complete by code changes alone.

## Money and Billing

- Confirm SaaS pricing and entitlement tiers before relying on live upgrade amounts. Current code defaults are Starter ₹1,499/mo, Growth ₹3,999/mo, and Pro ₹7,999/mo, with platform settings override support for pricing and selected limits.
- Confirm exact commercial policy for platform gym-to-gym referral rewards before automating live settlement.
- Confirm exact commercial variants for gym referral campaigns that go beyond the current policy fields, especially fixed INR credit on next subscription and both-sided custom rewards.
- Finalize Kyoka Suigetsu LLP registered address for SaaS invoices.
- Run real Razorpay payment/refund certification only with explicit financial-operation approval.
- Run invoice backfill in production with `--apply` after reviewing dry-run output.

## Devices and Stores

- OAuth smoke on real iOS, Android, and Chrome sessions.
- Expo push physical-device matrix.
- App Store / Play Store metadata review.
- MSG91 DLT template approval, if SMS/WhatsApp routes depend on it.

## Infrastructure

- Supabase backups/PITR require paid plan approval and were skipped.
- Sentry staging redaction verification should be manually confirmed.
- Production load smoke currently had functional success but latency threshold warning in prior evidence.

## Provider Evidence

Existing evidence files include:

- `docs/live-launch-gates-2026-05-24.md`
- `docs/razorpay-webhook-certification.md`
- `docs/resend-transactional-smoke.md`
- `docs/supabase-backup-cert.md`
- `docs/load-smoke-template.md`
