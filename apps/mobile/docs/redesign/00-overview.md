# Zook Mobile Redesign — Plan Overview

This folder contains the implementation plans for a multi-phase redesign of `apps/mobile`. Each plan is **self-contained**: a coding agent with no prior context can execute it by reading only that file plus the codebase.

## Why this redesign

The mobile app has accumulated four classes of problems:

1. **Mega-screens with internal `?view=` toggles** — `reception.tsx` (2,048 lines), `owner/index.tsx` (1,226), `trainer/index.tsx` (447), `membership.tsx` (1,278), `scan.tsx` (1,058), `index.tsx` (1,061), `profile.tsx` (895), `gym/[username].tsx` (1,197) — most of them pack 3–5 unrelated surfaces into a single component with a `view` query param branch.
2. **Two parallel design systems** — `src/components/primitives/foundation.tsx` (3,712 lines) sits alongside the split primitives (`buttons.tsx`, `cards.tsx`, `inputs.tsx`, `layout.tsx`, `nav.tsx`, `feedback.tsx`). Some screens import old, some import split. The `theme.ts` file has 6 `@deprecated` aliases still in active use.
3. **Three sources of truth for "who is the user"** — server-side `session.organizations[].roles`, client-side `activeRole` in AsyncStorage, and `getOfflineDemoRoleOverride()`. Reconciled ad-hoc in `_layout.tsx` and `auth.tsx`. Demo mode leaks into auth via identifier sniffing.
4. **No domain layer** — `src/lib/query-hooks.ts` is 1,583 lines with 50 hooks for every role and concern mixed together.

## The plans, in execution order

| # | File | Title | Depends on |
|---|------|-------|------------|
| 00 | `00-overview.md` | This file | — |
| 01 | `01-auth-context-unification.md` | One resolved role context; explicit role switcher | — |
| 02 | `02-demo-transport-seam.md` | Move demo mode behind apiClient transport | 01 |
| 03 | `03-theme-tokens-and-light-mode.md` | Semantic tokens; light + dark; contrast pass | — (can run parallel to 01/02) |
| 04 | `04-domain-layer-split.md` | Split `query-hooks.ts` into per-domain modules | — |
| 05 | `05-routing-reception.md` | Reception: `?view=` mega-screen → real subroutes | 01, 04 |
| 06 | `06-routing-owner.md` | Owner: same pattern | 01, 04, 05 |
| 07 | `07-routing-trainer.md` | Trainer: same pattern; fold ai-draft | 01, 04, 05 |
| 08 | `08-shared-domain-components.md` | Extract MemberList, ApprovalQueue, MetricGrid | 05, 06, 07 |
| 09 | `09-member-shell-and-home.md` | Member 4-tab shell; home state machine; kill `more.tsx` | 03, 04 |
| 10 | `10-you-surface-consolidation.md` | Merge profile + settings + membership | 03, 09 |
| 11 | `11-kill-list-and-cleanup.md` | Strangle `old.tsx`, remove dead routes | All prior |

**Hard ordering:** 01 → 02. 04 before 05/06/07. 05 before 06/07 (Reception is the template). 03 can run any time; 09/10 need it. 11 is last.

**Parallelism opportunities:** 03 (theme) and 04 (domain split) are both pure refactors with no UI impact — they can run in parallel with 01 and 02. After 04 lands, 05/06/07 can run in parallel by different agents because they're file-disjoint (different `app/<role>/` trees).

## Conventions every plan follows

### Strangler-fig migration
Never big-bang. New code lives next to old, screens are migrated one at a time, the old code is deleted in the final cleanup plan (#11). Tests must pass after every plan.

### File-based routes only
Expo Router. No `?view=` query params for routing — every named surface is its own file.

### Permission-gated, not role-gated
Visibility of tabs, buttons, and routes is keyed on `useHasPermission(...)`. Role is a label, permission is the gate. Existing permission set lives at `apps/mobile/src/lib/auth.tsx:762` (`useActivePermissions`).

### Primitives import path
Always import from `@/components/primitives` — never from `@/components/primitives/foundation` directly. The barrel at `apps/mobile/src/components/primitives/index.tsx` re-exports both old and split.

### Theme tokens
After plan #03 lands, components use semantic tokens (`surface`, `surfaceRaised`, `textPrimary`, `border`, `accent`) only. No hex literals, no `@deprecated` aliases. Until #03 lands, follow what the file already uses.

### Acceptance criteria
Every plan ends with a checklist. A plan is "done" when:
- All items in the checklist are verified
- `pnpm -w typecheck` passes
- `pnpm -w test` passes for any tests in scope
- Each screen touched still renders without crashes
- Existing deep links still work (back-compat redirects where needed)

### Files Codex must NOT touch unless the plan explicitly says so
- `apps/web/**` — web app changes are out of scope
- `packages/core/**` — shared types/permissions; only read
- `apps/mobile/ios/**`, `apps/mobile/android/**` — native projects
- Any `*.test.ts` file unrelated to the plan

## Repository orientation (read once)

```
apps/mobile/
├── app/                          # Expo Router file-based routes
│   ├── _layout.tsx               # Root layout + auth/role gating (625 lines)
│   ├── index.tsx                 # Member home (1,061 lines)
│   ├── login.tsx
│   ├── onboarding/               # Multi-step onboarding
│   ├── owner/                    # Owner role
│   ├── trainer/                  # Trainer role
│   ├── reception.tsx             # Reception (single file, 2,048 lines)
│   ├── platform.tsx              # Platform admin stub (115 lines)
│   ├── membership.tsx            # 1,278 lines
│   ├── scan.tsx                  # 1,058 lines (QR check-in)
│   ├── profile.tsx               # 895 lines
│   ├── settings.tsx              # 594 lines
│   ├── more.tsx                  # 181 lines (overflow menu)
│   ├── plans/, shop/, notifications/, tracking*, attendance/, gym/, join/, find-gyms.tsx, dashboard.tsx, assistant.tsx
│   └── ...
└── src/
    ├── components/
    │   ├── primitives/
    │   │   ├── index.tsx         # Barrel
    │   │   ├── old.tsx        # 3,712 lines — strangle in plan #11
    │   │   ├── buttons.tsx, cards.tsx, inputs.tsx, layout.tsx,
    │   │   ├── nav.tsx, feedback.tsx, bottom-nav-context.tsx,
    │   │   ├── keyboard-aware-screen.tsx, pickup-qr.tsx,
    │   │   ├── animated-appear.tsx, date-picker-field.tsx, otp-input.tsx,
    │   │   └── network-banner.tsx
    │   ├── home/cards.tsx        # Member home cards
    │   ├── membership/, profile/, skeletons/
    │   ├── toast-host.tsx, tracking.tsx, privileged-pin-modal.tsx
    │   └── expo-safe-bottom-sheet.tsx
    └── lib/
        ├── auth.tsx              # Auth provider (754 line useAuth)
        ├── api.ts, api-client.tsx, domain-api.ts
        ├── query-hooks.ts        # 1,583 lines, 50 hooks — split in plan #04
        ├── route-guards.ts       # path → required role/permission
        ├── theme.ts              # tokens; rewrite in plan #03
        ├── runtime-mode.ts, demo-mode.ts (152), demo-api.ts (849)
        ├── i18n.tsx
        └── ...
```

## How to verify a plan landed

Each plan lists screens it touches. After implementation:

1. `pnpm -w typecheck` clean
2. `pnpm -w test --filter @zook/mobile` clean
3. `pnpm --filter @zook/mobile start` boots, app loads to default route for each role
4. Manual smoke per screen listed in plan's acceptance criteria
5. `git grep` for deprecated tokens / dead imports listed in plan

If anything in the checklist fails, the plan is not done. Fix, don't paper over.
