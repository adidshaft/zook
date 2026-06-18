# Mobile UX/UI findings — remaining backlog

Compiled while auditing the Zook mobile app across **all four roles, both light & dark, on iOS (simulator) and Android (emulator)**. Everything in this doc is **not yet fixed** — the items already fixed are on branch `mobile-ui-cleanup`. Each entry below states what's **at fault**, the **user experience** impact, and the **fix**.

Confidence tags: **[bug]** = confirmed defect · **[ux]** = works but worse than it should · **[ui]** = visual/consistency · **[confirm]** = likely a demo-fixture artifact, verify against the real backend before touching · **[unverified]** = couldn't exercise (tooling/auth-gated).

---

## Fixed in `mobile-ui-cleanup`

- **1.1 Reception "Verify scan" deep-link ignores the record** — current route reads
  `recordId`, passes it to `ReceptionWorkspace`, and auto-opens the matching decision sheet.
- **1.2 Billing single-tenant pluralization** — `activeMembersCopy()` now handles
  "1 member currently counts" vs plural counts.
- **2.1 Profile alias routes are functionally identical** — alias routes now redirect to
  `/profile` with a focus param, and the profile screen scrolls to the relevant section.
- **2.2 Owner web-handoff shown twice** — Owner Today no longer shows the broad web control-room
  row; Owner More remains the web handoff hub.
- **2.3 Plan tab is sparse with a single assignment** — single-workout members now see an inline
  exercise preview below the primary plan card.
- **2.4 Pause-membership control could explain itself** — active membership card now explains that
  pausing freezes check-ins until the resume date and carries remaining days over.
- **3.1 Two header systems with different title sizes** — this is now documented as an
  intentional hierarchy: `ScreenHeader` owns tab-root landing titles, while `AppHeader` owns
  compact pushed/detail headers.
- **3.2 iOS-only glow shadows are no-ops on Android** — the remaining profile completion and
  check-in success glow cues now use platform-explicit styles: iOS shadow props, Android
  elevation.
- **3.3 Pickup QR used decorative continuous motion** — the pickup QR is now static so scanners
  and users get a steady target; the unused pulse animation exports were removed.
- **3.4 Disabled assistant prompts looked actionable** — the coming-soon assistant state no
  longer renders inert prompt chips or a duplicate status badge.
- **3.5 Raised bottom-nav action used continuous pulse** — the raised member action keeps its
  static emphasis but no longer renders a looping halo.
- **3.6 Onboarding splash carried decorative cue clutter** — removed the ambient orbs, feature
  chips, frame layer, and faux scan glyph so the intro focuses on the Zook mark and tap affordance.
- **3.7 Settings/onboarding showed future-feature chips** — removed non-actionable coming-soon
  language previews and the WhatsApp notification card from mobile settings/onboarding flows.
- **3.8 Empty data states used future-feature wording** — replaced plan exercise and trainer-bio
  "coming soon" fallbacks with neutral empty-state copy.
- **6/R3 Typography alias sprawl** — mobile tokens now use four ordinary title roles plus an
  explicit `heroTitle` for oversized hero/code moments; the vague `display` alias was removed.
- **6/R4 Contrast audit token drift** — `contrast-audit.ts` now imports real `@zook/tokens`
  palettes instead of reaching around the package boundary or duplicating values.
- **6/R5 Stale mobile stylesheet keys** — removed unused/empty style entries left behind in
  assistant, attendance, notifications, login, date-picker, and tracking surfaces.
- **6/R6 Legacy membership/plan/foundation styles** — removed unused style blocks left behind
  by extracted membership cards, plan detail states, and old primitive button/skeleton code.
- **6/R7 Primitive alias sprawl** — removed unused card/screen/layout aliases from the mobile
  primitive barrel so new code has one obvious component name to reach for.
- **6/R8 Redundant primitive barrel shim** — removed the top-level `components/primitives.tsx`
  re-export now that imports resolve directly to the primitives directory barrel.
- **6/R9 Orphaned primitive story file** — removed the standalone mobile primitive story/demo
  file because there is no mobile story runner or import path for it.
- **6/R10 Unused primitive wrappers** — removed unused chip, metric, section, and layout helper
  exports so the mobile primitive surface only exposes components with live callers.
- **6/R11 Unused button aliases** — removed unused `DangerButton`, `GhostButton`,
  `PrimaryLink`, and `SecondaryLink` wrappers in favor of `ZookButton` variants.
- **6/R12 Generic button alias** — replaced the remaining internal `Button` alias call sites
  with `ZookButton` and removed the alias export.
- **6/R13 No-caller primitive wrappers** — removed the remaining unused `RoleChip`,
  `LoadingState`, and `EntryCodeCard` primitive wrappers after exact reference checks.
- **6/R14 Unused public primitive exports** — removed unused `ChipGroup` and old summary-card
  variants, and made the raw `TextField` base private to the input primitive module.
- **6/R15 Internal-only row/header helpers** — removed public `DetailRow` exports and folded
  `SectionLabel` into `SectionHeader` after confirming no app callers.
- **6/R16 Duplicate haptic press helper** — consolidated `pressWithHaptics` and its types in
  `buttons.tsx` so foundation/input primitives use the same helper.
- **6/R17 Legacy bottom nav implementation** — removed the unused `BottomNav` compatibility
  export, old role tab arrays, and their style/import leftovers now that Expo Router tab layouts
  own mobile navigation.
- **6/R18 Foundation barrel aliases** — removed duplicate foundation re-exports for chips,
  metric helpers, tone helpers, profile shortcuts, icon bubbles, and input fields so those
  primitives only come through their dedicated barrels.
- **6/R19 Non-actionable login SSO controls** — removed Apple/Google sign-in buttons and
  "coming soon" login strings from the mobile sign-in card until those backends are live.
- **6/R20 Disabled assistant route surface** — feature-disabled assistant visits now redirect
  quietly, the QA shortcut is hidden with the same flag, and stale assistant nav strings are gone.
- **6/R21 Primitive nav shim** — removed the leftover `nav.tsx` chip re-export shim and
  exported chips directly from the primitive barrel.
- **6/R22 Reception success pulse** — removed the extra success scale animation from the
  verification result modal; success already has modal copy, haptics/toast, announcement, and
  auto-dismiss.
- **6/R23 Mobile SSO auth surface** — removed the unused Apple/Google auth context and mobile
  domain-api methods left behind after the login SSO controls were removed.
- **6/R24 Empty domain modules** — deleted no-op domain query/mutation files and empty barrels,
  then trimmed affected exports to only point at modules with live code.
- **6/R25 Mobile api-client alias** — removed the unused one-line `apiClient` re-export shim;
  live callers already use `mobileApiFetch` directly or `domain-api`'s request client.
- **6/R26 Primitive feedback shim** — removed the unused `feedback.tsx` primitive barrel and
  exported feedback primitives plus network banners directly from the main primitive barrel.
- **6/R27 Unused skeleton exports** — removed no-caller `TrackingHistorySkeleton` and
  `SettingsSkeleton` shapes from the mobile skeleton module.
- **6/R28 Primitive card barrel imports** — flattened the card primitive barrel so it directly
  re-exports card helpers instead of creating unused local bindings.
- **6/R29 Primitive category shims** — removed no-caller `cards.tsx`, `inputs.tsx`, and
  `layout.tsx` primitive forwarding barrels; the main primitive barrel now exports the real
  modules directly.
- **6/R30 Placeholder mobile READMEs** — removed one-line scaffold README files under
  `apps/mobile/src` that contained only directory headings and no useful local guidance.
- **6/R31 No-caller domain hooks** — removed unused mobile domain query hooks and their
  private query-key/invalidation leftovers for engagement, badges, goals, push devices,
  tracking habits, product aliases, and privacy consents.
- **6/R32 Unused query-key helpers** — trimmed no-caller mobile query-key helpers and
  invalidation branches left behind after the domain-hook cleanup.
- **6/R33 Internal domain prop types** — stopped publicly re-exporting domain component prop
  types that only their own modules consume; app callers still import the item types they use.
- **6/R34 Tracking display exports** — removed unused tracking header/history-summary display
  exports and the unused history-series builder so the progress surface only keeps live helpers.
- **6/R35 Trainer AI draft cue** — removed the always-off trainer AI drafting card and updated
  the trainer QA flow to exercise the live manual plan builder instead of stale AI draft naming.
- **6/R36 No-caller utility helpers** — removed the unused smart check-in reminder module,
  dropped the unused biometric getter, and made toast/biometric helpers private where only their
  own modules call them.
- **6/R37 No-caller mobile exports** — removed leftover no-caller formatting, route-role,
  motion, role-switch, last-values, and shop API exports after direct reference checks showed
  the live screens use newer domain hooks/helpers instead.
- **6/R38 Internal helper exports** — removed unused bottom-sheet/privileged PIN helper exports,
  made profile-photo types internal, and trimmed no-caller owner/reception helper exports.
- **6/R39 Profile component default exports** — removed unused default exports from profile
  components where the mobile app imports the named components directly.
- **6/R40 Redundant mobile comments** — removed duplicate domain-component and skeleton comments
  that restated the surrounding component names or obvious JSX state.
- **6/R41 Stale QA audit wording** — removed the obsolete AI-draft mention from the
  unverified submit-path list after the always-off trainer AI drafting surface was removed.
- **6/R42 Offline-demo fallback copy** — replaced the remaining "sample action" offline-demo
  transport error with neutral copy for unsupported demo actions.
- **6/R43 Web availability copy** — replaced remaining web "coming soon" and "not available yet"
  empty-state labels with neutral published/pending/no-history wording.
- **6/R44 Cross-app stale helper cleanup** — removed unused web mini-chart/chip/action helper
  exports and neutralized stale refund/comment wording found by the cue scan.
- **6/R45 Web unused public helpers** — removed no-caller locale-label/list exports and unused
  ambient motion primitives from the public web helper modules.
- **6/R46 Web no-caller hooks and exports** — removed unused query-hook modules, a stale server
  barrel export, an unused internal error helper, and redundant join-page visual comments.
- **6/R47 Web orphan overview components** — removed the no-caller overview wrapper/component
  cluster and an unused operational offer-form type export.
- **6/R48 Web primitive export trim** — removed unused dashboard skeleton/table-loader,
  date/money input, and severity-tone helper exports from the web primitive modules.
- **6/R49 Web domain barrel cleanup** — replaced no-caller server domain forwarding-barrel
  imports with direct read-model/shared module imports and removed the empty forwarding files.
- **6/R50 Web internal read-model types** — made no-caller server read-model types internal and
  removed the now-unused plan exercise type file.
- **6/R51 Mobile skeleton alias** — replaced the remaining `LoadingSkeleton` alias callers with
  the canonical `Skeleton` primitive and removed the wrapper export.
- **6/R52 Web placeholder README cleanup** — removed one-line scaffold README files from web
  domain, query-hook, and overview component folders.
- **6/R53 App-wide scaffold README cleanup** — removed remaining one-line placeholder README
  files across app route, component, public asset, test, and website folders.
- **6/R54 Web orphan UI stories** — removed no-runner Storybook demo files for shared web UI
  primitives after confirming there is no tracked Storybook configuration or live import path.
- **6/R55 Web AI preview wording** — replaced owner-dashboard "coming soon" assistant copy and
  badge with neutral activity/review wording that matches the current read-only panel behavior.
- **6/R56 Token legacy alias surface** — removed the no-caller `@zook/tokens` legacy alias
  module after confirming live consumers import the current palette/token primitives directly.
- **6/R57 Package scaffold README cleanup** — removed one-line placeholder README files from
  package source, config, token, UI, and migration folders while keeping the substantive Figma
  package READMEs.
- **6/R58 Top-level scaffold README cleanup** — removed the remaining tracked one-line README
  placeholders from app, artifact, docs, plans, package, and script grouping folders while
  preserving READMEs with substantive guidance.
- **6/R59 Visible QA shortcut gating** — hid login/profile "QA shortcuts" buttons behind an
  explicit `EXPO_PUBLIC_QA_SHORTCUTS_ENABLED` development flag while preserving direct QA
  deep links for screenshot automation.
- **6/R60 Scan sample-data gating** — hid the local-only "Use sample data" scan helper behind
  the same explicit QA shortcut flag so ordinary dev/product review builds do not show sample
  attendance controls.
- **6/R61 Platform console demo wording** — replaced demo/manual labels in the platform support
  console with seeded-test, manual-entry, and provider/test event wording.
- **6/R62 Public checkout test-mode label** — changed the simulated checkout CTA from
  "sample mode" to "test mode" in public English/Hindi copy so it matches the surrounding
  no-real-money payment explanation.
- **6/R63 Public status provider wording** — replaced the public status page's "mock mode"
  degradation label with provider-neutral test-provider wording.
- **6/R64 Disabled demo replacement naming** — renamed mobile's no-demo Metro replacement
  modules from `*-empty` to `*-disabled` so production bundle aliases describe the disabled
  demo behavior directly.
- **6/R65 Scan helper label** — renamed the gated local scan helper from "Use sample data" to
  "Use test check-in" so the dev-only control describes its actual attendance action.
- **6/R66 Runtime diagnostics mock wording** — changed staging implicit-provider diagnostics
  from "mock mode" to "test-provider mode" to match the cleaned public status language.
- **6/R67 Mobile local test wording** — replaced remaining mobile runtime/offline transport
  "sample" and "demo mode" user-facing copy with local test wording while keeping internal
  runtime identifiers unchanged.
- **6/R68 Cross-app local test wording** — replaced remaining web/core/mobile build diagnostics
  and checkout/dashboard labels that called local test surfaces "sample" or "demo mode".
- **6/R69 Empty web domain indexes** — removed no-op server-domain `index.ts` files that only
  exported `{}` and had no exact folder-import callers.
- **6/R70 Empty web domain type placeholders** — removed no-op server-domain `types.ts` files
  that only exported `{}` and had no exact type-import callers.
- **6/R71 Dead web status-dot pulse API** — removed the unused `StatusDot` pulse prop so the
  shared dashboard primitive no longer carries an uncalled animated status affordance.
- **6/R72 Gym profile tab pulse cue** — removed the pulsing active-tab dot and stale decorative
  comments from the gym profile setup panel; active tab selection remains visible through
  background, border, text, and icon treatment.
- **6/R73 Plan selector pending cue** — removed the decorative pulsing blur and stale comments
  from the public plan selector pending overlay while keeping the spinner and status label.
- **6/R74 Public hero ring motion** — kept the public home hero ring ornament but removed its
  infinite orbital rotations so the first viewport no longer carries always-on decorative motion.
- **6/R75 Dashboard pulse-dot motion** — changed the shared web `PulseDot` from an infinite
  pulsing animation to a static status dot while preserving color, size, and layout.
- **6/R76 Line chart endpoint pulse** — removed the dashboard line chart's infinite endpoint
  halo loop and stale motion comments while keeping the static endpoint marker.
- **6/R77 Public hero pointer glow** — removed the one-off cursor-following spotlight from the
  public hero dashboard card and deleted the now-unused visual helper export.
- **6/R78 Gym type option wording** — changed the public setup/profile gym type option from
  "Premium fitness club" to neutral "Fitness club" and reused the shared gym-type list in the
  start-gym flow.
- **6/R79 Dashboard chart comment drift** — updated the shared dashboard section-header comment
  to describe the component plainly instead of preserving stale "premium" visual language.
- **6/R80 Mobile launch background orbs** — removed decorative background orbs from the native
  launch fallback; the branded loading card and spinner remain as the functional loading state.
- **6/R81 Mobile route background glows** — removed visual-only glow layers from the login
  screen and gym username cover placeholder while preserving the functional content and cards.
- **6/R82 Premium/styling wording cleanup** — replaced stale "premium"/"elegant" styling
  comments in global CSS and neutralized the mobile demo gym tagline copy.
- **6/R83 Mobile card glow call sites** — removed glow-only emphasis from active/selected
  mobile cards where labels, chips, selected variants, and actions already communicate state.
- **6/R84 Dead mobile card glow API** — removed the now-unused `Card` glow/glowTone API and
  deleted amber/red glow token entries that no longer had app callers.
- **6/R85 Scanner line glow layer** — removed the decorative scanner-line glow/shadow layer
  and no-op Android override while keeping the animated scan line itself.
- **6/R86 Product placeholder glow** — removed the product-card placeholder glow layer and
  deleted the now-unused `glowColor` tone-palette field.
- **6/R87 Screen ambient background layers** — removed the default `ZookScreen` ambient glow/wash
  layers and the login-only opt-out prop so screens use the plain app background.
- **6/R88 Mobile button glow shadow** — removed the decorative primary-button glow shadow path
  and deleted now-unused mobile glow shadow tokens.
- **6/R89 Web primary control glow shadows** — removed glow-token shadows from filled web
  buttons, tab pills, and public gym CTAs where color, borders, focus, and hover states remain.
- **6/R90 Web selected card glow** — removed the selected `GlassCard` glow shadow and deleted
  the unused success card variant.
- **6/R91 Dead web glow utility** — removed the unused `.zook-lime-glow` global utility and
  its paper-mode override after reference checks showed no app callers.
- **6/R92 Dead full glow token** — removed unused `--shadow-glow-accent` palette variables
  after app/component code stopped referencing the full glow token.
- **6/R93 Fallback workspace wording** — changed the web dashboard fallback label from
  "Sample data" to "Test workspace" and neutralized stale icon-generation "premium" wording.
- **6/R94 Radio-card selected glow** — removed the selected radio-card glow shadow and deleted
  the now-unused subtle glow palette variables.
- **6/R95 Dead exported glow tokens** — removed self-only `zookShadows.glowLime` and
  `opacity.glowAmbient` exports after repo-wide reference checks showed no callers.
- **6/R96 Static status dot naming** — renamed the shared web `PulseDot` helper to
  `StatusDot` now that the component no longer carries pulse motion.
- **6/R97 Primitive status-dot halo** — removed the decorative halo shadow from the
  dashboard primitive `StatusDot` while preserving the status color cue.
- **6/R98 Release-readiness wording** — changed stale "sample mode" release-check output to
  the actual `offlineDemo` terminology used by the mobile config.

## 1. Functional / correctness

### 1.1 Reception "Verify scan" deep-link ignores the record  **[bug, fixed]**
- **Fault:** `app/reception/verification/[recordId].tsx` renders the generic Front-Desk body and never reads the `recordId` param. The route exists to verify one specific flagged/pending scan (e.g. from a push notification or a tap in the queue).
- **Experience:** A receptionist who taps a specific scan-to-review lands on the generic desk and has to hunt for it in the queue. The deep link is effectively dead.
- **Fix:** Have `ReceptionWorkspace`/desk body accept `initialRecordId` and auto-open/scroll to that record's verification card (mirrors how `members/[id]` passes `initialMemberId`).

### 1.2 Billing single-tenant pluralization  **[bug, minor, fixed]**
- **Fault:** `app/owner/billing.tsx` — `"${activeMemberCount} members currently count toward your plan limits"` doesn't handle `=== 1` ("1 members … count").
- **Experience:** A brand-new gym with one member sees ungrammatical copy.
- **Fix:** Pluralize member/members and count/counts.

---

## 2. UX gaps (flows work, but could be clearer)

### 2.1 Profile alias routes are functionally identical  **[ux, fixed]**
- **Fault:** `/profile/edit`, `/profile/photo`, `/profile/extra-fields` all re-export the same `profile-screen.tsx` and render the identical screen (the only old differentiator — the native title — was removed when we fixed the double-header).
- **Experience:** Tapping "Edit", "Photo", or "Profile details" doesn't take the user to a focused sub-screen as the labels imply; they all land on the full profile.
- **Fix:** Either (a) make `profile-screen` read the route and scroll-to/expand the relevant section, or (b) collapse these to a single `/profile` and remove the alias links.

### 2.2 Owner web-handoff shown twice  **[ux, minor, fixed]**
- **Fault:** "Open web control room" is a prominent card on Owner → Today **and** the whole "Web control room" list on Owner → More.
- **Experience:** Mild redundancy; the Today card eats prime real estate for a link.
- **Fix:** Slim the Today card to a one-line row, or drop it (More already covers web).

### 2.3 Plan tab is sparse with a single assignment  **[ux, minor, fixed]**
- **Fault:** After de-duping (today vs schedule), a member with one plan sees only the "Today's workout" card and a lot of empty space.
- **Experience:** Looks unfinished for single-plan members.
- **Fix:** When there's one plan, surface its exercise preview inline (the data the Home card already shows) so the tab feels complete.

### 2.4 Pause-membership control could explain itself  **[ux, minor, fixed]**
- **Fault:** `active-membership-card.tsx` shows a date field + "Pause membership" with no explanation of what pausing does (freezes access, extends end date?).
- **Experience:** Users hesitate on a consequential action. (We added a confirm dialog; the inline copy could still help.)
- **Fix:** One line under the control: "Pausing freezes check-ins until the resume date; your remaining days carry over."

---

## 3. UI / consistency

### 3.1 Two header systems with different title sizes  **[ui, fixed]**
- **Fault:** Tab landings use `ScreenHeader` (display ~34px); pushed/secondary screens and the Shop tab use `AppHeader` (~20px). So the Shop tab's title is visibly smaller than its sibling tabs (Home/Plan/Progress).
- **Experience:** Subtle inconsistency in the "weight" of screen titles across the app.
- **Fix:** Closed as intentional hierarchy: `ScreenHeader` uses `typography.screenTitle` for tab-root landing pages, while `AppHeader` uses `typography.headerTitle` for pushed/detail screens. Both components now carry that contract in code comments.

### 3.2 iOS-only glow shadows are no-ops on Android  **[ui, minor, fixed]**
- **Fault:** A few elements use `shadowColor`/`shadowOpacity` glows without an Android `elevation` (e.g. the profile KYC progress pip, the scan accent glow). Android can't render `shadow*`.
- **Experience:** Slightly flatter accents on Android (not broken). The tab bar and cards already handle this; these are leftovers.
- **Fix:** Profile KYC completion and scan success cues now branch explicitly: iOS keeps shadow props, Android receives matching elevation. Scanner-line glow already uses an opacity rail on Android rather than shadow props.

### 3.3 Pickup QR used decorative continuous motion  **[ui, minor, fixed]**
- **Fault:** `PickupQrCode` wrapped the QR surface in a continuous breathing scale animation. That movement made a scannable code feel less stable without carrying state or urgency.
- **Experience:** The pickup screen had a subtle decorative cue exactly where users and scanners need a steady target.
- **Fix:** Render the QR as a static surface and remove the unused continuous pulse helpers (`PulseHalo`, `useBreathingScale`).

### 3.4 Disabled assistant prompts looked actionable  **[ui, minor, fixed]**
- **Fault:** When `AI_CHAT_ENABLED` is off, the assistant coming-soon screen still rendered suggested prompt chips and a separate "Coming Soon!" badge. The chips were visual-only and could not be tapped.
- **Experience:** Users saw affordances that looked like useful starter prompts on a screen where chat is unavailable.
- **Fix:** Keep the explanatory empty state, but remove the inert prompt chips and duplicate badge from the disabled route. Enabled assistant prompts are unchanged.

### 3.5 Raised bottom-nav action used continuous pulse  **[ui, minor, fixed]**
- **Fault:** The raised member nav action rendered a looping halo behind the icon. It did not communicate loading, focus, or a state change.
- **Experience:** A persistent moving cue competed with normal navigation scanning.
- **Fix:** Remove the looping halo while keeping the raised button's static accent fill, icon sizing, and press feedback.

### 3.6 Onboarding splash carried decorative cue clutter  **[ui, minor, fixed]**
- **Fault:** The splash screen layered ambient orb shapes, a separate frame, feature chips, and a faux scanner glyph around the Zook mark.
- **Experience:** First launch felt busier than the rest of the cleaned mobile surfaces and repeated product cues before users reached onboarding.
- **Fix:** Keep the brand mark, one concise value sentence, and the tap-to-continue affordance; remove the decorative layers and their styles.

### 3.7 Settings/onboarding showed future-feature chips  **[ui, minor, fixed]**
- **Fault:** Language onboarding/settings displayed disabled future-language chips, and notification settings had a separate WhatsApp "Coming Soon!" card.
- **Experience:** Users saw non-actionable controls on screens meant for active preferences.
- **Fix:** Remove the future-feature chip rows/cards and leave only currently configurable preferences.

### 3.8 Empty data states used future-feature wording  **[ui, minor, fixed]**
- **Fault:** The member Plan tab and public gym trainer cards used "coming soon" copy for missing exercise/bio data.
- **Experience:** Normal empty data looked like an unfinished app feature.
- **Fix:** Use neutral empty-state copy: "No exercises yet" and "No bio added yet."

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
- **[unverified]** **Submit paths** that render correctly and whose handlers read correct in code, but weren't tapped through end-to-end on device: scan check-in (needs a camera/QR), shop pay-completion (mock), membership renewal purchase, trainer plan create/assign, reception record-payment submit, profile photo upload.
- **[unverified]** **Accessibility pass** — labels exist on most controls, but no systematic audit of tap-target sizes, dynamic-type scaling, or screen-reader order.
- **[unverified]** **Tablet / large-screen** layout — only phone form factors were checked.
- **Note (not a bug):** Android shows a red `expo-notifications` warning toast — push notifications require a dev/production build, not Expo Go, on Android SDK 53+. Expected in Expo Go only.

---

## 6. Code-health (no user-visible change)

- **[code]** `member-scan-route.tsx` (~1.1k) and `shop-index-route.tsx` (~1.1k) remain large. Styles were already extracted to `*.styles.ts`; the stateful component bodies could be split into sub-components, but they share enough state that doing so risks regressions (this shape caused the earlier hooks-order crash). Refactor with care, behind tests.
- **[code, fixed]** Typography alias cleanup (`R3`) is closed: `packages/tokens` keeps the
  documented title hierarchy (`screenTitle`, `headerTitle`, `sectionTitle`, `cardTitle`) and the
  oversized `heroTitle` escape hatch for onboarding/entry-code moments.
- **[code, fixed]** Contrast audit drift (`R4`) is closed: the audit uses the real
  `@zook/tokens` palettes as its source of truth.
- **[code, fixed]** Stale mobile stylesheet keys (`R5`) is closed: unused styles from earlier
  UI states were removed from assistant, attendance, notifications, login, date-picker, and
  tracking files.
- **[code, fixed]** Legacy membership/plan/foundation styles (`R6`) is closed: unused style
  blocks left behind by extracted membership sections, old plan detail states, and replaced
  primitive button/skeleton code were removed.
- **[code, fixed]** Primitive alias sprawl (`R7`) is closed: unused `FieldCard`, `QueueCard`,
  `PressableCard`, `KPIBox`, `ProgressRing`, `SectionTitle`, and old screen-shell aliases were
  removed from the mobile primitive exports.
- **[code, fixed]** Redundant primitive barrel shim (`R8`) is closed: the one-line
  `components/primitives.tsx` re-export was removed, leaving `components/primitives/index.tsx`
  as the single barrel for `@/components/primitives` imports.
- **[code, fixed]** Orphaned primitive story file (`R9`) is closed: the unused
  `mobile-ux-primitives.stories.tsx` demo component was removed after confirming no Storybook
  script/config or app import references it.
- **[code, fixed]** Unused primitive wrappers (`R10`) is closed: unused chip wrappers,
  metric-card aliases, `ActionButtonRow`, `SwipeActionRow`, and `CollapsibleSection` were
  removed after exact reference checks showed no app callers.
- **[code, fixed]** Unused button aliases (`R11`) is closed: old button/link wrapper exports
  with no app callers were removed; callers should use `ZookButton` with `variant`/`href`.
- **[code, fixed]** Generic button alias (`R12`) is closed: internal `Button` alias usage in
  empty states and confirm sheets now uses `ZookButton` directly.
- **[code, fixed]** No-caller primitive wrappers (`R13`) is closed: `RoleChip`,
  `LoadingState`, and `EntryCodeCard` were removed along with their barrel exports and
  now-unused imports/styles.
- **[code, fixed]** Unused public primitive exports (`R14`) is closed: `ChipGroup`,
  `AlertCard`, `TaskResultCard`, and `WebHandoffCard` were removed after exact reference checks,
  and `TextField` is no longer exported as a public primitive because only `Input`,
  `FormField`, `SearchBar`, and `SearchField` use it internally.
- **[code, fixed]** Internal-only row/header helpers (`R15`) is closed: `DetailRow` is no
  longer exposed from primitive barrels, and `SectionLabel` was folded into `SectionHeader`
  before deleting the standalone file.
- **[code, fixed]** Duplicate haptic press helper (`R16`) is closed: `buttons.tsx` now owns
  `pressWithHaptics`, `HapticWeight`, and `PressHandler`; foundation/input primitives import
  that shared helper instead of carrying a second implementation.
- **[code, fixed]** Legacy bottom nav implementation (`R17`) is closed: the unused
  `BottomNav` compatibility component, role-specific tab arrays, nav styles, and stale fallback
  colors/imports were removed from the primitive foundation module.
- **[code, fixed]** Foundation barrel aliases (`R18`) is closed: `foundation.tsx` now exposes
  the actual foundation surfaces/buttons only, while chips, metrics, tone helpers, profile
  shortcuts, icon bubbles, date fields, and OTP inputs stay on their dedicated primitive barrels.
- **[code, fixed]** Non-actionable login SSO controls (`R19`) is closed: the login surface no
  longer presents Apple/Google controls whose fallback path was an unavailable/coming-soon error.
- **[code, fixed]** Disabled assistant route surface (`R20`) is closed: `AI_CHAT_ENABLED=false`
  no longer renders a polished coming-soon route or QA shortcut, and unused assistant translation
  keys were removed.
- **[code, fixed]** Primitive nav shim (`R21`) is closed: the last `nav.tsx` compatibility
  barrel was deleted now that navigation is owned by Expo Router layouts and chips have their own
  primitive module.
- **[code, fixed]** Reception success pulse (`R22`) is closed: the verification result modal no
  longer scales on success, and the now-unused `useScalePulse` helper was removed while keeping
  the failure shake cue.
- **[code, fixed]** Mobile SSO auth surface (`R23`) is closed: `useAuth()` and `authClient`
  no longer expose Apple/Google sign-in methods with no mobile callers.
- **[code, fixed]** Empty domain modules (`R24`) is closed: no-op `export {};` files and the
  empty AI domain barrel were removed from ai, gym, notifications, privacy, reception, tracking,
  and trainer domains.
