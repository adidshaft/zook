# Payments

Last updated: 3 May 2026

## Policy

- Zook does not implement Apple or Google in-app purchases.
- Mobile and web clients never activate memberships, shop orders, or SaaS billing from redirect state alone.
- Activation is always driven by backend-verified payment state.

## Provider Modes

Selector env:

- `PAYMENT_PROVIDER=mock|razorpay|disabled`

Razorpay env:

- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `RAZORPAY_MODE=test|live`
- `RAZORPAY_CHECKOUT_THEME_COLOR` optional

## Current Flow

### Backend-Owned Checkout Routes

- membership purchases use `POST /api/orgs/{orgId}/subscriptions`
- shop purchases use `POST /api/shop/orders`
- the generic `POST /api/payments/checkout` route cannot create membership or shop-order sessions
- generic checkout metadata cannot directly reference `subscriptionId` or `shopOrderId`
- membership/shop activation targets are verified against the session org, user, purpose, and amount before any paid side effect is applied

### Mock

- default local mode
- creates a hosted session at `/checkout/mock/{sessionId}`
- server-side completion happens through `POST /api/payments/mock/{sessionId}/complete`
- membership activation and shop stock movement happen only after backend completion
- expired sessions cannot be completed as successful payments

### Razorpay

- server creates the Razorpay order
- Zook stores the provider reference on the payment session
- non-secret checkout metadata is returned to the client and persisted for the handoff page
- webhook verification and status processing happen on the server

### Disabled

- returns a controlled unavailable state from checkout routes
- should be used only when purchases are intentionally turned off
- is preferred over `mock` for production environments where payments are not ready

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

- one `Payment` per `PaymentSession.sessionId`
- unique provider event tracking
- no double membership activation
- no double coupon redemption
- no double referral redemption
- no double stock decrement for shop orders
- conditional shop-order transition from `PENDING_PAYMENT` before inventory movement or pickup-code creation
- webhook failure quarantine when provider verification succeeds but business-state application fails

## Reconciliation Data

The payment runtime persists:

- `PaymentSession`
- `Payment`
- `PaymentEvent`
- `PaymentWebhookAttempt`

This gives pilot operators a durable trail for duplicate, failed, and quarantined webhook handling.

## Local And Staging Notes

- local should remain `PAYMENT_PROVIDER=mock`
- staging can use `PAYMENT_PROVIDER=razorpay` with `RAZORPAY_MODE=test`
- run `pnpm release:preflight` before enabling Razorpay on staging

## Razorpay Test Setup

Use this only for staging or a controlled local tunnel. Do not mark payments production-certified until the signed webhook path has been exercised with real Razorpay test credentials.

1. Set:

```bash
APP_ENV=staging
API_MODE=backend
PAYMENT_PROVIDER=razorpay
RAZORPAY_MODE=test
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...
```

2. Expose the web app on a public HTTPS URL for webhook testing.
3. In Razorpay Dashboard, create a webhook pointing to:

```text
https://<your-web-host>/api/payments/webhooks/razorpay
```

4. Subscribe to payment/order/refund events used by Zook's parser, including captured, failed, paid, and refunded events.
5. Run `pnpm release:preflight` with the staging env.
6. Create a membership or shop checkout through the backend route, complete the Razorpay test checkout, and confirm:

- the redirect/result page only shows status
- the webhook creates or updates `PaymentEvent` and `PaymentWebhookAttempt`
- membership activation or shop inventory movement happens only after backend confirmation
- duplicate webhook delivery returns idempotently
- signature failures are rejected
- application failures are quarantined without exposing secrets

## Known Limitations

- the non-mock checkout handoff page is intentionally conservative and does not embed a direct client-side Razorpay flow
- refund and dispute lifecycle persistence is wired through the provider/runtime path, but full operations UI for reconciliation is still a Phase 5 candidate
- production rollout should stay behind a limited pilot until real webhook traffic is observed
- Razorpay test credentials and real signed webhook delivery were not verified during the 2026-05-03 hardening pass
- payment application is more idempotent, but high-concurrency webhook behavior still needs staging/DB acceptance under realistic duplicate delivery

## Razorpay Provider Certification

Before production launch, complete and record a staging run with real Razorpay test credentials:

1. Create a membership checkout and complete the Razorpay-hosted test payment.
2. Deliver the signed webhook to `/api/payments/webhooks/razorpay`.
3. Replay the same webhook and confirm the response is idempotent and no duplicate `Payment`, membership activation, coupon redemption, referral redemption, stock decrement, or pickup code is created.
4. Send a webhook with an invalid signature and confirm it is rejected without business-state changes.
5. Force a business-state application failure in staging and confirm the webhook attempt is quarantined with provider IDs but without secrets.

Record the staging date, Razorpay dashboard event IDs, Zook `PaymentWebhookAttempt` IDs, duplicate replay result, and any quarantine result here before launch.

## Future Notes

- UPI AutoPay and card mandates remain future work
- richer payment reconciliation screens and manual review workflows can build on the Phase 4 event tables
