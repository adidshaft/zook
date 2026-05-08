# 🏋️ Member Handbook

> **You are a gym member.** Your job is simple: show up, scan in, track progress, renew when needed.

---

## 🚀 Quick Start

| Step | What to do                | Where                     |
| ---- | ------------------------- | ------------------------- |
| 1    | Find your gym             | 📱 Home → Find Gyms       |
| 2    | Pick a plan & pay         | 📱 Gym page → Join        |
| 3    | Check in at the gym       | 📱 Scan tab → Point at QR |
| 4    | Track your workouts       | 📱 Tracking tab           |
| 5    | Browse & order shop items | 📱 Shop tab               |

**Test accounts (local/staging only, code = `000000`)**

| Account                                 | Use for                                                       |
| --------------------------------------- | ------------------------------------------------------------- |
| `member@zook.local` · `+91 98765 43210` | Full demo — membership, plans, attendance, shop all populated |
| `fresh@zook.local` · `+91 90000 11111`  | First-run testing — blank slate, no data                      |

---

## 📱 Mobile Screens at a Glance

```
Bottom Nav:  🏠 Home  ·  📷 Scan  ·  📋 Plans  ·  🛍 Shop  ·  👤 Profile
```

| Screen                             | What you'll see                                                      |
| ---------------------------------- | -------------------------------------------------------------------- |
| **Home** `/`                       | Active membership card (days left, plan, visits), Scan CTA, gym name |
| **Scan** `/scan`                   | Camera → point at gym QR → instant check-in                          |
| **Plans** `/plans`                 | Your assigned workout / diet / habits from trainer                   |
| **Membership** `/membership`       | Plan details, renewal, pause/resume, payment history                 |
| **Shop** `/shop`                   | Products, cart, checkout, pickup code                                |
| **Order** `/order/[id]`            | Live order status + pickup code                                      |
| **Notifications** `/notifications` | Alerts from your gym                                                 |
| **Profile & Settings**             | Phone, email, privacy, push prefs, language                          |

---

## 🔄 Core Flows

### Joining a gym

```
Find Gym ──► Open Gym Page ──► Pick Plan ──► Apply Coupon / Referral
     └──► Pay via Razorpay ──► Membership Active ──► Ready to Scan ✓

Approval-required gyms:
  Submit Request ──► Wait for Owner Approval ──► Email notification ──► Active ✓

Invite-only gyms:
  Enter Invite Code ──► Approved automatically ──► Active ✓
```

### Checking in

```
📱 Tap Scan ──► Camera opens ──► Point at QR code at gym entrance
     ├── ✅ Valid membership  →  "Check-in approved" + green flash
     ├── ⏳ Pending approval  →  "Awaiting desk approval" message
     ├── ❌ Expired / no membership  →  "Cannot check in" + renewal CTA
     └── 📟 No camera?  →  Scan tab → Enter Code manually
```

### Renewing / switching plans

```
Profile → Membership → Renew  ──►  Pick new plan ──► Checkout ──► Active
                     → Pause   ──►  Choose pause duration ──► Resumes automatically
                     → Switch  ──►  Credit unused days ──► New plan starts
```

---

## 🌐 Web Entry Points

| URL                     | What it does                                  |
| ----------------------- | --------------------------------------------- |
| `/find`                 | Search gyms by city, name, price, join mode   |
| `/g/[username]`         | Public gym profile — plans, reviews, join CTA |
| `/join/[username]`      | Start joining with referral / coupon support  |
| `/r/[code]`             | Referral link entry point                     |
| `/checkout/[sessionId]` | Complete payment                              |

---

## ✅ Good-to-Know Rules

- **One action per screen.** The big lime button is always the right next step.
- **State first.** Days left / payment state / approval state is shown before anything else.
- **Empty states help.** If something is missing, the screen tells you the next action to take.
- **Minor accounts** need guardian consent before joining or checking out.
