# Testing

## Unit Tests

Vitest covers service rules:

- Membership validity and visit consumption
- Coupon calculation
- Referral anti-self-referral
- Payment state machine
- Manual payment adjustment
- QR token validation
- Duplicate attendance protection
- Attendance approval mode
- RBAC and notification permission checks
- Promotional opt-out and minor restrictions
- AI scope and quota
- Shop stock/order state

Run:

```bash
pnpm test
```

## Web Acceptance Tests

Playwright covers the basic browser flows when dependencies are installed:

- Login with OTP
- Owner dashboard renders
- Create membership plan
- Mock checkout success
- QR display renders

Run:

```bash
pnpm test:web
```

## Manual Acceptance Checklist

- Owner creates an org, plan, coupon, referral, and staff invite.
- Member searches gyms, joins, pays through mock checkout, scans QR, and buys shop item.
- Receptionist approves check-ins, records cash payment, and fulfills pickup.
- Trainer records PT, drafts AI plan, publishes to assigned client, sends notification.
- Platform admin changes org status and views AI usage.
- Minor is blocked before guardian consent and uses safe AI after consent.
