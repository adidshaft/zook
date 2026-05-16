# 🏋️ Member Handbook

> **You are a gym member.** Your job is simple: join the right gym, scan in, follow your plan, buy what you need, and renew on time.

---

## 🚀 First 5 Minutes

| Step | What to do | Where |
| --- | --- | --- |
| 1 | Sign in or create account | Mobile app or `/login` |
| 2 | Find your gym | `/gyms` or mobile Home → Find gyms |
| 3 | Open gym profile | `/g/[username]` |
| 4 | Choose plan / request access | Gym profile → Join |
| 5 | Check in | Mobile Scan tab |

**Production note:** test accounts using `000000` are local/staging only. In production, use the real OTP/SSO flow.

---

## 📱 Mobile Screens

```
Bottom Nav:  Home · Scan · Plans · Shop · Profile
```

| Screen | What to verify | Healthy state |
| --- | --- | --- |
| 🏠 **Home** `/` | Membership card, completion ring, renew CTA | Days left and status are readable |
| 📷 **Scan** `/scan` | Camera permission, QR scan, manual code fallback | No auto-permission request on launch |
| ✅ **Attendance result** `/attendance/[id]` | Approved, pending, rejected states | Clear status + next action |
| 📋 **Plans** `/plans` | Workout/diet/habit plan detail | Assigned plan opens cleanly |
| 🛍 **Shop** `/shop` | Product cards, cart, checkout, pickup code | Adding to cart does not resize cards weirdly |
| 🔔 **Notifications** `/notifications` | Unread, empty state, settings CTA | Copy is readable, no clipped rows |
| 💳 **Membership** `/membership` | History, renewal, payments | Sticky renewal button fits text |
| 👤 **Profile** `/profile` | Phone/email, privacy, language, export/delete | Buttons and labels fit |

---

## 🌐 Web Entry Points

| URL | What it does |
| --- | --- |
| `/gyms` | Search public gyms by name/city |
| `/g/[username]` | Public gym profile, facilities, plans, trainers |
| `/join/[username]` | Join flow with referral/coupon support |
| `/r/[code]` | Referral link entry |
| `/checkout/[sessionId]` | Payment checkout |
| `/me` | Member web account handoff |

---

## 🔄 Core Member Flows

### 1. Join a gym

```
Find Gym → Open Profile → Pick Plan → Apply Coupon / Referral → Pay → Active
```

Special cases:
- **Approval required:** request access first, then wait for owner/admin approval.
- **Invite only:** enter invite/referral code before checkout.
- **Minor member:** guardian consent is required before checkout.

Verify:
- Plan price, duration, discount, and final amount are visible.
- Payment success returns to a clear membership state.
- Failed or unavailable payment shows a friendly retry path.

### 2. Check in

```
Scan tab → Point at QR → Result screen
   ✅ Approved: check-in recorded
   ⏳ Pending: desk/owner review needed
   ❌ Rejected: reason + next action
```

Fallback:
```
Scan tab → Enter code manually → Submit
```

Verify:
- QR placeholder/icon is correctly sized.
- Manual code can be copied/pasted.
- Camera-denied state explains how to continue.

### 3. Follow a plan and track progress

```
Plans → Open assigned plan → Mark exercise / habit → Save progress
```

Verify:
- Haptics fire on key toggles.
- Long exercise names do not clip.
- Completion state updates without shrinking cards.

### 4. Buy from shop

```
Shop → Add item → Cart → Checkout → Pickup code → Desk verifies pickup
```

Verify:
- Product card height stays stable after adding to cart.
- Cart total is clear.
- Pickup code is tappable/copyable.

---

## ✅ Member Production Smoke Checklist

- [ ] Login works with real production OTP/SSO.
- [ ] Home loads the active membership state.
- [ ] Completion ring is centered and readable.
- [ ] Scan opens permission flow and manual fallback.
- [ ] Plans, Shop, Notifications, Membership, Profile all open.
- [ ] Cart and checkout display the correct amount.
- [ ] Renewal CTA text fits on small phones.
- [ ] Bottom nav is evenly spaced and does not bleed into the safe area.

---

## ⚠️ Good-to-Know Rules

- **The big lime action is usually the next best step.**
- **Your status comes first:** active, expired, pending, rejected, or renewal due.
- **Codes are copyable** wherever the app shows referral, pickup, or attendance codes.
- **Privacy requests** live in Profile and should show export/delete options clearly.
