# Plan 07 — Shop / Payments / Plans Section Splits

## Goal

Apply the Members split pattern (plan #06) to the next three biggest dashboard sections: Shop (691 lines), Payments (757 lines), Plans (535 lines). Extract shared components where it makes sense (e.g., the payments view inside Shop Orders mirrors the Payments tab).

## Why

Each is a single monolithic file that bundles list, filters, bulk actions, detail drawer, and write actions in one place. After the routing flattening (plan #05), each top-level section page should be ≤ 250 lines, with logic decomposed into a `<section>/` folder.

## Prerequisites

- Plan #05 (route flattening).
- Plan #06 (Members split — establishes the pattern).

## Current state

- [`shop-section.tsx`](apps/web/src/components/dashboard/sections/shop-section.tsx) — 691 lines.
- [`shop-orders-section.tsx`](apps/web/src/components/dashboard/sections/shop-orders-section.tsx) — also exists; verify size and overlap.
- [`payments-panel.tsx`](apps/web/src/components/dashboard/read-only/payments-panel.tsx) — 757 lines. Lives under `read-only/` despite having write actions; rename during split.
- [`plans-section.tsx`](apps/web/src/components/dashboard/sections/plans-section.tsx) — 535 lines.
- [`plan-growth-sections.tsx`](apps/web/src/components/dashboard/sections/plan-growth-sections.tsx) — coupons / offers / referrals. Verify.
- [`shop-status-card.tsx`](apps/web/src/components/dashboard/sections/shop-status-card.tsx) — smaller; possibly reused.
- [`shop-order-payment-control.tsx`](apps/web/src/components/dashboard/read-only/shop-order-payment-control.tsx).

## Architectural target

```
apps/web/src/components/dashboard/shop/
├── shop-page.tsx               — /dashboard/shop entry
├── shop-orders-page.tsx        — /dashboard/shop/orders entry
├── product-list/
│   ├── index.tsx
│   ├── row.tsx
│   ├── filters.tsx
│   └── types.ts
├── product-detail-drawer.tsx
├── orders-list/
│   ├── index.tsx
│   ├── row.tsx
│   ├── filters.tsx
│   └── types.ts
├── order-detail-drawer.tsx
└── shared/
    └── payment-control.tsx     — moved from read-only/shop-order-payment-control.tsx

apps/web/src/components/dashboard/payments/
├── payments-page.tsx           — /dashboard/payments entry
├── refunds-page.tsx            — /dashboard/payments/refunds entry
├── payment-list/
│   ├── index.tsx
│   ├── row.tsx
│   ├── filters.tsx
│   └── types.ts
├── payment-detail-drawer.tsx
├── refund-list/
│   ├── index.tsx
│   ├── row.tsx
│   ├── filters.tsx
│   └── types.ts
└── refund-form.tsx

apps/web/src/components/dashboard/plans/
├── plans-page.tsx              — /dashboard/plans entry
├── coupons-page.tsx            — /dashboard/plans/coupons
├── offers-page.tsx             — /dashboard/plans/offers
├── referrals-page.tsx          — /dashboard/plans/referrals
├── plan-list/                  — shared list pattern for plans+coupons+offers+referrals
│   ├── index.tsx
│   ├── row.tsx
│   ├── filters.tsx
│   └── types.ts
├── plan-detail-drawer.tsx
├── coupon-detail-drawer.tsx
├── offer-detail-drawer.tsx
├── referral-detail-drawer.tsx
└── plan-form.tsx               — create/edit form, reused with mode
```

## Execution steps

### Step 1 — Shop split

Mirror the Members plan #06 pattern:

1. Audit `shop-section.tsx`. Extract helpers and constants.
2. Build `product-list/` per `MemberList` shape.
3. Build `product-detail-drawer.tsx`.
4. Rewrite `apps/web/app/dashboard/shop/page.tsx` to load product data via `getShopData(orgId, branchId)` and render `<ShopPage initial={data} />`.
5. Same for `/dashboard/shop/orders`: build `orders-list/`, `order-detail-drawer.tsx`, rewrite the page.
6. Move `shop-order-payment-control.tsx` from `read-only/` to `shop/shared/` (it does writes).
7. Delete `shop-section.tsx`, `shop-orders-section.tsx`, and (after migration) `read-only/shop-order-payment-control.tsx`.

Target sizes: each top-level page under 250 lines; rows/drawers under 300 lines.

### Step 2 — Payments split

1. Rename concept: `read-only/payments-panel.tsx` is not read-only; it does refunds. Move to `payments/`.
2. Build `payment-list/`, `payment-detail-drawer.tsx`.
3. Rewrite `apps/web/app/dashboard/payments/page.tsx`.
4. Build `refund-list/`, `refund-form.tsx`, rewrite `apps/web/app/dashboard/payments/refunds/page.tsx`.
5. Delete `read-only/payments-panel.tsx`.

### Step 3 — Plans split

This is the trickiest because Plans / Coupons / Offers / Referrals are conceptually similar but currently in two files (`plans-section.tsx`, `plan-growth-sections.tsx`).

1. Audit both files; identify shared list pattern.
2. Build a generic `plan-list/` that takes a `type: "plan" | "coupon" | "offer" | "referral"` discriminator and renders the right columns/actions. Or, if that proves messy, four separate but visually-identical components.
3. Build per-type detail drawers and forms.
4. Rewrite each of the four pages: `/dashboard/plans`, `/dashboard/plans/coupons`, `/dashboard/plans/offers`, `/dashboard/plans/referrals`.
5. Delete `plans-section.tsx` and `plan-growth-sections.tsx`.

### Step 4 — Cross-cutting: the "payments" view inside Shop Orders

Shop orders have an associated payment view that overlaps with the Payments tab. Use the same `payment-detail-drawer.tsx` in both places. Confirm during refactor.

### Step 5 — URL state sync

For each list (products, orders, payments, refunds, plans, coupons, offers, referrals): search + filter state lives in URL `?search=`, `?status=`, `?branchId=`, `?cursor=`. Direct deep-link to any filtered list works.

### Step 6 — Data layer

In `apps/web/src/lib/dashboard-data/` (created in plan #05): ensure these exist with focused fetches:

- `shop.ts` → `getShopData(orgId, { branchId, search, status, cursor })`
- `shop-orders.ts` → `getShopOrdersData(orgId, { branchId, search, status, cursor })`
- `payments.ts` → `getPaymentsData(orgId, { branchId, range, status, cursor })`
- `refunds.ts` → `getRefundsData(orgId, { branchId, status, cursor })`
- `plans.ts` → `getPlansData(orgId, branchId)`
- `coupons.ts` → `getCouponsData(orgId, branchId)`
- `offers.ts` → `getOffersData(orgId, branchId)`
- `referrals.ts` → `getReferralsData(orgId, branchId)`

Move logic from old `getDashboardData` into these.

### Step 7 — Theme migration

Touched components use semantic CSS vars.

## Files created

- `apps/web/src/components/dashboard/shop/**` (per architectural target)
- `apps/web/src/components/dashboard/payments/**`
- `apps/web/src/components/dashboard/plans/**`

## Files modified

- `apps/web/app/dashboard/shop/page.tsx`
- `apps/web/app/dashboard/shop/orders/page.tsx`
- `apps/web/app/dashboard/payments/page.tsx`
- `apps/web/app/dashboard/payments/refunds/page.tsx`
- `apps/web/app/dashboard/plans/page.tsx`
- `apps/web/app/dashboard/plans/coupons/page.tsx`
- `apps/web/app/dashboard/plans/offers/page.tsx`
- `apps/web/app/dashboard/plans/referrals/page.tsx`
- `apps/web/src/lib/dashboard-data/{shop,shop-orders,payments,refunds,plans,coupons,offers,referrals}.ts`

## Files deleted

- `apps/web/src/components/dashboard/sections/shop-section.tsx`
- `apps/web/src/components/dashboard/sections/shop-orders-section.tsx` (if present)
- `apps/web/src/components/dashboard/sections/plans-section.tsx`
- `apps/web/src/components/dashboard/sections/plan-growth-sections.tsx`
- `apps/web/src/components/dashboard/read-only/payments-panel.tsx`
- `apps/web/src/components/dashboard/read-only/shop-order-payment-control.tsx`
- `apps/web/src/components/dashboard/read-only/payments-utils.ts` (if its sole consumer was payments-panel; otherwise move)

## UI/UX fixes shipped

- URL state for filters and pagination across every list
- Consistent list look across Shop, Payments, Plans
- Shared payment control means one set of bug fixes covers Orders + Payments + Refunds
- Drawers are lazy — list scrolls smoothly even with 1000+ rows

## Acceptance criteria

- [ ] All eight pages render correctly: `/dashboard/{shop,shop/orders,payments,payments/refunds,plans,plans/coupons,plans/offers,plans/referrals}`.
- [ ] Search/filter state mirrored to URL on each list.
- [ ] Detail drawers open/close without losing filter state.
- [ ] No file in `apps/web/src/components/dashboard/{shop,payments,plans}/` exceeds 350 lines.
- [ ] All four deleted mega-files no longer exist.
- [ ] `pnpm -w typecheck` clean.
- [ ] `pnpm -w test --filter @zook/web` clean.

## What this plan does NOT do

- Does not change which data the dashboard shows.
- Does not change the look of forms / drawers — copy existing style, just into smaller files.
- Does not touch settings, branches, staff, audit, ai, reports, billing, notifications — those are smaller and can be migrated opportunistically when touched.
