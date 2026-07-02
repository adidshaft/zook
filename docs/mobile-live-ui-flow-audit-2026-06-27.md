# Zook Mobile Product Audit

Date: 2026-06-27

Scope: deep live audit across iOS Simulator and Android Emulator for member, owner/admin, trainer, and reception flows, plus auth/reset behavior.

This pass focuses on:
- what is visible
- where it is visible
- whether it is visible at the right moment
- whether it causes local congestion
- whether the same information is repeated elsewhere
- whether the flow feels predictable, natural, and understandable

## Method

- Ran the app live on both iOS and Android simulators.
- Used direct route switching, bottom-tab navigation, row taps, and detail-flow attempts.
- Inspected iOS live state via simulator screenshots and simulator mirror.
- Inspected Android live state via adb interaction, UI tree inspection, and live screenshots.
- Cross-checked a few suspected issues in code to confirm whether the UI is structurally duplicating itself or just styled poorly.

## Coverage

Directly reviewed in the current pass:
- Member: home, progress, membership, classes
- Owner: home, members, approvals, more
- Trainer: clients, plans
- Reception: desk, members, payments, entry QR, member detail

Still unreliable:
- Public/auth reset back to clean login
- Some Android role jumps
- Several iOS `__qa-open` detail routes

## Executive summary

The product has strong brand intent and some solid primitives, but many screens are arranged as if every piece of information deserves hero treatment. The result is repetition, congestion, slow scanning, and flows that feel heavier than the jobs they support.

The most consistent product problem is not that information is missing. It is that the same information is often shown two or three times in adjacent components, while the actual next action is delayed or visually diluted.

The second major problem is role and route instability. The app often does not behave like a trustworthy state machine. When route helpers land on the wrong screen, when tabs use inconsistent naming, or when an auth reset does not actually reset auth, the interface feels less intuitive even before visual design is judged.

## Highest-impact issues

1. Reception payments repeats the same money state in too many places and does not lead the operator through a clean sequence.
2. Member home stacks too many top-priority cards before the real next action.
3. Reception desk spends the first screenful repeating queue status instead of helping the user act on the queue.
4. Owner home duplicates dashboard meaning in adjacent summary systems.
5. Trainer and reception naming is inconsistent across labels, placeholders, and tabs.
6. Cross-platform product language is not aligned enough for one mental model.
7. Deep-link and role-switch instability weakens trust in the app.

## Cross-app systemic issues

### 1. Too much top-of-screen chrome

- The environment/status pill (`Test data` or `Demo`) is unusually prominent and visually competes with product content.
- Branch/org selectors often look like pills or status chips instead of context controls.
- Bells, avatars, role chips, org chips, and branch chips tend to occupy a lot of vertical and horizontal attention before the actual screen purpose begins.

### 2. Repetition instead of progression

- Many screens introduce a context card, then repeat the same context again in a summary block, then repeat it again inside a task module.
- Instead of moving the user through a sequence, the screens keep re-describing the same state.

### 3. Low data density for staff workflows

- Owner, trainer, and reception surfaces are too roomy for operational work.
- Rows and cards are styled like showcase panels rather than tools for repeated use.
- Too little actionable list content is visible above the fold.

### 4. Naming drift

- The same concept appears under different labels:
  - `Scan`
  - `Entry QR`
  - user-reported `Show QR`
  - `Display entry QR`
- `Desk`, `Front desk`, and `Reception desk` all appear.
- Trainer flow uses `Clients` as the screen concept while the search field still says `Search members`.

### 5. Cross-platform inconsistency

- iOS surfaces are heavily dark and glassy.
- Android surfaces are often bright/light and flatter.
- The product does not feel like one system being adapted cross-platform. It feels like two visual interpretations of the same data.

## Flow-by-flow audit

## Member

### Member home

What is visible:
- Greeting
- streak meta
- membership access card
- banners
- main workout / membership-state card
- classes strip
- coaching strip
- progress stat strip

What is wrong:
- The page front-loads too many “important” things.
- Membership access is shown first, then banners can repeat membership urgency or profile urgency, then the main state card can again describe membership or workout state.
- The user sees multiple stacked blocks before reaching the most likely daily action.

Why it feels congested:
- Every block is card-like and visually framed.
- The user has to read through several equal-weight surfaces to decide what matters.
- The page feels like a dashboard made of alerts rather than a daily routine flow.

Structural issue confirmed in code:
- `MembershipAccessCard` always renders first in [apps/mobile/app/(member)/index.tsx](/Users/amanpandey/projects/zook/apps/mobile/app/(member)/index.tsx:235).
- Then `renderHomeCard(state)` can render another membership-state card such as expired, pending, or no-plan in [apps/mobile/src/features/member/home/render.tsx](/Users/amanpandey/projects/zook/apps/mobile/src/features/member/home/render.tsx:12).
- That means users with membership issues can get repeated membership messaging and stacked CTAs.

What should change:
- Make the top of home answer one question first: “What should I do now?”
- Collapse membership summary and membership-state urgency into one surface when the membership itself is the issue.
- Reduce banner count or visually subordinate it behind the primary daily action.

### Member membership

What is visible:
- active plan
- remaining days / visits
- benefits
- renewal CTA
- pause flow
- cancel flow

What is good:
- The screen is more coherent than home because it is focused on one job.

What is wrong:
- The screen still feels dense and management-heavy for a member.
- Pause, renew, and cancel are all presented in one stacked surface without enough guidance about priority or consequence.
- The pause reasons (`Medical`, `Travel`, `Injury`, `Other`) appear quickly, but the user does not first get a very clear mental model of whether they should renew, pause, or cancel.

### Member progress

What is visible:
- segmented top action
- week stats
- daily habits
- recent workouts

What is good:
- Stronger hierarchy than home.
- The page purpose is obvious quickly.

What is still off:
- The top action bar and stat cards still take a lot of room.
- The screen starts with metrics before behavior.
- The habit and workout sections are more useful than the tiles, but they start too low.

### Member classes

What is visible:
- large schedule cards
- detailed descriptions
- large `Book class` CTAs

What is wrong:
- Too few classes fit on one screen.
- The repeated CTA treatment makes the list loud.
- This is a schedule-scanning task, but the layout behaves like a set of promotional cards.

## Owner / Admin

### Owner home

What is visible:
- offline banner
- environment pill
- context selector
- a `Today` summary block
- then another dashboard metric system
- then `Needs attention`

What is wrong:
- Two summary systems appear back-to-back and partly repeat meaning.
- The user reads `Today check-ins` once in the top summary block and then again in the larger metric cards below.
- Approvals are also repeated across adjacent systems.

Why this is a problem:
- The screen asks the user to re-parse “what matters now” twice before getting to actual work.
- The large metric cards are attractive, but they delay actionable information.

Structural issue confirmed in code:
- `todayItems` and `metrics` are both rendered on the owner home route, causing repeated KPI concepts according to the code explorer.

Additional issue:
- The offline banner is very large and visually dominant. It also compresses the useful top area of the screen.

### Owner members

What is visible:
- role/org/branch context
- page title + total count
- large search bar
- filter chips
- then only two member rows

What is wrong:
- The search + chip stack consumes a large chunk of the first viewport.
- Only two records are visible, which is poor density for an owner list.
- Each row contains avatar, name, truncated email, masked phone, status chip, and chevron. It is readable, but not efficient.

Why it feels slow:
- The user spends too much screen height on controls before list content.
- The rows are large for how little action they expose.

### Owner approvals

What is visible:
- summary counts
- large `Approve all`
- request list
- scan review queue below

What is wrong:
- `Approve all` is too visually aggressive for a risky bulk action.
- The screen repeats queue status:
  - counts at the top
  - request section title
  - scan review queue section
- The user is told there is a queue in multiple ways before the screen helps them efficiently clear it.

### Owner more

What is visible:
- long list of owner tools

What is wrong:
- The entire list is visually flat.
- Frequent and infrequent tasks have the same weight.
- The page looks complete, but not curated.

## Trainer

### Trainer clients

What is visible:
- title `Clients`
- subtitle with a person name plus access-control note
- search
- status chips
- client cards

What is wrong:
- The subtitle is odd. Showing `Nisha Menon · client list is access-controlled` under the page title is not useful framing.
- The search placeholder says `Search members` even though the page concept is `Clients`.
- The filter chips take meaningful height before the list begins.
- Rows are larger than the amount of information justifies.

Structural issue confirmed in code:
- Trainer clients uses the shared `MemberList`, so trainer copy inherits member language in places.

### Trainer plans

What is visible:
- title
- one small status section
- then a sparse list

What is wrong:
- The screen feels underpowered and under-filled compared with the rest of the app.
- It reads like a placeholder or staging surface, not a confident core workflow.
- There is not enough density or structure for actual plan management.

Structural issue confirmed in code:
- Trainer plan and diet responsibilities are split in a way that likely duplicates concepts across routes, according to the code explorer.

## Reception / Front desk

### Desk

What is visible:
- alert/queue card
- three metrics
- verify code module
- entry QR button
- recent activity
- queue section

What is wrong:
- The same queue state is described at least three times before the queue itself becomes actionable:
  - alert card
  - metrics
  - queue section
- Verification is a core task, but it is pushed below repeated status framing.
- The screen starts by telling the user the queue needs action, then keeps explaining that fact rather than guiding the user into the action.

Structural issue confirmed in code:
- The desk route separately renders `OperationalQueueCard`, `MetricGrid`, and queue sections for the same queue state in [apps/mobile/src/features/reception/components/desk-screen.tsx](/Users/amanpandey/projects/zook/apps/mobile/src/features/reception/components/desk-screen.tsx:65).

Additional label issue:
- The center tab is currently visible as `Entry QR` in the live build.
- The code for reception tabs points to `nav.scan`.
- The desk card button says `Display entry QR`.
- The user also reported seeing `Show QR`.
- This is one concept with too many names.

### Reception members

What is visible:
- branch context
- a “select member first” card
- multi-select control
- search
- member cards

When a member is selected, what becomes visible:
- selected member block
- clear action
- another clear chip
- desk actions card
- membership row
- attendance note form
- then the member list still continues below with the same selected member visible again

What is wrong:
- This is one of the clearest examples of the app repeating the same state too many times.
- The user already selected a member, but the screen still keeps the full list visible directly below, with the selected member repeated.
- `Clear` appears in multiple places.
- The selected member state is represented as:
  - top selected-member card
  - desk-actions heading subtitle
  - membership row
  - the selected member row still visible in the list below

Why it feels unnatural:
- The flow does not collapse once a member has been chosen.
- The screen keeps one foot in “search for a member” mode and one foot in “act on the selected member” mode.

Structural issue confirmed in code:
- The list remains present even after a member is selected; the screen conditionally adds action modules above it instead of transitioning the surface.

### Reception payments

What is visible on iOS:
- branch context
- select member
- amount/mode metric grid
- amount received field
- desk payment review card
- then more collection details below

What is wrong:
- Amount is shown too many times.
- Mode is shown too early and too prominently.
- Member context is not established strongly enough before the payment machinery begins.
- The flow feels like several payment widgets stacked together instead of one clear sequence:
  1. choose member
  2. confirm what is due
  3. choose collection mode
  4. enter received amount
  5. review once
  6. submit

Structural issue confirmed in code:
- The screen shows amount/mode in a metric grid, then an amount field, then a money summary card, then a second collection block that includes another amount field in [apps/mobile/src/features/reception/components/payments-screen.tsx](/Users/amanpandey/projects/zook/apps/mobile/src/features/reception/components/payments-screen.tsx:55).
- `dueAmount` is derived from `amountPaise` in [apps/mobile/src/features/reception/desk-context.tsx](/Users/amanpandey/projects/zook/apps/mobile/src/features/reception/desk-context.tsx:420), so the screen structure is at real risk of blurring “amount due” with “amount received”.

Why it feels confusing:
- The user should not have to decode whether `₹0` refers to due, received, review total, or empty member state.
- The screen currently asks them to do exactly that.

### Reception entry QR

What is visible:
- QR code
- manual code
- refresh controls
- rolling/static controls

What is good:
- This screen is cleaner than most of reception.

What is wrong:
- The naming around this function is inconsistent across the app.
- `Rolling` and `Static` are visible but not self-explanatory enough.
- The center tab label currently describes the object (`Entry QR`) rather than the action (`Scan`) or user goal (`Check in`).

## Specific duplication problems found

### Information repeated in adjacent surfaces

- Member home repeats membership state in multiple stacked cards.
- Owner home repeats “today” KPIs in adjacent summary systems.
- Reception desk repeats queue urgency before the actual queue.
- Reception members repeats selected-member state across multiple layers.
- Reception payments repeats amount and mode across summary, edit, and review surfaces.

### Repeated or conflicting labels

- `Entry QR`, `Scan`, `Display entry QR`, and user-reported `Show QR`
- `Front desk`, `Desk`, `Reception desk`
- `Clients` page with `Search members`

### Repeated actions

- Reception members shows multiple clear/select/reset affordances at once.
- Owner approvals over-emphasizes both single-item review and bulk approval simultaneously.

## Flow reliability issues that affect product quality

- iOS login deep-linking stayed inside an authenticated shell during the audit.
- Android login deep-linking also failed to restore a clean login state.
- Several Android role jumps returned to a home shell instead of the requested target.
- Some iOS detail helpers resolved to the wrong surface.
- In reception on Android, attempting to jump straight to payments could land back on the desk flow, weakening navigation trust.

These are not just QA inconveniences. They change how intuitive the product feels because the app stops behaving like a predictable system.

## What should be fixed first

1. Simplify reception payments into one linear flow and remove duplicated amount/mode surfaces.
2. Collapse member home into one primary top action with supporting cards, not several equally loud top cards.
3. Rebuild reception desk so queue state is summarized once, then acted on.
4. Reduce duplicated KPI systems on owner home.
5. Make selected-member flows collapse properly in reception members.
6. Standardize naming for scan / QR / entry / desk concepts.
7. Fix route/reset reliability so the app behaves consistently.

