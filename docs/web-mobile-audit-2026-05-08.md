# Web + Mobile Audit

Date: 2026-05-08
Environment:
- Web: `http://localhost:3000`
- Mobile: Expo Go via `exp://192.168.29.42:8082`
- Backend health: `GET /api/health -> 200 ok`
- OTP delivery note: local fixed OTP flow worked without depending on Resend

## Screenshots

- Web login: [/tmp/zook-web-login-audit-2026-05-08.png](/tmp/zook-web-login-audit-2026-05-08.png)
- Web owner dashboard: [/tmp/zook-web-dashboard-audit-2026-05-08.png](/tmp/zook-web-dashboard-audit-2026-05-08.png)
- Web attendance: [/tmp/zook-web-attendance-2026-05-08.png](/tmp/zook-web-attendance-2026-05-08.png)
- Web shop orders: [/tmp/zook-web-shop-orders-2026-05-08.png](/tmp/zook-web-shop-orders-2026-05-08.png)
- Web referrals: [/tmp/zook-web-referrals-2026-05-08.png](/tmp/zook-web-referrals-2026-05-08.png)
- Mobile Expo red-box state from first pass: [/tmp/zook-mobile-audit-2026-05-08.png](/tmp/zook-mobile-audit-2026-05-08.png)
- Mobile owner approvals: [/tmp/zook-mobile-owner-approvals-2026-05-08.png](/tmp/zook-mobile-owner-approvals-2026-05-08.png)

## What I Verified

- Web server booted successfully on `3000`.
- Metro booted successfully on `8082`.
- Web login worked with `owner@zook.local` and OTP `000000`.
- Mobile onboarding and login worked in Expo Go after the local fixes below.
- Member login worked with `member@zook.local` and OTP `000000`.
- Owner login worked with `owner@zook.local` and OTP `000000`.
- Web attendance, shop orders, and referrals screens all loaded in Chrome.
- Mobile audit is still only partially complete because route discovery remains unstable and several flows break into `Unmatched Route` or blank screens.

## Fixes Applied During Audit

1. Removed the duplicate Expo Router `shop` route collision by moving:
   - `apps/mobile/app/shop.tsx`
   - to `apps/mobile/app/shop/index.tsx`

2. Made Google Sign-In safer for Expo Go:
   - replaced the static native import path in `apps/mobile/app/login.tsx`
   - switched to lazy loading so Expo Go does not crash on `RNGoogleSignin`

3. Made splash lifecycle handling more defensive in `apps/mobile/app/_layout.tsx`:
   - guarded `SplashScreen.preventAutoHideAsync()`
   - guarded `SplashScreen.hideAsync()`

4. Added `SafeAreaProvider` at the mobile root in `apps/mobile/app/_layout.tsx`.

5. Cleaned up part of the mobile route tree:
   - moved `apps/mobile/app/plans.tsx` to `apps/mobile/app/plans/index.tsx`
   - moved `apps/mobile/app/notifications.tsx` to `apps/mobile/app/notifications/index.tsx`
   - moved `apps/mobile/app/owner.tsx` to `apps/mobile/app/owner/index.tsx`
   - updated `Stack.Screen name="trainer/index"` to `name="trainer"` in `apps/mobile/app/_layout.tsx`

## Web Audit

### Working

- Owner login works locally with OTP `000000`.
- `Dashboard`, `Attendance`, `Shop / Orders`, and `Plans / Referrals` all load successfully.
- Attendance APIs are responding and live QR generation is working.
- Shop order data is coherent:
  - ready and fulfilled states render
  - pickup codes render
  - totals render
- Referral policy and referral code management screen loads with live data.

### Issues

1. The owner shell repeats the same context too many times.
   - Branch status appears in:
     - the left rail
     - the hero chip row
     - the branch switch pills under the page intro
   - Owner identity also appears repeatedly in the hero/account cluster.
   - Impact:
     - wasted space
     - weaker scanability
     - important action areas get visually buried

2. Attendance table content looks like seeded placeholder data rather than production-shaped data.
   - Multiple rows render as `Member / Membership`.
   - This makes the UI hard to validate and suggests weak fixture realism.

3. Several pages reuse the same top-of-page scaffold too aggressively.
   - `Show QR`, `Reports`, branch pills, and hero metadata recur across operational pages.
   - Functional, but it creates visual duplication and reduces page-specific clarity.

## Mobile Audit

### Working

- Onboarding permission explainer loads.
- Login works with fixed OTP.
- Member home loads.
- Member `More` screen loads.
- Member `Inbox` screen loads.
- Owner `Approvals` screen loads.
- Cross-surface org context is consistent:
  - `Iron House Fitness`
  - branch chips
  - owner and member accounts resolve against the same local org

### Member Issues

1. Bottom-nav `Check in` is broken.
   - Result:
     - opens Expo Router `Unmatched Route`
   - Severity:
     - critical
   - Likely cause:
     - route manifest drift plus route-file boot failure

2. Bottom-nav `Plans` is broken.
   - Result:
     - opens Expo Router `Unmatched Route`
   - Severity:
     - critical

3. `Open gym details` from member home is broken.
   - Result:
     - opens Expo Router `Unmatched Route`
   - Severity:
     - critical

4. `Shop` from `More` renders a blank black screen.
   - Result:
     - only the bottom nav remains visible
     - no content, no error, no skeleton
   - Severity:
     - critical
   - Likely cause:
     - route resolves, but content tree crashes or returns null

5. `Inbox` list renders, but the linked navigation is broken.
   - Example:
     - tapping `New plan assigned: Playwright...`
   - Result:
     - modal says `Notification marked read.`
     - app then falls into `Unmatched Route`
   - Severity:
     - high
   - Likely cause:
     - notification-to-route mapping points at a route that is currently missing from the manifest

6. `Tracking` renders but has real layout overflow.
   - Result:
     - the sticky `Log workout` CTA overlaps the card grid
     - the bottom dock then overlaps the CTA area again
   - Severity:
     - high
   - Type:
     - UI / layout

7. Member home contains truncated content.
   - Example:
     - `Playwright report pl...`
   - Severity:
     - medium
   - Type:
     - content / layout polish

### Owner Issues

1. Owner lands in an inconsistent shell after login.
   - Result:
     - initial surface is the `More` page
     - bottom nav is owner nav (`Needs`, `Approvals`, `Revenue`, `Stock`)
     - identity block still says `Zook member account`
   - Severity:
     - high
   - Type:
     - role-shell mismatch

2. Owner `Approvals` loads, but the bottom dock overlaps page content.
   - Result:
     - the `Attendance queue clear` card is partially hidden under the dock
   - Severity:
     - medium
   - Type:
     - layout / spacing

3. Owner surface duplicates navigation concepts.
   - Result:
     - member-style `More` surface mixed with owner bottom-nav destination model
   - Severity:
     - medium
   - Type:
     - UX architecture inconsistency

### Route and Runtime Blockers

1. Expo Go still reports route discovery warnings.
   - Current warnings include:
     - `plans`
     - `scan`
     - `membership`
     - `reception`
     - `gym/[username]`

2. Multiple route files still appear broken to Expo Router because of a deeper runtime failure.
   - Warnings observed:
     - `Route "./gym/[username].tsx" is missing the required default export`
     - same warning shape for `membership.tsx`, `plans/[assignmentId].tsx`, `plans/index.tsx`, `reception.tsx`, and `scan.tsx`
   - These are likely secondary symptoms, not necessarily real missing exports.

3. `@gorhom/bottom-sheet` import path is still a live blocker in Expo Go.
   - Confirmed failing route:
     - `apps/mobile/app/gym/[username].tsx`
   - Log symptom:
     - `Exception in HostFunction: <unknown>`
   - Impact:
     - destabilizes the route manifest
     - causes downstream `Unmatched Route` behavior
     - prevents a trustworthy full-role audit

## Cross-Surface Notes

- Web and mobile are reading from the same gym/org data.
- OTP bypass for local QA is functioning.
- The product is currently split between:
  - web owner control surfaces that are mostly operational
  - mobile surfaces where navigation stability is the primary blocker

## Recommended Fix Order

1. Stabilize Expo Router route discovery fully.
   - Fix the remaining `bottom-sheet` import/runtime failure first.
   - Rebuild the route manifest until `scan`, `membership`, `plans`, `reception`, and `gym/[username]` all resolve cleanly.

2. Fix member-critical navigation.
   - `Check in`
   - `Plans`
   - `Open gym details`
   - notification deep links
   - `Shop`

3. Fix layout overflow on mobile.
   - tracking sticky CTA vs bottom dock
   - owner approvals bottom overlap

4. Fix role-shell consistency for owner.
   - remove `Zook member account` copy from owner shell
   - decide whether owner should land on `Needs` or `Approvals`, but not a member-style `More` surface

5. Reduce duplication on web owner pages.
   - de-duplicate branch chips and identity clusters
   - give each page a clearer page-specific header
