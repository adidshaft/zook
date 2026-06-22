# B2 Status Enum Rollout Plan

Last updated: 18 June 2026

## Goal

Replace free-string status and severity fields with Prisma/Postgres enums for the Product Plan Part
B item `B2`.

This is intentionally a rollout proposal only. It does not mutate `schema.prisma` or apply a
migration because status casts can fail on existing production data and can silently change business
behavior if current values are broader than the intended enum.

## Current free-string targets

The current schema still has these status-like string fields:

| Model | Field | Current default | Proposed enum |
| --- | --- | --- | --- |
| `OrganizationUser` | `status` | `"active"` | `OrganizationUserStatus` |
| `DataExportRequest` | `status` | `"requested"` | `DataExportRequestStatus` |
| `AccountDeletionRequest` | `status` | `"requested"` | `AccountDeletionRequestStatus` |
| `MembershipJoinRequest` | `status` | `"pending"` | `MembershipJoinRequestStatus` |
| `PaymentRefund` | `status` | `"REQUESTED"` | `PaymentRefundStatus` |
| `ReferralCode` | `status` | `"active"` | `ReferralCodeStatus` |
| `ReferralReward` | `status` | `"pending"` | `ReferralRewardStatus` |
| `OrgReferralPartnership` | `status` | `"active"` | `OrgReferralPartnershipStatus` |
| `TrainerCommission` | `status` | `"pending"` | `TrainerCommissionStatus` |
| `TrainerPayout` | `status` | `"pending"` | `TrainerPayoutStatus` |
| `Class` | `status` | `"scheduled"` | `ClassStatus` |
| `ClassEnrollment` | `status` | `"confirmed"` | `ClassEnrollmentStatus` |
| `OrganizationAbuseFlag` | `severity` | none | `OrganizationAbuseFlagSeverity` |
| `OrganizationAbuseFlag` | `status` | `"open"` | `OrganizationAbuseFlagStatus` |
| `WhatsAppDevice` | `status` | `"ACTIVE"` | `WhatsAppDeviceStatus` |

The plan also calls out `ReferralCode`, `ReferralReward`, and abuse-flag severity because these
fields drive fraud and staff workflows where typo states are especially risky.

## Proposed enum values

Use uppercase enum constants in Prisma and map lowercase legacy strings where needed.

```prisma
enum OrganizationUserStatus {
  ACTIVE
  INACTIVE
  SUSPENDED
}

enum DataExportRequestStatus {
  REQUESTED
  PROCESSING
  READY
  FAILED
  CANCELLED
}

enum AccountDeletionRequestStatus {
  REQUESTED
  PROCESSING
  SCHEDULED
  COMPLETED
  FAILED
  CANCELLED
}

enum MembershipJoinRequestStatus {
  PENDING
  APPROVED
  REJECTED
  CANCELLED
}

enum PaymentRefundStatus {
  REQUESTED
  PROCESSING
  SUCCEEDED
  FAILED
  CANCELLED
}

enum ReferralCodeStatus {
  ACTIVE
  PAUSED
  EXPIRED
  REVOKED
}

enum ReferralRewardStatus {
  PENDING
  APPLIED
  PAID
  EXPIRED
  CANCELLED
}

enum OrgReferralPartnershipStatus {
  ACTIVE
  INACTIVE
  PAUSED
  ENDED
}

enum TrainerCommissionStatus {
  PENDING
  APPROVED
  PAID
  CANCELLED
}

enum TrainerPayoutStatus {
  PENDING
  PROCESSING
  PAID
  FAILED
  CANCELLED
}

enum ClassStatus {
  SCHEDULED
  CANCELLED
  COMPLETED
}

enum ClassEnrollmentStatus {
  CONFIRMED
  WAITLISTED
  CANCELLED
  ATTENDED
  NO_SHOW
}

enum OrganizationAbuseFlagSeverity {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

enum OrganizationAbuseFlagStatus {
  OPEN
  REVIEWING
  RESOLVED
  DISMISSED
}

enum WhatsAppDeviceStatus {
  ACTIVE
  INACTIVE
  REVOKED
}
```

## Preflight value audit

Run this on a staging clone or disposable production snapshot before creating enum types:

```sh
pnpm db:b2:sql value-audit
pnpm db:b2:sql invalid-value-audit
```

The helper emits the full audit query:

```sql
SELECT 'OrganizationUser.status' AS field, "status" AS value, COUNT(*) FROM "OrganizationUser" GROUP BY "status"
UNION ALL
SELECT 'DataExportRequest.status', "status", COUNT(*) FROM "DataExportRequest" GROUP BY "status"
UNION ALL
SELECT 'AccountDeletionRequest.status', "status", COUNT(*) FROM "AccountDeletionRequest" GROUP BY "status"
UNION ALL
SELECT 'MembershipJoinRequest.status', "status", COUNT(*) FROM "MembershipJoinRequest" GROUP BY "status"
UNION ALL
SELECT 'PaymentRefund.status', "status", COUNT(*) FROM "PaymentRefund" GROUP BY "status"
UNION ALL
SELECT 'ReferralCode.status', "status", COUNT(*) FROM "ReferralCode" GROUP BY "status"
UNION ALL
SELECT 'ReferralReward.status', "status", COUNT(*) FROM "ReferralReward" GROUP BY "status"
UNION ALL
SELECT 'OrgReferralPartnership.status', "status", COUNT(*) FROM "OrgReferralPartnership" GROUP BY "status"
UNION ALL
SELECT 'TrainerCommission.status', "status", COUNT(*) FROM "TrainerCommission" GROUP BY "status"
UNION ALL
SELECT 'TrainerPayout.status', "status", COUNT(*) FROM "TrainerPayout" GROUP BY "status"
UNION ALL
SELECT 'Class.status', "status", COUNT(*) FROM "Class" GROUP BY "status"
UNION ALL
SELECT 'ClassEnrollment.status', "status", COUNT(*) FROM "ClassEnrollment" GROUP BY "status"
UNION ALL
SELECT 'OrganizationAbuseFlag.severity', "severity", COUNT(*) FROM "OrganizationAbuseFlag" GROUP BY "severity"
UNION ALL
SELECT 'OrganizationAbuseFlag.status', "status", COUNT(*) FROM "OrganizationAbuseFlag" GROUP BY "status"
UNION ALL
SELECT 'WhatsAppDevice.status', "status", COUNT(*) FROM "WhatsAppDevice" GROUP BY "status"
ORDER BY field, value;
```

If any value is not represented in the proposed enums, stop and choose one of:

- add the value to the enum if product confirms it is real state
- backfill it to a canonical value on staging
- defer that field to a later migration

## Staging dry-run migration shape

Do this in phases, not as one giant production migration.

### Phase 1: create enum types

Generate the proposed type creation SQL:

```sh
pnpm db:b2:sql create-types-staging-only
```

Example for one field:

```sql
CREATE TYPE "PaymentRefundStatusNew" AS ENUM (
  'REQUESTED',
  'PROCESSING',
  'SUCCEEDED',
  'FAILED',
  'CANCELLED'
);
```

Repeat for each target enum after the value audit is clean.

### Phase 2: cast with explicit normalization

Generate the proposed column cast SQL:

```sh
pnpm db:b2:sql cast-columns-staging-only
```

Example for lowercase legacy fields:

```sql
ALTER TABLE "MembershipJoinRequest"
ALTER COLUMN "status" DROP DEFAULT,
ALTER COLUMN "status" TYPE "MembershipJoinRequestStatusNew"
USING UPPER("status")::"MembershipJoinRequestStatusNew",
ALTER COLUMN "status" SET DEFAULT 'PENDING';
```

Example for an already-uppercase field:

```sql
ALTER TABLE "PaymentRefund"
ALTER COLUMN "status" DROP DEFAULT,
ALTER COLUMN "status" TYPE "PaymentRefundStatusNew"
USING "status"::"PaymentRefundStatusNew",
ALTER COLUMN "status" SET DEFAULT 'REQUESTED';
```

### Phase 3: update Prisma schema

Once staging casts succeed, update `schema.prisma` to use the final enum names and regenerate the
client. The generated migration should be reviewed against the hand-written dry-run SQL before it is
applied anywhere else.

## Application compatibility audit

Before production rollout, search and update string comparisons in app code:

```sh
rg -n "\"(pending|active|requested|scheduled|confirmed|open|paid|failed|cancelled|completed|approved|rejected)\"|\\.status" apps packages
```

Pay special attention to:

- lowercase comparisons in API routes
- mobile DTOs that currently expect lowercase strings
- report/read-model filters that pass status literals into Prisma
- acceptance tests that seed status strings directly

If public/mobile API responses must remain lowercase for compatibility, convert enum values at the
API boundary instead of leaking a database enum casing change to clients.

## Validation after staging cast

Run these after the staging migration:

```sql
SELECT table_name, column_name, udt_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'OrganizationUser',
    'DataExportRequest',
    'AccountDeletionRequest',
    'MembershipJoinRequest',
    'PaymentRefund',
    'ReferralCode',
    'ReferralReward',
    'TrainerCommission',
    'TrainerPayout',
    'Class',
    'ClassEnrollment',
    'OrganizationAbuseFlag'
  )
  AND column_name IN ('status', 'severity')
ORDER BY table_name, column_name;
```

Then run smoke flows:

- member join request approval/rejection
- refund request, success, and failure paths
- referral code redemption and reward payout
- trainer commission and payout marking
- class creation, cancellation, enrollment, and cancellation
- privacy export/delete request lifecycle
- abuse-flag creation and resolution
- WhatsApp opt-in and opt-out device lifecycle

## Rollback

If a staged enum cast breaks behavior, convert the affected column back to `text` before dropping the
new enum type:

```sql
ALTER TABLE "PaymentRefund"
ALTER COLUMN "status" DROP DEFAULT,
ALTER COLUMN "status" TYPE text
USING "status"::text,
ALTER COLUMN "status" SET DEFAULT 'REQUESTED';

DROP TYPE IF EXISTS "PaymentRefundStatusNew";
```

Rollback should be rehearsed on staging because enum types cannot be dropped while any column still
depends on them.

## Production rollout checklist

- staging value audit is attached and contains only approved enum values
- staging cast succeeds for one phase at a time
- Prisma client is regenerated after schema update
- web gates pass: `pnpm --filter @zook/web typecheck`, `lint`, and `test`
- root typecheck passes if `packages/db` generated types changed
- mobile DTO compatibility is verified if response casing changes
- rollback SQL was tested on staging
- `pnpm db:b2:sql invalid-value-audit` returns zero rows on the staging snapshot

## Out of scope in this proposal

- RBAC uniqueness changes from `B1`
- invoice-column collapse from `B3`
- branch-scope model changes from `B4`
- retention/partitioning work from `B6`
