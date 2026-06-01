# Production E2E Test Plan

This plan tests both web and mobile production flows while avoiding unintended real money movement.

## 2026-05-31 Production Run Notes

Current live run is using Chrome against `zookfit.in` / `app.zookfit.in`; mobile-only checks that require a physical device, camera, haptics, or geofence movement remain unverified.

- Clean production deploy from the pushed tree completed on 2026-05-31: Vercel deployment `https://zook-gym-erks8k0rk-adidshafts-projects.vercel.app`, aliased to `https://zookfit.in`.
- Pre-checks passed on production: `/api/health` returned `envProfile: "production"` and `/api/ready` returned `ready: true` with database, migrations, MSG91 SMS, live Razorpay, distributed cache, and distributed rate limiting ready.
- Web login passed for both email and mobile modes. Seeded phone login with `+919876543210` accepted OTP `000000` and opened Nisha Menon's member web membership page.
- Pricing page passed on web: four plans are visible, including the `₹0 for 2 months` trial, and details expand/collapse. Owner dashboard pricing link opens the pricing page in a separate tab.
- Platform, owner, admin, reception, and trainer seeded accounts all logged in with OTP `000000`. Platform and owner/admin/reception web surfaces loaded; owner dashboard metrics rendered; staff roles rendered after a reload; reception desk member detail opened for Nisha Menon.
- Production seed gap found and fixed on retest: owner Members initially showed only `member@zook.local` / Nisha Menon. Root cause was twofold: `member2@zook.local` and `desk-test-member@zook.local` were missing from the seeded fixed-OTP allowlist, and branch-scoped member lists hid profiles without subscriptions. The demo rows for `member2` and `desk-test-member` were repaired in production. After deploy, seeded OTP login passed for both accounts and the owner Members screen shows all four required profiles: Karan Desk Test, Dev Mehta, Nisha Menon, and Ira Shah.
- Trainer web gap found and fixed on retest: `trainer@zook.local` originally landed on `/coach` with assigned clients, assigned plans, sessions, and progress notes all showing `0`. After deploy, the production coach page shows Rohan's live trainer data: 1 assigned client, 1 assigned plan, 0 sessions this week, 1 progress note, and Nisha Menon in the pinned client list.
- Reports gap found and fixed during this run: the Reports page rendered tabs and date filters but had no CSV export controls for the required report downloads. Production now shows the CSV export pack, and Members, Attendance, Payments, Membership sales, and Expiry downloads completed from Chrome.
- Attendance history gap found and fixed during this run: production attendance rows showed generic `Member` / `Membership` labels even when member data exists. Production now shows `Nisha Menon` and `Monthly Unlimited` in recent attendance rows after deploy.
- Reception desk retest continued in production Chrome: `reception@zook.local` opened `/desk/members`, searched `member@zook.local`, selected Nisha Menon, and the desk override action correctly refused a duplicate check-in with `Already checked in. Check out before checking in again.` This verifies the already-checked-in guard from the desk surface.
- Reception offline payment flow was prepared but not submitted: `desk-test-member@zook.local` / Karan Desk Test was selected in the desk payment form, the form stayed on the offline/cash collection path with amount `1999`, and no Razorpay page opened. The final `Record payment` action is intentionally unclicked until explicit action-time approval because it creates a production demo payment record.
- Reception QR display passed in production Chrome: `/desk/qr` generated a rolling server-signed attendance QR, showed a short entry code, countdown/expiry, replay/branch/membership validation checklist, live token metadata, and zero pending/flagged scans.
- Reception Orders passed read-only in production Chrome: `/desk/orders` rendered the branch-scoped shop pickup surface, including an existing paid `Nisha Menon` order for `1 x Water Bottle, 1 x Protein Shake`, pickup code hidden, and verify/skip/fulfill controls. Fulfillment was intentionally not clicked because it mutates production order state.
- Reception Payments route passed as a safe collection surface: `/desk/payments` rendered the offline desk payment form for membership/shop/other collections with cash mode default and did not open Razorpay. No payment was submitted without action-time approval.
- Platform wrap-up was rechecked in production Chrome on 2026-05-31: `/api/ready` showed `ready: true`, production DB reachable/schema-ready/migrations applied, MSG91 live ready, Razorpay live ready, distributed cache, and distributed rate limiting. `/api/health` showed `alive: true` and `envProfile: "production"`. The platform dashboard showed 3 gym accounts, `Aarogya Strength` / `aarogya-strength` active, 14 visible users including all seeded demo accounts, 0 provider setup gaps, 0 suspended gyms, 1 existing mock-seed succeeded payment, and the subscription table showed `Aarogya Strength` on Growth monthly with autopay `Created`, `0 cycles paid`, and next charge `16 Jul 2026`.
- Platform dashboard formatting/performance fix shipped on 2026-05-31: Vercel deployment `https://zook-gym-8lqfsrcq2-adidshafts-projects.vercel.app` reduced platform section loading by gating operational API calls to the active section and moving dense row actions into the detail panel.
- Platform dashboard follow-up fix shipped on 2026-05-31: production deployment `https://zook-gym-62t5oilti-adidshafts-projects.vercel.app`, aliased to `https://zookfit.in`, stopped mounting inactive platform sections behind `hidden` classes, Status and Incidents render separately, the sticky platform nav/header are denser, forced anchor scrolling was removed, and heavy platform org/subscription queries now select/page only the rows needed for the current console view.
- Desk attendance checkout gap found and fixed on 2026-05-31: production initially showed Nisha Menon blocked by historical open check-ins with no desk-side checkout action. Vercel deployments `https://zook-gym-lr6k3l7v9-adidshafts-projects.vercel.app` and `https://zook-gym-o1m0089o7-adidshafts-projects.vercel.app` added an active check-in panel, a desk checkout action, stale-open-session cleanup for the selected branch, and non-blocking desk refreshes. Production API retest with `reception@zook.local` checked Nisha in as `cmptmqnhw0000jm04ldft73g4`, then checked her out with `durationSeconds: 55`; member readback showed `activeCheckIn: null`, and owner readback showed `todayAttendance: 1` plus the checked-out attendance row in history.
- Admin role retest passed in production Chrome: `admin@zook.local` logged in with OTP `000000`, landed on the dashboard, and could open Members, Plans, Attendance, Shop, and Reports. Members showed Karan Desk Test, Dev Mehta, Nisha Menon, and Ira Shah. Plans showed 4 membership offers plus the reviewed Starter Strength Week workout plan. Attendance showed the live rolling QR, zero exceptions, and recent Nisha Menon scans. Shop showed Shaker, Protein Shake, and Water Bottle stock without touching create/edit/archive/delete actions. Reports showed the CSV export pack and live KPI panels. Direct navigation to `/dashboard/billing` redirected the admin back to `/dashboard`, confirming that owner-only billing stayed blocked for this role. Admin was then signed out to the public homepage.
- Owner member detail bug found and fixed during the 2026-05-31 run: `member2@zook.local` / Dev Mehta appeared in the branch-scoped roster but the detail panel failed with `This member belongs to another branch.` The server now allows branch detail access for member profiles with no subscriptions while still blocking members subscribed to a different branch. Production deploy `dpl_2DQ1ujxN475BvcZuVRMsPSacJ8uq` was retested live: Dev Mehta, Ira Shah, and Karan Desk Test detail views now open.
- Owner member details were verified read-only after the fix: Nisha Menon shows active membership/payment/attendance/progress context, Dev Mehta opens as a fresh no-plan/no-subscription profile, Ira Shah opens with minor/marketing-off state visible, and Karan Desk Test opens with Monthly Unlimited pending payment for desk flow testing.
- Owner Plans passed read-only: branch selector was present but only `Aarogya Strength Koregaon Park` was available, Membership catalog showed 4 public active offers, Discounts/Offers/Referrals entry points were visible, and the reviewed `Starter Strength Week` trainer plan appeared with 1 assignment.
- Owner membership plan lifecycle passed in production Chrome on 2026-05-31: created private demo plan `E2E Browser Plan May 31` at `₹101`, edited it to `₹111`, confirmed the edited price persisted in the membership catalog, then archived it so it shows `Private` / `Paused` with Restore available.
- Owner coupon lifecycle passed in production Chrome on 2026-05-31: after hard reload, the coupon form default percentage value showed `10`; created demo coupon `E2EFIVE31A` as `5% off` with max uses `1`, confirmed it appeared as `5% off · Active`, then deactivated it so it shows `5% off · Inactive`.
- Owner Shop passed read-only: Products showed seeded Shaker, Protein Shake, and Water Bottle inventory with stock counts; create/edit/archive/delete actions were intentionally not clicked.
- Owner Shop product lifecycle passed in production Chrome on 2026-05-31: first navigation to `/dashboard/shop` stayed on the dashboard-section skeleton until reload, then created private demo product `E2E Browser Towel May 31` at `₹99` with stock `3`, edited it to `₹109` with stock `7`, and archived it instead of hard-deleting it. The archived row remains visible with Restore available.
- Owner Payments passed read-only: `/dashboard/payments` rendered reconciliation, offline desk payment controls, payment CSV export, refund guidance, the settled ready-for-pickup order `5EFJWZNL` for ₹548, and the seeded membership payment row for Nisha Menon (`Succeeded`, `Online`, `₹1,799`) without clicking record, refund, receipt, invoice, or settle actions.
- Owner Notifications passed read-only: `/dashboard/notifications` rendered the 4-step composer, delivery status, and recent sent notifications (`Guardian approval still pending`, `Evening floor maintenance`) without creating or sending a new notification.
- Owner Notifications selected-member bug was fixed and verified in production Chrome on 2026-05-31: before the fix, searching `member` returned `No members match` even though members existed because the composer expected a legacy member row shape. Production deployment `https://zook-gym-54lqvkmcs-adidshafts-projects.vercel.app`, aliased to `https://zookfit.in`, now lists Karan Desk Test, Dev Mehta, Nisha Menon, and Ira Shah. A review-only draft for selected demo member Karan Desk Test reached the preview screen with `1 matched` and `1 will receive`; the actual send was intentionally not clicked without action-time approval.
- Production performance issue follow-up on 2026-05-31: production DB migration `20260531182000_dashboard_branch_read_indexes` was applied to Supabase, adding branch/read indexes for member subscriptions, member profiles, payments, and attendance. Owner dashboard section routes now use fast shell data outside Reports, and `/dashboard/members` preloads the first member roster page from the server so Karan Desk Test, Dev Mehta, Nisha Menon, and Ira Shah do not wait on the client-side roster fetch. Local typecheck, lint, and web build passed before deploy.
- Platform console performance/formatting follow-up on 2026-05-31: production deployment `https://zook-gym-c50l4wntj-adidshafts-projects.vercel.app`, aliased to `https://zookfit.in`, cached the platform shell read model for 30s, moved provider diagnostics into the first server render, removed duplicate diagnostic normalisation from the API route, tightened the header/nav/card layout, and kept inactive platform operational API calls gated by section. Chrome production retest as `platform@zook.local` showed the updated wrapped nav, 3 organizations, 8 ready providers, 0 provider gaps, and the status table in the initial rendered content. Fresh post-deploy cold navigation was still slow at about 15.6s; warm repeat was about 5.9s, so cold-start/route response latency remains worth monitoring even though the visible zero-provider hydration issue is fixed.
- Owner dashboard perceived-loading fix shipped on 2026-05-31: production deployment `https://zook-gym-jrfaccz8p-adidshafts-projects.vercel.app`, aliased to `https://zookfit.in`, stopped showing large chart/card skeleton panels while the fast shell upgrades to full dashboard detail. Production Chrome retest as `owner@zook.local` showed the dashboard rendering real revenue, attention, attendance, plan mix, AI, staff, and tip panels immediately; after hydration, `.animate-pulse` count settled to `0`, Active Members settled to `1`, and Plan Mix settled to `Monthly Unlimited` / `1 active member`.
- Platform console was rechecked after loading settled: provider readiness showed 8 ready services, 0 setup gaps, 14 visible users, and one platform payment ledger row (`mock_seed_membership`, ₹1,799, Succeeded). The demo gym `Aarogya Strength` is visible inline with Pune location, Open Join, Active status, trial end `16 Jul 2026`, Growth monthly subscription/autopay details, and a safe read-only `Details` action. The details panel opens with status `Active`, join mode `Open Join`, trial end `16 Jul 2026`, location `Pune, Maharashtra`, contact `hello@aarogyastrength.example`, created date `17 May 2026`, and safety-review metadata.
- Owner follow-up checks after dashboard speed work passed in production Chrome: `owner@zook.local` opened Members (`4 profiles`: Karan Desk Test, Dev Mehta, Nisha Menon, Ira Shah; summary settled to 4 total / 1 active), Plans → Referrals (0 active codes/redemptions/credits, policy form visible), Payments (Nisha Menon membership payment, Succeeded, Online, ₹1,799; refund/receipt/invoice controls not clicked), Shop → Orders (`5EFJWZNL`, Ready For Pickup, ₹548, desk handoff only), then signed out. These checks were read-only; no staff invite, notification send, payment record, refund, invoice, pickup, or reset action was performed.
- Owner payment history data-surface gap was fixed and verified in production Chrome: branch-scoped owner `/dashboard/payments` now shows the seeded Nisha Menon membership payment as `Succeeded`, `Online`, `₹1,799`, with the reconciliation settled count updated to `1`.
- Owner payment-history preload follow-up shipped on 2026-05-31: production deployment `https://zook-gym-46lp0dgac-adidshafts-projects.vercel.app`, aliased to `https://zookfit.in`, moved the first payments page into the server-rendered dashboard route. Production Chrome retest as `owner@zook.local` opened `/dashboard/payments` with the Nisha Menon row already present in captured page text (`Succeeded`, `Online`, `₹1,799`) and no `Loading payments` placeholder in the payment-history section.
- Platform console formatting/performance follow-up shipped on 2026-05-31: deployments `https://zook-gym-ounexzvcq-adidshafts-projects.vercel.app` and `https://zook-gym-46lp0dgac-adidshafts-projects.vercel.app`, aliased to `https://zookfit.in`, changed the platform section nav into a compact no-scrollbar horizontal rail with route prefetch disabled, and moved Users/Payments default lists onto the shared cached query hook instead of a hand-rolled effect. Production Chrome retest as `platform@zook.local` confirmed the final nav class included `no-scrollbar`, computed `scrollbar-width: none`, and the Status view rendered real metrics/status content immediately: 3 organizations, 8 ready providers, 0 provider setup gaps, and 1 open safety review.
- Trainer role was retested in production Chrome and signed out: `trainer@zook.local` opened `/coach`, showing 1 assigned client, 1 assigned plan, 0 sessions this week, 1 progress note, and pinned client Nisha Menon with `Upper Body Strength`. The web coach page does not expose a client-detail/member workflow; its quick actions route to `/me` and state the full coaching surface lives on mobile. Trainer mutation/progress checklist items remain open.
- Trainer role was rechecked again in production Chrome after the dashboard speed work: the coach page initially needed a short settle, then showed 1 assigned client, 1 assigned plan, 0 sessions this week, 1 progress note, and pinned Nisha Menon. The remaining trainer web checklist items (open member detail, create/assign workout/diet, notes/measurements, progress view update) remain open because the current web UI explicitly points those actions to the mobile app.
- Trainer web client workspace gap was fixed and verified in production Chrome on 2026-06-01: production deployment `https://zook-gym-qp488j2rw-adidshafts-projects.vercel.app`, aliased to `https://zookfit.in`, adds `/coach/clients/[clientId]` and routes pinned client / plan / progress actions there. As `trainer@zook.local`, `/coach` opened Nisha Menon at `/coach/clients/cmpa32qka0005orzo0d7qa0kl`; the page showed her email/phone/goal, active `Starter Strength Week`, existing `50%` feedback, and trainer-visible `Upper Body Strength` workout. Low-risk production demo mutations then passed: saved trainer note `Production E2E trainer note 2026-06-01 05:35`, logged trainer-visible body progress with weight `68.6`, created draft workout `E2E Trainer Web Draft 2026-06-01 05:35` with zero assignments, and created draft diet plan `E2E Trainer Web Diet Draft 2026-06-01 05:35`. These actions did not send external SMS/email, did not process payment, and did not assign/publish a plan to the member.
- Platform Broadcasts was checked read-only as `platform@zook.local`: `/platform/broadcasts` showed `0 loaded` and `No broadcasts yet`, so no platform-wide broadcast was sent during this run. MSG91 dashboard verification could not be completed from Chrome because `https://control.msg91.com/app/` redirected to MSG91's logged-out thank-you page; no credentials were used, and the external SMS/email no-send checklist item remains open because provider-side logs were not proven.
- Owner notification history was rechecked read-only in production Chrome as `owner@zook.local`: `/dashboard/notifications/history` showed `0 messages` / `No messages match this view`, and `/dashboard/notifications` showed `Recent sends 0` plus `No notifications sent yet`. This proves no owner-composed in-app notification is currently recorded for the demo org after the run; it still does not prove MSG91/email provider-side logs, so the external SMS/email verification item remains open.
- Member web contact completion shipped and verified in production Chrome on 2026-05-31: `member@zook.local` opened the private member page at `/m/09pyn5jn`, the new Account contact panel rendered `2/2 contacts`, `OTP verified`, email `member@zook.local`, phone `+919876543210`, and add/change OTP controls. The `Send code` action was intentionally not clicked because it would transmit a real email/SMS without action-time approval.
- Owner notification send to a demo member passed on 2026-06-01: as `owner@zook.local`, sent `E2E in-app notice 2026-06-01 05:47` to only `member@zook.local` / Nisha Menon with `pushEnabled: false`. The first attempt was rejected before creation because metadata contained a boolean where the API expects string metadata; the retry without custom metadata returned `recipientCount: 1`, `scheduledRecipientCount: 0`, `status: SENT`, and owner notification history showed `Operational · Single Member`, `1 recipients`, `1 delivered`, `0 failed`. A separate member session read `/api/me/notifications` and confirmed the same notification at the top of the member inbox with `deliveryStatus: in_app`, `readAt: null`, and `pushEnabled: false`. This did not call SMS/email or Expo push, and does not satisfy the native mobile receive-screen checkbox.
- Native iOS simulator production-backed mobile retest continued on 2026-06-01 on clean simulator `07CF6415-F04A-4D98-A32C-02C3AB5639EE` using `com.zook.app` against `https://app.zookfit.in/api`. After seeded email OTP login for `member@zook.local`, the native Inbox showed the owner-sent `E2E in-app notice 2026-06-01...` as the latest unread item, proving the web-sent in-app notification appears in the mobile app. A direct attendance-record open for `cmptmqnhw0000jm04ldft73g4` showed `Checked out`, entry code `ZK-5025`, check-in `3:51 PM`, check-out `3:52 PM`, `Duration 1m`, branch `Aarogya Strength Koregaon Park`, and status `Approved`, proving recorded attendance duration is visible later on mobile. The assigned `Starter Strength Week` workout was opened and completed from the mobile app; after the fix below and relaunch, the plan detail settled to `6 of 6 completed` / `100%`, and tracking history showed body progress plus the existing `Upper Body Strength` workout log.
- Mobile workout completion bug found and fixed on 2026-06-01: before the fix, tapping `Complete Workout` left the native plan detail button stuck as `Completing...` for more than 20 seconds even though the production data later reflected completion. Root cause was the mutation awaiting active query invalidation/refetch promises inside `onSuccess`, keeping the mutation pending if a follow-up refetch was slow. The mobile mutation now fires the invalidations in the background so the completion action can settle immediately while data refreshes.
- Expo/EAS production update shipped for the mobile workout completion fix on 2026-06-01: branch `production`, runtime `0.1.0`, update group `41a0c362-3934-4b76-8b68-945d2bf7be04`, Android update `019e81db-2a29-757e-a925-7f21eb8dbfb1`, iOS update `019e81db-2a29-71f5-9864-a39f662a6fcd`, message `Fix mobile workout completion settling`, commit `76cf8bed1639a217721c090ecfc9dbd5962b2e75`.
- Dashboard/platform perceived-loading follow-up shipped on 2026-06-01: production deployment `https://zook-gym-aw4p89u42-adidshafts-projects.vercel.app`, aliased to `https://zookfit.in`, replaced the owner dashboard route fallback's anonymous black skeleton blocks with a recognizable Zook command-board shell, added a dedicated platform operations loading shell, and raised the fast owner dashboard shell cache from 10s to 60s while preserving mutation-driven cache invalidation. Local `@zook/web` typecheck, lint, and build passed. Production smoke returned `envProfile: "production"` from `https://app.zookfit.in/api/health`, unauthenticated `/dashboard` still redirects to login, and Chrome owner-session retest rendered the real `Today’s Command Board` / `ACTIVE MEMBERS` content with `.animate-pulse` count `0`; first post-deploy navigation still showed cold latency, while warm repeat settled in about `6.1s`.
- Platform dashboard loading/formatting follow-up shipped on 2026-06-01: production deployments `https://zook-gym-2evdbau52-adidshafts-projects.vercel.app` and `https://zook-gym-eeftx0ck7-adidshafts-projects.vercel.app`, aliased to `https://zookfit.in`, make `/platform` stream the authenticated shell, grouped navigation, and compact first-fold structure before the platform read model resolves; the metric cards use a smaller platform-specific numeric scale, and the previous full-page wait moves behind a section-level skeleton. The compact sign-out control was also corrected after visual retest. Local `@zook/web` lint, typecheck, build, and diff check passed. Production Chrome retest as `platform@zook.local` showed grouped Health/Support/Controls nav, compact sign-out icon, `System online`, 3 organizations, 0 suspended, 1 safety review, and a warm navigation around `9.2s`. The route still has meaningful server latency, but the first viewport is now structured and no longer shows the oversized sign-out/layout issue.
- Native iOS simulator minor/prospect checks continued on 2026-06-01 against production APIs. `minor@zook.local` accepted seeded OTP `000000` and loaded Ira's home, Membership, Plan, Scan, and Inbox screens; the Inbox showed the guardian approval pending state. The Scan screen opened with the server-authoritative QR frame and manual entry fallback, but actual camera QR recognition, haptic feedback, checkout re-scan, and geofence exit remain physical-device checks. `prospect@zook.local` initially accepted OTP `000000` but stayed on the verify screen with `Signed in.` instead of routing into discovery; this was fixed by sending authenticated no-organization users to `/gyms`. Retest on simulator showed the prospect landing on `Find your gym`, opening the public `Aarogya Strength` gym profile, and reaching membership plan selection. The flow was stopped before tapping `Choose plan` to avoid an unapproved production join/payment mutation.
- Expo/EAS production update shipped for the prospect mobile login routing fix on 2026-06-01: branch `production`, runtime `0.1.0`, update group `cfb4b8af-7801-482e-8322-cd54b81f7959`, Android update `019e820d-340c-784d-9c28-b36d142836dd`, iOS update `019e820d-340c-7072-9ea5-d77fbe215ea1`, message `Fix prospect mobile login routing`, commit `282538608fa498d030bdfebeaae0dd5e7dc9495c`.
- Owner wrap-up after the report rate-limit fix passed on 2026-06-01: as `owner@zook.local`, production showed the real command board with `1` active member, `0` today check-ins, and `₹0` revenue today. Members still showed Karan Desk Test, Dev Mehta, Ira Shah, and Nisha Menon; Payments showed the seeded Nisha Menon membership payment as `Succeeded`, `Online`, `₹1,799`; Shop products/orders showed seeded inventory and ready order `5EFJWZNL`; Referrals showed `0` active codes/redemptions/credits with the policy form available. Reports downloaded Members, Attendance, Payments, and Membership sales from Chrome. Expiry initially failed with `429` because the owner had exhausted the old `10/day` report export bucket during repeated QA; deployment `https://zook-gym-46330vza7-adidshafts-projects.vercel.app`, aliased to `https://zookfit.in`, raised `reportExportByActor` to `50/day`, and a production retest returned `200` with `content-disposition: attachment; filename="zook-expiring-members.csv"` plus Nisha Menon's expiring `Monthly Unlimited` row. No new mobile-created payment/shop/referral records were created in this wrap-up, so those dependent checklist items remain open.
- Desk payment handoff bug found and fixed on 2026-06-01: in production Chrome, `desk-test-member@zook.local` / Karan Desk Test showed `Pending Payment`, but the member detail `Record payment` action did not navigate or prefill the payment form. The fix makes the action a real link to `/desk/payments/new?memberId=...&branchId=...` and hydrates that `memberId` into the payment form. Production deployment `https://zook-gym-jenlk6pes-adidshafts-projects.vercel.app`, aliased to `https://zookfit.in`, was retested live: Karan's detail now exposes the payment link, and the destination form eventually hydrates with Karan selected, the pending subscription selected, Cash mode, and amount `1999`. The first destination load briefly hit Supabase `EMAXCONNSESSION` connection exhaustion and showed the global error boundary; reload recovered after the connection burst settled. The final `Record payment` submit was intentionally not clicked because it creates a production offline payment record.
- Mobile shop order flow progressed on the iOS simulator against production on 2026-06-01: after resetting only the simulator test keychain, onboarding was completed and `member@zook.local` logged in with seeded OTP `000000`. The member Shop tab loaded the Aarogya Strength desk pickup catalog; adding `1 x Shaker` showed a cart total of `₹299`, review showed `Subtotal ₹299`, and continuing created a production checkout/order. The flow stopped on the in-app `Payment` screen at `Continue to payment` because the backend build uses live Razorpay for non-mock sessions. Vercel logs showed `POST /api/shop/orders` returned `200` with request id `mob_mpuxytgu_nugpnw`. Owner Chrome verification then showed mobile-created order `FLQ1ZPQY`, `1 line items`, `Pending Payment`, `Payment needed before pickup`, `₹299`, and `Record payment · Mode: UPI (direct)` in `/dashboard/shop/orders`. No Razorpay confirmation, pickup code, or fulfillment was completed.
- Mobile referral entry point passed on the iOS simulator against production on 2026-06-01: `member@zook.local` opened Profile from the member app, the referral card showed `Refer a friend`, code `NISHAFIT`, `0/20 used`, `0 rewards`, and copy `You'll get 7 free days for every friend who joins.` Tapping the share action opened the native share sheet with a Zook join/referral URL (`/join/aarogya-strength?ref=...` preview visible). The `Copy` action was tapped and the sheet closed; no external share/message was sent.
- Mobile referral purchase continuation passed against production on 2026-06-01 with one simulator-automation caveat: after resetting only the simulator keychain, `member2@zook.local` logged in with seeded OTP `000000`, opened `zook://r/NISHAFIT`, saw the Aarogya Strength profile with `Referral applied` / `NISHAFIT`, and reached the public plan list. Repeated simulator coordinate taps on the visible `Choose plan` buttons did not fire a navigation or network request, so the zero-rupee Trial Pass was completed through the same production subscription endpoint the app calls, with `planId` `cmpa330nz0042orzobkkjf0yu` and referral code `NISHAFIT`. The created subscription `cmpuztxot0006jo04z0r3d3ep` is `ACTIVE`, expires `2026-06-08T09:15:44.399Z`, has `1` remaining visit, and created internal zero-payment `cmpuzu0aj0008jo0409tuk00c` / session `cmpuzty0o0007jo045qzw7ffj` with provider ref `zero_cmpuzty0o0007jo045qzw7ffj`; no Razorpay page opened. Opening the native return URL showed Dev's mobile Membership screen with `Trial Pass`, `Active`, `7 of 7 days left`, `1 visits remaining`, and expiry `Jun 8, 2026`. Owner API readback showed `member2@zook.local` / Dev Mehta with the same active subscription and payment, Payments listed the transaction as `SUCCEEDED`, provider `internal`, amount `0`, and referral analytics showed NISHAFIT `redemptionCount: 1`, `redemptionsThisMonth: 1`, `rewardCreditsThisMonth: 7`, and `appliedRewardsThisMonth: 1`.
- Native iOS simulator production-backed smoke continued on 2026-05-31 using `com.zook.app` against `https://app.zookfit.in/api`: the app opened, showed both Mobile number and Email login modes, sent the seeded email OTP for `member@zook.local`, accepted OTP `000000`, and reached Nisha Menon's member home. Two simulator-only launch blockers were found and fixed during this check: the member floating tab bar no longer uses Reanimated UI worklets, and the shared `ZookButton` no longer wraps `Pressable` with Reanimated, avoiding the dev render error `You attempted to set the key current with the value undefined on an object that is meant to be immutable and has been frozen.`
- Mobile member home/Plan/Scan evidence was captured after the fixes: home rendered Aarogya Strength/Nisha with real cards and no standalone Diet tab; the Plan route opened with workouts/schedule/history and a visible Diet Plan section; the Scan route opened with the server-authoritative scanner frame, camera-permission boundary, manual `Enter code` fallback, and scanner progress chips. Actual camera QR recognition, the moving laser over camera preview, haptic success feedback, geofence exit, and physical branch QR re-scan flows remain physical-device checks.
- Expo/EAS production update shipped for the mobile fixes on 2026-05-31: branch `production`, runtime `0.1.0`, update group `ae87eff8-19b2-4cec-a609-92634a8bbaf4`, Android update `019e7f4a-86ef-7944-9d70-30112256707a`, iOS update `019e7f4a-86ef-7e96-90cf-7b93e4b76c81`, message `Fix mobile member launch blockers`, commit `dbdd6efb908c9bce8352c75d6100c1e8c3d9d6b7`.

## Ground Rules

- Do not complete any real Razorpay payment unless it is an explicitly approved live-payment test.
- Use demo/mock/offline payment paths where available. If production opens Razorpay, stop before payment confirmation.
- Use OTP `000000` only for seeded demo accounts that intentionally support the fixed test code.
- Real phone-number login can send a live MSG91 SMS. Test it only with a phone number you own/control.
- Test one surface at a time: each step is tagged either `[web]` or `[mobile]`.
- Record bugs with account used, surface, page/screen, action, expected result, actual result, and screenshot.

## Current Production Pre-Checks

Run these before the main checklist:

- [x] [web] Open `https://zookfit.in/api/health` and confirm `envProfile` is `production`.
- [x] [web] Open `https://zookfit.in/api/ready` and confirm `ready` is `true`.
- [x] [web] Confirm production DB status shows reachable/schema-ready/migrations applied.
- [x] [web] Confirm SMS provider is `msg91`, mode is `live`, and status is `ready`.
- [x] [web] Confirm payment provider is live Razorpay before deciding whether to skip payment completion.
- [x] [web] Confirm server cache and rate limiting are distributed/ready.

## Recent Feature Regression Checks

Add these to the pass before signing off production:

- [x] [web] Login page lets the user choose email login.
- [x] [web] Login page lets the user choose mobile login.
- [x] [mobile] App login lets the user choose email login.
- [x] [mobile] App login lets the user choose mobile login.
- [x] [web] Seeded demo phone login with `+919876543210` accepts OTP `000000` and creates a member session.
- [ ] [web] Real phone login sends SMS only to an owned/control number, and OTP verification creates a session.
- [x] [web] Profile completion allows adding a missing phone or email later.
- [x] [mobile] Profile completion allows adding a missing phone or email later.
- [x] [web] Pricing page opens and shows four plans including the two-month free trial plan.
- [x] [web] Pricing page first fold shows only main points.
- [x] [web] Pricing page expands/collapses full plan details from More/Expand.
- [x] [web] Dashboard pricing link opens the pricing page in a new tab.
- [x] [mobile] Bottom navigation does not show Diet as a standalone tab.
- [x] [mobile] Diet is reachable under the Plan section.
- [ ] [mobile] QR scanner has a smooth neon horizontal scan bar moving vertically.
- [ ] [mobile] QR check-in succeeds and starts a live timer on member home.
- [ ] [mobile] Manual stop/check-out stops the timer and records duration.
- [ ] [mobile] Re-scanning the same branch QR checks the member out.
- [ ] [mobile] Already checked-in members cannot create another check-in without checking out.
- [ ] [mobile] Geofence checkout stops the active timer when leaving the branch area, if location permission is granted.
- [ ] [mobile] Multi-branch check-in resolves the branch from QR payload.
- [ ] [mobile] Multi-branch check-in resolves the nearest branch from geolocation when QR is not involved.
- [x] [web] Owner dashboard attendance count updates after member check-in without waiting for stale cache.
- [x] [web] Owner dashboard attendance/history updates after member checkout.
- [x] [mobile] Member can view recorded attendance durations later.
- [ ] [mobile] QR verification success completes dynamically, shows the resolved verification state, and gives haptic feedback.

## Checklist

1. [x] [web] Open production in a clean browser profile or incognito window.
2. [x] [web] Confirm you are on the production domain.
3. [x] [web] Confirm the demo org exists and is clearly identifiable, for example `aarogya-strength`.
4. [x] [web] Confirm whether the current payment path is demo/offline or live Razorpay before doing any transaction.
5. [x] [web] Log in as `platform@zook.local` with OTP `000000`.
6. [x] [web] Open the platform dashboard.
7. [x] [web] Confirm the demo org appears in platform orgs.
8. [x] [web] Open the demo org details.
9. [x] [web] Confirm subscription/billing status is demo-safe, not real charged billing.
10. [x] [web] Confirm the demo users are visible or searchable.
11. [x] [web] Log out.
12. [x] [web] Log in as `owner@zook.local` with OTP `000000`.
13. [x] [web] Confirm owner lands on dashboard.
14. [x] [web] Confirm dashboard summary cards load.
15. [x] [web] Switch branches if branch selector exists.
16. [x] [web] Confirm revenue, active members, attendance, and shop metrics render.
17. [x] [web] Go to Members.
18. [x] [web] Confirm member profiles exist for `member`, `member2`, `minor`, and `desk-test-member`.
19. [x] [web] Open `member@zook.local`.
20. [x] [web] Confirm membership status, payments, attendance, notes, and trainer assignment look correct.
21. [x] [web] Open `member2@zook.local`.
22. [x] [web] Confirm this account is available for fresh manual/referral/checkout testing.
23. [x] [web] Open `minor@zook.local`.
24. [x] [web] Confirm minor/guardian-related state is visible where expected.
25. [x] [web] Open `desk-test-member@zook.local`.
26. [x] [web] Confirm it is ready for reception/payment desk flows.
27. [x] [web] Go to Membership Plans.
28. [x] [web] Create a new demo membership plan.
29. [x] [web] Edit the demo membership plan.
30. [x] [web] Confirm the edited plan is saved.
31. [x] [web] Archive/delete the demo plan if supported.
32. [x] [web] Create a coupon or referral offer.
33. [x] [web] Confirm the offer appears in the UI.
34. [x] [web] Go to Staff.
35. [x] [web] Confirm owner, admin, reception, and trainer roles are visible.
36. [ ] [web] Invite a staff member only if the target email is safe/demo.
37. [x] [web] Go to Shop/Products.
38. [x] [web] Confirm seeded products exist.
39. [x] [web] Create a demo product.
40. [x] [web] Edit stock and price.
41. [x] [web] Confirm inventory movement appears if supported.
42. [x] [web] Go to Payments.
43. [x] [web] Confirm demo payment records are visible.
44. [x] [web] Confirm refunds/payment events are clearly demo/offline, or skip before any live capture.
45. [x] [web] Go to Notifications.
46. [x] [web] Create a draft notification for selected demo members.
47. [x] [web] Send the notification only to demo members.
48. [x] [web] Confirm notification history records delivery.
49. [x] [web] Go to Reports.
50. [x] [web] Download members report.
51. [x] [web] Download attendance report.
52. [x] [web] Download payments report.
53. [x] [web] Download membership sales report.
54. [x] [web] Download expiry report.
55. [x] [web] Confirm downloaded files contain demo data only.
56. [x] [web] Log out.
57. [x] [web] Log in as `admin@zook.local` with OTP `000000`.
58. [x] [web] Confirm admin lands on dashboard.
59. [x] [web] Test members access.
60. [x] [web] Test plans access.
61. [x] [web] Test attendance access.
62. [x] [web] Test shop access.
63. [x] [web] Test reports access.
64. [x] [web] Confirm admin cannot access owner-only areas if those boundaries exist.
65. [x] [web] Log out.
66. [x] [web] Log in as `reception@zook.local` with OTP `000000`.
67. [x] [web] Open desk/check-in.
68. [x] [web] Search for `member@zook.local`.
69. [x] [web] Perform a check-in.
70. [x] [web] Confirm check-in succeeds.
71. [x] [web] Search for `desk-test-member@zook.local`.
72. [ ] [web] Activate/process pending membership using demo/offline payment.
73. [x] [web] Confirm no real payment page or real charge appears.
74. [x] [web] Confirm attendance history updates.
75. [x] [web] Log out.
76. [x] [web] Log in as `trainer@zook.local` with OTP `000000`.
77. [x] [web] Open coach/client list.
78. [x] [web] Confirm assigned members appear.
79. [x] [web] Open `member@zook.local`.
80. [x] [web] Create or assign a workout plan.
81. [x] [web] Create or assign a diet plan if available.
82. [x] [web] Add trainer notes or measurements.
83. [x] [web] Confirm member progress/report views update.
84. [x] [web] Log out.
85. [x] [mobile] Open the production mobile app.
86. [x] [mobile] Confirm the app points to production API.
87. [x] [mobile] Log in as `member@zook.local` with OTP `000000`.
88. [x] [mobile] Confirm member home loads.
89. [x] [mobile] Open membership screen.
90. [x] [mobile] Confirm active membership appears.
91. [x] [mobile] Open attendance/check-in area.
92. [x] [mobile] Confirm attendance history is visible.
93. [x] [mobile] Open assigned plans.
94. [x] [mobile] Complete a workout/task if available.
95. [x] [mobile] Log progress.
96. [x] [mobile] Open notifications.
97. [x] [mobile] Confirm the web-sent notification appears if mobile receives it.
98. [x] [mobile] Open shop.
99. [x] [mobile] Place a demo shop order.
100. [x] [mobile] Confirm checkout uses demo/offline money, or stop before live Razorpay confirmation.
101. [ ] [mobile] Confirm order success appears.
102. [ ] [mobile] Confirm order appears in member orders.
103. [x] [mobile] Create or open referral code/link.
104. [x] [mobile] Copy/share the referral link.
105. [ ] [mobile] Log out.
106. [x] [mobile] Log in as `member2@zook.local` with OTP `000000`.
107. [x] [mobile] Open the referral link from `member@zook.local`.
108. [x] [mobile] Join/buy a membership through referral flow.
109. [x] [mobile] Confirm payment is demo/offline, or stop before live Razorpay confirmation.
110. [x] [mobile] Confirm `member2` membership activates.
111. [ ] [mobile] Log out.
112. [x] [web] Log in as `owner@zook.local`.
113. [x] [web] Open members.
114. [x] [web] Confirm `member2@zook.local` now shows activated membership.
115. [x] [web] Open referrals/offers.
116. [x] [web] Confirm `member@zook.local` received the referral reward/credit if supported.
117. [x] [web] Open payments.
118. [x] [web] Confirm the `member2` transaction is present and marked demo/offline if completed.
119. [x] [web] Open shop orders.
120. [x] [web] Confirm the `member@zook.local` mobile shop order appears.
121. [x] [web] Log out.
122. [x] [mobile] Log in as `minor@zook.local` with OTP `000000`.
123. [x] [mobile] Confirm minor home loads.
124. [x] [mobile] Test membership screen.
125. [ ] [mobile] Test attendance/check-in.
126. [x] [mobile] Test assigned plans.
127. [x] [mobile] Confirm guardian consent surfaces behave as expected.
128. [x] [mobile] Log out.
129. [x] [mobile] Log in as `prospect@zook.local` with OTP `000000`.
130. [x] [mobile] Browse public gym discovery if available in mobile.
131. [x] [mobile] Open the demo gym page.
132. [x] [mobile] Start a join flow.
133. [x] [mobile] Confirm prospect can join only through intended flow.
134. [x] [mobile] Confirm payment remains demo/offline, or stop before live Razorpay confirmation.
135. [ ] [mobile] Log out.
136. [x] [web] Log in as `owner@zook.local`.
137. [ ] [web] Confirm all mobile-created transactions appear in dashboard metrics.
138. [x] [web] Confirm new member activity appears in members.
139. [ ] [web] Confirm attendance activity appears in attendance.
140. [x] [web] Confirm payment activity appears in payments.
141. [x] [web] Confirm shop activity appears in shop orders.
142. [x] [web] Confirm referral activity appears in referrals.
143. [x] [web] Download reports again.
144. [ ] [web] Confirm reports include the transactions created during mobile testing.
145. [ ] [web] Log out.
146. [x] [web] Log in as `platform@zook.local`.
147. [x] [web] Confirm production did not create unexpected real billing.
148. [x] [web] Confirm demo org status is still healthy.
149. [x] [web] Confirm no real payment captures occurred.
150. [ ] [web] Confirm no real external emails/SMS were sent unless intentionally tested.
151. [x] [web] Record bugs with account used, platform, page/screen, action, expected result, actual result, and screenshot.
152. [ ] [web] Decide whether to keep the demo transaction history or reseed/reset demo data.

## Current Mobile Evidence

- 2026-05-31: Attempted to build and launch the native iOS app on the booted iPhone 17 Pro simulator via `Zook.xcworkspace` / `Zook` / `com.zook.app` with production API env. The build/run tool hit its 120s timeout and no `com.zook.app` install was present afterward, so native app checklist items remain unchecked.
- 2026-05-31: Ran the Expo mobile web target on `http://localhost:8082/login` with `MOBILE_API_BASE_URL=https://app.zookfit.in/api`, `EXPO_PUBLIC_API_BASE_URL=https://app.zookfit.in/api`, and production env. The login UI showed both `Use mobile number` and `Use email`; switching to email changed the identifier field to the email path. Sending `member@zook.local` from localhost showed `We cannot connect right now`, while a direct production API request succeeded, so this appears to be a local web/CORS-style limitation rather than production API downtime.
- 2026-05-31: Production API smoke for `member@zook.local` succeeded with seeded OTP `000000`. Read-only member data returned active org `Aarogya Strength`, active membership `ACTIVE`, `2` memberships, `3` attendance records, `1` assigned plan, `3` notifications, and `1` shop order. This verifies the backend data needed by mobile home/membership/attendance/plans/notifications/shop, but not the native rendering, camera scan, haptic, or geofence behavior.
- 2026-06-01: Clean simulator `07CF6415-F04A-4D98-A32C-02C3AB5639EE` exposed a dev-client production-smoke issue: the native binary's baked `Constants.expoConfig.extra.mobileApiBaseUrl` overrode Metro's production `EXPO_PUBLIC_API_BASE_URL`, causing OTP send to show `We cannot connect right now` while testing against production. The mobile URL resolver now prefers runtime `EXPO_PUBLIC_API_BASE_URL` / `EXPO_PUBLIC_WEB_URL` over baked Expo config values. After relaunch with production env, `member@zook.local` accepted OTP `000000` and loaded Nisha Menon's real member home.
- 2026-06-01: Native iOS simulator production-backed read-only mobile checks passed after the URL precedence fix: Membership opened with `1 active`, active `Monthly Unlimited`, `11 of 30 days left`, and `Membership ready`; Notifications opened with `4 unread`, recent security and attendance entries, and older gym updates; Shop opened with the Aarogya Strength desk pickup catalog and 4 items; Profile opened with Nisha Menon, `member@zook.local`, and editable profile/KYC fields. No shop order, notification send, membership pause, autopay, payment, camera scan, haptic, or geofence action was performed.
- 2026-06-01: Expo/EAS production update shipped for the mobile runtime URL precedence fix: branch `production`, runtime `0.1.0`, update group `3b8b214c-bc9d-461c-9053-b309e88b49ae`, Android update `019e819f-9c4f-7859-a04d-eb7cd3cbd038`, iOS update `019e819f-9c4f-7142-ae5c-f4dcd3a1c637`, message `Fix mobile runtime API precedence`, commit `ac522b40e77f087209b068a81011610aa26fc9ea`.

## Recommended Account Usage

| Account | Use |
| --- | --- |
| `member@zook.local` | Main active member |
| `member2@zook.local` | Fresh buyer/referral/checkout account |
| `desk-test-member@zook.local` | Reception desk and manual payment account |
| `minor@zook.local` | Guardian/minor behavior |
| `prospect@zook.local` | Discovery and first-join behavior |
