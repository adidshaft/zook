# Minors And Consent

Last updated: 24 April 2026

## Phase 4 Rules

- minor accounts require guardian consent before membership purchase
- guardian state remains visible in web/mobile session summaries
- AI and marketing stay restricted for minors until consent and safety checks allow them
- promotional messaging stays off by default for minors

## Guardian Consent Endpoints

- `GET /api/me/guardian-consent`
- `POST /api/me/guardian-consent/request`
- `POST /api/me/guardian-consent/resend`
- `POST /api/me/guardian-consent/verify`

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

- the web guardian fallback page is still minimal
- more granular feature-gate UI for trainer-visible tracking and plan assignment remains future work
