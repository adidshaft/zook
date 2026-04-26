# Zook App Flow Implementation

Last updated: 2026-04-26

## Repository Inspection

- Package manager: `pnpm@10.16.0`.
- Monorepo runner: Turborepo via `turbo.json`.
- Workspace structure:
  - `apps/mobile`: Expo Router mobile app.
  - `apps/web`: Next.js App Router web app and API route gateway.
  - `packages/core`: shared types, permissions, validators, business services, providers, and sample data.
  - `packages/db`: Prisma schema and seed package.
  - `packages/ui`: shared web tokens.
  - `packages/figma-zook-ui-system` and `packages/figma-icon-builder`: Figma/plugin support and generated assets.
- Mobile app location: `apps/mobile`.
- Web app location: `apps/web`.
- Backend/API location: `apps/web/app/api/[[...path]]/route.ts`, with service logic in `apps/web/src/server` and shared rules in `packages/core/src/services`.
- Shared UI/design packages:
  - Mobile primitives: `apps/mobile/src/components/primitives.tsx`.
  - Mobile theme: `apps/mobile/src/lib/theme.ts`.
  - Web primitives: `apps/web/src/components/*`.
  - Shared web tokens: `packages/ui/src/index.ts` and `packages/ui/src/tokens.css`.
- Routing:
  - Mobile: Expo Router.
  - Web: Next.js App Router.
- State/data:
  - React Query on mobile and web.
  - Mobile auth state in `apps/mobile/src/lib/auth.tsx` with SecureStore/local storage wrapper.
  - Server-backed session/read models on web.
- Styling:
  - Mobile: React Native `StyleSheet`, Expo Blur, Inter font.
  - Web: Tailwind CSS v4, CSS variables from `@zook/ui/tokens.css`, glass-card primitives.
- Existing modules:
  - Auth: email OTP-only APIs and mobile login flow.
  - Payments: mock provider default, Razorpay provider-ready abstraction, hosted checkout and mock completion routes.
  - Attendance: signed QR token generation, scan validation, approval queue, manual operations.
  - Members/plans/shop/notifications/privacy/minors/platform diagnostics: existing server and UI coverage with varying depth.
- Tests:
  - Vitest unit tests in `packages/core/src/__tests__` and server/mobile tests.
  - Playwright web acceptance tests in `apps/web/tests`.
- Environment pattern:
  - `.env.example` defaults to mock/local providers.
  - Provider secrets are optional and kept server-side.
  - Local OTP is `000000`.

## Baseline Checks Before Product Alignment

- `pnpm typecheck`: passes.
- `pnpm lint`: passes with one warning in `apps/mobile/app/profile.tsx` for unused `syncStatus`.
- `pnpm test`: fails before running useful coverage because `@zook/core` executes Vitest from the package directory while the root config include is root-relative, so no test files are found from that cwd.

## Current Product Mapping

Already present:

- Email OTP auth with mock/local OTP behavior.
- Multi-role model with `OWNER`, `ADMIN`, `RECEPTIONIST`, `TRAINER`, `MEMBER`, and `PLATFORM_ADMIN`.
- Organization/branch-ready tenant model in Prisma and core types.
- Mock-first provider registry for email, payments, maps, AI, push, SMS, and storage.
- Hosted checkout handoff and mock payment completion.
- Server-side QR attendance concepts and approval/rejection flow.
- Mobile member, receptionist, trainer, owner, profile, shop, plans, scan, notifications, and tracking routes.
- Public gym, join, referral, guardian consent, checkout, owner dashboard, and platform diagnostics routes.

Needs alignment for the settled MVP flow:

- Make the mobile shell role-aware for member, trainer, receptionist, and owner command modes.
- Shift mobile copy and layout away from generic fitness app language into gym-ops execution surfaces.
- Add coherent mock/demo data with Iron Temple Gym, Aarav Mehta, Coach Rhea, Coach Kabir, Priya Sharma, Pune, realistic products, attendance codes, and plan details.
- Keep important actions server-authoritative in facades and UI copy: checkout creation/confirmation, attendance validation, manual payment, pickup fulfillment, AI draft assignment, privacy jobs.
- Tighten the design tokens to the final dark glass direction: `#070908`, `#f4f7ef`, `#aeb8a8`, restrained lime glow, translucent panels, large rounded corners, readable dense operations.
- Expand missing demo paths: pending attendance approval, receptionist payment/order tasks, trainer AI draft review, owner mobile command view, public checkout, owner/admin control room, platform provider diagnostics, minor/privacy states.

## Implementation Direction

The repo is not a scaffold. The implementation should preserve the existing Expo, Next, Prisma, React Query, provider, and service architecture. Product alignment should happen by:

- Refining shared tokens and primitives.
- Adding centralized demo fixtures/service facades in shared code where useful.
- Updating mobile screens and tab shells around active gym and active role.
- Updating web dashboard navigation/content labels to the owner/admin control-room model.
- Keeping mock providers as the default local runtime and never requiring production secrets.
- Documenting any remaining provider-backed limitations honestly.
