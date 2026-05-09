# EAS Builds

Last updated: 3 May 2026

## Profiles

- `development`
  - internal development-client build
  - defaults to `EXPO_PUBLIC_ENV_PROFILE=local`
  - use for physical-device testing against a local LAN API or an overridden staging endpoint
- `preview`
  - internal distribution build for staging pilot validation
  - defaults to `EXPO_PUBLIC_ENV_PROFILE=staging`
  - expected API/web targets resolve to `https://staging.zookfit.in`
- `production`
  - production candidate build
  - defaults to `EXPO_PUBLIC_ENV_PROFILE=production`
  - expected API/web targets resolve to `https://zookfit.in`

`apps/mobile/eas.json` is the source of truth for these profiles.

## Build Commands

From `apps/mobile`:

```bash
APP_ENV=local API_MODE=backend EXPO_PUBLIC_API_MODE=backend pnpm exec eas build --profile development -p ios
APP_ENV=local API_MODE=backend EXPO_PUBLIC_API_MODE=backend pnpm exec eas build --profile development -p android
APP_ENV=staging API_MODE=backend EXPO_PUBLIC_API_MODE=backend pnpm exec eas build --profile preview -p ios
APP_ENV=staging API_MODE=backend EXPO_PUBLIC_API_MODE=backend pnpm exec eas build --profile preview -p android
APP_ENV=production API_MODE=backend EXPO_PUBLIC_API_MODE=backend pnpm exec eas build --profile production -p ios
APP_ENV=production API_MODE=backend EXPO_PUBLIC_API_MODE=backend pnpm exec eas build --profile production -p android
```

Before a production build, from the repo root run:

```bash
APP_ENV=production API_MODE=backend pnpm release:preflight
APP_ENV=production API_MODE=backend EXPO_PUBLIC_API_MODE=backend pnpm --filter @zook/mobile exec expo config --type public
```

The Expo config must show backend mode and must not show `offlineDemo=true`.

## Environment Notes

- The mobile app reads `EXPO_PUBLIC_ENV_PROFILE`, `EXPO_PUBLIC_API_BASE_URL`, and `EXPO_PUBLIC_WEB_URL`.
- `APP_ENV` and `API_MODE` are authoritative for release builds; production and preview builds must use backend mode.
- Physical devices must never rely on `localhost`; use a LAN URL for local testing or the staging/production hostnames.
- If `EXPO_PUBLIC_API_BASE_URL` is omitted, the app falls back to profile defaults from `apps/mobile/app.config.ts`.
- Expo push registration also needs `EXPO_PROJECT_ID` for local and development builds.
- Do not put provider secrets such as `OPENAI_API_KEY`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `S3_SECRET_ACCESS_KEY`, `UPSTASH_REDIS_REST_TOKEN`, or SMTP credentials into Expo public env vars.

## iPhone Install And QA

1. Build the iOS `preview` or `production` profile.
2. Install through TestFlight, App Store Connect internal testing, or an EAS internal distribution link.
3. Confirm the build launches without Metro.
4. Confirm `DEMO MODE` is absent.
5. Sign in against the selected backend URL and restart the app to verify SecureStore session restore.
6. Run camera QR, manual token fallback, notification permission denial, inbox mark-read, checkout handoff, and logout checks.
7. Register a real device token and tap a transactional notification only when validating push on a physical device.

No iPhone release build was created or installed during the 2026-05-03 hardening pass.

## Pilot Guidance

- Use `development` for QR, push, and deep-link testing on a physical phone before staging rollout.
- Use `preview` for the private-pilot test cycle shared with gym operators.
- Treat Expo Go as a convenience shell only; pilot push validation should happen in a development client or preview build.
- Treat physical push delivery and deep-link tap behavior as uncertified until a real-device run is logged in the QA checklist.
