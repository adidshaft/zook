# Mobile UX/UI findings — remaining backlog

Compiled while auditing the Zook mobile app across **all four roles, both light & dark, on iOS (simulator) and Android (emulator)**. Everything in this doc is **not yet fixed** — the items already fixed are on branch `mobile-ui-cleanup` (30 commits). Each entry below states what's **at fault**, the **user experience** impact, and the **fix**.

Confidence tags: **[bug]** = confirmed defect · **[ux]** = works but worse than it should · **[ui]** = visual/consistency · **[confirm]** = likely a demo-fixture artifact, verify against the real backend before touching · **[unverified]** = couldn't exercise (tooling/auth-gated).

---

## 1. Functional / correctness

### 1.1 Reception "Verify scan" deep-link ignores the record  **[bug]**
- **Fault:** `app/reception/verification/[recordId].tsx` renders the generic Front-Desk body and never reads the `recordId` param. The route exists to verify one specific flagged/pending scan (e.g. from a push notification or a tap in the queue).
- **Experience:** A receptionist who taps a specific scan-to-review lands on the generic desk and has to hunt for it in the queue. The deep link is effectively dead.
- **Fix:** Have `ReceptionWorkspace`/desk body accept `initialRecordId` and auto-open/scroll to that record's verification card (mirrors how `members/[id]` passes `initialMemberId`).

### 1.2 Billing single-tenant pluralization  **[bug, minor]**
- **Fault:** `app/owner/billing.tsx` — `"${activeMemberCount} members currently count toward your plan limits"` doesn't handle `=== 1` ("1 members … count").
- **Experience:** A brand-new gym with one member sees ungrammatical copy.
- **Fix:** Pluralize member/members and count/counts.

---

## 2. UX gaps (flows work, but could be clearer)

### 2.1 Profile alias routes are functionally identical  **[ux]**
- **Fault:** `/profile/edit`, `/profile/photo`, `/profile/extra-fields` all re-export the same `profile-screen.tsx` and render the identical screen (the only old differentiator — the native title — was removed when we fixed the double-header).
- **Experience:** Tapping "Edit", "Photo", or "Profile details" doesn't take the user to a focused sub-screen as the labels imply; they all land on the full profile.
- **Fix:** Either (a) make `profile-screen` read the route and scroll-to/expand the relevant section, or (b) collapse these to a single `/profile` and remove the alias links.

### 2.2 Owner web-handoff shown twice  **[ux, minor]**
- **Fault:** "Open web control room" is a prominent card on Owner → Today **and** the whole "Web control room" list on Owner → More.
- **Experience:** Mild redundancy; the Today card eats prime real estate for a link.
- **Fix:** Slim the Today card to a one-line row, or drop it (More already covers web).

### 2.3 Plan tab is sparse with a single assignment  **[ux, minor]**
- **Fault:** After de-duping (today vs schedule), a member with one plan sees only the "Today's workout" card and a lot of empty space.
- **Experience:** Looks unfinished for single-plan members.
- **Fix:** When there's one plan, surface its exercise preview inline (the data the Home card already shows) so the tab feels complete.

### 2.4 Pause-membership control could explain itself  **[ux, minor]**
- **Fault:** `active-membership-card.tsx` shows a date field + "Pause membership" with no explanation of what pausing does (freezes access, extends end date?).
- **Experience:** Users hesitate on a consequential action. (We added a confirm dialog; the inline copy could still help.)
- **Fix:** One line under the control: "Pausing freezes check-ins until the resume date; your remaining days carry over."

---

## 3. UI / consistency

### 3.1 Two header systems with different title sizes  **[ui]**
- **Fault:** Tab landings use `ScreenHeader` (display ~34px); pushed/secondary screens and the Shop tab use `AppHeader` (~20px). So the Shop tab's title is visibly smaller than its sibling tabs (Home/Plan/Progress).
- **Experience:** Subtle inconsistency in the "weight" of screen titles across the app.
- **Fix:** Unify into one header component (or make `AppHeader` match `ScreenHeader`'s large-title treatment on tab roots).

### 3.2 iOS-only glow shadows are no-ops on Android  **[ui, minor]**
- **Fault:** A few elements use `shadowColor`/`shadowOpacity` glows without an Android `elevation` (e.g. the profile KYC progress pip, the scan accent glow). Android can't render `shadow*`.
- **Experience:** Slightly flatter accents on Android (not broken). The tab bar and cards already handle this; these are leftovers.
- **Fix:** Add matching `elevation` (or accept the graceful degradation and document it).

---

## 4. Needs product/backend confirmation (likely demo-fixture artifacts)

These look wrong in the offline-demo build but are probably mocked data. **Verify against the real API before changing UI.**

- **[confirm]** Progress shows **"Sessions 3 / Active 3h 5m"** but Recent workouts is **empty** ("No workouts logged"). Summary counts and the workouts list diverge in the fixture; confirm they're consistent in production.
- **[confirm]** Owner Revenue: **"today ₹82,400"** vs the 7-day chart headline **₹2,600**. The relationship between the tile and the chart value is unclear — confirm what each represents and label accordingly.
- **[confirm]** Owner member detail: **Fitness goal** and **Notes** both render "Muscle gain" (notes defaulted to the goal in the fixture). If notes are genuinely empty, show an empty state instead of echoing the goal.
- **[confirm]** Shop checkout total (**₹548 / 2 items**) doesn't match the cart (**₹149 / 1 item**) — this is the offline mock (`POST /shop/orders` returns the canned fixture order). Confirm production builds the order from the live cart.

---

## 5. Not yet verified (need device interaction or are gated)

- **[unverified]** **Onboarding & login** — the demo auto-authenticates (session in SecureStore) and sign-out is below the fold, so the first-run/auth screens couldn't be reviewed. Need a logged-out build.
- **[unverified]** **Submit paths** that render correctly and whose handlers read correct in code, but weren't tapped through end-to-end on device: scan check-in (needs a camera/QR), shop pay-completion (mock), membership renewal purchase, trainer plan create/assign + AI draft, reception record-payment submit, profile photo upload.
- **[unverified]** **Accessibility pass** — labels exist on most controls, but no systematic audit of tap-target sizes, dynamic-type scaling, or screen-reader order.
- **[unverified]** **Tablet / large-screen** layout — only phone form factors were checked.
- **Note (not a bug):** Android shows a red `expo-notifications` warning toast — push notifications require a dev/production build, not Expo Go, on Android SDK 53+. Expected in Expo Go only.

---

## 6. Code-health (no user-visible change)

- **[code]** `member-scan-route.tsx` (~1.1k) and `shop-index-route.tsx` (~1.1k) remain large. Styles were already extracted to `*.styles.ts`; the stateful component bodies could be split into sub-components, but they share enough state that doing so risks regressions (this shape caused the earlier hooks-order crash). Refactor with care, behind tests.
