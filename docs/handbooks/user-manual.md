# Zook User Manual

This manual explains Zook role by role. Each role has an English guide followed by a Hindi guide, so the same document can be used for onboarding, training, support, and production smoke checks.

Use this as the first-read manual. For deeper testing details, use the role-specific handbooks linked from [README.md](./README.md).

## Quick Role Map

| Role | Main job | Main place to work |
| --- | --- | --- |
| Owner | Run the business, billing, staff, plans, reports, branches | Web dashboard, mobile owner view |
| Admin | Run daily gym operations for the owner | Web dashboard, mobile owner/admin view |
| Receptionist | Handle entry, member lookup, payments, pickup orders | Desk web app, mobile reception view |
| Trainer | Manage clients, plans, notes, progress | Mobile trainer view, web coach view |
| Member | Join, check in, follow plans, renew, shop | Mobile app, public gym pages |
| Platform operator | Monitor Zook platform health and escalations | Platform console |

## Common Rules For Everyone

### English

- Always confirm the selected gym and branch before taking action.
- Use search before creating a duplicate member, plan, order, or staff record.
- For payments, confirm amount, member, gym, branch, and plan before continuing.
- Use autopay when it is offered for recurring membership payments, unless the member clearly wants manual renewal.
- Do not send real mass notifications during testing.
- Do not approve, reject, refund, suspend, or fulfil a real customer item unless that is the intended action.
- If something looks wrong, stop and escalate instead of forcing the flow.

### Hindi

- कोई भी action करने से पहले selected gym और branch जरूर देख लें।
- नया member, plan, order या staff बनाने से पहले search कर लें ताकि duplicate न बने।
- Payment से पहले amount, member, gym, branch और plan confirm करें।
- Recurring membership payment के लिए autopay option दिखे तो उसे आसान/default choice की तरह रखें, जब तक member manual renewal न चाहे।
- Testing के दौरान real mass notification न भेजें।
- Real customer का approval, rejection, refund, suspension या order fulfilment तभी करें जब वही सही business action हो।
- अगर कोई चीज गलत लगे, flow force न करें; owner/admin/support को escalate करें।

---

# Owner Manual

## English

### What Owners Do

Owners control the gym business inside Zook. They set up the gym profile, branches, membership plans, staff access, payments, shop, reports, notifications, and Zook billing.

### Where To Go

| Area | Use it for |
| --- | --- |
| Web `/dashboard` | Main business dashboard |
| Web `/dashboard/attendance/qr-display` | Entrance QR display |
| Mobile `/owner` | Quick approvals, revenue, stock, member checks |
| Public `/g/[username]` | Public gym page shown to members |

### First Setup Checklist

1. Sign in and open the dashboard.
2. Confirm gym name, logo, cover image, and public profile.
3. Add or review branches with locality and city.
4. Add membership plans with clear price, duration, and benefits.
5. Add staff and assign correct roles.
6. Confirm payment setup and renewal flow.
7. Open the public gym page and check how it looks on phone and desktop.

### Daily Owner Flow

1. Open Today or Command view.
2. Review pending member approvals.
3. Check revenue, failed payments, and renewals due.
4. Check attendance exceptions.
5. Review stock and ready pickup orders.
6. Send targeted notifications only when needed.
7. Review audit logs for sensitive changes.

### Payment And Membership Rules

- Keep the path to payment short: plan, amount, payment, confirmation.
- Use clear plan names and durations.
- Ask members to set up autopay during membership payment or renewal, not beside unrelated actions.
- Refunds and cancellations should follow the gym's policy.
- For live money tests, use a controlled test member and record private evidence.

### Owner Smoke Checklist

- Dashboard loads.
- Branch selector shows the correct gym and branch.
- Members, plans, payments, attendance, shop, staff, notifications, reports, and billing open.
- Public gym profile looks branded and complete.
- QR display opens.
- Owner mobile view has no clipped text or hidden primary action.

## Hindi

### Owner क्या करता है

Owner Zook में gym business control करता है। Owner gym profile, branches, membership plans, staff access, payments, shop, reports, notifications और Zook billing manage करता है।

### कहां जाना है

| Area | काम |
| --- | --- |
| Web `/dashboard` | Main business dashboard |
| Web `/dashboard/attendance/qr-display` | Entry QR display |
| Mobile `/owner` | Quick approvals, revenue, stock, member checks |
| Public `/g/[username]` | Members को दिखने वाला public gym page |

### पहले Setup में क्या करें

1. Sign in करके dashboard खोलें।
2. Gym name, logo, cover image और public profile check करें।
3. Branches add/review करें, locality और city सही रखें।
4. Membership plans में price, duration और benefits साफ रखें।
5. Staff add करें और सही role assign करें।
6. Payment setup और renewal flow check करें।
7. Public gym page phone और desktop दोनों पर देखें।

### Daily Owner Flow

1. Today या Command view खोलें।
2. Pending member approvals देखें।
3. Revenue, failed payments और renewals due check करें।
4. Attendance exceptions देखें।
5. Stock और ready pickup orders review करें।
6. Notification तभी भेजें जब सच में जरूरत हो।
7. Sensitive changes के लिए audit log देखें।

### Payment और Membership Rules

- Payment path छोटा रखें: plan, amount, payment, confirmation।
- Plan names और duration साफ लिखें।
- Autopay setup membership payment या renewal flow में पूछें, unrelated buttons के साथ नहीं।
- Refund और cancellation gym policy के हिसाब से करें।
- Live money test के लिए controlled test member इस्तेमाल करें और private evidence रखें।

### Owner Smoke Checklist

- Dashboard खुलता है।
- Branch selector सही gym और branch दिखाता है।
- Members, plans, payments, attendance, shop, staff, notifications, reports और billing खुलते हैं।
- Public gym profile branded और complete दिखता है।
- QR display खुलता है।
- Mobile owner view में text clip नहीं होता और primary action hidden नहीं है।

---

# Admin Manual

## English

### What Admins Do

Admins run day-to-day gym operations. They help with members, approvals, attendance, plans, offers, payments, shop, reports, and staff operations based on permissions.

Admins are powerful, but they are not the owner. Billing and business-control actions may be restricted.

### Daily Admin Flow

1. Sign in and confirm the selected gym/branch.
2. Open Today board.
3. Clear pending member approvals.
4. Review attendance exceptions.
5. Check payments, shop orders, and stock.
6. Help staff with operational issues.
7. Review audit history when something sensitive changes.

### What Admins Should Check

| Area | What to do |
| --- | --- |
| Members | Search, open details, approve or reject requests |
| Plans | Create or update plans if permitted |
| Promotions | Manage coupons, offers, and referral rules |
| Attendance | Review exceptions and QR entry |
| Payments | Record offline payments and inspect payment history |
| Shop | Manage products, stock, and orders |
| Staff | Invite or manage staff if permitted |
| Reports | Download reports for owner review |

### Admin Rules

- Do not change real prices during smoke testing unless the owner asks.
- Do not issue refunds without approval.
- If a permission error appears, escalate to the owner.
- Every sensitive action should appear in audit history.

## Hindi

### Admin क्या करता है

Admin gym के daily operations संभालता है। Admin permissions के हिसाब से members, approvals, attendance, plans, offers, payments, shop, reports और staff operations manage करता है।

Admin powerful role है, लेकिन owner नहीं है। Billing और business-control actions restricted हो सकते हैं।

### Daily Admin Flow

1. Sign in करें और selected gym/branch confirm करें।
2. Today board खोलें।
3. Pending member approvals clear करें।
4. Attendance exceptions review करें।
5. Payments, shop orders और stock check करें।
6. Staff को operational issues में help करें।
7. Sensitive change होने पर audit history देखें।

### Admin क्या Check करे

| Area | काम |
| --- | --- |
| Members | Search, detail open, approve/reject |
| Plans | Permission हो तो plans create/update |
| Promotions | Coupons, offers और referral rules manage |
| Attendance | Exceptions और QR entry review |
| Payments | Offline payment record और history inspect |
| Shop | Products, stock और orders manage |
| Staff | Permission हो तो invite/manage |
| Reports | Owner review के लिए reports download |

### Admin Rules

- Smoke testing में real prices change न करें जब तक owner न बोले।
- Approval के बिना refund न करें।
- Permission error आए तो owner को escalate करें।
- Sensitive action audit history में दिखना चाहिए।

---

# Receptionist Manual

## English

### What Receptionists Do

Receptionists run the front desk. Their work should be fast and accurate: verify entry, search members, record allowed payments, handle pickup orders, and escalate unclear cases.

### Daily Desk Flow

1. Open `/desk` or mobile `/reception`.
2. Confirm the selected branch.
3. Keep member search and code verification ready.
4. Verify check-ins as members arrive.
5. Record offline payments only after confirming details.
6. Fulfil pickup orders only after checking pickup code.
7. Escalate blocked, expired, or unclear cases.

### Main Actions

| Action | Steps |
| --- | --- |
| Verify attendance | Enter/scan code, check result, allow entry only if approved |
| Search member | Search by name/phone/code, open detail, check membership status |
| Record payment | Select member, enter amount, choose mode, confirm |
| Fulfil pickup | Open ready order, ask for pickup code, verify, fulfil |
| Reveal phone | Use only when needed and when permission allows |

### Desk Rules

- Do not let a member enter if the app says rejected or expired.
- If result is pending, ask owner/admin or follow gym policy.
- Do not mark a pickup fulfilled until the item is actually handed over.
- Payment amount and member name must be checked twice.
- Avoid duplicate taps on payment and fulfil buttons.

## Hindi

### Receptionist क्या करता है

Receptionist front desk संभालता है। काम fast और accurate होना चाहिए: entry verify करना, member search करना, allowed payments record करना, pickup orders handle करना और unclear cases escalate करना।

### Daily Desk Flow

1. `/desk` या mobile `/reception` खोलें।
2. Selected branch confirm करें।
3. Member search और code verification ready रखें।
4. Members आने पर check-in verify करें।
5. Offline payment details confirm करने के बाद ही record करें।
6. Pickup code check करने के बाद ही order fulfil करें।
7. Blocked, expired या unclear case owner/admin को escalate करें।

### Main Actions

| Action | Steps |
| --- | --- |
| Attendance verify | Code enter/scan करें, result देखें, approved हो तो entry दें |
| Member search | Name/phone/code से search करें, detail खोलें, membership status देखें |
| Payment record | Member select, amount enter, mode choose, confirm |
| Pickup fulfil | Ready order खोलें, pickup code मांगें, verify करें, fulfil करें |
| Phone reveal | जरूरत और permission होने पर ही use करें |

### Desk Rules

- App rejected या expired दिखाए तो member को entry न दें।
- Pending result हो तो owner/admin या gym policy follow करें।
- Item handover होने से पहले pickup fulfilled mark न करें।
- Payment amount और member name दो बार check करें।
- Payment और fulfil buttons पर duplicate tap avoid करें।

---

# Trainer Manual

## English

### What Trainers Do

Trainers manage coaching work. They review clients, assign workout/diet/habit plans, log notes, track progress, and communicate with members.

### Daily Trainer Flow

1. Open mobile `/trainer`.
2. Review clients needing attention.
3. Open client detail before a session.
4. Check active plan and recent progress.
5. After the session, add notes or update the plan.
6. Review AI drafts carefully before publishing.
7. Confirm the member can see the published plan.

### Main Areas

| Area | Use it for |
| --- | --- |
| Home | Today summary and client alerts |
| Clients | Search and open assigned clients |
| Plans | Create, edit, assign, and publish plans |
| Notes | Save private or member-visible notes |
| Progress | Review attendance, adherence, and body/progress entries |
| Inbox | Read member messages or nudges |

### Trainer Rules

- Trainers should only see assigned clients.
- AI drafts are suggestions, not final instructions.
- Review every plan before publishing.
- Do not publish medical, injury, diet, or supplement advice unless it is appropriate and approved by the gym's policy.
- Notes can affect member history, so keep them clear and respectful.

## Hindi

### Trainer क्या करता है

Trainer coaching work manage करता है। Trainer clients review करता है, workout/diet/habit plans assign करता है, notes log करता है, progress track करता है और members से communicate करता है।

### Daily Trainer Flow

1. Mobile `/trainer` खोलें।
2. जिन clients को attention चाहिए उन्हें देखें।
3. Session से पहले client detail खोलें।
4. Active plan और recent progress check करें।
5. Session के बाद notes add करें या plan update करें।
6. AI drafts publish करने से पहले carefully review करें।
7. Confirm करें कि member published plan देख पा रहा है।

### Main Areas

| Area | काम |
| --- | --- |
| Home | Today summary और client alerts |
| Clients | Assigned clients search/open |
| Plans | Plan create, edit, assign, publish |
| Notes | Private या member-visible notes save |
| Progress | Attendance, adherence और progress review |
| Inbox | Member messages/nudges read |

### Trainer Rules

- Trainer को सिर्फ assigned clients दिखने चाहिए।
- AI draft suggestion है, final instruction नहीं।
- Publish करने से पहले हर plan review करें।
- Medical, injury, diet या supplement advice gym policy के हिसाब से ही publish करें।
- Notes member history को affect कर सकते हैं, इसलिए clear और respectful रखें।

---

# Member Manual

## English

### What Members Do

Members use Zook to find a gym, join or renew a membership, check in, follow plans, buy shop items, receive notifications, and manage their profile.

### First 5 Minutes

1. Sign in with phone, email, Google, or Apple where available.
2. Find your gym.
3. Open the gym profile.
4. Choose a membership plan.
5. Pay or request approval if the gym requires approval.
6. Open the mobile app and check in at the gym.

### Main Mobile Tabs

| Tab | Use it for |
| --- | --- |
| Home | Membership status, next action, renewals |
| Scan | QR scan and manual attendance code |
| Plans | Workout, diet, habit, and coaching plans |
| Shop | Products, cart, checkout, pickup code |
| Profile | Account, privacy, language, support |

### Joining And Paying

1. Open the gym profile.
2. Select a plan.
3. Apply referral or coupon code if you have one.
4. Confirm final amount.
5. Pay using the available payment method.
6. Set up autopay if offered and you want renewal to be automatic.
7. Check membership status after payment.

### Check-In

1. Open Scan.
2. Scan the gym QR code.
3. If camera is not available, enter code manually.
4. Show the result to reception if asked.

Result meanings:

- Approved: entry is allowed.
- Pending: desk or owner review is needed.
- Rejected: check the reason and speak to the desk.

### Member Rules

- Keep your phone/email updated.
- Do not share OTP, pickup code, referral abuse, or attendance code.
- Check the amount before paying.
- Use support/profile options for privacy export or delete requests.

## Hindi

### Member क्या करता है

Member Zook का use gym find करने, membership join/renew करने, check-in करने, plans follow करने, shop items खरीदने, notifications पाने और profile manage करने के लिए करता है।

### पहले 5 मिनट

1. Phone, email, Google या Apple से sign in करें, जहां available हो।
2. अपना gym find करें।
3. Gym profile खोलें।
4. Membership plan choose करें।
5. Pay करें या gym approval required हो तो approval request करें।
6. Mobile app खोलें और gym पर check in करें।

### Main Mobile Tabs

| Tab | काम |
| --- | --- |
| Home | Membership status, next action, renewals |
| Scan | QR scan और manual attendance code |
| Plans | Workout, diet, habit और coaching plans |
| Shop | Products, cart, checkout, pickup code |
| Profile | Account, privacy, language, support |

### Join और Payment

1. Gym profile खोलें।
2. Plan select करें।
3. Referral या coupon code हो तो apply करें।
4. Final amount confirm करें।
5. Available payment method से pay करें।
6. Autopay offered हो और automatic renewal चाहिए तो setup करें।
7. Payment के बाद membership status check करें।

### Check-In

1. Scan खोलें।
2. Gym QR code scan करें।
3. Camera available न हो तो code manually enter करें।
4. Reception मांगे तो result दिखाएं।

Result meanings:

- Approved: entry allowed है।
- Pending: desk या owner review चाहिए।
- Rejected: reason देखें और desk से बात करें।

### Member Rules

- Phone/email updated रखें।
- OTP, pickup code या attendance code share न करें।
- Pay करने से पहले amount check करें।
- Privacy export/delete request के लिए Profile या Support option use करें।

---

# Platform Operator Manual

## English

### What Platform Operators Do

Platform operators monitor Zook itself. They check system health, provider status, customer escalations, webhook issues, suspicious activity, and operational incidents.

### Main Work

| Area | Use it for |
| --- | --- |
| Platform console | System overview and operational controls |
| Status/readiness | Confirm API, database, and provider health |
| Webhooks | Replay or inspect payment/provider events when safe |
| Notifications | Review broadcast or delivery issues |
| Audit | Investigate sensitive actions |
| Support escalation | Help gyms without bypassing policy |

### Operator Rules

- Do not impersonate or modify customer data unless there is a recorded support reason.
- Never expose secrets in screenshots, tickets, docs, or chat.
- Refunds, webhook replays, production scripts, and mass notifications need clear approval.
- Record evidence with date, environment, action, and result.
- If a provider is down, document impact and workaround before changing settings.

## Hindi

### Platform Operator क्या करता है

Platform operator Zook system को monitor करता है। वह system health, provider status, customer escalations, webhook issues, suspicious activity और operational incidents देखता है।

### Main Work

| Area | काम |
| --- | --- |
| Platform console | System overview और operational controls |
| Status/readiness | API, database और provider health confirm |
| Webhooks | Safe हो तो payment/provider events inspect/replay |
| Notifications | Broadcast या delivery issues review |
| Audit | Sensitive actions investigate |
| Support escalation | Policy follow करते हुए gyms की help |

### Operator Rules

- Recorded support reason के बिना customer data modify/impersonate न करें।
- Secrets screenshots, tickets, docs या chat में expose न करें।
- Refunds, webhook replays, production scripts और mass notifications के लिए clear approval चाहिए।
- Evidence में date, environment, action और result लिखें।
- Provider down हो तो settings change करने से पहले impact और workaround document करें।

---

# Support Script

Use this when helping any user.

## English

1. Ask: "Which gym and branch are you using?"
2. Ask: "Which role are you signed in as?"
3. Ask: "What were you trying to do?"
4. Check whether the action is payment, attendance, membership, shop, plan, or account related.
5. Confirm whether this is production or test/staging.
6. If it changes money, membership, access, or customer data, get approval before acting.
7. Record the final result.

## Hindi

1. पूछें: "आप कौन सा gym और branch use कर रहे हैं?"
2. पूछें: "आप किस role से signed in हैं?"
3. पूछें: "आप क्या करने की कोशिश कर रहे थे?"
4. Check करें issue payment, attendance, membership, shop, plan या account से related है या नहीं।
5. Confirm करें कि यह production है या test/staging।
6. अगर action money, membership, access या customer data change करता है, तो action से पहले approval लें।
7. Final result record करें।
