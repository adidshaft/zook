# Plan 06 — Owner Routing Rewrite

## Goal

Apply the routing template from Plan #05 to the Owner role. Split `apps/mobile/app/owner/index.tsx` (1,226 lines, 5 internal views) into `owner/` route group with one file per surface.

## Prerequisites

- **Read Plan #05 first** — Reception is the template. This plan reuses the same pattern.
- Plan #01 (auth context) merged.
- Plan #04 (domain split) merged.
- Plan #05 (reception rewrite) merged — uses the `_layout.tsx` + permission-gated `Tabs` pattern established there.

## Current state

- `apps/mobile/app/owner/index.tsx` — 1,226 lines. Component named `Owner`. Internal state machine on `view: OwnerView = "command" | "approvals" | "revenue" | "stock" | "members"` (line 52).
- The 5 views branch at: 460 (command), 558 (members), 693 (approvals), and the corresponding revenue/stock blocks. Read the file to confirm exact ranges.
- Member detail already exists at `apps/mobile/app/owner/member/[id].tsx` (400 lines) — keep, integrate.
- Bottom nav: `ownerTabs` at `apps/mobile/src/components/primitives/legacy.tsx:2125` (Home, Approvals, Revenue, Stock — no Members, despite there being a Members view).
- `adminTabs` at `legacy.tsx:2159` (Home, Check in, Approvals, Stock — points at `/owner` for everything; effectively Owner with a Check-in tab).

## Architectural target

```
apps/mobile/app/owner/
├── _layout.tsx              — Tabs (Home, Members, Approvals, Revenue, Stock)
├── index.tsx                — Command (was view=command)
├── members.tsx              — Members list (was view=members)
├── member/
│   └── [id].tsx             — EXISTING — keep but verify it works under new layout
├── approvals.tsx            — Approvals (was view=approvals)
├── revenue.tsx              — Revenue (was view=revenue)
└── stock.tsx                — Stock (was view=stock)

apps/mobile/src/features/owner/
├── helpers.ts               — cleanReviewReason, titleCase, memberInitials, etc.
└── components/
    ├── command-metrics.tsx
    ├── attention-card.tsx
    ├── member-row.tsx
    ├── approval-card.tsx
    ├── revenue-summary.tsx
    └── stock-row.tsx
```

## Owner tabs

Five tabs (one more than reception). Use the same `Tabs` pattern as Reception:

```tsx
// apps/mobile/app/owner/_layout.tsx
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useHasPermission } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { useOrgJoinRequests } from "@/lib/domains/owner";

export default function OwnerLayout() {
  const { palette } = useTheme();
  const canViewRevenue = useHasPermission("ORG_VIEW_REPORTS");
  const canViewStock = useHasPermission("INVENTORY_VIEW");
  const approvalsQuery = useOrgJoinRequests();
  const pendingCount = approvalsQuery.data?.requests.length ?? 0;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.accent.base,
        tabBarInactiveTintColor: palette.text.tertiary,
        tabBarStyle: { backgroundColor: palette.bg.elevated, borderTopColor: palette.border.subtle },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Command",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "pulse" : "pulse-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="members"
        options={{
          title: "Members",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "people" : "people-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="approvals"
        options={{
          title: "Approvals",
          tabBarBadge: pendingCount > 0 ? pendingCount : undefined,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "checkmark-done" : "checkmark-done-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="revenue"
        options={{
          title: "Revenue",
          href: canViewRevenue ? "/owner/revenue" : null,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "trending-up" : "trending-up-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="stock"
        options={{
          title: "Stock",
          href: canViewStock ? "/owner/stock" : null,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "cube" : "cube-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="member/[id]" options={{ href: null }} />
    </Tabs>
  );
}
```

## Execution steps

### Step 1 — Extract helpers

`apps/mobile/src/features/owner/helpers.ts`:
- `cleanReviewReason` (owner/index.tsx:62)
- `titleCase` (owner/index.tsx:67)
- `titleForView` — **delete**; titles now live in `_layout.tsx` `options.title`
- `memberInitials` (owner/index.tsx:84)
- `normalizeView` — **delete**, no longer used

### Step 2 — Extract sub-components

`apps/mobile/src/features/owner/components/`:

- `command-metrics.tsx` — the `metricGrid` block from the command view (~line 462). Props: `dashboard: OwnerDashboard`.
- `attention-card.tsx` — the attention items rendered in command view (~line 530). Props: `items: AttentionItem[]`.
- `member-row.tsx` — extracted from members view (~line 653). Props: `member: Member`, `onPress: () => void`.
- `approval-card.tsx` — extracted from approvals view (~line 746). Props: `request: JoinRequest`, `onApprove`, `onReject`.
- `revenue-summary.tsx`, `stock-row.tsx` — similar extractions.

For each component, migrate to `useTheme()` palette per plan #03 reference pattern.

### Step 3 — Build each route

#### `apps/mobile/app/owner/index.tsx` (Command)

```tsx
import { Stack } from "expo-router";
import { ScrollView, RefreshControl } from "react-native";
import { ZookScreen, QueryErrorState } from "@/components/primitives";
import { useOwnerDashboard } from "@/lib/domains/owner";
import { OwnerDashboardSkeleton } from "@/components/skeletons";
import { CommandMetrics } from "@/features/owner/components/command-metrics";
import { AttentionCard } from "@/features/owner/components/attention-card";
import { DemoBanner } from "@/components/demo-banner";

export default function OwnerCommandScreen() {
  const dashboard = useOwnerDashboard();
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ZookScreen testID="owner-command-screen">
        <DemoBanner />
        <ScrollView
          refreshControl={<RefreshControl refreshing={dashboard.isRefetching} onRefresh={dashboard.refetch} />}
        >
          {dashboard.isLoading ? <OwnerDashboardSkeleton /> : null}
          {dashboard.isError ? <QueryErrorState onRetry={dashboard.refetch} /> : null}
          {dashboard.data ? (
            <>
              <CommandMetrics dashboard={dashboard.data} />
              <AttentionCard items={dashboard.data.attention} />
            </>
          ) : null}
        </ScrollView>
      </ZookScreen>
    </>
  );
}
```

Target: under 150 lines.

#### `apps/mobile/app/owner/members.tsx`

Lift members view (`owner/index.tsx:558-690`). Includes filter pills (all/active/expiring/expired), search bar, list. Tapping a row → `router.push("/owner/member/[id]", { id })`.

Target: under 250 lines.

#### `apps/mobile/app/owner/approvals.tsx`

Lift approvals view. Uses `ApprovalCard`. Approve/reject mutations from `@/lib/domains/owner` (or `@/lib/domains/attendance` — pick the canonical one and stick with it; document the choice).

Target: under 200 lines.

#### `apps/mobile/app/owner/revenue.tsx`

Lift revenue view. Includes the revenue summary metrics + recent payments list.

Target: under 200 lines.

#### `apps/mobile/app/owner/stock.tsx`

Lift stock view.

Target: under 200 lines.

### Step 4 — Verify `member/[id].tsx` still works

The existing `apps/mobile/app/owner/member/[id].tsx` (400 lines) currently navigates back to `/owner?view=members`. Update that to `router.back()` or `router.replace("/owner/members")`. Search:

```
git grep -n '/owner?view=' apps/mobile
```

Update all matches.

### Step 5 — Admin role consolidation

`adminTabs` at `legacy.tsx:2159` points at `/owner` for everything. After this plan, admin users hit `/owner/_layout.tsx` and see the same tabs. **The Admin/Owner distinction at the UI level becomes a no-op** — both roles get the same tab bar.

If permissions differ (e.g., ADMIN doesn't have `ORG_VIEW_REPORTS`), the revenue tab automatically hides via `href: canViewRevenue ? ... : null`. This is the right behavior.

In `legacy.tsx`, mark `adminTabs` `@deprecated`. Plan #11 deletes it.

### Step 6 — Bottom nav short-circuit

In `apps/mobile/src/components/primitives/legacy.tsx`, ensure `BottomNav` returns `null` when `pathname.startsWith("/owner")` (this was added in plan #05 as a single block — extend if needed).

### Step 7 — Back-compat redirects

In `apps/mobile/app/owner/_layout.tsx`, add the same `?view=` redirect logic as Reception:

```tsx
useEffect(() => {
  const view = Array.isArray(params.view) ? params.view[0] : params.view;
  const map: Record<string, string> = {
    members: "/owner/members",
    approvals: "/owner/approvals",
    revenue: "/owner/revenue",
    stock: "/owner/stock",
  };
  const target = view ? map[view] : undefined;
  if (target) router.replace(target as never);
}, [params.view]);
```

### Step 8 — Update route guards

In `apps/mobile/src/lib/route-guards.ts`, add subroutes:

```ts
"/owner/members": "MEMBERS_VIEW",
"/owner/approvals": "ATTENDANCE_APPROVE",  // or whichever is canonical
"/owner/revenue": "ORG_VIEW_REPORTS",
"/owner/stock": "INVENTORY_VIEW",
```

Update `route-guards.test.ts` accordingly (the test file at line 11 already tests `/owner/revenue` — verify the assertion still matches new permission strings).

### Step 9 — Delete the mega-file

After verifying the new tree builds, delete `apps/mobile/app/owner/index.tsx` (the 1,226-line one) — note: the new `apps/mobile/app/owner/index.tsx` is the Command screen. Naming collision is resolved because Expo Router file-based routing treats them as the same logical route: `/owner` → the new file.

Practical sequence:
1. Rename old file: `git mv apps/mobile/app/owner/index.tsx apps/mobile/app/owner/_old_index.tsx.bak`
2. Create new `apps/mobile/app/owner/_layout.tsx` and `apps/mobile/app/owner/index.tsx` (Command screen).
3. Verify build.
4. Delete the `.bak` file.

## UI fixes shipped with this plan

- Members is now a real tab (was hidden inside Command view via secondary nav)
- Each surface has independent scroll, refresh, and filter state
- Pending approvals badge on the Approvals tab
- Revenue/Stock hide automatically if user lacks permission (rather than showing empty data)
- Theme reactivity in all owner screens
- Member detail → Members back navigation is correct

## Files created

- `apps/mobile/app/owner/_layout.tsx`
- `apps/mobile/app/owner/index.tsx` (NEW — Command screen, not the old mega-file)
- `apps/mobile/app/owner/members.tsx`
- `apps/mobile/app/owner/approvals.tsx`
- `apps/mobile/app/owner/revenue.tsx`
- `apps/mobile/app/owner/stock.tsx`
- `apps/mobile/src/features/owner/helpers.ts`
- `apps/mobile/src/features/owner/components/command-metrics.tsx`
- `apps/mobile/src/features/owner/components/attention-card.tsx`
- `apps/mobile/src/features/owner/components/member-row.tsx`
- `apps/mobile/src/features/owner/components/approval-card.tsx`
- `apps/mobile/src/features/owner/components/revenue-summary.tsx`
- `apps/mobile/src/features/owner/components/stock-row.tsx`

## Files modified

- `apps/mobile/app/owner/member/[id].tsx` (update back-nav target)
- `apps/mobile/src/components/primitives/legacy.tsx` (`adminTabs`, `ownerTabs` marked `@deprecated`; BottomNav short-circuit for `/owner/*`)
- `apps/mobile/src/lib/route-guards.ts`
- `apps/mobile/src/lib/route-guards.test.ts`

## Files deleted

- The old 1,226-line `apps/mobile/app/owner/index.tsx` content is replaced by the new Command screen.

## Acceptance criteria

- [ ] `/owner` lands on Command.
- [ ] All five tabs visible to an OWNER user; permission-gated (revenue, stock) hide for ADMIN if they lack permission.
- [ ] Pending approvals badge updates live.
- [ ] Old `/owner?view=members` redirects to `/owner/members`.
- [ ] Member detail back navigation returns to `/owner/members`, not `/owner` root.
- [ ] No file in `apps/mobile/app/owner/` exceeds 300 lines.
- [ ] `pnpm -w typecheck` clean.
- [ ] `pnpm -w test --filter @zook/mobile` clean.
- [ ] Manual: as OWNER, navigate each tab, approve a join request, view member detail, drill into revenue, view stock. No console errors.

## What this plan does NOT do

- Does not extract shared MemberList component (plan #08).
- Does not redesign Owner visuals.
- Does not consolidate ADMIN role (it stays mapped to OWNER — formal cleanup in plan #11).
