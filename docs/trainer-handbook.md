# Trainer Handbook

## What Trainers Can Do

- Open a client list sorted by who needs attention.
- See each client by adherence first: recent training dots, assigned plan, next session, and notes.
- Review AI-drafted plans before they ever reach a member.
- Assign workout, diet, and habit plans.
- Track progress across sessions, exercises, sets, reps, weight, and adherence.
- Add private trainer notes and keep member-visible plan detail separate.
- See today's sessions and clients who are slipping.
- Use notifications only where permissions allow assigned-client communication.

## Mobile Entry Points

- `/trainer` opens trainer Today.
- `/trainer?view=clients` opens the client list.
- `/trainer?view=plans` opens plan templates and assignments.
- `/trainer/client/[id]` opens a client detail.
- `/trainer/client/[id]/ai-draft` opens AI draft review.

## Feature Walkthrough

- Start with Today to see sessions happening now.
- Open Clients to sort by needs attention, expiring plan, low adherence, or upcoming session.
- Open a client detail to review the 14-day adherence grid.
- Review the AI draft card when present, edit the plan, then publish manually.
- Check tomorrow's session before the member arrives.

## Smooth UX Rules

- AI drafts never assign silently. Trainer review is mandatory.
- The client detail starts with adherence, not gym-level analytics.
- Exercise rows should show set, rep, and weight inline.
- Bottom navigation stays role-specific: Today, Clients, Plans, More.
