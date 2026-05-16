# 🎫 Receptionist Handbook

> **You run the front desk.** The desk surface is built for speed, confidence, and one member at a time.

---

## 🚀 Daily Desk Flow

```
Start shift → Open /desk or mobile /reception
Walk-in arrives → Search member / enter code
Action needed → Approve scan, record payment, fulfil order, or escalate
End shift → Confirm totals and pending queue
```

**Production testing rule:** use a test member/order for payments and pickup fulfilment. Do not mark a real customer order fulfilled unless the item is actually handed over.

---

## 🖥️ Web Desk

| URL | Use for | Healthy state |
| --- | --- | --- |
| `/desk` | Queue, member lookup, manual payment, pickup fulfilment | Fast search, clear active member panel |
| `/desk/qr` | Desk QR route | Shows QR display or routes correctly |
| `/dashboard/attendance` | Owner/admin attendance review | Only if you have permission |
| `/dashboard/attendance/qr-display` | Entrance QR display | Useful on a larger screen |

---

## 📱 Mobile Desk Screens

```
Bottom Nav:  Desk · Members · Payments · Orders
```

| Screen | What to verify | Healthy state |
| --- | --- | --- |
| 🟢 **Desk** `/reception` | Verify code, recent scans, active member card | Outcome toast + haptic feedback |
| 👥 **Members** | Search, phone reveal, member status | Phone reveal permission gate works |
| 💳 **Payments** | Record renewal/offline payment | Double-tap does not duplicate payment |
| 📦 **Orders** | Verify pickup code, fulfil order | Confirm action protects fulfilment |

---

## 🔄 Core Desk Actions

### 1. Verify attendance code

```
Desk → Enter member/attendance code → Verify
   ✅ Approved: member may enter
   ⏳ Pending: wait for owner/admin review
   ❌ Rejected: tell member the reason and next step
```

Verify:
- Success clears stale error/status text.
- Toast appears for every outcome.
- Double-submit is blocked.

### 2. Record payment

```
Payments → Select member → Enter amount → Pick mode → Add reference → Confirm
```

Modes:
- Cash
- UPI
- Card
- Bank transfer
- Other

Verify:
- Amount field handles invalid input safely.
- Confirmation is required.
- Audit log entry is created.

### 3. Fulfil shop pickup

```
Orders → Select READY order → Ask for pickup code → Verify → Fulfil
```

If code does not match:
- Re-ask member to open Shop → Order detail.
- Escalate to owner/admin if the member cannot prove the order.

Verify:
- Pickup code entry fits.
- Fulfil action has a confirmation step.
- Order status updates once only.

### 4. Phone reveal

```
Members → Open member → Reveal phone → Permission gate → Audit log
```

Verify:
- Staff without permission cannot reveal.
- Audit-log failure shows a toast.

---

## ✅ Reception Production Smoke Checklist

- [ ] `/desk` opens for receptionist account.
- [ ] Mobile Desk, Members, Payments, Orders tabs open.
- [ ] Code verify shows success/pending/rejected states using demo/test data.
- [ ] Manual payment form blocks duplicate taps.
- [ ] Pickup fulfilment requires confirmation.
- [ ] Phone reveal permission gate is visible.
- [ ] Bottom nav is evenly distributed and does not clip text.
- [ ] No black-on-black text in cards, sheets, or toasts.

---

## ⚠️ Good-to-Know Rules

- **One active member dominates the screen.**
- **Search should always be easy to reach.**
- **When unsure, hold/escalate instead of forcing approval.**
- **Every sensitive desk action should leave an audit trail.**
