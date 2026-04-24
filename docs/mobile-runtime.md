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

The mobile app resolves its backend from:

1. `MOBILE_API_BASE_URL`
2. `EXPO_PUBLIC_API_BASE_URL`
3. Expo config fallback: `http://127.0.0.1:3000/api`

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

## Camera / QR Testing

- The mobile scan screen supports:
  - camera QR scan
  - manual token paste for simulator and development fallback
- Generate a live token from `/dashboard/attendance/qr-display`.
- Pasted tokens are the recommended path when camera access is unavailable.

## Known Limitations

- Expo Go remains the safest default. Native-only push flows are still mocked.
- Physical iOS dev builds may require provisioning cleanup if push entitlements are reintroduced.
- Camera-based QR testing is best on a simulator/device with real camera support; pasted tokens are kept specifically to keep local QA unblocked.
