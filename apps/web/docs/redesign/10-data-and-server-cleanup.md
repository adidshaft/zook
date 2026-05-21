# Plan 10 — Data Layer & Server Cleanup

## Goal

Split the 800-line [`read-models.ts`](apps/web/src/server/read-models.ts) into domain modules. Replace the catch-all `getDashboardData()` (and any remaining callers) with the focused per-domain loaders created in plan #05. Tidy the small `query-hooks.ts` and shared `data.ts` so each web-side hook/loader has a clear domain home.

## Why

- [`read-models.ts`](apps/web/src/server/read-models.ts) (800 lines) is the server-side counterpart to the mobile `query-hooks.ts` (1,583 lines): a single file mixing every domain's read shape. Splitting it gives clean ownership and makes it obvious which API powers which UI surface.
- After plan #05 introduced `apps/web/src/lib/dashboard-data/*.ts` modules, the underlying read functions still live in one file. Move them into matching domain folders so each subsystem owns its own server code.
- [`api-router.ts`](apps/web/src/server/api-router.ts) is 2 lines (probably a re-export); verify and adjust.
- The 91-line [`query-hooks.ts`](apps/web/src/lib/query-hooks.ts) is a client-side hooks file. Smaller than mobile's — verify what it does and split per-domain if multiple domains share it.

## Prerequisites

- Plans #05, #06, #07, #08 merged (so all callers reach into the right per-domain modules).

## Current state

- [`apps/web/src/server/read-models.ts`](apps/web/src/server/read-models.ts) — 800 lines. Exports many functions presumably covering members, plans, payments, shop, attendance, notifications, reports, etc.
- [`apps/web/src/lib/data.ts`](apps/web/src/lib/data.ts) — 246 lines. `getDashboardData(orgId, branchId)` and helpers.
- [`apps/web/src/lib/query-hooks.ts`](apps/web/src/lib/query-hooks.ts) — 91 lines, ~11 hooks.
- [`apps/web/src/lib/dashboard-data/`](apps/web/src/lib/dashboard-data/) — created in plan #05; per-domain loaders.
- [`apps/web/src/server/api-router/`](apps/web/src/server/api-router/) — subfolder with router pieces.

## Architectural target

```
apps/web/src/server/
├── domains/
│   ├── members/
│   │   ├── read-models.ts
│   │   └── types.ts
│   ├── plans/
│   ├── coupons/
│   ├── offers/
│   ├── referrals/
│   ├── payments/
│   ├── refunds/
│   ├── notifications/
│   ├── templates/
│   ├── history/                — notification send history
│   ├── attendance/
│   ├── shop/
│   ├── shop-orders/
│   ├── staff/
│   ├── branches/
│   ├── settings/
│   ├── public-profile/
│   ├── billing/
│   ├── reports/
│   ├── audit/
│   ├── ai/
│   ├── overview/               — dashboard chrome data (orgs + counts)
│   ├── members/desk-queue.ts   — receptionist-specific reads
│   └── shared/
│       ├── org-context.ts      — common org+branch resolution
│       └── filters.ts          — pagination/search/filter parsing
├── api-router/                 — existing; references new domain modules
├── api-router.ts
├── session.ts, context.ts, access.ts (existing; unchanged)
└── ...

apps/web/src/lib/
├── dashboard-data/             — existing per-domain loaders that call into domains/*
├── api-client.ts               — HTTP client
├── query-hooks/
│   ├── members.ts
│   ├── notifications.ts
│   ├── ...
│   └── index.ts                — barrel
└── format.ts, ...
```

## Execution steps

### Step 1 — Inventory `read-models.ts`

Read the 800-line file end-to-end. List every exported function and group by domain:

```bash
grep -nE "^export (async )?function" apps/web/src/server/read-models.ts
```

Output a table mapping each function to its target domain. Save as a TODO comment at the top of the file during the migration.

### Step 2 — Build skeleton

Create `apps/web/src/server/domains/` and all subfolders per the architectural target. Each folder has `index.ts` (barrel) and `types.ts` (domain-specific types).

Create `apps/web/src/server/domains/shared/`:

- `org-context.ts`: helper that resolves `(session) → { orgId, branchId, permissions }` for use by every loader.
- `filters.ts`: helpers for parsing pagination/search/status from searchParams.

### Step 3 — Migrate one domain end-to-end as template

Start with **members**:

1. Move all member-related functions from `read-models.ts` into `apps/web/src/server/domains/members/read-models.ts`.
2. Member-specific types → `domains/members/types.ts`.
3. Update `apps/web/src/lib/dashboard-data/members.ts` to import from `@/server/domains/members`.
4. In `apps/web/src/server/read-models.ts`, replace the moved functions with re-exports (back-compat):
   ```ts
   export { getMembersList, getJoinRequestsList } from "@/server/domains/members";
   ```
5. Run typecheck + tests. Existing callers keep working.

### Step 4 — Migrate remaining domains

In this order:

1. attendance
2. notifications (+ templates + history)
3. payments (+ refunds)
4. shop (+ shop-orders)
5. plans (+ coupons + offers + referrals)
6. staff
7. branches
8. settings (+ public-profile)
9. billing
10. reports
11. audit
12. ai
13. overview (the dashboard-chrome data)

For each: same recipe.

### Step 5 — Update `api-router/`

After domains move, [`apps/web/src/server/api-router/`](apps/web/src/server/api-router/) handlers that import from `@/server/read-models` should be updated to import from the appropriate domain. Use `git grep -nE 'from "@/server/read-models"' apps/web/src/server/api-router` to find callers.

If a handler spans multiple domains, prefer importing each function directly rather than from a meta-barrel.

### Step 6 — `data.ts` cleanup

[`apps/web/src/lib/data.ts`](apps/web/src/lib/data.ts) `getDashboardData()` is the catch-all. After plans #05/#06/#07/#08 land, **no caller should use it**. Verify:

```bash
git grep -nE 'getDashboardData' apps/web
```

Should only find the function definition and its (now obsolete) re-exports. If a caller remains, migrate it to the focused per-domain loader.

Then mark `getDashboardData` `@deprecated`. Plan #11 deletes the function and the rest of `data.ts` once everything is migrated.

### Step 7 — `query-hooks.ts` split

Read [`apps/web/src/lib/query-hooks.ts`](apps/web/src/lib/query-hooks.ts) (91 lines). For each hook, place it in `apps/web/src/lib/query-hooks/<domain>/index.ts`. Leave a barrel:

```ts
// apps/web/src/lib/query-hooks.ts  (becomes a barrel)
// @deprecated — import from @/lib/query-hooks/<domain> directly
export * from "./query-hooks/members";
export * from "./query-hooks/payments";
// ...
```

Plan #11 deletes the barrel.

### Step 8 — Final `read-models.ts`

After all domains move, `read-models.ts` should be a thin re-export barrel:

```ts
// apps/web/src/server/read-models.ts
// @deprecated — import directly from @/server/domains/<domain>
export * from "./domains/members";
export * from "./domains/plans";
// ...etc
```

Final size: ~30 lines.

### Step 9 — Audit duplicate logic

While moving functions, you may notice two similar reads (e.g., a member list and a join-request list that overlap). Don't merge them in this plan — leave a `TODO(domains-cleanup)` comment and resolve in plan #11.

### Step 10 — Test coverage

Existing tests in `apps/web/src/server/` (e.g., `read-models` tests if present) — move with the code or keep references via the back-compat barrel. Verify all tests still pass.

## Files created

- `apps/web/src/server/domains/<each-domain>/{read-models,types,index}.ts`
- `apps/web/src/server/domains/shared/{org-context,filters}.ts`
- `apps/web/src/lib/query-hooks/<each-domain>/index.ts`

## Files modified

- `apps/web/src/server/read-models.ts` (collapses to barrel)
- `apps/web/src/lib/query-hooks.ts` (collapses to barrel)
- `apps/web/src/lib/data.ts` (`getDashboardData` `@deprecated`)
- `apps/web/src/lib/dashboard-data/*.ts` (imports updated to point at domains)
- `apps/web/src/server/api-router/**/*.ts` (imports updated)

## Files deleted

None in this plan. Plan #11 deletes the barrel re-exports and `data.ts`/`getDashboardData`.

## UI/UX fixes shipped

None directly visible. This is a pure server refactor. Downstream wins:
- Better tree-shaking → faster cold builds
- Domain ownership clearer for new contributors
- Easier to find "where does this data come from"

## Acceptance criteria

- [ ] `apps/web/src/server/domains/` exists with all 23 domain folders + `shared/`.
- [ ] `apps/web/src/server/read-models.ts` is now a barrel of re-exports, < 50 lines.
- [ ] `apps/web/src/lib/query-hooks.ts` is now a barrel.
- [ ] Every existing import compiles unchanged via back-compat barrels.
- [ ] No domain folder imports from another domain folder (cross-domain orchestration happens at the route/loader level).
- [ ] `getDashboardData()` has no callers outside its own definition (verify with `git grep`).
- [ ] `pnpm -w typecheck` clean.
- [ ] `pnpm -w test --filter @zook/web` clean.

## What this plan does NOT do

- Does not change any read semantics (filter, sort, join shapes preserved).
- Does not introduce new APIs or routes.
- Does not change Prisma schema.
- Does not touch `apps/web/src/server/api-router/` business logic — only import paths.
