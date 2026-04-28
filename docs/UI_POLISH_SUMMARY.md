# Zook Mobile UI Polish Summary

Last updated: 2026-04-29

## Scope

This note summarizes the Expo mobile UI polish pass for `apps/mobile`. The pass is documentation-owned here and should be read with `docs/UI_UX_AUDIT_ZOOK.md` and `docs/SCREENSHOT_CHECKLIST.md`.

Code ownership for this doc pass:

- `docs/UI_POLISH_SUMMARY.md`
- `docs/SCREENSHOT_CHECKLIST.md`

Do not treat this summary as permission to stage unrelated dirty files or generated screenshots unless they are explicitly part of the final polish handoff.

## Product Direction

- Keep the approved dark Zook glass direction instead of redesigning the app from scratch.
- Make operational screens feel like gym execution surfaces: dense, calm, fast to scan, and role-aware.
- Reduce neon/lime intensity so lime marks the primary action, success proof, or scan affordance instead of decorating every surface.
- Prefer one obvious primary action per screen or sticky action area.
- Preserve offline/demo mode and the Iron Temple Gym pilot narrative for local QA.
- Keep member flows member-safe: plan detail actions should be `Complete Workout` and `Send Feedback`, not trainer edit/delete controls.

## Implemented Polish

- Consolidated mobile tokens in `apps/mobile/src/lib/theme.ts` with canonical Zook colors, spacing, radii, typography, and compatibility aliases.
- Reduced typography scale after visual review so operational screens use more of the available viewport with less cognitive load.
- Tightened `apps/mobile/src/components/primitives.tsx` around shared screen shells, glass cards, buttons, chips, status components, bottom navigation, forms, empty/error/loading states, and sticky action bars.
- Moved profile access into the top-left avatar/header shortcut and removed the bottom-nav Profile item from role navs.
- Preserved active role in offline demo refresh and added `EXPO_PUBLIC_OFFLINE_DEMO_ROLE` / `EXPO_PUBLIC_OFFLINE_DEMO_VIEW` launch overrides for simulator QA screenshots.
- Aligned member routes around home, scan, attendance proof, plans, shop, profile, membership, notifications, gym discovery, and tracking entry.
- Aligned trainer routes around a clearer client dashboard, client detail tabs, plan assignment, progress/notes, and AI draft review.
- Aligned receptionist routes around pending approvals, member lookup, manual payments, and pickup/order operations.
- Aligned owner routes around command, approvals, revenue, and stock views with query-param aware navigation.
- Improved empty, failed, pending, expired, offline, and branch-mismatch states across the flows listed in the audit.
- Keep QR, checkout, notification, privacy, guardian/minor, and provider-backed behavior honest about mock/local limitations.

## Copy And Hierarchy Decisions

- `Book class` should become `Find gyms` unless a real booking route exists.
- `Confirm Mock Payment` should become `Continue to payment`.
- Pending attendance should say `Waiting for desk approval` and avoid implementation language such as `attendance approval mode`.
- `Active membership` should become `Latest membership` when the status can be pending or expired.
- Profile should use `Profile` as the screen title and the member's name inside the account card.
- Staff views should make the active role and active gym obvious before exposing staff actions.

## QA Results

Final handoff checks for this pass:

- Typecheck command: `cd apps/mobile && ./node_modules/.bin/tsc --noEmit`
- Lint command: `cd apps/mobile && ../../node_modules/.bin/eslint .`
- Test command: `cd apps/mobile && ./node_modules/.bin/vitest run --passWithNoTests`
- iOS sanity command: `cd apps/mobile && EXPO_PUBLIC_OFFLINE_DEMO=true MOBILE_OFFLINE_DEMO=true EXPO_PUBLIC_ENV_PROFILE=local EXPO_NO_TELEMETRY=1 ./node_modules/.bin/expo run:ios --device "iPhone 17 Pro"`
- Role-view QA example: `EXPO_PUBLIC_OFFLINE_DEMO_ROLE=OWNER EXPO_PUBLIC_OFFLINE_DEMO_VIEW=approvals`
- Screenshot capture method: iPhone 17 Pro simulator screenshots saved under `apps/mobile/screenshots/ui-polish-2026-04-28/`.
- Final polish commit: this document is included in `test: add ui qa checklist and smoke checks`.

Known limitations to carry forward:

- Native push requires an EAS development/preview build and physical device validation.
- Hosted checkout opens the web flow and may not deep-link back automatically.
- Provider-backed Razorpay, AI, maps, SMS, email, and push behavior remains provider-ready unless explicitly production-verified.
- The local iOS run generated `apps/mobile/ios/`; it is intentionally not part of the polish commit.
- Aman's physical iPhone was detected as offline during the install check, so the installed demo could only be verified on the iPhone 17 Pro simulator until the phone is connected/trusted.
- Existing unrelated local changes may be present in `apps/mobile/app/tracking.tsx`, duplicate primitive files, generated screenshots, or generated app icons; review staging carefully.
