# Plan 06 — Members Section Split

## Goal

Split the 894-line [`members-section.tsx`](apps/web/src/components/dashboard/sections/members-section.tsx) into focused, composable pieces. Build a shared `MemberList` component used across all member-list use cases (Members tab, Join Requests, future cohort filters). Make the join-requests sub-view a real route owned by its own component.

## Why

- One file does Members list, Join Requests view, search, filter, bulk actions, plus the member detail drawer. At 894 lines, it's the largest dashboard section.
- After plan #05 made `/dashboard/members/join-requests` a real route, the join-requests content still needs to live in its own component.
- The MemberList pattern duplicates across Reception (mobile), Trainer (mobile), Owner (mobile), and Dashboard (web). Plan #08 of the mobile redesign extracts a mobile MemberList; this plan does the web equivalent and aligns the shape.

## Prerequisites

- Plan #05 (dashboard route flattening).

## Current state

- [`members-section.tsx`](apps/web/src/components/dashboard/sections/members-section.tsx) — 894 lines. Top-level component receives `data` from the section loader.
- Sub-folder `apps/web/src/components/dashboard/sections/members/` exists — verify what's in it; consolidate.

## Architectural target

```
apps/web/src/components/dashboard/members/
├── members-page.tsx            — top-level for /dashboard/members
├── join-requests-page.tsx      — top-level for /dashboard/members/join-requests
├── member-detail-drawer.tsx    — extracted from the mega-file
├── member-list/
│   ├── index.tsx               — <MemberList ... />
│   ├── row.tsx                 — single row
│   ├── filters.tsx             — search + filter chips + bulk actions toolbar
│   ├── empty-state.tsx
│   └── types.ts
├── bulk-actions/
│   ├── index.tsx               — multi-select state + action bar
│   └── actions.ts              — each action's implementation
└── join-requests/
    ├── card.tsx                — single join request card
    └── empty-state.tsx
```

`MemberList` is the canonical member-list component, used by:
- `/dashboard/members` — paginated full list
- `/dashboard/members/join-requests` (rendering with a different shape — actually a different component since join requests aren't members yet)
- (Future) Cohort views, branch filters

## MemberList contract

```ts
export type DashboardMember = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  status: "active" | "expiring" | "expired" | "pending";
  joinedAt: string;            // ISO
  expiresAt?: string | null;
  plan?: { id: string; name: string } | null;
  branch?: { id: string; name: string } | null;
  badges?: Array<{ label: string; tone: "neutral" | "accent" | "warning" | "danger" }>;
};

export type MemberListColumn =
  | "name"
  | "plan"
  | "branch"
  | "status"
  | "joinedAt"
  | "expiresAt"
  | "actions";

export type MemberListProps = {
  members: DashboardMember[];
  columns?: MemberListColumn[];          // default: all
  search: string;
  onSearchChange: (v: string) => void;
  statusFilter: "all" | DashboardMember["status"];
  onStatusFilterChange: (v: MemberListProps["statusFilter"]) => void;
  branchFilter?: string | null;
  onBranchFilterChange?: (v: string | null) => void;
  branchOptions?: Array<{ id: string; name: string }>;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
  onRowClick: (member: DashboardMember) => void;
  isLoading?: boolean;
  hasNextPage?: boolean;
  onLoadMore?: () => void;
  emptyState?: { title: string; subtitle?: string };
  testID?: string;
};
```

## Execution steps

### Step 1 — Audit and extract helpers

Read `members-section.tsx` end-to-end. Identify:
- Constants (filter options, column definitions, status labels)
- Pure helpers (formatting, sort, filter functions)
- Sub-components (row, drawer, filter bar, bulk action menu, empty state, etc.)

Move each into its appropriate target file.

### Step 2 — Build `MemberList`

Create `apps/web/src/components/dashboard/members/member-list/` per architectural target. Pure presentational; takes data and callbacks as props.

Include skeleton loading state, error state with retry, empty state.

Use semantic CSS vars (per plan #04) — no `var(--zook-*)`.

### Step 3 — Build `bulk-actions`

Extract the bulk-action multi-select toolbar. Selection state lives in the parent page; the toolbar is a controlled component.

`bulk-actions/actions.ts` exports each action with its permission requirement and the mutation/server-action it calls. The toolbar shows only actions the user has permission for.

### Step 4 — Build `member-detail-drawer.tsx`

Extract the detail-view portion (member info, recent attendance, payment history, edit actions).

### Step 5 — `apps/web/app/dashboard/members/page.tsx`

Rewrite to use the new components:

```tsx
import { requireDashboardSession } from "@/lib/server-auth";
import { requirePermission } from "@/lib/dashboard-guards";
import { getMembersData } from "@/lib/dashboard-data/members";
import { MembersPage } from "@/components/dashboard/members/members-page";

export default async function MembersRoute({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string; search?: string; status?: string; cursor?: string; view?: string }>;
}) {
  const session = await requireDashboardSession({ expectedHost: "dashboard" });
  requirePermission(session, "MEMBERS_VIEW", "MEMBERS_MANAGE");
  const params = await searchParams;
  if (params.view === "join-requests") {
    redirect("/dashboard/members/join-requests");
  }
  const data = await getMembersData(session.activeOrgId!, {
    branchId: params.branchId,
    search: params.search,
    status: params.status,
    cursor: params.cursor,
  });
  return <MembersPage initial={data} />;
}
```

`MembersPage` is a client component that:
- Owns search/filter state (URL-synced via `useRouter` + searchParams)
- Renders `<MemberList />`
- Renders `<MemberDetailDrawer />` when a row is clicked
- Renders bulk-action toolbar

Target: `members-page.tsx` under 250 lines.

### Step 6 — `apps/web/app/dashboard/members/join-requests/page.tsx`

```tsx
import { requireDashboardSession } from "@/lib/server-auth";
import { requirePermission } from "@/lib/dashboard-guards";
import { getJoinRequestsData } from "@/lib/dashboard-data/members";
import { JoinRequestsPage } from "@/components/dashboard/members/join-requests-page";

export default async function JoinRequestsRoute({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  const session = await requireDashboardSession({ expectedHost: "dashboard" });
  requirePermission(session, "MEMBERS_VIEW", "MEMBERS_MANAGE");
  const { branchId } = await searchParams;
  const data = await getJoinRequestsData(session.activeOrgId!, branchId);
  return <JoinRequestsPage initial={data} />;
}
```

`JoinRequestsPage` uses `JoinRequestCard` for each pending request. Approve/reject actions call server actions.

### Step 7 — URL state sync

Search, filter, pagination cursor should reflect in the URL so refresh preserves state and links are shareable. Use `useRouter().replace(...)` with shallow updates.

Example with Next 15 patterns:

```tsx
const router = useRouter();
const pathname = usePathname();
const searchParams = useSearchParams();
const setSearch = (value: string) => {
  const params = new URLSearchParams(searchParams);
  if (value) params.set("search", value); else params.delete("search");
  router.replace(`${pathname}?${params.toString()}`);
};
```

### Step 8 — Pagination

If members list pagination uses offset/cursor, ensure load-more updates URL with `?cursor=...`. Falls through cleanly on direct deep-link.

### Step 9 — Migrate any remaining `?view=` callers

After plan #05 cleared the main offenders, sweep again:

```
git grep -nE "view=join-requests|\?view=" apps/web
```

Should be zero.

### Step 10 — Theme migration

Every component touched in this plan must use semantic CSS vars (per plan #04). Replace any `var(--zook-text)` with `var(--text-primary)`, etc.

## Files created

- `apps/web/src/components/dashboard/members/members-page.tsx`
- `apps/web/src/components/dashboard/members/join-requests-page.tsx`
- `apps/web/src/components/dashboard/members/member-detail-drawer.tsx`
- `apps/web/src/components/dashboard/members/member-list/{index,row,filters,empty-state,types}.tsx`
- `apps/web/src/components/dashboard/members/bulk-actions/{index,actions}.ts(x)`
- `apps/web/src/components/dashboard/members/join-requests/{card,empty-state}.tsx`
- `apps/web/app/dashboard/members/join-requests/page.tsx` (from plan #05; rewrite to consume new components)

## Files modified

- `apps/web/app/dashboard/members/page.tsx`
- `apps/web/src/lib/dashboard-data/members.ts` (split `getMembersData` and `getJoinRequestsData`)

## Files deleted

- `apps/web/src/components/dashboard/sections/members-section.tsx` (894 lines — gone)
- The existing `apps/web/src/components/dashboard/sections/members/` subfolder contents migrate into the new home; once empty, delete the folder.

## UI/UX fixes shipped

- URL reflects filter + search state — shareable, deep-linkable
- Faster list rendering — Member rows are pure, drawer is lazy
- Join Requests is a real route, with its own pending count, its own loader, its own permission gate
- Bulk action toolbar shows only permitted actions
- Member list looks identical across all places it appears (after MemberList is shared)

## Acceptance criteria

- [ ] `/dashboard/members` renders MemberList with search + filter.
- [ ] Typing in search updates `?search=...` in the URL after a debounce.
- [ ] Selecting status filter updates `?status=...`.
- [ ] Old `/dashboard/members?view=join-requests` redirects to `/dashboard/members/join-requests`.
- [ ] Tapping a member opens the detail drawer; closing it preserves filter state.
- [ ] Bulk action: select multiple, perform action, list updates.
- [ ] No file in `apps/web/src/components/dashboard/members/` exceeds 300 lines.
- [ ] `apps/web/src/components/dashboard/sections/members-section.tsx` does not exist.
- [ ] `pnpm -w typecheck` clean.
- [ ] `pnpm -w test --filter @zook/web` clean.

## What this plan does NOT do

- Does not change the shape of the underlying members API.
- Does not introduce new member-management features.
- Does not touch the mobile member list (separate redesign).
