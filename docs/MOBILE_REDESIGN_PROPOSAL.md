# Zook Mobile — Redesign Proposal

**Date:** 2026-05-07
**Author:** Aman + Claude audit
**For:** Codex (implementer) and product review
**Source audit:** Three parallel deep-read agents on `main` covering UX (keyboard, bottom-nav overlap, navigation, collapsibles, loading states), authentication + onboarding + backend stitching, and role-based access control. Findings are file:line specific.

---

## 1. The Problem in One Page

The mobile app has the right shape but the wrong details. Every keyboard-bearing screen lacks `KeyboardAvoidingView` — login, scan desk-code, tracking-entry, assistant, settings, reception, trainer client, find-gyms, plans-feedback. Sticky action bars sit *behind* the bottom-nav on `tracking-entry` and `shop` cart so the primary CTA is half-hidden by the lime "scan" button. The "profile" screen is a one-line re-export of settings — tapping the home avatar drops the user into a 5-section settings form instead of a profile. There's no first-launch onboarding: blank Expo splash → instant `/login` → no value-prop, no permission priming, no privacy/terms, no tour.

The login flow is OTP-only with a single auto-detect field that hardcodes `+91` for phone and offers no Apple, Google, biometric, or password option. The session token has no client-side expiry tracking and no 401 interceptor — a 30-day token silently expires and the user gets a "Membership couldn't load" error instead of being bounced to login. Push permission is never requested at first launch; only when a user toggles a switch in settings they have no reason to find. Universal links are not configured (no `associatedDomains`, no Android `intentFilters`), so `https://app.zookfit.in/join/partner-gym` won't open the app.

**RBAC is broken in two directions.** Forward: the mobile app guards exactly four route prefixes (`/owner`, `/reception`, `/trainer`, `/platform`) and leaves every other route — including `/scan`, `/shop`, `/tracking*`, `/assistant` — wide open to all six roles. Backward: every privileged button (manual override, manual payment, plan publishing, AI generation) is shown unconditionally; the backend 403s and the user gets `Alert.alert("Failed", ...)` with no explanation. The mobile app never imports `@zook/core` permission helpers — it gates on the coarse role enum only, ignoring custom permission overrides.

The role switcher does not invalidate React Query caches; the org switcher does not auto-correct active role; switching org A (OWNER) to org B (MEMBER) leaves `activeRole=OWNER` until the user manually changes it, and every owner mutation 403s. The demo user has all 5 roles statically — useful for QA but it always lands on MEMBER and you cannot easily test a real receptionist's view without env vars. Plans, shop checkout, and trainer-tabs use internal `useState` instead of URL state, so deep links can't land on detail and back-gesture returns to home instead of the list.

Logos are minimal: no splash, no notification icon (Android renders a featureless white blob), no gym logo on the member home (the API returns `logoUrl` but no consumer reads it). Profile capture is shallow — name + fitness goal + contact, no photo upload (`expo-image-picker` not installed), no DOB, no marketing/AI consent UI despite the fields existing.

The redesign below fixes all of this with **6 foundations** (keyboard, layout, navigation, transitions, loading, theming), a **real authentication and onboarding flow**, a **proper profile vs settings split**, **fine-grained RBAC** that mirrors the backend permissions, and a **per-role surface model** that matches the dashboard proposal's three-surface split.

---

## 2. Design Principles

1. **The keyboard is a first-class citizen.** Every input-bearing screen must have `KeyboardAvoidingView` + `keyboardShouldPersistTaps="handled"` + tap-outside-to-dismiss. No exceptions.
2. **The primary action must always be visible and tappable.** Sticky bars never overlap the bottom-nav. The bottom-nav hides during camera and during keyboard-active forms.
3. **URLs are the source of truth.** No more "internal `view` state" for plans detail, shop checkout phases, trainer tabs. Every meaningful state has a URL so push notifications, deep links, and the back gesture all work.
4. **Profile and settings are different things.** Profile is identity (photo, name, membership card, recent activity). Settings is configuration (notifications, language, privacy, system).
5. **RBAC matches the backend.** The mobile app imports `permissionsForRoles()` from `@zook/core` and gates buttons on permissions, not roles. A receptionist who's been granted custom `PAYMENTS_VIEW` sees the payments ledger.
6. **Auth is honest about its options.** Email and phone are separate fields with separate flows. International phone is supported. Biometric session unlock is offered after first login. SSO is added when the backend supports it.
7. **First launch teaches the product.** Splash → 3-screen value prop → permission priming → role-aware first-run card. Never blank-to-login.
8. **No privileged action without re-auth.** Receptionists' manual payments and overrides require biometric/PIN. Phones get left on desks.
9. **Loading is consistent.** Every async screen uses skeleton primitives from a shared kit, not "Loading X..." strings inside random GlassCards.
10. **Demo mode is for QA, never for production.** Legacy `EXPO_PUBLIC_OFFLINE_DEMO` flags die; `EXPO_PUBLIC_API_MODE` is canonical; runtime config errors block the UI before any data leaks.

---

## 3. UX Foundations

These are the cross-cutting fixes. They unblock everything else.

### 3.1 Keyboard handling — a single primitive that wraps every form

Build `apps/mobile/src/components/primitives/keyboard-aware-screen.tsx`:

```tsx
export function KeyboardAwareScreen({ children, scrollViewProps, ...rest }) {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
    >
      <Pressable onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          {...scrollViewProps}
        >
          {children}
        </ScrollView>
      </Pressable>
    </KeyboardAvoidingView>
  );
}
```

Replace the bare `ScrollView` in every keyboard-bearing screen with `KeyboardAwareScreen`. Files affected (per UX audit):

- `login.tsx` (already has KAV but missing tap-outside-dismiss; refactor to use the shared primitive)
- `scan.tsx` (desk-code mode at `:328`)
- `tracking-entry.tsx`
- `assistant.tsx` (composer needs special handling — see 3.5)
- `reception.tsx`
- `trainer/client/[id].tsx`
- `trainer/client/[id]/ai-draft.tsx`
- `find-gyms.tsx`
- `shop.tsx` (search)
- `plans.tsx` (feedback panel at `:265-271`)
- `settings.tsx`
- `owner.tsx` (members search)

For the assistant chat composer specifically: it's absolutely positioned, not in a ScrollView. Keep the absolute layout but add a `Keyboard.addListener("keyboardWillShow"/"keyboardWillHide")` hook that animates `translateY` by `event.endCoordinates.height - insets.bottom`.

### 3.2 Layout constants — replace the hard-coded magic numbers

Today `theme.ts` has:
```ts
bottomNavHeight: 72,
bottomNavContentPadding: 116, // hard-coded, ignores keyboard + dynamic island
stickyActionHeight: 108,
```

Replace with hooks:

```ts
// apps/mobile/src/lib/use-layout-padding.ts
export function useBottomScrollPadding(opts?: { hasStickyAction?: boolean }) {
  const insets = useSafeAreaInsets();
  const navHeight = layout.bottomNavHeight;
  const sticky = opts?.hasStickyAction ? layout.stickyActionHeight : 0;
  return navHeight + sticky + Math.max(insets.bottom, 12) + spacing.md;
}

export function useStickyActionOffset() {
  return layout.bottomNavHeight + spacing.md; // sits above bottom-nav
}
```

Update `StickyActionBar` to default `bottomOffset={layout.bottomNavHeight + spacing.md}` instead of `0`. Audit every call site to remove now-redundant overrides.

### 3.3 Bottom-nav visibility — context-aware, not always rendered

Today the bottom-nav is rendered on screens where it's actively harmful (`tracking-entry` mid-form, `scan` while camera is live, `assistant` competes with composer). Add a context:

```tsx
// apps/mobile/src/components/primitives/bottom-nav-context.tsx
const BottomNavVisibilityContext = createContext<{ visible: boolean; setVisible: (v: boolean) => void }>(...);

export function useHideBottomNav() {
  const { setVisible } = useContext(BottomNavVisibilityContext);
  useEffect(() => { setVisible(false); return () => setVisible(true); }, []);
}
```

Use `useHideBottomNav()` in:
- `tracking-entry.tsx` (form-only screen, no tab-switch mid-workout)
- `scan.tsx` (camera-active mode; restore when user switches to enter-code mode)
- `attendance/[attendanceRecordId].tsx` (result screen — auto-dismisses anyway)
- `trainer/client/[id]/ai-draft.tsx` (focused review surface)
- Whenever the OS keyboard is up (listen to `keyboardDidShow`/`Hide` and toggle visibility automatically)

### 3.4 Navigation — URL state for everything

Replace internal-`useState` view switches with URL state:

| Screen | Today | Fix |
|---|---|---|
| `plans.tsx` | `view = "list" \| "detail"` internal | Move detail to `/plans/[assignmentId]/page.tsx` (already exists at `/plan/[id]` as redirect; flip the relationship) |
| `shop.tsx` | `checkoutState = "browse" \| "cart" \| "checkout" \| "pickup"` internal | `/shop`, `/shop/cart`, `/shop/checkout`, `/shop/pickup/[orderId]` |
| `trainer/client/[id].tsx` | 4 segmented tabs | Keep tabs but mirror to `?tab=summary\|plans\|notes\|progress` |
| `trainer/index.tsx` | already uses `?view=` | Keep |
| `owner.tsx` | already uses `?view=` | Keep |
| `reception.tsx` | already uses `?view=` | Keep |

This unblocks deep-link landing (push notification → `/shop/pickup/order_abc123` opens the right view) and makes the back gesture predictable.

### 3.5 Transitions — modal where it's modal

Today `tracking-entry` and `attendance/[id]` use `slide_from_bottom` push (looks modal-ish but no swipe-down dismiss, no grabber). Convert to `presentation: "modal"` in `_layout.tsx:182-218`:

```tsx
<Stack.Screen name="tracking-entry" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
<Stack.Screen name="attendance/[attendanceRecordId]" options={{ presentation: "modal" }} />
```

Adds: native pull-to-dismiss, OS-level grabber, correct safe-area handling at top.

For other "this is a sheet, not a page" surfaces, use `@gorhom/bottom-sheet`:
- Plan feedback (`plans.tsx:227-279`) — currently inline expanding panel; move to bottom sheet
- Renewal modal (`membership.tsx:609-710`) — already custom Modal; replace with bottom sheet for consistent grabber + backdrop behavior
- Decision-reason on reception (`reception.tsx:443-464`) — currently rendered for queue index 0 only (bug); replace with bottom sheet that opens on any approve-with-reason tap

### 3.6 Loading states — skeleton everywhere, never spinner-text

Two existing skeletons (`HomeSkeleton`, `ShopSkeleton`) prove the pattern works. Build skeletons for:
- `PlansSkeleton` — list of 3 plan cards
- `MembershipSkeleton` — single tall card
- `NotificationsSkeleton` — list of 5 rows
- `OwnerDashboardSkeleton` — 4 metric tiles + 2 list cards
- `ReceptionQueueSkeleton` — 5 queue rows
- `TrainerClientsSkeleton` — list of 5 rows
- `TrackingHistorySkeleton` — chart + list
- `FindGymsSkeleton` — search bar + 5 result cards

Replace every `<GlassCard><ActivityIndicator /><Text>Loading X...</Text></GlassCard>` instance.

### 3.7 Back navigation — every secondary screen has a header back

Add a chevron-back to `MobileHeader.leading` on:
- `find-gyms.tsx`
- `notifications.tsx`
- `tracking.tsx`, `tracking-history.tsx`
- `assistant.tsx`
- `plans.tsx` (when on detail; tab-level plans gets none)
- `shop.tsx` (when on cart/checkout/pickup; browse gets none)
- `membership.tsx`
- `gym/[username].tsx`

Pattern: `router.canGoBack() ? router.back() : router.replace("/")` — already correctly implemented in `tracking-entry.tsx:159` and `attendance/[id]:119`.

### 3.8 Pull-to-refresh — every query-backed list

Add `RefreshControl` (already on `index`, `notifications`) to:
- `plans.tsx`, `tracking.tsx`, `tracking-history.tsx`
- `find-gyms.tsx`
- `shop.tsx` (browse + pickup)
- `membership.tsx`
- `owner.tsx` (every view)
- `reception.tsx` (every view — most critical, live ops)
- `trainer/index.tsx`, `trainer/client/[id].tsx`
- `gym/[username].tsx`

Refresh logic = invalidate the queries on the screen, await refetch, set `refreshing` false. ~5 lines per screen.

### 3.9 Touch targets — 44×44 minimum, hitSlop where layout doesn't allow

Per UX audit, fix:
- `primitives.tsx:2611-2613` — `productAddCompact` (62×32) → grow height or add `hitSlop`
- `primitives.tsx:2635-2640` — `productStepperButton` (30×32) → add `hitSlop={{ top:8, bottom:8, left:8, right:8 }}`
- `tracking-entry.tsx:467-476` — exercise delete button (32×32) → hitSlop
- `index.tsx:632-641` — notification bell (42×42) → hitSlop or grow to 44×44

### 3.10 Mutex collapsibles in settings

`CollapsibleSection` in `primitives.tsx:1626-1665` only exposes `defaultOpen`. Add controlled API:
```tsx
type Props = { open?: boolean; onOpenChange?: (open: boolean) => void; defaultOpen?: boolean; ... };
```
Then in `settings.tsx`, lift state:
```tsx
const [openSection, setOpenSection] = useState<"account" | "notifications" | "language" | "privacy" | "system" | null>("account");
```
Tapping any section's header opens it and closes the other four. The screen never has more than one section expanded.

---

## 4. Authentication & Onboarding

### 4.1 Login — separate fields, multiple methods

Current state: single auto-detect field, OTP-only. Replace with a tabbed login:

```
┌─────────────────────────────┐
│         [Zook logo]          │
│       Welcome to Zook        │
│  Sign in or create account   │
│                              │
│  ┌─────────┬──────────┐      │   ← tab switcher
│  │  Email  │ Phone    │      │
│  └─────────┴──────────┘      │
│                              │
│  email@example.com           │   ← or
│  ┌──┐                        │
│  │+91│ 98765 43210            │   ← phone with country picker
│  └──┘                        │
│                              │
│  [ Send OTP ]                │
│                              │
│  ───── or continue with ────  │
│  [ 🍎 Apple ]  [ G Google ]  │
│                              │
│  By continuing you agree to  │
│  our Terms and Privacy Policy.│
└─────────────────────────────┘
```

- **Two distinct fields** (or one field with explicit Email/Phone tabs above). Auto-detect heuristics fail — ask the user.
- **Country picker** for phone: `react-native-phone-number-input`. Defaults to IN but supports any country.
- **Apple Sign-In** — backend work needed first (`/auth/apple/callback` issuing a session). Mobile uses `expo-apple-authentication` for the native sheet.
- **Google Sign-In** — same backend pattern, mobile uses `@react-native-google-signin/google-signin`.
- **Terms + Privacy links** are required by App Store/Play Store policy. Today they're missing.
- **Biometric session unlock** — after first successful OTP login, prompt: "Unlock Zook with Face ID next time?" Save token reference behind biometric (`expo-local-authentication.authenticateAsync` gate before reading SecureStore on next launch). Toggle in Settings → Account.

### 4.2 OTP screen — keep + improve

Current OTP screen is well-built (auto-fill, paste support, resend cooldown). Add:
- **Auto-submit on 6th digit** (no extra "Verify" tap)
- **Auto-call `Keyboard.dismiss()` on auto-submit** so the screen has time to show the spinner without keypad lingering
- **Specific 429 messaging**: "Too many attempts. Try again in {seconds}s." with countdown
- **Lockout messaging**: "Account temporarily locked for security. Check your email for next steps." (matches backend's 24h lockout behavior in `auth-service.ts:89-100`)
- **"Change sign in" button must dismiss keyboard before layout animation**

### 4.3 Session lifecycle

Fix the 401 silent failure:
1. Persist `expiresAt` to SecureStore on verify-OTP.
2. On app foreground, if `now >= expiresAt - 24h`, re-prompt for OTP gracefully ("Verify it's you to continue").
3. Add a global 401 interceptor in `mobileApiFetch` (`api.ts:96-155`) that:
   - On 401, calls `clearSession()` + `router.replace("/login?reason=expired")`
   - On 403, surfaces a toast "You don't have permission" + navigates back; doesn't kill the session
4. Stop swallowing all `hydrate` errors as logout (`auth.tsx:182-190`); only logout on 401 specifically. Network errors should keep the session and show a "couldn't reach server" banner.

### 4.4 Onboarding — first-launch flow

Build `apps/mobile/app/onboarding/_layout.tsx` and `onboarding/[step].tsx`:

**Step 1 — Splash with logo + wordmark** (Expo's splash extended)
- Animated lime wordmark, dark background, subtle "scan to enter" mark fading in

**Step 2 — Value props (3 screens, swipe or auto-advance)**
- "Find a gym near you. Pune, Mumbai, Bengaluru, Delhi, and 50+ cities."
- "Scan in seconds. Track every workout. See your progress."
- "Plans, payments, and pickup — all in one app."

**Step 3 — Permission priming (NOT system prompt yet — explanatory)**
- "Zook works best with: Camera (to check in), Notifications (for class updates and renewals), Location (to find nearby gyms)"
- "Continue" → triggers the actual system prompts in sequence with explanation cards

**Step 4 — Login** (the new tabbed login from 4.1)

**Step 5 — Role question** (only if user has zero memberships post-login)
- "What brings you to Zook?" → Options: "Join a gym" (member), "I run a gym" (route to /start-gym web flow with deep-link return), "I'm a trainer" (sets a flag for future), "I work the front desk" (same)

**Step 6 — First-run card** on landing screen (already partially built as `FirstRunCard` in `index.tsx:491-539` — keep)

Persist completion in SecureStore as `zook_onboarding_completed`. Skip flow on subsequent launches.

### 4.5 Onboarding for owners

Today there's no "Create gym" path on mobile. Add either:
- **Web bridge**: `Linking.openURL("https://app.zook.app/start-gym?return=zook://")` — leverages the existing web wizard. After completion, the deep link returns to mobile with a freshly-issued session.
- **Native wizard**: a 3-screen flow (Identity, Location with map picker, First plan) calling `POST /api/orgs`. More work, better UX. Phase 2.

### 4.6 Permission priming and JIT prompts

- **Camera**: keep JIT (already on first `/scan` open). Add an explanatory card *before* the system prompt: "Zook needs camera access to scan check-in QR codes."
- **Notifications**: JIT prompt on:
  - First check-in success ("Get notified when your trainer publishes a new plan")
  - First plan assignment received ("Want reminders for your next workout?")
  - Add the "Re-enable in Settings" CTA when previously denied (`push-notifications.tsx:429-438` currently swallows denied state silently)
- **Location**: JIT prompt on first `/find-gyms` open ("Show gyms near you?"). If denied, fall back to city search.
- **Photos**: JIT prompt on profile photo upload tap (once profile photo is added — Section 5).

### 4.7 Logos & branding

- **Splash**: ship a designed splash for iOS + Android with lime wordmark on dark background. Configure in `app.config.ts`:
  ```ts
  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#070908",
  }
  ```
- **Notification icon**: ship `notification-icon.png` (mono white, 96×96 transparent) and configure in `app.config.ts`:
  ```ts
  plugins: [
    ["expo-notifications", { icon: "./assets/notification-icon.png", color: "#B9F455" }]
  ]
  ```
- **Wordmark file**: replace text-based "Zook" in login (`login.tsx:147`) with a designed SVG wordmark.
- **BrandMark dark/light variants**: ship two SVGs and route per-surface in `primitives.tsx:343-368`.
- **Gym logo on home**: `index.tsx:330-332` paints initials. Replace with `<Image source={{ uri: gym.logoUrl }} />` falling back to initials when null.
- **Gym logo on public gym page**: `gym/[username].tsx:192-194` only renders cover. Add the gym's `logoUrl` overlaid on the cover.
- **Profile photo on home avatar**: `index.tsx:142-152` always shows initials. Use `session.user.profilePhotoUrl` when available (via `ProfileShortcut` pattern at `primitives.tsx:399-407`).

---

## 5. Profile vs Settings — Make Them Different Screens

### 5.1 The new `/profile` screen

`apps/mobile/app/profile.tsx` is currently `export { default } from "./settings";`. Replace with a real screen:

```
┌─────────────────────────────┐
│  ←       Profile             │   ← back chevron + title
├─────────────────────────────┤
│  ┌────────────────────────┐ │
│  │   [photo]              │ │   ← profile photo (tap → upload)
│  │   Aman Pandey          │ │   ← name
│  │   IRON HOUSE GYM, Pune │ │   ← active gym + branch
│  │   Member · TRAINER     │ │   ← role chips (multi)
│  └────────────────────────┘ │
├─────────────────────────────┤
│  Membership                  │   ← latest membership card
│  Plus · expires May 28       │
│  ──────░░░ 18 days remaining │
│  [Renew] [View history]      │
├─────────────────────────────┤
│  Recent activity             │
│  ✓ Checked in today, 7:42 AM │
│  ✓ Workout — Push Day        │
│  ✓ Plan completed yesterday  │
├─────────────────────────────┤
│  Quick actions               │
│  [Switch role] [Switch gym]  │
│  [Settings →] [Sign out]     │
└─────────────────────────────┘
```

- The home avatar tap routes to `/profile`, not `/settings`.
- Settings is reachable from the "Settings →" link inside profile.
- Role switcher and gym switcher live here as primary actions, not buried in settings.
- Sign-out is one tap from the home screen via avatar → profile → sign out.

### 5.2 Profile photo upload

- Add `expo-image-picker` dependency.
- Tap photo → action sheet: "Take a photo / Choose from library / Remove".
- After picker, upload via `POST /api/files` (category `profile_photo`, max 5 MB), then `PATCH /me/profile { profilePhotoAssetId }`.
- Show optimistic preview during upload; revert on failure.

### 5.3 Profile fields — capture what's missing

Add to the profile screen:
- **Date of birth** — date picker, validates minor status. Triggers guardian-consent flow if minor.
- **Gender** (optional, with "prefer not to say") — required by some Indian gym KYC.
- **Emergency contact** — name + phone — useful for gym safety.
- **Marketing opt-in toggle** — backend field `marketingOptIn` exists, currently unsurfaced.
- **AI consent toggle** — backend field `aiConsent` exists, currently unsurfaced.
- **Locale preference** — currently local-only in i18n provider; persist server-side via `PATCH /me/profile { preferredLocale }`. Mobile and web should share locale.

### 5.4 Settings — keep but reorganize

`/settings` becomes a focused configuration screen (not identity):

1. **Notifications** (transactional, operational, engagement, promotional toggles + push enable)
2. **Language** (EN / हिन्दी; persists to backend)
3. **Privacy** (export data, delete account, view consents history)
4. **System** (about, version, support email, debug logs in dev)

Account/identity moves to `/profile`. Mutex collapsibles (Section 3.10) — only one open at a time.

---

## 6. RBAC Redesign — Real Permissions, Per-Org Roles

### 6.1 Mobile imports `@zook/core` permissions

Today: `apps/mobile/src/lib/auth.tsx` only exposes `hasAnyRole` / `hasActiveRole` based on the role enum. Backend uses fine-grained permissions.

Add `permissionsForRoles` and `hasPermission` helpers from `@zook/core/permissions`:

```ts
// apps/mobile/src/lib/auth.tsx
import { permissionsForRoles, type Permission } from "@zook/core";

export function useActivePermissions(): Set<Permission> {
  const { session, activeOrgId } = useAuth();
  const activeOrg = session?.organizations.find(o => o.orgId === activeOrgId);
  return useMemo(
    () => new Set([...permissionsForRoles(activeOrg?.roles ?? []), ...(activeOrg?.permissionOverrides ?? [])]),
    [activeOrg?.roles, activeOrg?.permissionOverrides]
  );
}

export function useHasPermission(permission: Permission): boolean {
  const perms = useActivePermissions();
  return perms.has(permission);
}
```

Use `useHasPermission` everywhere a button gates an action:
- `reception.tsx:148-167` — Approve/Reject only when `useHasPermission("ATTENDANCE_APPROVE")`
- `reception.tsx:153-181` — Manual override only when `useHasPermission("ATTENDANCE_MANUAL_OVERRIDE")`
- `reception.tsx:196-216` — Manual payment only when `useHasPermission("PAYMENTS_RECORD_OFFLINE")`
- `owner.tsx:294-326` — Refund button only when `useHasPermission("PAYMENTS_REFUND")` (currently every ADMIN sees it)
- `trainer/client/[id].tsx:131-156` — Assign button only when `useHasPermission("PLANS_PUBLISH_ASSIGNED")`
- `trainer/client/[id]/ai-draft.tsx:235-260` — Generate button only when `useHasPermission("AI_GENERATE_PLAN")`

Disabled buttons get a tooltip on long-press: "Owner approval required."

### 6.2 Route guard — comprehensive matrix

Today: `_layout.tsx:71-118` checks four prefixes. Replace with a config-driven guard:

```ts
// apps/mobile/src/lib/route-guards.ts
const routePermissions: Record<string, Permission | null> = {
  "/owner": "ORG_VIEW_REPORTS",
  "/owner/member": "MEMBERS_VIEW",
  "/reception": "ATTENDANCE_APPROVE",
  "/trainer": "PT_RECORD",
  "/trainer/client": "MEMBERS_VIEW",
  "/platform": null, // platform-admin-only handled separately
  "/scan": "ATTENDANCE_QR_DISPLAY", // wait — anyone can scan their own QR; this is wrong
  // Scan should be allowed for any authenticated user, not gated.
};

export function checkRouteAccess(pathname: string, perms: Set<Permission>, isPlatformAdmin: boolean) {
  // ...
}
```

Important: most "member-shaped" routes (`/`, `/scan`, `/plans`, `/shop`, `/notifications`, etc.) should remain accessible to all authenticated users regardless of role — a receptionist or trainer who *is also* a member at a gym needs to scan, see their plan, etc. The fix is at the *button* level (Section 6.1), not the route level.

But: the current guard's dual `hasAnyRole && hasActiveRole` requirement is wrong. If the user has OWNER role, deep-linking to `/owner` should auto-switch their `activeRole` to OWNER (with a one-time "Switching to owner view" toast), not bounce them. Fix:

```ts
useEffect(() => {
  if (status !== "authenticated") return;
  const required = requiredRoleForPath(pathname);
  if (required && !hasAnyRole(required)) {
    router.replace(routeForRole(activeRole));
    return;
  }
  if (required && !hasActiveRole(required)) {
    setActiveRole(required); // auto-switch
    showToast(`Switched to ${required} view`);
  }
}, [pathname, status, hasAnyRole, hasActiveRole]);
```

### 6.3 Role + org switching — coordinated

Today:
- `setActiveRole(role)` writes to storage; doesn't refresh permissions, doesn't invalidate queries.
- `setActiveOrgId(orgId)` calls `hydrate` (refreshes session) but doesn't auto-correct active role.

Fix in `auth.tsx`:

```ts
async function setActiveRole(role: Role) {
  // 1. Validate role exists in active org
  const activeOrg = session?.organizations.find(o => o.orgId === activeOrgId);
  if (!activeOrg?.roles.includes(role)) throw new Error("Role not available in active org");

  // 2. Persist
  await secureStorage.set(ACTIVE_ROLE_STORAGE_KEY, role);

  // 3. Refresh session to pull latest permissions
  await hydrate(token, activeOrgId, role);

  // 4. Invalidate org-scoped queries
  await queryClient.invalidateQueries({ queryKey: ["org"] });
  await queryClient.invalidateQueries({ queryKey: ["me"] });
}

async function setActiveOrgId(orgId: string) {
  const targetOrg = session?.organizations.find(o => o.orgId === orgId);
  if (!targetOrg) throw new Error("Org not found");

  // 1. Auto-correct active role if it's not in the target org
  const currentRole = activeRoleRef.current;
  const correctedRole = targetOrg.roles.includes(currentRole) ? currentRole : sessionDefaultRole(targetOrg);

  // 2. Persist + hydrate
  await secureStorage.set(ACTIVE_ORG_STORAGE_KEY, orgId);
  await secureStorage.set(ACTIVE_ROLE_STORAGE_KEY, correctedRole);
  await hydrate(token, orgId, correctedRole);

  // 3. Invalidate everything (different org, different data)
  await queryClient.invalidateQueries();
}
```

### 6.4 Per-org role picker

Today: `settings.tsx:120-125` flattens roles across all orgs. A user OWNER in Pune and MEMBER in Delhi sees both pills, but tapping OWNER while on Delhi is broken.

Fix: scope the picker to the active org:

```tsx
const activeOrg = session.organizations.find(o => o.orgId === activeOrgId);
const availableRoles = activeOrg?.roles ?? [];

// Render role pills only for availableRoles
// If user wants OWNER but it's not in active org, show "Switch to Pune (Pilot Gym) to access Owner tools"
```

Multi-org users get a contextual hint when their desired role lives in another org.

### 6.5 Privileged action re-auth

Receptionist's manual payment, manual override, and order fulfillment with skip-code are high-trust actions. Phones get left on desks.

Add `expo-local-authentication`:

```tsx
// apps/mobile/src/lib/privileged-action.ts
export async function requirePrivilegedAuth(label: string): Promise<boolean> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  if (!hasHardware || !enrolled) {
    // Fall back to PIN (org-set 4-digit PIN persisted server-side)
    return await promptForOrgPin(label);
  }
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: label,
    cancelLabel: "Cancel",
  });
  return result.success;
}
```

Gate before:
- `useManualAttendance` mutation
- `useRecordManualPayment` mutation
- `useFulfillShopOrder` with `skipCode: true` mutation
- Plan deletion / member ban / refund (when those exist on mobile)

### 6.6 Cross-role data redaction

`useOrgMembers` returns full member rows including phone. This is correct for receptionists who need to call members, but:
- Show only last 4 digits by default; tap to reveal full number
- Log the reveal in audit (`POST /api/audit-logs` with `action: "MEMBER_PHONE_REVEALED"`)
- Members' personal addresses (if added later) follow the same pattern

For attendance records, fix `attendance/[attendanceRecordId].tsx:78-91` — only render content when API record matches; otherwise show "Record not found in your history". Stop confabulating from URL params.

### 6.7 Remove demo seed leaks from production

- `trainer/client/[id]/ai-draft.tsx:117` — `clientId = id || "user-aarav"`. Replace with redirect to `/trainer?view=clients` if id missing.
- `demo-mode.ts:21` — demo user has all 5 roles statically. Change to single `MEMBER` default with `EXPO_PUBLIC_OFFLINE_DEMO_ROLE` overriding for QA. Add comment that this is dev-only.

---

## 7. Per-Role Surfaces

The mobile app already has role-shaped landing routes (`/`, `/owner`, `/reception`, `/trainer`). Tighten each.

### 7.1 Member surface (`/`, plus shared screens)

Member is the default. Existing flows are OK but need:

- **Profile screen** (Section 5) replacing the settings re-export
- **First-run card** for `NEVER_CHECKED_IN`, `NO_GYM`, `NO_MEMBERSHIP` (already exists, keep)
- **Branch chip** showing active branch on home + scan + membership when org has multiple
- **Gym switcher** in profile, not buried in dead drawer code (`index.tsx:54-380` — delete dead code)

### 7.2 Trainer surface (`/trainer`)

Existing 3-tab structure (clients, plans, ai). Issues:

- **Logout button missing** — add to header
- **No back to settings/profile** — add header avatar tap to `/profile`
- **Plan creation is 6+ taps** — add inline "Quick plan" from a template (Section 8)
- **AI draft fallback to demo client** — fix the `user-aarav` leak
- **Trainer note save toast lost on dismiss** — make it a less aggressive inline `<Pill tone="lime">Saved</Pill>` that persists for 3s

### 7.3 Receptionist surface (`/reception`)

This must mirror the dashboard proposal's `/desk` web surface — same 4 tabs, same priority order:
1. **Queue** (default) — pending approvals, today's check-ins
2. **Member lookup** — search + member detail with payment shortcut
3. **Record payment** — focused single form (mode, amount, member, purpose, ref, notes)
4. **Shop pickup** — verify code + mark fulfilled + record-payment shortcut for PAY_AT_DESK orders

Plus:
- **Floating "Show entry QR" button** — bottom-right corner, persistent across tabs. Tap → fullscreen rotating QR (route to `/reception/qr` chrome-less)
- **Logout button in header** (already exists at `reception.tsx:303-311`, keep)
- **Decision-reason input on every queue item** (current bug at `:443-464` — only renders for index 0)
- **Privileged action re-auth** before manual payment / override

Receptionist mobile is critical because front-desks may use a phone instead of a tablet for the web `/desk` surface.

### 7.4 Owner/Admin surface (`/owner`)

Mobile owner is "monitoring + approvals on the go" — not full management. Existing 5 views (command, approvals, revenue, stock, members) are appropriate.

Fixes:
- **Logout button missing** — add to header
- **Avatar tap → /profile** — currently no avatar on this screen
- **Permission-gated buttons** — Section 6.1
- **Member detail** — replace "fetch all members and filter" with `GET /orgs/:orgId/members/:id`
- **Pull-to-refresh** on every view

Owner-specific features that don't exist on mobile (refunds, role permissions edit, billing) stay web-only — mobile is for ops, not configuration.

### 7.5 Platform admin (`/platform`)

Stays a "go to web" stub — correct given platform admin tasks need a desktop. Add a "Open web dashboard" button that uses `Linking.openURL` to the live web URL with the user's session forwarded.

---

## 8. Specific Backend Stitching Fixes

### 8.1 401/403 interceptor

`apps/mobile/src/lib/api.ts:96-155` needs a global 401/403 handler. Inject a callback at construction (`apps/mobile/src/lib/api-client.tsx`):

```ts
export const apiClient = createApiClient({
  onUnauthorized: () => {
    queryClient.clear();
    clearSession();
    router.replace("/login?reason=expired");
  },
  onForbidden: (error) => {
    showToast({ title: "Permission denied", description: error.message, tone: "amber" });
  },
});
```

### 8.2 Member detail endpoint

Add `GET /api/orgs/:orgId/members/:id` server-side. Use it in `owner/member/[id].tsx:76` instead of fetching all members.

### 8.3 Attendance record by id

Add `GET /api/me/attendance/:id` server-side. Use it in `attendance/[attendanceRecordId].tsx:70-85` so deep-links from the inbox work without URL-param confabulation.

### 8.4 Return-deep-link from external checkout

Today `Linking.openURL(checkoutUrl)` opens the system browser. After payment, the user returns manually. Fix:

- Append `&return_url=zook://payments/return?session={sessionId}` to checkout URLs.
- Backend: after payment success, redirect to that return URL instead of the default thank-you page (when the request is from mobile).
- Mobile: handle `zook://payments/return?session=...` by routing to the appropriate confirmation screen and invalidating the relevant queries.
- During the external session, show an in-app "Continuing in your browser — return when done" card (Section 3.5).

### 8.5 Universal links

Configure iOS associated domains and Android intent filters in `app.config.ts`:

```ts
ios: {
  associatedDomains: ["applinks:app.zook.app", "applinks:zook.app"],
},
android: {
  intentFilters: [
    {
      action: "VIEW",
      data: [{ scheme: "https", host: "app.zook.app" }],
      category: ["BROWSABLE", "DEFAULT"],
      autoVerify: true,
    },
  ],
},
```

Server-side: serve `apple-app-site-association` and `assetlinks.json` from the web app's domain.

### 8.6 Push notifications — channels and icons

- Notification icon (Section 4.7)
- Multiple Android channels: `payments`, `ops`, `reminders`, `marketing`, `default`
- iOS time-sensitive entitlement (for renewal reminders): add to `app.config.ts` and request via `Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowBadge: true, allowSound: true, allowCriticalAlerts: false, provideAppNotificationSettings: false, allowProvisional: false } })`
- JIT permission prompt (Section 4.6)

### 8.7 Push tap routing

`mapNotificationPayloadToHref` (in `notification-routing.ts`) is partially wired. Audit every `NotificationType`:

| Type | Expected route |
|---|---|
| TRANSACTIONAL (membership renewed) | `/membership` |
| TRANSACTIONAL (attendance approved) | `/attendance/[id]` |
| TRANSACTIONAL (order ready) | `/shop/pickup/[orderId]` |
| OPERATIONAL (gym closure) | `/notifications/[id]` (full text) |
| PROMOTIONAL | `/notifications/[id]` |
| PLAN (new plan assigned) | `/plans/[assignmentId]` |
| ENGAGEMENT (workout reminder) | `/tracking-entry?prefill=...` |

For each, ensure the deep-link handler invalidates relevant queries on mount.

### 8.8 Copy and locale persistence

`apps/mobile/src/lib/i18n.tsx` stores locale locally only. Persist to `User.preferredLocale` server-side via `PATCH /me/profile`. Mobile reads it on hydrate, web reads it on dashboard layout (already done). Single source of truth.

### 8.9 Demo mode hardening

- Drop legacy `EXPO_PUBLIC_OFFLINE_DEMO`, `EXPO_PUBLIC_DEMO_MODE`, `MOBILE_OFFLINE_DEMO` env vars. Canonical: `EXPO_PUBLIC_API_MODE=offline-demo|backend`.
- `runtime-mode.ts:43-49` — only honour the canonical var.
- Build-time check (`app.config.ts:162-166`) already throws on misconfig — keep.

---

## 9. Specific Bug Catalog

Prioritized list of file:line bugs from the three audits. Codex implements top-down.

### Critical (data loss / wrong action)
1. `apps/mobile/app/trainer/client/[id].tsx:115-150` — `assignPlan` creates a duplicate plan if title doesn't match `savedPlan.title`. Reuse `savedPlan.id` after normalizing title.
2. `apps/mobile/app/reception.tsx:443-464` — Decision-reason input only renders for queue index 0. Receptionist can't approve item #3 with a custom reason. Move to per-row bottom sheet.
3. `apps/mobile/src/lib/auth.tsx:182-190` — `refresh()` swallows ALL errors as logout. Network blip = forced re-login. Only logout on 401.
4. `apps/mobile/app/notifications.tsx:124-133` — Tapping a notification with no specific link silently re-opens the inbox. At minimum mark as read; ideally expand inline.

### High (visible UX failure)
5. `apps/mobile/app/tracking-entry.tsx:358-367` — StickyActionBar overlaps BottomNav. Set offset.
6. `apps/mobile/app/shop.tsx:698-699` — Same overlap on shop checkout sticky.
7. `apps/mobile/app/assistant.tsx:289-322` — Composer not keyboard-aware. Wrap with KAV or listen to keyboard events.
8. Every keyboard-bearing screen lacks KeyboardAvoidingView (Section 3.1 list).
9. `apps/mobile/app/profile.tsx:1` — Profile is a re-export of settings. Build a real profile screen (Section 5).
10. `apps/mobile/app/index.tsx:54-380` — Dead drawer code. Delete.
11. `apps/mobile/app/trainer/client/[id]/ai-draft.tsx:117` — `clientId = id || "user-aarav"` demo seed leaks into prod.
12. `apps/mobile/app/owner.tsx` — No logout button anywhere. Add to header.
13. `apps/mobile/app/trainer/index.tsx` — No logout button. Add to header.
14. `apps/mobile/app/scan.tsx:377-385` — Dev-scan shortcut gated only by `__DEV__`, leaks into Expo internal/preview. Add `getMobileAppEnv() === "local"` check.

### Medium (polish + role correctness)
15. `apps/mobile/src/lib/auth.tsx:254-257` — `setActiveRole` doesn't invalidate queries.
16. `apps/mobile/src/lib/auth.tsx:243-251` — `setActiveOrgId` doesn't auto-correct active role.
17. `apps/mobile/app/login.tsx:35-49` — `formatIndiaPhoneInput` hardcodes `+91`.
18. `apps/mobile/app/membership.tsx:255-258` (and shop, gym pages) — `Linking.openURL` for checkout with no return-deep-link or waiting UI.
19. `apps/mobile/app/owner/member/[id].tsx:76` — Fetches entire member list to find one by id.
20. `apps/mobile/app/attendance/[attendanceRecordId].tsx` — No auto-dismiss on approved result.
21. `apps/mobile/app/scan.tsx:491-499` — `scanLine` is static, no scanning animation.
22. `apps/mobile/app/find-gyms.tsx:104-122` — "MAP" placeholder looks like a map but isn't. Either ship maps or relabel.
23. `apps/mobile/app/owner.tsx:88, 366-373` — Member search no clear button.
24. `apps/mobile/app/find-gyms.tsx:33-36` — `useDeferredValue` should be debounce.
25. `apps/mobile/app/login.tsx:213-225` — "Change sign-in" doesn't dismiss keyboard before layout animation.
26. Tab-vs-detail URL state inconsistency: plans, shop, trainer use different patterns. Standardize on URL state (Section 3.4).
27. `apps/mobile/app/settings.tsx:316-660` — No KAV; mutex collapsibles missing; logout buried at the bottom.
28. `apps/mobile/app.config.ts:7-45` — No splash, no notification plugin config.
29. `apps/mobile/app.config.ts:21-29, :16-20` — No universal-link config.
30. `apps/mobile/src/lib/push-notifications.tsx:429-438` — Push permission never prompted at first launch.

### Low (touch targets + accessibility)
31-35. Touch targets under 44×44 (Section 3.9 list).
36. `apps/mobile/src/lib/i18n.tsx` — Locale not persisted server-side.
37. `apps/mobile/app/settings.tsx:484-498` — `globalThis.navigator.clipboard.writeText` doesn't exist on RN; use `expo-clipboard`.

---

## 10. Implementation Plan — Six Sprints

### Sprint 1 — Foundations (1 week)
Goal: every input-bearing screen has correct keyboard handling; sticky bars don't overlap; bottom-nav hides when it shouldn't be visible.

- Build `KeyboardAwareScreen` primitive (3.1)
- Build `useBottomScrollPadding`, `useStickyActionOffset` hooks (3.2)
- Build `BottomNavVisibilityContext` and `useHideBottomNav` (3.3)
- Default `StickyActionBar` `bottomOffset` to nav height + spacing
- Wrap every keyboard screen
- Hide bottom-nav on `tracking-entry`, camera-active `scan`, `attendance/[id]`, `ai-draft`
- Fix `tracking-entry` sticky overlap, `shop` sticky overlap
- Fix assistant composer keyboard awareness

**DoD:** All 12 keyboard-bearing screens have KAV. No sticky button hidden by bottom-nav. Tap-outside-keyboard dismisses keyboard.

### Sprint 2 — Profile + Logos + Onboarding (1 week)

- Build real `/profile` screen (Section 5.1)
- Add `expo-image-picker`, profile photo upload
- Add DOB, emergency contact, marketing/AI consent fields
- Reorganize settings (mutex collapsibles)
- Ship splash image, notification icon, BrandMark dark/light variants
- Render gym logo on home and public gym pages
- Render profile photo on home avatar
- Build onboarding flow (Section 4.4)
- Persist `zook_onboarding_completed` flag

**DoD:** New install → splash → 3-screen value props → permission priming → login → role question (if applicable) → first-run card. Profile is a real screen with photo upload. Settings has 4 mutex sections.

### Sprint 3 — Auth & session (1 week)

- Tabbed login: Email vs Phone (separate fields, country picker)
- Add Apple Sign-In (mobile + backend `/auth/apple/callback`)
- Add Google Sign-In (mobile + backend `/auth/google/callback`)
- Biometric session unlock toggle in settings
- Auto-submit OTP on 6th digit
- Persist `expiresAt`; proactive re-auth at T-24h
- Global 401/403 interceptor in `mobileApiFetch`
- Stop swallowing all hydrate errors as logout
- Specific 429 + lockout messaging
- Terms + Privacy links on login

**DoD:** Login screen has Email/Phone tabs + Apple/Google buttons + Terms/Privacy. 401 from any API call gracefully logs the user out and shows "Session expired". Network blip preserves session. Biometric unlock works on second launch.

### Sprint 4 — RBAC + role/org switching (1 week)

- Import `permissionsForRoles`, `hasPermission` into mobile
- `useActivePermissions`, `useHasPermission` hooks
- Gate every privileged button on permissions (not roles)
- Fix route guard to auto-switch role on deep-link instead of bouncing
- Fix `setActiveRole` to refresh + invalidate
- Fix `setActiveOrgId` to auto-correct role
- Per-org role picker in profile
- Privileged action re-auth (`expo-local-authentication`)
- Cross-role data redaction (phone last-4, audit on reveal)
- Fix attendance URL-param confabulation
- Remove `user-aarav` demo leak
- Tighten demo-mode env vars

**DoD:** A receptionist with revoked manual-payment permission sees the button disabled. Role switching invalidates trainer-clients cache. Org switching auto-correct role. Phone numbers in member list show last 4 only by default.

### Sprint 5 — URL state, transitions, navigation (1 week)

- Move plans detail to `/plans/[assignmentId]` URL
- Move shop checkout phases to sub-routes
- Mirror trainer client tabs to `?tab=` query param
- Convert `tracking-entry` and `attendance/[id]` to `presentation: "modal"` with grabber
- Add `@gorhom/bottom-sheet`; replace plan-feedback inline panel + reception decision-reason with bottom sheets
- Add header back chevrons to all secondary screens (3.7)
- Add pull-to-refresh to all query-backed screens (3.8)
- Build skeletons for plans/membership/notifications/owner/reception/trainer/tracking-history/find-gyms (3.6)

**DoD:** Push notifications deep-link directly to plan detail / shop pickup / trainer client tabs. Back gesture from plan detail returns to plans list. Every secondary screen has a back button and pull-to-refresh.

### Sprint 6 — Backend stitching + push + universal links (1 week)

- 401 interceptor wired (Sprint 3 prereq)
- `GET /api/me/attendance/:id` + `GET /api/orgs/:orgId/members/:id` server-side
- Return-deep-link from external checkout (`zook://payments/return?...`)
- "Waiting for payment" in-app card during external checkout
- iOS associated domains + Android intent filters in `app.config.ts`
- Server `apple-app-site-association` and `assetlinks.json`
- Multiple Android notification channels
- Notification icon shipped
- JIT push permission prompt at first check-in success
- Push tap routing audit (8.7)
- Locale persistence to backend
- Touch targets fixed (3.9)
- Clipboard + minor RN fixes

**DoD:** `https://app.zook.app/join/partner-gym` opens the app. Tapping a "membership renewed" push lands on `/membership` with fresh data. After Razorpay checkout, user lands on `/membership` with confirmation, queries refreshed automatically. Push permission prompted at the right moment, not buried in settings.

---

## 11. Acceptance Criteria

After all six sprints, all of these must be true:

1. **Member**: opens fresh install → onboarding → login with email → first-run card → scans QR → success result auto-dismisses → home shows updated check-in count. Throughout, every input-screen handles keyboard correctly. Every secondary screen has back navigation and pull-to-refresh.

2. **Receptionist**: opens app on phone → lands on `/reception` Queue tab → approves three pending entries (each with reason via bottom sheet) → records a manual payment (biometric prompt) → fulfills a shop pickup. Logout always visible.

3. **Trainer**: opens app → `/trainer` clients list → opens client → quick-creates a plan from template (3 taps to assign) → sees member receive push notification → tapping that push lands the member directly on the assigned plan detail.

4. **Owner**: opens app at front desk → switches role to owner via profile → owner approvals view → approves a join request. Each privileged button only visible when permissions allow. Universal link `https://app.zook.app/dashboard` opens the web (mobile owners use mobile for monitoring, web for management).

5. **Multi-role**: a user who's MEMBER in Pilot Gym and TRAINER in Peak Lab — switching org auto-corrects role; switching role within org doesn't bleed cached data from previous role.

6. **No keyboard bugs**: keyboard never covers any primary CTA on any screen. Tap-outside-keyboard dismisses. Auto-submit OTP works.

7. **No bottom-nav overlap**: every sticky action sits above the bottom-nav. Bottom-nav hides during camera, during keyboard-active forms, during onboarding.

8. **Session lifecycle**: 401 from any API call gracefully logs out with "Session expired" toast. Network blip preserves session. Biometric unlock works on second launch.

9. **Onboarding**: fresh install never shows blank-to-login. Permission prompts are JIT and explained.

10. **Privileged actions**: manual payment, manual override, fulfillment-with-skip-code all require biometric/PIN. Audit logged.

11. **No demo leaks**: production EAS build cannot enter demo mode. `user-aarav` and similar fixture IDs do not appear anywhere in user-facing code paths.

12. **Push & deep links**: tapping any push notification routes correctly. Universal links open the app. External checkout returns deep-link with refreshed state.

---

## 12. Open Questions — Confirm Before Building

1. **Apple/Google SSO** — backend implementation is required first. Do we want to ship SSO in this redesign, or stage it as a follow-up? (My default: stage to a separate sprint.)
2. **Org PIN fallback** — for receptionist privileged action re-auth, do we use device biometric only, or fallback to a 4-digit org PIN persisted server-side? (Tablets often shared; biometric alone may not work for shared devices.)
3. **Onboarding skippable?** — should the 3-screen value-props + permission priming have a "Skip to login" option, or be mandatory on first launch?
4. **Owner mobile create gym** — do we ship a native wizard (Phase 2 work) or web-bridge with deep-link return?
5. **Notification icon design** — needs a designer (mono white 96×96 for Android). Default to Zook lime square if not yet ready.
6. **Body composition photos timeline** — was in the previous audit but not addressed here. Add to scope or defer to post-launch?
7. **Tablet support** — receptionists often use tablets. Should the mobile app have a tablet layout for `/reception`, or do we tell tablet users to use the web `/desk`? (Web `/desk` from the dashboard proposal is tablet-first; mobile app may not need to compete.)

These don't block Sprint 1 (foundations are pure RN/Expo work). Sprints 3 (Apple/Google) and 4 (PIN fallback) need answers before they start.

## 13. Implementation Notes

<!--
✅ AC-1: Fresh installs route unauthenticated users through onboarding before login, email OTP auto-submits, scan invalidates attendance/home queries, approved member attendance now auto-dismisses to `/`, and secondary/query screens use back controls plus refresh where query-backed.
✅ AC-2: Reception defaults to the Queue/desk tab, approval decisions require a bottom-sheet reason, manual payments and pickup skip-code fulfillment call local privileged auth, and logout is always in the reception header.
✅ AC-3: Trainer defaults to the client surface, client detail opens from the list, plan create/assign actions are wired, assignment invalidates notifications, and plan push payloads route members to `/plans/[assignmentId]`.
✅ AC-4: Profile role switching routes owners to `/owner`, owner approvals can approve join requests, privileged buttons are permission-gated, and `/dashboard` now bridges `https://app.zook.app/dashboard` back to the web dashboard.
✅ AC-5: Org switching auto-corrects unavailable roles in `setActiveOrgId`, role switching validates active-org roles in `setActiveRole`, and both paths invalidate role/org-scoped query caches.
✅ AC-6: Input-heavy screens use `KeyboardAwareScreen` with tap-outside dismissal, bottom nav hides during keyboard activity, and OTP input submits automatically at six digits.
✅ AC-7: `StickyActionBar` defaults above `layout.bottomNavHeight`, exact `bottomOffset={0}` is absent, and bottom nav hides during scan camera, keyboard-active forms, and onboarding layouts.
✅ AC-8: Any API 401 runs the registered expired-session handler, clears session/query state, shows a "Session expired" toast, preserves sessions on network blips via offline banner state, and biometric unlock gates second launch.
✅ AC-9: The app shell sends fresh unauthenticated installs to onboarding instead of a blank login, camera/push prompts are requested just-in-time with explanatory copy.
✅ AC-10: Manual payment, manual attendance override, and fulfillment-with-skip-code all call `requirePrivilegedAuth`; their request bodies include reasons/notes/skipReason for server audit logging.
✅ AC-11: Production/staging builds reject `EXPO_PUBLIC_API_MODE=offline-demo`, runtime config blocks invalid sample mode before data access, and grep found no `user-aarav` in `apps/mobile`.
✅ AC-12: Push taps map membership, attendance, order, notification, and plan payloads to app routes; universal-link hosts include `app.zook.app`/`zook.app`; checkout return links use `zook://payments/return` and refresh membership/home/shop/org state.

Search verification: `grep -r "user-aarav" apps/mobile/.`, `grep -r "EXPO_PUBLIC_OFFLINE_DEMO" apps/.`, and `grep -r "bottomOffset={0}" apps/mobile/.` all returned zero; `head -1 apps/mobile/app/profile.tsx` is `import type { Role } from "@zook/core";`; all `<Text>Loading X</Text>` card cases were replaced with skeletons.
-->
