# Plan 09 — Member Shell + Home State Machine

## Goal

Replace the member's stack-only navigation with a 4-tab shell. Rewrite the 1,061-line `apps/mobile/app/index.tsx` (home) as a state machine that renders the minimum useful card for the user's current state. Eliminate `apps/mobile/app/more.tsx`.

## Why

- Home stacks 6 cards (`FirstRunCard`, `TodayPlanCard`, `ActivityCard`, `WorkoutLogCard`, `ReferralCard`, `ProfileReadyPrompt`) regardless of state. Most users see most cards as noise.
- `more.tsx` is a 6-item overflow menu — the symptom of no real IA.
- Member tab bar today (`memberTabs` in `legacy.tsx:2009`) is Home / Track / Scan / Shop / Profile. Tracking is a sub-step of using a plan, not a destination. Shop is a "sometimes" thing.
- The new IA must reflect the member's actual day: open the app to check status, do today's workout, scan into the gym, manage your stuff.

## Prerequisites

- Plan #01 (auth context, role switcher) merged.
- Plan #03 (theme, light mode) merged.
- Plan #04 (domain split) merged.

## Target IA

```
[ Home ]   [ Plan ]   [ Scan ]   [ You ]
```

- **Home** — today's status; one primary CTA based on state
- **Plan** — workouts and history (formerly Tracking + Plans)
- **Scan** — QR check-in (highest-frequency action)
- **You** — profile, membership, settings, notifications, shop, assistant, gym profile, referral

`more.tsx` is gone. Everything that was in More moves into You (plan #10 finalizes the You surface).

## Member tab layout

```tsx
// apps/mobile/app/(member)/_layout.tsx  — NEW FILE
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/lib/theme";
import { useMyNotifications } from "@/lib/domains/notifications";

export default function MemberLayout() {
  const { palette } = useTheme();
  const notif = useMyNotifications();
  const unread = notif.data?.notifications?.filter((n) => !n.readAt).length ?? 0;

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
        name="plan"
        options={{
          title: "Plan",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "barbell" : "barbell-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: "Scan",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "qr-code" : "qr-code-outline"} size={26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="you"
        options={{
          title: "You",
          tabBarBadge: unread > 0 ? unread : undefined,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "person" : "person-outline"} size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
```

## Home state machine

```ts
type HomeState =
  | { kind: "noOrg" }                                    // not joined to any gym yet
  | { kind: "expiredMembership" }                        // membership lapsed
  | { kind: "noPlan"; gymName: string; daysLeft: number }
  | { kind: "todayRest"; planName: string; streak: number }
  | { kind: "todayWorkout"; planName: string; assignmentId: string; estimatedMinutes?: number }
  | { kind: "workoutInProgress"; assignmentId: string }  // server says session is open
  | { kind: "workoutLoggedToday"; nextPlanName?: string; streak: number }
  | { kind: "firstRun"; gymUsername?: string };          // never used the app before, has org
```

Each state renders **one** primary card. Side rails (referral, profile-completion, sharing prompts) become dismissible banners that appear above/below the primary card on a schedule, not constantly.

```ts
function deriveHomeState(home: MemberHome | undefined): HomeState {
  if (!home) return { kind: "firstRun" };
  if (!home.activeOrganization) return { kind: "noOrg" };
  if (home.activeMembership && isExpired(home.activeMembership)) return { kind: "expiredMembership" };
  if (home.activeWorkoutSessionId) return { kind: "workoutInProgress", assignmentId: home.activeWorkoutSessionId };
  if (home.todayWorkoutLoggedAt) return { kind: "workoutLoggedToday", nextPlanName: home.tomorrowPlanName, streak: home.streakDays ?? 0 };
  if (home.todayPlanName && home.todayPlanAssignmentId) {
    return { kind: "todayWorkout", planName: home.todayPlanName, assignmentId: home.todayPlanAssignmentId, estimatedMinutes: home.todayEstimatedMinutes };
  }
  if (home.activeMembership && !home.todayPlanName) {
    return { kind: "todayRest", planName: home.activePlanName ?? "Active plan", streak: home.streakDays ?? 0 };
  }
  if (home.activeMembership && !home.activePlan) return { kind: "noPlan", gymName: home.activeOrganization.name, daysLeft: home.activeMembership.daysLeft ?? 0 };
  return { kind: "firstRun", gymUsername: home.activeOrganization?.username };
}
```

Each state-specific card lives in `apps/mobile/src/features/member/home/cards/`:

- `no-org-card.tsx` — "Join a gym" CTA → `/find-gyms`
- `expired-card.tsx` — "Your membership expired" CTA → `/you/membership`
- `no-plan-card.tsx` — "No plan assigned" CTA → "Ask your trainer" (deeplink to plans tab)
- `rest-day-card.tsx` — "Rest day" + streak chip
- `workout-card.tsx` — "Today: <planName>" + Start button → tracking entry
- `in-progress-card.tsx` — "Workout in progress" → Resume
- `logged-card.tsx` — "Logged. Tomorrow: <nextName>" + streak
- `first-run-card.tsx` — onboarding nudge

Dismissible banners stack above:
- `referral-banner.tsx` — show once per 7 days, dismissible
- `profile-completion-banner.tsx` — show until completed
- `unread-notifications-banner.tsx` — show if unread > 0 and dismissed < 24h ago

## Plan tab

`apps/mobile/app/(member)/plan.tsx`:
- Replaces `apps/mobile/app/plans/index.tsx` + `tracking.tsx` + `tracking-entry.tsx` + `tracking-history.tsx` as the canonical landing.
- Sections:
  1. Today's workout (same surface as home's workout card, in detail)
  2. This week's schedule
  3. Recent sessions (collapses into tracking-history)
  4. Browse all plans

Tap a plan → `app/plan/[assignmentId].tsx` (kept as a separate detail route; same as current `app/plans/[assignmentId].tsx`).

The standalone `tracking.tsx`, `tracking-entry.tsx`, `tracking-history.tsx` files become **redirect stubs** to deep links into `/plan` for back-compat. Final removal in plan #11.

## Scan tab

`apps/mobile/app/(member)/scan.tsx`:
- Same content as current `app/scan.tsx`, just moved into the tab group.
- Note: the file is 1,058 lines. Don't rewrite it in this plan — just move it. Cleanup is plan #11.

## You tab

`apps/mobile/app/(member)/you.tsx`:
- Stub for this plan: renders the existing `more.tsx` content as a starting point.
- Plan #10 rebuilds it properly.

This plan does NOT consolidate Profile/Settings/Membership — that's plan #10.

## Execution steps

### Step 1 — Move member routes into a route group

Expo Router groups route files without affecting the URL using `(name)`. Create `apps/mobile/app/(member)/`.

Move these files into it:
- `app/index.tsx` → `app/(member)/index.tsx`
- `app/scan.tsx` → `app/(member)/scan.tsx`

The URL paths stay `/` and `/scan` because `(member)` is a "group" prefix that doesn't appear in URLs.

Create new files:
- `app/(member)/_layout.tsx` (template above)
- `app/(member)/plan.tsx` (new — Plan tab)
- `app/(member)/you.tsx` (placeholder for plan #10)

### Step 2 — Build home state machine

`apps/mobile/src/features/member/home/state.ts`:
- Export `HomeState` type
- Export `deriveHomeState(home)` function

`apps/mobile/src/features/member/home/cards/` — one file per state. Each exports a default React component taking the corresponding props.

Rewrite `app/(member)/index.tsx`:

```tsx
import { Stack } from "expo-router";
import { ScrollView, RefreshControl } from "react-native";
import { ZookScreen, MobileHeader } from "@/components/primitives";
import { useMemberHome } from "@/lib/domains/member";
import { deriveHomeState } from "@/features/member/home/state";
import { renderHomeCard } from "@/features/member/home/render";
import { Banners } from "@/features/member/home/banners";
import { DemoBanner } from "@/components/demo-banner";

export default function HomeScreen() {
  const home = useMemberHome();
  const state = deriveHomeState(home.data);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ZookScreen testID="member-home">
        <DemoBanner />
        <ScrollView
          refreshControl={<RefreshControl refreshing={home.isRefetching} onRefresh={home.refetch} />}
        >
          <MobileHeader title={`Hello, ${home.data?.user.firstName ?? ""}`} />
          <Banners home={home.data} />
          {renderHomeCard(state, home.data)}
        </ScrollView>
      </ZookScreen>
    </>
  );
}
```

Target: under 150 lines for `index.tsx`. State machine logic lives in `features/member/home/`.

### Step 3 — Build Plan tab

New file: `app/(member)/plan.tsx`.

Combine the lists/today blocks from existing `tracking.tsx`, `plans/index.tsx`, `tracking-history.tsx`. Reuse the same workout card component from home for the "today" section so visuals match.

If file approaches 400 lines, extract sections into `features/member/plan/sections/`.

### Step 4 — Existing standalone routes become redirects

For each of `tracking.tsx`, `tracking-entry.tsx`, `tracking-history.tsx`, `plans/index.tsx`, `more.tsx`:

```tsx
// apps/mobile/app/tracking.tsx
import { Redirect } from "expo-router";
export default function TrackingRedirect() {
  return <Redirect href="/plan" />;
}
```

Plan #11 deletes these stubs after we confirm no callers remain.

### Step 5 — Replace global BottomNav usage

The legacy `BottomNav` from `legacy.tsx` is still rendered by many member screens. After this plan:
- Screens inside `(member)/` get the tab bar from `_layout.tsx` automatically (Expo Tabs).
- Screens that are pushed on top of a tab (e.g., `app/plan/[assignmentId].tsx`, `app/notifications/[id].tsx`, `app/order/[orderId].tsx`) should NOT render a `BottomNav` — Expo Tabs handles bar visibility automatically.

Find every `<BottomNav />` call in member-side files (`git grep -n "<BottomNav" apps/mobile/app`) and **delete** the line. The tab bar comes from the layout.

### Step 6 — Verify settings entry for theme

`apps/mobile/app/settings.tsx` already has the Appearance section from plan #03. Confirm it works after this plan (the settings route is pushed from `you.tsx`).

### Step 7 — Update root `_layout.tsx`

In `apps/mobile/app/_layout.tsx`:
- The `<Stack.Screen name="index" />` entry can stay — but it now points at `(member)/index.tsx`.
- Add `<Stack.Screen name="(member)" options={{ animation: "none" }} />`.
- Remove explicit registrations for now-redirected routes (`plans/index`, `tracking`, `tracking-entry`, `tracking-history`) — they're still registered as redirect stubs.

### Step 8 — Update default route resolution

In `apps/mobile/src/lib/auth.tsx`, `sessionDefaultRoute(role?: Role)` returns `/` for members. That still works because `(member)/index.tsx` is `/`. No change needed.

## UI fixes shipped with this plan

- Home shows one relevant card, not six. Empty/expired/no-plan states are honest, not hidden behind sample data.
- Tab bar surfaces the four most-used actions; no more `more.tsx` overflow.
- Streak chip moves from "always on" to "shown on relevant cards only."
- Workout in-progress card resumes a session — currently this state is missed.
- Notification badge on the You tab (instead of buried in `more.tsx → Inbox`).
- Plan, Scan, You all have their own back stack — back button works as expected.

## Files created

- `apps/mobile/app/(member)/_layout.tsx`
- `apps/mobile/app/(member)/index.tsx` (replaces `app/index.tsx`)
- `apps/mobile/app/(member)/plan.tsx`
- `apps/mobile/app/(member)/scan.tsx` (moved from `app/scan.tsx`)
- `apps/mobile/app/(member)/you.tsx` (placeholder — plan #10 fills it)
- `apps/mobile/src/features/member/home/state.ts`
- `apps/mobile/src/features/member/home/render.tsx`
- `apps/mobile/src/features/member/home/banners.tsx`
- `apps/mobile/src/features/member/home/cards/{no-org,expired,no-plan,rest-day,workout,in-progress,logged,first-run}-card.tsx`
- `apps/mobile/src/features/member/plan/` sections as needed

## Files modified

- `apps/mobile/app/_layout.tsx`
- All redirect stubs: `apps/mobile/app/tracking.tsx`, `apps/mobile/app/tracking-entry.tsx`, `apps/mobile/app/tracking-history.tsx`, `apps/mobile/app/plans/index.tsx`, `apps/mobile/app/more.tsx`
- Removal of `<BottomNav />` from member screens

## Files deleted

None directly — redirect stubs remain. Plan #11 removes the stubs and the `legacy.tsx` BottomNav once all migrations are done.

## Acceptance criteria

- [ ] Member tab bar shows Home / Plan / Scan / You with correct icons and badges.
- [ ] Home renders **one** primary card for each of the 8 states (verify each by mocking `useMemberHome` returns).
- [ ] Banners only render when their conditions are met and respect dismissal storage.
- [ ] Tapping Plan tab from anywhere returns the user to the Plan tab (not always plan list root).
- [ ] Back button behavior: in any tab, back returns to previous app screen or exits to OS; never jumps between tabs.
- [ ] Old `/more` redirects to `/you` (eventual final destination); other redirects work.
- [ ] No member screen renders `<BottomNav />` directly.
- [ ] `app/(member)/index.tsx` under 150 lines (was 1,061).
- [ ] `pnpm -w typecheck` clean.
- [ ] `pnpm -w test --filter @zook/mobile` clean.
- [ ] Manual: cold-launch as a member with no membership → no-org card; expire membership → expired card; assign today's workout → workout card; start session → in-progress; log → logged card.

## What this plan does NOT do

- Does not rewrite `scan.tsx` internals (1,058 lines — separate work).
- Does not consolidate profile/settings/membership (plan #10).
- Does not delete `legacy.tsx` `memberTabs` (plan #11).
- Does not change shop, notifications, assistant — they remain accessible from You.
