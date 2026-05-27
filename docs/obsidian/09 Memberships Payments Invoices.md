# Memberships, Payments, and Invoices

This module controls membership purchases, renewals, subscription changes, manual payments, refunds, receipts, invoices, SaaS billing, and payout-related money movement.

## Member Payment Flows

- Create checkout through backend.
- Complete provider/mock checkout, unless the final amount is zero.
- Backend confirms payment.
- Membership, shop order, or PT state changes.
- Receipt/invoice becomes available.

For fully discounted, referral-covered, or trial-like member purchases where the final amount is zero, the backend fulfills the payment session internally and returns the normal checkout/session response without requiring provider checkout.

## Owner/Admin Payment Flows

- View payments.
- Record manual/offline payments.
- Generate receipts.
- Generate invoices.
- Refund eligible payments.
- Review payment events and webhook attempts.

## Platform Payment Flows

- Search payments across tenants.
- Inspect payment details.
- Submit platform refund.
- Replay webhook attempts.
- Run refund reconciliation cron.

## SaaS Billing Flow

New organizations can start on trial, but owner/admin writes are gated by billing setup. A gym needs either an active paid SaaS subscription or a live SaaS billing mandate state before normal owner/admin write operations continue.

Current SaaS lifecycle:

- Trial organization is created from `/start-gym`.
- Owner completes billing profile and lands on `/dashboard/billing`.
- Owner mobile users can complete the same setup from `/owner/billing`.
- Owner creates or authenticates SaaS mandate through Razorpay via provider abstraction.
- SaaS upgrade creates a payment session and mandate metadata for selected tier and cycle.
- Provider webhook or mock checkout applies payment status server-side.
- SaaS subscription moves to active and SaaS invoice generation is available.
- Cancel marks the subscription to end/cancel according to current endpoint behavior.

Mobile checkout return links include a target parameter so owner billing, membership checkout, and shop checkout resume on the correct app surface after provider checkout.

SaaS delayed charges are handled by extending the setup payment session for subscription charge webhooks when needed, so a trial-to-paid charge is not rejected only because the original setup checkout session expired.

Default SaaS prices unless platform settings override them:

| Tier | Monthly | Yearly | Member limit | Branch limit | Staff limit | Trainer limit | Product limit | Notifications/month | AI text/month | AI images/month | Support |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Trial / Free | ₹0 | ₹0 | 25 | 1 | 2 | 1 | 20 | 100 | 0 | 0 | Standard |
| Starter | ₹1,499 | ₹14,990 | 100 | 1 | 5 | 2 | 50 | 1,000 | 0 | 0 | Standard |
| Growth | ₹3,999 | ₹39,990 | 500 | 3 | 20 | 10 | 500 | 10,000 | 500 | 50 | Priority |
| Pro | ₹7,999 | ₹79,990 | Unlimited | Unlimited | Unlimited | Unlimited | Unlimited | 50,000 | 3,000 | 300 | Premium |

Platform settings can override SaaS pricing and selected entitlement limits through platform-only endpoints. See [[08 Platform Operations]].

Plan enforcement currently applies at these write points:

- New member checkout and payment fulfillment.
- Join request approval and batch approval.
- Branch creation.
- Staff invitation.
- Trainer invitation.
- Product creation.
- Notification sends by monthly recipient count.
- AI text/image requests by monthly org quota.

Core gym workflows remain available across paid plans after billing setup. The plans are packaged mainly by scale, team size, branch count, inventory size, messaging volume, AI quota, and support level.

## Key APIs

- `POST /api/payments/checkout`
- `GET /api/payments/session/:id`
- `POST /api/payments/webhooks/razorpay`
- `POST /api/orgs/:orgId/subscriptions`
- `POST /api/me/memberships/:id/renew`
- `POST /api/me/memberships/:id/autopay`
- `GET /api/orgs/:orgId/payments`
- `POST /api/orgs/:orgId/payments/:paymentId/refund`
- `GET/POST /api/orgs/:orgId/payments/:paymentId/receipt`
- `GET/POST /api/orgs/:orgId/payments/:paymentId/invoice`
- `GET /api/orgs/:orgId/billing/subscription`
- `POST /api/orgs/:orgId/billing/mandate`
- `POST /api/orgs/:orgId/saas-subscription/upgrade`
- `POST /api/orgs/:orgId/saas-subscription/cancel`
- `GET /api/me/invoices`
- `GET /api/me/invoices/:id/pdf`
- `GET /api/platform/payments`
- `POST /api/platform/payments/:paymentId/refund`

## Invoice Backfill

Use `scripts/backfill-invoices.ts` for payments that predate invoice generation.

Dry run:

```bash
pnpm exec tsx scripts/backfill-invoices.ts -- --env-file=.env --days=90 --limit=500
```

Apply:

```bash
pnpm exec tsx scripts/backfill-invoices.ts -- --env-file=.env.production.local --days=90 --limit=500 --apply
```

## Crons

- `/api/cron/refund-reconcile`: every 10 minutes.
- `/api/cron/renewal-reminders`: daily.
- `/api/cron/trainer-payouts-draft`: first day of month.

## Production Cautions

- Razorpay live payment/refund certification requires explicit approval.
- SaaS pricing defaults exist in code, but live business pricing still needs owner confirmation before launch.
- SaaS plan limits are enforced in backend write paths; platform overrides should be tested before changing live commercial packaging.
- SaaS invoice legal address still needs finalized registered address.
- Payment fulfillment must stay idempotent: duplicate webhooks or repeated mock completion should not create duplicate subscriptions, redemptions, rewards, invoices, or notifications.
