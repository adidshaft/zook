# Plan 03 — Member-Friendly Public Slug

## Goal

Give each member a memorable, user-facing URL on the public host: `zookfit.in/m/<slug>` (or a user-chosen vanity `zookfit.in/@<handle>` if available). Keep the existing `/me/<privateHandle>` route working for back-compat.

## Why

The user-stated requirement: "for members it could be a simple `zookfit.in/<slug>` URL." Today `/me` is the entry point and `/me/<handle>` uses a hashed `ZF-XXXXXX` private handle ([`apps/web/src/server/private-user-handle.ts`](apps/web/src/server/private-user-handle.ts)) that's awkward to share or remember. A slug system gives:

- A bookmarkable URL members can save on their phone home screen.
- A shareable URL (e.g., to family) that doesn't leak the private hashed handle.
- A clean foundation for an opt-in public profile later (not part of this plan).

## Important boundary

This plan does NOT make the member surface public. It stays gated by `requireDashboardSession()`. The slug is just a URL **alias** — visiting `zookfit.in/m/<slug>` without a session redirects to login, same as `/me` today.

## Prerequisites

- Plans #01, #02 merged.

## Current state

- Private handle: `privateUserHandle(userId)` → `ZF-XXXXXX` ([`private-user-handle.ts`](apps/web/src/server/private-user-handle.ts), 6 lines, SHA-256 derived).
- Used in [`me/[handle]/page.tsx`](apps/web/app/me/[handle]/page.tsx) — verifies the URL handle matches the session's `user.privateHandle` and renders [`me/page.tsx`](apps/web/app/me/page.tsx) (181 lines).
- The session shape includes `user.privateHandle`. No `slug` field exists on the user model.

## Architectural target

```
URL                              Behavior
─────────────────────────────────────────────────────────────────────
zookfit.in/m/<slug>              Member's private dashboard (gated)
zookfit.in/me                    Redirects to /m/<slug> if session has slug,
                                 else /me/<privateHandle>, else stays on /me
zookfit.in/me/<privateHandle>    Existing route — kept for back-compat
zookfit.in/m/<other-slug>        Redirects to /m/<own-slug>; user can only
                                 access their own private surface
```

`slug` is a 6-12 char URL-safe string. It defaults to a deterministic, friendlier derivative of the user ID (avoiding collisions) and can be customized later via settings (not in this plan; only the data + route layer).

## Slug generation

Algorithm: `slug = nanoid(8, customAlphabet("0123456789abcdefghjkmnpqrstvwxyz", 8))`. Avoids confusable chars (no `i`, `l`, `o`, `u`). Stored as a unique field on `User`.

```ts
// apps/web/src/server/member-slug.ts (NEW)
import { customAlphabet } from "nanoid";
const alphabet = "0123456789abcdefghjkmnpqrstvwxyz";
const generate = customAlphabet(alphabet, 8);

export function generateMemberSlug() {
  return generate();
}

const SLUG_REGEX = /^[0-9a-z]{4,20}$/;
export function isValidSlugFormat(value: string) {
  return SLUG_REGEX.test(value);
}

const RESERVED = new Set([
  "me", "g", "in", "join", "r", "qr", "gyms", "guardian", "guardian-consent",
  "login", "verify-otp", "support", "terms", "privacy", "status",
  "dashboard", "desk", "coach", "platform", "staff", "start-gym",
  "checkout", "api", "_next", "robots.txt", "sitemap.xml", "favicon.ico",
  "admin", "owner", "manager", "trainer", "member", "settings",
]);
export function isReservedSlug(value: string) {
  return RESERVED.has(value.toLowerCase());
}
```

## Database

Add a `slug` field to the `User` model in `packages/db/prisma/schema.prisma`:

```prisma
model User {
  // ... existing fields
  slug String? @unique @db.VarChar(32)
  // ...
}
```

Migration:
1. Add the column nullable.
2. Backfill: a server-side script populates `slug` for every existing user using `generateMemberSlug()`, retrying on unique conflict.
3. Once backfilled, make NOT NULL in a follow-up migration (out of scope for this plan — leave nullable for safety).

For the migration script, create `packages/db/scripts/backfill-member-slugs.ts`. Document running it in the PR.

## Execution steps

### Step 1 — Schema + migration

1. Edit `schema.prisma`, add `slug String? @unique @db.VarChar(32)` to `User`.
2. Run `pnpm db:generate` to produce a Prisma migration.
3. Verify the generated SQL only adds the column + a unique index.
4. Write backfill script `packages/db/scripts/backfill-member-slugs.ts`.

### Step 2 — Slug helpers

Create `apps/web/src/server/member-slug.ts` per snippet above. Add `apps/web/src/server/member-slug.test.ts` covering valid/invalid/reserved.

### Step 3 — Slug assignment hook

When a user signs up, assign a slug. Find the user-creation site (search: `git grep -nE "prisma\.user\.create\b" apps/web/src/server`). Add slug generation:

```ts
async function ensureUniqueSlug(prisma: PrismaClient): Promise<string> {
  for (let i = 0; i < 8; i++) {
    const slug = generateMemberSlug();
    const exists = await prisma.user.findUnique({ where: { slug } });
    if (!exists) return slug;
  }
  throw new Error("Could not generate unique member slug after 8 attempts");
}
```

On user creation, set `slug: await ensureUniqueSlug(prisma)`.

### Step 4 — Session includes slug

Wherever the session summary is built (search: `git grep -n "privateHandle" apps/web/src/server`), include `slug` in the returned `AuthSessionSummary.user`. Update the type in `packages/core/types` (`AuthUser` likely) to add `slug: string | null`.

Add a fallback: if a logged-in user has `slug === null` (pre-backfill), the session-summary builder fills one on the fly and persists it. This makes the rollout self-healing.

### Step 5 — Route: `/m/[slug]/page.tsx`

Create `apps/web/app/m/[slug]/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { requireDashboardSession } from "@/lib/server-auth";
import MyMembershipPage from "../../me/page";

export default async function MemberSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await requireDashboardSession();
  const { slug } = await params;
  const ownSlug = session.user.slug;

  if (!ownSlug) {
    // user lacks slug for some reason; fall back to /me which redirects to /me/<handle>
    redirect("/me");
  }
  if (slug.toLowerCase() !== ownSlug.toLowerCase()) {
    redirect(`/m/${ownSlug}`);
  }

  return <MyMembershipPage />;
}
```

`MyMembershipPage` is the existing `me/page.tsx` component — re-export it cleanly or refactor it into a shared component in `apps/web/src/components/member/membership-surface.tsx`. The latter is cleaner; do that if the page export shape is awkward.

### Step 6 — Update `/me` redirect

Today `apps/web/app/me/page.tsx` redirects PLATFORM_ADMIN / OWNER / RECEPTIONIST / TRAINER away and shows the membership page for members. After this plan, members visiting `/me` should redirect to `/m/<own-slug>` so the URL bar shows the friendly form:

```tsx
// apps/web/app/me/page.tsx (top)
const session = await requireDashboardSession();
if (session.user.isPlatformAdmin) redirect(`${origins.dashboard}/platform`);
if (hasOwnerDashboardAccess(session)) redirect(`${origins.dashboard}/dashboard`);
if (hasDeskAccess(session)) redirect(`${origins.dashboard}/desk`);
if (hasCoachAccess(session)) redirect(`${origins.dashboard}/coach`);
if (session.user.slug) redirect(`/m/${session.user.slug}`);     // NEW
// fall through to render with privateHandle path
```

### Step 7 — Update `/me/[handle]`

Existing `me/[handle]/page.tsx` — also redirect to `/m/<slug>` if the user has a slug:

```tsx
if (session.user.slug) redirect(`/m/${session.user.slug}`);
```

This makes `/me/<privateHandle>` a back-compat alias; new traffic always lands on `/m/<slug>`.

### Step 8 — Update auth destinations

In [`auth-destinations.ts`](apps/web/src/lib/auth-destinations.ts) (rewritten in plan #02), the `memberPath()` helper now prefers `slug` over `privateHandle`:

```ts
function memberPath(session: AuthSessionSummary): string {
  if (session.user.slug) return `/m/${session.user.slug}`;
  if (session.user.privateHandle) return `/me/${session.user.privateHandle}`;
  return "/me";
}
```

### Step 9 — Update host-routing helper

Add `/m` to `PUBLIC_PATH_PREFIXES` in `apps/web/src/lib/host-routing.ts`.

### Step 10 — Sitemap behavior

`/m/<slug>` URLs must NOT appear in the sitemap (they're private even though they 200 only for the slug owner). `apps/web/app/sitemap.ts` should explicitly exclude them. Robots already disallows `/m/` for safety (add it).

### Step 11 — UI surface

In the member's private surface ([`me/page.tsx`](apps/web/app/me/page.tsx) line 65 shows "Private ID: <handle>"), add a copy-to-clipboard control near the existing private ID display that copies the full URL `https://zookfit.in/m/<slug>`. Label: "Your private link." Small note: "Only you can see this when signed in."

### Step 12 — Vanity slugs (deferred)

User-customizable slugs (e.g., picking your own) is out of scope. Leave a TODO comment in `member-slug.ts` and add a follow-up issue.

## Files created

- `apps/web/app/m/[slug]/page.tsx`
- `apps/web/src/server/member-slug.ts`
- `apps/web/src/server/member-slug.test.ts`
- `apps/web/src/components/member/membership-surface.tsx` (if refactor in Step 5 chosen)
- `packages/db/scripts/backfill-member-slugs.ts`

## Files modified

- `packages/db/prisma/schema.prisma` (+ generated migration)
- `apps/web/src/server/session.ts` (or wherever AuthSessionSummary is built)
- `packages/core/types/*.ts` (add `slug` to AuthUser)
- `apps/web/src/lib/auth-destinations.ts`
- `apps/web/app/me/page.tsx`
- `apps/web/app/me/[handle]/page.tsx`
- `apps/web/src/lib/host-routing.ts` (already added `/m` if pre-loaded)
- `apps/web/app/sitemap.ts`
- `apps/web/app/robots.ts`
- User-creation server file

## Files deleted

None.

## UI/UX fixes shipped

- Member URL is short, memorable, shareable: `zookfit.in/m/abc12xyz`
- "Copy my private link" affordance on the member surface
- Old `/me` and `/me/<handle>` URLs continue to work, transparently redirect to `/m/<slug>`

## Acceptance criteria

- [ ] Every user has a unique `slug` after backfill runs.
- [ ] Visiting `/m/<own-slug>` while logged in renders the membership surface.
- [ ] Visiting `/m/<someone-else's-slug>` redirects to `/m/<own-slug>`.
- [ ] Visiting `/m/<slug>` without a session redirects to `/login?redirect=/m/<slug>`.
- [ ] Visiting `/me` redirects to `/m/<slug>` for members with a slug.
- [ ] Visiting `/me/<privateHandle>` redirects to `/m/<slug>` for the same user.
- [ ] Post-login destination for members is `/m/<slug>`.
- [ ] Slug not reserved (cannot equal `dashboard`, `gyms`, `login`, etc.).
- [ ] Slug format restricted to lowercase alphanumeric, 4-20 chars.
- [ ] Reserved + invalid slugs return 404, not redirect to user's own slug (prevents probing).
- [ ] `zookfit.in/m/<slug>` excluded from sitemap; `/m/` disallowed in robots.
- [ ] "Copy my private link" works and copies the full URL.
- [ ] `pnpm -w typecheck` clean.
- [ ] `pnpm -w test --filter @zook/web` clean.
- [ ] DB migration applies cleanly forward and rolls back cleanly.

## What this plan does NOT do

- Does not allow custom vanity slugs (deferred).
- Does not make any data public — `/m/<slug>` requires a session.
- Does not change `privateHandle` or remove `/me/<handle>` route — kept as a permanent back-compat alias.
- Does not change member surface content (covered when [`me/page.tsx`](apps/web/app/me/page.tsx) is touched in plan #11).
