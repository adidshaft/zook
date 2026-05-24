# Privacy, Security, and Compliance

Zook includes privacy request tracking, audit logs, session controls, provider redaction, secure file access, and operational guardrails.

## Privacy Features

- Data export request.
- Account deletion request and purge job.
- Consent records.
- Notification preferences.
- Profile privacy settings.

## Security Controls

- Hashed session tokens.
- Secure session cookies outside local environments.
- Role and permission checks.
- Platform admin separation.
- Audit logging for high-risk actions.
- Provider diagnostics with secret redaction.
- File access checks and signed URLs.
- Rate limits for sensitive flows.

## Account Deletion

Queued deletion jobs are processed by `/api/cron/account-deletion-purge`.

## Audit Log

Audit logs capture important actions including payments, refunds, attendance decisions, staff changes, platform operations, feature flag changes, and privacy actions.

## Manual Compliance Items

- SaaS invoice legal address must be finalized.
- Supabase paid backup/PITR posture is skipped until approved.
- Store metadata and DLT template approvals remain external/manual.

