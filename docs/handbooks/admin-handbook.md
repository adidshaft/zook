# 🧑‍💼 Admin Handbook

> **You operate the gym for the owner.** Admins can run most day-to-day business workflows, but owner-only billing/business-control decisions remain restricted.

---

## 🧭 Admin vs Owner

| Area | Admin | Owner |
| --- | --- | --- |
| Members and approvals | ✅ Yes | ✅ Yes |
| Plans, offers, coupons, referrals | ✅ Yes | ✅ Yes |
| Attendance and payments operations | ✅ Yes | ✅ Yes |
| Staff operations | ✅ Usually yes, based on permissions | ✅ Yes |
| Billing / SaaS subscription | ⚠️ Permission-gated | ✅ Yes |
| Platform admin | ❌ Never | ❌ Unless separately platform admin |

**Rule of thumb:** Admins run the gym. Owners control the business account.

---

## 🚀 Admin First 10 Minutes

```
1. Sign in → /dashboard
2. Confirm branch selector and active gym
3. Review Today board
4. Review pending member approvals
5. Check Attendance exceptions
6. Check Payments and Shop orders
7. Send only safe/test notifications during smoke
```

---

## 🖥️ Admin Dashboard Areas

| Section | What to test | Healthy state |
| --- | --- | --- |
| 🏠 Today | Operational summary | Metrics load; no owner-only dead ends |
| 👥 Members | Search, detail, approvals | Permission errors explain next step |
| 📋 Plans | Create/edit plans if permitted | Pricing/duration visible |
| 🎟 Promotions | Coupons, offers, referrals | Codes and rules are readable |
| 📅 Attendance | Exceptions, QR display access | QR and review actions work |
| 💳 Payments | Offline payment, refunds view | Real refunds require caution |
| 🛍 Shop | Products, orders, fulfilment status | Stock changes audit correctly |
| 📊 Reports | CSV downloads | Exports complete |
| 👨‍💼 Staff | Invite/manage staff if permitted | Role labels are clear |
| 🔔 Notifications | Templates, history, composer | Avoid mass-send in production smoke |
| 🗂 Audit | Review recent admin activity | Action details open |

---

## 📱 Admin Mobile Surface

Admins use the owner operational mobile surface:

```
Mobile route: /owner
Views: Command · Approvals · Revenue · Stock
```

Verify:
- Header says **Admin** where role-specific.
- Owner-only actions are hidden or permission-gated.
- Approvals and revenue views work without duplicate submissions.

---

## 🔄 Core Admin Flows

### 1. Approve a member

```
Dashboard → Members / Today approvals → Open request → Approve / Reject
```

Verify:
- Reason and member details are visible.
- Member gets the correct next state.
- Audit log shows the admin action.

### 2. Update plan or promotion

```
Plans / Coupons / Offers / Referrals → Edit → Save → Public/member state updates
```

Production caution:
- Do not change real prices or live offer rules during smoke unless the owner asked for it.

### 3. Record operations

```
Payments → Record offline payment
Shop → Update order/stock
Attendance → Approve/reject exception
```

Verify:
- Confirmation appears for sensitive actions.
- Double-tap protection prevents duplicates.
- Audit history records who did it.

---

## ✅ Admin Production Smoke Checklist

- [ ] Admin login opens `/dashboard`.
- [ ] Admin can access member, plan, attendance, payment, shop, reports, staff, notification, audit areas allowed by permissions.
- [ ] Owner-only/billing actions are clearly restricted if admin lacks permission.
- [ ] Mobile `/owner` command view works as Admin.
- [ ] No clipped text in action buttons, cards, or metric tiles.
- [ ] Permission failures are readable and non-scary.

---

## ⚠️ Good-to-Know Rules

- **Admin is powerful.** Use staging/test data for destructive checks.
- **Admin is not platform.** `/platform` should remain blocked.
- **Every sensitive admin action should be auditable.**
- **When the UI blocks you, escalate to Owner instead of working around it.**
