# Production E2E Test Plan

This plan tests both web and mobile production flows while avoiding unintended real money movement.

## 2026-05-31 Production Run Notes

Current live run is using Chrome against `zookfit.in` / `app.zookfit.in`; mobile-only checks that require a physical device, camera, haptics, or geofence movement remain unverified.

- Pre-checks passed on production: `/api/health` returned `envProfile: "production"` and `/api/ready` returned `ready: true` with database, migrations, MSG91 SMS, live Razorpay, distributed cache, and distributed rate limiting ready.
- Web login passed for both email and mobile modes. Seeded phone login with `+919876543210` accepted OTP `000000` and opened Nisha Menon's member web membership page.
- Pricing page passed on web: four plans are visible, including the `₹0 for 2 months` trial, and details expand/collapse. Owner dashboard pricing link opens the pricing page in a separate tab.
- Platform, owner, admin, reception, and trainer seeded accounts all logged in with OTP `000000`. Platform and owner/admin/reception web surfaces loaded; owner dashboard metrics rendered; staff roles rendered after a reload; reception desk member detail opened for Nisha Menon.
- Production seed gap found on retest: owner Members initially showed only `member@zook.local` / Nisha Menon. Root cause was twofold: `member2@zook.local` and `desk-test-member@zook.local` were missing from the seeded fixed-OTP allowlist, and branch-scoped member lists hid profiles without subscriptions. The demo rows for `member2` and `desk-test-member` were repaired in production, and the code fix is queued for deploy/retest.
- Trainer web gap: `trainer@zook.local` lands on `/coach`, but assigned clients, assigned plans, sessions, and progress notes all show `0`; quick actions point to `/me` and say the full coaching surface lives on mobile.
- Reports gap found and fixed during this run: the Reports page rendered tabs and date filters but had no CSV export controls for the required report downloads. Production now shows the CSV export pack, and Members, Attendance, Payments, Membership sales, and Expiry downloads completed from Chrome.
- Attendance history gap found and fixed during this run: production attendance rows showed generic `Member` / `Membership` labels even when member data exists. Production now shows `Nisha Menon` and `Monthly Unlimited` in recent attendance rows after deploy.

## Ground Rules

- Do not complete any real Razorpay payment unless it is an explicitly approved live-payment test.
- Use demo/mock/offline payment paths where available. If production opens Razorpay, stop before payment confirmation.
- Use OTP `000000` only for seeded demo accounts that intentionally support the fixed test code.
- Real phone-number login can send a live MSG91 SMS. Test it only with a phone number you own/control.
- Test one surface at a time: each step is tagged either `[web]` or `[mobile]`.
- Record bugs with account used, surface, page/screen, action, expected result, actual result, and screenshot.

## Current Production Pre-Checks

Run these before the main checklist:

- [ ] [web] Open `https://zookfit.in/api/health` and confirm `envProfile` is `production`.
- [ ] [web] Open `https://zookfit.in/api/ready` and confirm `ready` is `true`.
- [ ] [web] Confirm production DB status shows reachable/schema-ready/migrations applied.
- [ ] [web] Confirm SMS provider is `msg91`, mode is `live`, and status is `ready`.
- [ ] [web] Confirm payment provider is live Razorpay before deciding whether to skip payment completion.
- [ ] [web] Confirm server cache and rate limiting are distributed/ready.

## Recent Feature Regression Checks

Add these to the pass before signing off production:

- [ ] [web] Login page lets the user choose email login.
- [ ] [web] Login page lets the user choose mobile login.
- [ ] [mobile] App login lets the user choose email login.
- [ ] [mobile] App login lets the user choose mobile login.
- [ ] [web] Seeded demo phone login with `+919876543210` accepts OTP `000000` and creates a member session.
- [ ] [web] Real phone login sends SMS only to an owned/control number, and OTP verification creates a session.
- [ ] [web] Profile completion allows adding a missing phone or email later.
- [ ] [mobile] Profile completion allows adding a missing phone or email later.
- [ ] [web] Pricing page opens and shows four plans including the two-month free trial plan.
- [ ] [web] Pricing page first fold shows only main points.
- [ ] [web] Pricing page expands/collapses full plan details from More/Expand.
- [ ] [web] Dashboard pricing link opens the pricing page in a new tab.
- [ ] [mobile] Bottom navigation does not show Diet as a standalone tab.
- [ ] [mobile] Diet is reachable under the Plan section.
- [ ] [mobile] QR scanner has a smooth neon horizontal scan bar moving vertically.
- [ ] [mobile] QR check-in succeeds and starts a live timer on member home.
- [ ] [mobile] Manual stop/check-out stops the timer and records duration.
- [ ] [mobile] Re-scanning the same branch QR checks the member out.
- [ ] [mobile] Already checked-in members cannot create another check-in without checking out.
- [ ] [mobile] Geofence checkout stops the active timer when leaving the branch area, if location permission is granted.
- [ ] [mobile] Multi-branch check-in resolves the branch from QR payload.
- [ ] [mobile] Multi-branch check-in resolves the nearest branch from geolocation when QR is not involved.
- [ ] [web] Owner dashboard attendance count updates after member check-in without waiting for stale cache.
- [ ] [web] Owner dashboard attendance/history updates after member checkout.
- [ ] [mobile] Member can view recorded attendance durations later.
- [ ] [mobile] QR verification success completes dynamically, shows the resolved verification state, and gives haptic feedback.

## Checklist

1. [ ] [web] Open production in a clean browser profile or incognito window.
2. [ ] [web] Confirm you are on the production domain.
3. [ ] [web] Confirm the demo org exists and is clearly identifiable, for example `aarogya-strength`.
4. [ ] [web] Confirm whether the current payment path is demo/offline or live Razorpay before doing any transaction.
5. [ ] [web] Log in as `platform@zook.local` with OTP `000000`.
6. [ ] [web] Open the platform dashboard.
7. [ ] [web] Confirm the demo org appears in platform orgs.
8. [ ] [web] Open the demo org details.
9. [ ] [web] Confirm subscription/billing status is demo-safe, not real charged billing.
10. [ ] [web] Confirm the demo users are visible or searchable.
11. [ ] [web] Log out.
12. [ ] [web] Log in as `owner@zook.local` with OTP `000000`.
13. [ ] [web] Confirm owner lands on dashboard.
14. [ ] [web] Confirm dashboard summary cards load.
15. [ ] [web] Switch branches if branch selector exists.
16. [ ] [web] Confirm revenue, active members, attendance, and shop metrics render.
17. [ ] [web] Go to Members.
18. [ ] [web] Confirm member profiles exist for `member`, `member2`, `minor`, and `desk-test-member`.
19. [ ] [web] Open `member@zook.local`.
20. [ ] [web] Confirm membership status, payments, attendance, notes, and trainer assignment look correct.
21. [ ] [web] Open `member2@zook.local`.
22. [ ] [web] Confirm this account is available for fresh manual/referral/checkout testing.
23. [ ] [web] Open `minor@zook.local`.
24. [ ] [web] Confirm minor/guardian-related state is visible where expected.
25. [ ] [web] Open `desk-test-member@zook.local`.
26. [ ] [web] Confirm it is ready for reception/payment desk flows.
27. [ ] [web] Go to Membership Plans.
28. [ ] [web] Create a new demo membership plan.
29. [ ] [web] Edit the demo membership plan.
30. [ ] [web] Confirm the edited plan is saved.
31. [ ] [web] Archive/delete the demo plan if supported.
32. [ ] [web] Create a coupon or referral offer.
33. [ ] [web] Confirm the offer appears in the UI.
34. [ ] [web] Go to Staff.
35. [ ] [web] Confirm owner, admin, reception, and trainer roles are visible.
36. [ ] [web] Invite a staff member only if the target email is safe/demo.
37. [ ] [web] Go to Shop/Products.
38. [ ] [web] Confirm seeded products exist.
39. [ ] [web] Create a demo product.
40. [ ] [web] Edit stock and price.
41. [ ] [web] Confirm inventory movement appears if supported.
42. [ ] [web] Go to Payments.
43. [ ] [web] Confirm demo payment records are visible.
44. [ ] [web] Confirm refunds/payment events are clearly demo/offline, or skip before any live capture.
45. [ ] [web] Go to Notifications.
46. [ ] [web] Create a draft notification for selected demo members.
47. [ ] [web] Send the notification only to demo members.
48. [ ] [web] Confirm notification history records delivery.
49. [ ] [web] Go to Reports.
50. [ ] [web] Download members report.
51. [ ] [web] Download attendance report.
52. [ ] [web] Download payments report.
53. [ ] [web] Download membership sales report.
54. [ ] [web] Download expiry report.
55. [ ] [web] Confirm downloaded files contain demo data only.
56. [ ] [web] Log out.
57. [ ] [web] Log in as `admin@zook.local` with OTP `000000`.
58. [ ] [web] Confirm admin lands on dashboard.
59. [ ] [web] Test members access.
60. [ ] [web] Test plans access.
61. [ ] [web] Test attendance access.
62. [ ] [web] Test shop access.
63. [ ] [web] Test reports access.
64. [ ] [web] Confirm admin cannot access owner-only areas if those boundaries exist.
65. [ ] [web] Log out.
66. [ ] [web] Log in as `reception@zook.local` with OTP `000000`.
67. [ ] [web] Open desk/check-in.
68. [ ] [web] Search for `member@zook.local`.
69. [ ] [web] Perform a check-in.
70. [ ] [web] Confirm check-in succeeds.
71. [ ] [web] Search for `desk-test-member@zook.local`.
72. [ ] [web] Activate/process pending membership using demo/offline payment.
73. [ ] [web] Confirm no real payment page or real charge appears.
74. [ ] [web] Confirm attendance history updates.
75. [ ] [web] Log out.
76. [ ] [web] Log in as `trainer@zook.local` with OTP `000000`.
77. [ ] [web] Open coach/client list.
78. [ ] [web] Confirm assigned members appear.
79. [ ] [web] Open `member@zook.local`.
80. [ ] [web] Create or assign a workout plan.
81. [ ] [web] Create or assign a diet plan if available.
82. [ ] [web] Add trainer notes or measurements.
83. [ ] [web] Confirm member progress/report views update.
84. [ ] [web] Log out.
85. [ ] [mobile] Open the production mobile app.
86. [ ] [mobile] Confirm the app points to production API.
87. [ ] [mobile] Log in as `member@zook.local` with OTP `000000`.
88. [ ] [mobile] Confirm member home loads.
89. [ ] [mobile] Open membership screen.
90. [ ] [mobile] Confirm active membership appears.
91. [ ] [mobile] Open attendance/check-in area.
92. [ ] [mobile] Confirm attendance history is visible.
93. [ ] [mobile] Open assigned plans.
94. [ ] [mobile] Complete a workout/task if available.
95. [ ] [mobile] Log progress.
96. [ ] [mobile] Open notifications.
97. [ ] [mobile] Confirm the web-sent notification appears if mobile receives it.
98. [ ] [mobile] Open shop.
99. [ ] [mobile] Place a demo shop order.
100. [ ] [mobile] Confirm checkout uses demo/offline money, or stop before live Razorpay confirmation.
101. [ ] [mobile] Confirm order success appears.
102. [ ] [mobile] Confirm order appears in member orders.
103. [ ] [mobile] Create or open referral code/link.
104. [ ] [mobile] Copy/share the referral link.
105. [ ] [mobile] Log out.
106. [ ] [mobile] Log in as `member2@zook.local` with OTP `000000`.
107. [ ] [mobile] Open the referral link from `member@zook.local`.
108. [ ] [mobile] Join/buy a membership through referral flow.
109. [ ] [mobile] Confirm payment is demo/offline, or stop before live Razorpay confirmation.
110. [ ] [mobile] Confirm `member2` membership activates.
111. [ ] [mobile] Log out.
112. [ ] [web] Log in as `owner@zook.local`.
113. [ ] [web] Open members.
114. [ ] [web] Confirm `member2@zook.local` now shows activated membership.
115. [ ] [web] Open referrals/offers.
116. [ ] [web] Confirm `member@zook.local` received the referral reward/credit if supported.
117. [ ] [web] Open payments.
118. [ ] [web] Confirm the `member2` transaction is present and marked demo/offline if completed.
119. [ ] [web] Open shop orders.
120. [ ] [web] Confirm the `member@zook.local` mobile shop order appears.
121. [ ] [web] Log out.
122. [ ] [mobile] Log in as `minor@zook.local` with OTP `000000`.
123. [ ] [mobile] Confirm minor home loads.
124. [ ] [mobile] Test membership screen.
125. [ ] [mobile] Test attendance/check-in.
126. [ ] [mobile] Test assigned plans.
127. [ ] [mobile] Confirm guardian consent surfaces behave as expected.
128. [ ] [mobile] Log out.
129. [ ] [mobile] Log in as `prospect@zook.local` with OTP `000000`.
130. [ ] [mobile] Browse public gym discovery if available in mobile.
131. [ ] [mobile] Open the demo gym page.
132. [ ] [mobile] Start a join flow.
133. [ ] [mobile] Confirm prospect can join only through intended flow.
134. [ ] [mobile] Confirm payment remains demo/offline, or stop before live Razorpay confirmation.
135. [ ] [mobile] Log out.
136. [ ] [web] Log in as `owner@zook.local`.
137. [ ] [web] Confirm all mobile-created transactions appear in dashboard metrics.
138. [ ] [web] Confirm new member activity appears in members.
139. [ ] [web] Confirm attendance activity appears in attendance.
140. [ ] [web] Confirm payment activity appears in payments.
141. [ ] [web] Confirm shop activity appears in shop orders.
142. [ ] [web] Confirm referral activity appears in referrals.
143. [ ] [web] Download reports again.
144. [ ] [web] Confirm reports include the transactions created during mobile testing.
145. [ ] [web] Log out.
146. [ ] [web] Log in as `platform@zook.local`.
147. [ ] [web] Confirm production did not create unexpected real billing.
148. [ ] [web] Confirm demo org status is still healthy.
149. [ ] [web] Confirm no real payment captures occurred.
150. [ ] [web] Confirm no real external emails/SMS were sent unless intentionally tested.
151. [ ] [web] Record bugs with account used, platform, page/screen, action, expected result, actual result, and screenshot.
152. [ ] [web] Decide whether to keep the demo transaction history or reseed/reset demo data.

## Recommended Account Usage

| Account | Use |
| --- | --- |
| `member@zook.local` | Main active member |
| `member2@zook.local` | Fresh buyer/referral/checkout account |
| `desk-test-member@zook.local` | Reception desk and manual payment account |
| `minor@zook.local` | Guardian/minor behavior |
| `prospect@zook.local` | Discovery and first-join behavior |
