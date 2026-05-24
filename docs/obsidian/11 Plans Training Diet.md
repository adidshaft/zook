# Plans, Training, and Diet

This module covers membership plans, workout plans, PT subscriptions, PT sessions, trainer assignments, diet plans, goals, badges, habits, and progress.

## Membership Plans

Owners/admins can manage membership plans, coupons, offers, and referrals from the dashboard.

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

