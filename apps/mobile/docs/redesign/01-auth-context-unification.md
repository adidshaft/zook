# Plan 01 — Auth Context Unification

## Goal

Replace the three competing "who is the user" sources with **one resolved context** and **explicit role switching**. No silent role activation, no identifier sniffing for demo, no hex-counting in `_layout.tsx`.

## Current state (read these first)

- `apps/mobile/src/lib/auth.tsx` — `AuthProvider` (line 193), `useAuth` (line 754), `useActivePermissions` (line 762), `useHasPermission` (line 774). Holds `activeRole` in component state + AsyncStorage. Default role computed via `ORG_ROLE_PRIORITY` (line 40): `["OWNER","ADMIN","RECEPTIONIST","TRAINER","MEMBER"]`.
- `apps/mobile/app/_layout.tsx` — lines 247–360 reconcile session, role, onboarding, permissions, redirects. Lines 337–344 perform **silent role activation** with a toast: this is the bug we are killing.
- `apps/mobile/src/lib/route-guards.ts` — `routePermissions`, `routeRoles`, `routeForRole`, `checkRouteAccess`, `requiredRolesForPath`. **Do not change semantics**, just consume from one source.
- `apps/mobile/src/lib/demo-mode.ts` — `getOfflineDemoRoleOverride`, `resolveOfflineDemoRoleForIdentifier`. The identifier sniffing happens at `auth.tsx:99`. This plan removes the **identifier sniffing**, not the override capability (override stays as an explicit dev tool; the unwanted behavior is "type test@... and your role silently changes").

## Architectural target

```
┌─────────────────────────────────────────────────┐
│ AuthProvider (apps/mobile/src/lib/auth.tsx)     │
│                                                 │
│  raw inputs:                                    │
│    session, activeOrgId, activeRole,            │
│    explicit demo override (dev-only)            │
│                                                 │
│  derives ONE value:                             │
│    roleContext: RoleContext                     │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
            useRoleContext()
                   │
       ┌───────────┼───────────┐
       ▼           ▼           ▼
   route guards   tab bar   screens
```

```ts
// New shape in apps/mobile/src/lib/auth.tsx (or new file role-context.ts)
export type RoleContext = {
  user: AuthUser;
  org: AuthOrganization | null;          // null = no org yet
  availableRoles: Role[];                // all roles the user has in current org
  role: Role;                            // currently active
  permissions: ReadonlySet<Permission>;  // permissions for (org, role)
  isPlatformAdmin: boolean;
  isDemo: boolean;                       // surfaced as a banner; not used for branching logic
};
```

## Execution steps

### Step 1 — Add `useRoleContext` hook (new, additive)

**File:** `apps/mobile/src/lib/role-context.ts` (new)

Export `RoleContext` type and `useRoleContext()` hook. Internally it reads from `useAuth()` and derives the resolved value via `useMemo`. **Do not delete anything** in this step.

```ts
import { useMemo } from "react";
import { useAuth } from "./auth";
import { isOfflineDemoMode } from "./runtime-mode";
import type { Permission, Role } from "@zook/core";

export type RoleContext = { /* shape above */ };

export function useRoleContext(): RoleContext | null {
  const { session, activeRole, activeOrganization } = useAuth();
  return useMemo(() => {
    if (!session?.user) return null;
    const org = activeOrganization ?? null;
    const availableRoles = (org?.roles ?? []) as Role[];
    const role = (activeRole ?? availableRoles[0]) as Role;
    const permissions = new Set<Permission>((org?.permissions ?? []) as Permission[]);
    return {
      user: session.user,
      org,
      availableRoles,
      role,
      permissions,
      isPlatformAdmin: Boolean(session.user.isPlatformAdmin),
      isDemo: isOfflineDemoMode(),
    };
  }, [session, activeRole, activeOrganization]);
}

export function useCanSwitchRole() {
  const ctx = useRoleContext();
  return (ctx?.availableRoles.length ?? 0) > 1;
}
```

**Note:** `activeOrganization` on `useAuth()` may not yet be exposed as a top-level field. If not, derive it inline in this hook from `session.organizations.find(o => o.id === session.activeOrganizationId)` — adjust to actual session shape. Read `packages/core/types` or the live session response shape before implementing.

### Step 2 — Add explicit `switchRole` and `switchOrg` to auth provider

In `apps/mobile/src/lib/auth.tsx`:

- Keep existing `setActiveRole` but make it a private implementation detail.
- Add `switchRole(role: Role): Promise<void>` that validates the role is in `availableRoles` and persists. On success, invalidate role-scoped queries (the existing `invalidateRoleScopedQueries` helper at line 107).
- Add `switchOrg(orgId: string): Promise<void>` that updates `activeOrganizationId` and resets `activeRole` to the highest-priority role in that org.
- Expose both via `useAuth()` return value.

### Step 3 — Build the role switcher UI

**File:** `apps/mobile/src/components/role-switcher.tsx` (new)

A bottom sheet component:

- Trigger: a chip in the top app bar showing current org + role (e.g., `"Lighthouse Gym · Owner"`)
- Sheet content: list of `org × role` combos available to the user; current one marked active; tap to switch
- On tap: call `switchRole` and/or `switchOrg`; close sheet; replace router to the new role's default route via `routeForRole`
- If only one combo is available, the chip renders read-only (no tap target)

Use existing primitives: `Sheet` or `expo-safe-bottom-sheet.tsx`, `ListRow` from `old.tsx`. Match visual treatment to the existing `AppHeader`.

### Step 4 — Mount the switcher in the global header

The header currently lives in `AppHeader` (`apps/mobile/src/components/primitives/foundation.tsx:717`). Add a new optional `contextSlot?: ReactNode` prop. Render it in the title row between eyebrow and title.

Update screen-level callers that already pass header props to optionally include `<RoleSwitcherChip />` — at minimum: `app/index.tsx`, `app/owner/index.tsx`, `app/reception.tsx`, `app/trainer/index.tsx`, `app/membership.tsx`, `app/scan.tsx`. The chip is a no-op when there's nothing to switch.

### Step 5 — Remove silent role activation

In `apps/mobile/app/_layout.tsx`, **delete** lines 337–344 (the `roleToActivate` block that auto-switches with a toast).

Replace with: when a user lands on a route they have **access to via permissions but the active role is wrong**, redirect to `routeForRole(activeRole)` instead of switching. The user must enter via the role switcher. Concretely:

```ts
const requiredRoles = requiredRolesForPath(pathname);
const hasRequiredPermission = checkRouteAccess(pathname, activePermissions, isPlatformAdmin);
if (!hasRequiredPermission) {
  router.replace(routeForRole(activeRole ?? "MEMBER") as never);
  return;
}
// no auto-switching — user can switch via header chip
```

### Step 6 — Remove identifier-based demo role sniffing

In `apps/mobile/src/lib/demo-mode.ts`:

- Keep `getOfflineDemoRoleOverride()` and `explicitOfflineDemoRoleOverride()`.
- **Remove** `resolveOfflineDemoRoleForIdentifier` (line 52) entirely. Identifier sniffing is the source of "things changing role unexpectedly."
- In `auth.tsx:99`, drop the call to `resolveOfflineDemoRoleForIdentifier`. Demo sessions get their role from `explicitOfflineDemoRoleOverride()` only — set via env var or dev settings.

### Step 7 — Update consumers

Search for usages and migrate:

- `git grep "useAuth()" apps/mobile` — anywhere that destructures `activeRole`, `hasAnyRole`, `hasActiveRole`, `isPlatformAdmin` should migrate to `useRoleContext()` where reading role/permissions. `useAuth()` remains for session-level actions (login/logout/refresh).
- `git grep "hasActiveRole\|hasAnyRole" apps/mobile` — these become `ctx.role === X` or `ctx.availableRoles.includes(X)`. **Keep the helpers** exported from `useAuth` for now (back-compat); just don't add new callers.

### Step 8 — Default role priority becomes user-pinnable

In `apps/mobile/src/lib/auth.tsx`, add a `defaultRolePreference` value stored in AsyncStorage (key: `zook_default_role_preference`). When a session loads:

1. If preference exists and is in `availableRoles` → use it.
2. Else fall back to `ORG_ROLE_PRIORITY` order.

Expose `setDefaultRole(role: Role)` via `useAuth()`. **Do not** add UI for this in this plan — that goes in plan #10 (Settings consolidation). Storage + API only.

## Files created

- `apps/mobile/src/lib/role-context.ts`
- `apps/mobile/src/components/role-switcher.tsx`

## Files modified

- `apps/mobile/src/lib/auth.tsx`
- `apps/mobile/app/_layout.tsx`
- `apps/mobile/src/lib/demo-mode.ts`
- `apps/mobile/src/components/primitives/foundation.tsx` (AppHeader prop)
- Top-level role screens that render `AppHeader`: `app/index.tsx`, `app/owner/index.tsx`, `app/reception.tsx`, `app/trainer/index.tsx`, `app/membership.tsx`, `app/scan.tsx` (and any others touched by `git grep "AppHeader"`)

## Files deleted

None in this plan.

## UI fixes shipped with this plan

- The "Switched to OWNER view" toast (currently fires unexpectedly) is gone — silent activation removed.
- The active role/org is now **visible at all times** in the header — fixes "I don't know what mode I'm in" disorientation.
- Users with multiple roles can switch in one tap from anywhere with a `AppHeader`.

## Acceptance criteria

- [ ] `useRoleContext()` returns the same role/permission view as the old auth derivations, for at least: pure member, owner+member, trainer, receptionist, platform admin.
- [ ] No call to `resolveOfflineDemoRoleForIdentifier` exists (`git grep` returns nothing).
- [ ] No "Switched to X view" toast fires during normal navigation.
- [ ] Role switcher chip in the header opens a sheet listing all available roles. Tap switches role and lands on the role's default route.
- [ ] If only one role exists, the chip is non-interactive.
- [ ] Demo override still works via explicit env var: setting `EXPO_PUBLIC_DEMO_ROLE=TRAINER` produces a trainer demo session.
- [ ] `defaultRolePreference` storage round-trips (write, reload app, read).
- [ ] `pnpm -w typecheck` clean.
- [ ] `pnpm -w test --filter @zook/mobile` clean. Update `route-guards.test.ts` if needed (should not need changes — semantics preserved).
- [ ] Login → home → switch role → home for an owner+member user works end-to-end.

## What this plan does NOT do

- Does not change `route-guards.ts` semantics (paths and permissions stay the same — those change when we route-split each role in plans 05/06/07).
- Does not add UI for the default-role pinning setting (plan #10).
- Does not remove `useAuth().hasAnyRole/hasActiveRole/activeRole` — back-compat for existing call sites until other plans migrate them.
- Does not introduce a new tab bar or change navigation structure.
