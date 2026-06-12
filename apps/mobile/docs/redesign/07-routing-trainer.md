# Plan 07 — Trainer Routing Rewrite

## Goal

Apply the routing template from Plan #05 to the Trainer role. Split `apps/mobile/app/trainer/index.tsx` (447 lines, 3 internal views) into `trainer/` route group. Fold the orphaned `apps/mobile/app/trainer/client/[id]/ai-draft.tsx` (114-line sibling route) into the client detail surface as a tab.

## Prerequisites

- **Read Plan #05 first** — Reception is the template.
- Plan #01 (auth context) merged.
- Plan #04 (domain split) merged.
- Plan #05 (reception rewrite) merged.

## Current state

- `apps/mobile/app/trainer/index.tsx` — 447 lines. `view: TrainerView = "home" | "clients" | "plans"` (line 24). Branches at 164 (home), 276 (clients), 329 (plans).
- `apps/mobile/app/trainer/client/[id].tsx` — 819 lines. Client detail (already a real route).
- `apps/mobile/app/trainer/client/[id]/ai-draft.tsx` — 114 lines. AI plan draft as a separate route — looks like a bolt-on. Fold into the client detail as a tab/section.
- `trainerTabs` at `apps/mobile/src/components/primitives/foundation.tsx:2044` (Home, Clients, Plans, Inbox, Profile).

## Architectural target

```
apps/mobile/app/trainer/
├── _layout.tsx               — Tabs (Home, Clients, Plans)
├── index.tsx                 — Home (was view=home)
├── clients/
│   ├── index.tsx             — Client list (was view=clients)
│   └── [id]/
│       ├── _layout.tsx       — Top tabs (Overview, Plan, Sessions)
│       ├── index.tsx         — Overview (was the bulk of trainer/client/[id].tsx)
│       ├── plan.tsx          — Plan (including AI draft — was ai-draft.tsx)
│       └── sessions.tsx      — Sessions history (extracted)
└── plans.tsx                 — Plan work (was view=plans)

apps/mobile/src/features/trainer/
├── helpers.ts
└── components/
    ├── home-metrics.tsx
    ├── client-row.tsx
    ├── plan-row.tsx
    └── ai-draft-panel.tsx    — Was the ai-draft.tsx contents, now a panel inside plan.tsx
```

## Trainer tabs

Inbox and Profile are NOT trainer tabs — they're cross-app surfaces accessed via the role switcher / global navigation. Trainer's own tabs are scoped to trainer concerns.

```tsx
// apps/mobile/app/trainer/_layout.tsx
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/lib/theme";

export default function TrainerLayout() {
  const { palette } = useTheme();
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
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="clients/index"
        options={{
          title: "Clients",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "people" : "people-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="plans"
        options={{
          title: "Plans",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "reader" : "reader-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="clients/[id]" options={{ href: null }} />
    </Tabs>
  );
}
```

## Client detail with material top tabs

`apps/mobile/app/trainer/clients/[id]/_layout.tsx`:

```tsx
import { withLayoutContext } from "expo-router";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { useLocalSearchParams } from "expo-router";
import { useTheme } from "@/lib/theme";

const { Navigator } = createMaterialTopTabNavigator();
const MaterialTopTabs = withLayoutContext(Navigator);

export default function ClientDetailLayout() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { palette } = useTheme();
  return (
    <MaterialTopTabs
      screenOptions={{
        tabBarActiveTintColor: palette.accent.base,
        tabBarInactiveTintColor: palette.text.tertiary,
        tabBarStyle: { backgroundColor: palette.bg.elevated },
        tabBarIndicatorStyle: { backgroundColor: palette.accent.base },
      }}
      initialRouteName="index"
    >
      <MaterialTopTabs.Screen name="index" options={{ title: "Overview" }} />
      <MaterialTopTabs.Screen name="plan" options={{ title: "Plan" }} />
      <MaterialTopTabs.Screen name="sessions" options={{ title: "Sessions" }} />
    </MaterialTopTabs>
  );
}
```

Verify `@react-navigation/material-top-tabs` is installed:
```
pnpm --filter @zook/mobile list @react-navigation/material-top-tabs
```
If not: `pnpm --filter @zook/mobile add @react-navigation/material-top-tabs react-native-tab-view react-native-pager-view`.

If installation expands native dependencies, **stop and confirm with the user** — adding `react-native-pager-view` requires a native rebuild. Fallback option: use a segmented control (`SegmentedControl`-like component already present in `old.tsx`?) inside a single screen file. Search for existing segmented patterns before adding the dep.

## Execution steps

### Step 1 — Extract helpers

`apps/mobile/src/features/trainer/helpers.ts`:
- `normalizeTrainerView` (trainer/index.tsx:38) — delete; no longer needed.
- Any other helpers from `trainer/index.tsx` and `trainer/client/[id].tsx`.

### Step 2 — Extract sub-components

- `home-metrics.tsx` — the `metricGrid` block at ~`trainer/index.tsx:184`.
- `client-row.tsx` — from the clients view at ~line 279.
- `plan-row.tsx` — from the plans view at ~line 335.
- `ai-draft-panel.tsx` — the full contents of `trainer/client/[id]/ai-draft.tsx`. Becomes a panel that can be rendered inside `plan.tsx`. Should take `clientId` as a prop.

### Step 3 — Build trainer routes

#### `apps/mobile/app/trainer/index.tsx` (Home)

```tsx
import { Stack } from "expo-router";
import { ScrollView, RefreshControl } from "react-native";
import { ZookScreen } from "@/components/primitives";
import { useTrainerHome } from "@/lib/domains/trainer";
import { HomeMetrics } from "@/features/trainer/components/home-metrics";
import { AttentionCard } from "@/features/owner/components/attention-card";  // reused

export default function TrainerHomeScreen() {
  const home = useTrainerHome();
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ZookScreen testID="trainer-home-screen">
        <ScrollView refreshControl={<RefreshControl refreshing={home.isRefetching} onRefresh={home.refetch} />}>
          {home.data ? (
            <>
              <HomeMetrics data={home.data} />
              <AttentionCard items={home.data.attention} />
            </>
          ) : null}
        </ScrollView>
      </ZookScreen>
    </>
  );
}
```

Target: under 150 lines.

#### `apps/mobile/app/trainer/clients/index.tsx`

Lift clients view (`trainer/index.tsx:276-326`). Uses `ClientRow`. Tapping → `router.push("/trainer/clients/[id]", { id })`.

Target: under 200 lines.

#### `apps/mobile/app/trainer/plans.tsx`

Lift plans view (`trainer/index.tsx:329-377`).

Target: under 200 lines.

### Step 4 — Refactor client detail

`apps/mobile/app/trainer/clients/[id]/index.tsx` (Overview):
- The "Overview" content from the current 819-line `trainer/client/[id].tsx`: profile, membership status, recent attendance, quick actions.
- Move plan/session content out into siblings.

`apps/mobile/app/trainer/clients/[id]/plan.tsx`:
- The plan editing portion of the current `trainer/client/[id].tsx`.
- At the bottom, render `<AiDraftPanel clientId={id} />` so users can generate / accept AI suggestions inline.
- The standalone `ai-draft.tsx` route becomes redundant.

`apps/mobile/app/trainer/clients/[id]/sessions.tsx`:
- Session history (likely a portion of the current detail file).

### Step 5 — Migrate AI draft route

The current `apps/mobile/app/trainer/client/[id]/ai-draft.tsx` is now redundant. Steps:
1. Add a `Redirect` in the file to `/trainer/clients/[id]/plan?focus=ai`:
   ```tsx
   import { Redirect, useLocalSearchParams } from "expo-router";
   export default function AiDraftRedirect() {
     const { id } = useLocalSearchParams<{ id: string }>();
     return <Redirect href={`/trainer/clients/${id}/plan?focus=ai` as never} />;
   }
   ```
2. In `plan.tsx`, when `searchParams.focus === "ai"`, scroll to the `AiDraftPanel` (e.g., via a ref and `scrollTo`).
3. Plan #11 deletes the `client/[id]/ai-draft.tsx` redirect file once we confirm no external callers.

Note: the **old path is `trainer/client/[id]/...` (singular "client"); the new path is `trainer/clients/[id]/...` (plural "clients")**. This is intentional: aligns with the "clients" tab name and is the canonical convention. Old paths get redirects (Step 7).

### Step 6 — Update bottom nav short-circuit

`old.tsx` `BottomNav` already short-circuits `/trainer/*` after plans #05/#06. Verify it does, add if missing.

`trainerTabs` at `old.tsx:2044` marked `@deprecated`.

### Step 7 — Back-compat redirects

In `apps/mobile/app/trainer/_layout.tsx`:

```tsx
useEffect(() => {
  const view = Array.isArray(params.view) ? params.view[0] : params.view;
  const map: Record<string, string> = {
    clients: "/trainer/clients",
    plans: "/trainer/plans",
  };
  const target = view ? map[view] : undefined;
  if (target) router.replace(target as never);
}, [params.view]);
```

Old `/trainer/client/[id]` (singular) → new `/trainer/clients/[id]`: create a redirect file at `apps/mobile/app/trainer/client/[id].tsx` (NEW REPLACEMENT of the existing 819-line file):

```tsx
import { Redirect, useLocalSearchParams } from "expo-router";
export default function ClientDetailRedirect() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Redirect href={`/trainer/clients/${id}` as never} />;
}
```

**Critical:** verify all `git grep "/trainer/client/"` callers, update most to new path; the redirect is just for any stale stored deep links / push notifications.

### Step 8 — Update route guards

In `apps/mobile/src/lib/route-guards.ts`, add:

```ts
"/trainer/clients": "MEMBERS_VIEW",
"/trainer/plans": "PT_RECORD",
```

Existing `/trainer/client` (singular) entry stays for the back-compat redirect file.

### Step 9 — Delete the mega-file

Same sequence as plan #06:
1. Rename old `apps/mobile/app/trainer/index.tsx` to `.bak`.
2. Build the new `_layout.tsx` + `index.tsx` (Home) + tab children.
3. Verify build and runtime.
4. Delete the `.bak`.

Similarly handle the old 819-line `trainer/client/[id].tsx` after the new `clients/[id]/` subtree is verified.

## UI fixes shipped with this plan

- Real navigation across trainer surfaces (back button works)
- Client detail uses top tabs (Overview / Plan / Sessions) for in-context switching
- AI draft is no longer a sibling route — it's a panel inside the client's Plan tab where it belongs
- Trainer Inbox and Profile are accessed via the role switcher / global nav (per plan #09 architecture), not as trainer tabs
- Theme reactivity across all trainer screens

## Files created

- `apps/mobile/app/trainer/_layout.tsx`
- `apps/mobile/app/trainer/index.tsx` (new Home screen — replaces 447-line mega-file)
- `apps/mobile/app/trainer/clients/index.tsx`
- `apps/mobile/app/trainer/clients/[id]/_layout.tsx`
- `apps/mobile/app/trainer/clients/[id]/index.tsx`
- `apps/mobile/app/trainer/clients/[id]/plan.tsx`
- `apps/mobile/app/trainer/clients/[id]/sessions.tsx`
- `apps/mobile/app/trainer/plans.tsx`
- `apps/mobile/src/features/trainer/helpers.ts`
- `apps/mobile/src/features/trainer/components/home-metrics.tsx`
- `apps/mobile/src/features/trainer/components/client-row.tsx`
- `apps/mobile/src/features/trainer/components/plan-row.tsx`
- `apps/mobile/src/features/trainer/components/ai-draft-panel.tsx`

## Files modified

- `apps/mobile/app/trainer/client/[id].tsx` — replaced with Redirect (back-compat only)
- `apps/mobile/app/trainer/client/[id]/ai-draft.tsx` — replaced with Redirect (back-compat only)
- `apps/mobile/src/components/primitives/foundation.tsx` — `trainerTabs` `@deprecated`, BottomNav short-circuits trainer
- `apps/mobile/src/lib/route-guards.ts`
- `apps/mobile/src/lib/route-guards.test.ts`

## Files deleted

- Content of old 447-line `apps/mobile/app/trainer/index.tsx` (replaced by new Home screen)
- Content of old 819-line `apps/mobile/app/trainer/client/[id].tsx` (replaced by `clients/[id]/` subtree)

## Acceptance criteria

- [ ] `/trainer` lands on Home with 3 tabs.
- [ ] Old `/trainer?view=clients` redirects to `/trainer/clients`.
- [ ] Old `/trainer/client/[id]` redirects to `/trainer/clients/[id]`.
- [ ] Client detail has 3 top tabs (Overview, Plan, Sessions).
- [ ] AI draft panel renders inside Plan tab.
- [ ] Old `/trainer/client/[id]/ai-draft` redirects to `/trainer/clients/[id]/plan?focus=ai`.
- [ ] No file in `apps/mobile/app/trainer/` exceeds 300 lines.
- [ ] `pnpm -w typecheck` clean.
- [ ] `pnpm -w test --filter @zook/mobile` clean.
- [ ] Manual: as TRAINER, view home, browse clients, drill into a client, edit a plan, generate AI draft.

## What this plan does NOT do

- Does not change trainer data model.
- Does not extract shared ClientRow / MemberRow with Owner (plan #08).
- Does not redesign client detail visuals.
