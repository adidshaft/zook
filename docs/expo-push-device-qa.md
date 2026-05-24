# Expo Push Physical-Device QA

Send one known notification through `/api/me/push-devices`, then paste the device log path and result.

| Device / State | Foreground | Background tap | Cold start |
| --- | --- | --- | --- |
| iPhone SE | [ ] Log: | [ ] Log: | [ ] Log: |
| iPhone 15 | [ ] Log: | [ ] Log: | [ ] Log: |
| Pixel 6 | [ ] Log: | [ ] Log: | [ ] Log: |
| Mid-range Android | [ ] Log: | [ ] Log: | [ ] Log: |

Expected behavior:

- Foreground: in-app handling shows the notification without exposing private payload fields.
- Background tap: opens the correct route from `notificationId` and `type`.
- Cold start: app opens, restores auth, and routes after hydration.

Evidence folder: `docs/evidence/expo-push/`.
