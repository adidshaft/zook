# Reception Desk

Reception workflows are split across the mobile reception app and the focused web desk app.

## Web Desk Routes

| Route | Purpose |
| --- | --- |
| `/desk` | Desk overview |
| `/desk/members` | Member lookup |
| `/desk/payments` | Payment list |
| `/desk/payments/new` | Record manual payment |
| `/desk/orders` | Shop pickup/order handling |
| `/desk/qr` | Attendance QR support |

## Mobile Reception Routes

| Route | Purpose |
| --- | --- |
| `/reception` | Reception home |
| `/reception/members` | Member search |
| `/reception/members/[id]` | Member detail |
| `/reception/payments` | Payments |
| `/reception/payments/new` | Record payment |
| `/reception/orders` | Orders and pickup |
| `/reception/verification/[recordId]` | Attendance verification |

## Core Reception Tasks

- Search members.
- Verify membership/attendance state.
- Approve or reject pending attendance.
- Record manual payments with context and reason.
- Verify shop pickup codes.
- Fulfill paid shop orders.
- Support members at the front desk.

## Audit Expectations

Manual attendance decisions, manual payment records, and order fulfillment create operational evidence and should include reason/context where the product asks for it.

