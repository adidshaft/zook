# Local Development

## Prerequisites

- Node.js 22+
- pnpm 10+
- Docker Desktop or another PostgreSQL 16 instance
- Expo Go or a simulator/emulator for mobile

## Setup

```bash
pnpm install
cp .env.example .env
docker compose up -d
pnpm db:generate
pnpm db:push
pnpm db:seed
```

## Run The Apps

```bash
pnpm dev:web
pnpm dev:mobile
```

- Web defaults to [http://localhost:3000](http://localhost:3000)
- Mobile reads `MOBILE_API_BASE_URL` / `EXPO_PUBLIC_API_BASE_URL`
- For simulator/device specifics, see [docs/mobile-runtime.md](./mobile-runtime.md)
- If you change `.env`, restart the web dev server so `DATABASE_URL`, provider envs, and session secrets are picked up.

## Seed Logins

Development OTP: `000000`

- `platform@zook.local`
- `owner@zook.local`
- `admin@zook.local`
- `reception@zook.local`
- `trainer@zook.local`
- `member@zook.local`
- `minor@zook.local`

## Common Local Flows

### Membership checkout

1. Open a gym from `/find-gyms` on mobile or `/g/{username}` on web.
2. Create a membership checkout.
3. Finish the mock hosted payment at `/checkout/mock/{sessionId}`.
4. Subscription activation happens only after the server marks the session successful.

### QR attendance

1. Open `/dashboard/attendance/qr-display`.
2. Copy the live QR token.
3. On mobile, open `Scan`.
4. Scan it with the camera or paste it into the manual token field.
5. The backend validates the signed token and returns approved / pending / rejected status.

### Shop order

1. Open `/shop` on mobile.
2. Choose a product.
3. Finish mock checkout.
4. The order moves to ready-for-pickup and inventory is reduced only after success.

## Commands

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:services
pnpm test:web
```

Database-backed Playwright flows:

```bash
RUN_DB_WEB_TESTS=1 pnpm test:web
```

If the OTP form does not advance during DB-gated tests, confirm the Next.js process was started with `DATABASE_URL` in its environment.
