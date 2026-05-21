# Plan 11 — Kill List & Final Cleanup

## Goal

Retire the deprecated code paths, delete back-compat barrels, finish the theme migration across every component, and confirm no `?view=` query routing, no section-dispatch dead code, and no token shim remains.

## Why

The strangler-fig migration left every prior plan's deprecated code in place. After all prior plans land, the cleanup is mechanical but important — the codebase shouldn't carry "dead but compiled" code into the next development cycle.

## Prerequisites

- All plans #01 through #10 merged.

## Execution steps

### Step 1 — Audit progress

Run:

```bash
# Mega-files should be gone
test ! -f apps/web/src/components/desk-panel.tsx && echo "OK: desk-panel.tsx gone"
test ! -f apps/web/src/components/dashboard-operational-panel.tsx || echo "FAIL: dashboard-operational-panel.tsx still exists"
test ! -f apps/web/src/components/dashboard-operational-model.ts || echo "FAIL: dashboard-operational-model.ts still exists"
test ! -f apps/web/src/components/dashboard/sections/members-section.tsx || echo "FAIL: members-section.tsx still exists"
test ! -f apps/web/src/components/dashboard/sections/shop-section.tsx || echo "FAIL: shop-section.tsx still exists"

# No more ?view= patterns
git grep -nE "\?view=" apps/web && echo "FAIL: ?view= remains"

# Catch-all route gone
test ! -f "apps/web/app/dashboard/[[...section]]/page.tsx" && echo "OK: catch-all gone"

# Back-compat barrels are minimal
wc -l apps/web/src/server/read-models.ts apps/web/src/lib/query-hooks.ts apps/web/src/lib/data.ts
```

Any FAIL must be addressed before continuing.

### Step 2 — Delete dashboard catch-all + dispatcher

If not already done:

```bash
git rm -rf apps/web/app/dashboard/[[...section]]
git rm apps/web/app/dashboard/dashboard-route.tsx
git rm apps/web/src/components/dashboard-operational-panel.tsx
git rm apps/web/src/components/dashboard-operational-panel-shell.tsx
git rm apps/web/src/components/dashboard-operational-model.ts
git rm apps/web/src/components/dashboard-shell.tsx  # only if fully replaced by dashboard-chrome
```

### Step 3 — Delete `data.ts` / barrels

`apps/web/src/lib/data.ts`:
- If `getDashboardData` has no callers (verify: `git grep -nE 'getDashboardData' apps/web`), delete the function.
- Keep the file only if other helpers in it are still used; otherwise delete the file.

`apps/web/src/lib/query-hooks.ts`:
- All callers now import from `apps/web/src/lib/query-hooks/<domain>/index.ts`.
- Verify: `git grep -nE 'from "@/lib/query-hooks"' apps/web`.
- Delete the file if empty (just a barrel).

`apps/web/src/server/read-models.ts`:
- All callers import from `@/server/domains/<domain>`.
- Verify: `git grep -nE 'from "@/server/read-models"' apps/web`.
- Delete the file if empty.

### Step 4 — Theme migration mop-up

Find remaining static `--zook-*` CSS variable references:

```bash
git grep -nE "var\(--zook-[a-z]" apps/web/app apps/web/src
```

For each:
- Replace with the matching semantic var per the mapping in plan #04.
- `var(--zook-text)` → `var(--text-primary)`
- `var(--zook-muted)` → `var(--text-secondary)`
- `var(--zook-subtle)` → `var(--text-tertiary)`
- `var(--zook-bg)` / `var(--zook-graphite-950)` → `var(--bg)`
- `var(--zook-glass)` → `var(--surface)`
- `var(--zook-glass-strong)` → `var(--surface-raised)`
- `var(--zook-border)` → `var(--border)`
- `var(--zook-border-strong)` → `var(--border-strong)`
- `var(--zook-lime)` → `var(--accent)`
- `var(--zook-lime-soft)` → `var(--accent-soft)`
- `var(--zook-lime-deep)` → `var(--accent-strong)`
- `var(--zook-lime-dim)` → `var(--surface-accent-soft)`
- `var(--zook-lime-border)` → `var(--border-focus)`
- `var(--zook-warning)`, `var(--zook-amber)` → `var(--feedback-warning)`
- `var(--zook-danger)`, `var(--zook-red)` → `var(--feedback-danger)`
- `var(--zook-blue)` → `var(--feedback-info)`

### Step 5 — Delete the back-compat token shim

Once `git grep "var\(--zook-" apps/web` is empty, delete the back-compat shim at the bottom of `packages/ui/src/tokens.css`. The semantic vars stand alone.

### Step 6 — Old nav components

If [`apps/web/src/components/public-nav.tsx`](apps/web/src/components/public-nav.tsx) and [`apps/web/src/components/account-aware-public-nav.tsx`](apps/web/src/components/account-aware-public-nav.tsx) were replaced by `apps/web/src/components/public/nav/*` (plan #09), and no remaining caller imports the old paths, delete them.

```bash
git grep -nE 'from "@/components/(public-nav|account-aware-public-nav)"' apps/web
```

### Step 7 — Decide on small old components

These existed before the redesign and may be redundant after section splits:

- `apps/web/src/components/checkout-panel.tsx` — verify still used by `/checkout/*` routes
- `apps/web/src/components/razorpay-checkout-panel.tsx` — likely still used
- `apps/web/src/components/notification-composer-panel.tsx` — should now live under `dashboard/notifications/`
- `apps/web/src/components/owner-customisation-panel.tsx` — review usage
- `apps/web/src/components/trainer-customisation-panel.tsx` — likely consumed by coach routes
- `apps/web/src/components/staff-invite-panel.tsx` — used by `/staff/invite`
- `apps/web/src/components/start-gym-panel.tsx` — used by `/start-gym`
- `apps/web/src/components/login-panel.tsx` — used by `/login`
- `apps/web/src/components/gym-profile-fields.tsx`, `gym-profile-setup-panel.tsx` — consumed where?
- `apps/web/src/components/public-gym-actions.tsx`, `join-checkout-button.tsx`, `join-request-controls.tsx` — verify

For each: confirm callers; move into the right domain folder if still used. Delete if not.

### Step 8 — Old `auth-destinations.ts` exports

Plan #02 introduced `resolvePostLoginDestination` and likely kept `resolvePostLoginPath` as `@deprecated`. If no callers remain, delete the deprecated function.

### Step 9 — `dashboard-route.tsx` helpers

Already deleted in Step 2 if all callers gone. Verify.

### Step 10 — Sweep `@deprecated`

```bash
git grep -nE "@deprecated" apps/web/src apps/web/app
```

For each, confirm no callers and delete the export.

### Step 11 — Sweep unused exports

```bash
npx ts-unused-exports apps/web/tsconfig.json --excludePathsFromReport='node_modules;.next;dist;\.test\.ts'
```

Address every unused export. Some may be:
- Real dead code → delete
- Reserved for stories / future use → annotate with `// keep:` comment

### Step 12 — Final audit checklist

All must return empty:

```bash
# No ?view= routing
git grep -nE "\?view=" apps/web

# No section dispatcher
git grep -nE "resolveMode\b" apps/web/src apps/web/app
git grep -nE "DashboardMode\b" apps/web/src apps/web/app

# No back-compat barrels
test ! -f apps/web/src/server/read-models.ts || (echo "still exists"; grep -c "" apps/web/src/server/read-models.ts)
test ! -f apps/web/src/lib/query-hooks.ts || echo "still exists"

# No --zook-* token references
git grep -nE "var\(--zook-" apps/web

# No @deprecated annotations
git grep -nE "@deprecated" apps/web/src apps/web/app

# No mega-files
for f in $(find apps/web/app apps/web/src -name "*.tsx" -not -path "*/node_modules/*"); do
  lines=$(wc -l < "$f")
  if [ "$lines" -gt 400 ]; then echo "$f: $lines lines (over budget)"; fi
done
```

### Step 13 — Final smoke

For each role, verify the end-to-end flow on the live dev server:

- Owner: login on `dashboard.zookfit.in` → dashboard → navigate all sidebar items → back to dashboard
- Admin: same
- Receptionist: login → desk → all tabs work → QR display works
- Trainer: login → coach → roster renders
- Member: login → `zookfit.in/m/<slug>` renders
- Logged-out: `zookfit.in/` shows public homepage; `dashboard.zookfit.in/` redirects to login

Test in both light and dark themes. Toggle via user menu.

## Files deleted

- `apps/web/src/components/dashboard-operational-panel.tsx`
- `apps/web/src/components/dashboard-operational-panel-shell.tsx`
- `apps/web/src/components/dashboard-operational-model.ts`
- `apps/web/src/components/dashboard-shell.tsx` (if fully replaced)
- `apps/web/src/components/desk-panel.tsx`
- `apps/web/src/components/coach-command-panel.tsx`
- `apps/web/src/components/dashboard/sections/members-section.tsx` (if not already)
- `apps/web/src/components/dashboard/sections/shop-section.tsx` (if not already)
- `apps/web/src/components/dashboard/sections/shop-orders-section.tsx`
- `apps/web/src/components/dashboard/sections/plans-section.tsx`
- `apps/web/src/components/dashboard/sections/plan-growth-sections.tsx`
- `apps/web/src/components/dashboard/read-only/payments-panel.tsx`
- `apps/web/src/components/dashboard/read-only/shop-order-payment-control.tsx`
- `apps/web/src/components/dashboard/read-only/payments-utils.ts` (if unused)
- `apps/web/app/dashboard/[[...section]]/page.tsx`
- `apps/web/app/dashboard/dashboard-route.tsx`
- `apps/web/src/components/public-nav.tsx`
- `apps/web/src/components/account-aware-public-nav.tsx`
- `apps/web/src/server/read-models.ts` (if empty)
- `apps/web/src/lib/query-hooks.ts` (if empty)
- `apps/web/src/lib/data.ts` (if empty)
- The back-compat shim block in `packages/ui/src/tokens.css`

## Files created

None.

## Files modified

- Many — every component that referenced `--zook-*` vars gets migrated.
- `packages/ui/src/tokens.css` (shim removed)
- `apps/web/src/components/dashboard/shell/nav.ts` (any final URL cleanup)

## UI/UX fixes shipped

- Final theme-reactive coverage across every screen
- No more dead code paths to confuse developers
- Bundle size: production build smaller than baseline
- No more `?view=` URLs anywhere

## Acceptance criteria

- [ ] All commands in Step 12 audit return empty (or only intentional carve-outs).
- [ ] No file in `apps/web/app/` exceeds 250 lines (page files should be thin).
- [ ] No file in `apps/web/src/components/` exceeds 400 lines (use sub-components instead).
- [ ] Both themes fully tested across all roles.
- [ ] Bundle size measurement: `pnpm --filter @zook/web build` → `apps/web/.next/analyze/*` smaller than the pre-redesign baseline (record both).
- [ ] All redirects still work: `zookfit.in/dashboard` → `dashboard.zookfit.in/dashboard`, `/me` → `/m/<slug>`, `/dashboard/members?view=join-requests` → `/dashboard/members/join-requests`.
- [ ] `pnpm -w typecheck` clean.
- [ ] `pnpm -w test --filter @zook/web` clean.

## What this plan does NOT do

- Does not add new features.
- Does not redesign anything visual that wasn't already touched.
- Does not refactor remaining ~400-line files like `dashboard-primitives.tsx` (851) unless those have been already deleted by other plans. If they remain, leave them; flag for a follow-up.
- Does not change Prisma schema or server APIs.
