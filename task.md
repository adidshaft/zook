# Zook Systemic Refactor Tracker

Source of truth:
- `~/.gemini/antigravity/brain/f137e582-36f8-44d7-963d-5a2fa5182587/zook_ux_audit.md`
- `~/.gemini/antigravity/brain/f137e582-36f8-44d7-963d-5a2fa5182587/zook_strategic_audit_part1.md`
- `~/.gemini/antigravity/brain/f137e582-36f8-44d7-963d-5a2fa5182587/zook_strategic_audit_part2.md`
- `~/.gemini/antigravity/brain/f137e582-36f8-44d7-963d-5a2fa5182587/zook_strategic_audit_part3.md`

## Sprint 1: Foundation

- [x] Fix visit ring fallback and animate ring in `apps/mobile/app/index.tsx`
- [x] Fix MiniTrend fake default data in `apps/web/src/components/dashboard-primitives.tsx`
- [x] Fix hardcoded trainer fallback, greeting, and encouragement copy in `apps/mobile/app/index.tsx`
- [x] Fix inline `+91` phone input in `apps/mobile/app/login.tsx`
- [x] Move settings logout to bottom as a subtle text link in `apps/mobile/app/settings.tsx`
- [x] Fix SectionHeader double description in `apps/web/src/components/dashboard-primitives.tsx`
- [x] Verify Sprint 1 with `pnpm turbo run typecheck lint`

## Sprint 2: Navigation & Home

- [x] Restructure bottom nav: Home, Track, Scan FAB, Shop, Profile
- [x] Remove Scan as a regular tab and eliminate More from primary nav
- [x] Extract Home components to `apps/mobile/src/components/home/`
- [x] Implement two-zone Home layout: action strip plus feed
- [x] Make Scan a prominent FAB/Home CTA
- [x] Merge Profile and Settings into one tab/surface
- [x] Verify Sprint 2 with `pnpm turbo run typecheck lint`

## Sprint 3: Scan & Membership Polish

- [x] Redesign scan screen camera-first and code-second
- [x] Split membership screen into shell, featured plan, payment history, renewal sheet
- [x] Add dynamic bottom sheet sizing
- [x] Add scroll indicators/hints to membership plan selector
- [x] Fix tracking weekly ring with real SVG progress
- [x] Verify Sprint 3 with `pnpm turbo run typecheck lint`

## Sprint 4: Data Layer & Performance

- [x] Create composite `/api/me/dashboard` endpoint
- [x] Update mobile query hooks to consume dashboard data
- [x] Set global `staleTime` and `gcTime`
- [x] Prefetch dashboard query in mobile layout
- [x] Implement optimistic attendance scan updates
- [x] Verify Sprint 4 with `pnpm turbo run typecheck lint`

## Sprint 5: Design System & Primitives

- [x] Split `apps/mobile/src/components/primitives.tsx` into a barrel-exported directory
- [x] Create `packages/tokens`
- [x] Deprecate `theme.ts` aliases
- [x] Fix mobile eyebrow letter spacing
- [x] Fix mobile nav label size
- [x] Make web member filters functional
- [x] Verify Sprint 5 with `pnpm turbo run typecheck lint`

## Sprint 6: Web Dashboard Modernization

- [x] Convert dashboard sections to Next.js dynamic routes
- [x] Split `members-section.tsx` into roster, detail, queue, import, and ladder files
- [x] Fix DataTable permanent right fade
- [x] Remove non-functional find-gyms location chips
- [x] Verify Sprint 6 with `pnpm turbo run typecheck lint`

## Final Infrastructure / DevOps Polish

- [x] Enforce stricter package boundaries and move suitable domain logic to `packages/core`
- [x] Implement 15-minute access token plus 30-day refresh token with silent refresh
- [x] Final verification with `pnpm turbo run typecheck lint`
- [x] Run full unit/service/mobile tests with `pnpm test`
- [x] Run full DB-backed web acceptance suite with `RUN_DB_WEB_TESTS=1 pnpm test:web`
- [x] Run acceptance wrapper with `pnpm test:acceptance`
- [x] Apply production refresh-session migration with `pnpm db:deploy`
- [x] Deploy current web app to Vercel production and smoke live pages/providers
