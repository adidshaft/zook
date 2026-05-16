# 📚 Zook User Handbooks

> Use these handbooks for tomorrow's production testing and for onboarding each role.

---

## 👥 Role Handbooks

| Role | Handbook | Primary surface |
| --- | --- | --- |
| 👑 Owner | [owner-handbook.md](./owner-handbook.md) | Web `/dashboard` + mobile `/owner` |
| 🧑‍💼 Admin | [admin-handbook.md](./admin-handbook.md) | Web `/dashboard` + mobile `/owner` |
| 🎫 Receptionist | [receptionist-handbook.md](./receptionist-handbook.md) | Web `/desk` + mobile `/reception` |
| 🏃 Trainer | [trainer-handbook.md](./trainer-handbook.md) | Mobile `/trainer` + web `/coach` |
| 🏋️ Member | [member-handbook.md](./member-handbook.md) | Mobile app + public web |
| 🛠️ Platform operator | [platform-status-handbook.md](./platform-status-handbook.md) | Web `/platform` |

---

## 🧪 Testing Helpers

| Guide | Use it for |
| --- | --- |
| [qa-test-identities.md](./qa-test-identities.md) | Local/staging seeded accounts and smoke paths |
| [local-device-testing.md](./local-device-testing.md) | Running web, API, iOS, Android, and Expo locally |

---

## ✅ Tomorrow's Production Test Rule

Read-only smoke is safe in production:
- Open pages.
- Confirm routing.
- Confirm visual layout.
- Confirm protected pages require login.
- Confirm role dashboards load.

Use staging/test data for state-changing actions:
- Payments
- Refunds
- Member approval/rejection
- Staff invites
- Notification sends
- Suspend/reactivate
- Order fulfilment
