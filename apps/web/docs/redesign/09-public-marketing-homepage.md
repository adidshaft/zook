# Plan 09 — Public Marketing Homepage + Gym Profile

## Goal

Rewrite the public-facing surfaces so they:

1. Live cleanly on `zookfit.in` (the public host), with appropriate caching and zero auth chrome.
2. Use semantic theme tokens (per plan #04) and look correct in light mode (which is the default on the public host since marketing audiences expect light).
3. Break apart the two largest public files: [`page.tsx`](apps/web/app/page.tsx) (569 lines, homepage) and [`g/[username]/page.tsx`](apps/web/app/g/[username]/page.tsx) (621 lines, gym profile).

## Why

- The homepage is one file with 8+ sections (hero, features, gym types, screenshots, testimonials, pricing, CTA, footer). Maintaining each section in a 569-line file is hard. They're cleanly separable.
- The gym profile (621 lines) similarly bundles hero, plans, schedule, location, contact, reviews-ish content.
- Both render server-side and should be edge-cacheable. Today they fetch session info on every request to support the account-aware nav — extract that surface so the rest can cache.

## Prerequisites

- Plan #01 (host split) merged.
- Plan #02 (auth + host destinations) merged.
- Plan #04 (theme tokens) merged.

## Current state

- [`apps/web/app/page.tsx`](apps/web/app/page.tsx) (569 lines) — homepage.
- [`apps/web/app/g/[username]/page.tsx`](apps/web/app/g/[username]/page.tsx) (621 lines) — public gym profile.
- [`apps/web/app/gyms/page.tsx`](apps/web/app/gyms/page.tsx) — gym discovery.
- [`apps/web/app/in/[username]/page.tsx`](apps/web/app/in/[username]/page.tsx) — likely a deep-link landing.
- [`apps/web/app/join/[username]/page.tsx`](apps/web/app/join/[username]/page.tsx) — join flow start.
- [`apps/web/app/r/[code]/page.tsx`](apps/web/app/r/[code]/page.tsx) — referral redirect.
- [`apps/web/app/qr/[username]/route.ts`](apps/web/app/qr/[username]/route.ts) — QR redirect.
- Nav: [`public-nav.tsx`](apps/web/src/components/public-nav.tsx) (54 lines), [`account-aware-public-nav.tsx`](apps/web/src/components/account-aware-public-nav.tsx) (39 lines).

## Architectural target

```
apps/web/src/components/public/
├── nav/
│   ├── public-nav.tsx         — non-account variant (cacheable)
│   └── account-aware-nav.tsx  — small client component that hydrates the account link
├── footer.tsx
├── home/
│   ├── hero.tsx
│   ├── feature-grid.tsx
│   ├── gym-types.tsx
│   ├── screenshots.tsx
│   ├── testimonials.tsx
│   ├── pricing.tsx
│   ├── cta-band.tsx
│   └── copy.ts               — strings (or via next-intl)
├── gym/
│   ├── hero.tsx
│   ├── plans-grid.tsx
│   ├── schedule.tsx
│   ├── location-card.tsx
│   ├── contact-card.tsx
│   ├── join-cta.tsx
│   └── empty-state.tsx
└── discovery/
    ├── grid.tsx
    └── filters.tsx
```

The homepage `page.tsx` becomes a thin composition file that imports each section and arranges them. Same for the gym profile.

## Execution steps

### Step 1 — Account-aware nav as a hydration island

Today's `account-aware-public-nav.tsx` runs server-side, reading the session cookie. That's correct, but it forces the whole homepage to be dynamic.

Refactor:

1. **Static structure**: `apps/web/src/components/public/nav/public-nav.tsx` renders the nav HTML without the account section. Fully static. Edge cacheable.
2. **Account island**: `apps/web/src/components/public/nav/account-aware-nav.tsx` is a small client component. On mount it calls a lightweight `/api/auth/session-summary` (existing) and renders either "Login" or "Dashboard / Membership" link.
3. The homepage becomes statically generated (or near it) — only the small client island hydrates.

This gives:
- Lightning-fast first paint.
- Cacheable HTML at the edge.
- The session info still appears within ~100ms.

### Step 2 — Homepage split

Read `apps/web/app/page.tsx`. Identify section boundaries (look for `Reveal`, `Stagger`, `GlassCard`, large divs). Extract each into `apps/web/src/components/public/home/`.

Rewrite `apps/web/app/page.tsx` as a thin composition:

```tsx
import { resolvePublicLocale, alternatePublicLocale } from "@/lib/public-i18n";
import { PublicNav } from "@/components/public/nav/public-nav";
import { AccountAwareNav } from "@/components/public/nav/account-aware-nav";
import { Hero } from "@/components/public/home/hero";
import { FeatureGrid } from "@/components/public/home/feature-grid";
import { GymTypes } from "@/components/public/home/gym-types";
import { Screenshots } from "@/components/public/home/screenshots";
import { Testimonials } from "@/components/public/home/testimonials";
import { Pricing } from "@/components/public/home/pricing";
import { CtaBand } from "@/components/public/home/cta-band";
import { Footer } from "@/components/public/footer";

export const revalidate = 3600; // edge-cache for an hour

export default async function HomePage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const locale = resolvePublicLocale((await searchParams) ?? {});
  return (
    <>
      <PublicNav locale={locale}>
        <AccountAwareNav />
      </PublicNav>
      <Hero locale={locale} />
      <FeatureGrid locale={locale} />
      <GymTypes locale={locale} />
      <Screenshots locale={locale} />
      <Testimonials locale={locale} />
      <Pricing locale={locale} />
      <CtaBand locale={locale} />
      <Footer locale={locale} />
    </>
  );
}
```

Target: under 100 lines for `page.tsx`. Each section file under 200 lines.

### Step 3 — Gym profile split

Read `apps/web/app/g/[username]/page.tsx`. Identify sections.

Extract to `apps/web/src/components/public/gym/` per architectural target.

Rewrite the page:

```tsx
export const revalidate = 600;  // cache gym profiles for 10 min

export default async function GymProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const gym = await getPublicGymProfile(username);
  if (!gym) notFound();
  return (
    <>
      <PublicNav>
        <AccountAwareNav />
      </PublicNav>
      <GymHero gym={gym} />
      <GymPlansGrid plans={gym.plans} />
      <GymSchedule schedule={gym.schedule} />
      <GymLocationCard location={gym.location} />
      <GymContactCard contact={gym.contact} />
      <GymJoinCTA gymUsername={gym.username} />
      <Footer />
    </>
  );
}
```

Target: under 80 lines for `page.tsx`.

### Step 4 — Gym discovery (`/gyms`)

Smaller (~400 lines based on similar surfaces). Apply the same pattern: extract Grid and Filters; page becomes thin.

### Step 5 — Consolidate `in/`, `join/`, `r/`, `qr/`

These are small (< 25 lines each) deep-link landings. Verify they all work after the host split and the new nav. No major change needed beyond import-path updates.

If `/in/[username]` and `/g/[username]` overlap, consolidate (mirror mobile plan #11). Likely: `in/[username]` is a tracked landing that redirects to `/g/[username]?source=...`. Confirm and keep.

### Step 6 — Light mode is the default on public host

The cookie-driven theme from plan #04 applies. For the public host, if no cookie is set, default to **light** (already the default in plan #04). The dark variant is still selectable via theme switcher in the user menu (after login).

### Step 7 — Server-side rendering vs static

Mark the homepage and `/gyms` page with `export const revalidate = N` for ISR-style caching. Gym profiles can revalidate every 10 minutes.

The CSP nonce setup (middleware) is per-request and incompatible with `export const dynamic = "force-static"`. Use `revalidate` (ISR) instead; that's compatible.

### Step 8 — Meta + SEO

Each route gets a proper `generateMetadata()`:
- Homepage: brand SEO, OG image, twitter card.
- Gym profile: gym-specific OG image, schema.org `LocalBusiness` structured data.

`apps/web/src/components/public/seo/structured-data.tsx` — JSON-LD blocks for gyms.

### Step 9 — Theme migration

Every component touched must use semantic CSS vars.

## Files created

- `apps/web/src/components/public/nav/{public-nav,account-aware-nav}.tsx`
- `apps/web/src/components/public/footer.tsx`
- `apps/web/src/components/public/home/{hero,feature-grid,gym-types,screenshots,testimonials,pricing,cta-band,copy}.ts(x)`
- `apps/web/src/components/public/gym/{hero,plans-grid,schedule,location-card,contact-card,join-cta,empty-state}.tsx`
- `apps/web/src/components/public/discovery/{grid,filters}.tsx`
- `apps/web/src/components/public/seo/structured-data.tsx`

## Files modified

- `apps/web/app/page.tsx` (slimmed)
- `apps/web/app/g/[username]/page.tsx` (slimmed)
- `apps/web/app/gyms/page.tsx` (slimmed)
- Existing `public-nav.tsx` and `account-aware-public-nav.tsx` (replaced by new home; old paths kept as re-exports until plan #11)
- Other small public pages (`in/`, `join/`, `r/`) — import path updates

## Files deleted

None in this plan. Old components live until plan #11.

## UI/UX fixes shipped

- Faster first paint (homepage near-static)
- Account-aware section hydrates separately, doesn't block initial paint
- Light mode default on marketing pages
- Better SEO via structured data
- Gym profiles cached at the edge

## Acceptance criteria

- [ ] `apps/web/app/page.tsx` under 100 lines.
- [ ] `apps/web/app/g/[username]/page.tsx` under 100 lines.
- [ ] `apps/web/app/gyms/page.tsx` under 100 lines.
- [ ] Each section component under 200 lines.
- [ ] Homepage HTML returned from a fresh request shows real content before JS hydrates (verify with `view-source:` or curl).
- [ ] Account-aware nav hydrates within 200ms after page load.
- [ ] Light mode is the default for visitors without a theme cookie.
- [ ] Lighthouse Performance score on homepage > 90 (mobile profile).
- [ ] Gym profile renders with structured data (verify in Google Rich Results test).
- [ ] `pnpm -w typecheck` clean.
- [ ] `pnpm -w test --filter @zook/web` clean.

## What this plan does NOT do

- Does not redesign visual content — just splits files and improves caching.
- Does not change copy or translations.
- Does not introduce a CMS.
- Does not add new public pages.
