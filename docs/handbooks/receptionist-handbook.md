# 🎫 Reception Handbook

> **You run the front desk.** The mobile app is a tablet-first desk tool. Speed and confidence matter — one active member at a time.

---

## 🚀 Daily Desk Flow

```
Start of shift:
  📱 /reception → Today tab → See check-ins so far + pending items + collected amount

When someone walks in:
  📱 Search bar (always visible at top) → Name / Phone / Code → Member card opens

At end of shift:
  📱 Today tab → Confirm totals match cash-on-hand
```

---

## 📱 Mobile Desk Screens

```
Bottom Nav:  🟢 Desk  ·  👥 Members  ·  💳 Payments  ·  📦 Orders
```

| Screen | What you'll see |
|--------|----------------|
| **Desk** `/reception` | Live check-in card + today's totals (ambient, not primary focus) |
| **Members** `?view=members` | Search + member status, plan, last check-in |
| **Payments** `?view=payments` | Record & review payments, renewals |
| **Orders** `?view=orders` | Shop orders ready for pickup handoff |

---

## 🔄 Core Desk Actions

### Check-in a member

```
📱 Search → Member card opens → Large "Approve / Hold / Deny" buttons

  ✅ Approve  →  Check-in logged, member gets notification
  ⏸  Hold     →  Queued for owner review
  ❌ Deny     →  Denied with reason, logged in audit

Fallback when camera isn't being used:
  Member tells you their code → Desk → Enter Code manually
```

### Recording a payment

```
📱 Payments tab → Record Payment
  ├── Select member
  ├── Enter amount (₹)
  ├── Pick mode: Cash / UPI / Card / Bank Transfer
  ├── Add reference note (optional)
  └── Confirm → Audit entry created  ✓
```

### Shop pickup handoff

```
📱 Orders tab → Find order (READY FOR PICKUP)
  ├── Ask member for their pickup code
  ├── Enter code → Verify  →  ✅ Match: mark fulfilled
  │                         →  ❌ No match: re-ask / escalate
  └── If member lost code: tap "Skip code check" → log reason
```

### Walk-in / day pass

```
📱 Desk → New Walk-in
  └── Enter name + phone → Set plan (day pass / trial) → Confirm
  └── Creates a temporary membership active for the day
```

---

## 🌐 Web Entry Points (when at a desktop)

| URL | Use for |
|-----|---------|
| `/dashboard/attendance` | Attendance records, bulk exception review |
| `/dashboard/attendance/qr-display` | Show the desk / entrance QR on a big screen |
| `/dashboard/payments` | Payment history, settlement review |
| `/dashboard/shop/products` | Shop handoff support (if permitted) |
| `/desk` | Full desk panel with Queue / Member / Payment / Pickup tabs |

---

## ⚡ Quick Reference

| Situation | Action |
|-----------|--------|
| Member has no membership | Record walk-in OR tell them to join via app / web |
| Membership expired | Reception can collect renewal payment directly |
| Scan flagged / exception | Approve or hold — owner sees it in audit |
| Cash collected at desk | Payments → Record (cap: 2 manual per staff per day) |
| Order at pickup | Orders tab → verify code → fulfil |
| Camera not working | Desk → Enter Code tab |

---

## ✅ Good-to-Know Rules

- **One active member dominates the screen.** Everything else is ambient.
- **Search is always at the top.** You should never need to navigate away from desk to find someone.
- **Manual code + desk fallback are always visible.** Never hidden behind menus.
- **Sync indicator in the header** tells you if you're online. Transaction confidence stays visible at all times.
