# Zook Mobile UI Audit - 2026-06-27

## Audit scope

This audit reviews the current iOS and Android mobile experience with a senior product design lens, focused on the public/auth surface plus the main role-based flows for:

- Member
- Owner
- Admin
- Trainer
- Receptionist

The goal was not code QA. The goal was to judge whether the product is clear, trustworthy, efficient, and appropriately designed for repeated daily use.

## Evidence captured in this run

Screenshots were saved in `/tmp/zook-ui-audit`.

1. `ios-current.png` and `android-member-home.png` - Member home. Health: `fair`.
2. `ios-owner-home-2.png` and `android-owner-home.png` - Owner dashboard home. Health: `poor`.
3. `ios-owner-members-2.png` and `android-owner-members.png` - Owner members list. Health: `fair`.
4. `ios-trainer-clients-2.png` plus Android trainer shell captures (`android-trainer-clients.png`, `android-trainer-clients-2.png`). Health: `fair`.
5. `ios-reception-payments-3.png` plus Android reception shell capture (`android-reception-payments.png`). Health: `poor`.
6. `ios-member-classes.png` - Member classes. Health: `fair`.
7. `ios-owner-billing.png` - Owner billing. Health: `poor`.
8. User-supplied login screenshot in this thread plus [login-route.tsx](/Users/amanpandey/projects/zook/apps/mobile/src/features/route-surfaces/login-route.tsx) for auth UI structure. Health: `poor`.

## Evidence limits and verification gaps

- `@Computer` was used where possible, but the Simulator accessibility bridge repeatedly timed out, so final evidence relied on direct simulator screenshots and emulator captures.
- Android deep links did not always land on the exact requested child route; in a few cases they dropped into the parent role shell instead. That is itself a usability and state-management risk, but it also means a few Android notes are based on adjacent role screens rather than the exact matching child screen.
- Accessibility observations here are visual and structural only. They do not prove keyboard, screen-reader, or dynamic-type behavior.

## Executive read

The app has a strong brand direction, but it is currently over-designed for operational work and under-designed for speed. The same pattern repeats across owner, trainer, and reception flows: too much vertical space, too many oversized cards, too much decorative chrome, and not enough dense, scannable decision support.

The member experience is closer, but it still over-prioritizes theatrical layout over immediate utility. The two platforms also do not feel like the same product right now: iOS is a dark neon control surface, while Android reads as a light, airy business app. That level of divergence weakens trust, recognition, and supportability.

## Strengths

- Brand voice is recognizable and memorable.
- Large tap targets generally reduce accidental taps.
- High-level navigation is understandable once a user learns each role shell.
- Role separation is conceptually clear.
- The product already has route coverage for a broad set of real gym operations.

## Cross-platform UX risks

### 1. The platforms do not feel like one product

What is wrong:

- iOS and Android use materially different visual systems: dark neon glass on iOS, light neutral cards on Android.
- Shared screens do not create a reliable cross-platform mental model.

Why it matters:

- Support, training, screenshots, release notes, and team demos all become harder.
- Users switching devices may feel like they are using different apps.

Should fix:

- Define one cross-platform visual system with platform-native tuning, not platform-level reinvention.
- Keep hierarchy, component weight, and information density consistent even if colors or blur treatment differ slightly.

Should remove:

- Large stylistic swings between platforms that change the product's perceived personality and utility level.

### 2. Information density is too low for operational roles

What is wrong:

- Owner, trainer, and reception screens spend too much height on headers, pills, decorative spacing, and oversized cards.
- Core work screens show too few actionable items above the fold.

Why it matters:

- These are repeated-use workflows for people at work, not occasional browse surfaces.
- Staff should be able to scan status, exceptions, and next actions in seconds.

Should fix:

- Reduce header height.
- Compress filter chips.
- Use tighter list rows for members, approvals, queues, and exceptions.
- Reserve large cards for one or two truly critical alerts, not every block.

Should remove:

- Repeated full-width, tall cards for basic list/navigation content.

### 3. Bottom navigation is visually overpowering

What is wrong:

- On iOS especially, the bottom nav is too tall, too glossy, and visually heavy.
- It competes with content instead of quietly supporting it.
- It also obscures the lower edge of cards and list content.

Why it matters:

- Persistent nav should disappear into muscle memory.
- Here it becomes a major visual event on every screen.

Should fix:

- Reduce nav height.
- Reduce blur and border drama.
- Lower the visual weight of the central scan action, or reserve that prominence only in flows where scan is the primary task.

Should remove:

- The oversized floating-dock look in dense work surfaces.

### 4. Top chrome is busy and inconsistent

What is wrong:

- `Test data`, branch chips, role identity, notification button, avatar, and org labels stack up quickly.
- The layout feels negotiated rather than composed.

Why it matters:

- Users need immediate orientation, not a pile of pills.

Should fix:

- Collapse environment state into a quieter developer-only banner or smaller badge.
- Standardize one orientation pattern: role + branch + notifications + account.
- Decide what belongs in the top bar versus the page body.

Should remove:

- Prominent `Test data` placement in the primary visual hierarchy.

### 5. Card styling is overused

What is wrong:

- Cards are doing too many jobs: layout container, grouping, navigation, alerting, form framing, and visual decoration.
- As a result, hierarchy becomes muddy and repetitive.

Why it matters:

- When every block is a framed card, nothing feels truly important.

Should fix:

- Use plain grouped lists for repeatable operational content.
- Use framed panels only for alerts, summaries, and distinct workflows.

Should remove:

- Card-inside-card feeling created by inset panels and repeated rounded outlines.

### 6. Status semantics are not crisp enough

What is wrong:

- Status chips vary in prominence and style.
- Some screens use color and badge treatment well; others bury the actual state inside a large decorative surface.

Why it matters:

- Staff decisions depend on scanning active, expired, pending, flagged, approved, and unpaid states quickly.

Should fix:

- Standardize status color, shape, placement, and importance across every role shell.
- Make primary state visible before metadata.

### 7. Search and filter controls are too large for the amount of content shown

What is wrong:

- Search fields and filter chips consume a large amount of vertical space before the first useful row.

Why it matters:

- This is expensive on smaller devices.

Should fix:

- Reduce chip height.
- Prefer horizontally scrollable compact tabs or segmented controls.
- Keep the first list item visible with search and filters present.

## Accessibility risks

- Large type is used generously, which helps readability, but hierarchy is sometimes so exaggerated that scanning becomes slower, not faster.
- Color is doing too much semantic work in several places; some status meaning may be lost for low-vision or color-deficient users.
- Glass/blur overlays on iOS risk legibility when they overlap live content.
- Truncated labels such as `Today check...` reduce clarity and screen-reader predictability if the underlying accessibility label is not corrected.
- Dense dark surfaces with soft-outline cards may create low-contrast boundaries for some users.

## Role and flow audit

### Public and authentication

Routes:

- `/login`
- `/gyms`
- `/gyms/[username]`
- `/join/[username]`
- `/onboarding`
- `/onboarding/language`
- `/onboarding/value-props`

Issues:

- The login hero is stylish but top-heavy; it spends precious first-screen real estate on branding and decoration instead of reducing sign-in friction.
- The error state shown in the user screenshot (`We couldn't reach Zook`) is too generic and too final-feeling. It blames connection without offering next steps, retry state, status insight, or fallback.
- The sign-in method toggle is visually large relative to the simple choice it represents.
- Social sign-in buttons are visually equal to the primary login path, which can create hesitation instead of clarity.
- Terms and privacy copy sits too loudly in the card for a frequent, transactional action.

Should fix:

- Move trust and recovery above style for auth.
- Add more explicit recovery actions: retry, use another method, check gym code, contact support.
- Show inline progress and response state around OTP requests.
- Reduce decorative weight so the input and primary action are the first thing the eye lands on.

Should add:

- Better offline/reachability messaging.
- Support path for demo or seeded accounts.
- Clear state when OTP is rate-limited or blocked.

Should remove:

- Decorative auth chrome that competes with the form.

### Member

Primary routes:

- `/`
- `/progress`
- `/scan`
- `/plan`
- `/classes`
- `/membership`
- `/shop`
- `/notifications`
- `/tracking-history`
- `/tracking-entry`
- `/assistant`
- `/you`
- `/profile/*`

Observed issues:

- Member home is visually strong, but the first viewport is too dominated by stacked promo-like cards.
- `Pickup available` and `Complete your profile` are both large enough to compete with the primary workout block.
- The workout card is attractive, but it is also very tall, pushing the next core action (`Book a class`) below the navigation conflict zone.
- The scan action is oversized for a tab that is not always the user's immediate need.
- On iOS, the nav overlays the lower edge of the home feed and makes the layout feel cramped despite all the whitespace.

Flow-specific recommendations:

- Home: prioritize the next workout, attendance/scan, and one secondary prompt only. Collapse the rest.
- Classes: move from oversized repeated cards toward more compact schedule rows with clear date, coach, availability, and CTA state.
- Membership: billing status, visits left, renewal date, and next payment should sit in a tighter summary block with one primary action.
- Tracking and progress: these routes should be denser than the home surface and support quick logging, not only browsing.
- Shop: keep pickup/order states highly legible and avoid marketing-style product framing inside the member utility shell.
- Profile and `You`: reduce setup nags once the user has seen them once or dismissed them.

Should add:

- Dismiss/snooze controls for persistent nudges like profile completion or pickup reminders.
- More compact summary modules for visits left, upcoming class, and last check-in.

Should remove:

- Repeated full-height prompt cards on the member home surface.

### Owner and admin

Primary routes:

- `/owner`
- `/owner/members`
- `/owner/member/[id]`
- `/owner/approvals`
- `/owner/revenue`
- `/owner/stock`
- `/owner/billing`
- `/owner/more`
- `/owner/plans`
- `/owner/staff`
- `/owner/referrals`
- `/owner/payouts`
- `/owner/exercise-library`
- `/owner/coupons`

Observed issues:

- The dashboard tries to feel premium, but the result is slower to scan than it should be.
- KPI cards are too large and too equal in weight.
- The owner members list is closer to usable, but the top stack still spends too much space on header chrome before the user reaches the actual list.
- Billing appears especially heavy: too many large framed sections for what should be a precise financial control area.
- The `Needs attention` area is heading in the right direction conceptually, but it should dominate the owner home much earlier and with denser, more prioritized exception rows.

Flow-specific recommendations:

- Dashboard home: compress summary metrics into a denser 2-row grid or horizontal stat strip; elevate exceptions over generic KPIs.
- Members list: keep avatar, name, membership state, dues/risk, and last attendance visible in one scan line.
- Member detail: use a fixed action rail or stable summary header rather than stacking multiple card sections before the meaningful controls.
- Approvals: design as a triage queue, not a dashboard.
- Revenue and billing: privilege reconciliation, anomalies, pending actions, and date filters over decorative metric blocks.
- Staff/plans/payouts/coupons: these should behave like compact admin tables or dense setting lists, not consumer content cards.

Should add:

- Persistent date/filter scope on financial screens.
- Stronger exception prioritization on home.
- Better row-level action affordances in lists.

Should remove:

- The current amount of card framing on financial and admin surfaces.

### Trainer

Primary routes:

- `/trainer`
- `/trainer/clients`
- `/trainer/plans`
- `/trainer/payouts`
- `/trainer/classes`
- `/trainer/pt`
- `/trainer/clients/[id]`
- `/trainer/clients/[id]/plan`
- `/trainer/clients/[id]/sessions`
- `/trainer/clients/[id]/diet`

Observed issues:

- Trainer home mixes summary, navigation, and task prompts into one tall stack with too much whitespace.
- The client list on iOS is usable, but still too large per row for the amount of information being shown.
- The current list emphasizes initials and card framing more than plan status, last contact, next session, or program risk.
- Tabs for `Clients`, `Plans`, and `Payouts` are still heavier than they need to be.

Flow-specific recommendations:

- Clients list: show program status, next session, and overdue items earlier.
- Client detail: keep progress, active plan, attendance, and next required trainer action above fold.
- Plan creation: optimize for repeated authoring speed with tighter forms and step grouping.
- Sessions/diet: use compact timelines and actionable logs instead of broad stacked panels.
- Payouts: design as a ledger/summary surface with tight date segmentation and payout status states.

Should add:

- Quick filters for needs-plan, session-due, diet-overdue, inactive, and high-value clients.
- Row-level quick actions from the client list.

Should remove:

- Home-screen tiles that duplicate navigation without improving prioritization.

### Receptionist

Primary routes:

- `/reception`
- `/reception/members`
- `/reception/members/[id]`
- `/reception/payments`
- `/reception/orders`
- `/reception/class-roster`
- `/reception/verification/[recordId]`
- `/scan`

Observed issues:

- Reception flows are the most workflow-sensitive in the app, yet they are still wrapped in oversized surfaces that slow scanning.
- The payment flow on iOS looks serious, but not fast. It feels like a presentation of sections rather than a crisp desk transaction tool.
- The Android reception shell shows the same pattern: large alerts and large metric cards before the most likely next desk action.
- For desk work, the user should never wonder what the next required action is.

Flow-specific recommendations:

- Front desk home: lead with today's queue, unresolved exceptions, and one-tap actions.
- Member search: optimize for fast lookup, membership state, dues, and last action.
- Payments: structure as a transactional form first, review second. Right now the preview and container framing take too much space.
- Orders and pickup: treat pickup readiness and pending handoff as queue items, not decorative cards.
- Verification and scan review: these should behave like urgent inbox items with clear approve/reject/escalate states.

Should add:

- Strong keyboard-style flow even on touch: search, select member, select action, confirm.
- Better empty-state and blocked-state copy for desk staff.

Should remove:

- Non-essential promotional or referral surfaces from the first screen of reception unless explicitly relevant to today's queue.

## Action-by-action design callouts

### Search

- Search fields are visually large but not information-rich enough.
- Add result count, recent filters, and faster row density.

### Scan and check-in

- The scan action is given brand-level prominence.
- Keep that prominence only in roles where scan is the primary repeated task.

### Payments

- Payment entry needs to feel deterministic and fast.
- The UI currently spends too much room on containers and too little on immediate transaction clarity.

### Approvals and exceptions

- These are the real high-stakes operational tasks.
- They should behave like focused queues with severity, age, assignee, and next action visible immediately.

### Notifications

- Notification affordance is visually strong, but the surrounding chrome already carries too much weight.
- The badge and bell should be quieter and more integrated.

### Profile and account

- Avatar/account controls are oversized on some screens relative to their importance in the active task flow.

## What should be fixed first

1. Unify iOS and Android into one clearer cross-platform system.
2. Reduce bottom-nav height and visual weight, especially on iOS.
3. Rework owner, trainer, and reception shells for much higher information density.
4. Turn approvals, queues, billing, and payment flows into operational tools instead of premium dashboard cards.
5. Simplify top chrome and de-emphasize `Test data`.
6. Improve auth error recovery and trust messaging.

## What should be added

- Dismissible prompts and smarter persistence for repeated nudges.
- Compact list patterns for members, clients, approvals, orders, and exceptions.
- Better queue states: age, urgency, due amount, next action, assignee.
- Stronger blocked/offline/retry states in auth and desk workflows.
- Platform parity guidelines for component behavior and hierarchy.

## What should be removed

- Excessive card framing.
- Decorative nav glass that competes with content.
- Large role-shell headers that consume first-screen space.
- Promotional or referral blocks in core work surfaces unless contextually relevant.

## Final recommendation

The product should keep the brand, but move toward a calmer, denser, more operational interface for staff roles. Member can stay more expressive, but even there the app should trade some spectacle for clarity and speed. Right now the UI often looks expensive while behaving inefficiently. The next pass should optimize for rhythm, scanability, and trust.
