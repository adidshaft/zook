# Local Development

## Prerequisites

- Node.js 22+
- pnpm 10+
- Docker Desktop or a local PostgreSQL 16 database
- Expo Go for mobile testing

## Setup

```bash
pnpm install
cp .env.example .env
docker compose up -d
pnpm db:generate
pnpm db:push
pnpm db:seed
pnpm dev:web
pnpm dev:mobile
```

Web runs at [http://localhost:3000](http://localhost:3000). Expo prints a QR code for iOS/Android via Expo Go.

## Seed Logins

Use development OTP `000000`.

- `platform@zook.local`
- `owner@zook.local`
- `admin@zook.local`
- `reception@zook.local`
- `trainer@zook.local`
- `member@zook.local`
- `minor@zook.local`

## Mock Checkout

1. Start from a membership or shop checkout.
2. The API creates a `PaymentSession` and returns `/checkout/mock/{sessionId}`.
3. Choose success, failure, or pending.
4. The server updates payment state and activates membership or confirms stock/order only after success.

## QR Attendance

1. Open `/dashboard/attendance/qr-display`.
2. A rolling signed token refreshes every few minutes.
3. In mobile, open `Scan`.
4. Scan or paste the token.
5. Attendance is auto-approved, exception-approved, or queued depending on org settings.

## Role Switching

Seed users are role-specific. The dashboard role selector can also switch active organization role contexts when a user has multiple roles.

## Enabling Future Real Providers

Set provider env vars in `.env`:

- `AI_PROVIDER=openai` and `OPENAI_API_KEY=...`
- `MAP_PROVIDER=google` and `GOOGLE_MAPS_API_KEY=...`
- `PAYMENT_PROVIDER=razorpay|cashfree|phonepe|payu` with provider credentials
- `STORAGE_PROVIDER=s3` with S3/R2-compatible credentials

Mocks remain the default and are required to keep local development free.
