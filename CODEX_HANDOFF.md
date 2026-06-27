# Zook Platform — Codex Handoff Document

> **Monorepo layout**: `apps/web` (Next.js 14 App Router, API routes at `apps/web/src/server/`) and `apps/mobile` (Expo SDK 52, Expo Router v3). Shared packages live in `packages/`. All server API routes are dispatched from `apps/web/src/app/api/[[...path]]/route.ts` through handler functions in `apps/web/src/server/api-router/`. Marketing website is a standalone Vite/React app at `apps/website/`.

> **Product state (2026-06-27):** Core member experience and most owner admin flows are complete. All 8 tasks from the previous handoff are implemented. The product is ~70% launch-ready. The remaining 30% is split between critical backend plumbing gaps, incomplete web dashboard features, and a marketing site that cannot convert its target audience.

---

## Environment Quick Reference

| Concern | Detail |
|---|---|
| Test device (iOS) | iPhone 16 Pro sim `16E85351-C822-4E5D-8C0F-15A50B8BFA5C` |
| Role switching (demo) | `GET /__demo-role?role=OWNER\|TRAINER\|RECEPTIONIST\|MEMBER` |
| Demo API state | Module-level arrays in `apps/mobile/src/lib/demo-api.ts` are reset on JS runtime restart only; in-session mutations persist across navigations |
| Light-mode gradient rule | Never use `palette.text.*` or `palette.accent.base` as text colour on always-dark `LinearGradient`; use hardcoded light constants (`'#FFFFFF'`, `'#D2FB66'`, etc.) |
| Restore broken demo session | `xcrun simctl keychain booted reset` then relaunch — SecureStore lives in the sim keychain |

---

## Global Gotchas (read before touching any file)

1. **Demo API statefulness.** `demo-api.ts` uses module-level `const` arrays. Any item pushed persists for the lifetime of the JS runtime bundle. Tests that rely on clean state must restart the bundler.

2. **Light-mode gradient collapse.** Most `gradients.*` tokens in `tokens-static.ts` are dark-first. Always pass `mode` to functions like `classTypeGradient(classType, mode)` and branch on `mode === 'light'` for light-safe palettes.

3. **`PENDING_APPROVAL` already in `/me/coaching` filter.** `me-data.ts` line 111 already includes `"PENDING_APPROVAL"` in the `status.in` array. Do not add it again.

4. **`pathMatches` order matters.** Dispatch in `personal-training.ts` matches top-to-bottom. Shorter paths must be registered before longer ones with overlapping prefixes.

5. **Prisma `clean()` helper.** Always wrap new `data:` objects with `clean({...})` when any field is optional. The helper strips `undefined` before Prisma sees it.

6. **Two pre-existing TypeScript errors** in `platform-operations-panel.tsx` and `trainer-diet-plans-panel.tsx` (DataTable `empty` prop) are unrelated to any task here — do not try to fix them unless specifically tasked.

7. **TrainerAssignment dependency chain.** Tasks T1 → T9 (diet history) → T18 (member portal diet) form a strict dependency chain. T18 must be scheduled after T1.

---

## Launch Blockers (implement in order)

The following are hard blockers for a real launch:

1. TrainerAssignment has no create/delete endpoints — every trainer-client feature silently fails for real gyms
2. Scheduled push notifications are never flushed — no cron handler exists
3. Class attendance marking endpoint is missing — trainer class management 404s on every tap
4. Trainer profile GET endpoint is missing — trainer profile screen crashes on load
5. Marketing website has zero navigation on mobile — primary Indian traffic source cannot reach Pricing or Login
6. Marketing website pricing section shows no rupee amounts — Indian gym owners cannot self-qualify
7. Marketing website Satoshi font is declared but never loaded — brand typography falls back to system fonts
8. MemberSubscription expiry is never automated — active member counts are permanently inflated

---

## Task 1 — Trainer-Client Assignment & Profile API

**Effort**: M | **Priority**: P0 | **Layer**: backend

Unlocks trainer client lists, diet plan editing, body progress recording, PT subscriptions, and AI coaching — every trainer-client feature is gated behind `TrainerAssignment` rows that currently cannot be created via the product UI.

### Context

The `TrainerAssignment` model is the foundational join between a member and a trainer within an org. Six+ server-side paths read from it (client list, wellness records, plan assignment resolution, AI plan generation, reports, diet editing). There is **no API endpoint** to create or delete these rows — they exist only in seed scripts. For any real gym, the trainer client list is permanently empty.

The `TrainerProfile` companion model has a PATCH handler in `trainer-operations.ts` but no GET. The mobile `useTrainerProfile()` hook calls `GET /orgs/:orgId/trainers/:trainerUserId/profile` which returns 404, crashing the trainer profile screen on load.

### Files to Change

- `apps/web/src/server/api-router/organization-members.ts`
- `apps/web/src/server/api-router/trainer-operations.ts`

### Approach

#### Assign-trainer endpoint (in `organization-members.ts`)

```ts
// POST /orgs/:orgId/members/:memberId/assign-trainer
if (
  request.method === "POST" &&
  pathMatches(path, ["orgs", /.+/, "members", /.+/, "assign-trainer"])
) {
  const orgId = path[1]!;
  const memberId = path[3]!;
  const ctx = await getRequestContext(request, { orgId });
  requireOrgPermission(ctx, orgId, "TRAINERS_MANAGE");
  const { trainerUserId } = z.object({ trainerUserId: z.string() }).parse(await readJson(request));

  // Validate trainerUserId is a TRAINER in this org
  const trainerMembership = await prisma.organizationUser.findFirst({
    where: { userId: trainerUserId, orgId, role: "TRAINER" },
  });
  if (!trainerMembership) throw validationError("User is not a trainer in this org.");

  await prisma.trainerAssignment.upsert({
    where: { memberId_trainerUserId_orgId: { memberId, trainerUserId, orgId } },
    create: { memberId, trainerUserId, orgId, active: true },
    update: { active: true },
  });
  await writeAuditLog({
    request, orgId, actorUserId: ctx.userId,
    action: "trainer_assignment.created",
    entityType: "trainer_assignment",
    entityId: `${memberId}:${trainerUserId}`,
  });
  return ok({ ok: true });
}

// DELETE /orgs/:orgId/members/:memberId/assign-trainer
if (
  request.method === "DELETE" &&
  pathMatches(path, ["orgs", /.+/, "members", /.+/, "assign-trainer"])
) {
  const orgId = path[1]!;
  const memberId = path[3]!;
  const ctx = await getRequestContext(request, { orgId });
  requireOrgPermission(ctx, orgId, "TRAINERS_MANAGE");
  const { trainerUserId } = z.object({ trainerUserId: z.string() }).parse(await readJson(request));

  await prisma.trainerAssignment.updateMany({
    where: { memberId, trainerUserId, orgId },
    data: { active: false },
  });
  await writeAuditLog({
    request, orgId, actorUserId: ctx.userId,
    action: "trainer_assignment.removed",
    entityType: "trainer_assignment",
    entityId: `${memberId}:${trainerUserId}`,
  });
  return ok({ ok: true });
}
```

#### Trainer profile GET (in `trainer-operations.ts`, before the existing PATCH)

```ts
// GET /orgs/:orgId/trainers/:trainerUserId/profile
if (
  request.method === "GET" &&
  pathMatches(path, ["orgs", /.+/, "trainers", /.+/, "profile"])
) {
  const orgId = path[1]!;
  const trainerUserId = path[3]!;
  const ctx = await getRequestContext(request, { orgId });
  // Caller is the trainer themselves OR has TRAINERS_MANAGE
  if (ctx.userId !== trainerUserId) {
    requireOrgPermission(ctx, orgId, "TRAINERS_MANAGE");
  } else {
    requireOrgPermission(ctx, orgId, "PLANS_CREATE");
  }
  const profile = await prisma.trainerProfile.findFirst({
    where: { userId: trainerUserId, orgId },
  });
  return ok({ profile }); // null when no row exists yet — mobile handles this
}
```

#### Demo mode (`demo-api.ts`)

Add demo handlers for both assign-trainer endpoints:
- POST: push `{ memberId, trainerUserId, orgId, active: true }` to a module-level `demoTrainerAssignments` array
- DELETE: find and flip `active: false`

### Acceptance Criteria

- `POST /orgs/:orgId/members/:memberId/assign-trainer` creates a TrainerAssignment row and returns `{ ok: true }`
- `DELETE` sets `active: false` on the matching row
- Both require `TRAINERS_MANAGE` permission; return 403 otherwise
- POST validates `trainerUserId` is a trainer in the org; returns 400 if not
- `GET /orgs/:orgId/trainers/:trainerUserId/profile` returns `{ profile: TrainerProfile | null }`
- GET returns 403 if caller lacks `PLANS_CREATE` or `TRAINERS_MANAGE`
- Audit logs written for assign and unassign
- Mobile trainer clients screen shows assigned member after assignment is created

### Testing

```bash
# Assign trainer
curl -X POST http://localhost:3000/api/orgs/<orgId>/members/<memberId>/assign-trainer \
  -H "Cookie: zook_session=<token>" -H "x-zook-intent: assign" \
  -d '{"trainerUserId":"<trainerId>"}'

# Verify trainer client list includes the member
curl http://localhost:3000/api/orgs/<orgId>/trainers/<trainerId>/clients \
  -H "Cookie: zook_session=<token>"

# Open mobile trainer profile screen — verify no crash
```

---

## Task 2 — Class Attendance Endpoint + Web Edit/Cancel UI

**Effort**: M | **Priority**: P0 | **Layer**: cross-cutting

Trainers can mark attendance for class sessions from mobile, and owners/trainers can edit or cancel scheduled classes from the web dashboard.

### Context

The mobile `useMarkClassAttendance` hook calls `POST /orgs/:orgId/classes/:classId/roster/:memberId/attendance` but this endpoint does not exist. Every attendance tap silently fails with a 404. `ClassEnrollment` has no `attendanceStatus` field.

The web dashboard `ClassScheduleCard` renders only a "View roster" toggle despite `PATCH` and `POST /cancel` being fully implemented server-side.

### Files to Change

- `packages/db/prisma/schema.prisma`
- `apps/web/src/server/api-router/classes.ts`
- `apps/web/src/components/dashboard/classes/classes-dashboard-route.tsx`

### Approach

#### Schema migration

```prisma
model ClassEnrollment {
  // ... existing fields
  attendanceStatus String? // PENDING | ATTENDED | NO_SHOW
}
```

Run `npx prisma migrate dev --name add-class-attendance-status`.

#### Backend endpoint (in `classes.ts`)

```ts
if (
  request.method === "POST" &&
  pathMatches(path, ["orgs", /.+/, "classes", /.+/, "roster", /.+/, "attendance"])
) {
  const orgId = path[1]!;
  const classId = path[3]!;
  const memberId = path[5]!;
  const ctx = await getRequestContext(request, { orgId });
  requireOrgPermission(ctx, orgId, "ATTENDANCE_APPROVE");

  const { status } = z.object({
    status: z.enum(["PENDING", "ATTENDED", "NO_SHOW"]),
  }).parse(await readJson(request));

  const gymClass = await prisma.gymClass.findFirst({ where: { id: classId, orgId } });
  if (!gymClass) throw notFoundError("Class not found.");
  if (gymClass.status === "CANCELLED") throw validationError("Cannot mark attendance for a cancelled class.");

  const enrollment = await prisma.classEnrollment.findFirst({
    where: { classId, userId: memberId, orgId },
  });
  if (!enrollment) throw notFoundError("Member is not enrolled in this class.");

  const updated = await prisma.classEnrollment.update({
    where: { id: enrollment.id },
    data: { attendanceStatus: status },
  });
  await writeAuditLog({
    request, orgId, actorUserId: ctx.userId,
    action: "class.attendance_marked",
    entityType: "class_enrollment",
    entityId: enrollment.id,
    metadata: { memberId, classId, status },
  });
  return ok({ ok: true, memberId, attendanceStatus: status });
}
```

#### Web UI (in `classes-dashboard-route.tsx`)

On each `ClassScheduleCard` that is not CANCELLED, add:

```tsx
// Edit button → opens Dialog pre-filled with class fields
<Button size="sm" variant="outline" onClick={() => setEditingClass(cls)}>Edit</Button>

// Cancel button → confirmation Dialog
<Button size="sm" variant="outline" className="text-destructive"
  onClick={() => setConfirmCancelId(cls.id)}>Cancel class</Button>
```

On confirm cancel, call `POST /orgs/:orgId/classes/:classId/cancel`. Gate both buttons on `TRAINERS_MANAGE` permission. Cancelled classes show a `Cancelled` status pill with no action buttons.

### Acceptance Criteria

- `POST` endpoint accepts `{ status: 'PENDING'|'ATTENDED'|'NO_SHOW' }` and returns `{ ok: true }`
- Returns 400 if class is cancelled or member not on roster
- Returns 403 if caller lacks `ATTENDANCE_APPROVE`
- Writes audit log `class.attendance_marked`
- Mobile trainer class roster: attendance tap persists and reflects the new value on reload
- Web dashboard Edit/Cancel buttons are present on non-cancelled classes
- Cancelled classes show `Cancelled` pill and hide Edit/Cancel buttons

### Testing

1. Mobile TRAINER role → class roster → mark a member ATTENDED → reload → verify status persisted
2. Web dashboard → create test class → click Edit → change name → save → verify update
3. Click Cancel → confirm → verify card shows Cancelled

---

## Task 3 — Background Job Crons: Scheduled Notifications & Subscription Expiry

**Effort**: M | **Priority**: P0 | **Layer**: backend

Scheduled push notifications composed by owners are actually delivered, and expired subscriptions transition so dashboards reflect accurate active membership counts.

### Context

`Notification` rows with `status=SCHEDULED` accumulate silently — no cron handler delivers them. `MemberSubscription` rows only expire when a member checks in and scan detects the lapse. Dashboard active counts and segment audiences are permanently inflated for gyms with lapsed members who haven't checked in.

### Files to Change

- `apps/web/src/server/api-router/cron.ts`
- `apps/web/src/server/api-router/organization-notifications.ts`
- `vercel.json`

### Approach

#### In `cron.ts`, add two new cron handlers

```ts
// POST /cron/send-scheduled-notifications
if (
  request.method === "POST" &&
  pathMatches(path, ["cron", "send-scheduled-notifications"])
) {
  requireCronSecret(request);
  const due = await prisma.notification.findMany({
    where: { status: "SCHEDULED", scheduledAt: { lte: new Date() } },
    take: 50,
    include: { recipients: true },
  });

  let processed = 0;
  for (const notification of due) {
    await deliverNotificationToRecipients(notification); // extract from organization-notifications.ts
    await prisma.notification.update({
      where: { id: notification.id },
      data: { status: "SENT" },
    });
    processed++;
  }
  return ok({ ok: true, processed });
}

// POST /cron/subscription-expiry
if (
  request.method === "POST" &&
  pathMatches(path, ["cron", "subscription-expiry"])
) {
  requireCronSecret(request);
  const result = await prisma.memberSubscription.updateMany({
    where: { status: "ACTIVE", endsAt: { lt: new Date() } },
    data: { status: "EXPIRED" },
  });
  // Optionally queue transactional notifications for each expired member
  return ok({ ok: true, expired: result.count });
}
```

#### In `vercel.json`, add the new cron entries

```json
{
  "crons": [
    { "path": "/api/cron/send-scheduled-notifications", "schedule": "*/5 * * * *" },
    { "path": "/api/cron/subscription-expiry", "schedule": "0 * * * *" }
  ]
}
```

### Acceptance Criteria

- `POST /cron/send-scheduled-notifications` processes up to 50 SCHEDULED notifications per run
- `POST /cron/subscription-expiry` sets all ACTIVE subscriptions with `endsAt < now` to EXPIRED
- Both endpoints return 401 without the cron secret header
- Both registered in `vercel.json` at the correct intervals
- Dashboard active member count reflects only genuinely active subscriptions

### Testing

```bash
# Create a subscription with endsAt in the past
# Manually POST /cron/subscription-expiry with the cron secret
curl -X POST http://localhost:3000/api/cron/subscription-expiry \
  -H "Authorization: Bearer $CRON_SECRET"
# Verify the subscription status changed to EXPIRED
```

---

## Task 4 — Website Mobile Navigation & Header Layout

**Effort**: S | **Priority**: P0 | **Layer**: website

Indian mobile users can navigate to Pricing, FAQ, and Login instead of seeing a header with only the CTA button and no orientation.

### Context

At `<=980px`, `site-nav` is set to `display:none` with **no hamburger, drawer, or alternative navigation of any kind**. Login is additionally hidden below `640px`. The header has `align-items:flex-start` below `640px`, misaligning the logo and CTA.

### Files to Change

- `apps/website/src/style.css`
- `apps/website/src/main.ts`
- `apps/website/index.html`

### Approach

#### In `index.html`, add a hamburger button inside the `<header>`:

```html
<button id="nav-toggle" class="nav-toggle" aria-label="Open navigation" aria-expanded="false">
  <span></span><span></span><span></span>
</button>
```

#### In `style.css`:

```css
/* Hamburger button */
.nav-toggle {
  display: none;
  flex-direction: column;
  gap: 5px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
}
.nav-toggle span {
  display: block;
  width: 22px;
  height: 2px;
  background: var(--text);
  border-radius: 2px;
}
@media (max-width: 980px) {
  .nav-toggle { display: flex; }
  .site-nav { display: none; } /* existing hidden rule, now expected */
  .site-nav.nav-open {
    display: flex;
    flex-direction: column;
    position: fixed;
    inset: 0;
    z-index: 1000;
    background: var(--surface);
    padding: 80px 32px 40px;
    gap: 24px;
    font-size: 1.25rem;
  }
  .nav-backdrop {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.5);
    z-index: 999;
  }
  .nav-backdrop.nav-open { display: block; }
}
/* Fix header alignment */
@media (max-width: 640px) {
  header { align-items: center; } /* override the flex-start */
  .header-actions .button-ghost { display: inline-flex; } /* restore Login */
}
```

#### In `main.ts`:

```ts
const navToggle = document.getElementById('nav-toggle');
const siteNav = document.querySelector('.site-nav');
const backdrop = document.getElementById('nav-backdrop');

function openNav() {
  siteNav?.classList.add('nav-open');
  backdrop?.classList.add('nav-open');
  navToggle?.setAttribute('aria-expanded', 'true');
  (siteNav?.querySelector('a') as HTMLElement | null)?.focus();
}
function closeNav() {
  siteNav?.classList.remove('nav-open');
  backdrop?.classList.remove('nav-open');
  navToggle?.setAttribute('aria-expanded', 'false');
  navToggle?.focus();
}
navToggle?.addEventListener('click', openNav);
backdrop?.addEventListener('click', closeNav);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeNav(); });
```

Add `<div id="nav-backdrop" class="nav-backdrop"></div>` to `index.html` (inside body, before the header).

### Acceptance Criteria

- Hamburger icon is visible in the header at `<=980px` and hidden at `>980px`
- Tapping hamburger opens a full-screen overlay containing all nav links and Login
- Escape, backdrop click, and X button close the drawer
- Focus moves to the first nav link on open; returns to hamburger on close
- Header logo and buttons are vertically centered at 375px viewport
- Login is accessible on mobile via the drawer

### Testing

1. Open at 375px viewport — verify only logo, hamburger, and CTA visible
2. Tap hamburger — verify drawer opens with all links
3. Press Escape — verify drawer closes and focus returns to hamburger
4. At 375px, inspect header — verify `align-items: center` is applied

---

## Task 5 — Website Conversion: Prices, Font, Social Proof, App Store Links

**Effort**: M | **Priority**: P1 | **Layer**: website

Gym owners can see what Zook costs, see that real gyms use it, and download the app — removing the three largest conversion objections.

### Context

The pricing section shows tier names and feature lists but **no rupee amounts**. The subtitle reads *"Final pricing can be configured before launch"* — visible evidence the product is unfinished. Satoshi font is declared in CSS but never loaded (no `@font-face` or CDN link exists). Zero social proof on the site. No App Store or Play Store links.

### Files to Change

- `apps/website/index.html`
- `apps/website/src/style.css`
- `apps/website/src/main.ts`

### Approach

#### Font — standardize on Sora (matches mobile app)

In `index.html` `<head>`:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&display=swap" rel="stylesheet">
```

In `style.css`, replace Satoshi references with `'Sora', system-ui, sans-serif`.

#### Pricing amounts (in `main.ts`)

In the pricing card rendering logic, add monthly amounts:
- Starter: `₹1,499/mo`
- Growth: `₹3,999/mo` (mark as "Most popular")
- Pro: `₹7,999/mo`

Add a monthly/annual toggle button that applies a 15% discount on annual. Change Starter/Growth CTAs to `"Start free trial"` → `/start-gym`. Change Pro CTA to `"Contact sales"` → `wa.me/91XXXXXXXXXX`.

#### Social proof section (in `main.ts`)

Insert between the pain-cards and features sections:
```html
<section class="proof-section">
  <div class="proof-stats">
    <div class="stat"><span class="stat-num">500+</span><span class="stat-label">Daily check-ins</span></div>
    <div class="stat"><span class="stat-num">50+</span><span class="stat-label">Gyms onboarded</span></div>
    <div class="stat"><span class="stat-num">4.8★</span><span class="stat-label">App store rating</span></div>
  </div>
  <div class="testimonials">
    <!-- 2-3 testimonial cards: gym name, owner name, city, quote -->
  </div>
</section>
```

#### App Store links

In the mobile proof article section, add:
```html
<div class="app-badges">
  <a href="https://apps.apple.com/in/app/zook/..." target="_blank">
    <img src="/assets/app-store-badge.svg" alt="Download on App Store" height="44">
  </a>
  <a href="https://play.google.com/store/apps/details?id=com.zook.app" target="_blank">
    <img src="/assets/play-store-badge.svg" alt="Get it on Google Play" height="44">
  </a>
</div>
```

### Acceptance Criteria

- Each pricing tier shows a monthly rupee price (`₹1,499 / ₹3,999 / ₹7,999`) prominently
- Monthly/annual toggle applies 15% discount and updates displayed prices
- Growth tier is visually marked "Most popular"
- Starter and Growth CTAs say "Start free trial"; Pro says "Contact sales"
- At least one social proof section with a stat row is present
- App Store and Play Store badge links exist in the mobile proof section
- Sora loads from Google Fonts CDN and renders in the hero headline

### Testing

1. Load pricing section — verify rupee amounts visible
2. Toggle annual — verify prices update (15% off)
3. DevTools Network → verify Google Fonts CDN request for Sora succeeds
4. Open at 390px — verify hero headline renders in Sora, not system sans-serif

---

## Task 6 — Website Technical SEO: Static HTML, Preloads, OG Image, JSON-LD

**Effort**: M | **Priority**: P1 | **Layer**: website

The hero section renders in under 2.5s on 4G; WhatsApp and social shares show a correctly cropped branded card; Google can index page content without executing JavaScript.

### Context

The entire marketing site is injected via a single `innerHTML` call in `main.ts` — Googlebot must execute JS before indexing. The OG image is a 1.47MB PNG at the wrong aspect ratio. `manifest.webmanifest` is linked but does not exist (404 on every page load). JSON-LD `SoftwareApplication` offers block has no price property.

### Files to Change

- `apps/website/index.html`
- `apps/website/src/main.ts`
- `apps/website/public/sitemap.xml`

### Approach

**Static HTML:** Move the hero heading, subheading, and primary CTA into `index.html` as static markup inside `<main id="main">`. The JS in `main.ts` injects the rest of the page sections. This makes hero text present in the HTML response before JS executes.

**Hero preload:** In `<head>`:
```html
<link rel="preload" as="image" href="/assets/zook-redesign/hero-control-room-mobile-composite.avif" fetchpriority="high">
```
The rendered `<img>` element should have `fetchpriority="high" loading="eager"`.

**OG image:** Create a dedicated `1200x630` branded image (Zook logo + tagline on dark background), save as `public/og-image.jpg` under 200KB. Update `index.html`:
```html
<meta property="og:image" content="https://zookfit.in/og-image.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
```

**Manifest:** Either create `public/manifest.webmanifest` with valid minimal JSON:
```json
{ "name": "Zook", "short_name": "Zook", "theme_color": "#0e0e0e", "display": "standalone", "icons": [] }
```
Or remove the `<link rel="manifest">` from `index.html`.

**JSON-LD:** Update the `SoftwareApplication` offers block to three `Offer` objects with `price`, `priceCurrency: "INR"`, and billing duration. Add `FAQPage` schema block.

**Sitemap:** Remove `/support` (returns 404). Add to `sitemap.xml` only URLs that return 200.

### Acceptance Criteria

- Hero headline text is present in HTML source before JavaScript executes
- Hero AVIF image has `<link rel="preload">` in `<head>`
- Lighthouse LCP on throttled 4G is under 2.5s
- `og:image` is `1200x630`, under 200KB
- `manifest.webmanifest` exists as valid JSON or `<link rel="manifest">` is removed
- JSON-LD passes Google Rich Results Test with no errors
- `sitemap.xml` contains no URLs returning 404

---

## Task 7 — PT Subscription: Cancel, PATCH, Audit Logs

**Effort**: S | **Priority**: P1 | **Layer**: backend

Admins can void incorrectly-entered PT subscriptions without financial clawback, and the full PT financial audit trail is visible.

### Context

`personal-training.ts` has approve and refund endpoints but no cancel. The `SubscriptionStatus` enum has `CANCELLED` but it is unreachable. No PT financial operation writes to the audit log despite these being the highest-value financial actions.

### Files to Change

- `apps/web/src/server/api-router/personal-training.ts`

### Approach

#### Cancel endpoint

```ts
if (
  request.method === "POST" &&
  pathMatches(path, ["orgs", /.+/, "pt-subscriptions", /.+/, "cancel"])
) {
  const orgId = path[1]!;
  const subscriptionId = path[3]!;
  const ctx = await getRequestContext(request, { orgId });
  requireOrgPermission(ctx, orgId, "PT_RECORD");

  const sub = await prisma.personalTrainingSubscription.findFirst({
    where: { id: subscriptionId, orgId },
  });
  if (!sub) throw notFoundError("PT subscription not found.");
  if (["CANCELLED", "REFUNDED"].includes(sub.status)) {
    throw validationError("Subscription is already cancelled or refunded.", 409);
  }
  // Trainers may only cancel their own
  if (ctx.roles.includes("TRAINER") && sub.trainerUserId !== ctx.userId) {
    throw forbiddenError("You can only cancel your own PT subscriptions.");
  }
  const updated = await prisma.personalTrainingSubscription.update({
    where: { id: sub.id },
    data: { status: "CANCELLED" },
  });
  await writeAuditLog({
    request, orgId, actorUserId: ctx.userId,
    action: "pt_subscription.cancelled",
    riskLevel: "MEDIUM",
    entityType: "pt_subscription",
    entityId: sub.id,
  });
  return ok({ subscription: updated });
}
```

#### PATCH endpoint

```ts
if (
  request.method === "PATCH" &&
  pathMatches(path, ["orgs", /.+/, "pt-subscriptions", /.+/])
) {
  const orgId = path[1]!;
  const subscriptionId = path[3]!;
  const ctx = await getRequestContext(request, { orgId });
  requireOrgPermission(ctx, orgId, "PT_RECORD");

  const body = z.object({
    totalSessions: z.number().int().positive().optional(),
    remainingSessions: z.number().int().min(0).optional(),
    endsAt: z.string().datetime().optional(),
    notes: z.string().optional(),
    amountPaise: z.number().int().positive().optional(),
  }).parse(await readJson(request));

  const sub = await prisma.personalTrainingSubscription.findFirst({ where: { id: subscriptionId, orgId } });
  if (!sub) throw notFoundError("PT subscription not found.");
  if (ctx.roles.includes("TRAINER") && sub.trainerUserId !== ctx.userId) {
    throw forbiddenError("You can only edit your own PT subscriptions.");
  }
  const updated = await prisma.personalTrainingSubscription.update({
    where: { id: sub.id },
    data: clean(body),
  });
  await writeAuditLog({
    request, orgId, actorUserId: ctx.userId,
    action: "pt_subscription.updated",
    entityType: "pt_subscription",
    entityId: sub.id,
    metadata: { before: sub, after: updated },
  });
  return ok({ subscription: updated });
}
```

Also add `writeAuditLog` calls to the existing **create**, **approve**, and **refund** handlers with actions `pt_subscription.created`, `pt_subscription.approved`, and `pt_subscription.refunded` (refund gets `riskLevel: "HIGH"`).

### Acceptance Criteria

- Cancel sets `status=CANCELLED` without triggering payout clawback
- Returns 409 if already CANCELLED or REFUNDED
- Trainers can only cancel/patch their own subscriptions; TRAINERS_MANAGE can affect any
- PATCH updates any provided field and writes a before/after audit log
- Create, approve, and refund all write audit log entries

---

## Task 8 — Demo Notification Preferences Persistence & Detail Screen

**Effort**: S | **Priority**: P1 | **Layer**: mobile

Demo sessions show coherent notification preferences (toggles persist) and push notification taps land on a contextual detail screen instead of redirecting to the inbox.

### Context

The demo handler for `/me/notification-preferences` returns the same static empty array for both GET and PATCH — every toggle snap-reverts after a success toast. `app/notifications/[id].tsx` contains only `<Redirect href='/notifications' />`, bouncing all notification taps back to the inbox.

### Files to Change

- `apps/mobile/src/lib/demo-api.ts`
- `apps/mobile/app/notifications/[id].tsx`
- `apps/web/src/server/api-router/notifications-inbox.ts`

### Approach

#### Demo preferences fix (`demo-api.ts`)

```ts
// Module-level mutable state
let demoNotificationPreferences = {
  transactional: true, operational: true, engagement: true, promotional: true, pushEnabled: false,
};

// In the demo-api if-chain:
if (path.join('/') === 'me/notification-preferences') {
  if (request.method === 'GET') {
    return ok({ preferences: [demoNotificationPreferences] });
  }
  if (request.method === 'PATCH') {
    const body = await readJson(request);
    demoNotificationPreferences = { ...demoNotificationPreferences, ...(body.preferences?.[0] ?? {}) };
    return ok({ preferences: [demoNotificationPreferences] });
  }
}
```

#### Notification detail screen (`notifications/[id].tsx`)

Replace the `<Redirect>` with a real screen:

```tsx
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";

export default function NotificationDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const notifQuery = useQuery({
    queryKey: ["notification", id],
    queryFn: () => mobileApiFetch<{ notification: NotificationRecord }>(`/me/notifications/${id}`, { token }),
    enabled: Boolean(id),
  });
  const notif = notifQuery.data?.notification;

  if (notifQuery.isLoading) return <LoadingSpinner />;
  if (notifQuery.isError || !notif) return (
    <QueryErrorState error={notifQuery.error} onRetry={() => void notifQuery.refetch()} />
  );

  return (
    <ZookScreen>
      <AppHeader title={notif.title} showBack />
      <Text style={styles.body}>{notif.body}</Text>
      {notif.actionUrl ? (
        <ZookButton onPress={() => router.push(notif.actionUrl as never)}>View details</ZookButton>
      ) : (
        <ZookButton variant="secondary" onPress={() => router.back()}>Back to inbox</ZookButton>
      )}
    </ZookScreen>
  );
}
```

Add `GET /me/notifications/:id` to `notifications-inbox.ts` (register before the `/me/notifications` list handler):

```ts
if (request.method === "GET" && pathMatches(path, ["me", "notifications", /.+/])) {
  const notificationId = path[2]!;
  const ctx = await getRequestContext(request);
  const userId = requireAuth(ctx);
  const record = await prisma.notificationRecipient.findFirst({
    where: { userId, notification: { id: notificationId } },
    include: { notification: true },
  });
  if (!record) throw notFoundError("Notification not found.");
  return ok({ notification: { ...record.notification, readAt: record.readAt } });
}
```

### Acceptance Criteria

- Toggling a notification preference switch in demo mode persists for the session
- Toggling back and forth reflects the correct state without reverting
- Tapping a notification from the inbox navigates to `/notifications/[id]` showing title and body
- Notifications with `actionUrl` show a CTA button
- Notifications without `actionUrl` show "Back to inbox"

---

## Task 9 — Tracking & Diet: Multi-Exercise Form, Diet History Screen, Loading State

**Effort**: M | **Priority**: P2 | **Layer**: mobile

Members can log multi-exercise workouts accurately, review past diet adherence over time, and see a skeleton instead of blank on slow connections.

### Context

The workout tracking entry form supports only a single exercise while history shows multi-exercise sessions from fixtures. The diet panel has no path to prior days (write-only from the member's perspective). `DietPanel` renders blank during loading because it checks `isError` but not `isLoading`.

### Files to Change

- `apps/mobile/app/tracking-entry.tsx`
- `apps/mobile/app/diet-history.tsx` (new file)
- `apps/mobile/src/features/member/plan/diet-panel.tsx`
- `apps/mobile/src/lib/demo-api.ts`

### Approach

#### Multi-exercise form (`tracking-entry.tsx`)

Replace the single exercise input group with a dynamically managed array:

```tsx
const [exercises, setExercises] = useState([{ name: '', sets: '', reps: '' }]);

function addExercise() { setExercises(prev => [...prev, { name: '', sets: '', reps: '' }]); }
function removeExercise(i: number) { setExercises(prev => prev.filter((_, idx) => idx !== i)); }

{exercises.map((ex, i) => (
  <View key={i} style={styles.exerciseRow}>
    <TextInput value={ex.name} onChangeText={val => updateExercise(i, 'name', val)} placeholder="Exercise name" />
    <TextInput value={ex.sets} onChangeText={val => updateExercise(i, 'sets', val)} placeholder="Sets" keyboardType="numeric" />
    <TextInput value={ex.reps} onChangeText={val => updateExercise(i, 'reps', val)} placeholder="Reps" keyboardType="numeric" />
    {exercises.length > 1 && (
      <TouchableOpacity onPress={() => removeExercise(i)}><Ionicons name="trash-outline" /></TouchableOpacity>
    )}
  </View>
))}
<TouchableOpacity onPress={addExercise}><Text>+ Add exercise</Text></TouchableOpacity>
```

#### DietPanel loading state (`diet-panel.tsx`)

```tsx
const { isLoading, isError, data } = dietQuery;

if (isLoading) return (
  <Card variant="compact" contentStyle={{ gap: spacing.sm }}>
    <Skeleton width="60%" height={16} borderRadius={8} />
    <Skeleton width="100%" height={8} borderRadius={4} />
    <Skeleton width="80%" height={14} borderRadius={7} />
  </Card>
);
```

#### Diet history screen (`diet-history.tsx`)

New screen with prev/next day navigation arrows. Fetch `GET /me/diet?date=YYYY-MM-DD` for the selected date. Display calorie total and macro breakdown per day. Add a "View diet history" link at the bottom of DietPanel.

### Acceptance Criteria

- Workout form starts with one exercise row; "Add exercise" appends new rows; delete button hidden when only one row
- Submitting sends the full `exercises[]` array
- DietPanel shows skeleton during `isLoading`, not blank
- "View diet history" link navigates to the new history screen
- History screen shows prev/next navigation with daily macro totals

---

## Task 10 — Loading Skeletons: Trainer Sessions, Exercise Library, Trainer Classes

**Effort**: S | **Priority**: P2 | **Layer**: mobile

Trainers and owners see skeletons instead of blank areas or false empty states during slow loads.

### Context

Three screens added after the main skeleton pass missed the pattern: `trainer/clients/[id]/sessions.tsx` shows zero-data defaults (0% adherence, "No Plans") during load. `owner/exercise-library.tsx` leaves the content area blank. `trainer/classes.tsx` uses an `EmptyState` hourglass widget as the loading indicator — visually identical to the "no classes" state.

### Files to Change

- `apps/mobile/app/trainer/clients/[id]/sessions.tsx`
- `apps/mobile/app/owner/exercise-library.tsx`
- `apps/mobile/app/trainer/classes.tsx`

### Approach

Standard pattern in each file:

```tsx
import { Skeleton } from "@/components/primitives";

// Add BEFORE the empty/data rendering:
if (query.isLoading) return (
  <Card variant="compact" contentStyle={{ gap: spacing.sm }}>
    {[0, 1, 2].map(i => <Skeleton key={i} width="90%" height={44} borderRadius={8} />)}
  </Card>
);
```

In `trainer/classes.tsx`, replace the `isLoading ? <EmptyState ...>` branch with the skeleton. The `EmptyState` should only render when `!isLoading && classes.length === 0`.

### Acceptance Criteria

- Trainer client sessions tab shows 3 skeleton rows during fetch, not zero-data defaults
- Owner exercise library shows 4-5 skeleton rows, not blank content
- Trainer classes tab shows 3 skeleton rows, not the hourglass EmptyState
- All three show correct empty state only after loading completes with zero results

---

## Task 11 — Tracking API: Body Progress & Habit Edit/Delete

**Effort**: XS | **Priority**: P2 | **Layer**: backend

Members can correct measurement typos and remove habits they no longer want to track.

### Context

`tracking.ts` implements POST and GET but no PATCH or DELETE. Members who enter incorrect measurements have no recourse. `MemberHabit` has an `active` boolean field for soft delete that is never set to `false`.

### Files to Change

- `apps/web/src/server/api-router/tracking.ts`

### Approach

```ts
// PATCH /me/tracking/body-progress/:id
// DELETE /me/tracking/body-progress/:id (hard delete)
// PATCH /me/tracking/habits/:id
// DELETE /me/tracking/habits/:id — sets active=false (preserves log history)
```

All endpoints: find the record where `id = param AND userId = req.userId`. Return 404 if not found (different user looks identical to not-found for security). PATCH updates only provided fields via `clean()`. Body-progress DELETE is hard delete. Habit DELETE sets `active: false`.

### Acceptance Criteria

- `PATCH /me/tracking/body-progress/:id` updates specified measurement fields
- `DELETE /me/tracking/body-progress/:id` permanently removes the entry
- Both body progress endpoints return 404 if the entry belongs to a different user
- `DELETE /me/tracking/habits/:id` sets `active=false`; habit disappears from list but logs are preserved

---

## Task 12 — Notification Inbox Pagination & Unread Count Endpoint

**Effort**: S | **Priority**: P2 | **Layer**: cross-cutting

Active members can scroll full notification history; the mobile badge polls with a single integer fetch instead of 50 full records.

### Context

`GET /me/notifications` is hard-capped at `take: 50` with no cursor. The web dashboard badge counts all FAILED/SCHEDULED notifications from all time, creating permanent alert fatigue.

### Files to Change

- `apps/web/src/server/api-router/notifications-inbox.ts`
- `apps/web/src/server/domains/overview/read-models.ts`

### Approach

**Pagination:** Add `cursor` and `limit` params. Use Prisma cursor-based pagination. Return `{ notifications: [...], nextCursor: string | null }`.

**Unread count endpoint:** `GET /me/notifications/unread-count` — register before the `/:id` route. Single `COUNT` query on `NotificationRecipient` where `userId = req.userId AND readAt IS NULL`. Return `{ unreadCount: number }`.

**Badge staleness fix in `read-models.ts`:** Filter `notificationQueueCount` to `createdAt >= (now - 7 days) AND status = 'FAILED'`. Exclude future-scheduled notifications from the count.

### Acceptance Criteria

- `GET /me/notifications` accepts `cursor` and `limit` params; returns `nextCursor` when more items exist
- `GET /me/notifications/unread-count` returns `{ unreadCount: number }` via a single COUNT query
- Dashboard notification badge only counts FAILED notifications from the last 7 days
- Future-scheduled notifications do not contribute to the badge count

---

## Task 13 — Rate Limiting on High-Value Mutations

**Effort**: S | **Priority**: P2 | **Layer**: backend

Prevents compromised or scripted accounts from generating fraudulent PT payout lines, depleting shop inventory, or filling class rosters.

### Context

`assertRateLimit` is called on auth flows, AI, QR scans, referrals — but not on PT session logs, PT subscriptions, class enrollment, or shop orders.

### Files to Change

- `apps/web/src/server/api-router/personal-training.ts`
- `apps/web/src/server/api-router/classes.ts`
- `apps/web/src/server/api-router/shop-orders.ts`

### Approach

Add at the start of each mutation handler before business logic:

```ts
// PT sessions: 100/hr per org
await assertRateLimit("pt-session", `${orgId}`, 100, 3600, "Too many PT session logs.");

// PT subscriptions: 20/hr per org
await assertRateLimit("pt-subscription", `${orgId}`, 20, 3600, "Too many PT subscription requests.");

// Class enrollment: 10/min per user
await assertRateLimit("class-enrollment", `${userId}`, 10, 60, "Too many enrollment requests.");

// Shop orders: 20/hr per user
await assertRateLimit("shop-order", `${userId}`, 20, 3600, "Too many order requests.");
```

### Acceptance Criteria

- Each endpoint returns 429 after reaching its limit
- Legitimate usage within limits is unaffected

---

## Task 14 — Challenge System: Full CRUD, Opt-In, Leaderboard

**Effort**: M | **Priority**: P2 | **Layer**: backend

Gym owners can create fitness challenges with leaderboards through the product; members can opt in and see ranked progress.

### Context

`plans-challenges.ts` only has `GET /orgs/:id/challenges`. The `Challenge` model has full CRUD fields and `ChallengeParticipant`/`ChallengeProgress` sub-models. All management endpoints are missing. The leaderboard feature is completely dead despite the schema being designed for it.

### Files to Change

- `apps/web/src/server/api-router/plans-challenges.ts`

### Approach

```
POST /orgs/:orgId/challenges                         — require PLANS_CREATE
PATCH /orgs/:orgId/challenges/:id                   — require PLANS_CREATE
DELETE /orgs/:orgId/challenges/:id                  — soft delete (active=false)
POST /orgs/:orgId/challenges/:id/opt-in             — authenticated org member
POST /orgs/:orgId/challenges/:id/progress           — authenticated org member
GET /orgs/:orgId/challenges/:id/leaderboard         — authenticated org member; rank by progressValue DESC
```

### Acceptance Criteria

- POST creates a challenge; PATCH updates fields; DELETE soft-deletes
- Members can opt in and post progress entries
- Leaderboard returns participants ranked by `progressValue` with display names
- Opt-in to ended/inactive challenge returns 400

---

## Task 15 — Web Trainer Performance Dashboard

**Effort**: L | **Priority**: P2 | **Layer**: web

Owners with multiple trainers can review per-trainer client counts, class schedules, and commissions from a consolidated view.

### Context

`/dashboard/trainers/page.tsx` only redirects to `/dashboard/staff`. The trainer-client detail directory (`/dashboard/trainers/[trainerId]/clients/[clientId]/`) has only README.md files — every deep link to a client from a notification is a dead end.

### Files to Change

- `apps/web/app/dashboard/trainers/page.tsx`
- `apps/web/app/dashboard/trainers/[trainerId]/page.tsx`
- `apps/web/app/dashboard/trainers/[trainerId]/clients/[clientId]/page.tsx`

### Approach

**`/dashboard/trainers`:** Server component. Fetch org trainers with `TRAINER` role. For each, aggregate active `TrainerAssignment` count, upcoming class count, this-month payout total. Render as a data table with links to each trainer's detail page.

**`/dashboard/trainers/[trainerId]`:** Full trainer profile: bio/specializations from `TrainerProfile`, assigned client list with last-session date, upcoming classes, PT session count, commission breakdown.

**`/dashboard/trainers/[trainerId]/clients/[clientId]`:** Adapt `coach-client-workspace.tsx`. Show member identity, active plan, last 5 body progress entries, recent workout sessions. Include breadcrumb.

### Acceptance Criteria

- `/dashboard/trainers` renders trainer list with client count, class count, payout this month
- `/dashboard/trainers/[trainerId]/clients/[clientId]` renders client identity, active plan, progress
- All pages return 403 without `TRAINERS_MANAGE` permission

---

## Task 16 — Web Reports: Shop CSV, Date-Range Charts, Trainer-Client Report

**Effort**: S | **Priority**: P2 | **Layer**: web

Owners can export shop order data and the date range picker updates charts (not just CSV download URLs).

### Context

`ReportsService.shopReport()` is fully implemented and registered in `reportRoutes` but `'shop'` is absent from the `exportReports` array in `reports-panel.tsx`. The trainer-client report exists in the service but is not in `reportRoutes`. Date range picker only updates CSV URLs — charts remain static.

### Files to Change

- `apps/web/src/components/dashboard/read-only/reports-panel.tsx`
- `apps/web/src/server/api-router/reports.ts`

### Approach

- Add `{ id: 'shop', label: 'Shop orders', icon: 'bag-outline' }` to `exportReports` array
- Add `'trainer-client'` to `reportRoutes` map pointing to the existing service method
- On date range change, fetch updated chart data from the overview API with `from`/`to` params and re-render charts with a loading spinner

### Acceptance Criteria

- "Shop orders" export button downloads a valid CSV
- "Trainer client" export button appears for users with `ORG_VIEW_REPORTS`
- Changing date range updates charts, not just CSV URLs

---

## Task 17 — Desk: Class Enrollment Tab

**Effort**: M | **Priority**: P2 | **Layer**: web

Receptionists can enroll walk-in members into classes from the desk without requiring the Zook mobile app.

### Context

The desk has four tabs but no class enrollment. The class enrollment API is fully implemented with membership gate checks, capacity validation, and waitlisting. Walk-in enrollment currently requires the member to self-serve on their phone.

### Files to Change

- `apps/web/src/components/desk/desk-workspace.tsx`
- `apps/web/src/components/desk/panel-config.tsx`
- `apps/web/src/components/desk/DeskClassesPanel.tsx` (new file)

### Approach

Create `DeskClassesPanel.tsx`: fetch today's upcoming classes. Display each as a card with class name, type badge, time, trainer, enrolled/capacity. Add "Enroll member" button that opens a member search modal (reuse `attendance-manual-checkin-form.tsx` search pattern). On member selection, call `POST /orgs/:orgId/classes/:classId/enroll`. Full class → "Add to waitlist" instead.

Add the `'classes'` tab to `desk-workspace.tsx` and `panel-config.tsx`.

### Acceptance Criteria

- Desk has a "Classes" tab showing today's upcoming classes with capacity counts
- Receptionist can search for a member and enroll them; enrolled count increments
- Full class shows "Add to waitlist" option
- Requires `ATTENDANCE_APPROVE` permission

---

## Task 18 — Member Portal: Class Schedule & Diet Plan Content

**Effort**: M | **Priority**: P2 | **Layer**: web

> **Depends on T1 (TrainerAssignment API) being deployed first.**

Members on desktop can view upcoming classes and their actual diet plan content instead of a generic app-install card.

### Context

`/m/diet` is a pure handoff card showing only "Download the app" — even though diet plan data is available. Members checking their plan at a work computer see no content. No class booking from the web member portal.

### Files to Change

- `apps/web/src/components/member-membership-surface.tsx`
- `apps/web/app/m/diet/page.tsx`

### Approach

**Classes section:** Fetch upcoming classes for next 7 days via `GET /orgs/:orgId/classes`. Display grouped by day. Book/cancel via the enrollment API.

**Diet content:** Fetch the member's active `TrainerAssignment` to determine their trainer. Fetch the trainer's assigned diet plan. Render: plan name, daily calorie target, macro targets, today's recommended meals. If no plan: "Your trainer has not assigned a diet plan yet." (not a generic app install card).

---

## Task 19 — Website FAQ Expansion, WhatsApp CTA, Sitemap Hygiene

**Effort**: S | **Priority**: P2 | **Layer**: website

Pre-sales objections from Indian gym owners are answered at the bottom of the funnel; WhatsApp enables the dominant Indian B2B sales channel.

### Context

4 FAQ items currently. Indian SaaS buyers need answers on: trial length, cancellation, data residency, UPI support, multi-branch, CSV migration, GST invoicing, support channels. `/support` in sitemap returns 404.

### Files to Change

- `apps/website/src/main.ts`
- `apps/website/src/style.css`
- `apps/website/public/sitemap.xml`
- `apps/website/index.html`

### Approach

**FAQ:** Add 8+ `<details>/<summary>` items covering: 14-day free trial, monthly cancellation, India data residency, UPI/Razorpay compatibility, multi-branch on Growth/Pro, CSV member import, GST-compliant invoices, WhatsApp support.

**WhatsApp CTA:** Add a fixed-position floating button (bottom-right, 56px circle, `#25D366`) linking to `wa.me/91XXXXXXXXXX?text=Hi, I want to know more about Zook`. Pro pricing CTA should say "Chat with us" linking to WhatsApp.

**FAQ JSON-LD:** Add `FAQPage` schema to `index.html`.

**Sitemap:** Remove `/support`. Update footer privacy/terms links to use `appHref('/privacy')` instead of hardcoded domain.

---

## Task 20 — Resource Library API

**Effort**: M | **Priority**: P2 | **Layer**: backend

Trainers can publish educational content to members through the product — a dead model with zero API coverage.

### Context

`ResourceLibraryItem` model (title, url, summary, content, approved, createdById) exists in the schema but has no API endpoints anywhere. The `approved` field suggests an admin-moderation workflow was designed. The feature is completely unreachable from any client.

### Files to Change

- `apps/web/src/server/api-router/resources.ts` (new file, register in API router)

### Approach

```
GET /orgs/:orgId/resources         — authenticated org member; approved=true only
GET /me/resources                  — from the user's active org
POST /orgs/:orgId/resources        — require PLANS_CREATE; creates with approved=false
PATCH /orgs/:orgId/resources/:id   — PLANS_CREATE (own) or ORG_ADMIN (any); admin can set approved=true
DELETE /orgs/:orgId/resources/:id  — PLANS_CREATE (own) or ORG_ADMIN (any)
```

---

## Task 21 — Website Accessibility & Brand Hygiene

**Effort**: S | **Priority**: P3 | **Layer**: website

WCAG Level A skip-link; CSS lime color aligned to mobile app canonical brand.

### Files to Change

- `apps/website/index.html`
- `apps/website/src/style.css`
- `apps/website/src/main.ts`

### Approach

**Skip-to-content:** First element in `<body>`:
```html
<a href="#main" class="skip-link">Skip to main content</a>
```
In CSS: `position: absolute; left: -9999px;` normally; `position: fixed; top: 0; left: 0;` on `:focus`.

**Brand color:** Update `--lime` from `#b9f455` to `#D2FB66` to match the mobile app canonical lime.

**Privacy/terms:** Replace hardcoded `https://zookfit.in/privacy` with `appHref('/privacy')`.

---

## Task 22 — Hindi i18n Completion for Trainer and Owner Screens

**Effort**: XL | **Priority**: P3 | **Layer**: mobile

Hindi-speaking gym owners and trainers in tier-2/3 Indian cities see the app in Hindi for all management tasks.

### Context

Hindi machinery is good and modern but coverage is ~40% — only member-facing screens. All trainer management keys, owner management keys, reception keys, and exercise/habit domain keys added in recent months are missing. The app falls back silently to English for the admin side.

### Files to Change

- `apps/mobile/src/lib/i18n.tsx`
- `scripts/audit-i18n.ts` (new)

### Approach

1. Write `scripts/audit-i18n.ts`: compute set difference (English keys minus Hindi keys) and output missing keys
2. Translate all missing keys: `trainer.*` (~200), `owner.*` (~300), `reception.*` (~50), `exerciseTemplates.*` (~30), `habits.*` (~40)
3. Add CI lint step: fail build if `hi` object is below 95% of English key coverage

### Priority order

`trainer.classes.*`, `trainer.pt.*`, `trainer.payout.*`, `owner.payouts.*`, `owner.revenue.*`, `owner.coupons.*`, `owner.referrals.*`, `reception.*`, `exerciseTemplates.*`, `habits.*`, then remainder.

---

## Task 23 — Push Device Settings on Web & Badge Staleness Fix

**Effort**: S | **Priority**: P3 | **Layer**: web

Owners can manage registered push devices and revoke stale tokens; the dashboard badge no longer stays permanently lit for old resolved issues.

### Context

Settings hub shows "Push alerts: Configured" with no interactive controls despite full push device management APIs existing. The badge counts all failed notifications from all time, creating permanent alarm fatigue.

### Files to Change

- `apps/web/src/server/domains/overview/read-models.ts`
- `apps/web/src/components/dashboard/sections/settings-section.tsx`
- `apps/web/app/dashboard/settings/push/page.tsx` (new)

### Approach

**Badge fix:** Filter `notificationQueueCount` to `createdAt >= (now - 7 days) AND status = 'FAILED'`.

**Push settings page:** Fetch `GET /me/push-devices`. Render list with platform (iOS/Android/Web), registration date. Add "Revoke" button per device (calls `DELETE /me/push-devices/:id`). Add "Register this browser" button (triggers `PushManager.subscribe` + `POST /push/register-device`).

---

## Task 24 — Members List Cursor Pagination

**Effort**: S | **Priority**: P3 | **Layer**: backend

Large gyms with 500+ members get fast, memory-efficient member list loads.

### Context

`GET /orgs/:id/members` lacks cursor pagination. For gyms with 500+ members, a full table scan is slow and memory-intensive. Mobile owner queries will timeout on large accounts.

### Files to Change

- `apps/web/src/server/api-router/organization-members.ts`

### Approach

Add `cursor` and `limit` params. Default `limit: 50`. If cursor provided, add `cursor: { id: cursor }, skip: 1` to the Prisma query. Return `{ members: [...], nextCursor: string | null }`. Response format must remain backward compatible (`members` array at top level).

---

## Task 25 — WhatsApp Device Management API

**Effort**: M | **Priority**: P3 | **Layer**: backend

WhatsApp becomes a configurable user-controlled notification channel with DPDPA-compliant opt-in/revoke.

### Context

The `WhatsAppDevice` model exists in the schema (opt-in/revoke timestamps for DPDPA compliance) but has zero API coverage. The opt-in flow is schema-ready but completely unreachable.

### Files to Change

- `apps/web/src/server/api-router/push-devices.ts` (or new `whatsapp-devices.ts`)

### Approach

```
POST /me/whatsapp-devices     — accept { phone }; upsert WhatsAppDevice with status=ACTIVE
DELETE /me/whatsapp-devices/:id — set status=REVOKED and revokedAt=now
GET /me/whatsapp-devices      — return all devices including revoked with their status
```

Validate Indian phone format (10-digit or `+91` prefix). First version skips OTP verification (add TODO comment for OTP hardening once WhatsApp Business API is onboarded). Same phone number upserts rather than creating duplicates.

---

## Task 26 — Gym Discovery: ItemList JSON-LD for /gyms

**Effort**: S | **Priority**: P3 | **Layer**: web

`/gyms` becomes eligible for Google ItemList rich results, improving organic click-through for members searching for gyms.

### Context

`/g/[username]` emits `LocalBusiness` JSON-LD. `/gyms` discovery emits nothing. Marketing website has no link to `/gyms`.

### Files to Change

- `apps/web/app/gyms/page.tsx`
- `apps/website/src/main.ts`

### Approach

Generate `ItemList` JSON-LD with a `ListItem` per gym (name, url, addressLocality). Add `BreadcrumbList` schema for city-scoped `/gyms?city=X` pages. Inject via `<script type="application/ld+json">`. Add "Find gyms near you" link in marketing website footer.

---

## Deployment Gaps

### Gap D1 — New Cron Endpoints Must Be Registered

T3 adds two cron endpoints. Register in `vercel.json` (or equivalent scheduler):

```json
{ "path": "/api/cron/send-scheduled-notifications", "schedule": "*/5 * * * *" },
{ "path": "/api/cron/subscription-expiry", "schedule": "0 * * * *" }
```

Verify: manually POST each with the `CRON_SECRET` header and confirm `{ processed: N }` / `{ expired: N }` response.

### Gap D2 — Database Migration Required

T2 adds `attendanceStatus` to `ClassEnrollment`. Run `npx prisma migrate deploy` **before** deploying the new attendance endpoint. Deploy-before-migrate causes a Prisma runtime crash on every attendance request.

Verify: `npx prisma migrate status` in production; confirm the migration is in the applied list.

### Gap D3 — `VITE_ZOOK_APP_URL` in Marketing Website Build Config

After T19 updates links to use `appHref()`, this env var must be set to the correct app domain in the website build environment. Absent value causes all CTAs and legal links to resolve to `undefined`.

Verify: in the build settings for the website deployment, confirm `VITE_ZOOK_APP_URL = https://zookfit.in` (or equivalent production domain).

### Gap D4 — Push Notification Credentials

The scheduled notification cron (T3) requires valid FCM service account and APNs p8 key. Without them, the cron runs without errors but silently delivers nothing.

Verify: confirm `FIREBASE_SERVICE_ACCOUNT_JSON` and APNs key env vars are set in production. Send a test push via `POST /orgs/:orgId/notifications` and verify the device receives it.

### Gap D5 — Razorpay Webhook Registration

Shop checkout, membership renewal, and PT subscription payments depend on Razorpay webhooks to update payment status. The webhook URL must be registered in the Razorpay **production** dashboard pointing to the production server.

Verify: in the Razorpay dashboard → Webhooks, confirm the production webhook URL is registered and the delivery secret matches the production env var. Trigger a test payment and verify the status updates in the database.

### Gap D6 — Marketing Website OG Image at Stable CDN Path

T6 creates `public/og-image.jpg`. The `og:image` meta tag must point to a stable non-hashed URL. Confirm Vite does not hash files in `public/`. The image must be served with appropriate `Cache-Control` headers.

Verify: `curl -I https://zookfit.in/og-image.jpg` — confirm 200 and `Content-Type: image/jpeg`. Paste the URL into Twitter Card Validator.

---

## Product Decisions Made

1. **TrainerAssignment endpoints go in `organization-members.ts`** — keeps all member-scoped mutations cohesive in one place.
2. **PT subscription cancel does NOT trigger `accruePtClawback`** — making it an administrative void (data entry error), not a financial reversal. Cancel ≠ Refund.
3. **Font standardized on Sora** (matches mobile app) rather than adding Satoshi as a second typeface. Same font across mobile and web creates coherent brand recognition.
4. **Diet history uses prev/next day arrows**, not a full calendar picker — minimizes complexity while satisfying the core use case.
5. **T18 (member portal diet) depends on T1 (TrainerAssignment)** — must be sequenced after T1 in the dev queue.
6. **Resource library uses admin-moderated approval** (`approved=false` by default) — gym owners have curatorial control over what members see.
7. **WhatsApp device management skips OTP in v1** — unblocks the feature without requiring WhatsApp Business API OTP integration immediately.
8. **Challenge system is backend-only in this pass** — mobile UI for opt-in and leaderboard is a natural follow-on after the backend endpoints are stable.
9. **Desk class enrollment links to payment tab for paid classes** — reuses existing desk infrastructure rather than adding a separate payment flow.
10. **New gym owner onboarding wizard is NOT in this handoff** but is a critical future P1 web task — guided setup for CSV member import, plan creation, and staff invite is the primary trial-to-paid activation gap.
11. **WhatsApp Business API delivery integration is NOT in this handoff** — T25 unblocks device opt-in consent management, but actual WhatsApp message delivery requires separate WA Business API onboarding.
