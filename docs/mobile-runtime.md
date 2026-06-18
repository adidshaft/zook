# Mobile Runtime

## Expo Paths

Zook currently supports two practical mobile development paths:

1. **Expo Go**
   - fastest iteration path
   - works for auth, discovery, tracking, notifications, shop, and pasted QR testing
2. **iOS/Android simulator or device**
   - recommended for camera and runtime validation
   - still uses the same backend APIs and SecureStore session flow

## API Base URL

Mobile API mode is explicit:

- `EXPO_PUBLIC_API_MODE=backend` uses the backend API and is the default for local, staging, and production.
- `EXPO_PUBLIC_API_MODE=offline-demo` routes through local fixture handlers and is allowed only with `APP_ENV=local`.
- Legacy flags such as `EXPO_PUBLIC_OFFLINE_DEMO=true` still work locally, but new commands should use `API_MODE=offline-demo` / `EXPO_PUBLIC_API_MODE=offline-demo`.
- `APP_ENV` is authoritative when multiple profile env vars are present. Invalid `APP_ENV` or `API_MODE` values now produce a fatal configuration screen or build-time error instead of silently falling back to local/backend defaults.

The mobile app resolves its backend from:

1. `MOBILE_API_BASE_URL`
2. `EXPO_PUBLIC_API_BASE_URL`
3. Expo config fallback for the selected app env

Examples:

- iOS Simulator: `http://127.0.0.1:3000/api`
- Android Emulator: `http://10.0.2.2:3000/api`
- Physical device: `http://YOUR-LAN-IP:3000/api`

Web checkout handoff uses `NEXT_PUBLIC_WEB_URL`.

## Auth Runtime

- Web uses secure cookie sessions.
- Mobile stores the bearer session token in `expo-secure-store`.
- OTP verification calls the same backend auth routes as web.
- Use `000000` locally when `OTP_FIXED_CODE_DEV` is enabled.
- `000000` is blocked in production and requires `ALLOW_FIXED_OTP_IN_STAGING=true` in staging.

## Provider Runtime

Production builds should use backend mode and explicit provider selections:

- `PAYMENT_PROVIDER=razorpay` for provider-backed checkout, or `PAYMENT_PROVIDER=disabled` only when purchases are intentionally unavailable.
- `AI_PROVIDER=openai` for backend-only trainer planning, or `AI_PROVIDER=disabled` to show controlled unavailable states.
- `PUSH_PROVIDER=expo` for remote push, or `PUSH_PROVIDER=disabled` while relying on the in-app inbox.

`mock` providers are local/demo tools and should not be used for production builds.

Production mobile release builds must be preflighted from the repo root:

```bash
APP_ENV=production API_MODE=backend pnpm release:preflight
APP_ENV=production API_MODE=backend EXPO_PUBLIC_API_MODE=backend pnpm --filter @zook/mobile exec expo config --type public
```

The public config must resolve a non-local backend URL and `offlineDemo=false`. If backend URL or runtime config is missing, the app should show a fatal configuration state instead of silently loading test data.

AI provider settings are server-only. Do not expose `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_IMAGE_MODEL`, or `OPENAI_TIMEOUT_MS` through Expo public env vars. For pilot launch, `AI_FEATURES_ENABLED=false` keeps the assistant neutrally gated and trainers use manual plan creation, review, assignment, and sending.

Trainer plan publishing is intentionally human-reviewed:

- Trainers create launch plans manually for assigned clients in the active organization.
- Plan assignment should follow the explicit backend review step first.
- Members cannot generate trainer plan drafts or AI images.
- Live OpenAI behavior is not considered certified until tested with configured credentials and the feature flag in staging.

## Notifications And Push

- The in-app inbox is canonical. Push is a best-effort delivery layer on top of persisted notifications.
- Push registration requires a backend session and a selected provider. `PUSH_PROVIDER=disabled` keeps the inbox usable and returns controlled unavailable states for device registration.
- Device records are stored against the signed-in user so switching active org does not silently move the same device token away from another gym's notifications.
- Notification tap routing supports assigned plans, shop orders/pickup, attendance, membership/payment, join request status, trainer progress context, and generic inbox fallback.
- Scheduled notification dispatch still requires a backend worker/cron; scheduled recipients should not be treated as delivered inbox items before dispatch.

Physical push QA requires an EAS development, preview, or production build on a real iOS/Android device. Expo Go and simulators are acceptable for inbox/routing checks, but they do not certify production push.

## Native Artifacts

`apps/mobile/ios/`, generated screenshots, and icon-builder exports are ignored outputs. Regenerate native files with Expo prebuild or EAS instead of committing generated `Pods/`, build folders, screenshots, or exported app-icon variants.

## Camera / QR Testing

- The mobile scan screen supports:
  - camera QR scan
  - manual token paste for simulator and development fallback
- Generate a live token from `/dashboard/attendance/qr-display`.
- Pasted tokens are the recommended path when camera access is unavailable.

## Run Modes

Local backend mode:

```bash
APP_ENV=local API_MODE=backend EXPO_PUBLIC_API_MODE=backend pnpm dev:mobile
```

Explicit local offline demo:

```bash
APP_ENV=local API_MODE=offline-demo EXPO_PUBLIC_API_MODE=offline-demo pnpm dev:mobile
```

Production candidate config check:

```bash
APP_ENV=production API_MODE=backend EXPO_PUBLIC_API_MODE=backend pnpm --filter @zook/mobile exec expo config --type public
```

## Known Limitations

- Expo Go remains the safest default for general development, but it is not final proof for native push. Real push QA requires a physical iOS/Android build.
- Physical iOS dev builds may require provisioning cleanup if push entitlements are reintroduced.
- Camera-based QR testing is best on a simulator/device with real camera support; pasted tokens are kept specifically to keep local QA unblocked.
