# Minors And Consent

Last updated: 24 May 2026

Deprecated by Phase 1 of `docs/PRODUCTION_HARDENING_PLAN_2026_05_24.md`.

Zook no longer requires guardian consent before membership purchase, membership activation,
attendance, plan assignment, AI personalization, notification delivery, or personal training.
Members with under-18 dates of birth follow the same runtime flows as other members.

The historical `GuardianConsent` and `GuardianConsentChallenge` tables are retained so existing
records remain available for audit, export, deletion, and incident investigation. The legacy
guardian endpoints and web routes stay in place temporarily with deprecation responses or home
redirects; they must not create new challenges or block product access.
