# Plan 01 — Host Split (`dashboard.zookfit.in` ↔ `zookfit.in`)

## Goal

Make the staff app live at `dashboard.zookfit.in` and the public + member zone live at `zookfit.in`. Rewrite [`middleware.ts`](apps/web/middleware.ts) to route by host instead of collapsing everything onto one origin.

## Why

Currently [middleware.ts:6-11](apps/web/middleware.ts#L6) actively redirects `dashboard.zookfit.in` → `zookfit.in` (it's in `canonicalRedirectHosts`). The product intent is the opposite: keep staff on a dedicated subdomain so the dashboard URL is bookmarkable, easy to share with staff, and never accidentally mixed with public marketing or member surfaces.

Benefits:
- Staff session cookie can be scoped tighter to subdomain.
- Marketing site can be aggressively cached at the edge without contaminating dashboard traffic.
- Memorable URLs: "go to dashboard.zookfit.in" for staff, "share your zookfit.in/<slug>" for members.
- A future staff-only feature (e.g. SAML SSO) can be gated by host without code branches.

## Current state

- [`apps/web/middleware.ts`](apps/web/middleware.ts) — `canonicalRedirectHosts` includes `dashboard.zookfit.in`. The single `canonicalHost` is `zookfit.in`. `isPrivatePath` lists `/dashboard /desk /coach /me /platform /staff /start-gym`. Auth gating is by cookie, not by host.
- Login: [`apps/web/app/login/page.tsx`](apps/web/app/login/page.tsx) (67 lines) + `login-panel.tsx` (552 lines).
- Post-login resolver: [`apps/web/src/lib/auth-destinations.ts`](apps/web/src/lib/auth-destinations.ts) (118 lines). Returns relative paths — not host-aware.
- `vercel.json` deploys a single project; both hosts must point at the same deployment.

## Architectural target

```
   ┌─────────────────────────────────┐         ┌─────────────────────────────────┐
   │  zookfit.in (PUBLIC + MEMBER)   │         │ dashboard.zookfit.in (STAFF)    │
   │                                 │         │                                 │
   │  Allowed paths:                 │         │  Allowed paths:                 │
   │   /                             │         │   /                             │
   │   /login (shared)               │         │   /login (shared)               │
   │   /verify-otp                   │         │   /dashboard/*                  │
   │   /support, /terms, /privacy    │         │   /desk/*                       │
   │   /status                       │         │   /coach/*                      │
   │   /gyms                         │         │   /platform/*                   │
   │   /g/<username>                 │         │   /staff/*                      │
   │   /in/<username>                │         │   /start-gym                    │
   │   /join/<username>              │         │                                 │
   │   /r/<code>                     │         │  Anything else → redirect to    │
   │   /qr/<username>                │         │  zookfit.in same path           │
   │   /me, /me/<handle>             │         │                                 │
   │   /m/<slug>  (added in #03)     │         │                                 │
   │   /api/*                        │         │                                 │
   │                                 │         │                                 │
   │  Staff paths visited here →     │         │                                 │
   │  redirect to dashboard host     │         │                                 │
   └─────────────────────────────────┘         └─────────────────────────────────┘
                              ↑                              ↑
                              └──────── /login (shared) ─────┘
                              cookies scoped to .zookfit.in so a session set on
                              one subdomain is honored on the other.
```

### Path → host map

```ts
// apps/web/src/lib/host-routing.ts (NEW)
export type WebHost = "public" | "dashboard";

export const STAFF_PATH_PREFIXES = [
  "/dashboard",
  "/desk",
  "/coach",
  "/platform",
  "/staff",
  "/start-gym",
] as const;

export const PUBLIC_PATH_PREFIXES = [
  "/me",
  "/m",          // new in plan #03
  "/g",
  "/in",
  "/join",
  "/r",
  "/qr",
  "/gyms",
  "/guardian",
  "/guardian-consent",
  "/checkout",
  "/support",
  "/terms",
  "/privacy",
  "/status",
] as const;

export const SHARED_PATH_PREFIXES = [
  "/login",
  "/verify-otp",
  "/api",
] as const;

export function pathBelongsToStaff(pathname: string) {
  return STAFF_PATH_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function pathBelongsToPublic(pathname: string) {
  return PUBLIC_PATH_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function pathIsShared(pathname: string) {
  return pathname === "/" ||
    SHARED_PATH_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function expectedHostForPath(pathname: string): WebHost | "either" {
  if (pathBelongsToStaff(pathname)) return "dashboard";
  if (pathBelongsToPublic(pathname)) return "public";
  return "either";
}
```

## Execution steps

### Step 1 — Add the host-routing helper

Create `apps/web/src/lib/host-routing.ts` per the snippet above. Add unit tests at `apps/web/src/lib/host-routing.test.ts` covering each path category and a few edge cases (`/dashboard`, `/dashboard/`, `/dashboardx`, `/me/abc`, `/`).

### Step 2 — Rewrite middleware

In [`apps/web/middleware.ts`](apps/web/middleware.ts):

1. Remove `dashboard.zookfit.in` from `canonicalRedirectHosts`. Keep `app.zookfit.in`, `app.zook.kyokasuigetsu.xyz`, `zook-gym-app.vercel.app` as collapse targets for the public canonical.
2. Determine which host the request is on:
   ```ts
   const STAFF_HOST = "dashboard.zookfit.in";
   const PUBLIC_HOST = "zookfit.in";
   const DEV_STAFF_HOST = "dashboard.localhost";
   const DEV_PUBLIC_HOST = "localhost";

   function classifyHost(hostname: string): "staff" | "public" | "unknown" {
     if (hostname === STAFF_HOST || hostname === DEV_STAFF_HOST || hostname.startsWith("dashboard.")) return "staff";
     if (hostname === PUBLIC_HOST || hostname === DEV_PUBLIC_HOST || hostname === "www.zookfit.in") return "public";
     return "unknown";
   }
   ```
3. After CSP setup, apply the host-route check:
   ```ts
   const host = classifyHost(request.nextUrl.hostname.toLowerCase());
   const { pathname } = request.nextUrl;
   const expected = expectedHostForPath(pathname);

   if (expected === "dashboard" && host !== "staff") {
     const url = request.nextUrl.clone();
     url.hostname = STAFF_HOST;
     url.protocol = "https:";
     return NextResponse.redirect(url, 308);
   }
   if (expected === "public" && host === "staff") {
     const url = request.nextUrl.clone();
     url.hostname = PUBLIC_HOST;
     url.protocol = "https:";
     return NextResponse.redirect(url, 308);
   }
   ```
4. Auth gating: keep `hasSession`/refresh logic, but limit the `isPrivatePath` check to **staff paths** (since member paths under `/me`, `/m` have their own per-page `requireDashboardSession()`).

5. Update `canonicalRedirectHosts` consumers: previously they all collapsed onto `zookfit.in`. Now `dashboard.zookfit.in` is **not** collapsed; everything else (`app.zookfit.in`, `zook-gym-app.vercel.app`, the kyokasuigetsu dev host) still collapses to `zookfit.in`. If any of those should instead go to staff, document the choice; default is public.

### Step 3 — Cookie scope

Look for where the session cookie is set (search: `git grep -n "${sessionCookieName}" apps/web`). The cookie must be set with `domain: ".zookfit.in"` so it's honored across both subdomains. In dev, no domain attribute (browser defaults to current hostname; use `dashboard.localhost` + `localhost` with `pnpm dev` and accept they don't share cookies in dev — or use a shared TLD).

If the current cookie setter doesn't specify `domain`, add it conditionally:
```ts
const isProd = process.env.NODE_ENV === "production";
const cookieDomain = isProd ? ".zookfit.in" : undefined;
```

### Step 4 — Dev experience

Document the dev setup in `apps/web/docs/redesign/01-host-split.md` (this file) under "Dev setup" below.

**Dev setup:**

Add to `/etc/hosts` on developer machines:
```
127.0.0.1   localhost
127.0.0.1   dashboard.localhost
```

Start Next.js dev server normally:
```
pnpm --filter @zook/web dev
```

Visit:
- `http://localhost:3000` → public zone
- `http://dashboard.localhost:3000` → staff zone

The middleware classifies these hosts via the `classifyHost` function (Step 2). No special dev config needed beyond `/etc/hosts`.

### Step 5 — `next.config.ts` / `vercel.json`

`next.config.ts` — no change needed; Next handles multi-host on the same deployment.

`vercel.json` — confirm both `zookfit.in` and `dashboard.zookfit.in` point at the same Vercel project (DNS + domain config in the Vercel UI; not a file change). Document this in the PR description.

### Step 6 — Logged-out flow on staff host

Visiting `dashboard.zookfit.in/anything` without a session should redirect to `dashboard.zookfit.in/login?redirect=...` (not to the public host's login). The shared `/login` route can render the same panel on either host; the **redirect target after login** is what changes — handled in plan #02.

### Step 7 — CSP adjustments

The current CSP allows scripts from `accounts.google.com`, `appleid.cdn-apple.com`, `maps.googleapis.com`, `checkout.razorpay.com`. After the host split, `connect-src` may need to include both `https://zookfit.in` and `https://dashboard.zookfit.in` so a session refresh issued by a page on one host can call API endpoints on the other.

Audit `originFromEnv()` callers — make sure `NEXT_PUBLIC_APP_URL` and `NEXT_PUBLIC_WEB_URL` are set to the staff and public origins respectively, both included in `connect-src`.

### Step 8 — Sitemap and robots

`apps/web/app/sitemap.ts` and `apps/web/app/robots.ts` should:
- `robots.ts`: `Allow: /` on public host, `Disallow: /` on staff host. Conditionalize on the request's `host` header (Next allows reading it via `headers()` in route handlers).
- `sitemap.ts`: emit only public URLs. Dashboard pages must not appear in sitemap.

### Step 9 — Update `apps/mobile` references

The mobile app uses `toWebUrl()` ([`apps/mobile/src/lib/api.ts`](apps/mobile/src/lib/api.ts)) to construct web links (e.g., `platform.tsx` builds a dashboard URL). Confirm that path resolution still works — link templates may need adjustment to explicitly use the staff host for staff-only destinations.

Search: `git grep -n "toWebUrl\|NEXT_PUBLIC_WEB" apps/mobile`. Update any caller that produces a staff URL to use the staff origin.

### Step 10 — Back-compat redirects

Update `canonicalRedirectHosts` to:
- `app.zookfit.in` → `zookfit.in` (public)
- `app.zook.kyokasuigetsu.xyz` → `zookfit.in` (public, or `dashboard.zookfit.in` if it was the staff dev host — investigate)
- `zook-gym-app.vercel.app` → `zookfit.in` (public)

Any old emailed/saved link like `https://zookfit.in/dashboard` continues to work — the middleware sees public host + staff path and 308s to `dashboard.zookfit.in/dashboard`.

## Files created

- `apps/web/src/lib/host-routing.ts`
- `apps/web/src/lib/host-routing.test.ts`

## Files modified

- `apps/web/middleware.ts`
- Cookie setter file(s) — likely in `apps/web/src/server/session.ts` or `apps/web/src/server/context.ts`
- `apps/web/app/robots.ts`
- `apps/web/app/sitemap.ts`
- `apps/mobile/src/lib/api.ts` (toWebUrl callers, only if needed)

## Files deleted

None in this plan.

## UI/UX fixes shipped

- Staff has a dedicated, bookmarkable URL: `dashboard.zookfit.in`
- No more accidental mixing of marketing and staff surfaces
- Members can be sent `zookfit.in/...` links without leaking staff routes
- Old links continue to work via 308 redirects

## Acceptance criteria

- [ ] Visiting `https://dashboard.zookfit.in/` while logged in as owner shows the dashboard.
- [ ] Visiting `https://zookfit.in/dashboard` while logged in 308-redirects to `https://dashboard.zookfit.in/dashboard`.
- [ ] Visiting `https://dashboard.zookfit.in/g/<username>` 308-redirects to `https://zookfit.in/g/<username>`.
- [ ] Visiting `https://dashboard.zookfit.in/` without a session redirects to `https://dashboard.zookfit.in/login?redirect=/`.
- [ ] Visiting `https://zookfit.in/` without a session renders the public homepage (no auth redirect).
- [ ] Visiting `https://app.zookfit.in/` 308-redirects to `https://zookfit.in/`.
- [ ] `dev` setup works locally: `dashboard.localhost:3000` for staff, `localhost:3000` for public.
- [ ] Cookie set on one subdomain is read on the other (`.zookfit.in` scope).
- [ ] Robots disallow `/` on staff host; sitemap excludes dashboard paths.
- [ ] `pnpm -w typecheck` clean.
- [ ] `pnpm -w test --filter @zook/web` clean.

## What this plan does NOT do

- Does not change post-login redirect logic (plan #02).
- Does not introduce member-friendly slugs (plan #03).
- Does not change any route or page content — pure host plumbing.
- Does not touch the Vercel project config (manual step documented in PR).
