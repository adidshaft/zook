# Mobile Screenshot Checklist

Last updated: 2026-04-29

Use this checklist for the Zook Expo mobile UI polish pass. For this handoff the review target is the iPhone 17 Pro simulator only, matching the latest product feedback.

## Setup

- Local API/web running: not required for the offline demo pass.
- Mobile launch command: `cd apps/mobile && EXPO_PUBLIC_OFFLINE_DEMO=true MOBILE_OFFLINE_DEMO=true EXPO_PUBLIC_ENV_PROFILE=local EXPO_NO_TELEMETRY=1 ./node_modules/.bin/expo run:ios --device "iPhone 17 Pro"`
- Role/view override for staff screenshots: append `EXPO_PUBLIC_OFFLINE_DEMO_ROLE=OWNER EXPO_PUBLIC_OFFLINE_DEMO_VIEW=approvals` before the launch command as needed.
- Device or simulator: iPhone 17 Pro simulator, iOS 26.4.1, UDID `07CF6415-F04A-4D98-A32C-02C3AB5639EE`
- Build profile: local offline demo
- App commit: final QA commit on branch `ui-ux-production-polish-pass`
- Screenshot output folder: `/Users/amanpandey/projects/zook/apps/mobile/screenshots/ui-polish-2026-04-28`

## Global Checks

- Safe areas are respected on notched devices.
- Text does not overlap or truncate awkwardly at common mobile widths.
- Primary CTA is visually dominant, with no competing glow-heavy actions.
- Bottom navigation highlights the current route, including owner/reception query-param views.
- Offline banner copy is calm: `Offline. Changes will sync when connection returns.`
- Empty, loading, error, pending, and disabled states are visible where applicable.
- Demo/internal copy is not user-facing unless the build is explicitly a demo surface.

## Member Screens

- Login and OTP entry.
- Member home with active gym, latest membership, plan summary, and restrained quick actions.
- Find gyms and gym profile/join flow.
- Scan screen with camera/manual entry affordances.
- Attendance approved, pending, rejected, expired, already-used, inactive-membership, and branch-mismatch states.
- Plans list with no-plan state.
- Plan detail with `Complete Workout` and `Send Feedback`.
- Shop catalog with pickup-first language.
- Cart/checkout handoff with `Continue to payment`.
- Order/pickup state, including out-of-stock or pickup-unavailable state if available.
- Membership history with active, pending, and expired examples.
- Notifications inbox with unread/read and empty states.
- Profile with account, active role, active gym, health, notification preferences, privacy jobs, and logout.
- Minor/guardian blocked or pending state.

## Trainer Screens

- Trainer home with assigned clients and empty assigned-client state.
- Client detail summary tab.
- Client plan tab with assign/create action hierarchy.
- Progress and notes tabs.
- AI draft review state before assignment.
- AI draft failed or missing-client-goal state, if available.
- Notification-to-member confirmation state.

## Reception Screens

- Reception desk with pending approvals and no-pending-approvals state.
- Attendance approval and rejection confirmation states.
- Member lookup/search state.
- Manual payment form with missing reason, invalid amount, duplicate reference, offline pending, and record-failed states where available.
- Orders/pickups list with no-pending-pickups state.
- Queue sync pending or approval failed state.

## Owner Screens

- Owner command overview with active gym/role visible.
- Approvals view with join requests and no-join-requests state.
- Revenue view with no-payments-recorded state.
- Stock view with low-stock and no-low-stock-products states.
- Recent activity with no-recent-activity state.
- Query-param tab highlighting for command, approvals, revenue, and stock.

## Cross-Flow Captures

- Role switcher from profile for member, trainer, receptionist, and owner roles.
- Push preference and device registration status in profile.
- Deep-link return after protected route login.
- Web checkout handoff opened from mobile.
- Notification detail route from inbox or push.
- Privacy export request and deletion request states.

## Final Review

- Screenshots reviewed by: Codex
- Review date: 2026-04-29
- Blocking visual issues: none known from the simulator pass
- Follow-up issues filed: none
- Final screenshot artifact: `/Users/amanpandey/projects/zook/apps/mobile/screenshots/ui-polish-2026-04-28`
