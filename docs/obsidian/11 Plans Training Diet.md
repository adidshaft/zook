# Plans, Training, and Diet

This module covers membership plans, workout plans, PT subscriptions, PT sessions, trainer assignments, diet plans, goals, badges, habits, and progress.

## Membership Plans

Owners/admins can manage membership plans, coupons, offers, and referrals from the dashboard.

Membership purchase math can combine plan price, coupon discount, offer discount, referral discount, and cap rules. When the final payable amount is zero, the backend completes the session internally instead of sending the member through provider checkout.

Organization SaaS plan limits are checked before new member checkout and again during payment fulfillment. If the gym is at its active member limit, the member cannot start a new paid checkout until the owner upgrades or platform adjusts the tier.

## Referral Controls

Gym referral controls live under `/dashboard/plans/referrals`.

Current capabilities:

- Enable or pause referral policy.
- Set referrer reward type and value.
- Set referred discount type and value.
- Apply discount caps.
- Set monthly referral limits.
- Set referral code expiry window.
- Allow or block trainer-created referrals.
- Allow or block staff-created referrals.
- Create, pause, and reactivate referral codes.
- Track top advocates, redemptions, pending/applied rewards, and abuse signals.

Supported reward behavior in the current backend centers on free time/visits for the referrer and discount for the referred member. Fixed INR credits and percentage discounts are represented in discount calculation paths through coupon/referral pricing, but live commercial variants should be verified against the exact policy fields before launch.

Referral checkout protections:

- No self-referral.
- No same-email referral.
- No duplicate redemption for the same organization.
- Max uses and monthly limits are enforced.
- Referral reward fulfillment is idempotent across repeated payment/webhook completion.

## Workout Plans

Trainers and authorized staff can:

- Create plans.
- Review plans.
- Publish plans.
- Assign plans to members.
- Receive member progress and feedback.

## Diet Plans

Trainers can create, list, edit, publish, archive, and delete client diet plans. Members see the latest published diet plan and can log meals.

## PT Subscriptions and Sessions

PT flows include:

- PT plan creation.
- PT subscription creation.
- PT session logging.
- Refund/clawback handling.
- Trainer payout line generation.

## Member Tracking

Members can track:

- Workouts.
- Body progress.
- Habits.
- Goals.
- Badges.
- Meal logs.

## Important APIs

- `GET/PATCH /api/orgs/:orgId/referral-policy`
- `GET/POST /api/orgs/:orgId/referrals`
- `PATCH /api/orgs/:orgId/referrals/:id`
- `POST /api/orgs/:orgId/referrals/redeem`
- `GET /api/orgs/:orgId/referral-analytics`
- `POST /api/orgs/:orgId/referral-rewards/:id/mark-paid`
- `GET/POST/PATCH/DELETE /api/orgs/:orgId/plans`
- `POST /api/orgs/:orgId/plans/:planId/publish`
- `POST /api/orgs/:orgId/plans/:planId/review`
- `POST /api/orgs/:orgId/plans/:planId/assign`
- `GET /api/me/plans`
- `POST /api/me/plans/:assignmentId/progress`
- `POST /api/me/plans/:assignmentId/complete`
- Diet plan APIs listed in [[07 Trainer Workspace]]
- `POST /api/me/diet/meal-logs`
- `GET /api/me/diet`
