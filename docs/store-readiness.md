# Store Readiness

Last updated: 2026-06-13

This checklist covers the non-code work needed before App Store and Play Store submission.

Run the static release gate before building a store candidate:

```bash
ZOOK_MOBILE_RELEASE_ENV_FILE=.env.production.local pnpm mobile:release:check
```

Attach external evidence references when they are available:

```bash
ZOOK_REAL_DEVICE_PUSH_EVIDENCE=<ticket-or-redacted-path> \
ZOOK_QR_LOW_LIGHT_EVIDENCE=<ticket-or-redacted-path> \
ZOOK_CHECKOUT_WEBHOOK_EVIDENCE=<ticket-or-redacted-path> \
ZOOK_PROVIDER_CERT_EVIDENCE=<ticket-or-redacted-path> \
ZOOK_STORE_METADATA_EVIDENCE=<ticket-or-redacted-path> \
ZOOK_PRODUCT_SCOPE_APPROVAL=<ticket-or-redacted-path> \
ZOOK_MOBILE_RELEASE_ENV_FILE=.env.production.local \
pnpm mobile:release:check
```

## App Metadata

- App name, subtitle, and short description.
- Full App Store description.
- Full Play Store description.
- Keywords/search terms.
- Support URL.
- Marketing URL.
- Privacy policy URL.
- Terms URL.
- Contact email and phone.

## Visual Assets

- App icon.
- Splash screen.
- iPhone screenshots for required sizes. Apple currently accepts one to ten screenshots per device family, and 6.9" iPhone screenshots cover recent Pro Max / Plus sizes when they match App Store Connect dimensions.
- iPad screenshots if the app supports iPad.
- Android phone screenshots.
- Android tablet screenshots if supported.
- Feature graphic for Play Store.
- Optional promo video.

## Compliance

- Apple Privacy Nutrition Label.
- Google Data Safety form. Google requires every published app, including closed/open/production testing tracks, to complete the form and provide a privacy policy.
- Age rating questionnaire.
- Camera permission explanation.
- Notification permission explanation.
- Photo library permission explanation if profile/product images use it.
- Location permission explanation if gym discovery/maps require it.
- Android sensitive-permission review for camera, photos, notifications, and foreground-only location. Do not request background location or broad storage unless the core product genuinely needs it.
- Account deletion path and support process.
- User data export path and support process.

## Build And Release

- [x] EAS build profiles reviewed.
- [x] Production API URL confirmed.
- [x] Offline demo disabled.
- [x] Fixed OTP disabled.
- [x] Sentry DSN configured.
- [x] Expo project ID configured.
- [x] Push credentials configured.
- [x] iOS TestFlight build available to internal tester.
- [x] Android internal testing track ready.
- [x] Rollback build retained.

## 2026-06-13 Submission Evidence

- iOS EAS build `282c6ef6-8ef5-4772-82d7-529993a6a687` finished for production store distribution at version `0.1.0 (5)`, commit `7b95a47`.
- iOS EAS submission `1bb5152b-01c2-4402-b7e7-4cce38f7ff8a` completed successfully and logged `Upload to App Store Connect`.
- App Store Connect direct verification passed after Apple login: build `0.1.0 (5)` is visible and upload status is `Complete`.
- Initial external TestFlight routing left tester `aman0902pandey@gmail.com` at `No Builds Available`. Corrected on 2026-06-13 by creating internal group `Zook Internal QA` with automatic distribution enabled, adding only `aman0902pandey@gmail.com`, and verifying build `0.1.0 (5)` is `Ready to Test` in that group.
- Android EAS build `3d9c0f8e-8fe9-4cdc-be06-e1468b5c7431` finished for production store distribution at version `0.1.0`, versionCode `4`.
- Google Play Console internal testing shows release `4 (0.1.0)` available to internal testers, released Jun 12 11:37 PM, not reviewed yet.
- `pnpm mobile:release:check` passes against production config with warnings for physical-device push evidence, low-light QR evidence, and checkout/webhook evidence.

## 2026-06-24 Build And Submission Evidence

- Added `device-preview` EAS profile for side-by-side physical iPhone installs. It resolves to app name `Zook Preview`, bundle ID `com.zook.app.preview`, scheme `zook-preview`, production API mode, and production backend URL.
- iOS side-by-side EAS build `88c64b35-968f-4df2-8b43-c3d96653dd43` finished at version `0.1.0 (8)`, commit `cd70f060`, with ad hoc provisioning for Aman's cabled iPhone (`00008130-000C74820130001C`). The extracted `ZookPreview.app` was installed and launched with bundle ID `com.zook.app.preview`.
- iOS production EAS build `00b9080e-f36f-4e99-a650-3b77dccc642f` finished for TestFlight/App Store Connect at version `0.1.0 (8)`, commit `cd70f060`. EAS submission `6df0e289-1e2f-482c-a0f9-1f96609676ef` was scheduled for App Store Connect with internal group `Zook Internal QA`.
- EAS rejected inline TestFlight `what-to-test` notes because changelog submission is restricted to the Enterprise plan. Demo login notes to carry into TestFlight/Play review are: `owner@zook.local`, `admin@zook.local`, `reception@zook.local`, `trainer@zook.local`, `member@zook.local` / `+91 98765 43210`, and `platform@zook.local`; OTP `000000` is for seeded QA environments only.
- Android production EAS build `269d66d8-591d-4e46-85de-b43b0cead5e8` finished for Google Play at version `0.1.0`, versionCode `7`, commit `cd70f060`.
- Google Play EAS submission is blocked because no Google Service Account JSON key is configured in EAS and no matching key file was found locally. `eas submit -p android --profile production --id 269d66d8-591d-4e46-85de-b43b0cead5e8 --wait --non-interactive` failed with `Google Service Account Keys cannot be set up in --non-interactive mode`; the interactive path asks for a service-account JSON path.

## Pilot Release Rule

Do not submit broadly until real-device QA, provider certification, and production read-only smoke are attached to the release notes.

## Current Policy References

- Apple App Store submission overview: https://developer.apple.com/app-store/submitting/
- Apple screenshot specifications: https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/
- Google Play Data safety form: https://support.google.com/googleplay/android-developer/answer/10787469
- Google Play sensitive permissions policy: https://support.google.com/googleplay/android-developer/answer/16324062
