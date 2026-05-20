# Plan 05 — Reception Routing Rewrite (Template)

## Goal

Split the 2,048-line `apps/mobile/app/reception.tsx` mega-screen into a `reception/` route group with one file per surface. Eliminate the `?view=desk|members|payments|orders` query param routing. Replace the role-keyed `BottomNav` with a **real** tab bar that lives inside `reception/_layout.tsx`.

**This is the template plan for #06 (Owner) and #07 (Trainer).** Get this right and the next two follow the same recipe.

## Why

- 2,048 lines, 4 views in one file. Back button is broken across "tabs." Filters and modals bleed across views. Every view shares a React tree → unrelated re-renders.
- `?view=` is a query param hack pretending to be navigation. Deep linking is opaque. Each "tab" needs its own scroll position, its own data scope, its own back stack.
- Desk approval queue is the highest-frequency surface in the entire product. It deserves to be `/reception` directly, not buried as `?view=desk`.

## Prerequisites

- Plan #01 (auth context) must be merged — this plan uses `useRoleContext()` and permission gating.
- Plan #04 (domain split) must be merged — this plan imports from `@/lib/domains/reception` and `@/lib/domains/attendance`.

## Current state

- `apps/mobile/app/reception.tsx` — 2,048 lines. Component named `Reception`. Internal state machine on `view: DeskView = "desk" | "members" | "payments" | "orders"` (line 55).
- Inline helpers at file top: `normalizeView` (89), `deskReasonCopy` (95), `redactPhone` (100), `ageLabel` (105), `phoneRevealStorageKey` (118), `paymentModes` (75), `reasonSuggestions` (83).
- Inline `VerificationResult` component at line 1564.
- `BottomNav` rendered at the bottom; uses role-based tab discovery from `legacy.tsx`.
- The 4 "views" branch at lines 738 (desk), 932 (members), 1164 (payments), 1356 (orders).
- Bottom nav definitions for reception live at `apps/mobile/src/components/primitives/foundation.tsx:2084` (`receptionTabs`).

## Architectural target

```
apps/mobile/app/reception/
├── _layout.tsx                    — Stack + reception tab bar
├── index.tsx                      — Desk queue (was view=desk)
├── members.tsx                    — Members list (was view=members)
├── members/[id].tsx               — Member detail (new — replaces inline drilldown)
├── payments.tsx                   — Payments (was view=payments)
├── payments/new.tsx               — Record payment sheet (was inline modal)
├── orders.tsx                     — Orders (was view=orders)
└── verification/[recordId].tsx    — Verification result (was VerificationResult inline)

apps/mobile/src/features/reception/   (new — extracted helpers + components)
├── helpers.ts                     — normalize, redactPhone, ageLabel, deskReasonCopy
├── constants.ts                   — paymentModes, reasonSuggestions
└── components/
    ├── desk-queue-card.tsx
    ├── desk-header.tsx
    ├── member-row.tsx
    ├── payment-mode-grid.tsx
    └── verification-result.tsx
```

## Bottom tab bar

Instead of using the role-keyed `BottomNav` from `legacy.tsx`, build a **local tab bar** that lives in `reception/_layout.tsx` and uses Expo Router's `Tabs`:

```tsx
// apps/mobile/app/reception/_layout.tsx
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useHasPermission } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { useOrgAttendancePending } from "@/lib/domains/attendance";

export default function ReceptionLayout() {
  const { palette } = useTheme();
  const canTakePayments = useHasPermission("PAYMENTS_CREATE");
  const canViewOrders = useHasPermission("ORDERS_VIEW");

  const pendingQuery = useOrgAttendancePending();
  const pendingCount =
    pendingQuery.data?.records.filter((r) => r.status === "PENDING_APPROVAL").length ?? 0;

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
          title: "Desk",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "desktop" : "desktop-outline"} size={22} color={color} />
          ),
          tabBarBadge: pendingCount > 0 ? pendingCount : undefined,
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
        name="payments"
        options={{
          title: "Payments",
          href: canTakePayments ? "/reception/payments" : null,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "card" : "card-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "Orders",
          href: canViewOrders ? "/reception/orders" : null,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "cube" : "cube-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="members/[id]" options={{ href: null }} />
      <Tabs.Screen name="payments/new" options={{ href: null, presentation: "modal" }} />
      <Tabs.Screen name="verification/[recordId]" options={{ href: null }} />
    </Tabs>
  );
}
```

Permission-gated visibility uses `href: null` to hide tabs the user can't access (no permission → tab does not render).

## Execution steps

### Step 1 — Extract helpers and constants

Create `apps/mobile/src/features/reception/helpers.ts`:

```ts
export function normalizeView(/* keep existing logic */) { /* … */ }
export function deskReasonCopy(reason?: string | null) { /* … */ }
export function redactPhone(phone?: string | null) { /* … */ }
export function ageLabel(dateOfBirth?: string | null) { /* … */ }
export function phoneRevealStorageKey(orgId?: string | null) { /* … */ }
```

(Copy verbatim from `reception.tsx:89-122`. `normalizeView` may become unused — keep for now, plan #11 deletes if unused.)

Create `apps/mobile/src/features/reception/constants.ts`:

```ts
export const paymentModes: Array<{ label: string; value: DeskPaymentMode }> = [/* from reception.tsx:75 */];
export const reasonSuggestions = [/* from reception.tsx:83 */];
```

### Step 2 — Extract inline components

`apps/mobile/src/features/reception/components/verification-result.tsx`:
- Copy the `VerificationResult` component (`reception.tsx:1564-1607`).
- Make it a named export.
- Replace any direct theme imports with `useTheme()` palette per plan #03.

`apps/mobile/src/features/reception/components/desk-header.tsx`:
- Extract the `deskHeader` JSX block (`reception.tsx:651-735`).
- Props: `view?: never` (no longer needed; the route is the view), `memberContext?: MemberContext` for the contextual second row.

`apps/mobile/src/features/reception/components/desk-queue-card.tsx`:
- Extract each item in the `approval-queue` block (`reception.tsx:842-930`).
- Props: `record: AttendanceRecord`, `onApprove`, `onReject`, `onReveal`, `onMember`.

`apps/mobile/src/features/reception/components/member-row.tsx`:
- Extract from `reception.tsx:1065-1163`.
- Props: `member`, `phoneRevealed`, `onPress`, `onReveal`.

`apps/mobile/src/features/reception/components/payment-mode-grid.tsx`:
- Extract from `reception.tsx:1263+`.

### Step 3 — Move reception.tsx to subroute group

Create `apps/mobile/app/reception/_layout.tsx` (from template above).

### Step 4 — Build `app/reception/index.tsx` (Desk)

Lift only the desk-view rendering from current `reception.tsx` (lines 738–930 plus the heading and headers). Target shape:

```tsx
import { Stack } from "expo-router";
import { ScrollView, View, RefreshControl } from "react-native";
import { ZookScreen, EmptyState, GlassCard } from "@/components/primitives";
import { useOrgAttendancePending } from "@/lib/domains/attendance";
import { useApproveAttendance, useRejectAttendance } from "@/lib/domains/attendance";
import { DeskHeader } from "@/features/reception/components/desk-header";
import { DeskQueueCard } from "@/features/reception/components/desk-queue-card";
import { DemoBanner } from "@/components/demo-banner";

export default function ReceptionDeskScreen() {
  const queue = useOrgAttendancePending();
  const approve = useApproveAttendance();
  const reject = useRejectAttendance();

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ZookScreen testID="reception-desk-screen">
        <DemoBanner />
        <ScrollView
          refreshControl={<RefreshControl refreshing={queue.isRefetching} onRefresh={queue.refetch} />}
        >
          <DeskHeader />
          {queue.data?.records.length === 0 ? (
            <EmptyState title="Queue is clear" subtitle="No pending approvals" icon="checkmark-done" />
          ) : (
            <View testID="reception-approval-queue">
              {queue.data?.records.map((record) => (
                <DeskQueueCard
                  key={record.id}
                  record={record}
                  onApprove={() => approve.mutate(record.id)}
                  onReject={() => reject.mutate(record.id)}
                />
              ))}
            </View>
          )}
        </ScrollView>
      </ZookScreen>
    </>
  );
}
```

Target line count: under 200 lines. If you're above that, extract more components.

### Step 5 — Build `app/reception/members.tsx`

Lift members-view (lines 932–1163). Same shape as Step 4. Use `MemberRow` extracted in Step 2.

Tap on a row → `router.push("/reception/members/[id]", { id: member.id })`.

### Step 6 — Build `app/reception/members/[id].tsx` (new)

Member detail. Previously the member context drawer at `reception.tsx:716-733` was inline. This becomes a full route:
- Shows the member's profile snapshot
- Phone reveal (uses `phoneRevealStorageKey` helper)
- Recent attendance
- Quick actions: "Approve next check-in," "Start payment," "View profile" (deep link to admin/member detail if owner)

### Step 7 — Build `app/reception/payments.tsx`

Lift payments-view (lines 1164–1355).

Permission gate at the layout level (`href: canTakePayments ? ... : null`) handles tab visibility. The screen itself still defensively checks permission for actions.

### Step 8 — Build `app/reception/payments/new.tsx`

The "record payment" form was an inline sheet (`reception.tsx:1480-1563`). Move to a modal route:
- `presentation: "modal"` in layout
- Form fields: member picker, amount, mode (using `PaymentModeGrid`), reason (using `reasonSuggestions`)
- On submit: call `useRecordPayment` from `domains/payments`, then `router.back()`

### Step 9 — Build `app/reception/orders.tsx`

Lift orders-view (lines 1356–1479).

### Step 10 — Build `app/reception/verification/[recordId].tsx`

Render `VerificationResult` extracted in Step 2. Route is hit after a QR scan that needs verification: existing scan flow links to `/reception?verify=...` — update those callers to `router.push("/reception/verification/[recordId]", { recordId })`.

Search for existing callers:
```
git grep -n "verify\|VerificationResult" apps/mobile
```

### Step 11 — Migrate root layout

In `apps/mobile/app/_layout.tsx`:
- Replace the `<Stack.Screen name="reception" />` entry with `<Stack.Screen name="reception" />` pointing at the new layout (no path change needed; Expo Router picks up the folder).
- Delete the old `apps/mobile/app/reception.tsx` file **only after** the new tree builds and renders correctly.

### Step 12 — Update bottom nav references

In `apps/mobile/src/components/primitives/foundation.tsx`, `receptionTabs` at line 2084 becomes unused once `reception/_layout.tsx` owns its own tabs. Mark it `@deprecated` but leave it — plan #11 deletes role-keyed tabs entirely.

Update `getTabsForRole` (line 2192): when role is RECEPTIONIST, the old code returns `receptionTabs`. After this plan, RECEPTIONIST users live inside `reception/_layout.tsx` which has its own tabs — they should never hit the global `BottomNav`. Add an early return: if `pathname.startsWith("/reception")`, the global `BottomNav` renders nothing.

Concretely, modify `BottomNav` (line 2337) to short-circuit:
```tsx
if (pathname.startsWith("/reception") || pathname.startsWith("/owner") || pathname.startsWith("/trainer")) {
  return null;  // role layouts own their own tabs
}
```

(Owner and trainer get the same treatment in plans #06 and #07, but adding all three here is fine — those routes still exist as mega-screens until plans #06/#07 land. The short-circuit just means those mega-screens lose their bottom bar momentarily; they'll get one back inside their own layout.)

**Caveat:** if plans #06/#07 aren't landing immediately after #05, only short-circuit `/reception` for now and leave the other two paths alone. The exact decision is the implementing agent's — note in PR description.

### Step 13 — Back-compat redirects

Old deep links to `/reception?view=members` should still work. Add a redirect file:

```tsx
// apps/mobile/app/reception/_compat.tsx (NEW)
// Not actually a route — but we add logic in _layout.tsx to honor old ?view= params.
```

In `app/reception/_layout.tsx`:

```tsx
useEffect(() => {
  const view = Array.isArray(params.view) ? params.view[0] : params.view;
  if (!view) return;
  const map: Record<string, string> = {
    members: "/reception/members",
    payments: "/reception/payments",
    orders: "/reception/orders",
  };
  const target = map[view];
  if (target) router.replace(target as never);
}, [params.view]);
```

(Add to `_layout.tsx` only if the layout component is allowed to run `useEffect`. If not, do it at `index.tsx` top-level.)

### Step 14 — Migrate theme imports for touched files

Every reception screen / component touched in this plan must:
- Import palette via `useTheme()` (per plan #03 reference pattern in `buttons.tsx`)
- Stop using `@deprecated` color aliases (`colors.bg`, `colors.text`, `colors.muted`, `colors.subtle`, `colors.panel`, `colors.lime`)

## UI fixes shipped with this plan

- Real tab navigation (back button works correctly within Reception)
- Real tab bar with badge on Desk for pending count (was inline)
- Desk queue empty state when no pending approvals (was missing — felt broken)
- Modal "record payment" instead of inline sheet (better keyboard handling)
- Each view has independent scroll position and refresh state (no more "I scrolled members, switched to payments, came back, scrolled gone")
- Verification result is now a dedicated screen, deep-linkable, shareable
- Light/dark theme fully applies

## Files created

- `apps/mobile/app/reception/_layout.tsx`
- `apps/mobile/app/reception/index.tsx`
- `apps/mobile/app/reception/members.tsx`
- `apps/mobile/app/reception/members/[id].tsx`
- `apps/mobile/app/reception/payments.tsx`
- `apps/mobile/app/reception/payments/new.tsx`
- `apps/mobile/app/reception/orders.tsx`
- `apps/mobile/app/reception/verification/[recordId].tsx`
- `apps/mobile/src/features/reception/helpers.ts`
- `apps/mobile/src/features/reception/constants.ts`
- `apps/mobile/src/features/reception/components/verification-result.tsx`
- `apps/mobile/src/features/reception/components/desk-header.tsx`
- `apps/mobile/src/features/reception/components/desk-queue-card.tsx`
- `apps/mobile/src/features/reception/components/member-row.tsx`
- `apps/mobile/src/features/reception/components/payment-mode-grid.tsx`

## Files modified

- `apps/mobile/app/_layout.tsx` — `<Stack.Screen name="reception" />` references the new layout
- `apps/mobile/src/components/primitives/foundation.tsx` — `BottomNav` short-circuits for `/reception/*`, `receptionTabs` marked `@deprecated`
- `apps/mobile/src/lib/route-guards.ts` — add subroute entries:
  ```ts
  "/reception/members": "MEMBERS_VIEW",
  "/reception/payments": "PAYMENTS_CREATE",
  "/reception/orders": "ORDERS_VIEW",
  ```
- `apps/mobile/src/lib/route-guards.test.ts` — extend tests for the new subroutes

## Files deleted

- `apps/mobile/app/reception.tsx` (the 2,048-line monster) — deleted as last step, after verifying the new tree renders

## Acceptance criteria

- [ ] `/reception` lands on the Desk queue (was `?view=desk` default).
- [ ] All four tabs visible to a RECEPTIONIST user; permission-gated tabs hidden for users without permission.
- [ ] Badge on Desk tab reflects `pendingCount` and updates after approve/reject.
- [ ] Back button on Members tab returns to the previous app screen, not to Desk (it's a real tab, not a nested route).
- [ ] Scroll position in each tab is preserved when switching tabs and back.
- [ ] Old links `/reception?view=members` redirect to `/reception/members`.
- [ ] Tapping a member row navigates to `/reception/members/[id]`.
- [ ] Verification result screen is reachable via `/reception/verification/[recordId]`.
- [ ] No file in `apps/mobile/app/reception/` exceeds 350 lines.
- [ ] `apps/mobile/app/reception.tsx` no longer exists.
- [ ] `pnpm -w typecheck` clean.
- [ ] `pnpm -w test --filter @zook/mobile` clean.
- [ ] Manual: as RECEPTIONIST, approve a pending check-in, see badge decrement, take a payment, view orders. No console errors.
- [ ] Theme: toggle light/dark in settings — entire reception tree re-themes.

## What this plan does NOT do

- Does not extract `MemberList` as a shared component yet (plan #08 — happens after Owner and Trainer also have member lists to compare with).
- Does not change `attendanceApi` or `receptionApi`.
- Does not redesign the visual layout — copy existing layout, just into new files.
- Does not remove `legacy.tsx` `receptionTabs` (that's plan #11).
