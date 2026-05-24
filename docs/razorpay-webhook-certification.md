# Razorpay Webhook Certification

Owner: payments release engineer

Command:

```bash
RAZORPAY_WEBHOOK_CERT_URL=https://app.zookfit.in/api/payments/razorpay/webhook \
RAZORPAY_WEBHOOK_SECRET=... \
RAZORPAY_WEBHOOK_FIXTURE_DIR=fixtures/razorpay \
pnpm cert:razorpay-webhook
```

## Fixtures

- [ ] Success payment event returns 200.
- [ ] Failure payment event returns 200 and does not activate a membership.
- [ ] Duplicate success event returns 200 and creates no second activation.
- [ ] Out-of-order event leaves the final payment state correct.
- [ ] Refund event updates the refund ledger exactly once.

## Dashboard Evidence

- [ ] `PaymentEvent` has one row per event id.
- [ ] Duplicate fixture did not create duplicate `Payment`, `MemberSubscription`, or invoice rows.
- [ ] Audit log contains webhook application entries.
- [ ] Screenshots saved under `docs/evidence/razorpay-webhook/`.
