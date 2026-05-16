# Real Device QA Log

Last updated: 2026-05-17

Simulators and emulators catch layout and navigation issues. The flows below still need physical iOS and Android evidence before a confident production launch claim.

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
