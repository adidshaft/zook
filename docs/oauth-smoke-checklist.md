# OAuth Real-Device Smoke

Use staging unless the release captain explicitly approves production.

| Surface | Expected behavior | Screenshot path | Done |
| --- | --- | --- | --- |
| Google on Chrome web | Login completes, dashboard opens, session survives refresh. | `docs/evidence/oauth/google-chrome-web.png` | [ ] |
| Google on iOS Safari | Login completes, app-safe redirect opens web dashboard. | `docs/evidence/oauth/google-ios-safari.png` | [ ] |
| Google in iOS app | Native flow returns to app and member home loads. | `docs/evidence/oauth/google-ios-app.png` | [ ] |
| Google in Android app | Native flow returns to app and member home loads. | `docs/evidence/oauth/google-android-app.png` | [ ] |
| Apple on iOS Safari | Apple login returns to the expected web route. | `docs/evidence/oauth/apple-ios-safari.png` | [ ] |
| Apple in iOS app | Apple login returns to app with no duplicate account. | `docs/evidence/oauth/apple-ios-app.png` | [ ] |

Record the tested build, device OS, and account email in the PR or release note.
