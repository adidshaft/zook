# 👑 Owner Handbook

> **You own the business.** Use the web dashboard for setup, reporting, billing, and control. Use the mobile owner view for quick daily decisions.

---

## 🧭 Where Owners Work

| Surface | Use it for | Best device |
| --- | --- | --- |
| `/dashboard` | Daily command board, members, staff, plans, reports, billing | Laptop / desktop |
| `/dashboard/attendance/qr-display` | Entrance QR display | Tablet / desktop screen |
| Mobile `/owner` | Approvals, revenue pulse, stock, quick member checks | Phone |
| `/g/[username]` | Public gym profile members see | Any browser |

**Production testing rule:** read-only checks are safe anywhere. Create/update/delete/payment/refund/suspend tests should be done only on a test gym or staging data.

---

## 🚀 First 15 Minutes

```
1. Sign in → /dashboard
2. Confirm gym profile: Settings + Public Profile
3. Confirm membership plans: Plans
4. Confirm staff access: Staff
5. Confirm QR entry: Attendance → QR Display
6. Confirm billing: Billing
7. Confirm reports: Reports → Export CSV
```

✅ A healthy owner account should show: active members, revenue, renewals due, check-ins, approvals, staff, branch context, and audit history.

---

## 🖥️ Web Dashboard Map

| Section | What to verify tomorrow | Notes |
| --- | --- | --- |
| 🏠 Today | Metrics load, alerts make sense, quick actions open the right area | This is the owner command board |
| 👥 Members | Search, filters, member detail, approvals, bulk actions | Check expired and active members |
| 📋 Plans | Plans list, create/edit form, public visibility, pricing | Avoid changing real production prices unless intended |
| 🎟 Coupons / Offers / Referrals | Codes display, create forms open, reward rules are clear | Use test codes for production smoke |
| 📅 Attendance | Recent scans, exceptions, QR display | QR refresh should be visible |
| 💳 Payments | Revenue rows, offline payment form, refunds view | Do not issue real refunds in smoke |
| 🛍 Shop | Products, stock, orders, pickup status | Confirm cart-facing items are public where expected |
| 📊 Reports | Attendance/revenue/member exports download | CSV should open cleanly |
| 👨‍💼 Staff | Invite admin/reception/trainer, branch assignment | Reception must have a branch |
| 🏢 Branches | Branch list, hours, location, primary branch | "Primary" is the user-facing term |
| 🔔 Notifications | Templates, history, composer, targeting | Do not send mass messages in production smoke |
| 🌐 Public Profile | Cover, logo, amenities, trainers, public plans | Check mobile width too |
| 🧾 Billing | SaaS subscription status, plan, mandate state | Owner-only / billing permission |
| 🗂 Audit | Sensitive actions show before/after details | Use this to verify staff actions |

---

## 📱 Mobile Owner App

```
Bottom Nav:  Command · Approvals · Revenue · Stock
```

| View | What it answers | Test expectation |
| --- | --- | --- |
| **Command** `/owner` | "What needs my attention right now?" | Metrics fit, no clipped cards |
| **Approvals** | "Who is waiting on me?" | Double-tap should not duplicate action |
| **Revenue** | "What was collected?" | Empty/error states are readable |
| **Stock** | "What might run out?" | Product rows keep stable size |
| **Member detail** | "Can I understand one member fast?" | Phone reveal permission gate works |

---

## 🔄 Core Owner Flows

### 1. Member joins your gym

```
Public gym page → Plan → Checkout → Payment confirmed → Membership active
                                  └─ Approval-required gym:
                                     Owner/Admin approves → Member notified → Active
```

Verify:
- Plan price and duration are correct.
- Referral/coupon discount is visible before payment.
- New subscription appears in Members and Reports.

### 2. Attendance exception review

```
Member scan → Exception flagged → Attendance review → Approve / Reject → Audit log
```

Verify:
- Reason is visible before acting.
- Approved/rejected status clears stale warning text.
- Action appears in audit history.

### 3. Staff invite

```
Staff → Invite → Pick role → Pick branch if Reception → Send invite
```

Role rules:
- **Admin** can run operations but should not become platform admin.
- **Reception** needs a branch for front-desk work.
- **Trainer** should see coaching/client tools.

### 4. Billing and SaaS subscription

```
Billing → Review plan → Payment/mandate status → Renewal state
```

Verify:
- Billing page does not show internal errors.
- Trial/active/suspended language is clear.
- Platform subscription state matches what platform operator sees.

---

## ✅ Owner Production Smoke Checklist

Use this before telling staff to start real production testing:

- [ ] `/dashboard` loads without console/server errors.
- [ ] Members, Plans, Attendance, Payments, Shop, Reports, Staff, Branches, Notifications, Public Profile, Billing all open.
- [ ] Public profile at `/g/[username]` looks correct on mobile and desktop.
- [ ] QR display opens and shows a fresh code.
- [ ] CSV export downloads at least one report.
- [ ] Audit log opens and has recent entries.
- [ ] Mobile owner views have no clipped bottom nav, black-on-black text, or unstable card heights.

---

## ⚠️ Good-to-Know Rules

- **Owner and Admin are not the same.** Owner can control business-critical settings and billing; Admin is operational.
- **Audit is the source of truth** for sensitive actions.
- **AI drafts never auto-publish.** A trainer or permitted staff member must review first.
- **Mock providers are not production behavior.** Production OTP, payment, push, and email must use live configured providers.
