# Receptionist Handbook

## What Receptionists Can Do

- Run a live desk flow for check-ins, walk-ins, payments, renewals, shop sales, and day passes.
- Search members by name, phone, or code from a persistent top search.
- Approve, hold, or deny check-ins with large desk-friendly actions.
- Take payments and renew memberships without leaving the desk flow.
- Add new visitors and start walk-in trials.
- Print or display day pass and desk QR flows.
- See today's check-ins, collected amount, and pending items at a glance.
- Review members, payments, and orders from role-specific tabs.

## Mobile Entry Points

- `/reception` opens the live desk.
- `/reception?view=members` opens member search and status.
- `/reception?view=payments` opens payment actions.
- `/reception?view=orders` opens shop/order handoff.

## Web Entry Points

- `/dashboard/attendance` manages attendance records.
- `/dashboard/attendance/qr-display` shows the desk QR.
- `/dashboard/payments` reviews payments.
- `/dashboard/shop/products` supports shop handoff when permitted.

## Feature Walkthrough

- Keep search active at the top of the desk.
- When a member is at the desk, the live check-in card becomes the focus.
- Use quick actions for payment, renewal, shop sale, walk-in trial, and day pass.
- Use today's totals as ambient context, not a competing dashboard.

## Smooth UX Rules

- Reception is a tablet task UI, not an owner dashboard.
- One active member at the desk should dominate the screen.
- No accordions for critical alternatives: manual code and desk fallback must stay visible.
- Sync state belongs in chrome so transaction confidence is always visible.
