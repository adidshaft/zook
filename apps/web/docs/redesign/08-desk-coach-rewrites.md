# Plan 08 — Desk + Coach Layout Rewrites

## Goal

Give Reception (`/desk`) and Trainer (`/coach`) the same routing structure the dashboard has after plan #05: a layout file with chrome, subroutes for distinct surfaces, and proper data scoping. Break apart [`desk-panel.tsx`](apps/web/src/components/desk-panel.tsx) (658 lines) and [`coach-command-panel.tsx`](apps/web/src/components/coach-command-panel.tsx) (180 lines).

## Why

- Receptionist app today is a single 78-line page rendering `<DeskPanel />` (658 lines). The desk does at minimum: check-in queue, member lookup, payment collection, order pickup. These are distinct workflows that deserve real routes.
- Coach app is similarly a thin page rendering a 180-line panel. It's smaller and might not warrant subroutes — but it needs the host-aware layout pattern.
- Both should mirror the mobile redesign (mobile plans #05 + #07) so receptionists and trainers using mobile and web see equivalent IA.

## Prerequisites

- Plan #02 (host-aware auth).
- Plan #05 (dashboard route pattern established).

## Current state

- [`apps/web/app/desk/layout.tsx`](apps/web/app/desk/layout.tsx)
- [`apps/web/app/desk/page.tsx`](apps/web/app/desk/page.tsx) (78 lines)
- [`apps/web/app/desk/qr/page.tsx`](apps/web/app/desk/qr/page.tsx)
- [`apps/web/src/components/desk-panel.tsx`](apps/web/src/components/desk-panel.tsx) (658 lines)
- [`apps/web/src/components/desk/`](apps/web/src/components/desk/) — subfolder; verify contents
- [`apps/web/app/coach/page.tsx`](apps/web/app/coach/page.tsx) (33 lines)
- [`apps/web/src/components/coach-command-panel.tsx`](apps/web/src/components/coach-command-panel.tsx) (180 lines)
- [`apps/web/src/components/attendance-approvals-panel.tsx`](apps/web/src/components/attendance-approvals-panel.tsx)
- [`apps/web/src/components/attendance-qr-panel.tsx`](apps/web/src/components/attendance-qr-panel.tsx)

## Architectural target — Desk

```
apps/web/app/desk/
├── layout.tsx               — DeskChrome (header + tabs + branch switcher)
├── page.tsx                 — Approvals queue (was the bulk of desk-panel.tsx)
├── members/
│   └── page.tsx             — member lookup
├── payments/
│   ├── page.tsx             — payment list + record
│   └── new/page.tsx         — record payment (modal-style)
├── orders/
│   └── page.tsx             — shop order pickup
└── qr/page.tsx              — already exists; verify it works under new layout

apps/web/src/components/desk/
├── desk-chrome.tsx          — sidebar/topbar + tabs
├── approvals/
│   ├── queue.tsx            — extracted from desk-panel.tsx
│   ├── card.tsx
│   └── empty-state.tsx
├── members/
│   ├── lookup.tsx
│   └── row.tsx
├── payments/
│   ├── list.tsx
│   ├── new-form.tsx
│   └── mode-grid.tsx
├── orders/
│   ├── list.tsx
│   └── card.tsx
└── shared/
    ├── verification-result.tsx   — for QR verification flow
    └── helpers.ts                — phone redaction, age label, etc.
```

`DeskChrome` is the persistent shell with tabs at the top: **Approvals | Members | Payments | Orders | QR**. Permission-gated (e.g., Payments only if `PAYMENTS_CREATE`).

## Architectural target — Coach

Smaller; one route is fine but extract the panel into pieces:

```
apps/web/app/coach/
├── layout.tsx               — CoachChrome
├── page.tsx                 — today's roster + actions
└── clients/
    ├── page.tsx             — full client list
    └── [id]/
        ├── page.tsx         — client overview
        ├── plan/page.tsx    — plan editing
        └── sessions/page.tsx — session history

apps/web/src/components/coach/
├── coach-chrome.tsx
├── today-roster.tsx
├── client-list.tsx
├── client-detail/
│   ├── overview.tsx
│   ├── plan.tsx
│   └── sessions.tsx
└── shared/
    └── helpers.ts
```

If `coach-command-panel.tsx` doesn't currently have client list / detail features (only 180 lines suggests it's just a single roster view), do NOT invent them. Keep coach simple: `/coach` only. Add subroutes only if existing code already supports them.

**Read the current `coach-command-panel.tsx` and decide:** if it's currently just a roster, ship Coach with one page, leave the subroute scaffolding for a follow-up. **This plan should not add new functionality.**

## Execution steps

### Step 1 — Desk: extract helpers

`apps/web/src/components/desk/shared/helpers.ts`:
- Phone reveal logic, redact, age label, payment mode constants, reason suggestions

Move from `desk-panel.tsx` line-by-line.

### Step 2 — Desk: extract approvals queue

`apps/web/src/components/desk/approvals/queue.tsx` — the queue rendering from `desk-panel.tsx`. Pure component taking `records` and callbacks.

`approvals/card.tsx` — single pending approval card with approve/reject buttons.

`approvals/empty-state.tsx` — "Queue is clear" state.

### Step 3 — Desk: build chrome

`apps/web/src/components/desk/desk-chrome.tsx`:

```tsx
import Link from "next/link";
import { usePathname } from "next/navigation";

export function DeskChrome({ children, badges }: { children: ReactNode; badges: { approvals: number } }) {
  const pathname = usePathname();
  const tabs = [
    { href: "/desk", label: "Approvals", badge: badges.approvals, perm: undefined },
    { href: "/desk/members", label: "Members", perm: "MEMBERS_VIEW" },
    { href: "/desk/payments", label: "Payments", perm: "PAYMENTS_CREATE" },
    { href: "/desk/orders", label: "Orders", perm: "SHOP_FULFILL_ORDER" },
    { href: "/desk/qr", label: "QR", perm: "ATTENDANCE_QR_DISPLAY" },
  ];
  return (
    <div>
      <header>{/* branch switcher, user menu */}</header>
      <nav>
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={pathname === tab.href ? "page" : undefined}
          >
            {tab.label}
            {tab.badge ? <Badge>{tab.badge}</Badge> : null}
          </Link>
        ))}
      </nav>
      <main>{children}</main>
    </div>
  );
}
```

Permission filtering is server-side; the `DeskLayout` queries permissions and passes a filtered `tabs` list to the chrome.

### Step 4 — Desk: build layout

`apps/web/app/desk/layout.tsx`:

```tsx
import { requireDashboardSession } from "@/lib/server-auth";
import { hasDeskAccess, hasOwnerDashboardAccess } from "@/lib/auth-destinations";
import { DeskChrome } from "@/components/desk/desk-chrome";
import { getDeskBadges } from "@/lib/dashboard-data/desk";

export default async function DeskLayout({ children }: { children: ReactNode }) {
  const session = await requireDashboardSession({ expectedHost: "dashboard" });
  if (!hasDeskAccess(session) && !hasOwnerDashboardAccess(session) && !session.user.isPlatformAdmin) {
    redirect("/dashboard");  // wrong role
  }
  const badges = await getDeskBadges(session.activeOrgId!);
  return <DeskChrome badges={badges}>{children}</DeskChrome>;
}
```

`getDeskBadges` returns small counters for the tab badges (pending approvals, etc.).

### Step 5 — Desk: per-route pages

`/desk/page.tsx` — Approvals (queue.tsx).
`/desk/members/page.tsx` — Lookup (lookup.tsx).
`/desk/payments/page.tsx` — Payment list.
`/desk/payments/new/page.tsx` — Record payment (modal feel; actually a route).
`/desk/orders/page.tsx` — Order list.
`/desk/qr/page.tsx` — already exists.

Each page:
- Permission gate via `requirePermission(session, ...)`.
- Fetches its own data via `apps/web/src/lib/dashboard-data/desk-*.ts`.
- Renders the matching component from `apps/web/src/components/desk/`.

### Step 6 — Desk: data layer

Create:
- `apps/web/src/lib/dashboard-data/desk-approvals.ts` — `getApprovalsQueue(orgId, branchId)`
- `apps/web/src/lib/dashboard-data/desk-members.ts`
- `apps/web/src/lib/dashboard-data/desk-payments.ts`
- `apps/web/src/lib/dashboard-data/desk-orders.ts`
- `apps/web/src/lib/dashboard-data/desk.ts` — `getDeskBadges(orgId)` (light counts only)

### Step 7 — Desk: delete old monolith

After verification:
- Delete `apps/web/src/components/desk-panel.tsx`.
- Old `apps/web/app/desk/page.tsx` already becomes the new Approvals page — overwrite its content.

### Step 8 — Coach: read first, decide scope

Read [`coach-command-panel.tsx`](apps/web/src/components/coach-command-panel.tsx). If it's currently:

- **Just a roster view** → keep `/coach` as one route. Build only a small chrome with header (no tabs). Extract sub-components inside `apps/web/src/components/coach/` only if file exceeds 200 lines.
- **Multiple distinct views** → apply the Desk pattern: layout with tabs, subroutes per view.

Document the decision in the PR.

### Step 9 — Coach: theme + chrome

Whatever the scope, the Coach route now lives under the host-aware layout pattern:

```tsx
// apps/web/app/coach/layout.tsx
import { requireDashboardSession } from "@/lib/server-auth";
import { hasCoachAccess, hasOwnerDashboardAccess } from "@/lib/auth-destinations";

export default async function CoachLayout({ children }: { children: ReactNode }) {
  const session = await requireDashboardSession({ expectedHost: "dashboard" });
  if (!hasCoachAccess(session) && !hasOwnerDashboardAccess(session) && !session.user.isPlatformAdmin) {
    redirect("/dashboard");
  }
  return <CoachChrome session={session}>{children}</CoachChrome>;
}
```

### Step 10 — Theme migration

Touched files use semantic CSS vars (per plan #04).

## Files created

- `apps/web/app/desk/layout.tsx` (rewritten or new)
- `apps/web/app/desk/members/page.tsx`
- `apps/web/app/desk/payments/page.tsx`
- `apps/web/app/desk/payments/new/page.tsx`
- `apps/web/app/desk/orders/page.tsx`
- `apps/web/app/coach/layout.tsx`
- `apps/web/src/components/desk/desk-chrome.tsx`
- `apps/web/src/components/desk/approvals/{queue,card,empty-state}.tsx`
- `apps/web/src/components/desk/members/{lookup,row}.tsx`
- `apps/web/src/components/desk/payments/{list,new-form,mode-grid}.tsx`
- `apps/web/src/components/desk/orders/{list,card}.tsx`
- `apps/web/src/components/desk/shared/{verification-result,helpers}.ts(x)`
- `apps/web/src/components/coach/coach-chrome.tsx`
- (Optionally, per Step 8) coach subcomponents
- `apps/web/src/lib/dashboard-data/desk{,-approvals,-members,-payments,-orders}.ts`

## Files modified

- `apps/web/app/desk/page.tsx` (becomes the Approvals page)
- `apps/web/app/desk/qr/page.tsx` (verify it works under new layout)
- `apps/web/app/coach/page.tsx`

## Files deleted

- `apps/web/src/components/desk-panel.tsx`
- `apps/web/src/components/coach-command-panel.tsx` (only if fully migrated to coach/* components)

## UI/UX fixes shipped

- Desk is now navigable with tabs; back button works
- Direct deep-link to `/desk/payments` works
- Pending approvals badge on the Approvals tab
- Permission-gated tabs (no more empty pages where the user lacks permission)
- Coach has the same host-aware layout pattern as Desk and Dashboard

## Acceptance criteria

- [ ] As a receptionist on `dashboard.zookfit.in/desk`, see Approvals queue with tab bar (Approvals, Members, Payments, Orders, QR).
- [ ] Approvals tab shows correct pending count badge.
- [ ] Members tab visible only if user has `MEMBERS_VIEW`.
- [ ] Payments tab visible only if user has `PAYMENTS_CREATE`.
- [ ] `/desk/payments/new` opens a record-payment surface.
- [ ] `/desk/qr` still works (QR generation/display).
- [ ] As a trainer on `dashboard.zookfit.in/coach`, see the roster.
- [ ] Visiting `/desk` as an owner (no receptionist role) — sees Desk if they're also owner (covered by `hasOwnerDashboardAccess` check), else redirected.
- [ ] No file in `apps/web/src/components/desk/` or `apps/web/src/components/coach/` exceeds 350 lines.
- [ ] `desk-panel.tsx` does not exist.
- [ ] `pnpm -w typecheck` clean.
- [ ] `pnpm -w test --filter @zook/web` clean.

## What this plan does NOT do

- Does not add new functionality. If a current view doesn't exist, don't invent it.
- Does not change attendance approval flow logic — just the routing/file structure.
- Does not touch the existing `attendance-approvals-panel.tsx` or `attendance-qr-panel.tsx`; integrate or replace as needed during extraction.
- Does not consolidate Owner's approvals view with Desk's approvals queue — that's a future plan.
