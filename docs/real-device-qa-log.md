# Real Device QA Log

Last updated: 2026-06-13

Simulators and emulators catch layout and navigation issues. The flows below still need physical iOS and Android evidence before a confident production launch claim.

## 2026-06-13 Store Candidate Status

Store candidates are available for physical-device QA:

- iOS: EAS production/store build `282c6ef6-8ef5-4772-82d7-529993a6a687`, version `0.1.0 (5)`, commit `7b95a47`. EAS submission `1bb5152b-01c2-4402-b7e7-4cce38f7ff8a` uploaded the build to App Store Connect successfully. App Store Connect shows upload `Complete`. Internal TestFlight group `Zook Internal QA` has automatic distribution enabled, includes only `aman0902pandey@gmail.com`, and shows build `0.1.0 (5)` as `Ready to Test`.
- Android: EAS production/store build `3d9c0f8e-8fe9-4cdc-be06-e1468b5c7431`, version `0.1.0` versionCode `4`. Google Play internal testing shows release `4 (0.1.0)` available to internal testers.

No physical-device acceptance evidence has been attached for this candidate yet. The launch remains open until the pass below is filled for both platforms.

## Evidence Template

- Date:
- Tester:
- Build commit:
- Build profile:
- Device:
- OS version:
- Network:
- Account/role:
- Screenshot/video path:
- Result:
- Notes:

## iOS Required Pass

- Install production/preview build.
- Login as member, owner/admin, receptionist, and trainer.
- Validate QR scanner permission rationale and low-light reception scan.
- Validate push foreground, background tap, and cold-start deep-link.
- Validate Apple sign-in round trip if enabled for the build.
- Validate keyboard avoidance on login, payment, profile, trainer note, and reception manual payment screens.
- Validate safe-area behavior on small and large iPhones.
- Validate membership renewal, pending payment, expired, rejected, and failed states.

## Android Required Pass

- Install production/preview build.
- Login as member, owner/admin, receptionist, and trainer.
- Validate camera permission rationale and QR scan.
- Validate push foreground, background tap, and cold-start deep-link.
- Validate Google sign-in round trip if enabled for the build.
- Validate Android status bar, bottom nav, elevation/shadow, and keyboard avoidance.
- Validate desk verify/payment/pickup/manual attendance actions.
- Validate shop cart, checkout, and pickup code states.

## Role Matrix

Member:

- Home, QR entry, attendance result states, plans, shop, cart, checkout, pickup, notifications, membership history, renewal, profile, privacy export/delete request.

Receptionist:

- Desk queue, code verify, member lookup, manual payment, manual attendance, pickup fulfillment, phone reveal permission gate, double-tap guards.

Trainer:

- Today view, clients, plans, inbox, client summary, reusable templates, progress timeline, notes, AI draft handoff.

Owner/admin:

- Command, approvals, revenue, stock, member detail, bulk actions, phone reveal gate, role switch.

Platform:

- Mobile handoff/open web, logout.

## Open Until Filled

- Physical-device push evidence.
- Real-device QR scanner evidence in normal and low light.
- Real provider payment checkout evidence.
- Store build install evidence.
- Light and dark mode pass for member, owner/admin, receptionist, and trainer.
- Geofence checkout evidence from a physical device.
- Install TestFlight on the physical iPhone and confirm build `0.1.0 (5)` installs from internal testing.
