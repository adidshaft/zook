# 🏃 Trainer Handbook

> **You coach members.** Your primary workplace is the mobile trainer surface. Web `/coach` is a lightweight command view and handoff surface.

---

## 🚀 Daily Trainer Flow

```
Morning → Open /trainer → Check clients needing attention
Before session → Open client detail → Review plan + recent progress
After session → Add note / update plan / log progress
Weekly → Review AI draft → Edit → Publish only when correct
```

**Production testing rule:** use a test client before publishing plans or notes. Trainer notes may be private, but they still affect the member record.

---

## 📱 Mobile Trainer Screens

```
Trainer tabs:  Home · Clients · Plans · Inbox
Client detail tabs:  Summary · Plans · Progress · Notes · AI Draft
```

| Screen | What to verify | Healthy state |
| --- | --- | --- |
| 🏠 **Home** `/trainer` | Today summary, attention cards, schedule | Cards are stable and readable |
| 👥 **Clients** | Client list, search/sort, status chips | Long names do not clip awkwardly |
| 📋 **Plans** | Templates, assignments, drafts | Actions are gated by permission |
| 📬 **Inbox** | Member messages / nudges | Empty state is clear |
| 👤 **Client detail** `/trainer/client/[id]` | Summary, plan, progress, notes | Tabs fit and preserve state |
| 🤖 **AI Draft** | Draft review/edit/publish | Nothing reaches member before publish |

---

## 🌐 Web Trainer Surface

| URL | Use for |
| --- | --- |
| `/coach` | Trainer command overview, assigned clients, quick actions |
| `/me` | Account/profile handoff |

Verify tomorrow:
- `/coach` loads without Server Component or icon serialization errors.
- KPI tiles render for assigned clients, plans, sessions, notes.
- Quick action rows route correctly.
- Sign out works.

---

## 🔄 Core Trainer Flows

### 1. Assign a plan

```
Clients → Pick client → Plans tab → Assign Plan
   → Choose type → Set cadence/duration → Publish → Member sees it
```

Plan types:
- Workout
- Diet
- Habits
- Hybrid / custom where enabled

Verify:
- Member receives the plan in their Plans tab.
- Long exercise names and rep text wrap cleanly.
- Publish button cannot be double-fired.

### 2. Review an AI draft

```
Client detail → AI Draft → Read → Edit → Confirm publish
```

Rules:
- AI draft is never visible to the member until published.
- Trainer remains accountable for correctness.
- If AI provider is disabled, the UI should show an unavailable state, not a crash.

### 3. Add notes

```
Client detail → Notes → Add note → Choose visibility → Save
```

Visibility:
- **Trainer-only:** visible to owner/trainer, not member.
- **Plan/member note:** visible inside member plan where supported.

### 4. Check progress

```
Client detail → Progress → Review adherence / body progress / recent sessions
```

Verify:
- Graphs/cards are readable on small phones.
- Empty progress states explain what the member should do next.

---

## ✅ Trainer Production Smoke Checklist

- [ ] Login as trainer routes to `/coach` on web or `/trainer` on mobile.
- [ ] Home, Clients, Plans, Inbox all open.
- [ ] Client detail opens every tab.
- [ ] Notes save with the correct visibility.
- [ ] AI draft unavailable/review/publish states are clear.
- [ ] Member can see published plan.
- [ ] No clipped tab labels, card headers, or bottom nav labels.

---

## ⚠️ Good-to-Know Rules

- **AI is an assistant, not an autopilot.**
- **Trainer access is client-scoped.** Trainers should not see unrelated members.
- **Owners/admins can manage trainers**, but trainer day-to-day work stays mobile-first.
- **Permission errors should be friendly** and explain who can help.
