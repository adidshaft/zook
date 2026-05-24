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
- Rename.
- Transfer ownership.
- Bulk import members.

## Money Operations

Cross-tenant payments support search and platform refunds. All refund operations must include a reason and should be treated as money-sensitive.

## Broadcasts

Broadcasts can be drafted, published, expired, and deleted. Live fanout is throttled between 500-recipient chunks to reduce push-provider risk.

## Moderation

The moderation queue exposes content flags and lets platform admins approve or remove flagged content with a reason.

## Feature Flags

Feature flag changes are audited. `platform.impersonation` is CRITICAL-risk audited.

