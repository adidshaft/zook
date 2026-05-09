# Mobile Private Pilot QA

Last updated: 24 April 2026

## Build Matrix

- Local iOS simulator:
  - run `pnpm dev:web`
  - run `pnpm --filter @zook/mobile ios`
  - local defaults are `http://127.0.0.1:3000/api` and `http://localhost:3000`
- Local Android emulator:
  - run `pnpm dev:web`
  - export `MOBILE_API_BASE_URL=http://10.0.2.2:3000/api`
  - export `EXPO_PUBLIC_WEB_URL=http://10.0.2.2:3000`
  - run `pnpm --filter @zook/mobile android`
- Local physical device:
  - run `pnpm dev:web`
  - export `MOBILE_API_BASE_URL=http://<LAN-IP>:3000/api`
  - export `EXPO_PUBLIC_WEB_URL=http://<LAN-IP>:3000`
  - run `pnpm --filter @zook/mobile start`
  - open the Expo or development-client build on the device
- Preview device build:
  - `cd apps/mobile`
  - `npx eas-cli@latest build --profile preview -p ios`
  - `npx eas-cli@latest build --profile preview -p android`
  - preview defaults to `https://staging.zookfit.in/api`
- Production candidate:
  - `cd apps/mobile`
  - `npx eas-cli@latest build --profile production -p ios`
  - `npx eas-cli@latest build --profile production -p android`
  - production defaults to `https://zookfit.in/api`

## Login

- Local OTP is `000000`.
- Local seeded accounts:
  - `platform@zook.local`
  - `pilot-owner.test`
  - `admin@zook.local`
  - `reception@zook.local`
  - `trainer@zook.local`
  - `member@zook.local`
  - `minor@zook.local`
- Preview and production should use pilot-issued accounts and real OTP delivery. Do not expect the fixed dev code outside local.

## Push Device Setup

- Native push validation should happen on a physical iPhone or Android device.
- Expo Go is not the target build for pilot push validation. Use an EAS development client or preview build.
- Confirm `EXPO_PROJECT_ID` is present before testing push registration on local or development builds.
- Open `Profile` and verify:
  - push sync status
  - OS permission state
  - build type
  - project ID readiness
  - registered device list

## Deep Links

- Scheme: `zook://`
- Smoke routes to verify:
  - `zook://login`
  - `zook://find-gyms`
  - `zook://g/<gym-username>`
  - `zook://join/<gym-username>?ref=<referral-code>`
  - `zook://r/<referral-code>`
  - `zook://plan/<assignment-id>`
  - `zook://order/<order-id>`
  - `zook://membership`
  - `zook://notifications/<notification-id>`
  - `zook://scan`
- iOS simulator example:

```bash
cd apps/mobile
npx uri-scheme open "zook://join/<gym-username>?ref=<referral-code>" --ios
```

- Android emulator example:

```bash
cd apps/mobile
npx uri-scheme open "zook://notifications/<notification-id>" --android
```

- If you open a protected route while signed out, confirm the app lands on login first and then returns to the requested route after OTP verification.

## Member And Checkout Flow

1. Sign in as `member@zook.local` locally or with a pilot member account on preview.
2. Open `Find Gyms` and confirm public gyms load.
3. Open a gym profile from the list or via `zook://gym/<username>?ref=<code>`.
4. Verify join-mode badges, visible plans, and referral messaging.
5. Start membership checkout and confirm the app opens the hosted web checkout.
6. Complete the mock checkout on local or the configured hosted checkout in preview.
7. Return to the app manually and confirm membership state refreshes.
8. Repeat the same handoff from `Shop` and confirm the latest pickup code or order state updates.

## QR Flow

1. Sign in on web as `pilot-owner.test`.
2. Open `/dashboard/attendance/qr-display`.
3. On mobile, open `Scan`.
4. On simulator or emulator, paste the QR token manually.
5. On device, verify camera scan and manual paste both work.
6. Confirm approved, pending, and rejected states render without crashing the screen.

## Push And Notifications

1. Sign in as `pilot-owner.test` on web and send a notification, or use the trainer action below to create one.
2. On mobile, open `Profile` and enable push if the device build supports it.
3. Confirm permission prompts, Expo token registration, and backend device registration all complete without exposing provider secrets.
4. Open `Notifications`.
5. Confirm the new notification appears and can be marked read.
6. Tap a push banner or notification card and verify routing:
   - plan assigned -> `Plans`
   - shop pickup -> `Shop`
   - membership expiring -> `Membership`
   - attendance result -> `Attendance`
   - generic alert -> `Notifications`
7. Toggle transactional, operational, promotional, and goal/reminder settings in `Profile`, then confirm the server-side preference state refreshes.

## Receptionist Flow

1. Sign in as `reception@zook.local`.
2. Open the reception dashboard.
3. Verify pending approvals, flagged scans, and expiring memberships load.
4. Approve one attendance record and reject another when test data is available.
5. Confirm queue metrics refresh after each action.
6. Confirm operational shortcut cards remain visible even when the queue is empty.

## Trainer Flow

1. Sign in as `trainer@zook.local`.
2. Open the trainer dashboard and select an assigned client.
3. Generate an AI draft workout plan.
4. Assign the latest draft to the selected member.
5. Record the PT package flow.
6. Send the assigned-client notification.
7. Open `Notifications` as the member account and confirm the message appears in-app.

## Minor Flow

1. Sign in as `minor@zook.local`.
2. Open `Profile` and confirm guardian state is visible.
3. Verify guardian-pending messaging is preserved.
4. Attempt personalized or purchase-adjacent flows and confirm minor protections still gate access where expected.

## Known Limitations

- Native push still depends on the selected backend provider and a physical device build. The in-app inbox remains the fallback verification path.
- Hosted checkout opens the web flow and does not return to the app automatically.
- Preview and production builds both use `com.zook.app`, so installing one will replace the other on the same device.
- Local device and Android emulator testing require explicit API and web URL overrides; the localhost defaults are only safe for the iOS simulator.
- iOS simulators and Android emulators are useful for route and UI checks, but they should not be treated as the final push-validation environment.
