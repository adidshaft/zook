# Hosted Web UI Audit - 2026-06-27

## Scope covered in this pass

- Hosted surfaces only, inspected in Chrome against `zookfit.in` and `dashboard.zookfit.in`.
- Routes covered in this pass include the hosted public pages, owner dashboard and deep subroutes, reception desk surfaces, trainer web routes, member web routes, and all currently linked platform sections discoverable from the hosted app navigation.
- Deep-link edge cases were also checked where hosted behavior diverged from the route tree, including `/me`, `/dashboard/profile`, `/dashboard/trainers/[trainerId]`, and `/desk/payments/new`.
- This file is the final hosted-web audit log for the currently discoverable route inventory.

## Cross-site issues

- The logged-in account chip leaks into the public marketing navbar and footer, which makes the public site feel like an internal surface instead of a clean prospect-facing website.
- The dark glass style is applied almost everywhere, so too many cards collapse into the same visual weight and important actions do not stand out enough.
- Several surfaces rely on giant empty chart or card containers when data is sparse, which makes the product feel unfinished rather than intentionally calm.
- Mobile-app handoff messaging is overused on web. Instead of feeling like a focused companion surface, multiple pages feel like stubs that apologize for not doing much.
- Role switching is brittle across hosted web. Deep-linking into another role often dumps the user into the wrong shell or a generic loading command board instead of a clear access or session state.

## Public home `/`

- The hero headline is so oversized that it breaks into a tall text wall and wastes the right half of the viewport on desktop.
- The small metrics row with `roles`, `record`, and `uptime` is too cryptic to build trust; the labels do not explain anything meaningful to a buyer.
- The owner dashboard illustration card competes with the main CTA instead of supporting it, so the hero feels split between two primary stories.
- The social-proof section reads like internal product explanation, not real trust-building evidence from gyms, operators, or outcomes.
- The member app section still says store links are pending, which makes the product feel unreleased even though the site is live.
- The footer repeats the logged-in platform account chip, which is visually noisy and inappropriate for a marketing page.

## Pricing `/pricing`

- The headline is so tall that pricing comparison starts too far below the fold for a page whose main job is plan comparison.
- Each pricing card has a heavy `More details` block above the real CTA, which muddies the action hierarchy.
- Monthly and yearly pricing are shown only as static copy, so comparison feels harder than it should.
- The feature list under `What buyers get` is visually detached from the actual tiers, so it reads like generic sales copy instead of plan support.
- The page feels overly monochrome for a pricing surface; nothing helps the eye quickly scan differences beyond the one highlighted card.

## Public gym page `/g/aarogya-strength`

- The hero image is so darkened that the cover photo loses most of its value as a real-world signal.
- The sticky join card on the right fights the main hero content instead of complementing it, so the page feels crowded above the fold.
- The QR block is oversized for desktop and steals attention from actual plan evaluation.
- The tabs row (`View plans`, `Visible trainers`, `Photos & Facilities`, `Reviews`, `Share or install`) feels like a second navigation system crammed into the middle of the page.
- The plan cards do not feel clearly clickable enough relative to the surrounding panels, especially when compared with the much louder right-side CTA stack.
- `Reviews` is presented as a major tab even though there is no strong trust surface visible up front to justify it.

## Join page `/join/aarogya-strength?plan=monthly-unlimited-1999`

- The left panel has too much dead vertical space under the plan chooser, so the composition feels unfinished.
- The selected plan styling is subtle enough that the plan grid reads more like decorative cards than a crisp checkout step.
- The payment progress copy (`Pay`, `Confirm`, `Activate`) is too quiet to actually reassure the buyer.
- The coupon field and apply button feel visually bolted on rather than part of a coherent order summary.
- The right-side summary panel is clearer than the main plan-selection area, which is backwards for the page's primary decision.

## Login `/login?switch=1`

- The login card floats alone in a huge dark void, which makes the page feel under-designed on desktop.
- The email and phone segmented control is visually fine, but the surrounding panel does not use the available width or height in any meaningful way.
- The OTP step spends a lot of space on empty background and very little on reassurance, support, or recovery options.

## Owner dashboard `/dashboard`

- The page stacks too many navigation layers at once: left rail, top org chip, branch chip, page label, section title, and widget controls.
- Nearly every card uses the same dark treatment, so the difference between critical metrics, drill-downs, and low-priority widgets is weak.
- Empty or near-empty charts still occupy large blocks of vertical space, which makes the command board feel bloated when data is light.
- The `Next best actions` panel looks more important than it behaves; the content is minimal compared with its footprint.
- The `Needs attention` panel reads like another metric tray instead of a truly urgent task queue.
- `AI usage` is mostly empty chrome around very little information.
- `Customise your dashboard` lives on the same long operational page, so the command board gradually turns into a settings page as you scroll.
- The bottom accent and density controls feel like internal theming knobs, not owner-facing product value.

## Owner members `/dashboard/members`

- The page spends too much height on a `Member roster` hero card and summary tiles before the actual table, so basic member management starts late.
- The right-side `Join request queue` panel eats a full column even when it has nothing meaningful to show.
- Row actions like `View` and `Deactivate member` repeat as heavy pills on every line, which makes the table noisy instead of scannable.
- The import block at the bottom is so large that the page feels like two unrelated admin surfaces glued together.

## Owner join requests `/dashboard/members/join-requests`

- The zero-state layout is comically oversized, which makes a normal empty queue feel like a broken screen.
- `Members / Join Requests` reads like awkward breadcrumb copy instead of a crisp page title.
- The metrics row repeats zero values before another empty state, adding height without adding context.
- The overall screen feels unfinished because the main content area becomes a giant blank panel so quickly.

## Owner membership plans `/dashboard/membership-plans`

- The create-plan form dominates the screen above the list, so a management page behaves like a setup wizard.
- Per-row actions such as `Edit`, `Duplicate plan`, and destructive actions all carry the same visual weight.
- Discounts, offers, and referrals are visually buried below the primary plan form instead of feeling like related controls.
- The workout and advisory review section reads like a separate product bolted underneath membership plans.

## Owner classes `/dashboard/classes`

- The two-column balance collapses when the schedule side is empty, leaving a giant dead slab on the right.
- Form fields have very weak hierarchy, so required scheduling inputs and optional metadata all blur together.
- Date and time controls feel too plain and cramped for the core scheduling task.
- The whole screen feels like raw admin scaffolding rather than a polished classes workflow.

## Owner payments `/dashboard/payments`

- The page tries to be ledger, offline payment form, reconciliation view, settlement queue, and revenue summary all at once.
- The offline payment form is far too tall and visually heavy for a secondary action.
- Repeated row pills like `Refund`, `Receipt`, and `Invoice` make the transaction table harder to scan.
- Multiple `Export CSV` buttons create clutter and make the screen feel over-instrumented.
- The lower half fragments into unrelated modules instead of preserving one clear payments narrative.

## Owner attendance `/dashboard/attendance`

- The split between manual override controls and QR machinery is awkward, because neither side feels like the clear primary task.
- The member picker inside manual override looks raw and underdesigned.
- The page is too long, with QR console, queue, entry cards, and recent scan history all stacked into one workflow.
- Validation and QR metadata are over-explained in a way that makes the surface feel technical instead of operational.
- The recent scan log sits too far below the actual attendance actions.

## Owner QR display `/dashboard/attendance/qr-display`

- The dedicated QR page still carries too much chrome and empty padding around the core QR.
- The oversized QR dominates the page while the supporting information is scattered and visually equal-weighted.
- Countdown, token text, checklist, queue, and footer status all compete at the same level.
- Toasts overlap the top-right controls, which makes the state feel sloppy.

## Owner reports `/dashboard/reports`

- Filters, report tabs, export chips, chart area, and secondary widgets are packed too tightly into the top half.
- The export controls read more like a tag cloud than a structured reporting tool.
- Empty or low-signal chart content still consumes a large amount of space.
- The page stacks too many navigation systems together: left nav, report tabs, and export chip matrix.

## Owner branches `/dashboard/branches`

- The giant multi-step branch form overwhelms the page even when the more common task is reviewing existing branches.
- The decorative step shapes consume a lot of space while contributing almost no clarity.
- The branch list column becomes mostly dead space after the first two cards.
- Working hours are rendered as a huge repetitive matrix, which makes the lower half feel exhausting.
- Location setup and branch management are given equal visual priority, even though the list of current branches is the higher-signal content.

## Owner billing `/dashboard/billing`

- The top-left `Receipts and invoices` card turns into a huge empty slab after three summary stats.
- Billing profile, plan selection, quota packaging, autopay, referral code, and invoices are all stacked into one long page without strong grouping.
- The referral block feels randomly inserted into the billing flow.
- Several large sections are mostly dark container chrome around small amounts of information.
- The invoice list repeats the same heavy download action treatment line after line.

## Owner notifications `/dashboard/notifications`

- The composer on the left and delivery history on the right feel like two different products forced into one screen.
- `Step 1 of 4` takes a full-width row without helping the user much.
- The category cards are bulky and visually sparse, so the compose flow feels slower than it should.
- Delivery history cards have long repetitive metadata lines that are hard to scan.
- The lower `Recent notifications` empty state conflicts with the populated delivery history above it and makes the information architecture feel muddled.

## Owner shop `/dashboard/shop`

- The add-product form dominates the page and pushes browsing existing inventory down.
- The giant empty photo dropzone adds a lot of height before the user even gets to the product list.
- Per-product actions like `Edit`, `Archive`, and `Delete` repeat with the same weight on every card.
- The `Shop status` section is mostly oversized dark blocks with very little signal inside them.
- Product cards do not establish a strong scan hierarchy between name, stock, price, and status.

## Owner staff `/dashboard/staff`

- The invite form feels too slight compared with the heavy operational table below it.
- The `What each role can do` explainer bloats the page instead of supporting the staff workflow.
- `Coach Output` and `Plan delivery` feel misplaced on a staff-access page.
- The row action button labeled only `Role` is vague and weak as a management affordance.
- The screen mixes invitation, permissions, role documentation, and trainer-plan artifacts into one uneasy surface.

## Owner settings `/dashboard/settings`

- The settings hub duplicates navigation by placing a card grid under an already heavy left rail.
- `Owner control center` plus the grid plus the gym overview and integrations panels make the page feel over-explained.
- Nearly every settings card looks the same, so scanning for the right destination is slower than it should be.
- The screen feels like a sitemap presented as a dashboard.

## Owner public profile `/dashboard/public-profile`

- The route shows a jarring loader-style first paint even though the form content exists underneath it, which makes the page feel unstable.
- `Public page`, `Copy membership link`, `Save profile`, section tabs, and full profile fields all compete in the first viewport.
- The screen reads like a long settings form rather than a polished public-profile editor.

## Owner AI `/dashboard/ai`

- The screen is mostly a single prompt box, an empty drafts table, and a tiny readiness strip wrapped in full dashboard chrome.
- The route feels like a stub, especially because the strongest copy points back to trainer-mobile workflows instead of giving the owner a meaningful AI workspace.
- The page carries a lot of overhead for almost no actual interactive value.

## Owner activity `/dashboard/audit`

- The audit log is dominated by repetitive event rows with very weak visual differentiation.
- Actor labels collapse into repeated `Team member` text, which makes the log feel less informative than it should.
- `Details` buttons repeat line after line with little hierarchy.
- The `Recent assistant drafts` section becomes a dead zone beneath the giant activity table.

## Owner payouts `/dashboard/payouts`

- The route awkwardly combines command-board chrome with a payout-specific heading, so it feels like two pages layered on top of each other.
- Language, theme, and payout config controls show up together in a way that reads more like internal tooling than a polished owner workflow.
- The screen gives off a half-finished admin-console vibe rather than a clear trainer-payout surface.

## Owner plans hub `/dashboard/plans`

- The route repeats the command-board frame before dropping into the plans hub, which adds more navigation than the page needs.
- Membership catalog, discounts, referrals, and workout-plan surfaces are still jammed together into one overloaded control center.
- The result feels like a sitemap plus a work surface rather than one coherent plans page.

## Owner coupons `/dashboard/plans/coupons`

- `Plans / Coupons` reads like a file path instead of a product page title.
- The route is mostly empty framing around a `Create coupon` action, which makes the page feel too thin for its own destination.
- The command-board chrome remains too heavy relative to the tiny amount of coupon-specific UI.

## Owner offers `/dashboard/plans/offers`

- The route again spends too much visual weight on surrounding shell and too little on the actual offer-management workflow.
- The page feels like a blank admin placeholder with one primary action rather than a robust offers tool.

## Owner referrals `/dashboard/plans/referrals`

- Referral codes, referral policy, and role-specific code types all pile into one screen with little hierarchy.
- The route looks form-heavy and policy-heavy before it feels operational.
- It still inherits too much generic dashboard weight for what should be a narrower incentives workflow.

## Owner exercise library `/dashboard/plans/exercise-library`

- The route is trying to be a template builder, a library browser, and a starter-program viewer all at once.
- `Plans / Exercise Library` reads mechanically, and the screen still carries the same heavy dashboard shell above a specialized content tool.
- It feels more like internal CMS furniture than a clean exercise-library workspace.

## Owner notification history `/dashboard/notifications/history`

- Message history and recipient detail share the same page in a way that likely creates a cramped split-focus workflow.
- The route still wears full dashboard chrome while offering a fairly narrow review task.
- It looks like an audit subpanel stretched into a full page.

## Owner notification templates `/dashboard/notifications/templates`

- Creating and browsing templates on the same page makes the route feel like another admin form-plus-list mashup.
- The page is too shell-heavy for what is basically a reusable-copy manager.
- The templates route feels more utilitarian than thoughtfully organized.

## Owner refunds `/dashboard/payments/refunds`

- `Payments / Refunds` again reads like a nested route name instead of a crisp workflow title.
- The route appears to boil refunds down to another tracker table inside the same bulky dashboard frame.
- Repeated `Refund` actions and ledger framing make it feel like a subtable promoted into a full screen.

## Owner shop orders `/dashboard/shop/orders`

- Pickup and fulfillment queue work is elevated into a dedicated page without enough supporting structure to justify the added navigation depth.
- It inherits all the dashboard chrome but still reads like a glorified filtered list.
- The orders workflow is likely repetitive and scan-heavy without enough grouping help.

## Owner trainers `/dashboard/trainers`

- Trainer performance is presented as one dense trainer card with too many data points compressed into a small space.
- The route feels like a card list trying to impersonate an analytics page.
- There is not enough hierarchy between trainer identity, specialization, client load, class load, and payout data.

## Owner trainer detail `/dashboard/trainers/[trainerId]`

- The direct trainer-detail deep link does not behave like a reliable standalone screen on hosted web and can collapse back into the generic dashboard shell.
- That makes the information architecture feel brittle, because the user cannot trust deep links to preserve context.

## Owner settings push `/dashboard/settings/push`

- The push-devices page is extremely thin for a standalone route and immediately hits a loading state.
- `Register this browser` plus `Loading push devices` feels unfinished, especially inside an otherwise serious settings area.
- The route reads like plumbing exposed directly to the owner.

## Owner profile `/dashboard/profile`

- The route does not behave like a clear standalone profile page on hosted web and effectively collapses back into the broader public-profile/settings experience.
- That makes the information architecture feel messy, because the user cannot tell whether this is supposed to be a separate screen at all.

## Reception desk `/desk`

- The desk landing page is too empty when there are no check-ins or approvals, and the empty states do not teach the user what to do next.
- The quick-action bar uses the same pill style for everything, so `Check in` does not get the urgency it should have.
- `Desk handoffs` is unclear copy for a headline metric and does not immediately tell reception what it measures.
- The rupee icon on the `Desk handoffs` card feels mismatched to the metric label.
- The queue and recent-check-ins panels are oversized relative to the amount of actual content on the page.

## Reception members `/desk/members`

- The screen spends a lot of vertical space on branch chips, quick actions, and metrics before the actual member task starts.
- The right-hand panel is a large empty box until a member is selected, which wastes half the page.
- The selected-member actions sit low and feel detached from the member identity and status information above.
- `Desk handoffs` is still unclear as a metric name and looks even stranger alongside the other member-focused cards.

## Reception payments `/desk/payments`

- Recording a payment and browsing recent payments share one cramped surface instead of feeling like distinct tasks.
- The membership payment form feels raw, with very plain selects and fields for a high-risk money flow.
- `Proof file ID` is awkward copy and exposes internal implementation flavor to reception staff.
- Inline refund actions in the recent-payments list add pressure and visual noise to an already dense form screen.

## Reception new payment deep link `/desk/payments/new`

- The hosted deep link for `new payment` does not present as a clearly separate, stable screen and can abort instead of resolving cleanly in browser flow.
- That makes the route feel like an implementation leftover instead of an intentionally supported desk destination.

## Reception classes `/desk/classes`

- The route has a lot of desk chrome for what currently amounts to a search box and a `No upcoming classes available` message.
- The empty state does not help the receptionist understand what to do next when no classes are scheduled.
- The screen feels underbuilt compared with the amount of navigation and metrics wrapped around it.

## Reception orders `/desk/orders`

- Pickup cards repeat the same three actions with nearly equal weight, so the operator has to work too hard to spot the primary next step.
- Order metadata is dense and repetitive from card to card, making the list feel monotonous fast.
- `Verify code`, `Record payment`, and `Mark fulfilled` all compete instead of clearly sequencing the workflow.
- The page has almost no filtering or grouping help even though it is clearly list-heavy.

## Reception QR `/desk/qr`

- The dedicated QR console overloads the operator with token metadata, countdowns, checklist copy, and queue controls.
- The explanatory copy is too long for a screen that should mostly function as a live sign or operator tool.
- Rolling/static mode, token code, timer, and validation checklist all fight for equal attention.

## Trainer web `/coach`

- The page has only `Overview` in the nav, so it feels like a dead-end rather than a real workspace.
- Two large `Continue in the Zook app` cards dominate the right column while providing almost no useful web action.
- The `Pinned for today` panel becomes a huge empty slab once the single client row ends.
- The personalization and preference controls take up more visual weight than the actual coaching content.
- The page repeatedly tells the trainer to leave the web instead of making the web experience feel intentionally scoped.

## Trainer client workspace `/coach/clients/cmpa32qka0005orzo0d7qa0kl`

- The page is mostly a stack of `Continue in the Zook app` modules with very little meaningful web-native action.
- Trainer note, progress, and workout areas all look like shallow previews rather than real workspace panels.
- The repeated CTA pattern makes the page feel like a marketing handoff instead of a tool.
- The client workspace has enough layout weight to imply deep functionality, but most cards stop at summary copy.

## Member web `/m/09pyn5jn`

- The public-style top nav with `Start your gym` is a bad fit for an authenticated member membership page.
- The private-link banner is oversized and steals attention from the actual membership state.
- The page introduces too much explanatory copy before the most important membership facts.
- The `Change phone` form is always present inline, which adds clutter to a page that should feel calm and status-driven.
- Paused and cancelled memberships are rendered as full heavyweight cards, which buries the most relevant current state in too much repeated structure.
- Repeated `Manage membership` sections make the page feel longer and more mechanical than it needs to be.
- The web surface keeps punting class actions into the app, which makes the lower half of the page feel like a blocker rather than a useful extension.

## Member diet `/m/diet`

- The page is almost entirely an empty state plus another `Continue in the app` handoff.
- The web route feels too thin to justify its own navigation destination.
- `Get the Zook app` pointing back to `/` makes the handoff feel sloppy.

## Platform `/platform`

- The top-left header block feels unfinished, with too much empty space around the logo and a tiny isolated sign-out control.
- The sidebar is long and dense, but the section grouping is too subtle to make scanning easy.
- The overview cards mix business metrics, safety states, and operational queues without strong visual separation.
- The `Needs you` panel uses `Clear` and numeric statuses with almost the same visual emphasis, so severity is hard to read quickly.
- The page looks more like an internal scaffold than an executive control surface, especially compared with the weight of the left navigation.

## Platform safety `/platform/safety`

- The safety route reuses much of the overview shell, so it does not feel meaningfully different from the platform landing page.
- The actual safety content is surprisingly thin relative to the size and seriousness implied by the section name.
- The single `Recent reports` card sits under a large platform summary shell that steals attention from the only real queue item.
- The route still feels like an internal scaffold rather than a mature trust-and-safety console.

## Platform subscriptions `/platform/subscriptions`

- Subscription management is buried under the same large business-command shell instead of getting its own focused surface.
- Referral policy, reward payouts, and subscription loading states sit together in a way that muddies what the page is actually for.
- The useful subscription content starts too far below duplicated overview context.

## Platform payments `/platform/payments`

- The route uses a massive business shell for what should be a support-console-style payment table.
- `Platform support console` and `Payment records` still feel underpowered relative to the amount of surrounding chrome.
- The screen looks more like a dashboard wrapper around a search input than a serious payment-ops surface.

## Platform referrals `/platform/referrals`

- Rewards, payouts, and policy are all collapsed into one page with very little visual differentiation.
- The route keeps the same overview-heavy wrapper, so the actual referrals logic never gets to feel primary.

## Platform gyms `/platform/gyms`

- The page bizarrely mixes `Platform operations` loading-cockpit UI with the business-command shell and gym-account management.
- Two different visual systems appear to collide on the same route, which makes it feel unstable and half-migrated.
- Gym actions like `Details`, `Activate`, and `Suspend` are dropped into a shell that still says the platform status is loading.

## Platform users `/platform/users`

- The route again spends too much height and attention on the business overview before the user-search tool.
- `User search and details` feels too small and underframed for a dedicated platform users page.

## Platform impersonations `/platform/impersonations`

- A support-access log is too narrow a workflow to justify being wrapped in the full command-center shell.
- The route looks sparse and underdesigned once you strip away the repeated global navigation.

## Platform moderation `/platform/moderation`

- The content moderation queue is visually tiny compared with the giant persistent platform shell.
- The route feels like a placeholder heading more than a functioning moderation workspace.

## Platform audit `/platform/audit`

- The global audit route seems to inherit the same shell-first problem as the rest of platform, so the audit task never feels centered.
- It reads more like a heading inserted into the overview surface than a true audit console.

## Platform status `/platform/status`

- The `Production command summary` page is still wrapped in the entire business shell, which blurs the difference between live system health and platform KPIs.
- The route feels generic and overframed rather than operationally sharp.

## Platform incidents `/platform/incidents`

- The incidents route reuses the same loading health-cockpit pattern seen on gyms and assistant, which makes it feel unfinished.
- `Production incident checklist` appears inside a page that still says status is loading, which undermines confidence immediately.

## Platform webhooks `/platform/webhooks`

- A webhook monitor deserves a more technical, scannable surface than the same marketing-dark executive shell.
- The page feels too sparse and too dressed up at the same time.

## Platform flags `/platform/flags`

- Feature flags are presented inside the same command-center frame, which is a poor fit for a configuration-heavy tool.
- The route feels like a heading without enough surrounding workflow or state detail.

## Platform broadcasts `/platform/broadcasts`

- The route looks like a `New broadcast` button promoted into its own page without enough supporting structure.
- Platform-wide broadcast tooling should feel high-consequence and structured, but the current shell makes it feel generic.

## Platform assistant `/platform/assistant`

- The assistant route again collides with the loading health-cockpit pattern, which makes it feel like an internal placeholder.
- `Recent assistant activity` is too slight a destination relative to the amount of platform chrome and loading scaffolding around it.
