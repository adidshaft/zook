# Memberships, Payments, and Invoices

This module controls membership purchases, renewals, subscription changes, manual payments, refunds, receipts, invoices, SaaS billing, and payout-related money movement.

## Member Payment Flows

- Create checkout through backend.
- Complete provider/mock checkout.
- Backend confirms payment.
- Membership, shop order, or PT state changes.
- Receipt/invoice becomes available.

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

## Key APIs

- `POST /api/payments/checkout`
- `GET /api/payments/session/:id`
- `POST /api/payments/webhooks/razorpay`
- `GET /api/orgs/:orgId/payments`
- `POST /api/orgs/:orgId/payments/:paymentId/refund`
- `GET/POST /api/orgs/:orgId/payments/:paymentId/receipt`
- `GET/POST /api/orgs/:orgId/payments/:paymentId/invoice`
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
- SaaS pricing still needs owner confirmation.
- SaaS invoice legal address still needs finalized registered address.

