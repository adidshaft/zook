# Payments

Last updated: 24 April 2026

## Policy

- Zook does not implement Apple or Google in-app purchases.
- Mobile and web clients never activate memberships, shop orders, or SaaS billing from redirect state alone.
- Activation is always driven by backend-verified payment state.

## Provider Modes

Selector env:

- `PAYMENT_PROVIDER=mock|razorpay`

Razorpay env:

- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `RAZORPAY_MODE=test|live`
- `RAZORPAY_CHECKOUT_THEME_COLOR` optional

## Current Flow

### Mock

- default local mode
- creates a hosted session at `/checkout/mock/{sessionId}`
- server-side completion happens through `POST /api/payments/mock/{sessionId}/complete`
- membership activation and shop stock movement happen only after backend completion

### Razorpay

- server creates the Razorpay order
- Zook stores the provider reference on the payment session
- non-secret checkout metadata is returned to the client and persisted for the handoff page
- webhook verification and status processing happen on the server

## Webhook Route

- `POST /api/payments/webhooks/razorpay`
- reads the raw request body
- validates `x-razorpay-signature`
- persists `PaymentEvent`
- persists `PaymentWebhookAttempt`
- handles duplicates idempotently
- quarantines unmapped events instead of silently succeeding business state

## Activation Model

Successful server-side payment processing can activate:

- membership purchases
- shop orders
- SaaS billing state

Idempotency protections include:

- unique provider event tracking
- no double membership activation
- no double coupon redemption
- no double referral redemption
- no double stock decrement for shop orders

## Reconciliation Data

Phase 4 persists:

- `PaymentSession`
- `Payment`
- `PaymentEvent`
- `PaymentWebhookAttempt`

This gives pilot operators a durable trail for duplicate, failed, and quarantined webhook handling.

## Local And Staging Notes

- local should remain `PAYMENT_PROVIDER=mock`
- staging can use `PAYMENT_PROVIDER=razorpay` with `RAZORPAY_MODE=test`
- run `pnpm release:preflight` before enabling Razorpay on staging

## Known Limitations

- the non-mock checkout handoff page is intentionally conservative and does not embed a direct client-side Razorpay flow
- refund and dispute lifecycle persistence is wired through the provider/runtime path, but full operations UI for reconciliation is still a Phase 5 candidate
- production rollout should stay behind a limited pilot until real webhook traffic is observed

## Future Notes

- UPI AutoPay and card mandates remain future work
- richer payment reconciliation screens and manual review workflows can build on the Phase 4 event tables
