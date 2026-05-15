# Zook Designer Handoff Brief

Last updated: 2026-05-14

## 1. What Zook Is

Zook is an India-first operating system for small and medium gyms. The product is not just a gym discovery site or a member app. It is a full operating stack for running day-to-day gym operations across owners, admins, reception staff, trainers, and members.

The core idea is simple:

- owners need a control room for revenue, attendance, memberships, staff, and operations
- front-desk staff need fast desk tools for approvals, payments, and pickup handling
- trainers need coaching workflows that keep client context together
- members need a simple mobile experience for joining, check-ins, plans, tracking, notifications, and shop pickup
- the business needs public acquisition pages that can convert visitors into verified memberships

Zook is designed around how many Indian gyms actually operate today: QR entry, UPI/manual payments, public gym profile links, trial and monthly plans, referral-led acquisition, and heavy day-to-day operational dependence on staff.

## 2. Product Positioning

The current product direction is:

- not a generic wellness app
- not a class-booking-first boutique studio tool
- not a trainer-only coaching app
- not just a billing system

It is a gym operating system with:

- a web control room for management
- a mobile execution app for members and staff
- public web surfaces for discovery and joining
- backend-authoritative flows for payments, attendance, and permissions

Tone-wise, the product should feel operational, trustworthy, modern, and premium, but never ornamental. It should feel like software people can run a real gym on.

## 3. Who The Product Serves

### Owners and Admins

Owners and admins use Zook to run the business:

- see the command dashboard
- manage memberships and plans
- handle join requests
- review attendance activity
- monitor revenue and payments
- manage staff and branches
- publish the public gym profile
- run notifications and offers
- inspect audit logs and settings

### Receptionists

Receptionists use Zook for on-floor operations:

- approve or reject flagged attendance scans
- verify member entry or pickup codes
- search members
- record desk payments like cash or direct UPI
- handle pickup orders and basic operational queues

### Trainers

Trainers use Zook for client management and coaching:

- see assigned clients
- review client context and progress
- create workout and plan content
- review AI-generated drafts before assignment
- manage PT-related workflows

The product philosophy here is important: AI assists trainers, but trainers remain in control.

### Members

Members use Zook for:

- gym discovery
- joining a gym
- managing membership
- QR check-in
- viewing plans
- logging workout/progress/habits
- receiving notifications
- ordering gym products for pickup
- managing profile, privacy, and consent-related actions

### Platform Admins

Platform admin is a hidden internal role, not a gym-facing role. It is used for:

- organization status control
- provider diagnostics
- abuse and safety review
- cross-organization oversight

## 4. Core Product Modules

### Authentication

Current auth is OTP-based and unified across web and mobile.

- email OTP login
- shared session model across web and mobile
- role-aware routing after login

### Organization and Gym Setup

Zook supports gym onboarding and organization creation.

- create a gym from the web
- create the default branch
- assign owner access
- configure join mode and visibility
- capture public business details

### Public Gym Discovery and Acquisition

This is the growth-facing side of the product.

- public gym profile pages
- public join pages
- referral and invite flows
- plan visibility
- coupon/referral support
- checkout handoff

### Memberships and Plans

Membership is a central product module.

- create and publish membership plans
- support trials, recurring-style plans, and visit packs
- handle open join, approval-required, and invite-only join modes
- support coupon and referral discounts
- activate membership only after backend confirmation

### Payments

Payments are built around both digital and real-world Indian gym behavior.

- hosted checkout handoff
- mock payment flow for local/demo environments
- manual/offline payment recording
- direct UPI, cash, and bank-transfer style operational support
- payment event persistence and auditability

The current repo is provider-ready for Razorpay-style live payments, but the product is still honest about being mock-first by default in local environments.

### Attendance

Attendance is one of the most important product surfaces.

- rolling signed QR token generation
- member QR scan
- server-side validation
- approval queue for flagged or pending cases
- manual override flow
- live QR display on web

This should feel like a trustworthy, tamper-resistant operational flow rather than a casual check-in toy.

### Trainer and PT Workflows

- trainer/client assignments
- plan creation and publishing
- client-specific review flows
- PT subscriptions
- plan assignment and progress tracking

### AI Assistance

AI exists inside the coaching workflow, not as an uncontrolled consumer chatbot.

- AI chat and drafting endpoints exist
- AI-generated plans/drafts are reviewed before assignment
- usage is tracked
- safety and quota controls exist
- backend-only architecture keeps providers off the client

### Notifications

- in-app notifications
- notification history and templates on web
- recipient fanout and read-state tracking
- mobile push plumbing exists

### Shop and Pickup

Zook includes a lightweight gym shop flow.

- products and inventory
- stock adjustments
- member ordering
- checkout connection
- pickup code creation
- desk-side order fulfillment

This is pickup-first, not a full ecommerce marketplace.

### Tracking and Progress

Members can record personal progress:

- workouts
- body-progress entries
- habits and logs
- personal history views

### Privacy, Consent, and Minor Safety

This is a meaningful part of the product, not just legal cleanup.

- guardian consent request and verification
- minor-safe gating
- data export requests
- account deletion request flows
- privacy job records

The system already enforces guardian consent before several sensitive actions such as membership activation, attendance, PT activation, and plan assignment.

### Platform Operations

Internal platform tooling already exists for:

- provider readiness checks
- organization status management
- AI usage inspection
- abuse/safety review

## 5. What Is Built Today

At a product level, Zook is already much more than a concept. The repo currently contains:

- a real Next.js web app in `apps/web`
- a real Expo mobile app in `apps/mobile`
- a live API surface hosted from the web app
- Prisma-backed domain models for auth, orgs, roles, plans, subscriptions, payments, attendance, AI, notifications, shop, privacy, and platform ops
- shared service and policy logic in `packages/core`
- provider abstractions for email, storage, maps, AI, SMS, push, and payments

Already implemented in meaningful form:

- OTP auth
- owner/admin dashboard shell
- public gym profile and join flow
- attendance QR generation and scanning flow
- join mode enforcement
- referral/coupon logic
- checkout handoff and mock payment completion
- receptionist desk workflows
- trainer role flows
- owner mobile command views
- notifications
- shop orders and pickup
- tracking
- guardian consent flows
- provider diagnostics

## 6. Current State Of Readiness

The product is beyond prototype stage, but it is not fully launch-finished across every surface.

### Strongest / Most Real Surfaces

- owner/admin web dashboard
- public gym profile and join flow
- QR attendance architecture
- checkout and payment-state architecture
- provider abstraction and backend structure
- receptionist desk and operational flows
- notification and shop foundations

### Implemented But Still Maturing

- mobile role flows and route consistency
- trainer experience depth
- physical-device push validation
- staging environment validation
- reconciliation and some operational edge-case tooling

### Intentionally Honest Limitations

- local and demo environments are still mock-first by default
- some live provider paths are supported architecturally but not fully production-validated in this workspace
- trainer web is intentionally minimal because trainer workflows are mobile-first
- some mobile surfaces have had recent route/runtime instability documented in audits

## 7. Product Experience Principles A Designer Should Understand

The design direction should be based on these truths about the product:

- this is an operational system, not a lifestyle brand app
- the product must feel premium, but the premium quality should come from clarity, calmness, and trust
- Zook should look India-native without becoming visually stereotypical
- the product should communicate authority around payments, attendance, approvals, and records
- AI should appear assistive and supervised, never magical or autonomous
- mobile should feel fast and floor-ready
- web should feel like a control room, not a generic SaaS admin template

## 8. Current Website And Frontend Surface Map

There are two important frontend tracks in the repo.

### A. `apps/web` — the real product web app

This is the actual Next.js application that contains both product surfaces and API hosting.

#### Public / marketing-adjacent pages already present

- `/` homepage
- `/gyms` discovery
- `/g/[username]` public gym profile
- `/join/[username]` join page
- `/r/[code]` referral path
- `/start-gym` owner onboarding start
- `/login` and `/verify-otp`
- `/privacy`, `/terms`, `/support`, `/status`
- guardian consent fallback pages

#### Management / operational pages already present

- `/dashboard`
- `/dashboard/attendance`
- `/dashboard/attendance/qr-display`
- `/dashboard/members`
- `/dashboard/membership-plans`
- `/dashboard/plans`
- `/dashboard/plans/coupons`
- `/dashboard/plans/offers`
- `/dashboard/plans/referrals`
- `/dashboard/payments`
- `/dashboard/payments/refunds`
- `/dashboard/notifications`
- `/dashboard/notifications/history`
- `/dashboard/notifications/templates`
- `/dashboard/reports`
- `/dashboard/shop`
- `/dashboard/shop/orders`
- `/dashboard/staff`
- `/dashboard/branches`
- `/dashboard/billing`
- `/dashboard/audit`
- `/dashboard/settings`
- `/dashboard/public-profile`
- `/dashboard/ai`

#### Staff / role-specific web surfaces already present

- `/desk` receptionist desk
- `/coach` trainer web placeholder
- `/platform/*` internal platform control

#### Checkout surfaces already present

- `/checkout/[sessionId]`
- `/checkout/mock/[sessionId]`

### B. `apps/website` — a standalone marketing/design prototype

This is a separate Vite site, not the main product app. It already contains:

- a more polished marketing homepage
- stronger visual art direction
- product showcase imagery
- proof sections for owner dashboard, mobile app, reception flows, trainer AI, attendance/payments, and public joining
- placeholder pricing and FAQ sections

This prototype is useful because it already expresses a more intentional website direction than the current `apps/web` homepage.

## 9. What The Current Website Front Already Communicates

Across `apps/web` and `apps/website`, the current website/front-end already communicates these themes well:

- Zook is for Indian gyms
- it is role-based
- it includes both web and mobile surfaces
- it handles QR attendance
- it handles payments and memberships
- it has a public gym profile and join flow
- it includes operational views for reception and owners
- AI exists as a trainer-assist feature, not a gimmick

## 10. What The Current Website Front Is Missing Or Still Undersells

From a design and storytelling perspective, the current front-end still undersells a few things:

- the product is broader than the homepage message in `apps/web`
- the owner dashboard is stronger than the current public marketing narrative suggests
- receptionist workflows are a real differentiator and should be shown more clearly
- membership, payments, attendance, and public acquisition are deeply connected, and that system-level story could be clearer
- privacy, consent, and operational trust are meaningful product strengths but are not yet central in the public-facing narrative
- platform/admin oversight exists, which reinforces seriousness and trust, but should be presented carefully

## 11. Suggested Information Architecture For A Designer

If a designer is redesigning the website, the primary public narrative should likely be organized around:

1. Hero: Zook as the operating system for Indian gyms
2. Product model: web control room + mobile execution app
3. Role-based value:
   - owner/admin
   - reception
   - trainer
   - member
4. Core systems:
   - memberships and joining
   - QR attendance
   - payments and desk operations
   - trainer workflows and AI review
   - notifications, shop, and daily operations
5. Public growth surfaces:
   - gym profile
   - join flow
   - referrals and offers
6. Trust layer:
   - audit logs
   - approval flows
   - privacy and guardian consent
   - backend-authoritative activation and attendance
7. CTA paths:
   - start your gym
   - book a demo
   - view product

## 12. Screens And Flows A Designer Should Cover

At minimum, the design system and website exploration should account for these surfaces:

- homepage / hero
- product overview
- owner dashboard showcase
- receptionist desk showcase
- trainer workflow showcase
- member mobile showcase
- public gym profile
- join / checkout flow
- attendance QR flow
- payments / manual desk payment story
- notifications / operations story
- shop and pickup story
- trust / audit / privacy story
- start-gym onboarding flow

## 13. Recommended Tone For The Website

The website should feel:

- modern
- premium
- operational
- trustworthy
- sharp and calm
- India-aware

It should not feel:

- overly playful
- generic global SaaS
- bodybuilding-tacky
- crypto-fintech
- wellness-soft

The strongest reference posture is “serious product for real gym operations,” not “fitness lifestyle brand.”

## 14. Short Summary For A Designer

Zook is a multi-surface gym operating system for India. It combines a web control room for owners/admins, mobile execution flows for members and staff, public acquisition pages for gym discovery and joining, and backend-authoritative systems for attendance, payments, plans, notifications, shop pickup, privacy, and platform oversight. The product already has meaningful depth, especially on owner/admin web, public gym/join flows, receptionist operations, and the overall domain model. The design challenge is not inventing a concept from scratch. It is expressing an already rich product clearly, confidently, and beautifully across marketing, public acquisition, and operational product surfaces.
