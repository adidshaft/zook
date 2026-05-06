# Owner Handbook

![Owner setup](./handbooks/screenshots/owner-start-gym.png)

## What Owners Can Do

- Create a gym, set branch details, define public profile copy, and publish a joinable gym page.
- Open Today at the branch: check-ins, collected amount, renewals due, inactive members, and live floor state.
- Resolve the Needs you queue: expiring plans, failed payments, approval requests, trials ending, and high-value inactive members.
- Manage members, subscriptions, attendance, payments, staff, trainers, products, reports, notifications, AI settings, and audit logs.
- Build and publish membership plans grouped by duration, with one clear recommended plan on public pages.
- Show QR codes for desk or entrance check-in.
- Record offline payments with proof and audit context.
- Export reports for attendance, revenue, memberships, shop, and staff operations.
- Invite staff and assign owner, admin, receptionist, and trainer roles.
- Review privacy/audit activity for sensitive operational actions.

## Web Entry Points

- `/start-gym` creates the gym.
- `/dashboard` opens Today at the branch.
- `/dashboard/members` manages members and subscriptions.
- `/dashboard/membership-plans` manages public and private plans.
- `/dashboard/attendance` and `/dashboard/attendance/qr-display` manage attendance.
- `/dashboard/payments` handles payment review and offline records.
- `/dashboard/shop/products` manages the shop.
- `/dashboard/reports`, `/dashboard/staff`, `/dashboard/notifications`, `/dashboard/ai`, `/dashboard/public-profile`, and `/dashboard/audit` cover advanced operations.

## Mobile Entry Points

- `/owner` opens the owner command center.
- `/owner?view=approvals` focuses approvals.
- `/owner?view=revenue` focuses collections.
- `/owner?view=stock` focuses shop stock.
- `/owner?view=members` opens members.
- `/owner/member/[id]` opens a member detail.

## Smooth UX Rules

- The owner home is not a generic dashboard. It answers: is anything on fire today?
- Reports and deep management views are destinations, not competing cards on the home screen.
- Dense tables are good on web when they keep row actions clear.
- Revenue, attendance, and setup state should be visible without modal hunting.
