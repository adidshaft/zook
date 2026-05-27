# Public Website and Acquisition

The public surface helps members discover gyms, inspect public profiles, join plans, and redeem referrals.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Public landing page |
| `/gyms` | Public gym discovery |
| `/g/[username]` | Public gym profile |
| `/in/[username]` | Alternate gym entry route |
| `/join/[username]` | Public join flow |
| `/r/[code]` | Referral landing |
| `/start-gym` | Gym owner onboarding |
| `/privacy`, `/terms`, `/support`, `/status` | Public trust and support pages |

## Gym Profiles

Gym profiles expose public information such as:

- Name, city, state, address.
- Public membership plans and offers.
- Branding and profile assets.
- Operating information.
- Join mode and referral entry points.

## Join Modes

Join behavior is controlled by backend gym settings. Query parameters should not override backend join mode.

Common modes:

- Public/open joining.
- Approval-required joining.
- Invite/referral assisted joining.

## Referrals

Referral routes and APIs support:

- Public referral lookup.
- Referral code redemption.
- Gym-to-gym and member/staff referral programs.
- Reward tracking and platform visibility.

## Owner Onboarding

`/start-gym` creates an organization, starts the SaaS trial flow, and sends the owner into dashboard setup. Production owner/admin writes require billing profile and SaaS mandate setup from `/dashboard/billing`.
