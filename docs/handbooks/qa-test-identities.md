# QA Test Identities

Use these in local development and staging-style QA where `OTP_FIXED_CODE_DEV=000000` is enabled.

## Fresh account

Every successful login with either identifier creates a new blank member account.

- Email: `fresh@zook.local`
- Phone: `+91 90000 11111`
- OTP: `000000`
- Expected result: a fresh user session with no memberships, orders, attendance, or saved profile history.

Fresh identities are blocked in production runtime settings. They exist to test first-run onboarding, empty states, checkout, consent, and profile setup repeatedly without cleaning the database.

## Complete demo account

Both identifiers resolve to the same seeded member account.

- Email: `member@zook.local`
- Phone: `+91 98765 43210`
- OTP: `000000`
- Expected result: the full demo journey with Aarogya Strength membership, plan, attendance, tracking, notifications, shop, and public gym flows.

Use this account for screenshots, role walkthroughs, and end-to-end smoke tests where the app should feel populated.

## Deployment note

These identities do not mean production is deployed. Production web deploys require pushing the current branch and promoting a Vercel deployment. Mobile production testing requires an EAS build or TestFlight/App Store build.
