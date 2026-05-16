# 🔑 QA Test Identities

> Use these identities for local and staging QA. Production must use real OTP/SSO and approved test data only.

---

## 👥 Seeded Accounts

| Account | Email | Phone | Code | Primary routes | What you get |
| --- | --- | --- | --- | --- | --- |
| 👑 **Owner** | `owner@zook.local` | — | `000000` | `/dashboard`, mobile `/owner` | Full Aarogya Strength business control |
| 🧑‍💼 **Admin** | `admin@zook.local` | — | `000000` | `/dashboard`, mobile `/owner` | Operational dashboard without owner-only assumptions |
| 🎫 **Reception** | `reception@zook.local` | — | `000000` | `/desk`, mobile `/reception` | Check-ins, member lookup, payments, pickup |
| 🏃 **Trainer** | `trainer@zook.local` | — | `000000` | `/coach`, mobile `/trainer` | Client list, plans, notes, AI drafts |
| 🏋️ **Member** | `member@zook.local` | `+91 98765 43210` | `000000` | `/me`, mobile member tabs | Membership, attendance, plans, shop |
| 🧒 **Minor Member** | `minor@zook.local` | — | `000000` | Member join/consent flow | Blocked until guardian consent |
| 🛠️ **Platform** | `platform@zook.local` | — | `000000` | `/platform` | Cross-gym status, provider diagnostics, subscriptions |

⚠️ `000000` is local/staging only. It must never work in normal production.

---

## ✨ Fresh Account (First-Run Testing)

```
Email:   fresh@zook.local
Phone:   +91 90000 11111
Code:    000000
```

**Use for:** onboarding, empty states, checkout, consent, profile setup, and first-run testing.

Every login with this identifier creates a **new blank user** with no memberships, orders, or profile data. Reset any time by logging out and in again.

> ⚠️ Fresh identities are blocked at runtime in production. The `SEED_DEMO_USERS_ENABLED=true` flag gates them.

---

## 🏟️ Demo Gyms

| Handle             | Gym name         | Used by                                              |
| ------------------ | ---------------- | ---------------------------------------------------- |
| `aarogya-strength` | Aarogya Strength | Primary demo gym — owner, member, trainer, Reception |
| `iron-house`       | Iron House       | Secondary — multi-org isolation tests                |
| `peaklab`          | Peak Lab         | Tertiary — edge-case flows                           |

---

## 🔄 End-to-End Smoke Paths

```
Member flow:
  Login as member@zook.local → Home → Scan QR
  (use /dashboard/attendance/qr-display)
  → Check-in approved → Plans tab → Tracking → Shop → Add item → Checkout (mock)
  → Pickup code shown ✓

Reception flow:
  Login as reception@zook.local → Desk → Approve pending scan
  → Verify AS-XXXX → Record UPI payment → Fulfil pickup order ✓

Trainer flow:
  Login as trainer@zook.local → Clients → Open Nisha Menon
  → Review AI draft → Edit → Publish ✓

Admin web flow:
  Login as admin@zook.local → /dashboard → Members / Attendance / Payments
  → Verify owner-only restrictions are clear ✓

Owner web flow:
  Login as owner@zook.local → /dashboard → Today command board
  → Billing → Attendance exceptions → Notifications → Reports → Audit ✓

Internal platform operator:
  Login as platform@zook.local → /platform → Provider status → Subscriptions
  → Suspend / reactivate test org only ✓
```

---

## 🚦 Production Testing Tomorrow

| Action | Production guidance |
| --- | --- |
| Open public pages | ✅ Safe |
| Log in with real OTP/SSO | ✅ Safe |
| View dashboards | ✅ Safe |
| Create/update/delete data | ⚠️ Use a test org/member |
| Payment/refund checks | ⚠️ Use approved test payment path only |
| Suspend/reactivate | ⚠️ Test org only |
| Mass notifications | ❌ Do not send during smoke unless explicitly planned |

---

## 🚢 Deployment Note

| Area | Rule |
| --- | --- |
| Web/backend | Push `main`, run DB migration check, deploy Vercel production |
| Mobile | EAS build/TestFlight/Play internal track required for binary rollout |
| Staging smoke | `pnpm release:preflight` plus role matrix |
| DB ready | `pnpm db:deploy` on the intended target environment |
