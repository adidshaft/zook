# Store Readiness

Last updated: 2026-06-13

This checklist covers the non-code work needed before App Store and Play Store submission.

Run the static release gate before building a store candidate:

```bash
ZOOK_MOBILE_RELEASE_ENV_FILE=.env.production.local pnpm mobile:release:check
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
- [ ] iOS TestFlight internal testing group ready and visible in App Store Connect.
- [x] Android internal testing track ready.
- [x] Rollback build retained.

## 2026-06-13 Submission Evidence

- iOS EAS build `282c6ef6-8ef5-4772-82d7-529993a6a687` finished for production store distribution at version `0.1.0 (5)`, commit `7b95a47`.
- iOS EAS submission `1bb5152b-01c2-4402-b7e7-4cce38f7ff8a` completed successfully and logged `Upload to App Store Connect`.
- App Store Connect direct verification is still blocked by Apple login/2FA; do not claim TestFlight processing until the build is visible there.
- Android EAS build `3d9c0f8e-8fe9-4cdc-be06-e1468b5c7431` finished for production store distribution at version `0.1.0`, versionCode `4`.
- Google Play Console internal testing shows release `4 (0.1.0)` available to internal testers, released Jun 12 11:37 PM, not reviewed yet.
- `pnpm mobile:release:check` passes against production config with warnings for physical-device push evidence, low-light QR evidence, and checkout/webhook evidence.

## Pilot Release Rule

Do not submit broadly until real-device QA, provider certification, and production read-only smoke are attached to the release notes.

## Current Policy References

- Apple App Store submission overview: https://developer.apple.com/app-store/submitting/
- Apple screenshot specifications: https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/
- Google Play Data safety form: https://support.google.com/googleplay/android-developer/answer/10787469
- Google Play sensitive permissions policy: https://support.google.com/googleplay/android-developer/answer/16324062
