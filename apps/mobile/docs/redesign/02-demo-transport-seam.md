# Plan 02 — Demo Mode Behind The Transport Seam

## Goal

Push all demo-mode logic down to the `apiClient` transport layer. Above the transport, no code knows whether it's talking to a real backend or to in-memory fixtures. Add a persistent "Demo data" banner so users can never confuse fake data with real data.

## Why

`isOfflineDemoMode()` is currently checked from many places. UI code has implicit fallbacks like `data ?? sampleFallback` that hide real backend failures behind sample data. This is the root cause of "some things are false and may not be working." After this plan, there is one seam: the transport. Everything above the transport is identical between demo and prod.

## Current state

- `apps/mobile/src/lib/runtime-mode.ts` — exports `isOfflineDemoMode()`.
- `apps/mobile/src/lib/demo-mode.ts` (152 lines) — fixtures resolution, role override.
- `apps/mobile/src/lib/demo-api.ts` (849 lines) — fixture data + handlers.
- `apps/mobile/src/lib/api-client.tsx` — the HTTP client (read it; this plan modifies it).
- `apps/mobile/src/lib/domain-api.ts` — typed domain APIs (`memberApi`, `trainerApi`, `ownerApi`, `receptionApi`, `attendanceApi`, `plansApi`, `shopApi`, `gymApi`, `paymentsApi`, `notificationsApi`, `pushApi`, `privacyApi`, `aiApi`). Each currently calls `apiClient`. **All of these stay; their behavior is unchanged.**
- Plan #01 must land first (so demo identifier sniffing is already removed from auth).

## Architectural target

```
screens / hooks / domain-api  <─── unaware of demo mode
                │
                ▼
            apiClient
        (transport seam)
        ┌────┴────┐
        ▼         ▼
   real fetch   demo fixtures
   (prod)       (dev only)
```

## Execution steps

### Step 1 — Audit all current `isOfflineDemoMode` callers

Run: `git grep -n "isOfflineDemoMode\|isOfflineDemoIdentifier\|getOfflineDemo" apps/mobile/src apps/mobile/app`.

For each call site, classify:

- **Transport-layer (keep)** — calls inside `api-client.tsx`, `domain-api.ts`, or that resolve env / initial route. These remain.
- **UI fallback (remove)** — anywhere a component renders different content if demo. These get deleted; the UI now renders whatever the transport returned.
- **Auth-layer (remove)** — already addressed in plan #01.

Write the audit results into a comment block at the top of `apps/mobile/src/lib/runtime-mode.ts` as a temporary checklist, then work through it. Delete the comment when done.

### Step 2 — Make `apiClient` the demo seam

In `apps/mobile/src/lib/api-client.tsx`:

- At construction time, check `isOfflineDemoMode()` once.
- If demo: `request<T>(...)` is implemented by dispatching to handlers defined in `demo-api.ts`.
- If real: existing `fetch` path.
- Caller signature does not change. All `domain-api.ts` and downstream code is identical.

Concretely:

```ts
// apps/mobile/src/lib/api-client.tsx (sketch)
import { isOfflineDemoMode } from "./runtime-mode";

type Transport = {
  request<T>(opts: RequestOptions): Promise<T>;
};

const transport: Transport = isOfflineDemoMode()
  ? createDemoTransport()
  : createHttpTransport();

export const apiClient = {
  request: <T,>(opts: RequestOptions) => transport.request<T>(opts),
};
```

`createDemoTransport` lives in `demo-api.ts`. It exports a single function that returns a `Transport`. Existing handler dispatch tables in `demo-api.ts` stay; we just put a clean public API on top.

### Step 3 — Remove `demo-api.ts` UI fallbacks

Inside `demo-api.ts`, any code that returns "sample" data must do so only as the result of an API call routed through the demo transport — never as a fallback inside a React component. If you find sample-data fallbacks inside screen files, delete them; the demo transport already returns the right shape.

Specific files known to mix demo fallbacks into UI (verify and clean):
- `apps/mobile/app/index.tsx` (member home)
- `apps/mobile/app/membership.tsx`
- `apps/mobile/src/components/home/cards.tsx`

For each: find any `??` / ternary that branches on demo state and remove the demo branch.

### Step 4 — Strip demo bundles from production builds

In `apps/mobile/metro.config.js` (or `babel.config.js`, whichever the project uses for define-replace; check both):

- Add an env-driven flag: `process.env.EXPO_PUBLIC_INCLUDE_DEMO = "true"` or `"false"`.
- When false, replace `import "@/lib/demo-api"` with an empty module via Metro `resolver` rules.
- The `createDemoTransport` function in `api-client.tsx` is then unreachable code and is tree-shaken.
- Production builds (App Store / Play Store) MUST set this to false.

Document this in `apps/mobile/docs/redesign/02-demo-transport-seam.md` (this file) under "Build configuration" below.

**Build configuration:**
- Dev / Expo Go: `EXPO_PUBLIC_INCLUDE_DEMO=true` (default in `.env.development`)
- Preview / TestFlight internal: `true`
- App Store / Play Store: `false` (set in CI build config)

### Step 5 — Add the persistent "Demo data" banner

**File:** `apps/mobile/src/components/demo-banner.tsx` (new)

```tsx
import { Text, View } from "react-native";
import { useRoleContext } from "@/lib/role-context";
import { colors, spacing, typography } from "@/lib/theme";

export function DemoBanner() {
  const ctx = useRoleContext();
  if (!ctx?.isDemo) return null;
  return (
    <View accessibilityRole="alert" style={{
      backgroundColor: colors.warning,
      paddingVertical: 6,
      paddingHorizontal: spacing.md,
    }}>
      <Text style={{ color: colors.ink, ...typography.bodySmall, textAlign: "center", fontWeight: "600" }}>
        Demo data — not your real gym
      </Text>
    </View>
  );
}
```

Mount it once in `apps/mobile/app/_layout.tsx` just below the auth provider, above the navigation stack. It auto-hides in production builds because `isDemo` will always be false.

### Step 6 — Update Storybook / dev tools entry points

If `apps/mobile/src/components/primitives/mobile-ux-primitives.stories.tsx` references demo identifiers, update it to use the explicit override path. Otherwise, no changes.

## Files created

- `apps/mobile/src/components/demo-banner.tsx`

## Files modified

- `apps/mobile/src/lib/api-client.tsx`
- `apps/mobile/src/lib/demo-api.ts`
- `apps/mobile/src/lib/runtime-mode.ts` (only if needed for env wiring)
- `apps/mobile/metro.config.js` (and/or `babel.config.js`)
- `apps/mobile/app/_layout.tsx`
- UI files with demo fallbacks (discovered in Step 1)

## Files deleted

None directly. The `EXPO_PUBLIC_INCLUDE_DEMO=false` build config makes `demo-api.ts` and `demo-mode.ts` unreachable in production bundles.

## UI fixes shipped with this plan

- Demo banner always visible when demo is on — kills "things look fake or wrong" confusion.
- No more silent fallback data. If the real API errors, the user sees the real error state, not stale fake data.

## Acceptance criteria

- [ ] `git grep "isOfflineDemoMode\|isOfflineDemoIdentifier" apps/mobile/app apps/mobile/src/components` returns **zero** matches. All references are in `apps/mobile/src/lib/{api-client,demo-api,demo-mode,runtime-mode}.tsx`.
- [ ] Setting `EXPO_PUBLIC_DEMO=true` produces a session with fixture data and shows the yellow banner.
- [ ] Setting `EXPO_PUBLIC_DEMO=false` makes the banner gone and the app calls the real API.
- [ ] Production bundle (`pnpm --filter @zook/mobile build:ios` or equivalent) does not include `demo-api.ts` in its output. Verify via `npx expo export` then grep the bundle.
- [ ] `pnpm -w typecheck` clean.
- [ ] `pnpm -w test --filter @zook/mobile` clean.
- [ ] Manual: in demo mode, log in as each role (MEMBER, TRAINER, OWNER, RECEPTIONIST) via the explicit override and confirm each role's home screen renders with fixture data.

## What this plan does NOT do

- Does not refactor `demo-api.ts` internals (handler dispatch table can stay messy; another plan can clean it later).
- Does not change which screens display what; only changes how data is sourced.
- Does not touch tests for demo helpers — but adapt them if interfaces change.
