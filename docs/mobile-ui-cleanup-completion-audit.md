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
