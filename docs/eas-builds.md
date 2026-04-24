# EAS Builds

Last updated: 24 April 2026

## Profiles

- `development`
  - internal development-client build
  - defaults to `EXPO_PUBLIC_ENV_PROFILE=local`
  - use for physical-device testing against a local LAN API or an overridden staging endpoint
- `preview`
  - internal distribution build for staging pilot validation
  - defaults to `EXPO_PUBLIC_ENV_PROFILE=staging`
  - expected API/web targets resolve to `https://staging.zook.app`
- `production`
  - production candidate build
  - defaults to `EXPO_PUBLIC_ENV_PROFILE=production`
  - expected API/web targets resolve to `https://zook.app`

`apps/mobile/eas.json` is the source of truth for these profiles.

## Build Commands

From `apps/mobile`:

```bash
npx eas-cli@latest build --profile development -p ios
npx eas-cli@latest build --profile development -p android
npx eas-cli@latest build --profile preview -p ios
npx eas-cli@latest build --profile preview -p android
npx eas-cli@latest build --profile production -p ios
npx eas-cli@latest build --profile production -p android
```

## Environment Notes

- The mobile app reads `EXPO_PUBLIC_ENV_PROFILE`, `EXPO_PUBLIC_API_BASE_URL`, and `EXPO_PUBLIC_WEB_URL`.
- Physical devices must never rely on `localhost`; use a LAN URL for local testing or the staging/production hostnames.
- If `EXPO_PUBLIC_API_BASE_URL` is omitted, the app falls back to profile defaults from `apps/mobile/app.config.ts`.
- Expo push registration also needs `EXPO_PROJECT_ID` for local and development builds.

## Pilot Guidance

- Use `development` for QR, push, and deep-link testing on a physical phone before staging rollout.
- Use `preview` for the private-pilot test cycle shared with gym operators.
- Treat Expo Go as a convenience shell only; pilot push validation should happen in a development client or preview build.
