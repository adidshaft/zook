# Roles and Permissions

Zook uses organization-scoped roles plus explicit permissions. A user can belong to multiple gyms and can hold multiple roles in the same gym.

## Product Roles

| Role | Main Surface | Responsibilities |
| --- | --- | --- |
| Owner | Mobile owner app and web dashboard | Full gym control, billing, staff, settings, reports, memberships, refunds |
| Admin | Web dashboard and operations surfaces | Day-to-day management except ownership/platform-only controls |
| Reception | Reception mobile app and `/desk` | Member lookup, attendance, manual payments, order pickup, approvals |
| Trainer | Trainer mobile app and trainer web diet surface | Assigned clients, workouts, diet plans, PT sessions, payouts |
| Member | Member mobile app and member web pages | Membership, attendance, plans, diet, shop, notifications, privacy |
| Platform admin | `/platform` | Zook operator controls across tenants |

## Permission Areas

- Members: view/manage members and join requests.
- Attendance: display QR, approve/reject pending records, create manual attendance.
- Payments: view payments, record offline payments, refund payments.
- Plans: manage membership plans, coupons, offers, referrals.
- Staff: invite and update staff.
- Shop: manage products, stock, and order fulfillment.
- Notifications: create messages, manage templates, view history.
- Reports and audit: export reports and inspect audit trail.
- Billing: billing profile, SaaS subscription, SaaS billing mandate, and member autopay mandate.
- Trainer management: assignments, PT plans, payouts.
- AI: assistant usage and AI settings.

## Platform Admin Controls

Platform admins can access:

- Provider diagnostics and readiness.
- Cross-tenant user search and session revocation.
- Audited support impersonation when the feature flag is enabled.
- Cross-tenant payment search and refund submission.
- Webhook replay.
- Global audit log.
- Feature flags.
- Broadcasts.
- Moderation queue.
- Organization support actions.
- SaaS pricing, trial, credit, tier, platform note, and platform referral policy controls.

## Risk Rules

- High-risk actions are audited.
- Impersonation is feature-flagged and CRITICAL-risk audited.
- Refunds and billing changes are money-adjacent and should include a clear reason.
- Owner/admin tenant writes can be gated until trial plus SaaS mandate setup is complete.
- SaaS plan limits are separate from role permissions. A user may have permission to create a branch, invite staff, add products, send notifications, or use AI, but the backend can still block the write when the organization has reached its plan entitlement.
- Platform admins cannot use tenant routes as a shortcut for tenant actions.
