# Platform Operations

The platform console is hidden from normal gym roles and available to Zook platform admins.

## Routes

| Route | Purpose |
| --- | --- |
| `/platform/status` | Provider and platform readiness |
| `/platform/users` | User support console |
| `/platform/payments` | Cross-tenant payment search/refund |
| `/platform/broadcasts` | Platform broadcasts |
| `/platform/moderation` | Content moderation queue |
| `/platform/impersonations` | Impersonation history |
| `/platform/webhooks` | Payment webhook attempts/replay |
| `/platform/audit` | Global audit |
| `/platform/flags` | Feature flags |
| `/platform/gyms` | Organizations and support actions |
| `/platform/subscriptions` | Gym SaaS subscription overview |
| `/platform/assistant` | AI usage |
| `/platform/safety` | Abuse/safety flags |
| `/platform/incidents` | Incident checklist |

## User Support

Platform admins can:

- Search users by email, phone, or name.
- Revoke sessions.
- Start audited impersonation when `platform.impersonation` is enabled.
- Review impersonation history.

## Organization Support Actions

Available from platform gym accounts:

- Activate, suspend, cancel.
- Soft delete.
- Extend trial.
- Adjust credit.
- Change tier.
- Add platform subscription notes.
- Rename.
- Transfer ownership.
- Bulk import members.

Subscription rows expose tier, billing cycle, locked price, credit, mandate status, next charge, paid count, and platform note where available.

## Money Operations

Cross-tenant payments support search and platform refunds. All refund operations must include a reason and should be treated as money-sensitive.

Platform subscription and billing controls currently include:

- `GET/PATCH /api/platform/saas-pricing`
- `POST /api/platform/orgs/:orgId/trial/extend`
- `POST /api/platform/orgs/:orgId/credit`
- `PATCH /api/platform/orgs/:orgId/tier`
- `POST /api/platform/orgs/:orgId/subscription-note`
- `GET /api/platform/subscriptions`

Credit adjustments are stored on the SaaS subscription and should include an operator reason. Tier changes and trial extensions are audited platform actions. SaaS pricing settings can carry price overrides and entitlement overrides for members, branches, staff, trainers, products, notification recipients, and AI quota.

The mobile platform route now shows a read-only SaaS health view for platform admins: total gyms, paying/trial counts, referral count, recent gym subscription tiers, mandate status, next billing date, and paid count. Mutating actions such as pricing edits, trial extensions, credits, tier changes, notes, and referral policy changes remain in the web console.

Platform subscription rows expose live usage against plan limits where available, so operators can see whether a gym is close to member, branch, or team/package limits before changing tiers.

## Platform Referrals

Platform can store a global referral policy for gym-to-gym referral partnerships:

- `GET/PATCH /api/platform/referral-policy`
- New gym signup can carry `platformReferralCode`.
- Partnerships are tracked between referring and referred organizations.

The exact commercial reward settlement still needs business approval before live payout or invoice-credit automation.

## Broadcasts

Broadcasts can be drafted, published, expired, and deleted. Live fanout is throttled between 500-recipient chunks to reduce push-provider risk.

## Moderation

The moderation queue exposes content flags and lets platform admins approve or remove flagged content with a reason.

## Feature Flags

Feature flag changes are audited. `platform.impersonation` is CRITICAL-risk audited.
