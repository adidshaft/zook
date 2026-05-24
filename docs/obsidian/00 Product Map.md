# Product Map

Zook is an India-first gym operating system for small and medium gyms. It combines a public acquisition funnel, mobile role apps, a web dashboard, desk workflows, trainer tools, payments, attendance, referrals, notifications, privacy controls, and hidden platform operations.

## Primary Surfaces

| Surface | Path / App Area | Audience | Purpose |
| --- | --- | --- | --- |
| Public website | `/`, `/gyms`, `/g/[username]`, `/join/[username]`, `/r/[code]` | Prospects and members | Gym discovery, public gym profiles, referrals, joining |
| Member mobile app | `apps/mobile/app/(member)` | Members | Membership, attendance, plans, diet, shop, notifications, profile |
| Owner mobile app | `apps/mobile/app/owner` | Gym owners | Operational overview, approvals, members, revenue, stock |
| Reception mobile app | `apps/mobile/app/reception` | Front desk | Attendance, member lookup, payments, pickup/orders |
| Trainer mobile app | `apps/mobile/app/trainer` | Trainers | Clients, plans, sessions, payouts |
| Web dashboard | `/dashboard` | Owners/admins/staff | Gym operations, reports, billing, settings |
| Desk web app | `/desk` | Reception | Focused desk check-in, payments, orders, QR |
| Platform console | `/platform` | Zook platform admins | Cross-tenant support, provider diagnostics, moderation, broadcasts |

## Core Modules

- [[03 Authentication and Accounts]]
- [[09 Memberships Payments Invoices]]
- [[10 Attendance]]
- [[11 Plans Training Diet]]
- [[12 Notifications]]
- [[13 Shop]]
- [[14 Privacy Security Compliance]]
- [[15 AI Assistant]]
- [[16 Providers Deployment Operations]]

## Data Model Concepts

- `Organization`: a gym tenant.
- `Branch`: a gym location. The system is branch-ready even when a gym has one active branch.
- `User`: a person who may belong to multiple organizations and roles.
- `OrganizationUser`: membership of a user inside an organization.
- `OrganizationRoleAssignment`: role assignment such as owner, admin, reception, trainer, member.
- `Payment`, `Invoice`, `MembershipSubscription`: money and billing records.
- `AttendanceRecord`: member entry attempt or approved visit.
- `Plan`, `DietPlan`, `TrainerAssignment`: coaching and trainer workflows.
- `Notification`, `PushDevice`, `PushDelivery`: in-app and push messaging.

## Important Constraints

- Platform admin is not a gym role; it is controlled by `User.isPlatformAdmin`.
- Payment completion must come from backend confirmation or provider webhook, not client redirects.
- Production launch still has manual gates listed in [[17 Known Manual Gates]].
- Supabase scheduled backups and PITR were intentionally skipped while they require a paid upgrade.

