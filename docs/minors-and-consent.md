# Minors And Consent

Last updated: 24 April 2026

## Phase 4 Rules

- minor accounts require guardian consent before membership purchase
- guardian state remains visible in web/mobile session summaries
- AI and marketing stay restricted for minors until consent and safety checks allow them
- promotional messaging stays off by default for minors

## Phase 5 Additions

- guardian emails now link to a public fallback route at `/guardian/consent/[challengeId]`
- guardian consent can be reviewed, verified, and resent from the web fallback route without requiring a minor session
- issuing a fresh guardian challenge supersedes older pending challenges instead of leaving multiple live pending OTPs
- membership activation now re-checks minor consent at payment-activation time, not only at checkout creation time
- attendance scan and manual attendance override now block minors while guardian consent is still pending
- plan assignment and PT subscription activation now block minors while guardian consent is still pending

## Guardian Consent Endpoints

- `GET /api/me/guardian-consent`
- `POST /api/me/guardian-consent/request`
- `POST /api/me/guardian-consent/resend`
- `POST /api/me/guardian-consent/verify`
- `GET /api/guardian-consent/:challengeId`
- `POST /api/guardian-consent/:challengeId/verify`
- `POST /api/guardian-consent/:challengeId/resend`

## Current Flow

1. minor account requests guardian consent
2. guardian OTP challenge is created and emailed
3. challenge is stored in `GuardianConsentChallenge`
4. successful verification marks consent granted and clears `user.guardianPending`
5. consent state is written to `ConsentRecord` and audit logs

## Data Stored

- guardian name
- guardian email
- guardian phone optional
- relationship
- challenge status and expiry
- consent timestamps

## Privacy And Safety Notes

- guardian OTPs are stored as hashes
- consent links and OTPs are server-issued only
- staff can see consent state but do not silently bypass it
- minors remain excluded from promotional messaging and broad engagement by default

## Known Limitations

- the public guardian page is now functional, but still intentionally simple and optimized for pilot clarity over full branded polish
- more granular feature-gate UI for trainer-visible tracking and broader dashboard/admin warnings remains future work
- export and deletion flows remain job-backed pilot operations rather than background-worker production pipelines
