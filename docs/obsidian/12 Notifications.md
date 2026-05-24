# Notifications

Zook supports in-app notifications, templates, history, notification preferences, optional Expo push delivery, and platform broadcasts.

## Dashboard Features

- Compose notifications.
- Preview audience.
- Select member/all/audience segments.
- Manage templates.
- View delivery history.
- Resend/follow up where supported.

## Member Features

- Notification inbox.
- Notification detail deep links.
- Push registration on supported devices.
- Notification preferences.

## Platform Broadcasts

Platform admins can create operational broadcasts. Live fanout creates in-app notifications and attempts push delivery. Fanout is throttled between 500-recipient chunks.

## Provider State

Push can be:

- `expo`
- `mock`
- `disabled`

Expo physical-device delivery is still a manual certification gate.

## Important APIs

- `POST /api/orgs/:orgId/notifications/preview`
- `POST /api/orgs/:orgId/notifications`
- `GET /api/orgs/:orgId/notifications`
- `GET/POST/PATCH/DELETE /api/orgs/:orgId/notifications/templates`
- `GET /api/me/notifications`
- `GET/POST /api/me/push-devices`
- `GET/POST/PATCH/DELETE /api/platform/broadcasts`

