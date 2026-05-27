# Zook Product Documentation

This folder is designed for Obsidian import. Start with [[00 Product Map]], then use the role and module notes as the operating manual for the product.

Last updated: 2026-05-25.

## Index

- [[00 Product Map]]
- [[01 Roles and Permissions]]
- [[02 Public Website and Acquisition]]
- [[03 Authentication and Accounts]]
- [[04 Member App]]
- [[05 Owner and Admin Dashboard]]
- [[06 Reception Desk]]
- [[07 Trainer Workspace]]
- [[08 Platform Operations]]
- [[09 Memberships Payments Invoices]]
- [[10 Attendance]]
- [[11 Plans Training Diet]]
- [[12 Notifications]]
- [[13 Shop]]
- [[14 Privacy Security Compliance]]
- [[15 AI Assistant]]
- [[16 Providers Deployment Operations]]
- [[17 Known Manual Gates]]

## Maintenance Notes

- Keep these docs aligned with code routes under `apps/web/app`, `apps/mobile/app`, and API handlers in `apps/web/src/server/api-router/core.ts`.
- Billing, referral, and dashboard behavior changes quickly; when those modules change, update [[05 Owner and Admin Dashboard]], [[08 Platform Operations]], [[09 Memberships Payments Invoices]], [[11 Plans Training Diet]], and [[17 Known Manual Gates]] in the same pass.
- Do not store secrets, API keys, customer data, private tokens, or live payment identifiers in this folder.
- Mark manual or owner-confirmed items explicitly instead of presenting them as complete.
