# Mobile Device & Integration QA Report

Date: 2026-06-21

Source handoff: `/tmp/zook-mobile-device-qa-handoff.md`

## Scope

This report records the non-interactive checks that can be run from the local workstation and the remaining physical-device/live-service checks that still need a human QA pass on TestFlight and Play internal builds.

## Static Configuration Checks

### Universal Links / App Links

Verified local association files:

- `apps/web/public/.well-known/apple-app-site-association`
  - `appID`: `JP4HU7X6G7.com.zook.app`
  - paths preserved: `/checkin`, `/checkin/*`, `/join/*`, `/plans/*`, `/shop/*`, `/dashboard`
- `apps/web/public/.well-known/assetlinks.json`
  - Android package: `com.zook.app`
  - release SHA-256 present: `AF:CE:B5:DF:52:85:0C:5A:A5:70:30:CF:EF:53:57:F5:C8:39:AD:ED:16:ED:70:D1:FF:FB:BE:2C:E4:23:45:5F`

Verified mobile app config references:

- custom scheme: `zook`
- iOS bundle identifier: `com.zook.app`
- iOS associated domains: `applinks:zookfit.in`, `applinks:app.zookfit.in`
- Android package: `com.zook.app`
- Android intent filters include `https://zookfit.in` and `https://app.zookfit.in`

## Device Availability Checks

### iOS

`xcrun devicectl list devices` found a paired physical iPhone:

- `Aman's iPhone`
- identifier: `3803F5B6-1666-56D3-A71A-62F131F6CE3B`
- state: `available (paired)`
- model: iPhone 15 Pro

`xcrun devicectl device info apps --device 3803F5B6-1666-56D3-A71A-62F131F6CE3B` found:

- `Zook`
- bundle identifier: `com.zook.app`
- version: `0.1.0`

Attempted to open:

```text
https://zookfit.in/checkin?checkInCode=AB-1234&qrPayload=test
```

Result:

- The openURL command failed because the physical iPhone was locked.
- CoreDevice reported the launch target as `com.apple.mobilesafari`, so this attempt is **not** accepted as a universal-link verification pass.
- A real check must be repeated with the device unlocked and a TestFlight/internal build observed opening Zook directly to the check-in flow.

### Android

`adb devices` returned no attached Android devices.

Result:

- Could not run `adb shell pm get-app-links com.zook.app`.
- Could not verify `zookfit.in` app-link status on a Play internal build.

## Remaining Required QA

### Universal Links / QR Check-In

- On an unlocked iOS physical device with TestFlight/internal Zook installed, scan a live reception Entry QR with the native camera.
- Confirm Zook opens directly to the check-in flow, not Safari.
- Confirm auto-check-in succeeds for a valid member.
- Repeat by opening a real `https://zookfit.in/checkin?checkInCode=...&qrPayload=...` URL from Notes or a message.
- On Android Play internal build, scan/open the same live link and confirm Zook opens directly, not Chrome.
- Run `adb shell pm get-app-links com.zook.app` and confirm `zookfit.in` is `verified`.
- If Play App Signing is enabled, add the Play App Signing SHA-256 fingerprint to `apps/web/public/.well-known/assetlinks.json`.

### Check-In Edge Cases

Validate app-visible server messages for:

- `NO_ACTIVE_MEMBERSHIP`, with the gym name in the message
- `MEMBERSHIP_PAUSED`
- `MEMBERSHIP_EXPIRED`
- wrong-branch checkout mismatch
- branch closed

### Camera, Location, Payments, Push, Images

Still requires physical-device/staging validation:

- QR scanner camera grant/deny/blocked states with a real signed QR payload.
- Gym profile distance with foreground location granted, and hidden distance when permission is denied.
- Maps handoff from "Get directions".
- Membership checkout through the real web checkout URL/payment provider, return-to-app, and activation.
- Owner refund flow against real payment data.
- Push notification registration, delivery, and deep-link routing.
- Remote image loading for gym gallery.
- Profile photo, gym logo upload, logo avatar rendering, and brand-monogram fallback.
- Reviews, rewards, and classes mobile screens against live backend endpoints.
- Cross-role and multi-org session switching without stale data.

## Current Status

Static configuration is consistent with the intended bundle/package IDs and domains. Real iOS universal-link verification, Android app-link verification, and live integration QA remain open because the available iPhone was locked during the openURL attempt and no Android device was attached.

