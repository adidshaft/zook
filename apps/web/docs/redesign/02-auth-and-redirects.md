# Plan 02 — Host-Aware Auth & Redirects

## Goal

Make login, post-login redirects, and account-aware navigation host-aware. Owner/admin/receptionist/trainer always land on `dashboard.zookfit.in`; members always land on `zookfit.in`. The login form on either host honors the request's redirect target if it's on the correct host; if not, it bridges across hosts via a 308.

## Why

Plan #01 set up the host split at the middleware layer. Now the application logic that decides "where do I send the user after login" needs to match. Today [`auth-destinations.ts`](apps/web/src/lib/auth-destinations.ts) returns relative paths only — staff and member share an origin so that worked. With the host split, the resolver must return an **absolute** URL (or a `{ path, host }` pair) so callers can correctly cross hosts.

## Prerequisites

- Plan #01 (host split) merged.

## Current state

- [`auth-destinations.ts`](apps/web/src/lib/auth-destinations.ts) — `resolvePostLoginPath()` returns a string path. Called from login flows + `publicAccountLink()` in public navigation.
- [`apps/web/app/login/page.tsx`](apps/web/app/login/page.tsx) (67 lines) — renders `<LoginPanel />`.
- [`login-panel.tsx`](apps/web/src/components/login-panel.tsx) (552 lines) — handles email + Google + Apple + OTP flows.
- [`public-nav.tsx`](apps/web/src/components/public-nav.tsx), [`account-aware-public-nav.tsx`](apps/web/src/components/account-aware-public-nav.tsx) — render an account-aware "Dashboard / Membership" link based on session.

## Architectural target

```ts
// apps/web/src/lib/auth-destinations.ts (rewritten)
import type { AuthSessionSummary } from "@zook/core";

export type AuthDestination = {
  host: "public" | "dashboard";
  path: string;          // path on that host
};

export function resolvePostLoginDestination(
  session: AuthSessionSummary | null | undefined,
  requestedPath?: string | null,
): AuthDestination;

export function destinationToUrl(
  destination: AuthDestination,
  origins: { public: string; dashboard: string },
): string;

export function publicAccountDestination(
  session: AuthSessionSummary | null | undefined,
): AuthDestination | null;
```

The function returns a host-qualified destination. Callers turn it into a URL using the origins from env (`NEXT_PUBLIC_WEB_URL` for public, `NEXT_PUBLIC_DASHBOARD_URL` for staff — new var).

## Execution steps

### Step 1 — Add `NEXT_PUBLIC_DASHBOARD_URL` env

Add to `.env.development`, `.env.test`, and document in `apps/web/README.md` if one exists. Defaults:
- `NEXT_PUBLIC_WEB_URL=https://zookfit.in` (prod) / `http://localhost:3000` (dev)
- `NEXT_PUBLIC_DASHBOARD_URL=https://dashboard.zookfit.in` (prod) / `http://dashboard.localhost:3000` (dev)

Add a server-side helper `apps/web/src/lib/origins.ts`:

```ts
export function getOrigins() {
  return {
    public: process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000",
    dashboard: process.env.NEXT_PUBLIC_DASHBOARD_URL ?? "http://dashboard.localhost:3000",
  };
}
```

### Step 2 — Rewrite `auth-destinations.ts`

Replace `resolvePostLoginPath` with `resolvePostLoginDestination`. Logic:

1. If session is platform admin → `{ host: "dashboard", path: "/platform" }`.
2. Else if has owner/admin role → `{ host: "dashboard", path: "/dashboard" }`.
3. Else if has receptionist role → `{ host: "dashboard", path: "/desk" }`.
4. Else if has trainer role → `{ host: "dashboard", path: "/coach" }`.
5. Else if has member role → `{ host: "public", path: memberPath(session) }`.
6. Else `{ host: "public", path: "/gyms" }`.

Where `memberPath()`:
- If user has a slug (added in plan #03) → `/m/<slug>`
- Else if user has `privateHandle` → `/me/<handle>`
- Else → `/me`

If `requestedPath` is provided and matches the destination host, honor it. If it points at a different host, ignore (user is being redirected to the canonical destination for their role).

Add `destinationToUrl()`:
```ts
export function destinationToUrl(d: AuthDestination, origins: { public: string; dashboard: string }) {
  const origin = d.host === "dashboard" ? origins.dashboard : origins.public;
  return `${origin}${d.path}`;
}
```

Add `destinationToHref()` for same-host usage (returns just the path so Next's client-side router stays in the SPA):
```ts
export function destinationToHref(d: AuthDestination, currentHost: "public" | "dashboard", origins: { public: string; dashboard: string }) {
  return d.host === currentHost ? d.path : destinationToUrl(d, origins);
}
```

Rewrite `publicAccountLink` as `publicAccountDestination` returning the same shape.

### Step 3 — Update login

Login form is shared between hosts. After successful login, server reads session, computes `resolvePostLoginDestination(session, requestedPath)`, then:

- If `destination.host === currentHost` → redirect with relative path (SPA).
- Else → 307/308 redirect to absolute URL on the other host.

In [`login/page.tsx`](apps/web/app/login/page.tsx), the post-auth redirect call site needs to read the current host (`headers().host` in App Router) and the origins, then call `destinationToHref` / `destinationToUrl`.

Update `login-panel.tsx` if it does client-side post-login routing; otherwise leave alone.

### Step 4 — Update account-aware nav

[`account-aware-public-nav.tsx`](apps/web/src/components/account-aware-public-nav.tsx) shows "Dashboard" / "Desk" / "Coach" / "Membership" depending on roles. Update to use `publicAccountDestination()` and `destinationToHref(destination, "public", origins)`.

On the public host, a staff link must be a full URL (cross-host). On the dashboard host, the link to "Membership" must be a full public URL.

### Step 5 — Audit all `redirect("/dashboard")` etc. calls

Search:
```bash
git grep -nE 'redirect\("/(dashboard|desk|coach|me|platform|staff|start-gym)' apps/web
```

For each call site:
- If the file already runs server-side on the dashboard host and the destination is also on dashboard, leave the relative path (Next handles same-host efficiently).
- If the call site might run on the public host (e.g., from `apps/web/app/me/page.tsx` which redirects owners away), use `destinationToUrl()` to produce a full URL.

Likely callers needing updates:
- [`apps/web/app/me/page.tsx`](apps/web/app/me/page.tsx) — currently redirects platform/owner/desk/coach users away from `/me`. After this plan, those redirects cross hosts.
- [`apps/web/app/dashboard/dashboard-route.tsx`](apps/web/app/dashboard/dashboard-route.tsx) — redirects MEMBER-only users to `/gyms`. Now must cross host to `zookfit.in/gyms`.
- Login callbacks.

### Step 6 — Logout

Logout must clear cookies on `.zookfit.in` domain. After logout, redirect to `https://zookfit.in/` (public homepage), regardless of which host the user logged out from. Verify in the logout server action / route.

### Step 7 — `requireDashboardSession()` host check

[`server-auth.ts`](apps/web/src/lib/server-auth.ts) — `requireDashboardSession()` only redirects to `/login` if no session. Extend to also check the host:

```ts
export async function requireDashboardSession(opts?: { expectedHost?: "dashboard" | "public" }) {
  const session = ... existing ...
  if (!session) redirect("/login");

  if (opts?.expectedHost === "dashboard") {
    const headerStore = await headers();
    const host = headerStore.get("host") ?? "";
    if (!host.startsWith("dashboard.")) {
      const origins = getOrigins();
      redirect(`${origins.dashboard}${currentPath()}`);
    }
  }
  return session;
}
```

This is belt-and-suspenders — the middleware already host-redirects, but server components that read the session directly benefit from explicit assertion.

### Step 8 — Tests

Add `apps/web/src/lib/auth-destinations.test.ts`:
- Each role → correct destination.
- requestedPath matching → honored.
- requestedPath mismatched host → ignored.
- Platform admin precedence.
- Member without privateHandle → fallback.

Add `apps/web/src/lib/origins.test.ts` (env-var-based; mock `process.env`).

## Files created

- `apps/web/src/lib/origins.ts`
- `apps/web/src/lib/origins.test.ts`
- `apps/web/src/lib/auth-destinations.test.ts`

## Files modified

- `apps/web/src/lib/auth-destinations.ts` (rewritten signature; old export kept as `@deprecated` alias for one cycle)
- `apps/web/src/lib/server-auth.ts`
- `apps/web/app/login/page.tsx`
- `apps/web/src/components/login-panel.tsx` (only if client-side redirects exist)
- `apps/web/src/components/account-aware-public-nav.tsx`
- `apps/web/src/components/public-nav.tsx` (if needed)
- `apps/web/app/me/page.tsx`
- Any `redirect("/dashboard")` etc. sites discovered in Step 5
- `.env.development` (or equivalent), `apps/web/README.md` if present

## Files deleted

None.

## UI/UX fixes shipped

- Login on either host correctly bridges to the right destination
- "Dashboard" link in the public nav opens the staff host in a new tab feel — actually it's a hard navigation, but visually seamless
- Members trying to bookmark the dashboard get redirected to their member surface
- Logout always lands on public homepage (predictable)

## Acceptance criteria

- [ ] As an owner, login on `dashboard.zookfit.in/login` → lands on `dashboard.zookfit.in/dashboard`.
- [ ] As an owner, login on `zookfit.in/login` → 308 to `dashboard.zookfit.in/dashboard`.
- [ ] As a member, login on `dashboard.zookfit.in/login` → 308 to `zookfit.in/me` (or slug from plan #03).
- [ ] As a member, login on `zookfit.in/login` → lands on `zookfit.in/me`.
- [ ] As a platform admin → always lands on `dashboard.zookfit.in/platform`.
- [ ] As a receptionist → `dashboard.zookfit.in/desk`. As a trainer → `dashboard.zookfit.in/coach`.
- [ ] `?redirect=` query param honored when target matches the user's destination host.
- [ ] Logout from any host clears `.zookfit.in` cookies and lands on `zookfit.in/`.
- [ ] Public nav "Dashboard" link uses the dashboard absolute URL.
- [ ] No `redirect("/dashboard")` from a public-host page (use absolute URL).
- [ ] `pnpm -w typecheck` clean.
- [ ] `pnpm -w test --filter @zook/web` clean.
- [ ] New tests cover all role permutations.

## What this plan does NOT do

- Does not add member-friendly slugs (plan #03).
- Does not change dashboard internal routing (plan #05).
- Does not touch the platform admin surface.
