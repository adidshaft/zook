# Plan 11 — Kill List & Final Cleanup

## Goal

After plans #01–#10 land, retire the deprecated code paths, delete the redirect stubs, collapse the discovery routes, remove the old primitives, and confirm the app has no remaining `?view=` mega-screen patterns.

## Why

The strangler-fig migration leaves the old code in place at every step. This is intentional and safe — but it now needs to be cleaned up. Specifically:

- `apps/mobile/src/components/primitives/foundation.tsx` (3,712 lines) still exists. Most of it should be deleted by now; the rest needs to be moved out.
- Redirect stubs for `/tracking`, `/tracking-entry`, `/tracking-history`, `/plans/index`, `/more`, `/trainer/client/[id]`, `/trainer/client/[id]/ai-draft` accumulated through the rewrite. Confirm no callers and delete.
- `apps/mobile/src/lib/query-hooks.ts` is now a re-export barrel — delete and migrate the remaining callers.
- `apps/mobile/src/lib/theme/old.ts` (the back-compat color shim) blocks full re-theming for any code that imports `colors` statically. Migrate or delete.
- Discovery routes are duplicated: `find-gyms`, `gym/[username]`, `join/[username]`. Three routes for one job.
- `dashboard.tsx` (64 lines) looks vestigial.
- `assistant.tsx` (104 lines) — confirm whether it's a real feature or a stub; either commit or delete.
- `platform.tsx` (115 lines) is a "go to web" stub; move to a build-time exclusion.
- Role-keyed `BottomNav` in `old.tsx` is dead code after #05/#06/#07.
- Various `@deprecated` aliases throughout the codebase.

## Prerequisites

- All plans #01 through #10 merged.

## Execution steps

### Step 1 — Confirm strangle progress

Run the audit:

```bash
# Count lines in old primitives
wc -l apps/mobile/src/components/primitives/foundation.tsx

# Count callers of old.tsx
git grep -l "from.*primitives/foundation" apps/mobile

# Count callers of query-hooks
git grep -l "from \"@/lib/query-hooks\"" apps/mobile

# Count callers of static theme colors
git grep -l "import .* { colors } from \"@/lib/theme\"" apps/mobile
```

If counts are high, the prior plans are incomplete — fix those first, then return.

### Step 2 — Migrate remaining `old.tsx` exports

`apps/mobile/src/components/primitives/foundation.tsx` contains:
- `ZookScreen` (line 296)
- `SafeAreaScreen` (line 391) — likely a wrapper, may be unused now
- `AppHeader` (line 717)
- `AppHeader` (line 855)
- `BottomNav` (line 2337)
- `memberTabs`, `trainerTabs`, `receptionTabs`, `ownerTabs`, `adminTabs` (lines 2009–2190)
- `DockTabItem`, `DockTab`, `AnimatedPulse`, helpers
- Other components/styles in between

For each:

1. **If it's still imported anywhere** — move to a dedicated file in `apps/mobile/src/components/primitives/`:
   - `ZookScreen`, `SafeAreaScreen` → already in `layout.tsx`? If not, move there.
   - `AppHeader`, `AppHeader` → `header.tsx` (new)
   - `BottomNav` → delete (no longer used after #09)
   - `DockTab*`, role tabs → delete (no longer used after #05/#06/#07/#09)
   - Anything else still imported → move to the appropriate split file (`cards.tsx`, `buttons.tsx`, `feedback-primitives.tsx`)

2. **If it's no longer imported** — delete.

Find unused exports:
```bash
for sym in ZookScreen AppHeader AppHeader BottomNav DockTabItem; do
  echo "=== $sym ==="
  git grep -l "$sym" apps/mobile/src apps/mobile/app | grep -v primitives/foundation.tsx | head
done
```

### Step 3 — Delete `old.tsx`

When the grep shows no callers outside `old.tsx` itself, delete the file:

```bash
git rm apps/mobile/src/components/primitives/foundation.tsx
```

Update `apps/mobile/src/components/primitives/index.tsx` to remove any `export * from "./old"` line if present.

### Step 4 — Delete `query-hooks.ts`

After all screens import from `@/lib/domains/<name>` directly:

```bash
git grep -l "from \"@/lib/query-hooks\"" apps/mobile
```

For each remaining file, migrate the import:

```ts
// before
import { useMemberHome, useApproveAttendance } from "@/lib/query-hooks";

// after
import { useMemberHome } from "@/lib/domains/member";
import { useApproveAttendance } from "@/lib/domains/attendance";
```

When the grep is empty:

```bash
git rm apps/mobile/src/lib/query-hooks.ts
```

### Step 5 — Migrate remaining static `colors` imports

Find them:

```bash
git grep -ln "import.*{[^}]*colors[^}]*}.*from \"@/lib/theme\"" apps/mobile
```

For each file, migrate to `useTheme().palette.*` per plan #03's `buttons.tsx` reference pattern.

If a file is **truly static** (e.g., a module-level `StyleSheet.create` that can't read context), it must be refactored to compute styles inside the component via `useMemo`:

```tsx
// before
const styles = StyleSheet.create({ root: { color: colors.text } });

// after
function MyComponent() {
  const { palette } = useTheme();
  const styles = useMemo(() => StyleSheet.create({ root: { color: palette.text.primary } }), [palette]);
  return <View style={styles.root} />;
}
```

### Step 6 — Delete `theme/old.ts`

When no file imports `colors` statically:

```bash
git rm apps/mobile/src/lib/theme/old.ts
```

Update `apps/mobile/src/lib/theme.ts` to:

```ts
// apps/mobile/src/lib/theme.ts
export * from "./theme";
```

Or, better, delete `theme.ts` and update consumers to import from `@/lib/theme` (which resolves to `theme/index.ts`).

### Step 7 — Delete redirect stubs

After confirming no external callers:

```bash
# tracking redirects
git rm apps/mobile/app/tracking.tsx apps/mobile/app/tracking-entry.tsx apps/mobile/app/tracking-history.tsx

# plans index redirect (moved into Plan tab)
git rm apps/mobile/app/plans/index.tsx

# more redirect (replaced by You)
git rm apps/mobile/app/more.tsx

# trainer redirects
git rm apps/mobile/app/trainer/client/[id].tsx
git rm apps/mobile/app/trainer/client/[id]/ai-draft.tsx
# remove the empty trainer/client/ directory if empty
rmdir apps/mobile/app/trainer/client 2>/dev/null
rmdir apps/mobile/app/trainer/client/[id] 2>/dev/null
```

Check push notification routing and any external deep-link generators (`apps/web` referrals, email templates) for stale URLs. If any external system emits old URLs, **keep the redirect** and document the schedule for removal.

### Step 8 — Consolidate discovery routes

Today: `find-gyms.tsx`, `gym/[username].tsx`, `join/[username].tsx`. Three routes for one job.

Target:
- `app/gyms/index.tsx` — search/browse gyms (was `find-gyms.tsx`)
- `app/gyms/[username].tsx` — gym profile + join CTA (merged from `gym/[username]` and `join/[username]`)

Steps:

1. Move `find-gyms.tsx` → `gyms/index.tsx` (400 lines; verify still works).
2. Move `gym/[username].tsx` → `gyms/[username].tsx`. This is 1,197 lines — if time permits, break into sections in `features/gyms/` similar to other plans. If not, just move it.
3. `join/[username].tsx` is a 23-line redirect — delete after updating the `find-gyms.tsx` flow to point at `/gyms/[username]?intent=join`.
4. Add back-compat redirects from `/find-gyms` → `/gyms` and `/gym/[username]` → `/gyms/[username]` and `/join/[username]` → `/gyms/[username]?intent=join`.

Search for callers:

```bash
git grep -n "/find-gyms\|/gym/\|/join/" apps/mobile
```

Update each.

### Step 9 — Delete `dashboard.tsx`

`apps/mobile/app/dashboard.tsx` is 64 lines and looks vestigial. Verify:

```bash
git grep -n "/dashboard" apps/mobile
```

If no callers (only the route file itself), delete:

```bash
git rm apps/mobile/app/dashboard.tsx
```

If callers exist, investigate what it does and decide: integrate or remove callers first.

### Step 10 — Decide on `assistant.tsx`

`apps/mobile/app/assistant.tsx` is 104 lines. Audit:

1. Does it have real functionality? Read the file.
2. Is it referenced from the You quick action grid? (Plan #10 added it.)
3. Does it have analytics showing usage?

Decisions:
- **Keep** → make sure it's reachable via You quick action; otherwise no change.
- **Remove** → delete the file + the quick action card in You. Update `notifications-routing.ts` if it directs to assistant.

This decision belongs to the product owner. Default for cleanup: **keep** the file (don't break working features). Document the decision in the PR.

### Step 11 — Platform stub

`apps/mobile/app/platform.tsx` (115 lines) tells platform admins to use the web. Two options:

1. **Block at login** — if `session.user.isPlatformAdmin && !session.organizations.length`, redirect to a "Open web dashboard" splash. Delete `platform.tsx` route.
2. **Keep as-is** — it's harmless.

Recommended: keep. The route is 115 lines, costs nothing. Delete only if there's a real reason.

### Step 12 — Sweep `@deprecated` markers

```bash
git grep -n "@deprecated" apps/mobile/src apps/mobile/app
```

For each:
- If it's been replaced (e.g., `colors.bg` → `palette.bg.app`), confirm no callers and delete the export.
- If callers exist, finish the migration in this plan.

### Step 13 — Sweep dead exports

Use a tool like `ts-unused-exports` (or `knip`) to find unreferenced exports:

```bash
npx ts-unused-exports apps/mobile/tsconfig.json --excludePathsFromReport='node_modules;dist;\.test\.ts'
```

Delete any dead exports. Be careful: stories files and `__tests__` may reference some "unused" exports intentionally.

### Step 14 — Update CLAUDE.md / README if present

If the repo has any developer docs that describe the now-obsolete architecture (mega-screens, `?view=` patterns, role-keyed `BottomNav`), update them. Search:

```bash
git grep -n "?view=\|role-keyed\|mega-screen" apps/mobile
```

### Step 15 — Final acceptance audit

Run the full audit and confirm zero results:

```bash
# No ?view= mega-screen pattern remains in route files
git grep -n "view\s*===" apps/mobile/app

# No old primitives imports
git grep -n "primitives/foundation" apps/mobile

# No query-hooks.ts imports (file should not exist)
test ! -f apps/mobile/src/lib/query-hooks.ts && echo "OK: query-hooks.ts gone"

# No theme/old.ts (file should not exist)
test ! -f apps/mobile/src/lib/theme/old.ts && echo "OK: theme/old.ts gone"

# No @deprecated annotations remain
git grep -n "@deprecated" apps/mobile/src apps/mobile/app

# No isOfflineDemoMode in UI code
git grep -n "isOfflineDemoMode" apps/mobile/app apps/mobile/src/components

# No static colors import
git grep -n "import.*{[^}]*colors[^}]*}.*from \"@/lib/theme\"" apps/mobile

# Mega-files all under target sizes
for f in $(find apps/mobile/app -name "*.tsx"); do
  lines=$(wc -l < "$f")
  if [ "$lines" -gt 400 ]; then echo "$f: $lines lines (over budget)"; fi
done
```

Each of these should return empty (or nothing over budget). If any are non-empty, that's a bug to fix in this plan.

## Files deleted

- `apps/mobile/src/components/primitives/foundation.tsx`
- `apps/mobile/src/lib/query-hooks.ts`
- `apps/mobile/src/lib/theme/old.ts`
- `apps/mobile/src/lib/theme.ts` (if moved to barrel only)
- `apps/mobile/app/tracking.tsx`, `tracking-entry.tsx`, `tracking-history.tsx`
- `apps/mobile/app/plans/index.tsx` (the redirect stub)
- `apps/mobile/app/more.tsx`
- `apps/mobile/app/trainer/client/[id].tsx`
- `apps/mobile/app/trainer/client/[id]/ai-draft.tsx`
- `apps/mobile/app/join/[username].tsx`
- `apps/mobile/app/find-gyms.tsx` (after move to `gyms/`)
- `apps/mobile/app/gym/[username].tsx` (after move to `gyms/`)
- Possibly `apps/mobile/app/dashboard.tsx`
- Possibly `apps/mobile/app/assistant.tsx`
- Possibly `apps/mobile/app/platform.tsx`

## Files created

- `apps/mobile/src/components/primitives/header.tsx` (extracted from old)
- `apps/mobile/app/gyms/index.tsx`
- `apps/mobile/app/gyms/[username].tsx`

## Files modified

- Many — every file that had a static `colors` import gets migrated to `useTheme()`.
- `apps/mobile/src/components/primitives/index.tsx` (drops old re-export)

## UI fixes shipped with this plan

- Final theme-reactive coverage: every screen re-themes correctly between light and dark.
- Gym discovery flow is one coherent path (`/gyms/...`) instead of three half-overlapping routes.
- App startup faster (less bundled code).
- No more "deprecated" stale paths confusing devs or producing broken back-nav.

## Acceptance criteria

- [ ] All `git grep` audit commands in Step 15 return empty.
- [ ] No file in `apps/mobile/app/` exceeds 400 lines.
- [ ] `apps/mobile/src/components/primitives/foundation.tsx` does not exist.
- [ ] `apps/mobile/src/lib/query-hooks.ts` does not exist.
- [ ] `apps/mobile/src/lib/theme/old.ts` does not exist.
- [ ] App boots and renders correctly in light and dark mode for all roles (MEMBER, TRAINER, OWNER, RECEPTIONIST).
- [ ] Cold-launch metric: app-launch time at parity or better than pre-redesign baseline (measure with Expo dev tools or React Native performance overlay).
- [ ] Bundle size: production iOS bundle smaller than baseline (verify via `npx expo export`).
- [ ] `pnpm -w typecheck` clean.
- [ ] `pnpm -w test --filter @zook/mobile` clean.
- [ ] Manual smoke pass on each role's main flow.

## What this plan does NOT do

- Does not add new features.
- Does not redesign anything visual that wasn't already touched.
- Does not refactor `scan.tsx` (1,058 lines) — explicit non-goal of redesign. If desired, that's a follow-up plan.
- Does not refactor `gyms/[username].tsx` internally (1,197 lines) — same reason.
- Does not change backend / server.
