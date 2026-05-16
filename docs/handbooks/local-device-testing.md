# 📱 Testing on Local Device

> A practical guide for running and testing the full Zook stack: backend/API, web dashboard, iOS, Android, and Expo.

---

## 📋 Prerequisites

| Requirement        | Version / Notes                                                  |
| ------------------ | ---------------------------------------------------------------- |
| **Node.js**        | 22+; repo is currently tested on Node 24                         |
| **pnpm**           | 10.16.0                                                          |
| **Docker Desktop** | Running — needed for the local Postgres container                |
| **Expo Go**        | Install on your iPhone/Android from the App Store / Play Store   |
| **Xcode**          | (iOS simulator only) macOS + Xcode 15+                           |
| **Android Studio** | (Android emulator only) with an API 34+ emulator image           |

---

## 🚀 First-Time Setup

```bash
# 1. Install all dependencies
pnpm install

# 2. Copy environment template
cp .env.example .env

# 3. Start Postgres, run migrations, seed demo data, run preflight
pnpm db:local:setup

# 4. Verify everything is healthy
pnpm env:check
pnpm preflight
```

This creates:
- A Postgres container at `localhost:5432` with demo data
- Seven seeded accounts (owner, admin, reception, trainer, member, minor, platform)
- Three demo gyms (Aarogya Strength, Iron House, Peak Lab)
- All mock providers (payment, email, push, AI, maps, storage)

---

## 🖥️ Running the Web App

```bash
pnpm dev:web
```

Opens at **http://localhost:3000**. Key pages to test:

| URL | What to test |
| --- | --- |
| `/login` | OTP login flow; local/staging code is `000000` |
| `/dashboard` | Owner/admin command board |
| `/desk` | Reception desk |
| `/coach` | Trainer web surface |
| `/me` | Member web handoff |
| `/dashboard/attendance/qr-display` | Live QR for mobile scan testing |
| `/platform` | Platform diagnostics and subscriptions |
| `/g/aarogya-strength` | Public gym page |
| `/gyms` | Gym discovery search |

---

## 📱 Running the Mobile App

### Option A: Physical device with Expo Go (recommended)

```bash
pnpm dev:mobile
```

This starts the Expo dev server. You'll see a QR code in the terminal.

> ⚠️ **Critical step:** Your phone and laptop must be on the **same Wi-Fi network**.

1. Update `.env` so the mobile app can reach your laptop:

```bash
# Find your laptop's local IP
ifconfig | grep "inet " | grep -v 127.0.0.1
# Example output: inet 192.168.1.42

# Update these three lines in .env:
MOBILE_API_BASE_URL="http://192.168.1.42:3000/api"
EXPO_PUBLIC_API_BASE_URL="http://192.168.1.42:3000/api"
EXPO_PUBLIC_WEB_URL="http://192.168.1.42:3000"
```

2. Restart `pnpm dev:mobile` after changing `.env`
3. Scan the terminal QR code with:
   - **iOS:** Camera app → tap the Expo link
   - **Android:** Expo Go app → "Scan QR Code"

### Option B: iOS Simulator

```bash
pnpm dev:mobile
# Then press `i` in the terminal to launch the iOS Simulator
```

No IP change needed — the simulator uses `localhost` directly.

### Option C: Android Emulator

```bash
pnpm dev:mobile
# Then press `a` in the terminal to launch the Android emulator
```

For the emulator to reach `localhost:3000`, use `10.0.2.2` instead:

```bash
MOBILE_API_BASE_URL="http://10.0.2.2:3000/api"
EXPO_PUBLIC_API_BASE_URL="http://10.0.2.2:3000/api"
EXPO_PUBLIC_WEB_URL="http://10.0.2.2:3000"
```

---

## 🔑 Test Accounts

All accounts use OTP code **`000000`** in local/staging environments. Production uses real OTP/SSO.

| Role | Email | Phone | Primary routes | What you get |
| --- | --- | --- | --- | --- |
| 👑 **Owner** | `owner@zook.local` | — | `/dashboard`, mobile `/owner` | Full dashboard for Aarogya Strength |
| 🧑‍💼 **Admin** | `admin@zook.local` | — | `/dashboard`, mobile `/owner` | Org-wide ops without owner-only settings |
| 🎫 **Reception** | `reception@zook.local` | — | `/desk`, mobile `/reception` | Desk, check-ins, payments, pickup |
| 🏃 **Trainer** | `trainer@zook.local` | — | `/coach`, mobile `/trainer` | Client list, plans, AI drafts |
| 🏋️ **Member** | `member@zook.local` | `+91 98765 43210` | `/me`, mobile member tabs | Membership, attendance, shop |
| 🧒 **Minor** | `minor@zook.local` | — | Member consent flow | Blocked until guardian consent |
| 🛠️ **Platform** | `platform@zook.local` | — | `/platform` | Platform diagnostics |
| ✨ **Fresh user** | `fresh@zook.local` | `+91 90000 11111` | Onboarding | Blank slate; resets every login |

---

## 🔄 End-to-End Test Flows

### Flow 1: Member journey (mobile)

```
1. Open Expo Go → scan QR
2. Login: member@zook.local, code 000000
3. Home screen → see active membership card
4. Tap Scan → point camera at QR on /dashboard/attendance/qr-display
5. ✅ "Check-in approved" flash
6. Plans tab → see assigned workout
7. Tracking tab → log a workout
8. Shop tab → add Protein Shake → checkout (mock) → see pickup code
```

### Flow 2: QR attendance (web + mobile)

```
Web (as owner):
1. Login at /login → owner@zook.local
2. Open /dashboard/attendance/qr-display
3. Keep this page visible (QR refreshes every 30s)

Mobile (as member):
1. Login as member@zook.local
2. Tap Scan → point camera at the QR on your screen
3. Expect: "Check-in approved" or "Pending approval"

No camera? Use manual token entry:
1. Copy the token shown below the QR on the web page
2. On mobile: Scan → Enter Code → paste token
```

### Flow 3: Mock payment checkout

```
Mobile (as member):
1. Login as member@zook.local
2. Home → gym page → Pick a plan → Join
3. Apply coupon WELCOME20 or referral ROHAN500
4. Proceed to checkout → Mock payment page opens
5. Tap "Complete Payment" → Membership activates

Web:
1. Open /g/aarogya-strength
2. Select a plan → login → checkout
3. Complete mock payment at /checkout/mock/{sessionId}
```

### Flow 4: Receptionist desk (web + mobile)

```
1. Login as reception@zook.local at /login
2. Open /desk
3. See pending attendance scans → Approve/Reject
4. Record a manual offline payment (cash/UPI)
5. Fulfil a shop pickup order → mark as fulfilled
6. Mobile: /reception → Desk / Members / Payments / Orders
```

### Flow 5: Owner/Admin dashboard (web)

```
1. Login as owner@zook.local at /login
2. /dashboard → Today's Command Board
3. Check attendance stats, pending approvals, revenue
4. Members → try Bulk Import with a sample CSV:
   name,email,phone
   Test User,test@example.com,9876543210
5. Reports → download CSV exports
6. Billing → confirm subscription page loads
7. Settings → update gym profile, location, plans
8. Repeat with admin@zook.local and confirm owner-only restrictions are clear
```

### Flow 6: Trainer plans (mobile + web)

```
1. Login as trainer@zook.local on mobile
2. Switch to Trainer role in Profile
3. Open client list → Nisha Menon
4. View/create workout plan → Publish to client
5. Client (member) sees the plan under Plans tab
6. Web: open /coach and confirm command view loads
```

### Flow 7: Platform operator (web)

```
1. Login as platform@zook.local
2. Open /platform
3. Check provider status and subscriptions
4. Confirm non-platform roles cannot open /platform
5. Suspend/reactivate only a test org
```

---

## 🗄️ Database Tools

```bash
# Open Prisma Studio (visual DB browser)
pnpm db:studio

# Re-seed demo data (wipes and re-creates)
pnpm db:reset && pnpm seed:demo

# Re-run migrations only (keeps data)
pnpm db:deploy

# Full local setup from scratch
pnpm db:local:setup
```

---

## ✅ Running Tests Locally

```bash
# Unit tests (fast — core business logic)
pnpm test:unit

# Type checking (catches compile errors)
pnpm typecheck

# Launch gate checks (production readiness rules)
pnpm check:launch-gates

# i18n / dashboard copy guard
pnpm check:i18n

# Playwright web smoke tests (starts Next.js automatically)
pnpm test:web

# DB-backed Playwright tests (login, mutations)
pnpm test:db:prepare
RUN_DB_WEB_TESTS=1 pnpm test:web

# Full acceptance (all roles E2E)
pnpm test:acceptance:db

# Headed mode (see the browser)
pnpm test:acceptance:db:headed
```

---

## 🐛 Troubleshooting

### Mobile can't reach API

```
Error: Network request failed / Unable to connect
```

**Fix:** Your phone can't reach `localhost`. Update `.env`:

```bash
# Replace with your actual LAN IP (ifconfig | grep inet)
EXPO_PUBLIC_API_BASE_URL="http://YOUR_IP:3000/api"
MOBILE_API_BASE_URL="http://YOUR_IP:3000/api"
EXPO_PUBLIC_WEB_URL="http://YOUR_IP:3000"
```

Then restart `pnpm dev:mobile`. Ensure both devices are on the same Wi-Fi.

### Docker daemon not running

```
Error: Cannot connect to the Docker daemon
```

**Fix:** Open Docker Desktop and wait for it to start. Then run `pnpm db:local:up`.

### Database not seeded / empty screens

```
No members, no plans, empty dashboard
```

**Fix:**

```bash
pnpm seed:demo
# or full reset:
pnpm db:local:setup
```

### OTP code not working

- Must use `000000` (six zeroes)
- Only works when `APP_ENV=local` or `APP_ENV=staging` with `ALLOW_FIXED_OTP_IN_STAGING=true`
- Never works in `APP_ENV=production`

### Port 3000 already in use

```bash
lsof -i :3000
kill -9 <PID>
pnpm dev:web
```

### Expo QR not scanning

- Make sure Expo Go is installed (not just the Camera app on Android)
- Try pressing `s` in the terminal to switch between LAN / tunnel mode
- If all else fails: type the `exp://` URL manually in Expo Go

### Mock payment not completing

- `ALLOW_MOCK_PAYMENT_COMPLETION` is set to `false` by default
- For local testing, leave it as-is — mock mode auto-enables it when `APP_ENV=local`
- For staging, explicitly set `ALLOW_MOCK_PAYMENT_COMPLETION="true"` in `.env`

---

## 🧹 Cleanup

```bash
# Stop the local Postgres container
docker compose down

# Stop and remove all data (fresh start)
docker compose down -v

# Clear Expo cache
npx expo start --clear
```

---

## 📝 Quick Reference Card

```
Start everything:
  docker compose up -d postgres    # Database
  pnpm dev:web                     # Web at localhost:3000
  pnpm dev:mobile                  # Mobile via Expo Go

Login:
  Any @zook.local account → code 000000

Test QR scan:
  Web:    /dashboard/attendance/qr-display
  Mobile: Scan tab → point at screen

Test payment:
  Mobile: Join gym → checkout → mock complete
  Web:    /checkout/mock/{sessionId}

Reset data:
  pnpm db:local:setup

Run release checks:
  pnpm typecheck
  pnpm lint
  pnpm test:unit
  pnpm test:acceptance:db
  pnpm build
  pnpm release:preflight
```
