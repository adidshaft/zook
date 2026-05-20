# Plan 10 — "You" Surface Consolidation

## Goal

Unify the member's identity / settings / membership / shop / notifications / assistant / gym / referral surfaces into one **You** tab with a tidy hierarchy. Replace the placeholder `app/(member)/you.tsx` from plan #09 with the real surface. Rewrite `settings.tsx` (594 lines) into a grouped sub-stack. Push `membership.tsx` (1,278 lines) down into a detail screen, not a top-level destination.

## Why

Today profile (`profile.tsx` 895 lines), settings (`settings.tsx` 594), membership (`membership.tsx` 1,278), notifications (`notifications/index.tsx`), shop, assistant are six separate top-level destinations. They overlap (membership ↔ profile both show the user's gym affiliation; settings ↔ profile both edit account details). The user has no mental anchor for "where do I find X."

After this plan, the answer to "where is X" is: **You** tab → scroll. Detail screens are pushed from there.

## Prerequisites

- Plan #03 (theme) merged.
- Plan #09 (member shell) merged — provides `(member)/you.tsx`.

## You surface structure

```
┌─ You ────────────────────────────────────┐
│ Identity card                            │
│   avatar · name · gym affiliation        │
│   "Edit profile" link                    │
├──────────────────────────────────────────┤
│ Membership                               │
│   Active plan · expires in X days        │
│   "View membership" → detail             │
├──────────────────────────────────────────┤
│ Quick actions (grid 2×N)                 │
│   [Notifications] [Shop]                 │
│   [Assistant]     [Gym profile]          │
│   [Referral]      [Tracking history]     │
├──────────────────────────────────────────┤
│ Settings                                 │
│   Account                          ›     │
│   Appearance (Light)               ›     │
│   Notifications                    ›     │
│   Language (English)               ›     │
│   Privacy                          ›     │
│   Help & support                   ›     │
├──────────────────────────────────────────┤
│ Switch role (if available)         ›     │
│ Sign out                                 │
└──────────────────────────────────────────┘
```

Each group is a section. Tappable rows push to detail screens.

## Settings restructure

Today `settings.tsx` is a 594-line flat list. Restructure into:

```
apps/mobile/app/settings/
├── index.tsx                — section index (Account, Appearance, etc.)
├── account.tsx              — name, email, password change, biometric
├── appearance.tsx           — theme preference, default role
├── notifications.tsx        — push notification preferences
├── language.tsx             — i18n
├── privacy.tsx              — data export, account deletion, privacy controls
└── support.tsx              — help, contact, version, legal links
```

Each section file is under 250 lines. The 594-line `settings.tsx` is gone.

## Identity / Profile

Today `profile.tsx` (895 lines) is the "edit my account" surface but also reads a lot like a profile *view*. Split:

```
apps/mobile/app/profile/
├── index.tsx                — read-only profile view (avatar, name, gym, stats summary)
├── edit.tsx                 — edit form (name, email, phone, dob, photo)
├── photo.tsx                — photo capture/upload sub-flow (separate route — already exists?)
└── extra-fields.tsx         — the existing profile-extra-fields component, as a route
```

The `app/profile.tsx` route becomes `app/profile/index.tsx` (read view). Edits go through `/profile/edit`.

Note: existing `apps/mobile/src/components/profile/profile-extra-fields.tsx` already exists. Re-use it; don't rewrite.

## Membership

`membership.tsx` is **1,278 lines**. It includes:
- View active membership details
- View past memberships
- Purchase flow (plan picker → checkout)
- Receipt view

Rewrite as:

```
apps/mobile/app/membership/
├── index.tsx                — active membership detail
├── history.tsx              — past memberships
├── buy.tsx                  — plan picker
├── checkout.tsx             — checkout (extracted)
└── receipt/[paymentId].tsx  — receipt view
```

Each file under 350 lines.

## Execution steps

### Step 1 — Build the You screen

Replace the placeholder `apps/mobile/app/(member)/you.tsx` with the real surface.

```tsx
import { Stack, Link, router } from "expo-router";
import { ScrollView, View, Text, Pressable } from "react-native";
import {
  ZookScreen,
  GlassCard,
  ListRow,
  SectionHeader,
  SecondaryButton,
} from "@/components/primitives";
import { useMemberHome } from "@/lib/domains/member";
import { useRoleContext, useCanSwitchRole } from "@/lib/role-context";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { useMyNotifications } from "@/lib/domains/notifications";
import { IdentityCard } from "@/features/member/you/identity-card";
import { MembershipSummary } from "@/features/member/you/membership-summary";
import { QuickActionGrid } from "@/features/member/you/quick-action-grid";

export default function YouScreen() {
  const home = useMemberHome();
  const { palette } = useTheme();
  const { logout } = useAuth();
  const ctx = useRoleContext();
  const canSwitch = useCanSwitchRole();
  const notif = useMyNotifications();
  const unread = notif.data?.notifications?.filter((n) => !n.readAt).length ?? 0;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ZookScreen testID="member-you">
        <ScrollView>
          <IdentityCard user={ctx?.user} org={ctx?.org} onEdit={() => router.push("/profile/edit")} />
          <MembershipSummary
            membership={home.data?.activeMembership}
            onViewDetail={() => router.push("/membership")}
          />
          <QuickActionGrid unreadCount={unread} />
          <SectionHeader title="Settings" />
          <GlassCard>
            <ListRow title="Account" onPress={() => router.push("/settings/account")} chevron />
            <ListRow title="Appearance" subtitle={titleCase(useTheme().preference)} onPress={() => router.push("/settings/appearance")} chevron />
            <ListRow title="Notifications" onPress={() => router.push("/settings/notifications")} chevron />
            <ListRow title="Language" onPress={() => router.push("/settings/language")} chevron />
            <ListRow title="Privacy" onPress={() => router.push("/settings/privacy")} chevron />
            <ListRow title="Help & support" onPress={() => router.push("/settings/support")} chevron />
          </GlassCard>
          {canSwitch ? (
            <SecondaryButton icon="swap-horizontal" onPress={() => /* open role switcher sheet */}>
              Switch role
            </SecondaryButton>
          ) : null}
          <SecondaryButton icon="log-out-outline" onPress={() => void logout()}>
            Sign out
          </SecondaryButton>
        </ScrollView>
      </ZookScreen>
    </>
  );
}
```

Extract sub-components:
- `apps/mobile/src/features/member/you/identity-card.tsx`
- `apps/mobile/src/features/member/you/membership-summary.tsx`
- `apps/mobile/src/features/member/you/quick-action-grid.tsx`

### Step 2 — Split settings.tsx

1. Create `apps/mobile/app/settings/` folder.
2. Move the existing `settings.tsx` content into `settings/index.tsx` as a section index (just a list of rows that push to subroutes).
3. Create each subroute file. Lift the corresponding existing settings sections from the old file into each.
4. Delete the old `apps/mobile/app/settings.tsx`.

**Appearance** screen (`settings/appearance.tsx`) is where:
- Theme preference picker (System / Light / Dark) lives. Wire to `useTheme().preference` and `setPreference`.
- Default role picker — only visible if user has multiple roles. Wire to `useAuth().setDefaultRole`.

**Account** screen (`settings/account.tsx`):
- Name, email, phone, password change, biometric toggle.

**Notifications** screen (`settings/notifications.tsx`):
- The existing `notification-preferences.ts` is already a thing — use it. List of push categories with toggles.

**Privacy** screen (`settings/privacy.tsx`):
- Data export, account deletion request, marketing opt-outs.

**Support** screen (`settings/support.tsx`):
- App version, links to help center, contact form, legal (Terms, Privacy Policy).

### Step 3 — Split profile.tsx

1. Create `apps/mobile/app/profile/` folder.
2. Move the read-mostly portions of `profile.tsx` into `profile/index.tsx`.
3. Move the edit form into `profile/edit.tsx`.
4. If photo capture is currently inline, move to `profile/photo.tsx`.
5. Delete old `apps/mobile/app/profile.tsx`.

### Step 4 — Split membership.tsx

1. Create `apps/mobile/app/membership/` folder.
2. Move active membership view into `membership/index.tsx`.
3. Move history list into `membership/history.tsx`.
4. Move plan picker into `membership/buy.tsx`.
5. Move checkout into `membership/checkout.tsx`.
6. Move receipt into `membership/receipt/[paymentId].tsx`.
7. Delete old `apps/mobile/app/membership.tsx`.

Each detail file under 350 lines.

### Step 5 — Notifications surface stays where it is

`apps/mobile/app/notifications/index.tsx` and `notifications/[id].tsx` are already separate. Verify they still work after route changes. The notifications surface is accessed from the You tab's "Notifications" quick action.

### Step 6 — Update back-compat redirects

Old top-level routes that are now subroutes need redirects:
- `/profile` → `/profile/index` (Expo Router handles this automatically since `/profile/index.tsx` resolves to `/profile`)
- `/settings` → `/settings/index` (same)
- `/membership` → `/membership/index` (same)
- `/more` → `/you` (created in plan #09 as redirect — verify it still points correctly)

### Step 7 — Update root `_layout.tsx`

Existing entries:
```tsx
<Stack.Screen name="profile" />
<Stack.Screen name="settings" />
<Stack.Screen name="membership" />
```

These continue to work for the folder routes. Verify with `npx expo doctor` or running the app.

### Step 8 — Theme migration for touched files

Every file rewritten in this plan must use `useTheme()` palette and stop using `@deprecated` color tokens.

## UI fixes shipped with this plan

- One coherent identity surface — no more hunting between Profile, Settings, Account, Membership for related actions
- Settings is grouped, not a flat 594-line list
- Membership is no longer top-level; it's a section on You with detail pushed from there
- Theme preference picker actually accessible (it was hidden in a 594-line file)
- Default-role pinning UI now exists (was storage-only after plan #01)
- Switch-role from You for multi-role users (one tap instead of finding the header chip)
- Quick action grid surfaces the actions that used to be buried in `more.tsx`

## Files created

- `apps/mobile/src/features/member/you/identity-card.tsx`
- `apps/mobile/src/features/member/you/membership-summary.tsx`
- `apps/mobile/src/features/member/you/quick-action-grid.tsx`
- `apps/mobile/app/settings/index.tsx`
- `apps/mobile/app/settings/account.tsx`
- `apps/mobile/app/settings/appearance.tsx`
- `apps/mobile/app/settings/notifications.tsx`
- `apps/mobile/app/settings/language.tsx`
- `apps/mobile/app/settings/privacy.tsx`
- `apps/mobile/app/settings/support.tsx`
- `apps/mobile/app/profile/index.tsx`
- `apps/mobile/app/profile/edit.tsx`
- `apps/mobile/app/profile/photo.tsx` (if applicable)
- `apps/mobile/app/profile/extra-fields.tsx` (if applicable)
- `apps/mobile/app/membership/index.tsx`
- `apps/mobile/app/membership/history.tsx`
- `apps/mobile/app/membership/buy.tsx`
- `apps/mobile/app/membership/checkout.tsx`
- `apps/mobile/app/membership/receipt/[paymentId].tsx`

## Files modified

- `apps/mobile/app/(member)/you.tsx` (rewritten from placeholder)
- `apps/mobile/app/_layout.tsx` (if route entries need adjustment)

## Files deleted

- `apps/mobile/app/settings.tsx`
- `apps/mobile/app/profile.tsx`
- `apps/mobile/app/membership.tsx`

## Acceptance criteria

- [ ] You tab renders identity card, membership summary, quick action grid, settings section, sign out.
- [ ] All 6 settings subroutes are accessible and functional.
- [ ] Appearance subroute changes theme live.
- [ ] Default role subroute persists across app reloads.
- [ ] Membership index shows active membership; Buy flow walks plan picker → checkout → receipt.
- [ ] `apps/mobile/app/settings.tsx`, `profile.tsx`, `membership.tsx` no longer exist.
- [ ] No file in `apps/mobile/app/{settings,profile,membership}/` exceeds 350 lines.
- [ ] `pnpm -w typecheck` clean.
- [ ] `pnpm -w test --filter @zook/mobile` clean.
- [ ] Manual: walk from You → each section → back. Sign out and re-login. Buy a plan in demo mode.

## What this plan does NOT do

- Does not change notifications surface beyond access path.
- Does not redesign the membership purchase flow — only re-files it.
- Does not touch shop, assistant, gym, find-gyms, attendance routes — those stay as separate destinations, accessed via You quick actions or deep links.
