# Mobile UI Cleanup Completion Audit

Last updated: 18 June 2026

Branch: `mobile-ui-cleanup`

This audit records the current evidence for the active mobile/web/product cleanup goal. It is not a
production launch certification. The branch has code-side coverage for the requested mobile
leftovers, web UX items, and product Part A/B rollout artifacts, but the goal cannot be marked
fully complete until the human/device/provider gates below have external evidence.

## Code-side evidence

### Mobile leftovers

- `R1` Android elevation cleanup: `66f92cd R1: add Android elevation to scan tab action`,
  followed by `a46bfdd R1: add Android elevation to scan action`.
- `R2` mobile header hierarchy decision: `967d7bc R2: document the mobile header scale split`,
  followed by `c9aa14b R2: document mobile header hierarchy`.
- `R3` mobile typography aliases: `8154aca R3: collapse typography aliases onto canonical scale`,
  `b9444d5 R3: prune legacy typography aliases`, `942d400 R3: prune mobile typography aliases`,
  and `5c8d251 R3: align branch selector in mobile headers`.
- `R4` contrast audit/token/nav selected state: `e68f638 R4: audit real token palettes for
  contrast`, `2c972e4 R4: align mobile tab highlights across nested routes`, and
  `951d65f R4: use real tokens in contrast audit`.
- Follow-up mobile UX fixes are also on the branch, including branch-selector alignment, owner
  access actions, Apple sign-in iOS-only behavior, loading wordmark visibility, and bottom-bar
  selected-state consistency.
- Later mobile cleanup follow-ups are tracked in `docs/mobile-ux-ui-findings.md` and include:
  `01481b9 fix: hide disabled assistant surface`,
  `7a20087 chore: remove primitive nav shim`,
  `625e6ee fix: remove reception success pulse cue`,
  `737b3d2 chore: remove unused mobile sso auth surface`,
  `27c6db6 chore: remove empty mobile domain modules`,
  `afaf468 chore: remove unused mobile api-client alias`,
  `ff0f2d0 chore: remove primitive feedback shim`,
  `36713b0 chore: remove unused mobile skeleton exports`,
  `109d592 chore: flatten mobile card primitive barrel`,
  `e656f18 chore: remove mobile primitive category shims`,
  `f1fd888 chore: remove placeholder mobile readmes`,
  `d6bddba chore: remove unused mobile domain hooks`,
  `20be054 chore: trim unused mobile query keys`,
  `2a24111 chore: narrow mobile domain component exports`,
  `5124b8b chore: remove unused mobile tracking displays`,
  `aebf45c chore: remove trainer ai draft placeholder`,
  `3ec422b chore: remove unused mobile utility helpers`,
  `47cd603 chore: remove no-caller mobile exports`,
  `8702d2c chore: trim internal mobile helper exports`,
  `ece052c chore: remove unused profile default exports`,
  `e94673a chore: remove redundant mobile comments`,
  `de2c5e2 docs: remove stale mobile ai draft audit note`,
  `ab36047 fix: neutralize offline demo fallback copy`, and
  `548e93c docs: update mobile cleanup audit for demo fallback`.
- The mobile settings i18n table no longer carries unused privacy-history "latest export/deletion"
  strings, removing unreachable copy that suggested freshness metadata.
- Mobile push registration errors use stable unavailable-build wording instead of hinting at future
  availability when Expo project metadata is absent.
- Later cue-removal and code-surface cleanup evidence includes:
  `b4914acf` (mobile button glow shadow),
  `d30ab4c3` (mobile screen ambient layers),
  `13800705` (product placeholder glow),
  `2f5150ce` (scanner line glow layer),
  `13426641` (dead mobile card glow API),
  `4e9c3201` (mobile card glow emphasis),
  `be1f2c4f` (mobile route background glows), and
  `f21dd724` (launch fallback background orbs).

### Web UI/UX plan

- Blockers are covered by:
  `71cf0db WB1: confirm + error handling on destructive money actions`,
  `2e05369 WB1: confirm + harden destructive actions`,
  `d1b30e2 WB1: confirm payment history refunds`,
  `ee81cd9 WB2: replace dead guardian consent redirects`,
  `560fb4f WB3: add checkout failure and expiry recovery`, and
  `77dfcdc WB4: add standalone otp verification route`.
- High-priority web work is covered by:
  `0eafd17 WH1: remove dead dashboard search control`,
  `18d1d19 WH2: link dashboard bell to notifications`,
  `66595c9 WH3: preserve funnel tier and referral plan context`,
  `d944d92 WH4: add coach shell nav and remove dead me links`,
  `1ae9366 WH5: trap focus in dashboard menu and confirms`,
  `cd2fffc WH6: make notification preview and step validation explicit`,
  `33306b2 WH6: remove duplicate notification wizard framing`,
  `4fc5040 WH7: strengthen public metadata and noindex rules`, and
  `8808953 WH8: add inventory load more affordance`.
- Medium/polish/systemic web work is covered by `WM*`, `WP*`, and `WS*` commits, including:
  `ceab894 WM1`, `d282b3e WM3`, `fbf8911 WM4`, `e88e8f5 WM5`, `cd25594 WM6`,
  `aaad283 WM8`, `1c1475a WM9`, `7862bb4 WM10`, `8531bdf WM12`,
  `06c7678 WP1`, `e1d218b WP2`, `a6b1656 WP3`, `dca85b5 WP4`, `98d6c9c WP6`,
  `47a88bc WP7`, `1d74924 WP8`, `1cb6c28 WP9`,
  `1b7ad66 WS1`, `ffc6f32 WS1`, `39e6113 WS1`, `7a6da6f WS1`,
  `d5524f2 WS2`, `d5c7bf6 WS2`, `3a12eb9 WS2`, `3fb4b50 WS2`, `e4c7743 WS2`,
  `697d6ed WS2`, `ce13221 WS3`, `3806393 WS4`, `434d1b1 WS5`,
  `eb9f8a9 WS6`, `442fe28 WS6`, `d65841c WS6`, and `4cec462 WS6`.
- `docs/launch-readiness-report.md` records the web UX phases as code-side done, including Hindi
  parity, axe coverage, public metadata, destructive-action confirmation, and dashboard flow fixes.
- Later web cue-removal and copy-guard evidence includes:
  `a3296b3f` (web primary control glow shadows),
  `702dbba5` (web selected card glow),
  `41316816` (dead web glow utility),
  `b0ab6d7e` (dead full glow token),
  `ee42324c` (fallback workspace wording),
  `4ee7beb1` (radio-card selected glow),
  `31acabe2` (dead exported glow tokens),
  `3672de40` (static status-dot naming),
  `a97b9d70` (primitive status-dot halo),
  `404ae284` (release-readiness demo wording),
  `f695bbda` (dashboard sample-data copy guard),
  `424b2afb` (dashboard disabled-cue copy guard),
  `efbcfedf` (AI launch-gate unavailable-state wording), and
  `1080b2fc` (visual cue regression evidence gate).
- Platform fallback status copy now describes the demo shell as test-data mode instead of presenting
  it as unavailable live data.
- Public status translations no longer carry unused "live status" explanatory copy that is not
  rendered by the status page.
- The public status page pill uses neutral status labeling instead of a live-status cue.
- Public homepage product copy uses current/app-store wording instead of live-workflow and
  live-store cues.
- Platform service-status readouts use configured-service wording instead of generic ready-for-use
  cues.
- Checkout recovery and member QR permission copy now use direct next-step wording instead of
  fresh/ready phrasing.
- Razorpay retry and retired guardian-consent copy now use neutral current/new-flow wording instead
  of fresh/latest recovery cues.
- Razorpay and dashboard lazy-load placeholders no longer use pulse animation, and staff invite
  acceptance copy uses a direct sign-in step instead of a ready-state cue.
- Demo AI usage copy now uses prepared-review wording, and the mobile empty activity state uses a
  neutral history icon instead of a pulse cue.
- Public after-join guidance and mobile trainer demo summaries now describe workflow/training
  context directly instead of using ready-state cues.
- Mobile scan, join approval, and browser-return copy now use neutral available/entered/approved
  wording instead of ready/as-soon-as cues.
- Attendance QR supporting labels now use direct QR/active wording instead of extra ready/live cues
  while preserving the existing tested page heading.
- Setup, branch-pricing, privacy export, and event-template copy now avoid MVP/later/latest/ready
  wording while preserving the same next-step meaning.
- Member pickup banner and reception verification toast now use available/verified wording instead
  of extra ready-state cues.
- Pricing and platform action labels now use expanded/account wording instead of generic advanced
  cues.
- Platform provider summaries now use configured/active wording in rendered copy while preserving
  provider diagnostic status handling.
- Desk and shop pickup surfaces now use pickup-order wording instead of extra ready-order labels
  while leaving the underlying order status model intact.
- Shop payment notifications now use available/collect wording instead of ready-pickup copy while
  preserving order activation semantics.
- Member import rate-limit and mobile document-generation errors now use wait/unavailable wording
  instead of later/not-ready cues.
- Delete confirmations now describe subscription, order-history, and assignment constraints
  directly instead of using generic unused-plan/product wording.
- Mobile autopay component state now uses enabled naming instead of live-state helper wording while
  preserving accepted autopay statuses and UI output.
- Dashboard sign-out hydration guard now uses mounted naming instead of ready-state naming while
  preserving the disabled-until-mounted behavior.
- Mobile profile membership progress fallback now uses unavailable-detail wording instead of a
  syncing-state cue.
- Dashboard notification history fallback now uses direct unavailable-body wording instead of a
  syncing-state cue.
- Gym profile setup gallery guidance now gives the direct upload instruction instead of exposing
  Google Maps sync/connectivity state.
- Dashboard overview data badge now uses current/updating wording instead of fast/server-truth
  implementation cues, with matching helper naming.
- Mobile member plan detail header now keeps the trainer-source label without the extra synced
  cue.
- Attendance QR footer now uses a direct active-state label instead of an attendance-sync cue.
- Mobile scan and layout comments now use precise sizing language instead of casual magic/just
  wording.
- Dashboard AI usage readout now uses data current/local wording instead of provider
  connected/test cues.
- Platform support and payment detail copy now uses system/payment wording instead of seeded-test
  and provider-test cues.
- Platform provider diagnostics now use a neutral current-check fallback instead of a just-now
  timestamp cue.
- Platform incident checklist now uses clear provider-check wording instead of configured/default
  status labels.
- Platform health and incident panel descriptions now use service/support wording instead of
  provider/setup lane phrasing.
- Platform service diagnostics row copy now uses setup-required/service-active wording instead of
  needed/running phrasing.
- Platform incident checklist now uses service issue/status wording instead of provider-gap/status
  cues.
- Platform support console description now states the review workflow directly instead of saying
  records are loaded by default.
- Platform incident checklist step now uses service-dashboard wording instead of provider-dashboard
  wording.
- Platform incident checklist clear-state now uses service-check wording instead of provider-check
  wording.
- Web login SSO script failure now reports sign-in service wording instead of provider wording.
- Start-gym onboarding checklist now uses gym/main-branch wording instead of organization/default
  branch wording.
- Dashboard member roster and product empty states now use gym wording instead of organization
  wording.
- Gym profile, membership-plan, and staff loading states now use gym wording instead of
  organization wording.
- Shop orders empty state now uses gym wording instead of organization wording.
- Dashboard settings overview now uses gym-profile wording instead of organization-profile
  wording.
- Dashboard settings navigation and refund error copy now use gym/main-branch wording instead
  of organization/default-branch wording.
- Mobile shared request errors and renewal confirmation copy now use gym/payment-service wording
  instead of organization/provider wording.
- Platform operations service and gym-account controls now avoid provider/organization/soft-delete
  wording in visible labels, prompts, and fallback errors.
- Mobile account switching, branch primary-location controls, and assisted-draft loading copy now
  avoid organization/default/operational wording in user-visible states.
- Dashboard member empty states, notification summary, payment checklist, and branch deactivation
  copy now avoid loaded-roster/org-snapshot/pilot-traffic/operational-flow wording.
- Platform support/broadcast, shop status, class schedule, settlement loading, and attendance
  loading copy now avoid operational-record/notice, shop-traffic, branch-scope, payment-state,
  and ledger wording.
- Notification overview escalation metadata now uses member-message wording instead of
  operational-notice wording.
- Member roster, membership-plan, coaching-plan, and assistant-draft loading/empty copy now
  avoids current/history phrasing where the surrounding section already provides context.
- Platform gym-account, assistant-activity, and safety-report states now avoid redundant
  currently/current phrasing.
- Branch commerce controls, payment reconciliation, dashboard branch checklist, attendance
  summary, and reports snapshot now use owner-facing plans/products, receipt, and branch wording instead of
  setup/current/proof/scope wording.
- Mobile stat strip primitive no longer carries an unused per-metric icon path after member home
  moved to label/value-only metrics.
- Platform support payment and impersonation tables now use payment-record/account/gym wording
  instead of ledger/target/org-scope wording.
- Platform support access section now avoids impersonation-history wording in visible title and
  empty state.
- Shop status and order queue copy now uses stock-branch wording and avoids redundant
  current/currently phrasing.
- Platform health cockpit copy now avoids production-traffic, pilot-traffic, and loaded-queue
  wording in readiness and safety states.
- Platform payment records and staff coaching review copy now avoid test/production and
  production-output wording in visible descriptions.
- Dashboard join-request queue copy now uses plain approval wording instead of
  approval-required phrasing.
- Platform checklist and service readouts now use gym/trial/ready-review wording instead of
  tenant/pilot/configured/setup wording.
- Platform service-health table rows now use ready/review-needed wording instead of
  setup-complete/setup-required wording.
- Dashboard membership summary now uses explicit expiring-membership wording instead of the
  vague all-current cue.
- Billing cancellation and refund tracker copy now uses direct billing-period/refunded-payment
  wording instead of repeated period-end/current/marked-refunded phrasing.
- Platform incident and health cockpit copy now uses gym-account/gym-impact wording instead of
  tenant-risk/tenant-impacting/destructive-tenant phrasing.
- Dashboard payment, attendance, broadcast, member roster, and CSV import counts now use plain
  item-count wording instead of loaded/virtualized implementation cues.
- Dashboard settings, reports, and classes copy now uses gym/service/selected-branch wording
  instead of organization/provider/scope/snapshot/operational/setup cues.
- Mobile offline and saved-check-in copy now uses save/confirm/update wording instead of
  sync/synced labels in visible states.
- Gym profile, onboarding, membership-plan, and platform service readouts now use
  profile/details/ready-review wording instead of repeated setup/configured cues.
- Dashboard overview, getting-started, class scheduling, settings, and refund confirmation copy
  now avoids snapshot/current/setup/scope/provider phrasing in visible and accessibility labels.
- Coach progress, trainer preferences, notification templates, scan trial action, platform service
  summary, and billing CTA copy now avoid leftover snapshot/current/default/test/setup cues.
- Mobile membership/payment hints and web status/queue/broadcast/refund helper copy now use shorter
  member/status/queue/console/correction wording instead of current/available/already/history phrasing.
- Mobile plan empty states and web plan/staff/profile helpers now use direct show/share wording
  instead of will-appear/available/use-this/get-set-up phrasing.
- Member home pickup banner now uses pickup-available wording and local helper naming instead of
  the old ready-state cue.
- Member progress and plan empty states no longer opt into decorative workout/clipboard icons
  where the empty-state titles already name the missing content.
- Owner command all-clear empty state no longer opts into a decorative checkmark icon where the
  title already carries the state.
- Platform mobile billing hero no longer renders a decorative shield icon beside a headline that
  already explains the surface state.
- Trainer plan-work summary no longer renders a decorative clipboard icon beside title/subtitle
  copy that already explains the planning state.
- Trainer plan rows no longer repeat a reader icon beside client/active-plan text when the action
  button already carries the plan cue.
- Owner low-stock product rows no longer repeat a cube icon where the section, product name, and
  stock-count subtitle already identify the row.
- Trainer home client, feedback, and plan-builder rows no longer repeat neutral person/chat/reader
  icons where section headings and row copy already identify the content.
- Member membership browser-return and no-membership cards no longer render neutral open/card icons
  beside already-clear titles, body copy, and actions.
- Trainer client sessions adherence row no longer repeats a neutral analytics icon beside the
  title, explanatory subtitle, and percentage chip.
- Trainer client plan draft prompt no longer repeats a neutral reader icon beside text that
  already names the saved draft and review action.
- Gym discovery referral and no-results cards no longer render neutral gift/search icons beside
  already-clear title and helper copy.
- Trainer client not-found card no longer renders a neutral person icon beside the clear title and
  back-to-clients action.
- Tracking history body-measurement empty state no longer repeats helper copy under an already
  clear title inside the Body progress card.
- Trainer payouts breakdown empty state no longer repeats helper copy under the already-clear
  No earnings title.
- Member progress recent-workouts empty state no longer repeats helper copy under the already-clear
  No workouts logged title and top-level Log workout action.
- Settings support report-problem row no longer repeats helper copy where the row title and
  expanded feedback form already explain the action.
- Member plan exercise-preview loading state no longer repeats a decorative barbell icon beside
  the already-clear loading title and detail copy.
- Owner member detail not-found state no longer repeats a neutral people icon beside the clear
  Member not found title.
- Member referral card no longer repeats a neutral gift icon beside the already-clear
  Refer a friend title and share action.
- Shop cart and no-products empty states no longer repeat helper bodies under already-clear
  titles, and the unused English/Hindi translation keys were removed.
- Public gym profile fallback header no longer shows future-loading helper copy where the title
  and screen loading/error states already provide context.
- Public gym profile details no longer repeat the facility/trainer/access/location summary above
  the details card that already exposes those fields directly.
- Member profile membership empty state no longer repeats vague activation helper copy where the
  empty-state title and Find gyms action already define the next step.
- Public gym profile trainer, join-path, and plan sections no longer repeat helper subtitles or
  not-published empty-state bodies where headings, rows, and timeline steps already provide context.
- Mobile classes empty state no longer repeats branch-scoped absence copy below the already-clear
  No classes title and branch-aware header.
- Web classes schedule no longer repeats selected-branch/capacity helper copy above rows that
  already show branch scope, class count, and per-class capacity.
- Member plan detail empty state no longer repeats trainer-assignment helper copy below the
  already-clear No plan assigned title.
- Web shop status card no longer repeats a generic order-movement description above readouts
  that already label stock branch, payment, pickup, and revenue states.
- Web member diet page no longer repeats no-plan helper copy below the already-clear No active
  diet plan heading.
- Dashboard member roster no longer repeats a member-directory description above filters,
  search, profile counts, and the roster table.
- Dashboard membership catalog and coaching library no longer repeat static plan-catalog
  descriptions where the headings, counts, managed-on note, and tables already provide context.
- Dashboard settlement queue empty state no longer repeats payment/pickup follow-up copy below
  the queue title, badge, filters, and Desk handoff note.
- Dashboard staff operational roles and plan delivery sections no longer repeat static
  descriptions where headings, counts, and assignment/plan rows already define the surfaces.
- Dashboard payment reconciliation no longer repeats a generic review description above readouts
  and checklist cards that already name settled, pending, failed, receipt, cash, and refund work.
- Dashboard membership plan ladder no longer repeats plan-pricing/visibility/member-count
  description above a plan-count badge and table columns that already expose those fields.
- Dashboard class scheduling no longer repeats a create-next-class helper sentence above
  branch, class type, capacity, time, trainer, notes, and submit controls.
- Dashboard low-stock watch no longer repeats inventory-sorted helper copy above the low-stock
  count, product form, and product list.
- Dashboard plan-growth links no longer repeat a member-acquisition helper sentence above
  discount, offer, and referral cards that already include labels, descriptions, and counts.
- Dashboard member summary no longer repeats roster-scope helper copy above member counts,
  pending-request badges, and KPI tiles.
- Dashboard payment history no longer repeats payment-category helper copy above the payment
  count badge, export action, and member/status/mode/amount table.
- Dashboard revenue opportunities no longer repeats renewal, stock, and notification helper copy
  above readouts that already label those opportunities directly.
- Dashboard branch list no longer repeats address, manager, and active-branch helper copy above
  the active count, branch rows, setup chips, and branch actions.
- Dashboard add-branch form no longer repeats location, contact, manager, and hours helper copy
  above step chips and fields that already name those inputs.
- Trainer diet plans no longer repeat create/review/edit/remove helper copy above the new-plan
  action and plan table actions.
- Dashboard recent attendance no longer repeats selected-gym check-in helper copy above the scan
  count, export action, and attendance table.
- Dashboard body-composition timeline no longer repeats trainer-facing progress/photo helper copy
  above the photo count, timeline cards, and measurement labels.
- Dashboard AI assistant activity no longer repeats assisted-draft helper copy above the managed-on
  note and draft activity table.
- Dashboard AI launch readiness no longer repeats usage/review/assisted-plan helper copy above
  readouts that already label those signals directly.
- Dashboard settlement queue no longer repeats payment/pickup review helper copy above the
  unsettled badge, Desk note, filters, and order status notes.
- Dashboard product inventory empty state no longer repeats no-products helper copy below the
  already-clear Inventory is clear title.
- Dashboard join request queue no longer repeats pre-payment review helper copy above the
  pending badge, request status pills, and approve/reject actions.
- Dashboard role-capability guide no longer shows a share hint above role sections that already
  explain the permissions directly.
- Dashboard notification history empty state no longer repeats compose-first-update helper copy
  below the already-clear No notifications sent title.
- Platform safety review no longer repeats watchlist helper copy above readouts that already
  label open reviews, paused gyms, and recent assistant activity.
- Mobile payment, attendance, profile, owner chart, and workout empty states plus web templates,
  messages, body-progress, billing, attendance, and assistant-draft empty states now avoid
  will-appear/available phrasing.
- Mobile activity, pickup, trainer bio, invite-plan steps, and web admin/referral/branch/billing
  status copy now uses show/ready/attached wording instead of will-show/available/already/appears.
- Platform service/assistant, trainer nutrition, notification compose/summary, mobile plan/pickup,
  coach web, and shop status copy now avoids quick-view/private/available/will-helper phrasing.
- Notification send/template, gym-account empty state, settlement, body-progress, profile gallery,
  join-reject, and branch confirmation copy now uses direct present-tense wording instead of
  will/available/visible/private phrasing.
- Mobile member plan, tracking, shop return, membership checkout, trainer queues, owner
  empty states, reception pickup, and profile-switch prompts now use direct present-tense copy
  instead of will-appear/will-refresh/will-be-marked phrasing.
- The owner dashboard no longer renders the contextual Zook tip card or exposes it as a
  customization widget, leaving the bottom strip focused on AI usage and staff activity.
- The mobile classes route no longer renders a separate instructional helper card; branch
  selection now sits in the header while the class list remains the primary surface.
- Coupon, offer, and plan-shape forms no longer render redundant HelpHint popovers where
  labels, placeholders, and option descriptions already explain the control.
- Staff invite and branch-hours forms no longer render duplicate HelpHint popovers around
  already-visible summary or helper copy.
- Trainer home metric cards no longer render decorative hint labels under already-clear
  client, active-plan, and needs-plan counts.
- The trainer Plan builder row no longer repeats manual/template guidance through a subtitle
  and status chip when the row title already describes the action.
- Settings, language, and notification settings headers no longer include redundant
  "choose" subtitles when the title and controls already define the screen.
- Account, privacy, and appearance settings headers no longer repeat category subtitles
  above controls that already provide the needed context.
- Tracking entry and workout history headers no longer repeat action/category subtitles
  above segmented controls, fields, and history cards that already define the surface.
- Member plan preview and meal logging sections no longer repeat helper subtitles above
  exercise rows, preset chips, and form fields that already show the available actions.
- Reception desk, payment, and order metric cards no longer render second-line category
  hints under already-clear labels and values.
- Owner approval and revenue summary metric cards no longer render static category hints
  under already-clear labels and amounts.
- Account settings no longer repeats contact-verification helper copy above labeled
  email/mobile OTP controls, while preserving per-field current-value and status hints.
- Product photo upload no longer repeats the square/slightly-wide guidance already shown
  in the surrounding product photos copy.
- Reception bulk-attendance and payment collection sections no longer repeat action
  subtitles above already-labeled forms and primary actions.
- Trainer client sessions no longer repeats the empty feedback state with both
  "No member feedback yet" and a separate Waiting chip.
- Gym profile gallery no longer repeats the 15-photo upload limit in a separate helper
  paragraph when the upload control already shows the count.
- Platform mobile billing copy no longer leads with instructional quick-check phrasing,
  while preserving the web-console boundary for pricing and policy changes.
- Trainer plan rows no longer render an extra Open chip next to the dedicated client-detail
  action button.
- Trainer home no longer repeats the Today section label as a row chip, and member plan
  feedback copy now asks for a note without quick-action framing.
- Trainer home, coach web, desk member selection, and dashboard overview copy no longer
  repeats quick-action/reference/open-log cues beside already-labeled rows, charts, and links.
- Coach and dashboard KPI tiles no longer render decorative caption labels where the
  metric titles already identify roster, plan, check-in, revenue, approval, and stock counts.
- Trainer detail headers no longer repeat a static Trainer chip, and trainer, reception,
  and owner section headers no longer carry subtitles that duplicate nearby form/list state.
- Platform, trainer payouts, member plan, and shop history headers no longer include static
  overview/source/history subtitles or chips where the route title and rows already provide context.
- Coach and reports web surfaces no longer render decorative refresh/snapshot cues, and desk
  payment helper copy now states the payment modes directly without "use this" instruction text.
- Reception workspace subtitles no longer repeat the Reception role on every route, and owner
  More removes subtitles that duplicate its account/workspace controls.
- Reception desk/payment sections and owner billing/member headers no longer repeat form,
  activity, billing, or profile context already shown by their controls and rows.
- Web member and desk KPI tiles no longer render decorative roster/clear/handoff captions
  where the tile labels and counts already carry the state.
- Trainer plan work no longer repeats active-plan context through header subtitles and
  review/clear chips, and owner approvals removes the duplicate pending-decision subtitle.
- Coach, trainer diet, and notification web panels no longer show static surface labels or
  repeated recent-update descriptions when dynamic notices, titles, and actions carry context.
- Owner More no longer repeats the web dashboard capability list above the dedicated web
  handoff row.
- Trainer client sessions no longer repeats the waiting adherence state in both subtitle
  and chip, while preserving the completion percentage chip when feedback exists.
- Member payments no longer repeats the empty payment state with a second "records show here"
  line under the already-clear "No payments yet" title.
- Trainer diet plans no longer repeats the empty diet-plan state with an additional
  create-plan description next to the New diet plan action.
- Membership catalog creation no longer shows a static Catalog pill beside an already-labeled
  create form and dynamic offer count.
- Product creation and staff invite forms no longer show static Create/Invite pills beside
  headings that already name the form action.
- Platform support and incident sections no longer show static Console/Use-during-support
  pills beside headings that already identify those workflows.
- Mobile platform SaaS sections no longer show cached/count chips beside section headings when
  the list and loading state already provide the context.
- Notification template and sent-message empty states now use direct no-content wording instead
  of "show here" placeholders.
- Reception, trainer, owner chart, body-composition, payment, and subscription empty states now
  use direct no-content wording instead of repeated "show/appear here" placeholders.
- Mobile owner/member/trainer empty states and dashboard payment/join-request descriptions now
  use direct empty/loading/action wording instead of placeholder-location phrasing.
- Member diet/plan, coach planner, staff plan-delivery, and public trainer bio fallbacks now use
  direct empty-state wording instead of placeholder-location phrasing.
- Pricing, global loading, platform shell/loading, coach-client, trial-billing, and referral
  sections no longer show static pills that repeat the page or card heading.
- Start-gym, member profile, and member-import surfaces no longer show static pills that repeat
  the hero or form instructions.
- Gallery photo and public incident-history placeholders now use direct input/empty-state wording
  instead of placeholder-location phrasing.
- Platform service readouts now use active/configured wording instead of generic ready-for-use
  cues.
- Dashboard loading empty states for plans, members, attendance, drafts, settlement, and coaching
  no longer repeat the same loading message in both title and description.
- Payment, audit, platform activity, staff, inventory, coaching library, and mobile billing
  loading states no longer repeat fetch/pull helper text below already-clear loading titles.
- Mobile member, trainer, owner, and reception empty states no longer repeat "No ..." helper
  bodies underneath already-clear empty-state titles.
- Dashboard payment and assistant-draft empty states no longer repeat "No ..." descriptions, and
  coaching-plan empty copy uses gym wording instead of org wording.
- Public gym/member-app sections no longer show static pills that repeat the adjacent heading.
- Attendance QR display no longer shows a static Check-in QR pill beside the QR itself; branch
  and expiry pills remain.
- Mobile in-progress workout card no longer repeats the already-started state in its helper copy.
- Member membership, owner stock, and branch checklist copy now use active/paid/added wording
  instead of synced/ready cues.
- Notification settings and platform account summaries now avoid sync/current/loaded-queue
  implementation phrasing in visible helper copy.
- Platform report and owner attention empty states no longer repeat "nothing needs" helper text
  under already-clear titles.
- Mobile attention and approval queue defaults no longer add redundant all-caught-up helper copy
  under already-clear empty-state titles.
- Mobile/web OTP resend, plan loading, invite plan guidance, and billing usage copy now avoid
  fresh/latest/ready/currently cue words where the action or metric already supplies the state.
- Public profile pending states, member membership callouts, shop inventory scope, and billing
  revenue copy now use direct state wording instead of appear/showing/current cues.
- Mobile loading/tracking labels, membership document callouts, and platform gym summary cards
  now avoid current/currently/appear helper cues while keeping the same state meaning.
- Dashboard overview, notification audience, attendance QR, platform service checks, and mobile
  SaaS health labels now avoid current/self-approved/refreshing cue wording in visible helper text.
- Trainer/owner customization, platform service status, member payment documents, trainer payouts,
  body history, and profile membership empty states now avoid loaded/ready/appear helper wording.
- Billing document labels, body-composition timeline copy, member-detail loading labels, and
  mobile payment document hints now use direct available/recent/loading wording.
- Mobile inbox, public gym trainer/plan, and classes empty states now use shorter direct wording
  instead of all-caught-up or not-published-yet helper copy.
- Public gym plan/facility/trainer fallbacks, checkout unavailable errors, and mobile refresh
  states now use direct not-published/unavailable/updating wording.
- Shared mobile member-list empty states, trainer plan queue, owner stock, dashboard payment
  history, shop inventory, and coaching-plan empty copy now avoid forced or repeated helper text.
- Diet-plan, exercise, scan, workout, payment, branch, and coaching-plan empty states now use
  direct titles without extra "yet" or unlock/not-published helper wording.
- Web profile, platform, membership, attendance, audit, coaching, and mobile payout empty states
  now remove remaining "yet" filler from no-content labels.
- Platform service/subscription/report/activity, assistant draft, settlement queue, and class
  schedule copy now avoids to-show/found/yet/list-updates helper phrasing.
- Mobile settings/shop and web notification, payment, product-photo, coaching, body-history,
  and plan-mix empty labels now remove remaining found/yet/in-this-view filler.
- Mobile gym/client/member/payment lists and web chart/class/member/payment empty labels now
  use direct no-content wording without residual found/yet phrasing.
- Mobile tracking, class, trainer bio, billing mandate, account-link, reception lookup,
  member plan/profile, and web invoice empty copy now remove remaining residual yet/found cues.
- Member membership and logged-workout fallbacks now use direct empty/scheduled-state wording.
- Web approval, notification, profile setup, QR scan, platform pause, membership, reports,
  billing, AI, branch, shop, and plan-catalog copy now removes residual right-now/this-view/
  show/display helper phrasing while preserving operational meaning.
- Desk queue, attendance QR, public gym entry, and coaching pinned-client copy now use shorter
  direct operational instructions without right-now/show/from-the-mobile-app helper phrasing.
- Primary-branch confirmation copy now states the attendance/QR move directly instead of
  "use this location" helper phrasing.
- Managed-on ownership notes now render as quieter inline notes instead of separate card-like
  cue panels with icons; desk labeling is shortened from "Managed at Desk" to "Desk".
- Web status pills now rely on text and tone only, removing repeated status icons from table
  rows, cards, and operational dashboards.
- Mobile shared empty states no longer inject a default information icon; screens keep icons only
  when they pass one intentionally.
- Mobile money summary cards no longer add a fixed receipt icon; the amount and detail rows carry
  the payment context without an extra decorative cue.
- Mobile money summary cards now use the neutral card surface instead of inheriting warning
  styling for ordinary totals.
- Mobile list rows now show the chevron only for pressable rows, removing misleading navigation
  cues from static account, detail, payment, and summary rows.
- Static mobile list rows no longer reserve an empty trailing slot when they have no action,
  chevron, or status content.
- Member home stat strip now relies on metric labels and values without repeated decorative
  icons for visits, active time, workouts, and habits.
- Mobile membership guidance keeps the information icon only for warning/error guidance, removing
  the routine icon from active/neutral membership copy.
- Mobile member payments empty state no longer repeats the no-payment state with a receipt icon
  or unused empty-state body styling.

### Product plan Part A and Part B

- Part A P0 atomicity/security work landed through `A1.*` and `A2.*` commits:
  `1a7bc1e`, `f34d239`, `bda447d`, `b82ed9d`, `084aeee`, `aafb1d5`, `83e4598`,
  `159935d`, `ebfed4f`, `3658b4b`, `8732d51`, `32fe70d`, `d62bd4f`,
  `f58f8fd`, `d77decf`, `5ee78a7`, `af43c27`, `99babca`, `4140dae`,
  `2599d72`, `40f88e3`, `6385827`, and `f535583`.
- Part A P1/API/queue work landed through `A3.*` and `A4.*` commits:
  `05b2cd4`, `7e7128b`, `5ca4078`, `b4e8467`, `fc1bb16`, `a146154`,
  `deb7643`, `c5a7217`, `028ae64`, `9f2427d`, `3196394`, `64ff7ae`,
  `6c46e58`, `6d9f8ee`, `219e362`, and the `A4.1` route extraction series from
  `d36b12b` through `a373067`.
- Part B data-model rollouts are documented and scripted for `B1` through `B6`:
  proposal commits `9de123d`, `423732d`, `71a52c6`, `b17109f`, `28b28ec`, `06aaf2a`,
  and preflight SQL commits `00b5bf5`, `0db64d5`, `c651c4d`, `303d1c8`, `4fe0772`,
  `a726ed9`.
- Destructive or production-sensitive DB changes were intentionally not applied directly. Each
  rollout uses staging SQL, duplicate/orphan audits, validation queries, and rollback notes.

## Verification evidence

Latest local verification on this branch includes:

- `pnpm check:launch-gates`
- `pnpm check:cleanup-audit`
- `ZOOK_MOBILE_RELEASE_TARGET=local EXPO_PUBLIC_API_MODE=backend EXPO_PUBLIC_MOBILE_API_BASE_URL=http://localhost:3000 EXPO_PUBLIC_WEB_URL=http://localhost:3000 pnpm mobile:release:check`
- `pnpm --filter @zook/web typecheck`
- `pnpm --filter @zook/web lint`
- `pnpm --filter @zook/web test`
- `pnpm --filter @zook/mobile typecheck`
- `pnpm --filter @zook/mobile lint`
- `pnpm --filter @zook/mobile test`
- `pnpm typecheck`
- `git diff --check`

## Proposed migrations and staging-only artifacts

These are proposed only and require staging rehearsal before production:

- `A1.1`: FK inventory and referential-integrity orphan audits.
- `A1.5`: single-active-subscription partial unique index.
- `A1.6`: attendance per-day uniqueness.
- `A1.7`: visit-deduction uniqueness.
- `A3.1`: durable `BackgroundJob` queue.
- `A3.2`: platform broadcast fan-out validation.
- `A3.3`: async push delivery validation.
- `A3.4`: renewal reminder queue validation.
- `A3.6`: idempotency expiry and purge validation.
- `B1`: multi-role/multi-branch RBAC uniqueness.
- `B2`: status enum conversion.
- `B3`: invoice column collapse.
- `B4`: branch-scope model metadata.
- `B5`: uniqueness gaps for receipt numbers, AI quota, and subscription payment linkage.
- `B6`: retention metadata, purge batches, and AuditLog partitioning rehearsal.

## Remaining gates

These are not code-completable from this workspace without external action or approval:

- Live Razorpay checkout evidence: run real membership and shop payments, verify webhooks, and
  capture payment/refund evidence.
- Provider credential certification: storage, OpenAI if enabled, Expo push, Sentry, Upstash, Resend,
  and MSG91 production credentials need staging/production promotion evidence.
- Physical-device QA: iOS and Android foreground/background/cold-start push, low-light QR scanning,
  full role walkthroughs, keyboard behavior, safe areas, and motion smoothness.
- Store-console work: App Store/Play metadata, screenshots, data safety, age rating, support
  details, and refund/cancellation wording.
- Razorpay checkout configuration: confirm UPI prominence in the hosted checkout dashboard.
- Product-scope decisions: Part E features, GST/e-invoicing scope, any historical data remediation,
  and broader regional staff-web localization need explicit approval before implementation.

Use `docs/mobile-ui-cleanup-external-evidence-checklist.md` to record the evidence for these gates
without committing secrets, raw tokens, or unredacted customer/provider data.

## Completion status

Do not mark the active goal complete from code history alone. Code-side implementation and rollout
tooling are in place for the visible plan items, but final completion requires attaching the external
evidence above or explicitly narrowing the launch scope with product approval.
