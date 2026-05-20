# Plan 05 — Dashboard Route Flattening

## Goal

Replace the section-dispatch architecture (`[[...section]]` + `resolveMode()` + `DashboardMode` strings) with real Next.js subroutes that own their own loaders and components. Eliminate the `?view=join-requests` query-param hack. Each top-level dashboard section becomes a self-contained module.

## Why

Today every dashboard section page is a 10-line file that calls `renderDashboardRoute({ section, searchParams })`. The actual logic lives in [`dashboard-operational-model.ts:417`](apps/web/src/components/dashboard-operational-model.ts#L417) (`resolveMode`) — a 500-line string-to-mode dispatcher that decides what to render. The `[[...section]]` catch-all is a second route doing the same dispatch.

Effects:
- Hard to navigate the codebase ("where does `/dashboard/members` actually render?")
- One giant React tree for everything; transitions between sections re-execute work that should be scoped
- Loaders fetch dashboard-wide data via `getDashboardData()` regardless of section, even when most of it isn't needed
- `?view=` query-param routing for member sub-views — same anti-pattern we removed from mobile

## Prerequisites

- Plan #02 (auth + redirects).

## Current state

- [`dashboard/[[...section]]/page.tsx`](apps/web/app/dashboard/[[...section]]/page.tsx) — 12 lines, catches everything.
- [`dashboard-route.tsx`](apps/web/app/dashboard/dashboard-route.tsx) — 108 lines, the real loader + permission gate + section-permission map (`sectionAccessPermissions`).
- [`dashboard-operational-model.ts`](apps/web/src/components/dashboard-operational-model.ts) — 512 lines. `resolveMode(sectionKey)` returns a `DashboardMode` string. `DashboardMode` (line 1) is the union enum.
- [`dashboard-operational-panel.tsx`](apps/web/src/components/dashboard-operational-panel.tsx) — 500 lines. One giant component with `if (mode === "X") return <PanelX />` branches.
- [`dashboard-shell.tsx`](apps/web/src/components/dashboard-shell.tsx) — 236 lines. Sidebar + main area.
- [`dashboard/shell/nav.ts`](apps/web/src/components/dashboard/shell/nav.ts) — nav model. Three entries use `?view=join-requests`.
- Each subroute file (e.g., `members/page.tsx`) — 1-line wrapper around `renderDashboardRoute`.

## Architectural target

```
apps/web/app/dashboard/
├── layout.tsx                    — intl + shell wrapper (chrome stays)
├── page.tsx                      — Overview (was "Dashboard")
├── members/
│   ├── page.tsx                  — members list
│   └── join-requests/page.tsx    — replaces ?view=join-requests
├── plans/
│   ├── page.tsx                  — membership plans list
│   ├── coupons/page.tsx
│   ├── offers/page.tsx
│   └── referrals/page.tsx
├── payments/
│   ├── page.tsx
│   └── refunds/page.tsx
├── notifications/
│   ├── page.tsx                  — composer
│   ├── templates/page.tsx
│   └── history/page.tsx
├── attendance/
│   ├── page.tsx
│   └── qr-display/page.tsx
├── shop/
│   ├── page.tsx
│   └── orders/page.tsx
├── staff/page.tsx
├── branches/page.tsx
├── settings/page.tsx
├── public-profile/page.tsx
├── profile/page.tsx
├── billing/page.tsx
├── reports/page.tsx
├── audit/page.tsx
└── ai/page.tsx
```

The `[[...section]]` catch-all is **deleted**.

`renderDashboardRoute` is broken up: the shared bits (session loading, permission gate, layout chrome) move into `layout.tsx`. Each page does its own data fetching for its own scope.

`dashboard-operational-model.ts` `resolveMode()` is **deleted** — modes become route URLs, not strings.

`dashboard-operational-panel.tsx` is **split**: each `if (mode === "X")` branch becomes a top-level component imported by the matching page.

## Execution steps

### Step 1 — Hoist shared loader into `layout.tsx`

[`dashboard/layout.tsx`](apps/web/app/dashboard/layout.tsx) currently just sets up intl. Expand it to also:

1. Call `requireDashboardSession({ expectedHost: "dashboard" })`.
2. Check `hasOwnerDashboardAccess` / role-based redirects (current `dashboard-route.tsx` logic at lines 59–79).
3. Render `<DashboardShell>` chrome (sidebar + header + branch switcher).
4. `{children}` slot for the section content.

```tsx
// apps/web/app/dashboard/layout.tsx (rewritten)
import { redirect } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import enMessages from "../../messages/dashboard/en.json";
import hiMessages from "../../messages/dashboard/hi.json";
import { requireDashboardSession } from "@/lib/server-auth";
import { hasCoachAccess, hasDeskAccess, hasOwnerDashboardAccess } from "@/lib/auth-destinations";
import { DashboardChrome } from "@/components/dashboard-chrome";
import { getOrigins } from "@/lib/origins";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await requireDashboardSession({ expectedHost: "dashboard" });
  const origins = getOrigins();
  if (!session.activeOrgId) {
    redirect(session.user.isPlatformAdmin ? "/platform" : `${origins.public}/gyms`);
  }
  if (!session.user.isPlatformAdmin && !hasOwnerDashboardAccess(session)) {
    if (hasDeskAccess(session)) redirect("/desk?from=dashboard");
    if (hasCoachAccess(session)) redirect("/coach");
    redirect(`${origins.public}/gyms`);
  }

  const locale = session.user.preferredLocale === "hi" ? "hi" : "en";
  const messages = locale === "hi" ? hiMessages : enMessages;
  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="Asia/Kolkata">
      <DashboardChrome session={session}>
        {children}
      </DashboardChrome>
    </NextIntlClientProvider>
  );
}
```

`DashboardChrome` is a new component containing the sidebar, header, branch switcher, mobile menu — the persistent chrome currently in `DashboardShell`. Children render in the main content slot.

### Step 2 — Per-page permission gate

The current `sectionAccessPermissions` map in `dashboard-route.tsx:14` covers per-section permissions. After this plan, each page enforces its own gate. Create a helper:

```ts
// apps/web/src/lib/dashboard-guards.ts
import { redirect } from "next/navigation";
import type { AuthSessionSummary, Permission } from "@zook/core";

export function requirePermission(
  session: AuthSessionSummary,
  ...required: Permission[]
) {
  if (session.user.isPlatformAdmin) return;
  const have = new Set(session.activeOrganization?.permissions ?? []);
  if (!required.some((p) => have.has(p))) {
    redirect("/dashboard");
  }
}
```

Each page uses it:

```tsx
// apps/web/app/dashboard/members/page.tsx
import { requireDashboardSession } from "@/lib/server-auth";
import { requirePermission } from "@/lib/dashboard-guards";
import { MembersSection } from "@/components/dashboard/sections/members-section";
import { getMembersData } from "@/lib/dashboard-data";

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  const session = await requireDashboardSession({ expectedHost: "dashboard" });
  requirePermission(session, "MEMBERS_VIEW", "MEMBERS_MANAGE");
  const { branchId } = await searchParams;
  const data = await getMembersData(session.activeOrgId!, branchId);
  return <MembersSection data={data} />;
}
```

### Step 3 — Split data fetching by section

[`apps/web/src/lib/data.ts`](apps/web/src/lib/data.ts) `getDashboardData()` (246 lines) fetches a kitchen-sink object used by every section. Split it:

```
apps/web/src/lib/dashboard-data/
├── shared.ts        — getDashboardOverview(orgId, branchId)  (minimal context everyone needs)
├── members.ts       — getMembersData
├── plans.ts         — getPlansData
├── coupons.ts       — getCouponsData
├── offers.ts        — getOffersData
├── referrals.ts     — getReferralsData
├── payments.ts      — getPaymentsData
├── refunds.ts       — getRefundsData
├── notifications.ts — getNotificationsData (composer + recents)
├── templates.ts     — getTemplatesData
├── history.ts       — getHistoryData
├── attendance.ts    — getAttendanceData
├── shop.ts          — getShopData
├── shop-orders.ts   — getShopOrdersData
├── staff.ts         — getStaffData
├── branches.ts      — getBranchesData
├── settings.ts      — getSettingsData
├── public-profile.ts — getPublicProfileData
├── billing.ts       — getBillingData
├── reports.ts       — getReportsData
├── audit.ts         — getAuditData
└── ai.ts            — getAiData
```

Each function fetches **only what its page needs**. The catch-all `getDashboardData` keeps existing for back-compat during migration; plan #11 deletes it.

`getDashboardOverview` returns just the chrome data (org summary, branch list, badges). It's called by `layout.tsx` and consumed by `DashboardChrome`.

### Step 4 — Split `dashboard-operational-panel.tsx`

500-line file with `if (mode === "X") return <PanelX />` branches. Each branch already calls a section/panel component. Pull them out:

For each `mode` branch (members, plans, payments, etc.):
1. Find the JSX block at lines 175–500.
2. Create a dedicated wrapper if needed (e.g., `MembersSectionWrapper`) in `apps/web/src/components/dashboard/sections/`.
3. The new page file (Step 2) imports the wrapper directly.

After all branches are extracted, `dashboard-operational-panel.tsx` should be **deletable**. Mark it `@deprecated` and remove in plan #11.

### Step 5 — Delete the catch-all + section dispatcher

After every section has its own page route:

1. Delete `apps/web/app/dashboard/[[...section]]/page.tsx`.
2. Delete `apps/web/app/dashboard/dashboard-route.tsx` (replaced by `layout.tsx` + per-page guards).
3. Mark `resolveMode` and `DashboardMode` in [`dashboard-operational-model.ts`](apps/web/src/components/dashboard-operational-model.ts) `@deprecated`. Move any still-needed types/utilities elsewhere. Plan #11 deletes the file.

### Step 6 — Kill `?view=join-requests`

Three sites use this query param:
- [`nav.ts:42`](apps/web/src/components/dashboard/shell/nav.ts#L42) → change `href` to `/dashboard/members/join-requests`
- [`dashboard-overview.tsx:116, :172, :333`](apps/web/src/components/dashboard/shell/dashboard-overview.tsx#L116) → same change

Create `apps/web/app/dashboard/members/join-requests/page.tsx` that renders the join-requests view (extracted from `members-section.tsx`; the full members-section split happens in plan #06).

Back-compat: redirect `/dashboard/members?view=join-requests` → `/dashboard/members/join-requests`. Add at the top of `members/page.tsx`:

```tsx
const { view } = await searchParams;
if (view === "join-requests") redirect("/dashboard/members/join-requests");
```

Search for any other `?view=` usages: `git grep -nE "\?view=|view=" apps/web/app apps/web/src`. Migrate each.

### Step 7 — Sidebar nav uses real URLs only

Update [`nav.ts`](apps/web/src/components/dashboard/shell/nav.ts):
- All `href` values must be real route URLs (no `?view=`).
- Add nav entries for any subroute that should be visible (e.g., a sidebar item for the new `/dashboard/members/join-requests` if desired).

### Step 8 — Test deep-link behavior

For each section: visit the direct URL, verify the page renders without going through the catch-all. Verify the sidebar highlights the right item. Verify branch switcher persists branchId across navigations.

### Step 9 — Migrate `?branchId=` query param to a more structured place (optional)

`branchId` is shared across all sections — it's the chrome's responsibility. Today each page reads it from `searchParams`. After this plan, consider:
- Keep as query param (simpler) — DO THIS.
- Move to a cookie (cleaner URLs but invisible state).

Recommendation: keep as `?branchId=` for now. Each `getXxxData(orgId, branchId)` accepts it.

## Files created

- `apps/web/src/components/dashboard-chrome.tsx`
- `apps/web/src/lib/dashboard-guards.ts`
- `apps/web/src/lib/dashboard-data/{shared,members,plans,coupons,offers,referrals,payments,refunds,notifications,templates,history,attendance,shop,shop-orders,staff,branches,settings,public-profile,billing,reports,audit,ai}.ts`
- `apps/web/app/dashboard/page.tsx` (Overview — new home for `/dashboard`)
- `apps/web/app/dashboard/members/join-requests/page.tsx`

## Files modified

- `apps/web/app/dashboard/layout.tsx` (expanded)
- Every existing `apps/web/app/dashboard/*/page.tsx` (rewritten to fetch own data and render the section directly, no more `renderDashboardRoute`)
- `apps/web/src/components/dashboard/shell/nav.ts` (no `?view=`)
- `apps/web/src/components/dashboard/shell/dashboard-overview.tsx` (URL updates)
- `apps/web/src/components/dashboard-shell.tsx` (likely refactored or split into chrome)
- `apps/web/src/lib/data.ts` (`getDashboardData` `@deprecated`; new functions in `dashboard-data/`)

## Files deleted

- `apps/web/app/dashboard/[[...section]]/page.tsx`
- `apps/web/app/dashboard/dashboard-route.tsx`

Plan #11 deletes:
- `apps/web/src/components/dashboard-operational-panel.tsx`
- `apps/web/src/components/dashboard-operational-model.ts`
- Old `getDashboardData` after all callers migrate.

## UI/UX fixes shipped

- URL bar matches what the user sees: `/dashboard/members/join-requests` instead of `/dashboard/members?view=join-requests`
- Faster page loads — each section fetches only its own data
- Browser back button behaves predictably between sections
- Direct deep-linking works without going through dispatcher logic

## Acceptance criteria

- [ ] Every URL in `apps/web/src/components/dashboard/shell/nav.ts` is a real route (no `?view=`).
- [ ] `git grep -nE "\?view=" apps/web/app apps/web/src` returns nothing.
- [ ] `apps/web/app/dashboard/[[...section]]/page.tsx` does not exist.
- [ ] `apps/web/app/dashboard/dashboard-route.tsx` does not exist.
- [ ] Each dashboard subroute renders independently (verify by visiting each URL directly).
- [ ] Permission gate fires on each route — visiting `/dashboard/billing` as a user without `ORG_MANAGE_BILLING` redirects to `/dashboard`.
- [ ] Branch switcher (`?branchId=`) persists across navigation.
- [ ] Sidebar highlights the active section.
- [ ] `pnpm -w typecheck` clean.
- [ ] `pnpm -w test --filter @zook/web` clean.

## What this plan does NOT do

- Does not split big section files (members 894 lines, etc.) — that's plans #06/#07.
- Does not refactor `desk-panel.tsx` or `coach-command-panel.tsx` — plan #08.
- Does not delete `dashboard-operational-panel.tsx` (`@deprecated` only) — plan #11.
- Does not change permission strings.
