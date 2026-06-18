# Zook Full Product Manual QA Plan

Date: 2026-05-26

Purpose: step-by-step release validation for the web dashboard, public web product, desk app, platform console, and the shared Expo mobile app on iOS and Android.

This plan is written as a human checklist. Every test should capture evidence: screen recording or screenshots, timestamp, environment, tester, account used, device/browser, and pass/fail notes.

## 0. Test Rules

- Do not treat a client redirect as payment success. Confirm payment/session state from backend UI, API, invoice, or webhook evidence.
- Do not use production money movement unless explicitly approved for that test window.
- Do not test secrets by exposing them in screenshots or logs.
- Test iOS and Android separately for mobile flows, even though the codebase is shared.
- Test light and dark mode wherever a screen has theme support.
- For every failed test, record reproduction steps, expected result, actual result, account, org, branch, payment/session ID, and logs if available.

## 1. Required Test Environments

### 1.1 Web

- Chrome desktop, latest stable.
- Chrome mobile viewport simulation for public pages and dashboard responsive checks.
- Production-like deployment URL.
- Local/staging URL if testing before deploy.

### 1.2 Mobile

- iOS physical device.
- Android physical device.
- iOS simulator for fast repeat checks.
- Android emulator for fast repeat checks.
- Build profile must point to the intended backend.
- Confirm app scheme `zook://` deep links open the installed app.

### 1.3 Backend and Providers

- Database access to confirm records when needed.
- Razorpay test or controlled live mode.
- Resend/email mailbox.
- MSG91/STPL state known. If `SMS_PROVIDER=disabled`, record as expected.
- Expo push configured for device push tests.
- Sentry staging/project access.
- Platform admin account.

## 2. Personas and Accounts

Create or identify these before testing:

- Platform admin: can access `/platform`.
- Owner: full owner permissions for one gym.
- Admin: dashboard permissions except platform-only controls.
- Reception user: desk and reception mobile permissions.
- Trainer: assigned to at least one member.
- Active member: has active subscription, attendance history, assigned plan, diet, shop eligibility.
- Pending member: join request not yet approved.
- Expired member: subscription expired or about to expire.
- New prospect: no account or no gym membership.
- Minor member or guardian flow account, if guardian consent is enabled in test data.
- Multi-org user: belongs to at least two gyms and can switch active org.

## 3. Seed Data Checklist

Before starting:

- One public gym with profile, address, amenities, public plans, offers, and join mode open.
- One approval-required gym.
- One gym in trial without SaaS mandate.
- One gym with authenticated SaaS mandate.
- One gym with active paid SaaS subscription.
- At least two branches.
- Membership plans: paid monthly, paid yearly, trial/free, limited visits.
- Coupons: fixed amount, percentage, expired, max-use, invalid.
- Referral policy: enabled, paused, invitee-only reward, referrer-only reward, both-sided reward, capped reward.
- Referral codes: active, paused, expired, maxed-out, self-referral candidate.
- Shop products: in-stock, low-stock, out-of-stock, photo/no-photo.
- Payments: succeeded, pending, failed, refundable, already refunded, manual/offline.
- Attendance: approved today, pending, rejected, duplicate scan candidate.
- Notifications: template, sent notification, unread member notification.
- Trainer: assigned client, workout plan draft, published plan, diet plan, PT sessions, payout draft.

## 4. Preflight Checks

1. Run web checks:
   - `pnpm typecheck`
   - `pnpm lint`
   - `pnpm test:services`
   - `RUN_DB_WEB_TESTS=1 pnpm test:web`
   - `pnpm release:preflight`
2. Run mobile checks:
   - `pnpm --filter @zook/mobile typecheck`
   - `pnpm --filter @zook/mobile lint`
   - `pnpm --filter @zook/mobile test`
   - `pnpm mobile:release:check`
3. Confirm `/api/health`, `/api/ready`, and `/api/status` return expected state.
4. Confirm production or staging env does not use fixed OTP, mock payments, weak secrets, local URLs, or silent offline demo.
5. Confirm SMS expected state:
   - If MSG91 is not approved, `SMS_PROVIDER=disabled` is expected.
   - If MSG91 is enabled, verify `MSG91_TEMPLATE_ID`, sender/header, and real OTP send.

## 5. Public Web Acquisition

### 5.1 Landing and Trust Pages

1. Open `/`.
2. Verify brand, primary CTAs, public gym discovery link, login link, start gym link.
3. Open `/privacy`, `/terms`, `/support`, `/status`.
4. Verify all pages load on desktop and mobile viewport.
5. Verify `/status` reflects provider state without exposing secrets.

### 5.2 Gym Discovery

1. Open `/gyms`.
2. Search by gym name, city, and partial text.
3. Open a public gym result.
4. Verify name, address, operating info, plans, offers, join CTA, and referral entry are visible.
5. Try empty search and no-result search.

### 5.3 Public Gym Routes

1. Open `/g/[username]`.
2. Open `/in/[username]`.
3. Confirm both resolve to the intended gym experience.
4. Try an invalid username and confirm a clean not-found or recovery state.

### 5.4 Public Join

1. Open `/join/[username]`.
2. Test open join mode.
3. Test approval-required join mode.
4. Test invite/referral-assisted join mode.
5. Validate required fields, invalid phone/email, duplicate member, already-member, and missing plan states.
6. Confirm backend join mode controls behavior; query params must not override protected backend settings.

### 5.5 Referral Landing

1. Open `/r/[activeCode]`.
2. Confirm it resolves to the intended gym/referral context.
3. Open `/r/[pausedCode]`, `/r/[expiredCode]`, `/r/[maxedCode]`, and random invalid code.
4. Confirm each state gives a clear user path and does not apply invalid discounts.

### 5.6 Web Checkout Pages

1. Open `/checkout/[sessionId]` for a valid pending session.
2. Confirm provider checkout state and order/payment summary.
3. Open `/checkout/mock/[sessionId]` only in local or explicitly allowed test-provider mode.
4. Complete mock checkout and confirm backend fulfillment.
5. Open an invalid session and confirm safe not-found/error state.
6. Refresh the checkout success/return page and confirm fulfillment is idempotent.

### 5.7 Member Web Pages

1. Open `/me` as a signed-in member.
2. Open `/me/[handle]` for public/private handle cases.
3. Open `/m/[slug]` and `/m/diet`.
4. Confirm member profile, membership, diet, and privacy visibility rules.
5. Confirm unauthenticated users are redirected or shown public-safe content only.

### 5.8 Coach and Guardian Web Pages

1. Open `/coach`.
2. If AI is disabled, confirm a clear disabled state.
3. If AI is enabled, test chat/plan assistant permissions and usage logging.
4. Open `/guardian-consent`.
5. Open `/guardian/consent/[challengeId]` with valid, expired, and invalid challenge IDs.
6. Confirm consent records and minor account behavior update correctly.

### 5.9 Staff Invite and OTP Verification Pages

1. Open `/staff/invite/[token]` with a valid invite.
2. Accept invite and confirm role/permission assignment.
3. Open with expired, used, and invalid invite tokens.
4. Open `/verify-otp` in a normal OTP flow.
5. Confirm reload/back-button behavior does not lose the intended login state.

## 6. Authentication and Account

### 6.1 Email OTP

1. Open `/login`.
2. Request OTP for a valid email.
3. Verify success message and rate-limit copy.
4. Submit wrong OTP.
5. Submit expired OTP.
6. Submit correct OTP.
7. Confirm session lands on the right role home.

### 6.2 Phone OTP

1. If SMS disabled, verify phone OTP is unavailable or safely messaged.
2. If MSG91 enabled, request OTP for a real phone.
3. Confirm SMS arrives with approved template/header.
4. Verify wrong, expired, and correct OTP behavior.
5. Confirm rate limits and retry behavior.

### 6.3 OAuth

1. Test Google login on web Chrome.
2. Test Apple login on iOS.
3. Test OAuth cancellation.
4. Test account collision with same email.
5. Confirm session refresh after reload/app restart.

### 6.4 Profile and Session

1. Edit name, handle, photo, phone, email, locale, emergency contact.
2. Verify contact changes require verification where expected.
3. Logout and confirm protected routes redirect.
4. Login as multi-org user and switch active org/role.
5. Confirm role switch changes available navigation.

## 7. New Gym Onboarding and SaaS Billing

### 7.1 Start Gym

1. Open `/start-gym`.
2. Create a gym with valid information.
3. Try missing required fields and duplicate username.
4. Confirm organization is created in trial state.
5. Confirm owner is redirected to `/dashboard/billing` on web.
6. Confirm owner mobile shows billing setup requirement and `/owner/billing`.

### 7.2 Trial and Mandate Gating

1. Use a trial gym without SaaS mandate.
2. Open read/setup routes and confirm allowed.
3. Try owner/admin write routes: members, plans, notifications, shop edits, staff invite.
4. Confirm gated routes are read-only or redirect to billing with clear toast/message.
5. Create/authenticate SaaS mandate.
6. Retry the same writes and confirm access works.

### 7.3 SaaS Upgrade

1. Open `/dashboard/billing`.
2. Confirm pricing tiers: Starter, Growth, Pro, monthly/yearly.
3. Upgrade to each tier in test mode.
4. Confirm checkout opens.
5. Complete checkout/provider flow.
6. Confirm subscription status, tier, billing cycle, mandate, invoice, next billing.
7. Repeat on mobile `/owner/billing`.
8. Confirm mobile checkout return lands back on `/owner/billing`.

### 7.4 SaaS Cancel and Reactivation

1. Cancel active SaaS subscription.
2. Confirm cancel-at-period-end or endpoint-specific cancel state.
3. Confirm owner UI shows the state.
4. Confirm platform subscription row updates.
5. Reactivate or upgrade again if supported.

### 7.5 Delayed Charge and Idempotency

1. Simulate delayed SaaS charge after trial.
2. Confirm old setup payment session expiry does not block fulfillment.
3. Replay same webhook/event.
4. Confirm no duplicate subscription, invoice, reward, or notification records.

## 8. Web Dashboard Core

### 8.1 Shell and Navigation Performance

1. Login as owner.
2. Open `/dashboard`.
3. Move through every sidebar section.
4. Confirm shell/sidebar/header remain stable.
5. Confirm cached sections do not blank.
6. Confirm uncached sections show a slim progress/loading state.
7. Hover/focus sidebar links and verify likely data prefetch behavior by perceived instant navigation.
8. Test with slow network throttling.

### 8.2 Dashboard Overview and Charts

1. Verify real 7-day revenue chart.
2. Verify real 30-day revenue in reports.
3. Verify 7-day attendance chart.
4. Verify 30-day member growth chart.
5. Verify active plan mix chart.
6. Compare chart numbers against payment, attendance, member, and plan records.
7. Test empty gym: charts should show zeroed real series, not fake data.
8. Confirm deltas come from real periods.

### 8.3 Toasts and Themes

1. In light mode, trigger success, error, warning, and info toasts.
2. Confirm title/body readable.
3. Repeat in dark mode.
4. Confirm no invisible text or low contrast.

## 9. Web Dashboard Sections

### 9.1 Members `/dashboard/members`

1. Search by name, email, phone, member ID.
2. Open member detail drawer/page.
3. Verify subscription, payment, attendance, plan, profile data.
4. Edit allowed member fields.
5. Test invalid data validation.
6. Test member with missing phone/email.
7. Confirm permission restrictions for non-owner roles.

### 9.2 Join Requests `/dashboard/members/join-requests`

1. View pending requests.
2. Approve a request.
3. Reject a request with reason.
4. Confirm member state updates.
5. Confirm notifications/audit where expected.
6. Repeat on reception mobile if queue is exposed there.

### 9.3 Attendance `/dashboard/attendance`

1. View today attendance.
2. View pending attendance.
3. Approve pending record.
4. Reject pending record with reason.
5. Create manual attendance with reason.
6. Test duplicate/manual edge case.
7. Confirm audit trail.

### 9.4 QR Display `/dashboard/attendance/qr-display`

1. Open rolling QR.
2. Confirm QR refreshes or expires as expected.
3. Scan from member mobile.
4. Confirm signed token validation and correct branch.
5. Test expired QR.

### 9.5 Payments `/dashboard/payments`

1. View payment list.
2. Filter/search payments.
3. Open payment detail.
4. Generate/view receipt.
5. Generate/view invoice.
6. Confirm buyer/seller info and GST/legal details.
7. Confirm failed/pending payments do not show as fulfilled.

### 9.6 Refunds `/dashboard/payments/refunds`

1. Open refundable payment.
2. Submit refund with reason.
3. Try refund without reason.
4. Try duplicate refund.
5. Confirm provider event/state and audit log.
6. Confirm member/order/subscription impact if applicable.

### 9.7 Billing `/dashboard/billing`

1. Update billing profile.
2. Create SaaS mandate.
3. Upgrade plan.
4. Cancel subscription.
5. Confirm trial dates, next billing, mandate status, active member count.
6. Confirm permission restrictions.

### 9.8 Membership Plans `/dashboard/membership-plans` and `/dashboard/plans`

1. Create plan.
2. Edit plan.
3. Archive/deactivate plan.
4. Test public visibility.
5. Test trial/free/zero-price plan.
6. Confirm member purchase preview matches checkout amount.

### 9.9 Coupons `/dashboard/plans/coupons`

1. Create fixed discount coupon.
2. Create percentage coupon with cap.
3. Test expiry, max uses, plan restrictions.
4. Apply coupon in public/member checkout.
5. Confirm preview and final payment match.
6. Confirm zero-amount checkout fulfills internally.

### 9.10 Offers `/dashboard/plans/offers`

1. Create public offer.
2. Edit offer.
3. Pause/expire offer.
4. Confirm offer appears on public gym profile and join flow.
5. Confirm offer discount combines correctly with coupon/referral rules.

### 9.11 Referrals `/dashboard/plans/referrals`

1. Enable referral policy.
2. Pause referral policy.
3. Configure referrer reward type/value.
4. Configure referred discount type/value.
5. Configure cap, monthly limit, expiry, trainer/staff code permissions.
6. Create referral code.
7. Pause and reactivate code.
8. Redeem active code from public web.
9. Redeem active code from mobile `/r/[code]`.
10. Test self-referral block.
11. Test same-email block.
12. Test duplicate redemption block.
13. Test expired/maxed/monthly-limit blocks.
14. Complete checkout and verify reward status.
15. Replay webhook and confirm no duplicate reward.

### 9.12 Staff `/dashboard/staff`

1. Invite staff by email/phone.
2. Accept staff invite `/staff/invite/[token]`.
3. Assign owner/admin/reception/trainer/member roles as allowed.
4. Remove or change role.
5. Confirm route access changes immediately after re-login/session refresh.
6. Confirm audit log.

### 9.13 Branches `/dashboard/branches`

1. Create branch.
2. Edit branch name, address, phone, WhatsApp number, hours.
3. Switch active branch where supported.
4. Confirm attendance, stock, payments, and reports respect branch context.

### 9.14 Shop `/dashboard/shop`

1. Create product.
2. Edit product name, price, description, category.
3. Upload/change/remove product photo.
4. Update stock.
5. Test low-stock and out-of-stock state.
6. Confirm public/mobile shop reflects product state.

### 9.15 Shop Orders `/dashboard/shop/orders`

1. View orders.
2. Filter by status.
3. Open order detail.
4. Confirm paid order ready for pickup.
5. Confirm fulfilled order is not fulfillable again.

### 9.16 Notifications `/dashboard/notifications`

1. Compose notification.
2. Select all members.
3. Select segment/audience.
4. Select individual member.
5. Preview audience count.
6. Send notification.
7. Confirm member mobile inbox receives it.
8. Confirm push attempt if push is enabled.
9. Confirm sender budget/rate-limit behavior.

### 9.17 Notification Templates `/dashboard/notifications/templates`

1. Create template.
2. Edit template.
3. Delete template.
4. Use template in composer.
5. Confirm permissions.

### 9.18 Notification History `/dashboard/notifications/history`

1. View delivery history.
2. Open a sent notification.
3. Confirm recipients, delivery state, push state, and timestamps.

### 9.19 Reports `/dashboard/reports`

1. Open reports.
2. Verify revenue, attendance, member growth, plan mix.
3. Compare numbers with source records.
4. Export reports if export is available.
5. Test empty date range.

### 9.20 Payouts `/dashboard/payouts`

1. View trainer payout drafts.
2. Add adjustment if supported.
3. Mark payout paid.
4. Confirm trainer mobile payout view updates.
5. Confirm audit.

### 9.21 Public Profile `/dashboard/public-profile`

1. Edit gym public name, description, address, amenities, images.
2. Save changes.
3. Open `/g/[username]` and confirm updates.
4. Test invalid image/file and validation.

### 9.22 Audit `/dashboard/audit`

1. Confirm recent actions appear: refund, manual attendance, staff change, billing, referral.
2. Filter/search if available.
3. Confirm sensitive data is redacted.

### 9.23 AI `/dashboard/ai`

1. If AI disabled, confirm safe disabled state.
2. If enabled, send assistant prompt.
3. Test quota/permission behavior.
4. Confirm usage appears in org and platform AI usage.

### 9.24 Settings `/dashboard/settings` and `/dashboard/profile`

1. Update org settings.
2. Update owner/admin profile.
3. Test language/locale if present.
4. Confirm invalid data validation.
5. Confirm protected settings are permission-gated.

## 10. Desk Web App

### 10.1 Desk Home `/desk`

1. Login as reception.
2. Verify daily summary, queues, quick actions.
3. Confirm owner-only controls are hidden.

### 10.2 Desk Members `/desk/members`

1. Search member.
2. Open member.
3. Confirm membership, due amount, attendance eligibility.

### 10.3 Desk Payments `/desk/payments` and `/desk/payments/new`

1. View payments.
2. Record manual payment.
3. Enter invalid amount.
4. Enter valid amount with reason/context.
5. Confirm receipt/invoice where expected.
6. Confirm audit.

### 10.4 Desk Orders `/desk/orders`

1. Search order by member/order/pickup code.
2. Verify paid order.
3. Fulfill pickup.
4. Try invalid pickup code.
5. Try duplicate fulfillment.

### 10.5 Desk QR `/desk/qr`

1. Display QR.
2. Scan with member mobile.
3. Confirm approved/pending/rejected states.

## 11. Platform Web Console

### 11.1 Access Control

1. Login as platform admin and open `/platform`.
2. Login as non-platform user and confirm access denied.
3. Confirm platform admin cannot bypass tenant permission rules through gym routes.

### 11.2 Provider Status `/platform/status`

1. Confirm payment, email, SMS, WhatsApp, push, storage, maps, rate limits, AI states.
2. Confirm secrets are redacted.
3. Confirm disabled providers are clearly marked.

### 11.3 Users `/platform/users`

1. Search by email, phone, name.
2. Revoke a session.
3. Confirm target user is logged out.
4. Enable impersonation flag in controlled environment.
5. Start impersonation.
6. Confirm CRITICAL audit entry.
7. End impersonation.

### 11.4 Payments `/platform/payments`

1. Search across tenants.
2. Open payment.
3. Submit platform refund with reason.
4. Confirm duplicate refund protection.
5. Confirm audit and provider event state.

### 11.5 Broadcasts `/platform/broadcasts`

1. Create draft.
2. Publish broadcast.
3. Confirm in-app notification appears for target users.
4. Expire/delete broadcast.
5. Confirm throttling/chunking evidence for large audiences where possible.

### 11.6 Moderation `/platform/moderation`

1. Open flagged content.
2. Approve content with reason.
3. Remove content with reason.
4. Confirm audit.

### 11.7 Impersonations `/platform/impersonations`

1. Review history.
2. Confirm actor, target, start/end, reason, and risk level.

### 11.8 Webhooks `/platform/webhooks`

1. Review webhook attempts.
2. Replay a safe test webhook.
3. Confirm idempotent fulfillment.
4. Confirm failure state is visible.

### 11.9 Global Audit `/platform/audit`

1. Confirm platform, billing, refund, staff, privacy, feature flag actions appear.
2. Confirm secret redaction.

### 11.10 Feature Flags `/platform/flags`

1. Toggle non-dangerous test flag.
2. Confirm effect.
3. Toggle `platform.impersonation` only in controlled environment.
4. Confirm CRITICAL audit for sensitive flag.

### 11.11 Gyms `/platform/gyms`

1. Search organization.
2. Activate, suspend, cancel in test org.
3. Soft delete only on disposable org.
4. Rename org.
5. Transfer ownership.
6. Bulk import members.
7. Confirm all actions are audited.

### 11.12 Subscriptions `/platform/subscriptions`

1. Verify summary counts.
2. Verify each row: tier, cycle, price, credit, note, mandate, next billing, paid count, referrals.
3. Edit SaaS pricing.
4. Extend trial.
5. Add credit with reason.
6. Change tier.
7. Add platform subscription note.
8. Confirm owner billing views reflect changes.
9. Confirm audit.

### 11.13 Platform Referral Policy

1. View policy.
2. Edit reward type/value and limits.
3. Create new gym with platform referral code.
4. Confirm partnership record.
5. Do not mark live settlement complete unless business policy is approved.

### 11.14 Assistant, Safety, Incidents

1. Review AI usage.
2. Review safety flags.
3. Open incident checklist.
4. Confirm disabled/empty states are clean.

## 12. Mobile Common Tests on iOS and Android

Run this whole section on both iOS and Android.

### 12.1 Install and Launch

1. Install fresh build.
2. Launch app.
3. Confirm splash, app icon, app name, package/bundle identity.
4. Confirm no offline demo in production build.

### 12.2 Onboarding

1. Open onboarding index.
2. Complete language selection.
3. Complete value props.
4. Complete role question.
5. Complete permissions.
6. Deny permissions and confirm app remains usable.
7. Grant permissions and confirm state updates.

### 12.3 Login and Session

1. Login with email OTP.
2. Login with phone OTP if enabled.
3. Test OAuth on real device.
4. Kill app and relaunch.
5. Confirm session restores.
6. Logout.
7. Confirm protected routes redirect to login.

### 12.4 Role Switching

1. Use account with multiple roles.
2. Switch to member, owner, reception, trainer.
3. Confirm correct tabs/routes and permissions.
4. Confirm platform admin route only appears for platform admin.

### 12.5 Deep Links

1. Open `zook://payments/return?target=membership`.
2. Open `zook://payments/return?target=shop`.
3. Open `zook://payments/return?target=owner-billing`.
4. Open referral link `/r/[code]`.
5. Confirm each lands on the correct screen and refreshes cached data.

### 12.6 Theme and Toasts

1. Switch light mode.
2. Trigger success, error, warning, info toast.
3. Confirm readable text.
4. Switch dark mode and repeat.
5. Confirm no clipped text on small screens.

### 12.7 Offline and Network

1. Turn on airplane mode.
2. Open cached screens.
3. Try write action.
4. Confirm clear error/retry state.
5. Restore network and retry.

### 12.8 Mobile Navigation Aliases and Utility Routes

1. Open `/find-gyms` and confirm it lands on the gym discovery experience.
2. Open `/more` and confirm account/settings/role links are correct.
3. Open `/assistant`.
4. If AI is disabled, confirm a clean disabled state.
5. If AI is enabled, test chat/assistant permissions, quota, and safe error handling.
6. Open an unknown route and confirm `+not-found` recovery takes the user to the right role home.

## 13. Mobile Member App

### 13.1 Home `/(member)/index`

1. Confirm membership summary, due/renew state, attendance, plan, notifications, shop entry.
2. Test active, expired, pending approval, and no-membership accounts.

### 13.2 Membership `/membership/*`

1. Open membership overview.
2. Buy membership.
3. Apply coupon.
4. Apply referral.
5. Test zero-amount checkout.
6. Complete paid checkout.
7. Confirm return to membership screen.
8. Renew membership.
9. Enable autopay mandate.
10. Disable/cancel autopay.
11. Open history.
12. Open receipt `/membership/receipt/[paymentId]`.

### 13.3 Attendance Scan `/(member)/scan`

1. Scan valid QR.
2. Scan expired QR.
3. Scan wrong branch QR.
4. Scan duplicate within duplicate window.
5. Test expired member.
6. Confirm approved/pending/rejected result screen.
7. Open attendance detail `/attendance/[attendanceRecordId]`.

### 13.4 Plan and Diet

1. Open `/(member)/plan`.
2. Open `/plans` and `/plans/[assignmentId]`.
3. Mark workout progress.
4. Complete workout.
5. Open `/(member)/diet`.
6. Log meal.
7. Confirm latest published diet only.

### 13.5 Tracking

1. Open `/tracking`.
2. Add tracking entry.
3. Open `/tracking-entry`.
4. Open `/tracking-history`.
5. Confirm body progress, habits, goals, badges where present.

### 13.6 Shop

1. Open `/(member)/shop` and `/shop`.
2. Browse products.
3. Add to cart.
4. Edit quantity.
5. Remove item.
6. Checkout.
7. Complete payment.
8. Confirm return to shop.
9. Open order `/order/[orderId]`.
10. Open pickup `/shop/pickup/[orderId]`.
11. Confirm pickup code.

### 13.7 Notifications

1. Open `/notifications`.
2. Open `/notifications/[id]`.
3. Confirm unread/read behavior.
4. Tap notification deep link.
5. Test push notification on physical devices.

### 13.8 Profile and Settings

1. Open `/(member)/you`.
2. Open `/profile`, `/profile/edit`, `/profile/photo`, `/profile/extra-fields`.
3. Update account details.
4. Open settings account, appearance, language, notifications, privacy, support.
5. Submit data export request.
6. Submit account deletion request in test environment only.

### 13.9 Public Mobile Gym and Join

1. Open `/gyms`, `/gyms/[username]`, `/g/[username]`, `/gym/[username]`.
2. Open `/join/[username]`.
3. Join with referral.
4. Confirm referral short link routes to the correct gym.

## 14. Mobile Owner App

### 14.1 Owner Home `/owner`

1. Confirm summary metrics.
2. Confirm real charts: revenue, attendance, member growth, plan mix.
3. Confirm billing setup warning appears for no mandate.
4. Confirm workspace data does not blank when returning from child screens.

### 14.2 Owner Billing `/owner/billing`

1. View SaaS subscription state.
2. View trial dates, next billing, active member count.
3. Create mandate.
4. Upgrade Starter/Growth/Pro monthly/yearly.
5. Complete checkout and return to owner billing.
6. Cancel subscription.
7. Confirm platform referral code and referred count.
8. Confirm billing-required API error redirects here.

### 14.3 Approvals `/owner/approvals`

1. View join requests.
2. Approve.
3. Reject with reason.
4. Confirm member list updates.

### 14.4 Members `/owner/members` and `/owner/member/[id]`

1. Search members.
2. Open member detail.
3. Confirm subscription, payments, attendance, profile.
4. Confirm permission restrictions.

### 14.5 Revenue `/owner/revenue`

1. View revenue metrics.
2. Confirm charts match web dashboard/report data.
3. Confirm payment list/summary if present.

### 14.6 Stock `/owner/stock`

1. View product stock.
2. Confirm low/out-of-stock states.
3. Confirm changes from web dashboard shop appear.

## 15. Mobile Reception App

### 15.1 Home `/reception`

1. Confirm queue, member lookup, payment, order actions.
2. Confirm owner-only controls hidden.

### 15.2 Members

1. Open `/reception/members`.
2. Search member.
3. Open `/reception/members/[id]`.
4. Confirm membership state and attendance eligibility.

### 15.3 Payments

1. Open `/reception/payments`.
2. Open `/reception/payments/new`.
3. Record manual payment with reason.
4. Test invalid amount.
5. Confirm payment appears in web dashboard.

### 15.4 Orders

1. Open `/reception/orders`.
2. Search pickup order.
3. Verify pickup code.
4. Fulfill order.
5. Test invalid code and duplicate fulfillment.

### 15.5 Attendance Verification

1. Open `/reception/verification/[recordId]`.
2. Approve pending attendance.
3. Reject pending attendance with reason.
4. Confirm member result and audit.

## 16. Mobile Trainer App

### 16.1 Trainer Home `/trainer`

1. Confirm assigned clients, today tasks, payouts/plan shortcuts.
2. Confirm no access to unassigned clients.

### 16.2 Clients

1. Open `/trainer/clients`.
2. Open `/trainer/clients/[id]`.
3. Add trainer note.
4. Record body progress.
5. Confirm updates visible to owner/member where expected.

### 16.3 Plans

1. Open `/trainer/plans`.
2. Open `/trainer/clients/[id]/plan`.
3. Create workout plan.
4. Review plan.
5. Publish plan.
6. Assign plan.
7. Confirm member mobile sees it.

### 16.4 Diet

1. Create diet plan for client.
2. Edit diet plan.
3. Publish diet plan.
4. Archive/delete diet plan.
5. Confirm member sees latest published diet only.

### 16.5 PT Sessions

1. Open `/trainer/clients/[id]/sessions`.
2. Create/log session.
3. Edit session if supported.
4. Confirm PT subscription/session count changes.

### 16.6 Payouts

1. Open `/trainer/payouts`.
2. Confirm commission/clawback lines.
3. Confirm owner payout status changes appear.

## 17. Mobile Platform App

1. Login as platform admin.
2. Open `/platform`.
3. Confirm SaaS health summary: total gyms, paying, trial, referrals.
4. Confirm recent gym rows show tier, cycle, price, next billing, mandate, paid count.
5. Open web dashboard handoff.
6. Confirm non-platform user cannot access `/platform`.

## 18. Cross-System Workflows

### 18.1 Public Join to Owner Approval to Member Mobile

1. Prospect joins approval-required gym from web.
2. Owner sees request on web and mobile.
3. Owner approves.
4. Member logs into mobile and sees membership/join state.

### 18.2 Referral to Checkout to Reward

1. Create referral policy and code in dashboard.
2. Open referral link on mobile.
3. Join/buy membership with referral.
4. Complete checkout.
5. Confirm discount applied.
6. Confirm reward created/applied.
7. Confirm analytics update.
8. Replay webhook and confirm no duplicate reward.

### 18.3 Member Shop to Reception Pickup

1. Member buys shop product on mobile.
2. Complete checkout.
3. Member sees pickup code.
4. Reception fulfills on mobile.
5. Owner sees order fulfilled on web.
6. Stock decreases.

### 18.4 QR Attendance End to End

1. Owner displays QR on web.
2. Member scans on iOS.
3. Member scans on Android.
4. Pending case goes to reception.
5. Reception approves/rejects.
6. Reports and member attendance update.

### 18.5 Trainer Plan to Member Completion

1. Trainer creates and publishes plan.
2. Member opens plan on mobile.
3. Member logs progress and completes.
4. Trainer sees progress.
5. Owner reports remain stable.

### 18.6 Notification Fanout

1. Owner sends notification from dashboard.
2. Member receives in-app notification.
3. Physical iOS receives push.
4. Physical Android receives push.
5. Notification history updates.

### 18.7 SaaS Billing Gate

1. Create new gym.
2. Attempt owner write before mandate.
3. Confirm web redirects/blocks.
4. Confirm mobile redirects to `/owner/billing`.
5. Complete mandate.
6. Confirm writes unlock.

## 19. Payment and Provider Certification

### 19.1 Razorpay Membership Checkout

1. Create paid membership checkout.
2. Complete payment.
3. Confirm webhook/event.
4. Confirm membership active.
5. Confirm receipt/invoice.

### 19.2 Razorpay Shop Checkout

1. Create shop checkout.
2. Complete payment.
3. Confirm order ready for pickup.
4. Confirm pickup code.

### 19.3 Razorpay SaaS Mandate

1. Create SaaS mandate.
2. Authenticate mandate.
3. Confirm mandate state.
4. Confirm trial-to-paid charge behavior.

### 19.4 Refunds

1. Refund membership payment.
2. Refund shop payment.
3. Try duplicate refund.
4. Confirm provider and local state.

### 19.5 Failure and Retry

1. Simulate failed payment.
2. Simulate pending payment.
3. Simulate duplicate webhook.
4. Simulate provider timeout.
5. Confirm user-visible states and idempotency.

## 20. Security, Privacy, and Permissions

1. Access owner route as member.
2. Access reception route as member.
3. Access trainer client not assigned to trainer.
4. Access platform route as non-platform user.
5. Attempt tenant action with wrong org context.
6. Confirm 403 handling is clear.
7. Confirm audit logs for high-risk actions.
8. Confirm provider diagnostics redact secrets.
9. Submit privacy export request.
10. Submit deletion request on test account.
11. Confirm account deletion purge cron behavior in non-production.

## 21. Performance and UX

### 21.1 Web

1. Dashboard section switching feels instant when cached.
2. No blank shell on sidebar navigation.
3. Charts render without layout shift.
4. Toasts readable in light and dark mode.
5. Mobile viewport has no text overlap.
6. Public pages load and remain usable on slow 4G simulation.

### 21.2 Mobile

1. App launch time acceptable.
2. Role switching does not hang.
3. Owner sections keep previous data during refresh.
4. Lists scroll smoothly with realistic data volume.
5. Checkout browser handoff and return feel clear.
6. Text does not clip on small Android and iPhone SE-like screens.

## 22. Accessibility and Localization

1. Keyboard navigation on web login, dashboard, forms.
2. Focus states visible.
3. Screen reader labels for critical buttons.
4. Color contrast for toasts, chips, cards, charts.
5. English/Hindi or configured language surfaces do not overflow.
6. Date, currency, phone formatting are correct for India.

## 23. Browser and Device Matrix

### Web

- Chrome desktop.
- Chrome Android.
- Safari iOS only through the iOS device browser if needed for user-facing public pages; avoid opening Safari from automation if project policy says not to.
- Mobile viewport widths: 360, 390, 430, 768.
- Desktop widths: 1280, 1440, 1920.

### Mobile

- iOS physical phone.
- Android physical phone.
- iOS simulator.
- Android emulator.
- Test both light and dark mode.
- Test push only on physical devices.

## 24. Launch Exit Criteria

Do not call the product launch-ready until:

- All P0/P1 flows above pass.
- No known money movement bug remains.
- No role/permission bypass remains.
- Web dashboard charts are verified against real records.
- Web dashboard navigation no longer blanks or feels hung.
- Mobile iOS and Android checkout returns are verified.
- Mobile iOS and Android push are verified if push is enabled.
- MSG91 phone OTP is verified if SMS is enabled.
- Razorpay controlled checkout/webhook/refund evidence is captured.
- SaaS trial, mandate, upgrade, cancel, delayed charge, and idempotency are verified.
- Referral abuse and reward idempotency are verified.
- Sentry redaction smoke is complete.
- Supabase backup/PITR decision is documented.
- Store privacy/data safety metadata is reviewed.

## 25. Evidence Template

Use this format for each test:

```text
Test ID:
Date/time:
Environment:
Build/commit:
Tester:
Device/browser:
Account:
Org/branch:
Steps:
Expected:
Actual:
Result: PASS / FAIL / BLOCKED
Evidence links:
Payment/session/webhook IDs:
Notes:
```

## 26. Suggested Execution Order

1. Preflight checks.
2. Public web and auth.
3. Start-gym and SaaS billing gate.
4. Owner web dashboard.
5. Member mobile on iOS.
6. Member mobile on Android.
7. Owner mobile on iOS.
8. Owner mobile on Android.
9. Reception web/mobile.
10. Trainer mobile.
11. Shop and pickup end to end.
12. Attendance QR end to end.
13. Payments/refunds/webhooks.
14. Referrals end to end.
15. Platform console.
16. Security/privacy/permissions.
17. Performance/theme/accessibility.
18. Provider evidence and launch gates.
