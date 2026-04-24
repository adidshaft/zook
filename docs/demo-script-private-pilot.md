# Private Pilot Demo Script

Last updated: 24 April 2026

## Setup

```bash
cp .env.example .env
pnpm db:generate
pnpm db:push
pnpm seed:pilot
pnpm dev:web
pnpm dev:mobile
```

Local OTP: `000000`

## Suggested 20-Minute Route

### 1. Owner Opening

- sign in as `owner@zook.local`
- open `/dashboard`
- show provider diagnostics and operational cards
- show a membership plan, coupon, and report surface

### 2. Member Journey

- sign in as `member@zook.local`
- open `Find Gyms`
- join `Iron House Fitness`
- start membership checkout
- complete mock checkout and confirm active membership

### 3. Shop Flow

- place a small order
- complete mock payment
- show pickup-ready state and pickup code

### 4. Reception And Trainer

- sign in as `reception@zook.local`
- review attendance queue or shop fulfillment
- sign in as `trainer@zook.local`
- generate an AI draft and assign a plan

### 5. Privacy And Minor

- sign in as `minor@zook.local`
- show guardian pending state
- request guardian consent and verify the guardian OTP locally
- show data export and deletion request surfaces

### 6. Platform Admin

- sign in as `platform@zook.local`
- open `/platform`
- review provider readiness and org controls

## Honest Limitations To Mention

- Razorpay and Expo push are pilot-ready backend integrations, not fully polished end-user mobile flows yet
- DB-gated acceptance coverage still depends on a configured local or staging database
- hosted checkout handoff is deliberately conservative and backend-verified
