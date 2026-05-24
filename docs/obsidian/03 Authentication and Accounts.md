# Authentication and Accounts

Zook supports OTP authentication, OAuth callbacks, session tokens, profile management, contact verification, and multi-organization account context.

## Login Methods

- Email OTP request and verification.
- Google OAuth callback.
- Apple OAuth callback.
- Session refresh and logout.

## Main Auth Routes

| API | Purpose |
| --- | --- |
| `POST /api/auth/request-otp` | Request login OTP |
| `POST /api/auth/verify-otp` | Verify OTP and create session |
| `POST /api/auth/google/callback` | Google auth callback |
| `POST /api/auth/apple/callback` | Apple auth callback |
| `POST /api/auth/logout` | End session |
| `GET/POST /api/auth/refresh` | Refresh session |
| `GET /api/auth/me` | Current session summary |

## Account Profile

Members can manage:

- Name and public/private handle.
- Email and phone.
- Profile photo.
- Locale.
- Emergency/contact data.
- Notification preferences.
- Privacy and account settings.

## Multi-Organization Context

Users can belong to multiple gyms. Session state includes active organization, roles, and permissions. Dashboard access is determined from active org permissions plus platform admin status.

## Safety Notes

- Fixed OTP is forbidden in production.
- Session cookies require secure settings outside local environments.
- Platform support impersonation is audited and feature-flagged.

