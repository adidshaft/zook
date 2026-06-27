# Zook Platform — Codex Handoff Document

> **Monorepo layout**: `apps/web` (Next.js 14 App Router, API routes at `apps/web/src/server/`) and `apps/mobile` (Expo SDK 52, Expo Router v3). Shared packages live in `packages/`. All server API routes are dispatched from `apps/web/src/app/api/[[...path]]/route.ts` through handler functions in `apps/web/src/server/api-router/`. Marketing website: `apps/website/` (Vite/React).

---

## Environment Quick Reference

| Concern | Detail |
|---|---|
| Test device (iOS) | iPhone 16 Pro sim `16E85351-C822-4E5D-8C0F-15A50B8BFA5C` |
| Role switching (demo) | `GET /__demo-role?role=OWNER\|TRAINER\|RECEPTIONIST\|MEMBER` |
| Demo API state | Module-level arrays in `apps/mobile/src/lib/demo-api.ts` reset on JS runtime restart only |
| Light-mode gradient rule | Never use `palette.text.*` or `palette.accent.base` as text on always-dark `LinearGradient` |
| Restore broken demo session | `xcrun simctl keychain booted reset` then relaunch |

---

## Global Gotchas

1. **Demo API statefulness.** Module-level arrays in `demo-api.ts` persist for the JS runtime lifetime.
2. **Light-mode gradient collapse.** Always pass `mode` to `classTypeGradient(type, mode)`.
3. **`pathMatches` order matters.** Shorter paths must be registered before longer overlapping prefixes.
4. **Prisma `clean()` helper.** Always wrap `data:` objects with `clean({...})` when any field is optional.
5. **Two pre-existing TypeScript errors** in `platform-operations-panel.tsx` and `trainer-diet-plans-panel.tsx` (DataTable `empty` prop) — unrelated to any task here.
6. **`accruePtSubscriptionCommission` is called at creation AND at approval** — these are mutually exclusive paths (direct creation → ACTIVE, member request → PENDING_APPROVAL → approved), so commission is not double-counted. Do not add a third call.

---

## Accounting Bugs (implement first — silent data corruption)

---

## Task 1 — Fix: Shop Product Stock Is Never Decremented

**Effort**: S | **Priority**: P0 | **Layer**: backend

Every shop order is placed and paid without ever reducing the product's stock count in the database, making inventory numbers meaningless and allowing oversells.

### Root Cause

`calculateShopOrder` in `packages/core/src/services/shop-service.ts` (line 18) computes and returns `stockDeltas: Array<{ productId, delta }>` where `delta` is negative (the quantity ordered). The caller in `apps/web/src/server/api-router/shop-orders.ts` (line ~65) discards this return value entirely — it calls `calculateShopOrder({ products, items })` but only reads `.totalPaise`. The `stockDeltas` are never applied to the `Product` table.

Result: `Product.stock` in the database never changes as orders are placed. Two users can simultaneously order the last item (both pass the `product.stock >= quantity` check before either order is committed). The owner's stock management screen always shows the original seeded quantities.

### Files to Change

- `apps/web/src/server/api-router/shop-orders.ts`

### Approach

After the `ShopOrder` and `ShopOrderItem` rows are created (currently around line 80), apply the stock deltas inside a Prisma transaction. The safest pattern uses `$transaction` with a re-validation inside the transaction to prevent the race condition:

```ts
// Replace the current non-transactional create block with:
const order = await prisma.$transaction(async (tx) => {
  // Re-fetch products inside the transaction for accurate stock
  const lockedProducts = await tx.product.findMany({
    where: { id: { in: body.items.map((item) => item.productId) }, orgId: body.orgId },
  });
  const lockedCalc = calculateShopOrder({
    products: lockedProducts.map((p) => ({
      id: p.id, stock: p.stock, pricePaise: p.pricePaise, active: p.active,
    })),
    items: body.items,
  });
  // Decrement stock atomically
  await Promise.all(
    lockedCalc.stockDeltas.map(({ productId, delta }) =>
      tx.product.update({
        where: { id: productId },
        data: { stock: { increment: delta } }, // delta is already negative
      })
    )
  );
  const newOrder = await tx.shopOrder.create({
    data: { orgId: body.orgId, branchId: branch.id, userId, totalPaise: lockedCalc.totalPaise },
  });
  await tx.shopOrderItem.createMany({
    data: body.items.map((item) => ({
      orgId: body.orgId, orderId: newOrder.id, productId: item.productId,
      quantity: item.quantity,
      unitPaise: lockedProducts.find((p) => p.id === item.productId)?.pricePaise ?? 0,
    })),
  });
  return newOrder;
});
```

Remove the now-redundant outer `prisma.shopOrder.create` and `prisma.shopOrderItem.createMany` calls.

**Demo mode (`demo-api.ts`):** In the demo order creation handler, after building the order, subtract quantities from the in-memory product stock array so the stock screen also reflects changes in demo.

### Acceptance Criteria

- Placing a shop order decrements `Product.stock` by the ordered quantity in the same database transaction
- If two concurrent requests attempt to order the last item, only the first succeeds (second receives a 400 "Product out of stock")
- Order creation for an out-of-stock item returns 400, not a silent success followed by a stuck order
- Owner stock management screen reflects the correct remaining quantity after each order
- Existing order fulfillment flow is unchanged

### Testing

```bash
# Set a product stock to 1
# Attempt to create two orders simultaneously for quantity 1 of that product
# Verify only one order succeeds; the other returns 400
# Verify Product.stock = 0 after the successful order
```

---

## Task 2 — Fix: Branch Mismatch Not Checked on QR Scan

**Effort**: XS | **Priority**: P1 | **Layer**: backend

A member with a branch-specific subscription (e.g., paid for Andheri branch only) can scan the QR at a different branch and be let in without any check.

### Root Cause

`validateAttendanceScan` in `attendance.ts` (line 428) passes `wrongBranch: false` hardcoded. The QR token carries `decoded.branchId` (the branch whose QR was scanned). The `subscription.branchId` is fetched (line ~292) but never compared to `decoded.branchId`. Gym-wide subscriptions (no branch restriction) should always be allowed; branch-specific ones should only be allowed at their branch.

### Files to Change

- `apps/web/src/server/api-router/attendance.ts`

### Approach

Replace the hardcoded `wrongBranch: false` on line 428 with:

```ts
wrongBranch:
  subscription.branchId != null &&
  subscription.branchId !== decoded.branchId,
```

This allows:
- `subscription.branchId == null` → gym-wide subscription → any branch ✓
- `subscription.branchId === decoded.branchId` → correct branch ✓
- `subscription.branchId !== decoded.branchId` → wrong branch → scan rejected with "WRONG_BRANCH" flag

The existing `validateAttendanceScan` already handles `wrongBranch: true` (it adds it to `suspiciousFlags` which causes the attendance to land in PENDING_APPROVAL status). If you want hard rejection instead of suspicious approval, also add a check before `validateAttendanceScan`:

```ts
if (
  subscription.branchId != null &&
  subscription.branchId !== decoded.branchId
) {
  return fail(
    "WRONG_BRANCH",
    "Your membership is for a different branch. Please visit your registered branch.",
    400,
  );
}
```

The hard rejection is recommended for financial integrity — do not let members check in at branches their subscription doesn't cover.

### Acceptance Criteria

- A member with a branch-specific subscription receives a clear error when scanning a QR from a different branch
- A member with a gym-wide subscription (no branch restriction) can scan any branch's QR
- Demo mode: inject a branch-mismatched membership into `demo-api.ts` fixtures and verify the error message appears on scan
- No change to behavior for gym-wide subscriptions

---

## Task 3 — Fix: Stale Open Check-Ins Block Next-Day Entry

**Effort**: S | **Priority**: P1 | **Layer**: backend

If a member forgets to check out or the app crashes, they have a permanently open attendance record. Their next gym visit (even the next day) fails with "Already checked in" until staff manually intervene.

### Root Cause

The `openCheckIn` query (line ~117: `checkedOutAt: null`) returns any record ever left open, with no date filter. There is no cron or midnight sweep to auto-close stale open records. On a busy day with 100+ members, a few will always have open records from yesterday, blocking today's entry.

### Files to Change

- `apps/web/src/server/api-router/attendance.ts`
- `apps/web/src/server/api-router/cron.ts`

### Approach

**Immediate fix — scope the `openCheckIn` query to today:**

In the `Promise.all` block (around line 117), the `openCheckIn` query should only find records from the current operational day:

```ts
// Replace the openCheckIn query in the Promise.all:
prisma.attendanceRecord.findFirst({
  where: {
    orgId: decoded.orgId,
    userId,
    checkedOutAt: null,
    dateKey: operationalDateKey(now), // only today's open check-ins block entry
  },
  orderBy: { checkedInAt: "desc" },
}),
```

This unblocks members whose yesterday record was never closed, while still preventing same-day double-entry (which is the actual intended behaviour of the check).

**Cron sweep — auto-close records older than 1 day:**

Add to `cron.ts`:

```ts
if (request.method === "POST" && pathMatches(path, ["cron", "auto-checkout"])) {
  requireCronSecret(request);
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const result = await prisma.attendanceRecord.updateMany({
    where: {
      checkedOutAt: null,
      checkedInAt: { lt: yesterday },
    },
    data: { checkedOutAt: yesterday, source: "AUTO_CHECKOUT" },
  });
  return ok({ ok: true, autoclosed: result.count });
}
```

Add to `vercel.json` crons:
```json
{ "path": "/api/cron/auto-checkout", "schedule": "0 2 * * *" }
```

(Runs at 2 AM daily — well after gym closing hours for the Indian timezone.)

### Acceptance Criteria

- A member who forgot to check out yesterday can check in today without error
- A member who is currently checked in (open record from today) is still blocked from checking in again
- `POST /cron/auto-checkout` closes all records with `checkedOutAt: null AND checkedInAt < 24h ago`
- Auto-closed records have `source: "AUTO_CHECKOUT"` so reports can distinguish them from manual checkouts
- The cron runs at 2 AM daily and is registered in `vercel.json`

---

## Task 4 — Feature: Static Printable QR Mode

**Effort**: M | **Priority**: P1 | **Layer**: cross-cutting

Gym owners can choose between a rolling QR (refreshes every 30s for a staffed desk) and a static QR (fixed for up to 90 days, printable, for unstaffed entry points).

### Context

Currently `POST /orgs/:orgId/attendance/qr-token` always creates a new token with a 180-second expiry. The owner display (`entry-qr-route.tsx`) shows a countdown and refreshes every 30 seconds. This is good for a manned front desk but useless for printing — the printed QR would expire in 3 minutes.

The user's request: allow owners to set a branch to **Static QR mode** so they can print a durable QR code for an unstaffed door or a wall display. The security model is unchanged — the QR only identifies the gym/branch, and the server still validates the scanning member's active membership.

**Security note for the security audit:** A static QR can be photographed and reused later. This is acceptable because the QR proves nothing about the member's identity or membership — that is validated server-side per authenticated session. The only attack is a former staff member printing the QR before their access is revoked; mitigate with "Regenerate" which invalidates the old token.

### Files to Change

**Schema:**
- `packages/db/prisma/schema.prisma` — add `qrMode` and `staticQrExpiryDays` to `Branch` model

**Backend:**
- `apps/web/src/server/api-router/attendance.ts` — modify `POST /orgs/:orgId/attendance/qr-token`
- `apps/web/src/server/api-router/organization-branches.ts` — add PATCH handler for branch QR settings

**Mobile:**
- `apps/mobile/src/features/route-surfaces/entry-qr-route.tsx`
- `apps/mobile/src/lib/domains/owner/queries.ts` — update `useAttendanceQrToken`

**Web:**
- `apps/web/src/components/attendance-qr-panel.tsx`

**Demo:**
- `apps/mobile/src/lib/demo-api.ts`

### Approach

#### Schema

```prisma
model Branch {
  // ... existing fields
  qrMode             String  @default("ROLLING") // ROLLING | STATIC
  staticQrExpiryDays Int     @default(30)        // 1-90; ignored when ROLLING
}
```

Run `npx prisma migrate dev --name branch-qr-mode`.

#### Backend — `attendance.ts` `POST /orgs/:orgId/attendance/qr-token`

Read `branch.qrMode` from the branch record (already fetched) and branch on it:

```ts
const isStatic = branch.qrMode === "STATIC";

if (isStatic) {
  // Look for an existing valid static token for this branch
  const existingToken = await prisma.attendanceQrToken.findFirst({
    where: {
      orgId,
      branchId: branch.id,
      expiresAt: { gt: now },
      // Use a metadata field to mark static tokens, OR use a long expiresAt heuristic
    },
    orderBy: { issuedAt: "desc" },
  });
  if (existingToken) {
    const checkInCode = checkInCodeForQrNonce(existingToken.nonce);
    const qrPayload = createSignedQrToken({
      orgId,
      branchId: branch.id,
      nonce: existingToken.nonce,
      expiry: existingToken.expiresAt.getTime(),
      signature: existingToken.signature,
    });
    return ok({
      qrPayload: toWebUrl(`/checkin?qrPayload=${encodeURIComponent(qrPayload)}&checkInCode=${checkInCode}`),
      checkInCode,
      expiresAt: existingToken.expiresAt.toISOString(),
      isStatic: true,
    });
  }
  // Create a new static token with long expiry
  const expiryMs = (branch.staticQrExpiryDays ?? 30) * 24 * 60 * 60 * 1000;
  const expiresAt = new Date(now.getTime() + expiryMs);
  // ... create token using same createSignedQrToken pattern but with long expiresAt
}
// Existing ROLLING logic unchanged
```

**Static token scan count:** The current `scanCount: { lt: 200 }` limit on line ~267 blocks busy static QRs. Add a bypass for static-duration tokens:

```ts
// In the scan validation — if the token has a long expiry (> 1 hour), skip scan count enforcement
const isStaticToken = (qrToken.expiresAt.getTime() - qrToken.issuedAt.getTime()) > 60 * 60 * 1000;
if (!isStaticToken && qrToken.scanCount >= 200) {
  throw validationError("This QR code has expired due to scan volume. Ask reception to refresh it.");
}
```

**Regenerate:** Add `POST /orgs/:orgId/attendance/qr-token/regenerate` that invalidates the current static token (sets `expiresAt = now`) and forces creation of a new one. Require `ATTENDANCE_APPROVE` permission.

#### Backend — `organization-branches.ts`

Add `PATCH /orgs/:orgId/branches/:branchId/qr-settings`:

```ts
if (
  request.method === "PATCH" &&
  pathMatches(path, ["orgs", /.+/, "branches", /.+/, "qr-settings"])
) {
  const orgId = path[1]!;
  const branchId = path[3]!;
  const ctx = await getRequestContext(request, { orgId });
  requireOrgPermission(ctx, orgId, "ORG_MANAGE_STAFF"); // or ORG_ADMIN
  const body = z.object({
    qrMode: z.enum(["ROLLING", "STATIC"]),
    staticQrExpiryDays: z.number().int().min(1).max(90).optional(),
  }).parse(await readJson(request));
  const branch = await prisma.branch.update({
    where: { id: branchId, orgId },
    data: clean({ qrMode: body.qrMode, staticQrExpiryDays: body.staticQrExpiryDays }),
  });
  return ok({ branch });
}
```

#### Mobile — `entry-qr-route.tsx`

The component currently shows a countdown timer and "Refreshes in X seconds". Add branching on the `isStatic` field returned by the token query:

```tsx
// When isStatic === true:
// - Hide the countdown timer entirely
// - Show "Valid until {formatLongDate(expiresAt)}" instead
// - Show a "Print" button that calls Linking.openURL(`${webAppUrl}/orgs/${orgId}/entry-qr/print?branchId=${branchId}`)
// - Show a "Regenerate" button that calls POST /orgs/:orgId/attendance/qr-token/regenerate
//   and refetches the token query
// - Remove the refetchInterval from useAttendanceQrToken when isStatic is true

const { data: tokenData } = useAttendanceQrToken({ orgId, branchId });
const isStatic = tokenData?.isStatic ?? false;

// In useAttendanceQrToken hook (owner/queries.ts):
refetchInterval: isStatic ? false : 30_000,
```

Add a **QR mode toggle** to the entry-qr screen header or as a settings row below the QR:

```tsx
<View style={styles.settingsRow}>
  <Text style={styles.label}>QR Mode</Text>
  <ZookButton
    size="sm"
    variant="secondary"
    onPress={() => openQrSettings()}
  >
    {isStatic ? "Static (printable)" : "Rolling (30s)"}
  </ZookButton>
</View>
```

`openQrSettings` opens a bottom sheet with two options: Rolling and Static, plus a slider/input for expiry days (1–90) when Static is selected. On confirm, call `PATCH /orgs/:orgId/branches/:branchId/qr-settings`, then refetch the token.

#### Web — `attendance-qr-panel.tsx`

Identical branching — when `isStatic`:
- Replace the countdown pill with "Valid until {date}"
- Show a `<button onClick={() => window.print()}>Print QR</button>` that triggers the browser print dialog (add `@media print` CSS to the panel to hide everything except the QR code and gym name)
- Show "Regenerate" button

```css
@media print {
  .attendance-qr-panel * { visibility: hidden; }
  .attendance-qr-panel .qr-code,
  .attendance-qr-panel .qr-code * { visibility: visible; }
  .attendance-qr-panel .qr-code { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); }
}
```

#### Demo mode (`demo-api.ts`)

Add a module-level `let demoBranchQrMode: "ROLLING" | "STATIC" = "ROLLING"`. In the `PATCH /orgs/:id/branches/:id/qr-settings` demo handler, update it. In `POST /orgs/:id/attendance/qr-token` demo handler, return `isStatic: demoBranchQrMode === "STATIC"` in the response, and when STATIC, return a fixed token with a far-future `expiresAt`.

### Acceptance Criteria

- Owner/reception entry QR screen shows a mode toggle ("Rolling" / "Static (printable)")
- Switching to Static mode: countdown disappears, "Valid until {date}" label appears, Print button appears
- Print button opens the browser print dialog showing only the QR code and gym/branch name
- Regenerate button invalidates the old token and generates a new static token
- Static QR token does not expire due to scan count (no 200-scan ceiling)
- A static QR token with 30-day expiry is reused across all requests until it expires or is regenerated
- Switching back to Rolling mode: countdown reappears, QR refreshes every 30s
- Branch QR mode setting persists across app restarts
- The scan flow is identical for members regardless of QR mode — membership is validated the same way

### Testing

1. OWNER role → open Entry QR screen → tap mode toggle → select Static (30 days)
2. Verify countdown disappears, "Valid until" date shows
3. Tap "Print" → verify print dialog opens with a clean QR-only layout
4. Close and reopen the Entry QR screen → verify the same QR code is shown (not a new one)
5. Tap "Regenerate" → verify the QR changes and the old one is now invalid
6. Switch back to Rolling → verify countdown reappears and QR refreshes every 30s
7. Member role → scan the static QR → verify check-in succeeds normally

---

## Task 5 — Fix: `vercel.json` Missing New Cron Registrations

**Effort**: XS | **Priority**: P0 | **Layer**: backend

Three cron handlers exist in `cron.ts` but are not scheduled — they never fire in production.

### Context

`cron.ts` has:
- `POST /cron/send-scheduled-notifications` (T3 from previous handoff)
- `POST /cron/subscription-expiry` (T3 from previous handoff)
- `POST /cron/auto-checkout` (added in Task 3 above)

None of these are in `apps/web/vercel.json`.

### File to Change

- `apps/web/vercel.json`

### Approach

Add to the `"crons"` array:

```json
{ "path": "/api/cron/send-scheduled-notifications", "schedule": "*/5 * * * *" },
{ "path": "/api/cron/subscription-expiry", "schedule": "0 * * * *" },
{ "path": "/api/cron/auto-checkout", "schedule": "0 2 * * *" }
```

---

## Task 6 — Fix: Class Enrollment Rate Limiting Missing

**Effort**: XS | **Priority**: P2 | **Layer**: backend

`POST /orgs/:orgId/classes/:classId/enroll` is the only high-value mutation without rate limiting.

### File to Change

- `apps/web/src/server/api-router/classes.ts`

### Approach

In the enroll handler, immediately after `requireAuth`:

```ts
await assertRateLimit("classEnrollByUser", userId, "Too many enrollment requests.");
```

---

## Task 7 — Fix: Reports Panel Missing "Shop Orders" Export Button

**Effort**: XS | **Priority**: P2 | **Layer**: web

`ReportsService.shopReport()` is wired up in `reports.ts` but the UI export button is absent.

### File to Change

- `apps/web/src/components/dashboard/read-only/reports-panel.tsx`

### Approach

Add to the `exportReports` array (line ~129):

```ts
{ id: "shop", label: "Shop orders", icon: "bag-outline" },
```

---

## Task 8 — UX: Low Visit Count Push Notification

**Effort**: S | **Priority**: P2 | **Layer**: backend

Members on visit packs are not notified when they're running low, leading to surprise "membership expired" rejections at the door.

### Context

`applyAttendanceUsage` in `core.ts` (line 4414) already updates `remainingVisits` in the database. After the update, it knows the new remaining count. No notification is sent. The notification system can send TRANSACTIONAL pushes to individual users.

### Files to Change

- `apps/web/src/server/api-router/core.ts` (`applyAttendanceUsage` function)

### Approach

After the `prisma.memberSubscription.update` and `prisma.membershipUsage.create` calls, add a low-balance notification:

```ts
const VISIT_ALERT_THRESHOLDS = [3, 1]; // notify at 3 visits remaining and 1 visit remaining

if (
  updated.remainingVisits != null &&
  VISIT_ALERT_THRESHOLDS.includes(updated.remainingVisits)
) {
  const visits = updated.remainingVisits;
  await sendTransactionalNotification({
    userId: input.subscription.memberUserId,
    orgId: input.orgId,
    title: visits === 1 ? "Last visit remaining" : `${visits} visits remaining`,
    body:
      visits === 1
        ? "This is your last visit on your current pack. Renew before your next session."
        : `You have ${visits} visits left on your pack. Consider renewing soon.`,
    actionUrl: "/membership",
    category: "operational",
  });
}
```

Import `sendTransactionalNotification` from the notification domain (same import used in the renewal reminders cron).

### Acceptance Criteria

- Member receives a push notification when `remainingVisits` drops to exactly 3
- Member receives a push notification when `remainingVisits` drops to exactly 1
- No duplicate notifications for the same threshold on the same day (if the member checks in twice and drops from 4→3 and 3→2, only the 3 threshold fires)
- Members on DURATION or DATE_RANGE plans (no `remainingVisits`) are unaffected

---

## Task 9 — UX: Gym Profile Share Button

**Effort**: XS | **Priority**: P2 | **Layer**: mobile

Members can share a gym's profile link directly from the mobile app — currently there's no share affordance on the gym profile screen.

### Context

`gym-username-route.tsx` has the gym's `username`. The public URL is `zookfit.in/g/{username}`. React Native's `Share` API opens the native share sheet.

### Files to Change

- `apps/mobile/src/features/route-surfaces/gym-username-route.tsx`

### Approach

Add to the screen header's trailing area (next to the review button or in the top-right):

```tsx
import { Share } from "react-native";

async function shareGym() {
  await Share.share({
    message: `Check out ${gym.name} on Zook — ${toWebUrl(`/g/${gym.username}`)}`,
    url: toWebUrl(`/g/${gym.username}`), // iOS uses url; Android uses message
  });
}

// In the header trailing slot:
<TouchableOpacity onPress={() => void shareGym()} style={styles.shareBtn}>
  <Ionicons name="share-outline" size={22} color={palette.text.primary} />
</TouchableOpacity>
```

### Acceptance Criteria

- Share icon appears in the gym profile screen header
- Tapping it opens the native OS share sheet with the gym name and public URL
- The shared URL is the correct `zookfit.in/g/{username}` format

---

## Task 10 — UX: PT Session History for Members

**Effort**: S | **Priority**: P2 | **Layer**: mobile

Members can see a log of which PT sessions happened, with dates and trainer notes — the coaching tab shows "7 of 12 sessions" but there's no way to see which sessions those were.

### Context

`GET /me/coaching` returns the active PT subscription but does not include individual `PersonalTrainingSessionLog` records in the response. The coaching screen shows session progress (`remainingSessions` / `totalSessions`) as a fraction but no history.

### Files to Change

- `apps/web/src/server/api-router/me-data.ts` (enrich `/me/coaching` response)
- `apps/mobile/app/(member)/coaching.tsx` (render session history)

### Approach

In `me-data.ts`, the `/me/coaching` handler already fetches the active PT subscription. Enrich it with recent session logs:

```ts
const recentSessions = subscription
  ? await prisma.personalTrainingSessionLog.findMany({
      where: { subscriptionId: subscription.id },
      orderBy: { sessionDate: "desc" },
      take: 10,
    })
  : [];

return ok({ subscription: enrichedSub, recentSessions });
```

In `coaching.tsx`, after the session progress bar, render a "Recent sessions" section:

```tsx
{recentSessions.length > 0 ? (
  <>
    <SectionHeader title="Recent sessions" />
    {recentSessions.map((session) => (
      <Card key={session.id} variant="compact">
        <View style={styles.sessionRow}>
          <Text style={styles.sessionDate}>{formatLongDate(session.sessionDate)}</Text>
          {session.trainerNotes ? (
            <Text style={styles.sessionNotes} numberOfLines={2}>{session.trainerNotes}</Text>
          ) : null}
        </View>
      </Card>
    ))}
  </>
) : null}
```

---

## Task 11 — UX: Member Membership Expiry Warning Banner

**Effort**: S | **Priority**: P2 | **Layer**: mobile

Members see a persistent warning banner on the home screen when their membership expires within 7 days, with a one-tap renewal path.

### Context

The home screen shows the active membership chip but no proactive expiry warning. Members on DURATION plans frequently let memberships lapse without realising because the expiry date requires navigating to a sub-screen.

### Files to Change

- `apps/mobile/app/(member)/index.tsx`

### Approach

In the home screen, after loading the membership data, compute days remaining:

```tsx
const daysLeft = membership?.endsAt
  ? Math.ceil((new Date(membership.endsAt).getTime() - Date.now()) / 86_400_000)
  : null;

const showExpiryWarning = daysLeft != null && daysLeft <= 7 && daysLeft > 0;
const isExpiredToday = daysLeft != null && daysLeft <= 0;

{showExpiryWarning || isExpiredToday ? (
  <Card
    variant="compact"
    contentStyle={[styles.warningCard, { backgroundColor: palette.status.warning + "22" }]}
  >
    <Ionicons name="warning-outline" size={18} color={palette.status.warning} />
    <View style={{ flex: 1 }}>
      <Text style={[styles.warningTitle, { color: palette.status.warning }]}>
        {isExpiredToday ? "Membership expired" : `Membership expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`}
      </Text>
      <Text style={[styles.warningBody, { color: palette.text.secondary }]}>
        {isExpiredToday ? "Renew to continue checking in." : "Renew now to avoid interruption."}
      </Text>
    </View>
    <ZookButton size="sm" onPress={() => router.push("/membership/buy" as never)}>Renew</ZookButton>
  </Card>
) : null}
```

Place the banner between the greeting row and the workout hero card.

### Acceptance Criteria

- Banner appears when `endsAt` is within 7 days (including today)
- Banner is yellow/warning tone for `daysLeft <= 7` and red/error tone for `daysLeft <= 0`
- "Renew" button navigates to the membership buy screen
- Banner is absent for active memberships with more than 7 days remaining
- Members on VISIT_PACK plans (no `endsAt`) do not see this banner

---

## Task 12 — UX: Owner Approval Queue Deep Links

**Effort**: S | **Priority**: P2 | **Layer**: mobile

Tapping a push notification for "pending approval" items (new member, payment proof, class request) navigates directly to the approval queue item instead of the generic approvals list.

### Context

`apps/mobile/app/owner/approvals.tsx` renders a flat list of pending items. Push notifications for these items land the owner on the approvals list root with no indication of which item needs attention. For owners with 5-10 pending items, finding the right one requires scanning.

### Files to Change

- `apps/mobile/app/owner/approvals.tsx`
- `apps/web/src/server/api-router/organization-notifications.ts` (approval notification `actionUrl`)

### Approach

**In `organization-notifications.ts`:** When sending approval-request notifications, set `actionUrl` to include the entity ID:

```ts
actionUrl: `/owner/approvals?highlight=${entity.id}`,
```

**In `approvals.tsx`:** Read the `highlight` search param:

```tsx
const { highlight } = useLocalSearchParams<{ highlight?: string }>();

// After the list renders, scroll to and flash the highlighted item:
useEffect(() => {
  if (highlight && flatListRef.current) {
    const index = approvals.findIndex((a) => a.id === highlight);
    if (index >= 0) {
      flatListRef.current.scrollToIndex({ index, animated: true });
    }
  }
}, [highlight, approvals]);

// Apply a highlighted style to the matching card:
style={[styles.approvalCard, item.id === highlight && styles.highlighted]}
```

`styles.highlighted` should add a subtle lime border: `{ borderWidth: 1.5, borderColor: palette.accent.base }`.

---

## Task 13 — UX: Reception Desk "Quick Actions" Row

**Effort**: S | **Priority**: P3 | **Layer**: web

Receptionists have a 4-tab desk with no shortcut to the most common cross-tab actions. Adding a persistent quick-action row reduces navigation time for high-frequency tasks.

### Context

Reception desk high-frequency workflow: check in a member → take payment → mark a class roster. Currently requires 3 separate tab navigations. A quick-action row pinned to the top of the desk (above the tabs) reduces this to inline taps.

### Files to Change

- `apps/web/src/components/desk/desk-workspace.tsx`

### Approach

Add a row of 3-4 icon buttons above the tab bar:

```tsx
<div className="desk-quick-actions">
  <button onClick={() => setActiveTab("member")} title="Check in member">
    <QrCodeIcon /> Check in
  </button>
  <button onClick={() => { setActiveTab("payment"); setNewPayment(true); }} title="New payment">
    <CreditCardIcon /> New payment
  </button>
  <button onClick={() => setActiveTab("classes")} title="Enroll in class">
    <CalendarIcon /> Classes
  </button>
  <button onClick={() => setActiveTab("pickup")} title="Shop pickup">
    <PackageIcon /> Pickup
  </button>
</div>
```

Style as a compact pill-button row (height 40px, border-bottom separator from the tabs).

---

## Task 14 — UX: Owner Dashboard "Today at a Glance" Mobile Widget

**Effort**: M | **Priority**: P3 | **Layer**: mobile

The owner home screen shows KPI cards (total members, revenue month) but no "right now" view — today's check-in count, open orders, pending approvals. These are the numbers an owner checks first thing in the morning.

### Context

`apps/mobile/app/owner/index.tsx` shows metrics from `useOrgOverview()`. The overview query returns monthly/all-time aggregates. There's no "today's activity" summary.

### Files to Change

- `apps/web/src/server/api-router/organization-overview.ts`
- `apps/mobile/app/owner/index.tsx`

### Approach

Add a `today` sub-object to the overview response:

```ts
const [todayCheckIns, pendingApprovals, openOrders] = await Promise.all([
  prisma.attendanceRecord.count({
    where: { orgId, dateKey: operationalDateKey(new Date()), status: "APPROVED" },
  }),
  prisma.memberSubscription.count({
    where: { orgId, status: "PENDING_PAYMENT" },
  }),
  prisma.shopOrder.count({
    where: { orgId, status: "READY_FOR_PICKUP" },
  }),
]);
// Add to the response: today: { checkIns: todayCheckIns, pendingApprovals, openOrders }
```

In `owner/index.tsx`, render a horizontal "Today" row above the main KPI grid:

```tsx
<SectionHeader title="Today" />
<View style={styles.todayRow}>
  <MetricChip label="Check-ins" value={today.checkIns} icon="walk-outline" />
  <MetricChip label="Pending" value={today.pendingApprovals} icon="hourglass-outline" tone="warning" />
  <MetricChip label="Pickups" value={today.openOrders} icon="bag-outline" tone="accent" />
</View>
```

Tapping each chip deep-links to the relevant screen (attendance log / approvals / orders).

---

## Task 15 — Product Gap: Membership Pause Self-Serve

**Effort**: M | **Priority**: P3 | **Layer**: cross-cutting

Members cannot pause their own membership from the app — only staff can. This forces a support interaction for every medical leave, vacation, or injury pause request.

### Context

`POST /me/memberships/:id/pause` does not exist. The web dashboard has owner-side pause. The member `membership/index.tsx` screen has no pause action. The schema supports `status: "PAUSED"` and `pauseReason`.

### Files to Change

- `apps/web/src/server/api-router/membership-subscription-actions.ts`
- `apps/mobile/app/(member)/membership/index.tsx` (or the membership surface)
- `apps/mobile/src/lib/domains/member/mutations.ts`

### Approach

**Backend:** `POST /me/memberships/:id/pause` with body `{ pauseReason, resumeAt? }`. Validate: subscription must be ACTIVE. Validate: member can only pause their own subscription. Check if the org allows self-serve pausing (add `allowSelfServePause: Boolean @default(true)` to `Organization` or use an org setting). Set `status = "PAUSED"`, record `pauseReason`. Write audit log. Return updated subscription.

**Mobile:** In the membership screen, add a "Pause membership" action below "Cancel" (already present). The action opens a bottom sheet with a reason picker (Medical, Travel, Injury, Other) and an optional resume date picker. On submit, calls the new endpoint.

**Guard:** If `allowSelfServePause` is false for the org, show "Contact your gym to pause" instead of the pause button.

---

## Deployment Gaps

### D1 — New Cron Handlers Need `CRON_SECRET` Confirmed in Production

All three new cron endpoints (`send-scheduled-notifications`, `subscription-expiry`, `auto-checkout`) use `requireCronSecret`. If `CRON_SECRET` is not set in the Vercel production environment, the crons will return 401 silently. Verify it is set (the existing 5 crons already use it, so if those are running, it's already set).

### D2 — Static QR Schema Migration Before Deployment

Task 4 adds `qrMode` and `staticQrExpiryDays` to the `Branch` model. Run `npx prisma migrate deploy` before deploying the code change. Deploy-before-migrate causes a Prisma runtime crash on any attendance QR request.

### D3 — Auto-Checkout Cron Time Zone

The `auto-checkout` cron is scheduled at `0 2 * * *` UTC. In IST (UTC+5:30), this is 7:30 AM — acceptable for a gym context. If the business operates 24 hours or has locations in a different time zone, adjust to `30 20 * * *` UTC (2 AM IST). Verify the intended time with the product owner before deploying.
