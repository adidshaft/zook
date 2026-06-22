# Zook QA Identities - Designer Reference

Use this sheet when designing product flows, demo scripts, mocks, annotations, and stakeholder walkthroughs for the current Zook app.

## Purpose

This file summarizes the seeded identities, gyms, and core test flows that exist in the product today so design work can stay aligned with real demoable states.

## Seeded Accounts

| Role | Login | Phone | OTP | Primary surfaces | What this user can demonstrate |
| --- | --- | --- | --- | --- | --- |
| Owner | `owner@zook.local` | - | `000000` | Web `/dashboard`, mobile `/owner` | Command board, billing, reports, audit, notifications |
| Admin | `admin@zook.local` | - | `000000` | Web `/dashboard`, mobile `/owner` | Operational dashboard without owner-only assumptions |
| Reception | `reception@zook.local` | - | `000000` | Web `/desk`, mobile `/reception` | Check-ins, member lookup, payments, pickup fulfillment |
| Trainer | `trainer@zook.local` | - | `000000` | Web `/coach`, mobile `/trainer` | Client roster, plans, notes, AI draft review |
| Member | `member@zook.local` | `+91 98765 43210` | `000000` | Web `/me`, mobile member tabs | Membership, attendance, plans, progress, shop |
| Minor Member | `minor@zook.local` | - | `000000` | Member join / consent flow | Guardian consent and blocked state |
| Platform | `platform@zook.local` | - | `000000` | Web `/platform` | Provider status, subscriptions, cross-gym controls |

## Fresh Account

Use this identity when design work needs blank states or first-run experiences:

- Email: `fresh@zook.local`
- Phone: `+91 90000 11111`
- OTP: `000000`

This account is intended for onboarding, empty states, consent, profile setup, and first-session flows.

## Demo Gyms

| Handle | Name | Typical use |
| --- | --- | --- |
| `aarogya-strength` | Aarogya Strength | Primary demo gym used across most role flows |
| `iron-house` | Iron House | Multi-org isolation and alternate gym checks |
| `peaklab` | Peak Lab | Edge-case and tertiary scenarios |

## Recommended Product Flow Coverage

### Member

- Login
- Home dashboard
- Scan / check-in
- Plans
- Progress / tracking
- Shop
- Pickup code

### Reception

- Front desk queue
- Member search and selection
- Manual verification
- Payment recording
- Pickup / order fulfillment

### Trainer

- Today dashboard
- Client roster
- Open client detail
- Review AI draft
- Edit and publish plan

### Owner / Admin

- Command board
- Members / attendance / payments
- Billing and reports
- Notifications
- Audit / operations visibility

### Platform

- Provider health
- Subscription controls
- Cross-gym diagnostics

## Product Notes For Design

- OTP `000000` is only for local and staging QA. It is not a production login pattern.
- The strongest end-to-end demo gym is `Aarogya Strength`.
- Member and reception flows are the easiest to show as evidence because they expose visible state transitions like approval, payment, and pickup.
- Trainer and owner flows are better for workflow mapping, decision points, and role-specific navigation.
- If a design deliverable needs "what exists in product today," prefer seeded-account flows over speculative or future-state flows.

## Suggested Annotation Language

Use these labels when preparing design boards or product walkthroughs:

- `Current product state`
- `Seeded QA identity`
- `Visible in app today`
- `Role-gated surface`
- `Operational workflow`
- `Manual desk action`
- `Member-facing state`
- `Web handoff`

## Source

This reference is derived from:

- `/Users/amanpandey/projects/zook/docs/handbooks/qa-test-identities.md`
- `/Users/amanpandey/projects/zook/README.md`
- `/Users/amanpandey/projects/zook/docs/end-to-end-demo-check-script.md`
