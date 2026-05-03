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

Addressed in code after earlier and current audit passes:

- Platform admin now routes to an explicit mobile web-handoff screen instead of falling into the member shell.
- Platform admin web handoff CTA is now visible in the first viewport instead of hiding below the fold.
- Admin keeps the owner/admin command shell but is labeled and docked as Admin.
- Member plan detail no longer exposes add/delete exercise controls; members can only mark assigned exercises and complete workouts.
- Reception manual attendance catches duplicate-attendance API errors inline instead of leaking an unhandled app-level exception.
- Shared bottom-dock scroll padding was increased for docked mobile surfaces.
- Web now has a gym setup entry point and a real Public Profile editor for owners.
- The shared gym profile route now hydrates backend/public profile data, facilities, gallery photos, and app links, but the mobile simulator render still needs a layout fix.
- Trainer home no longer shows hardcoded PT/feedback metrics; its headline client shortcut links directly to an assigned client.
- Attendance success now routes trainers back to trainer plan work instead of dropping them into the member plan library.
- Rejected/flagged attendance results now show a desk-help-needed state instead of the approved check-in treatment.
- Owner payment exception copy now reads as a review state, including a clean zero state.
- Reception now exposes a visible sign-out action from the desk shell.
- Expo Go no longer registers push notifications or shows the persistent warning banner during simulator QA.
- `http://localhost:3001/login` now loads correctly in Chrome during local web QA.
- Current pass increased shared dock-safe padding again and tightened the first viewport on owner, trainer, settings, reception, shop, and gym profile screens.
- Member shop now uses an explicit search/category/product section stack instead of a cramped segmented rail directly above the docked grid.
- Reception now exposes both `Settings` and `Sign out` from the main desk shell.
- Owner command metrics now use a horizontal summary rail so `Needs attention` begins higher on standard iPhone simulator heights.
- Gym profile and settings now use explicit flex scroll frames with horizontal screen padding to avoid blank/off-canvas renders.
- Attendance result screens now render real branch and plan labels from backend data, and duplicate scans explain `Already checked in today.` instead of looking like a fresh approval with placeholder labels.
- Platform web handoff now opens a prefilled web login with `redirect=/platform`; if the browser already has a web session, `/login` forwards to the intended platform/dashboard surface.
- Profile, trainer client detail, reception member operations, owner member detail, owner approvals, and owner stock received a duplicate-copy cleanup pass so first viewports move faster into new context/actions.
- Notification rows now say whether a tap will open a linked route or simply mark the item read.

## Screenshots

- Member home: `/tmp/zook-audit-member-home.png`
- Member gym details blank state: `/tmp/zook-audit-member-gym-blank.png`
- Trainer home layout: `/tmp/zook-audit-trainer-home.png`
- Historical platform admin misroute: `/tmp/zook-audit-platform-home.png`

## Global Findings

### Broken

- **Trainer home vertical offset needs re-test**
  - **Observed:** Even after reloading the bundle and switching tabs, trainer home opened with a large dead zone above the first meaningful content and lower cards pushed into the dock zone.
  - **Why it matters:** This reads as a broken screen composition, not just a cramped layout.
  - **Current fix:** Reduced trainer screen top padding/gaps and made the priority client card the direct shortcut. Needs simulator confirmation.

- **Bottom dock overlaps content on multiple surfaces**
  - **Observed:** The bottom nav still sits on top of content on member, trainer, owner, reception, and settings surfaces. In a few places it visually clips CTAs, lower cards, or form controls.
  - **Why it matters:** Some actions feel half-hidden, and screens read like they were not padded for the dock height.
  - **Current fix:** Shared `bottomNavContentPadding` was raised to `224`, with additional per-screen breathing room on owner, trainer, reception, and settings. Needs simulator confirmation.

- **Platform web handoff loses auth context**
  - **Observed:** Tapping `Open Platform Web` now opens the web surface, but it lands in an unauthenticated browser login rather than dropping directly into the platform dashboard.
  - **Why it matters:** The route classification is fixed, but the cross-surface handoff still feels incomplete because platform operators have to authenticate again inside the browser.
  - **Current fix:** The mobile CTA now opens `/login?redirect=/platform&email=...`, the web login pre-fills the platform email, and `/login` redirects authenticated browser sessions to the requested platform route. This is clearer and lower-friction, but not a one-time mobile-to-web auth transfer.

- **Duplicate information is showing up as a UX bug**
  - **Observed:** Several screens repeat the same entity information in the header and again in the first card without adding new context. Clear examples from this pass:
    - trainer client detail shows `Nisha Member` in the header and then again in the first summary card
    - owner member detail shows `Nisha Member` and `member@zook.local` in both the header and the hero card
    - trainer profile shows `trainer@zook.local` in the page header and then repeats both trainer identity and org membership in the first card
    - owner approvals/stock repeat queue labels in top stat cards and then immediately restate the same queue labels as section titles
  - **Why it matters:** This wastes above-the-fold space, pushes real actions lower, and makes screens feel noisy or unfinished.
  - **Current fix:** Trainer client detail now uses a coaching snapshot instead of repeating the client identity, profile header copy no longer repeats the email above the identity card, reception member rows are selectable with a separate desk-actions card, owner member detail keeps identity in the header, and owner approval/stock section labels no longer repeat the summary metrics.

### Working

- **Backend integration is generally alive**
  - **Observed:** OTP request/verify, member home, trainer clients, reception desk, reception pickup verification, and owner dashboard data all loaded from the running local stack.
  - **Why it matters:** Most problems in this pass were UI/state-management issues rather than total backend disconnects.
  - **Likely fix:** No backend emergency here; focus first on routing, error handling, and layout.

- **Web and mobile are sharing the same live org state**
  - **Observed:** Chrome at `http://localhost:3001/` and the simulator both showed coherent owner/reception numbers during this pass, including `2` attendance scans and the current pickup/stock state.
  - **Why it matters:** The integration problem is mostly presentation consistency, not missing data.
  - **Likely fix:** Keep using the shared backend as the truth source while stabilizing mobile layout.

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

- **Attendance result now shows real context**
  - **Observed:** After rescanning from the live web attendance token, the member attendance result now shows `Iron House Main`, `Monthly Unlimited`, and the duplicate message `Already checked in today.` instead of generic placeholders like `Assigned branch` / `Active membership`.
  - **Likely fix:** None for this fix path; keep verifying duplicate and non-duplicate outcomes.

### Partial

- **Notification card tap behavior**
  - **Observed:** Tapping a notification did not visibly navigate anywhere in the member pass.
  - **Why it matters:** It is unclear whether the card is meant to be detail-only, open a linked surface, or only mark read.
  - **Current fix:** Rows now show `Open` when metadata resolves to a route and `Mark read` when the inbox is the only destination. Needs simulator confirmation with seeded route metadata.

- **Settings layout**
  - **Observed:** Lower actions felt cramped by the dock.
  - **Why it matters:** Important account actions should not sit in the dock collision zone.
  - **Current fix:** Shared settings/profile surfaces now use explicit scroll frames and extra dock-safe bottom padding.

- **Trainer-style duplicate context needs the same scrutiny on member surfaces**
  - **Observed:** The attendance result still uses a large hero plus a second dense detail card for the same event, and similar member-facing routes should be reviewed for repeated status/copy blocks.
  - **Why it matters:** Even when technically correct, duplicate event framing makes the screen longer and pushes follow-up actions lower.
  - **Likely fix:** Consolidate hero copy and detail summaries when they are describing the same single event state.

### Needs Re-Test

- **Member assigned plan controls need re-test**
  - **Observed:** On the member plan detail, tapping `Add exercise` inserted a new exercise into the assigned plan and changed the progress denominator.
  - **Why it matters:** A member should not be editing the training plan structure directly.
  - **Current fix:** Member plan detail no longer exposes trainer authoring controls in the current code. Needs simulator confirmation against the assigned-plan detail route.

- **Shop layout was severely broken**
  - **Observed:** The member shop had header/content stacking issues, category rail/nav overlap, and general broken composition even though product data loaded.
  - **Why it matters:** The data is there, but the screen does not look production-usable.
  - **Current fix:** Replaced the cramped segmented category rail with a horizontal chip rail, added an explicit `Available now` section, and made the shell horizontally padded/dock-aware. Needs simulator confirmation.

- **Gym details screen rendered visually blank**
  - **Observed:** `Open gym details` produced an almost empty dark screen with only the bottom nav visible.
  - **Screenshot:** `/tmp/zook-audit-member-gym-blank.png`
  - **Why it matters:** This looks like a hard broken route to users.
  - **Current fix:** Added an explicit flex scroll frame and screen padding to the shared gym profile route. Needs simulator confirmation.

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

- **Trainer detail screens repeat client identity too aggressively**
  - **Observed:** On trainer client detail, `Nisha Member` is shown in the page header and then again in the first profile card. The same first viewport also repeats assignment framing (`assigned client only`, `Assigned member`, `Assigned to you`) without adding much new information.
  - **Why it matters:** The most important trainer action area loses vertical space to redundant identity/status copy.
  - **Current fix:** The first card is now a coaching snapshot with goal, plan load, and access context. It no longer repeats the client name from the header.

- **Trainer plan work repeats context from the selected client**
  - **Observed:** `Plan work` restates `Nisha Member`, goal context, and active-plan state that are already present on the Clients and client-detail surfaces.
  - **Why it matters:** The trainer navigation feels like moving between screens that echo the same context instead of progressing into new work.
  - **Likely fix:** Reduce repeated identity copy and use plan-work space for actionable plan status, blockers, or last edit state instead.

- **Trainer profile repeats identity and org context**
  - **Observed:** The shared profile route for trainer shows `trainer@zook.local` in the header, then repeats trainer identity and org membership again in the first card.
  - **Why it matters:** Shared profile space is being spent on repeated labels instead of account controls, which also makes sign-out/settings harder to scan.
  - **Current fix:** Profile header now uses role/account-setting copy and leaves the identity/email detail to the profile card.

### Needs Re-Test

- **`Open Client` from trainer home did not navigate**
  - **Observed:** The CTA on trainer home still felt dead/non-navigating, even though the client can be opened successfully from the dedicated Clients tab.
  - **Why it matters:** The headline shortcut on the dashboard is broken while the underlying detail route works.
  - **Current fix:** The old CTA was replaced by a pressable priority-client card that uses the same `/trainer/client/{memberUserId}` route as the Clients tab. Needs simulator confirmation.

- **`Open Plan` from attendance success lands in empty plan library**
  - **Observed:** After trainer demo scan success, `Open Plan` did not take me to the client plan context. It landed in a `No plans assigned` plan library.
  - **Why it matters:** The CTA promises contextual follow-up, but it drops the trainer into the wrong place.
  - **Current fix:** Attendance success now looks up trainer clients and routes trainers to the first assigned client with an active plan, falling back to trainer plan work only if none exists. Needs simulator confirmation.

- **Trainer `Demo scan` depends on local-mode backend**
  - **Observed:** In the current pass, once the web/API side was switched to a production-style `next start` runtime to bypass the broken `next dev` web bundle, trainer `Demo scan (dev only)` returned `Developer scan is available only in local mode.`
  - **Why it matters:** This is a valid environment constraint, but it can look like a product regression during QA unless called out explicitly.
  - **Likely fix:** Keep the audit marked as environment-specific here, and avoid treating this as a product bug unless it also reproduces against the normal local dev server.

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

- **Desk sign-out**
  - **Observed:** The new reception `Sign out` action is visible from the desk header and returns cleanly to the login screen.
  - **Likely fix:** None for the logout action itself.

- **Orders verification**
  - **Observed:** Entering `IH-PICK-101` enabled the button, `Verify Pickup Code` succeeded, and `Mark Picked Up` cleared the queue and updated counts from Ready `1` / Done `0` to Ready `0` / Done `1`.
  - **Why it matters:** This is a meaningful improvement over the earlier desk-state drift.
  - **Likely fix:** None on the happy path.

- **Payments screen render**
  - **Observed:** `Audited Collection` rendered with payment modes, amount, reference, desk note, and audit reason fields.
  - **Likely fix:** None for initial render.

- **Duplicate manual attendance now fails inline**
  - **Observed:** Re-recording attendance for an already checked-in member now shows `This member is already checked in today.` inline on the screen instead of leaking a raw app-level exception.
  - **Likely fix:** None for the domain error path itself.

- **Audited payment rejection now stays in-domain**
  - **Observed:** Submitting `Record Audited Payment` against an already-active subscription now shows `This membership is already active...` inline instead of throwing a noisy technical error.
  - **Likely fix:** None for the handled error path itself.

### Partial

- **Members screen composition**
  - **Observed:** The `Member Snapshot` card and manual-attendance controls are usable, but the dock initially sits on top of the lower portion of the form until the user scrolls.
  - **Why it matters:** A desk flow should not hide the very button the receptionist needs most.
  - **Likely fix:** Reserve explicit bottom breathing room for long operational forms and avoid placing critical controls inside the default dock collision zone.

- **Members screen repeats the selected member too aggressively**
  - **Observed:** `Nisha Member` appears in the visible list and then immediately again in `Member Snapshot`, along with another repeated active-membership state, before any materially new desk context is introduced.
  - **Why it matters:** The receptionist loses first-viewport space to repeated identity instead of seeing status, payment risk, or the desk action area sooner.
  - **Current fix:** The member list now has explicit selectable rows, and the lower card is `Desk actions` with membership, manual amount, and last check-in instead of a second identity snapshot.

- **Payments form composition**
  - **Observed:** The lower part of the audited-collection form, especially the audit warning and submit region, starts behind the dock on first render.
  - **Why it matters:** Finance actions look unfinished even when the underlying validation is working.
  - **Current fix:** Reception scroll content now reserves additional dock-safe padding. A sticky above-dock submit footer is still a future polish option if simulator retest shows the form remains too long.

### Broken

- No new hard reception blockers reproduced in the current pass after the desk utility actions and inline error handling fixes.

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

- **Owner command first viewport needs re-test**
  - **Observed:** On command, the fourth metric card (`Expiring soon`) begins under the dock, and the transition into `Needs attention`/`Recent activity` feels clipped in the initial viewport.
  - **Why it matters:** The most important summary screen still looks cramped and unfinished on a standard iPhone simulator size.
  - **Current fix:** Replaced the wrapping command metric grid with a shorter horizontal summary rail.

- **Owner approvals and stock still clip their lower empty-state cards**
  - **Observed:** The lower halves of the empty-state cards on `Approvals` and `Stock` sit too close to or partly behind the dock at rest.
  - **Why it matters:** Even healthy zero states should look intentionally laid out, not merely technically reachable by scrolling.
  - **Current fix:** Owner shell now reserves more dock-safe bottom padding. Needs simulator confirmation on Approvals and Stock.

- **Owner detail screens repeat member identity unnecessarily**
  - **Observed:** On owner member detail, `Nisha Member` and `member@zook.local` are shown in the page header and then repeated again inside the top summary card before any new information appears.
  - **Why it matters:** The first viewport burns space on repeated identity instead of member status, risk, payment posture, or next actions.
  - **Current fix:** Owner member detail keeps name in the header and changes the top card to member-since/status context instead of repeating name/email.

- **Owner approvals and stock duplicate queue labels**
  - **Observed:** `Approvals` uses top stat cards for `Join requests` and `Scan reviews`, then immediately repeats those same concepts as section headings below. `Stock` similarly leads with `Low stock` / `Pickups` stat cards and then restates them as `Low-stock products` / `Pending pickups` sections.
  - **Why it matters:** This repetition makes the screen feel longer and more repetitive than the actual amount of information warrants.
  - **Current fix:** Lower section labels now read as action lists: `Request list`, `Scan review queue`, `Products to reorder`, and `Orders awaiting handoff`.

## Admin

### Working

- **Admin account uses the shared owner/admin command shell**
  - **Observed:** Re-testing `admin@zook.local` now lands in the shared owner/admin command surface with an `Admin` badge instead of presenting as Owner.
  - **Why it matters:** This looks intentional now and matches the mobile product direction that admin shares the execution cockpit with owner.
  - **Likely fix:** None for routing unless product wants a separate admin shell later.

## Member Fixture Note

The former `minor@zook.local` QA track is folded into member QA for this MVP. Guardian/minor backend records can stay provider-ready, but mobile should not expose a separate minor role or separate minor navigation surface until the guardian product flow is intentionally reintroduced.

## Platform Admin

### Working

- **Platform admin now lands on a dedicated web-only mobile surface**
  - **Observed:** Re-testing `platform@zook.local` now opens a `Use the web control room` screen instead of dropping into the member shell.
  - **Why it matters:** The role is no longer misclassified on mobile, and the product boundary is clearer.
  - **Likely fix:** None for the route classification itself.

### Partial

- **Platform web handoff opens login, not the live control room**
  - **Observed:** The `Open Platform Web` CTA is now visible on first render and does launch the browser surface, but the handoff lands at the unauthenticated Zook web login rather than the already-authenticated platform dashboard.
  - **Why it matters:** The role boundary is clear, but the actual cross-device workflow still has friction and can feel like a broken handoff.
  - **Current fix:** The CTA now opens the platform login route with redirect and email prefilled, and the copy explicitly explains that the browser may ask for OTP. Existing authenticated web sessions are redirected straight through. Full auth-preserving mobile-to-web handoff remains intentionally unimplemented.

## Suggested Fix Order

1. Re-test dock-safe layout on the highest-friction screens after the current code pass: trainer home, member shop, member gym details, owner command, reception members, and reception payments.
2. Re-test platform handoff with and without an existing web cookie: authenticated browsers should land on `/platform`; unauthenticated browsers should show the prefilled platform login and continue after OTP.
3. Rebuild member shop further only if simulator still shows stacking after the category rail/product section change.
4. Confirm the shared gym profile data is visible instead of rendering off-canvas.
5. Re-test a successful reception payment record once a valid pending subscription fixture exists.
6. Keep guardian/minor policy gates backend-ready, but do not maintain a separate minor mobile QA track for MVP.

## Coverage Gaps

These are the areas I did not fully exercise in this pass:

- Real camera-based scanning flow
- Push notification deep links
- Reception `Record Audited Payment` successful submit result
- Owner/admin destructive management actions

Even with those gaps, the current audit is enough to start a meaningful stabilization pass because the major issues are already clear and reproducible.
