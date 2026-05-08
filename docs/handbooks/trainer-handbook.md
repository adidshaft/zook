# 🏃 Trainer Handbook

> **You guide members.** The mobile app is your primary tool. The web dashboard lets the gym owner see your coaching library.

---

## 🚀 Daily Workflow

```
Morning:
  📱 /trainer → Today tab → See who's coming in today + anyone slipping

During shift:
  📱 Open a client → Check 14-day adherence grid → Add note if needed

After session:
  📱 Client detail → Update plan → Log offline PT session if applicable

Weekly:
  📱 Plans tab → Review AI draft (if pending) → Edit → Publish to client
```

---

## 📱 Mobile Screens

```
Bottom Nav:  📅 Today  ·  👥 Clients  ·  📋 Plans  ·  ⋯ More
```

| Screen | What you'll see |
|--------|----------------|
| **Today** `/trainer` | Sessions now, clients needing attention, adherence alerts |
| **Clients** `?view=clients` | Full client list — sort by: Needs Attention / Expiring Plan / Low Adherence |
| **Plans** `?view=plans` | Plan templates and active assignments |
| **Client Detail** `/trainer/client/[id]` | Adherence grid, assigned plan, notes, next session |
| **AI Draft Review** `/trainer/client/[id]/ai-draft` | Review → edit → publish (never auto-assigns) |

---

## 🔄 Core Flows

### Assigning a plan to a client

```
📱 Clients → Pick client → Assign Plan
  ├── Choose plan type: Workout / Diet / Habits
  ├── Set duration and cadence
  └── Publish → Member sees it immediately in their Plans tab  ✓
```

### Reviewing an AI draft

```
📱 Client detail → AI Draft card appears (orange badge = pending review)
  ├── Read full draft
  ├── Edit any day / exercise / rep / set
  ├── Tap Publish → Confirm  →  Sent to member + push notification
  └── ⚠️  Drafts NEVER reach members without trainer approval
```

### Logging a note

```
📱 Client detail → Notes tab → Add note
  ├── Trainer-only notes: owner and trainer can see, member cannot
  └── Plan notes: visible to member inside their plan
```

---

## 📋 What Clients See vs. What You See

| Item | Member sees | Trainer sees |
|------|-------------|-------------|
| Assigned plan | ✅ Full plan with days | ✅ Full plan + edit controls |
| Trainer notes | ❌ Private | ✅ All notes |
| Adherence grid | ❌ (their own tracking) | ✅ 14-day colour grid |
| AI draft | ❌ Only after publish | ✅ Full draft before publish |
| Progress photos | ❌ (member's own) | ✅ If shared |

---

## 👁️ Adherence Grid Guide

```
14-day grid per client:

  ██ = Logged workout      (lime)
  ▒▒ = Partial session     (amber)
  ░░ = No activity         (grey)
  ── = Rest day / planned  (dim)

Sort clients by:
  "Needs Attention" = most grey squares recently
  "Low Adherence"   = < 50% completion rate in last 14 days
```

---

## ✅ Good-to-Know Rules

- **AI drafts require manual publish.** No plan reaches a member without you approving it.
- **Client detail starts with adherence**, not gym-level analytics.
- **Notifications to clients** only work when you have permission for assigned-client messaging.
- **Web dashboard** shows your coaching library to the gym owner (read-only). All plan editing is on mobile.
