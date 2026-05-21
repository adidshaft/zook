# Zook Web Redesign — Plan Overview

This folder contains the implementation plans for a multi-phase redesign of `apps/web`. Each plan is **self-contained**: a coding agent with no prior context can execute it by reading only that file plus the codebase.

## Headline change

The single biggest architectural change is **host-based routing**:

- `dashboard.zookfit.in` — staff app (owner, admin, receptionist, trainer). Members hitting this host get auto-redirected to the canonical zone.
- `zookfit.in` — public + member zone. Marketing site, gym profiles, member private surface, login, join flows. Staff hitting private staff paths on this host get auto-redirected to `dashboard.zookfit.in`.

Today, [middleware.ts:6-11](apps/web/middleware.ts#L6) does the **opposite** — it actively collapses `dashboard.zookfit.in` onto `zookfit.in`. The first plan rips that out and reverses the rule.

## Why this redesign

Same four classes of problems as the mobile redesign, adapted for the web app:

1. **Routing/host confusion.** Owners, receptionists, trainers, members all live at the same origin. Staff are one tab away from accidentally landing on member marketing surfaces; deep links from the mobile app to the dashboard pass through a public origin first.
2. **Sub-route mega-dispatch.** Every dashboard subroute (`/dashboard/members`, `/dashboard/payments`, etc.) is a thin file that calls `renderDashboardRoute(...)`. The real dispatch happens in [`dashboard-operational-model.ts:417`](apps/web/src/components/dashboard-operational-model.ts#L417) (`resolveMode`) — a 500-line modal-string lookup that turns a URL fragment into a `DashboardMode` enum. The page-level files are decorative; the actual logic is centralized in one giant model.
3. **Big section components.** `members-section.tsx` 894 lines, `shop-section.tsx` 691, `payments-panel.tsx` 757, `desk-panel.tsx` 658, `dashboard-primitives.tsx` 851, `g/[username]/page.tsx` 621, `page.tsx` (homepage) 569.
4. **Dark-only theme; no contrast pass.** `--zook-subtle: #778273` on `--zook-bg: #070908` ≈ 3.6:1 — fails WCAG AA. Light theme doesn't exist. CSS variables live in `packages/ui/src/tokens.css`.

Smaller but real:
- Member private URL is `/me` — fine but not memorable. Could be slugged with the user's `privateHandle` (`/m/ZF-XXXXXX` style) or a user-chosen vanity, so users can bookmark "their" zookfit.in URL the way the user requested.
- `?view=join-requests` query-param routing appears in 3 places ([nav.ts:42](apps/web/src/components/dashboard/shell/nav.ts#L42), [dashboard-overview.tsx:116, :172, :333](apps/web/src/components/dashboard/shell/dashboard-overview.tsx#L116)).
- Auth-destination resolver (`auth-destinations.ts`) is mostly correct but doesn't account for host. Post-login redirects need host awareness after plan #01.

## The plans, in execution order

| # | File | Title | Depends on |
|---|------|-------|------------|
| 00 | `00-overview.md` | This file | — |
| 01 | `01-host-split.md` | Reverse the canonical redirect; split `dashboard.zookfit.in` vs `zookfit.in` in middleware | — |
| 02 | `02-auth-and-redirects.md` | Host-aware login, post-login redirects, role-aware nav | 01 |
| 03 | `03-member-public-slug.md` | Member-friendly URL on canonical host (`zookfit.in/<slug>`) | 01, 02 |
| 04 | `04-theme-tokens-and-light-mode.md` | Semantic CSS vars; light + dark; contrast pass | — (parallel) |
| 05 | `05-dashboard-route-flattening.md` | Replace `?view=` + section-dispatcher mega-model with real subroutes | 02 |
| 06 | `06-members-section-split.md` | Members 894-line file → focused subroutes; shared MemberList | 05 |
| 07 | `07-shop-payments-plans-split.md` | Same treatment for shop, payments, plans | 05 |
| 08 | `08-desk-coach-rewrites.md` | Desk (658 lines) and Coach into proper layouts | 05 |
| 09 | `09-public-marketing-homepage.md` | Homepage rewrite (569 lines), gym profile (621 lines), nav consolidation | 04 |
| 10 | `10-data-and-server-cleanup.md` | Split `read-models.ts` (800 lines), `query-hooks.ts`, server domains | 05 |
| 11 | `11-kill-list-and-cleanup.md` | Strangle dead code, finish theme migration, audit | All prior |

**Hard ordering:** 01 → 02 → 03 (host setup must come first). 05 before 06/07/08. 04 can run in parallel with 01/02/03. 09 needs 04 (uses new tokens). 10 can run any time after 05. 11 is last.

**Parallelism:** 04 (theme) is pure CSS/token work and runs in parallel with the host split. After 05 lands, 06/07/08 are file-disjoint and can run in parallel by different agents.

## Conventions every plan follows

### Host awareness
Every server-side helper that resolves a redirect target must take the **current host** into account. Helpers in `apps/web/src/lib/auth-destinations.ts` get rewritten in plan #02 to return host-qualified URLs (or, more commonly, to return a relative path + a host flag the middleware honors).

### File-based routes only
Next.js App Router. No `?view=` hacks. No section-string dispatch tables. Each named surface gets its own folder + `page.tsx`.

### Permission-gated, not role-gated
The dashboard already has a permission map ([dashboard-route.tsx:14](apps/web/app/dashboard/dashboard-route.tsx#L14)). New plans extend this and gate at the route level. UI doesn't show actions the user can't perform.

### Tokens via CSS variables, light + dark via `[data-theme="dark|light"]`
After plan #04, components reference semantic vars (`--surface`, `--text-primary`, `--accent`) only. Old `--zook-graphite-*` etc. become palette internals.

### Strangler-fig migration
Never big-bang. New routes live next to old, old routes redirect, deletions happen only in plan #11.

### Acceptance criteria
A plan is "done" when:
- All items in its checklist verified
- `pnpm -w typecheck` clean
- `pnpm -w test --filter @zook/web` clean
- Manual smoke per acceptance section
- All redirects in the plan work (including back-compat)

### Files Codex must NOT touch unless the plan says so
- `apps/mobile/**` — mobile redesign is separate
- `packages/core/**` — shared types/permissions; read only
- `packages/db/**` — schema; read only
- `apps/web/src/server/api-router/**` — backend handlers stay
- `vercel.json` — only plan #01 touches it

## Repository orientation

```
apps/web/
├── middleware.ts                 — host redirect + CSP + auth gate (plan #01 rewrites)
├── next.config.ts
├── vercel.json                   — build + crons
├── app/                          — Next.js App Router
│   ├── layout.tsx                — root (80 lines)
│   ├── page.tsx                  — public homepage (569 lines)
│   ├── login/page.tsx, verify-otp/page.tsx, support, terms, privacy, status
│   ├── dashboard/                — owner/admin staff app
│   │   ├── layout.tsx            — intl provider only (26 lines)
│   │   ├── dashboard-route.tsx   — shared loader + permissions (108 lines)
│   │   ├── [[...section]]/page.tsx  — catch-all that calls renderDashboardRoute
│   │   ├── members, plans, plans/{coupons,offers,referrals}, payments, payments/refunds,
│   │   │   notifications, notifications/{history,templates}, attendance, attendance/qr-display,
│   │   │   reports, shop, shop/orders, staff, branches, audit, ai, billing, settings,
│   │   │   profile, public-profile
│   │   │   — each is a 1-line wrapper calling renderDashboardRoute
│   ├── desk/                     — receptionist (78 + 658-line panel)
│   ├── coach/page.tsx            — trainer landing (33 lines, content in panel)
│   ├── platform/[[...section]]/  — platform admin
│   ├── me/page.tsx + [handle]/   — member private surface (181 lines)
│   ├── g/[username]/             — public gym profile (621 lines)
│   ├── gyms/, start-gym/, join/, in/, r/, qr/, checkout/, staff/invite/
│   ├── guardian/, guardian-consent/
│   ├── api/[[...path]]/route.ts  — API gateway
│   ├── robots.ts, sitemap.ts, globals.css
│   └── not-found.tsx, global-error.tsx, loading.tsx
└── src/
    ├── components/
    │   ├── dashboard-shell.tsx (236), dashboard-operational-panel.tsx (500),
    │   ├── dashboard-operational-model.ts (512) — the resolveMode dispatcher
    │   ├── dashboard-primitives.tsx (851), dashboard-route helpers
    │   ├── dashboard/
    │   │   ├── shell/{dashboard-sidebar,dashboard-header,user-menu,mobile-dashboard-menu,nav.ts,types.ts,copy.ts,owner-setup-checklist,branch-switcher,...}
    │   │   ├── sections/{members,plans,branches,staff,shop,overview-operational-section,...}
    │   │   ├── read-only/{payments,attendance,notifications,reports,audit,ai,shop-order-payment-control}-panel.tsx
    │   │   ├── operational/{controller-state,controller-types,actions,use-dashboard-operational-controller}
    │   │   └── primitives/index.tsx
    │   ├── desk-panel.tsx (658), coach-command-panel.tsx (180), platform-operations-panel.tsx
    │   ├── login-panel.tsx (552), checkout-panel.tsx, razorpay-checkout-panel.tsx
    │   ├── public-nav.tsx, account-aware-public-nav.tsx, hero-ornaments.tsx,
    │   ├── notifications/, desk/, ui/, motion-primitives.tsx, glass-card.tsx,
    │   ├── share-button.tsx, query-provider.tsx, layout-transition.tsx, …
    └── lib/
        ├── api-client.ts, query-hooks.ts (91), data.ts (246),
        ├── auth-destinations.ts (post-login redirect resolver),
        ├── server-auth.ts (requireDashboardSession),
        ├── format.ts, public-i18n.ts, use-t.ts, use-operational-resource.ts
    └── server/
        ├── read-models.ts (800), api-router/, api-router.ts,
        ├── session.ts, context.ts, access.ts,
        ├── public-gym-read-models.ts, private-user-handle.ts,
        ├── reports-service.ts, payment-runtime.ts, push-runtime.ts,
        ├── files.ts, audit.ts, rate-limit.ts, security.ts, readiness.ts, ...
```

## How to verify a plan landed

1. `pnpm -w typecheck` clean
2. `pnpm -w test --filter @zook/web` clean
3. `pnpm --filter @zook/web dev` boots; both hosts work locally (via `/etc/hosts` aliasing — plan #01 documents the dev setup)
4. Manual smoke per role:
   - Owner/Admin on `dashboard.zookfit.in` — main dashboard renders, navigates all sections
   - Receptionist on `dashboard.zookfit.in/desk` — queue renders
   - Trainer on `dashboard.zookfit.in/coach` — coach view renders
   - Member on `zookfit.in/<slug>` — private surface renders
   - Logged-out visitor on `zookfit.in` — marketing homepage renders
   - Logged-out visitor on `dashboard.zookfit.in` — redirected to login
5. Old URLs redirect: `zookfit.in/dashboard` → `dashboard.zookfit.in/dashboard`, etc.
6. `git grep` audits per each plan's acceptance criteria
