# Mobile Simulator Audit - 2026-05-03

## Scope

This pass was done on the iOS Simulator with the local backend running and `GET /api/health` returning `200`.

Accounts exercised in this pass:

- `member@zook.local`
- `trainer@zook.local`
- `reception@zook.local`
- `owner@zook.local`
- `admin@zook.local`
- `minor@zook.local`
- `platform@zook.local`

Dev OTP used throughout: `000000`

The goal of this pass was not just "does it render", but "does the role land on the right surface, do the main screens load, do the important actions behave correctly, and what breaks visually or functionally".

## Product Direction Update

- Gym/organization setup is web-only. Owners create and polish the gym profile from the website/dashboard, including public username, photos, facilities, join mode, app links, and join QR.
- Mobile remains the daily execution app: member discovery/join, check-in, plan, shop, trainer, receptionist, and owner command.
- Minor is not a separate mobile role for the MVP. Minor-specific backend safety records can remain provider-ready, but product QA should treat minor accounts as member accounts unless a dedicated guardian flow is explicitly reintroduced.

## Fix Pass Status

Addressed after this audit:

- Platform admin now routes to an explicit mobile web-handoff screen instead of falling into the member shell.
- Admin keeps the owner/admin command shell but is labeled and docked as Admin.
- Member plan detail no longer exposes add/delete exercise controls; members can only mark assigned exercises and complete workouts.
- Reception manual attendance catches duplicate-attendance API errors inline instead of leaking an unhandled app-level exception.
- Shared bottom-dock scroll padding was increased for docked mobile surfaces.
- Web now has a gym setup entry point and a real Public Profile editor for owners.
- The shared gym profile route now renders backend/public profile content, facilities, gallery photos, and app handoff links instead of appearing blank.
- Trainer home no longer shows hardcoded PT/feedback metrics; its headline client shortcut links directly to an assigned client.
- Attendance success now routes trainers back to trainer plan work instead of dropping them into the member plan library.
- Rejected/flagged attendance results now show a desk-help-needed state instead of the approved check-in treatment.
- Owner payment exception copy now reads as a review state, including a clean zero state.

## Screenshots

- Member home: `/tmp/zook-audit-member-home.png`
- Member gym details blank state: `/tmp/zook-audit-member-gym-blank.png`
- Trainer home layout: `/tmp/zook-audit-trainer-home.png`
- Platform admin landing in member shell: `/tmp/zook-audit-platform-home.png`

## Global Findings

### Broken

- **Unhandled error toast persists across the whole app**
  - **Observed:** After reception triggered a duplicate attendance error, the raw toast `Uncaught (in promise, id: 0) ApiError: Member already has an attendance record for today.` stayed visible across role switches, settings, logout, and even back on the login screen.
  - **Why it matters:** One runtime error can pollute every later screen and makes the app feel unstable even when the next flow is fine.
  - **Likely fix:** Catch and normalize domain/API errors before they reach the global unhandled promise path. Also clear transient toast/error state on route change and logout.

- **Bottom dock overlaps content on multiple surfaces**
  - **Observed:** The bottom nav still sits on top of content on member, trainer, owner, and settings surfaces. In a few places it visually clips CTAs or lower cards.
  - **Why it matters:** Some actions feel half-hidden, and screens read like they were not padded for the dock height.
  - **Likely fix:** Add a consistent bottom safe-area spacer/content inset for all docked screens instead of per-screen guesses.

- **Role routing is inconsistent**
  - **Observed:** `admin@zook.local` lands in the owner shell with an `Owner` badge. `platform@zook.local` lands in the member shell. This is not just copy drift; it is wrong surface routing.
  - **Why it matters:** It hides real permission boundaries and makes role testing misleading.
  - **Likely fix:** Stop falling back to the member shell for unsupported roles and add explicit routes/default shells for `ADMIN` and `PLATFORM_ADMIN`.

### Working

- **Backend integration is generally alive**
  - **Observed:** OTP request/verify, member home, trainer clients, reception desk, reception pickup verification, and owner dashboard data all loaded from the running local stack.
  - **Why it matters:** Most problems in this pass were UI/state-management issues rather than total backend disconnects.
  - **Likely fix:** No backend emergency here; focus first on routing, error handling, and layout.

## Member

### Working

- **Login flow**
  - **Observed:** `member@zook.local` -> `Send Code` -> `Verify & Sign In` worked.
  - **Likely fix:** None.

- **Home screen**
  - **Observed:** Membership card, streak/plan counts, and assigned plan rendered correctly.
  - **Screenshot:** `/tmp/zook-audit-member-home.png`
  - **Likely fix:** None.

- **Plan detail progress**
  - **Observed:** Opening `Starter Strength Week` worked, exercise completion toggles updated progress, and the route stayed stable.
  - **Likely fix:** None for the progress update itself.

- **Notifications inbox load**
  - **Observed:** Inbox rendered and showed the expected notification content.
  - **Likely fix:** None for initial load.

- **Settings and logout**
  - **Observed:** Settings opened and logout worked.
  - **Likely fix:** None for the action itself.

### Partial

- **Notification card tap behavior**
  - **Observed:** Tapping a notification did not visibly navigate anywhere in the member pass.
  - **Why it matters:** It is unclear whether the card is meant to be detail-only, open a linked surface, or only mark read.
  - **Likely fix:** Either wire the notification target route, or make the row clearly "mark as read only" so it does not feel broken.

- **Settings layout**
  - **Observed:** Lower actions felt cramped by the dock.
  - **Why it matters:** Important account actions should not sit in the dock collision zone.
  - **Likely fix:** Add bottom padding equal to dock height + safe area.

### Broken

- **Member can mutate assigned workout plan**
  - **Observed:** On the member plan detail, tapping `Add exercise` inserted a new exercise into the assigned plan and changed the progress denominator.
  - **Why it matters:** A member should not be editing the training plan structure directly.
  - **Likely fix:** Remove trainer-authoring controls from the member plan detail or make the screen read-only for member role.

- **Shop layout is severely broken**
  - **Observed:** The member shop had header/content stacking issues, category rail/nav overlap, and general broken composition even though product data loaded.
  - **Why it matters:** The data is there, but the screen does not look production-usable.
  - **Likely fix:** Rebuild the shop screen layout with explicit vertical sections and bottom inset padding. Do not rely on content naturally avoiding the floating dock.

- **Gym details screen renders visually blank**
  - **Observed:** `Open gym details` produced an almost empty dark screen with only the bottom nav visible.
  - **Screenshot:** `/tmp/zook-audit-member-gym-blank.png`
  - **Why it matters:** This looks like a hard broken route to users.
  - **Likely fix:** Inspect the gym details route for a container/scroll/view style bug or content color/opacity issue. The underlying data appears to exist, so the render tree is likely there but not visible.

## Trainer

### Working

- **Login flow**
  - **Observed:** `trainer@zook.local` login worked.
  - **Likely fix:** None.

- **Clients tab**
  - **Observed:** The dedicated clients list rendered and showed `Nisha Member`.
  - **Likely fix:** None.

- **Client detail route**
  - **Observed:** Opening `Nisha Member` from the Clients tab worked. Summary/Plans/Progress/Notes tabs rendered.
  - **Likely fix:** None for the route itself.

- **Save Draft**
  - **Observed:** In client plans, `Save Draft` succeeded and showed `Push Day Strength Block saved as a backend draft.`
  - **Likely fix:** None.

- **AI draft generation**
  - **Observed:** `Generate AI Draft` opened and produced a draft payload with title/goal/difficulty/notes.
  - **Likely fix:** None for the core generation action.

- **Demo scan**
  - **Observed:** `Demo scan` now succeeded and produced an attendance success view.
  - **Likely fix:** None for the scan success path itself.

### Partial

- **Trainer home layout**
  - **Observed:** The trainer dashboard still has large awkward empty space and lower content feels clipped/obscured by the dock.
  - **Screenshot:** `/tmp/zook-audit-trainer-home.png`
  - **Why it matters:** The screen works, but it does not feel intentionally composed.
  - **Likely fix:** Rework the trainer home vertical spacing and apply the same global dock-safe padding fix.

- **AI draft screen lower controls**
  - **Observed:** The generated draft form rendered, but the lower area felt cramped and scrolling was unreliable from the simulator pass.
  - **Why it matters:** Editing generated plans is harder than it should be.
  - **Likely fix:** Make the whole screen a proper scroll container and ensure the dock is not competing with the form footer.

### Broken

- **`Open Client` from trainer home did not navigate**
  - **Observed:** The CTA on trainer home still felt dead/non-navigating, even though the client can be opened successfully from the dedicated Clients tab.
  - **Why it matters:** The headline shortcut on the dashboard is broken while the underlying detail route works.
  - **Likely fix:** Compare the home CTA handler with the Clients list navigation target. It likely points at the wrong route shape or loses params.

- **`Open Plan` from attendance success lands in empty plan library**
  - **Observed:** After trainer demo scan success, `Open Plan` did not take me to the client plan context. It landed in a `No plans assigned` plan library.
  - **Why it matters:** The CTA promises contextual follow-up, but it drops the trainer into the wrong place.
  - **Likely fix:** Route `Open Plan` to the active client plan or latest trainer plan detail, not to the generic member-style plan library.

## Reception

### Working

- **Login flow**
  - **Observed:** `reception@zook.local` login worked.
  - **Likely fix:** None.

- **Desk screen base behavior**
  - **Observed:** Metrics loaded, and the `Verify Code` button stayed disabled when the code field was empty.
  - **Likely fix:** None.

- **Members list**
  - **Observed:** The members screen rendered correctly and timestamp formatting looked human-readable.
  - **Likely fix:** None.

- **Orders verification**
  - **Observed:** Entering `IH-PICK-101` enabled the button, `Verify Pickup Code` succeeded, and `Mark Picked Up` cleared the queue and updated counts from Ready `1` / Done `0` to Ready `0` / Done `1`.
  - **Why it matters:** This is a meaningful improvement over the earlier desk-state drift.
  - **Likely fix:** None on the happy path.

- **Payments screen render**
  - **Observed:** `Audited Collection` rendered with payment modes, amount, reference, desk note, and audit reason fields.
  - **Likely fix:** None for initial render.

### Partial

- **Payments submission not exercised in this pass**
  - **Observed:** I verified render/state presence but did not submit `Record Audited Payment` in this run.
  - **Why it matters:** The screen may still hide submit-time errors.
  - **Likely fix:** Do one dedicated audited payment pass after the global error-toast issue is fixed, so the result is easier to trust.

### Broken

- **Duplicate manual attendance throws a raw unhandled promise error**
  - **Observed:** Recording manual attendance for an already-checked-in member produced a raw app-level error toast rather than a desk-friendly validation response.
  - **Why it matters:** Reception sees a technical exception instead of an operational explanation.
  - **Likely fix:** Catch this API error in the attendance action and show an inline/domain toast like `This member is already checked in today.`

- **The raw reception error pollutes later screens**
  - **Observed:** The same attendance error toast remained visible on Orders, Settings, logout, the login screen, and later role sessions.
  - **Why it matters:** This is the clearest example of the global error-state leak.
  - **Likely fix:** Same as global issue: catch locally and clear transient errors on route change/logout.

## Owner

### Working

- **Login flow**
  - **Observed:** `owner@zook.local` login worked.
  - **Likely fix:** None.

- **Command**
  - **Observed:** Command loaded metrics and recent activity. Revenue and membership data matched the local backend state.
  - **Likely fix:** None for basic data load.

- **Approvals**
  - **Observed:** Join requests and attendance review sections rendered correctly, including empty states.
  - **Likely fix:** None for render.

- **Revenue**
  - **Observed:** Revenue cards and recent transaction list rendered correctly.
  - **Likely fix:** None.

- **Stock**
  - **Observed:** Low-stock and pickup sections rendered correctly, including healthy empty states after reception fulfilled pickup.
  - **Likely fix:** None.

- **Members list and member detail**
  - **Observed:** The owner members list loaded two members and `Nisha Member` detail opened successfully.
  - **Likely fix:** None.

### Partial

- **Owner members list avatar treatment**
  - **Observed:** Member rows showed generic/blank-looking avatar treatment and felt visually unfinished compared with the detail screen initials.
  - **Why it matters:** The list is functional but visually inconsistent.
  - **Likely fix:** Reuse the same initials/avatar component used in member detail.

### Broken

- **Bottom area still collides with dock/toast**
  - **Observed:** Lower cards and lower-page content still fight with the persistent toast and bottom dock.
  - **Why it matters:** The owner shell is readable, but not comfortably scroll-safe.
  - **Likely fix:** Apply the same global bottom inset treatment and clear the persistent error overlay.

- **Copy quality issue**
  - **Observed:** `0 transactions need confirmation` reads awkwardly.
  - **Why it matters:** Not a blocker, but it lowers polish on a dashboard intended for operators.
  - **Likely fix:** Update to `0 transactions need confirmation` -> `0 transactions need review` or `No transactions need confirmation`.

## Admin

### Broken

- **Admin account lands in owner shell and is labeled as Owner**
  - **Observed:** Logging in with `admin@zook.local` produced the same owner command surface with an `Owner` badge and owner bottom nav.
  - **Why it matters:** This hides whether admin-specific routing and permissions actually work.
  - **Likely fix:** If admin is intentionally owner-equivalent, change the badge/copy to reflect that clearly. If not intentional, restore the admin-specific dock and route mapping.

## Member Fixture Note

The former `minor@zook.local` QA track is folded into member QA for this MVP. Guardian/minor backend records can stay provider-ready, but mobile should not expose a separate minor role or separate minor navigation surface until the guardian product flow is intentionally reintroduced.

## Platform Admin

### Broken

- **Platform admin is routed into the member shell**
  - **Observed:** `platform@zook.local` landed on a member-style home with greeting `Good morning, Platform`, a membership card, and member tabs.
  - **Screenshot:** `/tmp/zook-audit-platform-home.png`
  - **Why it matters:** This role currently has no usable mobile control surface and is effectively misclassified.
  - **Likely fix:** Add an explicit platform-admin default route and shell, or block mobile access with a clear unsupported message until the platform surface exists.

## Suggested Fix Order

1. Fix global unhandled error/toast lifecycle.
2. Re-test bottom dock safe-area/content inset handling after the shared padding increase.
3. Re-test role routing for `ADMIN` and `PLATFORM_ADMIN`.
4. Rebuild member shop layout.
5. Do a second focused pass on reception payments submit behavior after the global error leak is fixed.
6. Keep guardian/minor policy gates backend-ready, but do not maintain a separate minor mobile QA track for MVP.

## Coverage Gaps

These are the areas I did not fully exercise in this pass:

- Real camera-based scanning flow
- Push notification deep links
- Reception `Record Audited Payment` submit result
- Owner/admin destructive management actions

Even with those gaps, the current audit is enough to start a meaningful stabilization pass because the major issues are already clear and reproducible.
