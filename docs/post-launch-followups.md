# Post-Launch Followups

- Add OpenTelemetry tracing across API requests once the closed pilot stabilizes.
- Add ingress image resizing after the storage provider is certified to reduce mobile upload latency.
- Add Marathi, Tamil, and Bengali mobile catalogues after Hindi usage is measured.
- Add multi-currency beyond INR after the first non-India tenant is signed.
- Add PDF and scheduled email report exports after CSV export rate limits are monitored.
- Consolidate trainer-client assignment guards with the trainer-member messaging capability so all future client resource routes share one guard.
- Add a higher-tier CAPTCHA/API-key layer for public org search if abuse-scale enumeration appears despite current rate limits.
- Add re-OTP confirmation for manual payments above the daily safety threshold once a dedicated confirmation surface exists.
- Add password-change sibling session revocation at the route level if password authentication is introduced.
- Certify guardian-consent email click-through in staging after the Resend daily quota resets or the limit is raised.
- Complete Razorpay, storage, OpenAI, Expo push, Sentry, Upstash, and Resend manual provider certification with real staging credentials.
- Run physical-device accessibility, push, QR scanner, and crash-free QA on release builds.
