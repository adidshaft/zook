# 🛠️ Platform Operator Handbook

> **You are an internal platform operator.** You can see cross-gym health, provider readiness, SaaS subscriptions, and safety controls. This is controlled by `User.isPlatformAdmin`; it is not a gym role.

---

## 🌐 Operator Entry Points

| URL | What it shows | Production safety |
| --- | --- | --- |
| `/platform` | Organisations, SaaS plan/status, safety and usage | Read-only smoke is safe |
| `/platform/gyms` | Gym list and org status | Suspend/reactivate only test orgs |
| `/platform/subscriptions` | SaaS subscription and mandate state | Verify billing status carefully |
| `/platform/provider-status` | Provider health | Read-only |
| `/api/platform/provider-status` | JSON provider readiness | Read-only |

---

## 🚦 Provider Status Explained

| Symbol | Status | Meaning |
| --- | --- | --- |
| ✅ | READY | Configured and responding |
| ⚠️ | DEGRADED | Configured but slow/failing |
| ❌ | MISSING | Required config is absent |
| 🔒 | MOCK | Safe for local/staging, not normal production |

Providers checked:

```
📧 Email      Resend / SMTP / mock
💳 Payments   Razorpay / mock / disabled
🗄 Storage    Supabase / S3 / R2 / local
🤖 AI         OpenAI / disabled / mock
🔔 Push       Expo / mock
💬 SMS        MSG91 / webhook / mock
🗺 Maps       Google / mock
📊 Sentry     Error reporting
⚡ Rate limit Upstash / memory
```

**Security rule:** show missing env-var names and request IDs only. Never expose secret values.

---

## 🏢 Organisation Management

| Action | Where | Test expectation |
| --- | --- | --- |
| View all gyms | `/platform` | Search/sort/filter works |
| Review org status | Org row/detail | Trial/active/suspended/churned are clear |
| Suspend test org | Platform org action | Gym access blocks safely |
| Reactivate test org | Platform org action | Gym access returns |
| Review subscription | `/platform/subscriptions` | Mandate/payment state matches owner billing |
| Review assistant/safety | Platform assistant/safety areas | No customer secrets exposed |

Org statuses:
- `TRIAL` — free trial, time-limited
- `ACTIVE` — paid and running
- `SUSPENDED` — access blocked; owner notified
- `CHURNED` — cancelled/lapsed

---

## 💳 SaaS Billing Checks

```
Owner Billing page ↔ Platform Subscriptions page ↔ Database subscription/mandate state
```

Verify:
- Owner sees the same status the platform sees.
- Missing mandate/payment does not crash the page.
- Suspended orgs cannot keep using operational features.
- Trial countdown and renewal language are clear.

---

## 📢 User-Facing Status Copy

| User-facing text | Internal meaning |
| --- | --- |
| ✅ Check-ins working | QR, attendance APIs, and DB are healthy |
| ✅ Payments working | Checkout and webhooks are healthy |
| ✅ App & web working | Web/API/mobile handoff is healthy |
| ⚠️ Payments degraded | Payment provider slow/failing |
| ❌ Check-ins down | QR or attendance service failing |

Incident copy rules:
- Use plain language.
- Say who is affected and what they can do.
- Do not mention raw provider internals unless the audience is engineering.

---

## ✅ Platform Production Smoke Checklist

- [ ] `/platform` opens only for platform operator.
- [ ] Owner/admin/reception/trainer/member accounts cannot open `/platform`.
- [ ] Provider status loads without secret values.
- [ ] Subscriptions page loads without 500s.
- [ ] Test org suspend/reactivate works in staging or test data only.
- [ ] Production logs show no Prisma engine, auth, or provider errors after deploy.
- [ ] Public `/status` renders and uses calm user-facing language.

---

## ⚠️ Good-to-Know Rules

- **Platform admin is separate from gym roles.**
- **Provider status is diagnostic, not configuration.**
- **Production destructive actions need a test org or explicit business approval.**
- **Logs and request IDs are useful; secrets never belong in UI, docs, or screenshots.**
