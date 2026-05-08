# 🔑 QA Test Identities

> All test accounts below require the local test code `000000` — available in **local** and **staging** environments only. Never enabled in production.

---

## 👥 Seeded Accounts

| Account          | Email                  | Phone             | One-time code | What you get                             |
| ---------------- | ---------------------- | ----------------- | ------------- | ---------------------------------------- |
| **Owner**        | `owner@zook.local`     | —                 | `000000`      | Full dashboard for Aarogya Strength      |
| **Admin**        | `admin@zook.local`     | —                 | `000000`      | Org-wide ops without owner-only settings |
| **Reception**    | `reception@zook.local` | —                 | `000000`      | Desk, check-ins, payments                |
| **Trainer**      | `trainer@zook.local`   | —                 | `000000`      | Client list, plans, AI drafts            |
| **Member**       | `member@zook.local`    | `+91 98765 43210` | `000000`      | Full demo — membership, attendance, shop |
| **Minor Member** | `minor@zook.local`     | —                 | `000000`      | Blocked until guardian consent           |

Internal platform operator: `platform@zook.local` with code `000000` opens `/platform` for all-gym visibility and partner diagnostics. This is not a gym role.

---

## ✨ Fresh Account (First-Run Testing)

```
Email:   fresh@zook.local
Phone:   +91 90000 11111
Code:    000000
```

**Use for:** onboarding, empty states, checkout, consent, profile setup — anything that needs a blank slate.

Every login with this identifier creates a **new blank user** with no memberships, orders, or profile data. Reset any time just by logging out and in again.

> ⚠️ Fresh identities are blocked at runtime in production. The `SEED_DEMO_USERS_ENABLED=true` flag gates them.

---

## 🏟️ Demo Gyms

| Handle             | Gym name         | Used by                                              |
| ------------------ | ---------------- | ---------------------------------------------------- |
| `aarogya-strength` | Aarogya Strength | Primary demo gym — owner, member, trainer, Reception |
| `iron-house`       | Iron House       | Secondary — multi-org isolation tests                |
| `peaklab`          | Peak Lab         | Tertiary — edge-case flows                           |

---

## 🔄 End-to-End Smoke Path

```
Member flow:
  Login as member@zook.local → Home → Scan QR (use /dashboard/attendance/qr-display)
  → Check-in approved → Plans tab → Tracking → Shop → Add item → Checkout (mock)
  → Pickup code shown ✓

Reception flow:
  Login as reception@zook.local → Desk → Approve pending scan
  → Verify AS-XXXX → Record UPI payment → Fulfil pickup order ✓

Trainer flow:
  Login as trainer@zook.local → Clients → Open Nisha Menon
  → Review AI draft → Edit → Publish ✓

Owner web flow:
  Login as owner@zook.local → /dashboard → Today command board
  → Attendance exceptions → Notifications → Reports → Audit ✓

Internal platform operator:
  Login as platform@zook.local → /platform → Provider status
  → Suspend / reactivate test org ✓
```

---

## 🚢 Deployment Note

> Test identities ≠ production deployment.

| To deploy web              | Push branch → promote Vercel deployment                      |
| -------------------------- | ------------------------------------------------------------ |
| **To test mobile in prod** | EAS build or TestFlight / Play Store internal track          |
| **Staging smoke test**     | `pnpm release:preflight` must pass with 0 blocking issues    |
| **DB ready**               | `pnpm db:deploy && pnpm seed:demo` on the target environment |
