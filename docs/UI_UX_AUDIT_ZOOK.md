# Zook Mobile UI/UX Audit

## Snapshot

This audit covers the Expo mobile app in `apps/mobile` for the production polish pass. The app already has the approved dark Zook direction, offline demo support, role-aware routing, and a broad shared primitive file. The pass should consolidate what exists rather than redesign from scratch.

Current branch started with unrelated local work in the tree:
- `apps/mobile/app/tracking.tsx`
- `apps/mobile/screenshots/`
- `apps/mobile/src/components/primitives (1).tsx`
- `packages/figma-icon-builder/*`

Those files should not be staged unless intentionally changed by this pass.

## Screens Found

Member routes:
- `app/index.tsx` member home
- `app/scan.tsx` QR check-in scanner
- `app/attendance/[attendanceRecordId].tsx` attendance result
- `app/plans.tsx` plan list/detail implementation
- `app/plan/[assignmentId].tsx` alias to plans
- `app/shop.tsx` shop, cart, checkout, pickup views
- `app/profile.tsx` account/profile/settings
- `app/membership.tsx` membership history
- `app/notifications.tsx` notification inbox
- `app/find-gyms.tsx`, `app/gym/[username].tsx`, and aliases for discovery/join flows

Trainer routes:
- `app/trainer/index.tsx` trainer home
- `app/trainer/client/[id].tsx` client detail with summary/plans/progress/notes/AI draft tabs

Receptionist routes:
- `app/reception.tsx` desk, member, payment, and order views via query params

Owner routes:
- `app/owner.tsx` command, approvals, revenue, and stock views via query params

Other routes:
- `app/login.tsx`
- `app/assistant.tsx`
- `app/tracking.tsx`, `app/tracking-entry.tsx`, `app/tracking-history.tsx`
- notification/referral/order aliases

## Components Found

The main shared source is `apps/mobile/src/components/primitives.tsx`. It already exports:
- shell aliases: `ZookScreen`, `Screen`, `ScreenShell`, `SafeAreaScreen`
- cards and panels: `GlassCard`, `Card`, `GlassPanel`
- buttons: `ZookButton`, `PrimaryButton`, `SecondaryButton`, `DangerButton`
- chips: `ZookChip`, `Pill`, `StatusChip`, `RoleChip`, `ActiveGymPill`
- headers: `MobileHeader`, `RoleHeader`, `ScreenHeader`, `SectionHeader`
- navigation: `BottomNav`, `Dock`
- rows and data components: `ListRow`, `MetricTile`, `StatusRing`, `EntryCodeCard`
- form/catalog components: `TextField`, `GlassInput`, `FormField`, `SearchBar`, `ProductCard`, `ExerciseRow`
- state components: `LoadingState`, `EmptyState`, `ErrorState`, `AuditWarning`, `StickyActionBar`

The issue is not missing primitives; it is inconsistent use and incomplete variants. Newer member screens use `ZookScreen`, `GlassCard`, and `BottomNav`; many older routes still use the legacy `Screen`, `Card`, `Pill`, and `Dock` aliases with one-off styles.

## Role Mapping

Route guards in `app/_layout.tsx` map access by active role:
- Member routes are the default authenticated experience.
- `/trainer` requires `TRAINER`, `OWNER`, or `ADMIN`.
- `/reception` requires `RECEPTIONIST`, `OWNER`, or `ADMIN`.
- `/owner` requires `OWNER` or `ADMIN`.

Role switching exists in `profile.tsx`. Offline demo mode provides a single demo user with multiple roles; this is useful for QA and should be preserved.

Current role behavior to keep in mind:
- The session default role prioritizes member first for multi-role demo users, so staff users need an obvious role switch path.
- Protected staff routes also require the active role to be eligible. This is strict and production-safe, but the UI should make the active role clear.
- Bottom nav active matching must include query-param views for owner and receptionist tabs.

## Inconsistencies

Visual system:
- `theme.ts` is close to the Figma token set but uses older names and stronger legacy shadows.
- `GlassCard` has only a `glow` boolean, so accent states are handled with one-off border and shadow styles.
- Button glow is too easy to overuse because primary buttons always inherit the same lime shadow.
- `BottomNav` uses a heavy blur and path-only active matching; query-param views like owner revenue/stock and receptionist payments/orders can highlight the wrong tab.
- Chip variants are generic tone-based, which creates inconsistent labels and color meaning across roles.
- `apps/mobile/src/components/primitives (1).tsx` is an untracked duplicate-like primitive file and should not be imported or staged by this pass.
- `apps/mobile/src/components/tracking.tsx` owns its own card/pill language and can be aligned later; the current pass should avoid absorbing unrelated dirty changes in `tracking.tsx`.

Screen density:
- `profile.tsx` exposes role switching, gym switching, health fields, notification preferences, privacy jobs, system settings, membership, plans, and logout in one long surface.
- `reception.tsx` compresses desk queue, member lookup, payment, and orders into one route with several equally prominent actions.
- `trainer/client/[id].tsx` mixes client summary, plan creation, progress, notes, and AI draft review inside one screen.
- `shop.tsx` includes catalog, cart, checkout, and pickup states, but the shopping flow can feel like ecommerce rather than desk pickup.

Copy and hierarchy:
- Some fallback branch labels say `Default Branch`; production copy should prefer `Main Branch` or the actual branch name.
- Member plan detail previously showed a member-safe feedback flow, while the latest polish brief asked for add/delete. Product clarification chose member-safe actions: `Complete Workout` and `Send Feedback`.
- Attendance pending should stay calm and operational: use `Desk confirmation needed`, not `Manual review required`.
- Existing category copy includes `Supplement`; this should be evaluated against the current product data while keeping pickup-first language.
- `Book class` currently points to gym discovery; rename it to `Find gyms` unless a class booking route exists.
- `Confirm Mock Payment` is user-visible demo/internal copy; use `Continue to payment`.
- `Active membership` can be inaccurate for latest pending/expired plans; prefer `Latest membership` where status is dynamic.
- Profile currently titles the screen with the user name and then displays email as the main card name. Use `Profile` for the screen title and user name in the card.

## Screens With Too Many CTAs

- Member home: QR scan, workout, plan, metrics, quick links, active gym chip all compete near the top.
- Profile: update profile, notification toggles, system settings, inbox, membership, plans, privacy export/deletion, and logout all appear as primary-level actions.
- Reception payment: payment mode, reason, record action, and route navigation can visually compete.
- Trainer client detail: create/assign/save/AI actions are split across tabs and do not make the primary next action obvious.
- Owner command: action rows are appropriate, but too many colored chips make attention items feel equally urgent.

## Screens With Unclear Hierarchy

- `app/plans.tsx`: member detail should prioritize workout completion and feedback; editing controls belong to trainer surfaces.
- `app/shop.tsx`: catalog should emphasize desk pickup and compact product decisions, not checkout ceremony.
- `app/reception.tsx`: queue approvals should surface member name, state, scan time, reason, and the approve action first.
- `app/trainer/client/[id].tsx`: client summary and plan actions should be visible before AI draft review.
- `app/profile.tsx`: account, gym, membership, health, settings, and privacy need clearer grouping.

## Glow And Button Intensity Issues

- Member home uses a glowing membership card, lime progress ring, lime CTA, lime chips, and lime icons in close proximity.
- Attendance approved uses glow on the proof card and ring; success should feel trustworthy, not celebratory.
- Scanner corners and scan line should remain lime but be less neon.
- Bottom nav blur and selected styling should be lighter and consistent across roles.
- Owner/reception/trainer chips should not use lime for every positive/active state if it competes with the primary action.

## Missing Or Weak States

Needed across the pass:
- no assigned plan
- no active membership
- expired membership
- no notifications
- no payments recorded yet
- no pending approvals
- no join requests
- no low-stock products
- no pending pickups
- no recent activity
- QR failed, expired, branch mismatch, inactive membership, already used
- payment missing reason, invalid amount, duplicate reference, offline pending, record failed
- shop item out of stock, pickup unavailable, cart changed
- AI draft generation failed, missing client goal, review required before assignment
- approval failed and queue sync pending
- lightweight offline banner: `Offline. Changes will sync when connection returns.`

## Recommended Changes Implemented In This Pass

- Make `theme.ts` the single mobile token source with canonical Zook token names and compatibility aliases.
- Refactor `primitives.tsx` into a stricter design system while preserving existing exports to keep route changes safe.
- Add a real `ScreenShell` with safe-area, scroll, nav/sticky-action padding, optional ambient glow, and role mode support.
- Add card, button, chip, form, nav, scanner, progress, and state variants for production UX.
- Migrate high-priority member, trainer, receptionist, and owner routes to the unified shell/nav/cards.
- Add a dedicated trainer AI draft review route.
- Keep member plan actions member-safe: `Complete Workout` and `Send Feedback`.
- Reduce lime glow intensity and enforce one primary CTA per screen or sticky action region.
- Add `docs/UI_POLISH_SUMMARY.md` and `docs/SCREENSHOT_CHECKLIST.md` during the QA phase.
