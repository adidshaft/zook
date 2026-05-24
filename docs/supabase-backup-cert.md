# Supabase Backup Certification

Complete in the Supabase dashboard for the production project.

## Backup Posture

- [ ] Daily backups are enabled for the project plan.
- [ ] Latest backup timestamp is within the last 24 hours.
- [ ] Restore target and owner are documented.
- [ ] PITR decision recorded:
  - [ ] Enabled, or
  - [ ] Not available on current plan and upgrade decision logged.

## Key Audit

- [ ] `SUPABASE_SERVICE_ROLE_KEY` exists only in server/deployment secrets.
- [ ] No `NEXT_PUBLIC_` service-role key is configured.
- [ ] Storage bucket access reviewed for profile photos, payment proofs, product images, and exports.
- [ ] Evidence screenshots saved under `docs/evidence/supabase-backups/`.
