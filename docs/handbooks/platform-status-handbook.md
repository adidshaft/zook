# 🛠️ Platform Status Handbook

> **You are an internal platform operator.** You can see provider health, org status, and engineering-level diagnostics that no gym owner ever sees. This access is controlled by `User.isPlatformAdmin`; it is not a Zook gym role.

---

## 🌐 Operator Entry Points

| URL | What it shows |
|-----|--------------|
| `/platform` | All organisations, status, plan, created date |
| `/platform/provider-status` | Live provider health — safe read-only view |
| `/api/platform/provider-status` | JSON provider readiness (same data, machine-readable) |

---

## 🔍 Provider Status Explained

```
Provider Health Card:

  ✅ READY      — Configured and responding
  ⚠️  DEGRADED  — Configured but returning errors
  ❌ MISSING    — Env var not set or wrong
  🔒 MOCK       — Local/staging mock, not production-ready

Providers checked:
  ├── 📧 Email        (Resend / SMTP)
  ├── 💳 Payment      (Razorpay)
  ├── 🗄️  Storage     (Supabase / S3 / R2 / Local)
  ├── 🤖 AI           (OpenAI / Mock)
  ├── 🔔 Push         (Expo / Mock)
  ├── 💬 SMS          (Webhook / Mock)
  ├── 🗺️  Maps        (Google / Mock)
  ├── 📊 Monitoring   (Sentry)
  └── ⚡ Rate Limits  (Upstash / In-memory)
```

**Security note:** The status page shows request IDs and missing env-var *names* only. It **never** exposes secret values.

---

## 🏢 Organisation Management

| Action | Where |
|--------|-------|
| View all orgs | `/platform` |
| See org plan / status | Org row in platform table |
| Suspend an org | Platform → Org → Change status to SUSPENDED |
| Reactivate an org | Platform → Org → Change status to ACTIVE |
| Review AI usage | Platform → Org → AI tab |

**Org statuses:**

| Status | Meaning |
|--------|---------|
| `TRIAL` | Free trial, time-limited |
| `ACTIVE` | Paid and running |
| `SUSPENDED` | Access blocked — owner notified |
| `CHURNED` | Cancelled / lapsed |

---

## 📢 User-Facing Status Page

> Gym owners see a simplified status page — plain language, no infra labels.

```
What gym owners see:          What this actually means:
────────────────────────────────────────────────────────
✅ Check-ins working         →  QR, scan, attendance APIs healthy
✅ Payments working          →  Razorpay webhooks + checkout healthy
✅ App & web working         →  Next.js, API, push all healthy
⚠️  Payments degraded        →  Razorpay returning errors or slow
❌ Check-ins down            →  QR or attendance service failing
```

**Drafting incident copy rules:**
- Plain language: "Some members may not be able to check in" not "QR token service 503"
- Sandbox / mock mode → translate to user impact: "Payments processing in test mode"
- Keep cards calm, factual, one sentence

---

## ✅ Good-to-Know Rules

- **Platform operator access is hidden.** It doesn't overlap with gym owner permissions and never appears in product role pickers.
- **Provider status is read-only.** It shows health; it does not change config.
- **Never expose secret values** in any status UI, even in engineering view.
- **Diagnostics endpoints are rate-limited** and require an internal platform session.
