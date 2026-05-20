# Plan 08 — Shared Domain Components

## Goal

Extract the components that appear in multiple roles into a single canonical implementation: `MemberList`, `ApprovalQueue`, `MetricGrid`, `MetricTile`, `AttentionCard`. Refactor Reception, Owner, and Trainer to use these.

## Why

After plans #05, #06, #07 land, the same UI exists three times:
- **Member list** (search + filter pills + status chip + phone reveal) → Reception members, Owner members, Trainer clients
- **Approval queue** (pending action cards with approve/reject) → Reception desk, Owner approvals
- **Metric grid** (a row of stat tiles at the top of every dashboard) → Owner command, Trainer home, Reception desk header

Each role currently has its own slightly-different copy. That's the structural source of "UI inconsistency."

## Prerequisites

- Plans #05, #06, #07 must be merged (so we have three call sites to consolidate).
- Plan #03 (theme) merged.

## Architectural target

```
apps/mobile/src/components/domain/
├── member-list/
│   ├── index.tsx              — <MemberList items=... onPress=... />
│   ├── filters.tsx            — search bar + filter pills
│   ├── row.tsx                — single member row
│   ├── types.ts               — MemberRowItem, Filter, etc.
│   └── empty-state.tsx
├── approval-queue/
│   ├── index.tsx
│   ├── card.tsx               — single approval card
│   └── types.ts
├── metric-grid/
│   ├── index.tsx
│   ├── tile.tsx
│   └── types.ts
└── attention/
    ├── index.tsx              — AttentionCard
    └── item.tsx               — AttentionItem
```

## Member list contract

```ts
// apps/mobile/src/components/domain/member-list/types.ts
export type MemberRowItem = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  status: "active" | "expiring" | "expired" | "pending";
  badges?: Array<{ label: string; tone: "neutral" | "lime" | "amber" | "danger" }>;
  meta?: string;                         // free text under name (e.g., "Member since 2024")
};

export type MemberListFilter =
  | { kind: "all" }
  | { kind: "status"; status: MemberRowItem["status"] }
  | { kind: "tag"; tag: string };

export type MemberListProps = {
  items: MemberRowItem[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  onPressMember: (member: MemberRowItem) => void;
  onRevealPhone?: (member: MemberRowItem) => void;  // optional — controls phone reveal feature
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  filter?: MemberListFilter;
  onFilterChange?: (filter: MemberListFilter) => void;
  availableFilters?: MemberListFilter[];
  emptyState?: { title: string; subtitle?: string };
  testID?: string;
};
```

Notes:
- All callers pass already-normalized data. The component does not fetch.
- Phone reveal is opt-in via `onRevealPhone`. If absent, no reveal UI renders.
- Filters are role-defined: Owner shows "all/active/expiring/expired"; Reception shows "all/checking-in/no-show"; Trainer shows "all/clients/leads".

## Approval queue contract

```ts
// apps/mobile/src/components/domain/approval-queue/types.ts
export type ApprovalItem = {
  id: string;
  primaryText: string;           // e.g., member name
  secondaryText?: string;        // e.g., "wants to check in at Branch A"
  metaText?: string;             // e.g., "2 min ago"
  reason?: string;               // why this needs approval (rendered in audit trail)
  avatarUrl?: string | null;
  context?: ReactNode;           // optional escape hatch for one-off content
};

export type ApprovalQueueProps = {
  items: ApprovalItem[];
  isLoading?: boolean;
  isError?: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  approvingId?: string;          // disables that row's approve button while mutating
  rejectingId?: string;
  emptyState?: { title: string; subtitle?: string };
  testID?: string;
};
```

## Metric grid contract

```ts
// apps/mobile/src/components/domain/metric-grid/types.ts
export type MetricTileItem = {
  label: string;
  value: string | number;        // pre-formatted; use formatCompactNumber/formatInr at caller
  delta?: { value: string; tone: "up" | "down" | "neutral" };
  hint?: string;
  icon?: IoniconName;            // optional
  tone?: "neutral" | "lime" | "amber" | "danger";
};

export type MetricGridProps = {
  items: MetricTileItem[];
  columns?: 2 | 3 | 4;            // default 2 on phones
  testID?: string;
};
```

## Attention card contract

```ts
// apps/mobile/src/components/domain/attention/types.ts
export type AttentionItem = {
  id: string;
  icon: IoniconName;
  title: string;
  subtitle?: string;
  tone: "neutral" | "lime" | "amber" | "danger";
  cta?: { label: string; onPress: () => void };
};

export type AttentionCardProps = {
  title?: string;                 // section header
  items: AttentionItem[];
  emptyState?: { title: string; subtitle?: string };
};
```

## Execution steps

### Step 1 — Implement components

Build each component per the contracts above. Each component:
- Uses `useTheme()` palette (not static `colors`).
- Uses `spacing`, `radii`, `typography` from `@/lib/theme` static tokens.
- Has accessibility labels on interactive elements.
- Has skeleton loading state.
- Has error state with retry.
- Has empty state.

### Step 2 — Migrate Reception

Replace local components in `apps/mobile/src/features/reception/components/`:

- `member-row.tsx` (and the members screen) → `MemberList` from `@/components/domain/member-list`
- `desk-queue-card.tsx` → `ApprovalQueue` from `@/components/domain/approval-queue`
- The desk header metrics block → `MetricGrid`

Update `apps/mobile/app/reception/members.tsx`:

```tsx
import { MemberList } from "@/components/domain/member-list";
import { useReceptionMembers } from "@/lib/domains/reception";

export default function ReceptionMembersScreen() {
  const query = useReceptionMembers();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<MemberListFilter>({ kind: "all" });

  const items: MemberRowItem[] = useMemo(
    () => (query.data?.members ?? []).map(toMemberRowItem),
    [query.data],
  );

  return (
    <ZookScreen>
      <MemberList
        items={items}
        isLoading={query.isLoading}
        onPressMember={(m) => router.push(`/reception/members/${m.id}` as never)}
        searchValue={search}
        onSearchChange={setSearch}
        filter={filter}
        onFilterChange={setFilter}
        availableFilters={[{ kind: "all" }, /* etc */]}
        testID="reception-member-list"
      />
    </ZookScreen>
  );
}
```

Add `toMemberRowItem` mapper to `apps/mobile/src/features/reception/helpers.ts`.

### Step 3 — Migrate Owner

In `apps/mobile/app/owner/members.tsx`: replace local components with `MemberList`.
In `apps/mobile/app/owner/approvals.tsx`: replace with `ApprovalQueue`.
In `apps/mobile/app/owner/index.tsx` (Command): replace local `CommandMetrics` with `MetricGrid`.

Delete the local `apps/mobile/src/features/owner/components/{member-row,approval-card,command-metrics}.tsx` files.

### Step 4 — Migrate Trainer

In `apps/mobile/app/trainer/clients/index.tsx`: replace with `MemberList` (clients are members).
In `apps/mobile/app/trainer/index.tsx` (Home): replace local `HomeMetrics` with `MetricGrid`.

Delete `apps/mobile/src/features/trainer/components/{client-row,home-metrics}.tsx`.

### Step 5 — Make AttentionCard the canonical attention component

Owner Command and Trainer Home both render an "attention" list (things needing the user's notice). Use `AttentionCard` from `@/components/domain/attention` for both. Delete the local copies in `features/owner/` and `features/trainer/`.

### Step 6 — Stories / fixtures

Add stories to `apps/mobile/src/components/primitives/mobile-ux-primitives.stories.tsx` (or a new `domain.stories.tsx`) for each shared component with examples in:
- Loading state
- Error state
- Empty state
- Populated state (small and large)
- Each tone variant

These stories double as visual regression coverage.

### Step 7 — Type alignment

If the API shapes returned by `domains/owner`, `domains/reception`, `domains/trainer` differ (they do — same data, different field names from server), each role's screen file converts to the shared `MemberRowItem` via a mapper function in `features/<role>/helpers.ts`.

**Do not** push canonical shapes back into the API layer. The transport returns whatever the server returns; we adapt at the screen boundary.

## UI fixes shipped with this plan

- Visual consistency: identical member rows everywhere
- Identical approval card UI for receptionist and owner — currently they look subtly different
- Identical metric tile look across all dashboards — currently each role has slight variations
- One place to fix bugs in these patterns (e.g., a long-name truncation issue gets fixed once, not three times)
- Better empty/loading/error states everywhere they appear

## Files created

- `apps/mobile/src/components/domain/member-list/{index,filters,row,types,empty-state}.tsx`
- `apps/mobile/src/components/domain/approval-queue/{index,card,types}.tsx`
- `apps/mobile/src/components/domain/metric-grid/{index,tile,types}.tsx`
- `apps/mobile/src/components/domain/attention/{index,item,types}.tsx`

## Files modified

- `apps/mobile/app/reception/members.tsx`
- `apps/mobile/app/reception/index.tsx` (Desk uses ApprovalQueue + MetricGrid)
- `apps/mobile/app/owner/members.tsx`
- `apps/mobile/app/owner/approvals.tsx`
- `apps/mobile/app/owner/index.tsx`
- `apps/mobile/app/trainer/clients/index.tsx`
- `apps/mobile/app/trainer/index.tsx`
- `apps/mobile/src/features/<role>/helpers.ts` (add mappers)
- Stories file

## Files deleted

- `apps/mobile/src/features/reception/components/{member-row,desk-queue-card}.tsx`
- `apps/mobile/src/features/owner/components/{member-row,approval-card,command-metrics,attention-card}.tsx`
- `apps/mobile/src/features/trainer/components/{client-row,home-metrics}.tsx`

## Acceptance criteria

- [ ] All four `domain/` components exist with stories covering loading/error/empty/populated states.
- [ ] Reception, Owner, and Trainer all use these components (no local copies remain).
- [ ] `git grep "MemberRow\|ApprovalCard\|MetricTile" apps/mobile/src/features` returns nothing.
- [ ] Visual smoke: open Reception members → looks identical row-for-row to Owner members (modulo filter pills and avatar URLs).
- [ ] Tap on a member in any role goes to that role's correct detail screen.
- [ ] Phone reveal works on Reception members (where the feature exists) and is absent on others.
- [ ] `pnpm -w typecheck` clean.
- [ ] `pnpm -w test --filter @zook/mobile` clean.

## What this plan does NOT do

- Does not change data fetching — purely component-layer.
- Does not redesign the components — they look like the current Reception versions (the most polished of the three), pulled into one place.
- Does not extract other shared patterns (sheets, forms, headers) — those are touched in plans #10/#11 if needed.
