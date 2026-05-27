# Member App

The member app is the primary member experience on mobile, with supporting web views for public profile and invoices.

## Main Mobile Routes

| Route | Purpose |
| --- | --- |
| `/(member)/index` | Member home |
| `/(member)/scan` | Attendance QR scan |
| `/(member)/plan` | Assigned training plan |
| `/(member)/diet` | Active diet plan |
| `/(member)/shop` | Shop entry |
| `/(member)/you` | Profile/account hub |
| `/membership/*` | Membership purchase/history/checkout |
| `/plans`, `/plans/[assignmentId]` | Assigned plans |
| `/tracking`, `/tracking-entry`, `/tracking-history` | Fitness tracking |
| `/notifications/*` | Notification inbox and details |
| `/shop/*` | Shop browsing, cart, checkout, pickup |
| `/settings/*` | Account, language, notifications, privacy, support |

## Member Capabilities

- View active membership and renewal state.
- Buy or renew membership through backend checkout.
- Scan gym entry QR.
- View attendance history.
- View assigned workout plan.
- Complete workout progress.
- View active diet plan and log meals.
- Browse shop and place orders.
- Receive in-app notifications and push notifications when configured.
- Manage privacy requests and account settings.
- Download receipts/invoices.

## Diet and Tracking

Members can see the latest published diet plan from their trainer, log meals, track body progress, habits, goals, badges, and workout completion.

## Payment Rule

The member app never activates purchases from redirect success alone. Membership and shop state change only after backend/provider confirmation.

Checkout return URLs now include a mobile target so the app returns members to the right surface after provider checkout:

- Membership checkout returns to the membership surface.
- Shop checkout returns to the shop surface.
- Referral short links resolve through `/r/[code]` and prefer the gym public join/profile route when the backend can identify the organization.
