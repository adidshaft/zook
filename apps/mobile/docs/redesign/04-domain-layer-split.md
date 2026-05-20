# Plan 04 — Domain Layer Split

## Goal

Break the 1,583-line `apps/mobile/src/lib/query-hooks.ts` into per-domain modules. After this plan, each role's screens import only their own domain hooks. Tree-shaking improves; cognitive load drops; cache invalidation lives next to mutations instead of being spread across screens.

## Why

- One file with 50 exported hooks. No domain boundaries. Member, trainer, owner, reception, shop, attendance, plans, payments, notifications all mixed.
- Cache invalidations are ad-hoc per call site, often missing or duplicated.
- Plans #05/#06/#07 (routing rewrites) need clean domain entry points so each new subroute file imports only what it needs.

## Current state

- `apps/mobile/src/lib/query-hooks.ts` — 1,583 lines, 50 `export function use*` hooks.
- `apps/mobile/src/lib/domain-api.ts` already has the typed API surfaces: `memberApi`, `trainerApi`, `ownerApi`, `receptionApi`, `attendanceApi`, `plansApi`, `shopApi`, `gymApi`, `paymentsApi`, `notificationsApi`, `pushApi`, `privacyApi`, `aiApi`, `filesApi`, `trackingApi`, `authClient`. These stay as-is. This plan only splits the **hook layer** that sits above them.

## Architectural target

```
apps/mobile/src/lib/
├── domain-api.ts          (existing, unchanged)
├── api-client.tsx         (existing)
├── query-hooks.ts         (DELETED at end of plan)
└── domains/
    ├── index.ts           (barrel — for back-compat during migration)
    ├── shared/
    │   ├── keys.ts        (query key factory)
    │   └── invalidate.ts  (shared invalidation helpers)
    ├── member/
    │   ├── queries.ts
    │   ├── mutations.ts
    │   └── index.ts
    ├── trainer/
    ├── owner/
    ├── reception/
    ├── shop/
    ├── plans/
    ├── attendance/        (used by owner + reception)
    ├── notifications/
    ├── payments/          (used by owner + reception)
    ├── ai/
    ├── privacy/
    └── tracking/
```

## Categorization

Read `apps/mobile/src/lib/query-hooks.ts` end to end and place each hook into one of the domain buckets above. Apply these rules:

- If the hook calls `memberApi.*` → `domains/member/`
- If it calls `trainerApi.*` → `domains/trainer/`
- If it calls `ownerApi.*` → `domains/owner/`
- If it calls `receptionApi.*` → `domains/reception/`
- If it calls `attendanceApi.*` → `domains/attendance/`
- If it calls `plansApi.*` → `domains/plans/`
- If it calls `shopApi.*` → `domains/shop/`
- If it calls `paymentsApi.*` → `domains/payments/`
- If it calls `notificationsApi.*` → `domains/notifications/`
- If it calls `aiApi.*` → `domains/ai/`
- If it calls `privacyApi.*` → `domains/privacy/`
- If it calls `trackingApi.*` → `domains/tracking/`
- Hooks that span multiple domains (e.g., a "home" hook that hits member + plans + notifications) go to **the role that owns the screen** — usually `domains/member/`. Inside, they orchestrate by calling sub-domain hooks.

## Query keys

**File:** `apps/mobile/src/lib/domains/shared/keys.ts`

Centralized key factory. Today, keys are inline strings/arrays scattered in `query-hooks.ts`. Replace with:

```ts
export const queryKeys = {
  member: {
    home: () => ["member", "home"] as const,
    dashboard: () => ["member", "dashboard"] as const,
    membership: () => ["member", "membership"] as const,
    engagement: () => ["member", "engagement"] as const,
    profile: () => ["member", "profile"] as const,
  },
  trainer: {
    home: (orgId?: string) => ["trainer", "home", orgId] as const,
    clients: (orgId?: string) => ["trainer", "clients", orgId] as const,
    client: (clientId: string) => ["trainer", "client", clientId] as const,
    plans: (orgId?: string) => ["trainer", "plans", orgId] as const,
  },
  owner: {
    dashboard: (orgId?: string) => ["owner", "dashboard", orgId] as const,
    members: (orgId?: string, filter?: string) => ["owner", "members", orgId, filter] as const,
    approvals: (orgId?: string) => ["owner", "approvals", orgId] as const,
    revenue: (orgId?: string) => ["owner", "revenue", orgId] as const,
    stock: (orgId?: string) => ["owner", "stock", orgId] as const,
    member: (memberId: string) => ["owner", "member", memberId] as const,
  },
  reception: {
    queue: (orgId?: string) => ["reception", "queue", orgId] as const,
    members: (orgId?: string) => ["reception", "members", orgId] as const,
    payments: (orgId?: string) => ["reception", "payments", orgId] as const,
    orders: (orgId?: string) => ["reception", "orders", orgId] as const,
  },
  attendance: {
    pending: (orgId?: string) => ["attendance", "pending", orgId] as const,
    record: (id: string) => ["attendance", "record", id] as const,
  },
  plans: {
    list: () => ["plans", "list"] as const,
    detail: (assignmentId: string) => ["plans", "detail", assignmentId] as const,
  },
  shop: {
    catalog: (orgId?: string) => ["shop", "catalog", orgId] as const,
    cart: () => ["shop", "cart"] as const,
    orders: () => ["shop", "orders"] as const,
    order: (orderId: string) => ["shop", "order", orderId] as const,
  },
  notifications: {
    list: () => ["notifications", "list"] as const,
    detail: (id: string) => ["notifications", "detail", id] as const,
  },
  payments: {
    list: (orgId?: string) => ["payments", "list", orgId] as const,
  },
  ai: {
    draft: (clientId: string) => ["ai", "draft", clientId] as const,
  },
  privacy: {
    settings: () => ["privacy", "settings"] as const,
  },
  tracking: {
    history: () => ["tracking", "history"] as const,
    entry: (id: string) => ["tracking", "entry", id] as const,
  },
  gym: {
    profile: (username: string) => ["gym", "profile", username] as const,
  },
} as const;
```

## Invalidation helpers

**File:** `apps/mobile/src/lib/domains/shared/invalidate.ts`

```ts
import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "./keys";

export const invalidations = {
  member: {
    all: (qc: QueryClient) => qc.invalidateQueries({ queryKey: ["member"] }),
    home: (qc: QueryClient) => qc.invalidateQueries({ queryKey: queryKeys.member.home() }),
  },
  attendance: {
    all: (qc: QueryClient) => qc.invalidateQueries({ queryKey: ["attendance"] }),
    pending: (qc: QueryClient) =>
      qc.invalidateQueries({ queryKey: queryKeys.attendance.pending() }),
  },
  // ... etc for every domain
};
```

Mutations now use `invalidations.attendance.all(qc)` instead of inline `qc.invalidateQueries({...})`. This is the single source of truth for what gets invalidated when.

## Per-domain module pattern

Every `domains/<name>/queries.ts` follows:

```ts
import { useQuery } from "@tanstack/react-query";
import { memberApi } from "@/lib/domain-api";
import { queryKeys } from "@/lib/domains/shared/keys";

export function useMemberHome() {
  return useQuery({
    queryKey: queryKeys.member.home(),
    queryFn: () => memberApi.home(),
    staleTime: 30_000,
  });
}
```

Every `domains/<name>/mutations.ts` follows:

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { attendanceApi } from "@/lib/domain-api";
import { invalidations } from "@/lib/domains/shared/invalidate";

export function useApproveAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (recordId: string) => attendanceApi.approve(recordId),
    onSuccess: () => {
      invalidations.attendance.all(qc);
      invalidations.reception.queue(qc);
    },
  });
}
```

Every `domains/<name>/index.ts` re-exports everything:

```ts
export * from "./queries";
export * from "./mutations";
```

## Execution steps

### Step 1 — Create skeleton

Create the folder structure and `shared/{keys,invalidate}.ts` files. Empty `index.ts` files in each domain folder.

### Step 2 — Migrate one domain end-to-end as the template

Pick **`attendance`** first. It's used by both owner and reception, and has clear API boundaries.

1. Identify all hooks in `query-hooks.ts` that call `attendanceApi.*`.
2. Move them to `domains/attendance/queries.ts` and `domains/attendance/mutations.ts`, rewriting to use `queryKeys.attendance.*` and `invalidations.attendance.*`.
3. In `query-hooks.ts`, replace the old definitions with re-exports from `domains/attendance`:
   ```ts
   export { useOrgAttendancePending, useApproveAttendance } from "@/lib/domains/attendance";
   ```
4. Run typecheck and tests. Existing imports `useOrgAttendancePending from "@/lib/query-hooks"` keep working.

### Step 3 — Migrate remaining domains

In this order (lowest coupling first):

1. `notifications`
2. `tracking`
3. `payments`
4. `plans`
5. `shop`
6. `ai`
7. `privacy`
8. `member`
9. `trainer`
10. `owner`
11. `reception`
12. `gym`

For each: same recipe — move definitions to `domains/<name>/`, leave a re-export shim in `query-hooks.ts`.

### Step 4 — Switch screen imports

When a screen is touched by another plan (or as part of this plan if time permits), change its import from:

```ts
import { useMemberHome } from "@/lib/query-hooks";
```

to:

```ts
import { useMemberHome } from "@/lib/domains/member";
```

This is opportunistic — plans #05/#06/#07 will do it for role screens. This plan doesn't need to touch every screen.

### Step 5 — Audit & delete duplicates

Some hooks in `query-hooks.ts` may have near-duplicates with slightly different keys or invalidation behavior. While migrating, consolidate to a single canonical hook per concept. If you find ambiguity, leave a `TODO(domains-cleanup):` comment and resolve in plan #11.

### Step 6 — Final `query-hooks.ts` shape

After all domains migrate, `query-hooks.ts` becomes a single barrel of re-exports:

```ts
// apps/mobile/src/lib/query-hooks.ts
// @deprecated — re-exports kept for back-compat. New code: import from @/lib/domains/<name>.
export * from "./domains/member";
export * from "./domains/trainer";
export * from "./domains/owner";
export * from "./domains/reception";
export * from "./domains/attendance";
export * from "./domains/plans";
export * from "./domains/shop";
export * from "./domains/payments";
export * from "./domains/notifications";
export * from "./domains/ai";
export * from "./domains/privacy";
export * from "./domains/tracking";
export * from "./domains/gym";
```

Final size: < 30 lines. Plan #11 deletes this file once all screen imports have moved.

## Files created

- `apps/mobile/src/lib/domains/index.ts`
- `apps/mobile/src/lib/domains/shared/keys.ts`
- `apps/mobile/src/lib/domains/shared/invalidate.ts`
- `apps/mobile/src/lib/domains/<name>/{queries,mutations,index}.ts` × 13 domains

## Files modified

- `apps/mobile/src/lib/query-hooks.ts` (collapses to a barrel)

## Files deleted

None in this plan. The file is finally deleted in plan #11.

## UI fixes shipped with this plan

None directly visible. This is a pure refactor. Downstream UX improvement: cleaner invalidation = fewer "I changed something and the list didn't update" bugs.

## Acceptance criteria

- [ ] `apps/mobile/src/lib/domains/` exists with all 13 domain folders + `shared/`.
- [ ] `apps/mobile/src/lib/query-hooks.ts` is now a barrel of re-exports, < 30 lines.
- [ ] Every existing `import { useX } from "@/lib/query-hooks"` still compiles and behaves identically.
- [ ] No domain folder imports from another domain folder (except `shared/`). Cross-domain orchestration happens at the screen level.
- [ ] `git grep "queryKey:" apps/mobile/src/lib/domains` shows **all** query keys come from `queryKeys.*` factory; no inline strings.
- [ ] All mutations use `invalidations.*` helpers; no inline `qc.invalidateQueries` calls except inside `shared/invalidate.ts`.
- [ ] `pnpm -w typecheck` clean.
- [ ] `pnpm -w test --filter @zook/mobile` clean.

## What this plan does NOT do

- Does not change cache lifetimes, retry behavior, or any query semantics — pure rearrangement.
- Does not delete duplicates aggressively — flag with `TODO(domains-cleanup)` and resolve in plan #11.
- Does not introduce optimistic updates or new patterns — that's separate work.
- Does not change `domain-api.ts` at all.
