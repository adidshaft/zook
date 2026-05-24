# Trainer Workspace

Trainer tools cover assigned clients, plans, diet plans, PT sessions, body progress, and payouts.

## Mobile Trainer Routes

| Route | Purpose |
| --- | --- |
| `/trainer` | Trainer home |
| `/trainer/clients` | Assigned clients |
| `/trainer/clients/[id]` | Client detail |
| `/trainer/clients/[id]/plan` | Workout and diet plan creation surface |
| `/trainer/clients/[id]/sessions` | PT sessions |
| `/trainer/plans` | Trainer plan list |
| `/trainer/payouts` | Payouts |

## Web Trainer Diet Route

| Route | Purpose |
| --- | --- |
| `/dashboard/trainers/[trainerId]/clients/[clientId]/diet` | Web surface for trainer diet plans |

## Trainer Capabilities

- View assigned clients.
- Record trainer notes.
- Create, review, publish, edit, and delete diet plans.
- Create and assign workout plans.
- Record body progress.
- Manage PT sessions.
- View payout state.
- Receive commission/clawback lines from PT subscriptions and refunds.

## Payouts

Payouts are drafted monthly by cron through `/api/cron/trainer-payouts-draft`. Owners can also view payouts, add adjustments, and mark payouts paid.

## Diet Plans

Diet plan APIs support:

- `GET /api/orgs/:orgId/trainers/:trainerId/clients/:clientId/diet-plans`
- `POST /api/orgs/:orgId/trainers/:trainerId/clients/:clientId/diet-plans`
- `PATCH /api/orgs/:orgId/trainers/:trainerId/clients/:clientId/diet-plans/:planId`
- `DELETE /api/orgs/:orgId/trainers/:trainerId/clients/:clientId/diet-plans/:planId`

