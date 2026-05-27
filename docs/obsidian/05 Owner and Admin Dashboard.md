# Owner and Admin Dashboard

The web dashboard is the main management surface for owners and admins.

The dashboard shell is designed to stay stable while operators move between sections. Section data is cached client-side with React Query, likely section resources are prefetched from sidebar hover/focus, and uncached route changes show a small top progress indicator instead of a blank/hung workspace.

The owner mobile app now mirrors the production-critical owner paths: it renders the same backend chart payloads, prefetches owner workspace data, surfaces billing setup requirements, opens SaaS mandate/upgrade checkout, and routes checkout returns back to `/owner/billing`.

## Dashboard Routes

| Route | Purpose |
| --- | --- |
| `/dashboard` | Command board and summary |
| `/dashboard/members` | Member search and management |
| `/dashboard/members/join-requests` | Join approval queue |
| `/dashboard/attendance` | Attendance operations |
| `/dashboard/attendance/qr-display` | Entry QR display |
| `/dashboard/payments` | Payments list and receipts |
| `/dashboard/payments/refunds` | Refund workflow |
| `/dashboard/billing` | Billing profile and SaaS subscription |
| `/dashboard/membership-plans` | Membership plan management |
| `/dashboard/plans` | Membership plan hub |
| `/dashboard/plans/coupons` | Coupons |
| `/dashboard/plans/offers` | Public offers |
| `/dashboard/plans/referrals` | Referral tools |
| `/dashboard/staff` | Staff invitations and roles |
| `/dashboard/branches` | Branch setup |
| `/dashboard/shop` | Products and inventory |
| `/dashboard/shop/orders` | Shop orders |
| `/dashboard/notifications` | Notification composer |
| `/dashboard/notifications/templates` | Templates |
| `/dashboard/notifications/history` | Delivery history |
| `/dashboard/reports` | Reports and exports |
| `/dashboard/payouts` | Trainer payouts |
| `/dashboard/public-profile` | Public gym profile |
| `/dashboard/audit` | Audit log |
| `/dashboard/ai` | AI usage/settings |
| `/dashboard/settings` | Core settings |

## Owner/Admin Workflows

- Complete trial onboarding and billing mandate setup.
- Create and edit membership plans.
- Approve join requests.
- Manage members.
- Record and inspect payments.
- Refund eligible payments.
- Generate receipts and invoices.
- Display attendance QR and review attendance.
- Invite staff and manage roles.
- Configure branches and public profile.
- Send notifications and maintain templates.
- Export operational reports.
- Configure billing profile and SaaS upgrade/cancel flows.
- Review audit trail.

## Billing Requirements

New gyms receive trial access, but production write access requires billing setup. After `/start-gym`, owners are driven toward `/dashboard/billing`. Until a SaaS mandate exists or has been authenticated, owner/admin write routes stay setup/read-only except billing, profile, and setup routes.

On mobile, the owner app exposes `/owner/billing` for the same lifecycle. Owner/admin API calls that hit SaaS setup/payment gating redirect to this billing screen instead of leaving the app in an unexplained forbidden state.

Billing profile should be complete before generating GST-ready invoices. SaaS subscription controls currently support upgrade and cancel flows through the existing billing endpoints.

Owner billing now shows the current SaaS plan packaging and live usage: members, branches, staff, trainers, products, monthly notification recipients, AI text, AI images, reports tier, referral tier, support level, and onboarding level.

Key billing endpoints:

- `GET /api/orgs/:orgId/billing/subscription`
- `POST /api/orgs/:orgId/billing/mandate`
- `POST /api/orgs/:orgId/saas-subscription/upgrade`
- `POST /api/orgs/:orgId/saas-subscription/cancel`

## SaaS Plan Packaging

| Plan | Monthly | Yearly | Members | Branches | Staff | Trainers | Products | Messages/month | AI text/month | AI images/month |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Trial / Free | ₹0 | ₹0 | 25 | 1 | 2 | 1 | 20 | 100 | 0 | 0 |
| Starter | ₹1,499 | ₹14,990 | 100 | 1 | 5 | 2 | 50 | 1,000 | 0 | 0 |
| Growth | ₹3,999 | ₹39,990 | 500 | 3 | 20 | 10 | 500 | 10,000 | 500 | 50 |
| Pro | ₹7,999 | ₹79,990 | Unlimited | Unlimited | Unlimited | Unlimited | Unlimited | 50,000 | 3,000 | 300 |

Starter is intentionally a real operating plan, not a crippled demo: members, attendance, plans, payments, billing, reception, trainer basics, referrals, and shop basics stay available. Growth adds scale, multi-branch, higher messaging volume, AI quota, advanced referrals/reports, and priority support. Pro removes practical scale limits and adds premium support, custom reporting/referrals posture, API access flag, and white-glove onboarding posture.

## Dashboard Charts

Overview and reports now use backend read-model chart payloads:

- 7-day revenue.
- 30-day revenue.
- 7-day attendance.
- 30-day member growth.
- Active plan mix.
- Period deltas derived from the same series.

Empty gyms show zeroed real series rather than placeholder/synthetic chart generators.

The owner mobile home and revenue routes render these same chart arrays natively, including revenue, attendance, member growth, and plan mix.

## Navigation Performance

The dashboard avoids the old full-empty reload feeling by:

- Keeping cached operational resources by stable query key.
- Preserving previous data while a section refreshes.
- Using `staleTime` and `gcTime` to avoid repeated refetch churn.
- Prefetching common section resources for members, payments, attendance, plans, shop, reports-adjacent views, billing-adjacent flows, staff, branches, referrals, AI, and audit.
- Showing `/dashboard/loading.tsx` as a slim route transition indicator when Next.js has to fetch uncached server data.

## Toasts

Top-right Sonner toasts are styled with theme tokens for surface, text, and border. They should remain readable in both light and dark modes.

Mobile toast banners also use theme palette tokens for background, title, body, border, and icon treatment so success/error/warning/info messages remain readable in light and dark modes.
