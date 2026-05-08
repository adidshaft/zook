# 👑 Owner Handbook

> **You run the gym.** The web dashboard is your control room. The mobile app is your on-the-go command center.

---

## 🚀 Quick Start — Setting Up Your Gym

```
1. /start-gym  →  Enter gym name, city, handle (e.g. "iron-house")
2. Dashboard → Settings → Branch Hours + Location
3. Dashboard → Plans → Create first membership plan
4. Dashboard → Staff → Invite Reception / Trainer
5. Dashboard → Public Profile → Enable public page  ✓  Members can now find & join
```

---

## 🖥️ Web Dashboard Map

```
/dashboard
├── 🏠  Today          — Live floor: check-ins, amount collected, renewals due
├── 👥  Members        — All subscriptions, approvals, bulk actions
├── 📋  Plans          — Create / edit / price membership plans
├── 📅  Attendance     — QR display, exception review, approvals
├── 💳  Payments       — Revenue, offline records, settlement queue
├── 🛍  Shop           — Products, stock, orders
├── 📊  Reports        — CSV exports: attendance, revenue, memberships, staff
├── 👨‍💼  Staff          — Roles, invitations, coaching library
├── 🔔  Notifications  — Compose & schedule member messages
├── 🤖  AI             — Draft usage, AI settings (launch-gated)
├── 🌐  Public Profile — Edit join page, plans, trust signals
└── 🗂  Audit          — Full action log with diff viewer
```

---

## 📱 Mobile Owner App

```
Bottom Nav:  📋 Today  ·  👥 Members  ·  💰 Revenue  ·  📦 Stock  ·  ⚙️ More
```

| View | Focus |
|------|-------|
| **Today** `/owner` | Is anything on fire right now? Expiring plans, failed payments, approvals |
| **Approvals** `?view=approvals` | Join requests waiting for your decision |
| **Revenue** `?view=revenue` | Collections today, pending payments |
| **Stock** `?view=stock` | Low-stock alerts, quick restock notes |
| **Members** `?view=members` | Search any member, view detail |
| **Member Detail** `/owner/member/[id]` | Subscription, attendance, payments for one member |

---

## 🔄 Key Flows

### Member joins your gym

```
Member taps Join  ──►  Checkout (Razorpay) ──► Webhook confirms ──► Subscription active
                                                      └── Approval-required:
                                                          Owner/Admin approves in dashboard
                                                          Member gets notified ──► Active ✓
```

### Attendance & exceptions

```
Member scans QR ──► Check-in logged
                └── Flagged? (expired, wrong branch, rapid-repeat)
                    └──► Dashboard → Attendance → Review → Approve / Reject
```

### Recording an offline payment

```
Dashboard → Payments → Record Payment
  └── Select member + amount + mode (Cash / UPI / Card)
  └── Add reference note
  └── Audit entry created automatically  ✓
  ⚠️  Cap: 2 manual payments per staff per org per day
```

### Inviting staff

```
Dashboard → Staff → Invite
  └── Enter email → Pick role (Owner / Admin / Reception / Trainer)
  └── Pick branch (or org-wide)
  └── Staff receives magic-link email → Joins with that role  ✓
```

---

## 📊 Reports Available (CSV Export)

| Report | Covers |
|--------|--------|
| Attendance | Check-ins by date, branch, member |
| Revenue | Payments, plan revenue, refunds |
| Memberships | Active, expired, paused, trial |
| Shop | Orders, fulfilment, stock movements |
| Staff Operations | Role actions, audit events |

All reports available at:  `Dashboard → Reports → Export CSV`

---

## 🏢 Multi-Branch Setup

```
Each branch can have:
  ├── Its own hours                (Branch Hours editor)
  ├── Its own manager              (Staff → assign branch)
  ├── Shared OR custom commerce    (Settings → Branch → Commerce: Shared / Custom)
  └── Its own QR token            (Attendance → QR Display)

Branch switcher is top-left in every dashboard view.
```

---

## ✅ Good-to-Know Rules

- **Today ≠ generic dashboard.** It answers: *is anything on fire right now?*
- **Audit log captures everything.** Every sensitive action has a before/after diff — click "Details" on any row.
- **AI drafts never assign automatically.** Trainers must review before a plan reaches any member.
- **Provider readiness** (Razorpay, storage, push, email) is visible at `/platform/provider-status`.
