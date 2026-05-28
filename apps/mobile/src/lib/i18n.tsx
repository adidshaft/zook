import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { mobileApiFetch } from "./api";
import { getStoredValue, setStoredValue } from "./storage";

const LOCALE_STORAGE_KEY = "zook_mobile_locale";
const SESSION_STORAGE_KEY = "zook_session";
const localeListeners = new Set<(preference: LocalePreference) => void>();

export type AppLocale = "en" | "hi";
export type LocalePreference = "system" | AppLocale;

export type TranslationKey =
  | "app.demoMode"
  | "app.loadingSession"
  | "app.configErrorTitle"
  | "app.configErrorBody"
  | "common.cancel"
  | "common.datePicker"
  | "common.dismiss"
  | "common.done"
  | "network.offline"
  | "nav.home"
  | "nav.plans"
  | "nav.checkIn"
  | "nav.scan"
  | "nav.tracking"
  | "nav.more"
  | "nav.shop"
  | "nav.inbox"
  | "nav.assistant"
  | "nav.trainer"
  | "nav.clients"
  | "nav.drafts"
  | "nav.desk"
  | "nav.members"
  | "nav.payments"
  | "nav.orders"
  | "nav.owner"
  | "nav.command"
  | "nav.needs"
  | "nav.approvals"
  | "nav.revenue"
  | "nav.stock"
  | "nav.profile"
  | "notifications.today"
  | "notifications.yesterday"
  | "notifications.earlierThisWeek"
  | "notifications.older"
  | "auth.heroEyebrow"
  | "auth.heroBody"
  | "auth.signIn"
  | "auth.verifyCode"
  | "auth.identifierSubtitle"
  | "auth.otpSubtitle"
  | "auth.identifierLabel"
  | "auth.identifierPlaceholder"
  | "auth.useMobile"
  | "auth.useEmail"
  | "auth.mobileLabel"
  | "auth.emailLabel"
  | "auth.mobilePlaceholder"
  | "auth.emailPlaceholderLogin"
  | "auth.otpLabel"
  | "auth.otpAccessibility"
  | "auth.sendCode"
  | "auth.verifyAndSignIn"
  | "auth.working"
  | "auth.resendCode"
  | "auth.resendIn"
  | "auth.changeSignIn"
  | "auth.testCode"
  | "auth.enterIdentifier"
  | "auth.codeSent"
  | "auth.freshCodeSent"
  | "auth.signedIn"
  | "auth.invalidEmail"
  | "auth.invalidEmailOnly"
  | "auth.invalidMobile"
  | "auth.sessionExpired"
  | "auth.sessionExpiredTitle"
  | "auth.sessionExpiredBody"
  | "auth.verifyToContinue"
  | "auth.appleUnavailable"
  | "auth.appleNoToken"
  | "auth.appleComingSoon"
  | "auth.googleUnavailable"
  | "auth.googleNoToken"
  | "auth.googleComingSoon"
  | "settings.profileTitle"
  | "settings.profileSubtitle"
  | "settings.goBack"
  | "settings.account"
  | "settings.signedIn"
  | "settings.useZookAs"
  | "settings.name"
  | "settings.email"
  | "settings.phone"
  | "settings.emailPlaceholder"
  | "settings.sendEmailCode"
  | "settings.sendPhoneCode"
  | "settings.emailCode"
  | "settings.phoneCode"
  | "settings.verifyContact"
  | "settings.verifying"
  | "settings.fitnessGoal"
  | "settings.fitnessGoalPlaceholder"
  | "settings.saveProfile"
  | "settings.saving"
  | "settings.profileSaved"
  | "settings.enterContact"
  | "settings.contactCodeSent"
  | "settings.enterSixDigitCode"
  | "settings.emailVerified"
  | "settings.phoneVerified"
  | "settings.notifications"
  | "settings.notificationScope"
  | "settings.notificationScopeGym"
  | "settings.notificationScopeGlobal"
  | "settings.pushNotifications"
  | "settings.pushNotificationsSubtitle"
  | "settings.paymentsReceipts"
  | "settings.paymentsReceiptsSubtitle"
  | "settings.gymOperations"
  | "settings.gymOperationsSubtitle"
  | "settings.trainingReminders"
  | "settings.trainingRemindersSubtitle"
  | "settings.offers"
  | "settings.offersSubtitle"
  | "settings.preferencesUpdated"
  | "settings.language"
  | "settings.languageSubtitle"
  | "settings.languageSystem"
  | "settings.languageEnglish"
  | "settings.languageHindi"
  | "settings.privacyData"
  | "settings.privacySubtitle"
  | "settings.privacyWarning"
  | "settings.export"
  | "settings.delete"
  | "settings.exportRequested"
  | "settings.deletionRequested"
  | "settings.latestExport"
  | "settings.latestDeletion"
  | "settings.noExport"
  | "settings.noDeletion"
  | "settings.system"
  | "settings.systemSubtitle"
  | "settings.contactSupport"
  | "settings.contactSupportSubtitle"
  | "settings.aboutZook"
  | "settings.aboutZookSubtitle"
  | "settings.signedInGym"
  | "settings.noActiveGym"
  | "settings.logout"
  | "settings.shareFriend"
  | "settings.copy"
  | "settings.copied"
  | "settings.share"
  | "branch.switch"
  | "branch.current"
  | "branch.allBranches"
  | "shop.readyForPickup"
  | "shop.readyForPickupSubtitle"
  | "shop.pickupCode"
  | "shop.pickupCodeCopied"
  | "shop.pickupCodeCopyFailed"
  | "shop.pending"
  | "shop.paid"
  | "shop.signedPickupQrCode"
  | "shop.continuePayment"
  | "shop.confirming"
  | "shop.backToShop"
  | "shop.payment"
  | "shop.paymentSubtitle"
  | "shop.paySecurely"
  | "shop.confirmOrder"
  | "shop.getPickupCode"
  | "shop.makeDeskCode"
  | "shop.collectAtDesk"
  | "shop.showPickupCode"
  | "shop.orderTotal"
  | "shop.cart"
  | "shop.reviewOrder"
  | "shop.reviewOrderSubtitle"
  | "shop.back"
  | "shop.creating"
  | "shop.yourCartEmpty"
  | "shop.cartEmptyBody"
  | "shop.subtotal"
  | "shop.openMiniCart"
  | "shop.openCart"
  | "shop.deskPickup"
  | "shop.activeGym"
  | "shop.searchEssentials"
  | "shop.availableNow"
  | "shop.item"
  | "shop.items"
  | "shop.shopCouldNotLoad"
  | "shop.shopCouldNotLoadBody"
  | "shop.tryAgain"
  | "shop.noProductsFound"
  | "shop.noProductsFoundBody"
  | "findGyms.searchPlaceholder"
  | "findGyms.cityPlaceholder"
  | "findGyms.deviceLocation"
  | "findGyms.recentSearches"
  | "empty.loading"
  | "empty.loadingBody"
  | "tracking.bodyTimeline"
  | "tracking.bodyTimelineSubtitle"
  | "tracking.photoLogged"
  | "tracking.noPhoto"
  | "tracking.bodyComposition"
  | "tracking.latestEntry"
  | "tracking.weight"
  | "tracking.bodyFat"
  | "tracking.start"
  | "tracking.end"
  | "tracking.duration"
  | "tracking.focus"
  | "tracking.totalDuration"
  | "tracking.sessions"
  | "common.seeAll"
  | "more.title"
  | "more.subtitle"
  | "more.accountSubtitle"
  | "more.signOut"
  | "more.signOutConfirmTitle"
  | "more.signOutConfirmBody"
  | "more.signOutCancel"
  | "more.tracking.title"
  | "more.tracking.subtitle"
  | "more.shop.title"
  | "more.shop.subtitle"
  | "more.inbox.title"
  | "more.inbox.subtitle"
  | "more.assistant.title"
  | "more.assistant.subtitle"
  | "more.profile.title"
  | "more.profile.subtitle"
  | "more.settings.title"
  | "more.settings.subtitle"
  | "more.fallbackName";

type TranslationValues = Record<string, string | number>;

const translations: Record<AppLocale, Record<TranslationKey, string>> = {
  en: {
    "app.demoMode": "DEMO MODE",
    "app.loadingSession": "Restoring your Zook session...",
    "app.configErrorTitle": "Zook can't open in this build.",
    "app.configErrorBody": "Please update the app or contact support if this keeps happening.",
    "common.cancel": "Cancel",
    "common.datePicker": "Date picker",
    "common.dismiss": "Dismiss",
    "common.done": "Done",
    "network.offline": "Working offline. Data may be stale.",
    "nav.home": "Home",
    "nav.plans": "Plans",
    "nav.checkIn": "Check in",
    "nav.scan": "Scan",
    "nav.tracking": "Tracking",
    "nav.more": "More",
    "nav.shop": "Shop",
    "nav.inbox": "Inbox",
    "nav.assistant": "AI",
    "nav.trainer": "Trainer",
    "nav.clients": "Clients",
    "nav.drafts": "Drafts",
    "nav.desk": "Desk",
    "nav.members": "Members",
    "nav.payments": "Payments",
    "nav.orders": "Orders",
    "nav.owner": "Owner",
    "nav.command": "Command",
    "nav.needs": "Needs",
    "nav.approvals": "Approvals",
    "nav.revenue": "Revenue",
    "nav.stock": "Stock",
    "nav.profile": "Profile",
    "notifications.today": "Today",
    "notifications.yesterday": "Yesterday",
    "notifications.earlierThisWeek": "Earlier this week",
    "notifications.older": "Older",
    "auth.heroEyebrow": "Fitness Operating System",
    "auth.heroBody": "Your gym, your membership, your rhythm. Sign in to get started.",
    "auth.signIn": "Sign in",
    "auth.verifyCode": "Verify Code",
    "auth.identifierSubtitle": "Use your registered email or mobile number.",
    "auth.otpSubtitle": "Check your messages.",
    "auth.identifierLabel": "Email or mobile number",
    "auth.identifierPlaceholder": "you@example.com or 98765 43210",
    "auth.useMobile": "Use mobile number",
    "auth.useEmail": "Use email",
    "auth.mobileLabel": "Mobile number",
    "auth.emailLabel": "Email",
    "auth.mobilePlaceholder": "+91 98765 43210",
    "auth.emailPlaceholderLogin": "you@example.com",
    "auth.otpLabel": "One-time code",
    "auth.otpAccessibility": "One-time code",
    "auth.sendCode": "Send Code",
    "auth.verifyAndSignIn": "Verify & Sign In",
    "auth.working": "Working...",
    "auth.resendCode": "Resend code",
    "auth.resendIn": "Resend in {{seconds}}s",
    "auth.changeSignIn": "Change sign-in",
    "auth.testCode": "TEST CODE",
    "auth.enterIdentifier": "Enter your email or mobile number.",
    "auth.codeSent": "Code sent to {{identifier}}.",
    "auth.freshCodeSent": "Fresh code sent to {{identifier}}.",
    "auth.signedIn": "Signed in.",
    "auth.invalidEmail": "Enter a valid email or mobile number.",
    "auth.invalidEmailOnly": "Enter a valid email address.",
    "auth.invalidMobile": "Enter a valid 10-digit mobile number.",
    "auth.sessionExpired": "Your session expired. Sign in again to continue.",
    "auth.sessionExpiredTitle": "Session expired",
    "auth.sessionExpiredBody": "Sign in again to continue.",
    "auth.verifyToContinue": "Verify it's you to continue.",
    "auth.appleUnavailable": "Apple sign-in is not available on this device.",
    "auth.appleNoToken": "Apple did not return an identity token. Try again.",
    "auth.appleComingSoon": "Apple sign-in coming soon.",
    "auth.googleUnavailable": "Google sign-in is not available in Expo Go.",
    "auth.googleNoToken": "Google did not return an ID token. Try again.",
    "auth.googleComingSoon": "Google sign-in coming soon.",
    "settings.profileTitle": "Profile",
    "settings.profileSubtitle": "Account, notifications, and support",
    "settings.goBack": "Go back",
    "settings.account": "Account",
    "settings.signedIn": "Signed in",
    "settings.useZookAs": "Use Zook as",
    "settings.name": "Name",
    "settings.email": "Email",
    "settings.phone": "Phone",
    "settings.emailPlaceholder": "you@example.com",
    "settings.sendEmailCode": "Send email code",
    "settings.sendPhoneCode": "Send phone code",
    "settings.emailCode": "Email code",
    "settings.phoneCode": "Phone code",
    "settings.verifyContact": "Verify contact",
    "settings.verifying": "Verifying...",
    "settings.fitnessGoal": "Fitness goal",
    "settings.fitnessGoalPlaceholder": "Strength, fat loss, mobility...",
    "settings.saveProfile": "Save profile",
    "settings.saving": "Saving...",
    "settings.profileSaved": "Profile saved.",
    "settings.enterContact": "Enter a {{kind}} first.",
    "settings.contactCodeSent": "Code sent to {{identifier}}.",
    "settings.enterSixDigitCode": "Enter the 6-digit code.",
    "settings.emailVerified": "Email verified.",
    "settings.phoneVerified": "Phone verified.",
    "settings.notifications": "Notifications",
    "settings.notificationScope": "{{scope}} preferences",
    "settings.notificationScopeGym": "Gym-specific",
    "settings.notificationScopeGlobal": "Global",
    "settings.pushNotifications": "Push notifications",
    "settings.pushNotificationsSubtitle":
      "Allow this device to receive enabled notification categories",
    "settings.paymentsReceipts": "Payments and receipts",
    "settings.paymentsReceiptsSubtitle": "Membership payments and renewal notices",
    "settings.gymOperations": "Gym operations",
    "settings.gymOperationsSubtitle": "Attendance, approvals, and facility updates",
    "settings.trainingReminders": "Training reminders",
    "settings.trainingRemindersSubtitle": "Plans, habits, streaks, and coach nudges",
    "settings.offers": "Offers",
    "settings.offersSubtitle": "Referral, coupon, and gym campaign messages",
    "settings.preferencesUpdated": "Notification preferences updated.",
    "settings.language": "Language",
    "settings.languageSubtitle": "Choose app language",
    "settings.languageSystem": "System",
    "settings.languageEnglish": "English",
    "settings.languageHindi": "Hindi",
    "settings.privacyData": "Privacy & data",
    "settings.privacySubtitle": "Export or delete data",
    "settings.privacyWarning": "These requests are saved and reviewed before anything changes.",
    "settings.export": "Export",
    "settings.delete": "Delete",
    "settings.exportRequested": "Export requested. You'll receive an email when it's ready.",
    "settings.deletionRequested": "Deletion requested. This is being reviewed before execution.",
    "settings.latestExport": "Latest export",
    "settings.latestDeletion": "Latest deletion",
    "settings.noExport": "No export request yet",
    "settings.noDeletion": "No deletion request yet",
    "settings.system": "System",
    "settings.systemSubtitle": "Help, policies, and app info",
    "settings.contactSupport": "Contact support",
    "settings.contactSupportSubtitle": "Email support@zookfit.in with account or gym issues",
    "settings.aboutZook": "About Zook",
    "settings.aboutZookSubtitle": "Gym operations, memberships, PT, and member experience",
    "settings.signedInGym": "Signed-in gym",
    "settings.noActiveGym": "No active gym",
    "settings.logout": "Logout",
    "settings.shareFriend": "Share with a friend",
    "settings.copy": "Copy",
    "settings.copied": "Copied!",
    "settings.share": "Share",
    "branch.switch": "Switch branch",
    "branch.current": "Current branch",
    "branch.allBranches": "All branches",
    "shop.readyForPickup": "Ready for pickup",
    "shop.readyForPickupSubtitle": "Show this code at the front desk.",
    "shop.pickupCode": "Pickup code",
    "shop.pickupCodeCopied": "Pickup code copied.",
    "shop.pickupCodeCopyFailed": "Could not copy pickup code.",
    "shop.pending": "Pending",
    "shop.paid": "Paid",
    "shop.signedPickupQrCode": "Signed pickup QR code",
    "shop.continuePayment": "Continue to payment",
    "shop.confirming": "Confirming...",
    "shop.backToShop": "Back to Shop",
    "shop.payment": "Payment",
    "shop.paymentSubtitle": "Your item will be ready at the desk.",
    "shop.paySecurely": "Pay securely",
    "shop.confirmOrder": "Confirm the order",
    "shop.getPickupCode": "Get pickup code",
    "shop.makeDeskCode": "We will make a code for the desk",
    "shop.collectAtDesk": "Collect at desk",
    "shop.showPickupCode": "Show the code to pick it up",
    "shop.orderTotal": "Order total",
    "shop.cart": "Cart",
    "shop.reviewOrder": "Review order",
    "shop.reviewOrderSubtitle": "Pick it up at the front desk after payment.",
    "shop.back": "Back",
    "shop.creating": "Creating...",
    "shop.yourCartEmpty": "Your cart is empty",
    "shop.cartEmptyBody": "Add desk pickup items from the shop.",
    "shop.subtotal": "Subtotal",
    "shop.openMiniCart": "Open mini cart",
    "shop.openCart": "Open cart",
    "shop.deskPickup": "Desk pickup",
    "shop.activeGym": "Active gym",
    "shop.searchEssentials": "Search essentials",
    "shop.availableNow": "Available now",
    "shop.item": "item",
    "shop.items": "items",
    "shop.shopCouldNotLoad": "Shop could not load",
    "shop.shopCouldNotLoadBody":
      "We could not refresh stock or prices. Try again before placing an order.",
    "shop.tryAgain": "Try again",
    "shop.noProductsFound": "No products found",
    "shop.noProductsFoundBody": "Try a different item or ask the desk for availability.",
    "findGyms.searchPlaceholder": "Search by gym, area, or pin code",
    "findGyms.cityPlaceholder": "Area, city, or pin code",
    "findGyms.deviceLocation": "Use device location",
    "findGyms.recentSearches": "Recent searches",
    "empty.loading": "Loading",
    "empty.loadingBody": "Pulling the latest details from your gym.",
    "tracking.bodyTimeline": "Photo timeline",
    "tracking.bodyTimelineSubtitle": "{{count}} body composition entries",
    "tracking.photoLogged": "Photo logged",
    "tracking.noPhoto": "No photo",
    "tracking.bodyComposition": "Body composition",
    "tracking.latestEntry": "Latest entry",
    "tracking.weight": "Weight",
    "tracking.bodyFat": "Body fat",
    "tracking.start": "Start",
    "tracking.end": "End",
    "tracking.duration": "Duration",
    "tracking.focus": "Focus",
    "tracking.totalDuration": "Total duration",
    "tracking.sessions": "Sessions",
    "common.seeAll": "See all",
    "more.title": "More",
    "more.subtitle": "Everything else in one place.",
    "more.accountSubtitle": "Zook member account",
    "more.signOut": "Sign out",
    "more.signOutConfirmTitle": "Sign out?",
    "more.signOutConfirmBody": "You can sign back in with OTP any time.",
    "more.signOutCancel": "Cancel",
    "more.tracking.title": "Tracking",
    "more.tracking.subtitle": "Log workouts, weight, and habits.",
    "more.shop.title": "Shop",
    "more.shop.subtitle": "Order gym essentials for desk pickup.",
    "more.inbox.title": "Inbox",
    "more.inbox.subtitle": "Payments, plans, and gym updates.",
    "more.assistant.title": "Plan assistant",
    "more.assistant.subtitle": "Ask questions about your training and plans.",
    "more.profile.title": "Profile",
    "more.profile.subtitle": "Membership details and personal info.",
    "more.settings.title": "Settings",
    "more.settings.subtitle": "Language, roles, privacy, and account.",
    "more.fallbackName": "Member",
  },
  hi: {
    "app.demoMode": "डेमो मोड",
    "app.loadingSession": "आपका Zook सेशन वापस लाया जा रहा है...",
    "app.configErrorTitle": "इस बिल्ड में Zook नहीं खुल सकता.",
    "app.configErrorBody": "कृपया ऐप अपडेट करें या समस्या बनी रहे तो सपोर्ट से संपर्क करें.",
    "common.cancel": "रद्द करें",
    "common.datePicker": "तारीख चुनें",
    "common.dismiss": "बंद करें",
    "common.done": "हो गया",
    "network.offline": "आप ऑफलाइन हैं. डेटा पुराना हो सकता है.",
    "nav.home": "होम",
    "nav.plans": "प्लान",
    "nav.checkIn": "चेक इन",
    "nav.scan": "स्कैन",
    "nav.tracking": "ट्रैकिंग",
    "nav.more": "और",
    "nav.shop": "शॉप",
    "nav.inbox": "इनबॉक्स",
    "nav.assistant": "AI",
    "nav.trainer": "ट्रेनर",
    "nav.clients": "क्लाइंट",
    "nav.drafts": "ड्राफ्ट",
    "nav.desk": "डेस्क",
    "nav.members": "मेंबर",
    "nav.payments": "पेमेंट",
    "nav.orders": "ऑर्डर",
    "nav.owner": "ओनर",
    "nav.command": "कमांड",
    "nav.needs": "जरूरतें",
    "nav.approvals": "मंजूरी",
    "nav.revenue": "रेवेन्यू",
    "nav.stock": "स्टॉक",
    "nav.profile": "प्रोफाइल",
    "notifications.today": "आज",
    "notifications.yesterday": "कल",
    "notifications.earlierThisWeek": "इस हफ्ते पहले",
    "notifications.older": "पुराने",
    "auth.heroEyebrow": "फिटनेस ऑपरेटिंग सिस्टम",
    "auth.heroBody": "आपका जिम, आपकी मेंबरशिप, आपकी लय. शुरू करने के लिए साइन इन करें.",
    "auth.signIn": "साइन इन",
    "auth.verifyCode": "कोड वेरिफाई करें",
    "auth.identifierSubtitle": "अपना registered ईमेल या मोबाइल नंबर इस्तेमाल करें.",
    "auth.otpSubtitle": "अपने संदेश देखें.",
    "auth.identifierLabel": "ईमेल या मोबाइल नंबर",
    "auth.identifierPlaceholder": "you@example.com या 98765 43210",
    "auth.useMobile": "मोबाइल नंबर इस्तेमाल करें",
    "auth.useEmail": "ईमेल इस्तेमाल करें",
    "auth.mobileLabel": "मोबाइल नंबर",
    "auth.emailLabel": "ईमेल",
    "auth.mobilePlaceholder": "+91 98765 43210",
    "auth.emailPlaceholderLogin": "you@example.com",
    "auth.otpLabel": "वन-टाइम कोड",
    "auth.otpAccessibility": "वन-टाइम कोड",
    "auth.sendCode": "कोड भेजें",
    "auth.verifyAndSignIn": "वेरिफाई करके साइन इन करें",
    "auth.working": "काम हो रहा है...",
    "auth.resendCode": "कोड फिर भेजें",
    "auth.resendIn": "{{seconds}}s में फिर भेजें",
    "auth.changeSignIn": "साइन-इन बदलें",
    "auth.testCode": "टेस्ट कोड",
    "auth.enterIdentifier": "अपना ईमेल या मोबाइल नंबर डालें.",
    "auth.codeSent": "{{identifier}} पर कोड भेजा गया.",
    "auth.freshCodeSent": "{{identifier}} पर नया कोड भेजा गया.",
    "auth.signedIn": "साइन इन हो गया.",
    "auth.invalidEmail": "मान्य ईमेल या मोबाइल नंबर दर्ज करें.",
    "auth.invalidEmailOnly": "मान्य ईमेल पता दर्ज करें.",
    "auth.invalidMobile": "मान्य 10-digit मोबाइल नंबर दर्ज करें.",
    "auth.sessionExpired": "आपका session expire हो गया है. जारी रखने के लिए फिर से sign in करें.",
    "auth.sessionExpiredTitle": "Session expire हो गया",
    "auth.sessionExpiredBody": "जारी रखने के लिए फिर से sign in करें.",
    "auth.verifyToContinue": "जारी रखने के लिए verify करें.",
    "auth.appleUnavailable": "इस device पर Apple sign-in उपलब्ध नहीं है.",
    "auth.appleNoToken": "Apple ने identity token नहीं दिया. फिर से प्रयास करें.",
    "auth.appleComingSoon": "Apple sign-in जल्द आ रहा है.",
    "auth.googleUnavailable": "Expo Go में Google sign-in उपलब्ध नहीं है.",
    "auth.googleNoToken": "Google ने ID token नहीं दिया. फिर से प्रयास करें.",
    "auth.googleComingSoon": "Google sign-in जल्द आ रहा है.",
    "settings.profileTitle": "प्रोफाइल",
    "settings.profileSubtitle": "अकाउंट, नोटिफिकेशन और सपोर्ट",
    "settings.goBack": "वापस जाएं",
    "settings.account": "अकाउंट",
    "settings.signedIn": "साइन इन",
    "settings.useZookAs": "Zook इस्तेमाल करें",
    "settings.name": "नाम",
    "settings.email": "ईमेल",
    "settings.phone": "फोन",
    "settings.emailPlaceholder": "you@example.com",
    "settings.sendEmailCode": "ईमेल कोड भेजें",
    "settings.sendPhoneCode": "फोन कोड भेजें",
    "settings.emailCode": "ईमेल कोड",
    "settings.phoneCode": "फोन कोड",
    "settings.verifyContact": "कॉन्टैक्ट वेरिफाई करें",
    "settings.verifying": "वेरिफाई हो रहा है...",
    "settings.fitnessGoal": "फिटनेस लक्ष्य",
    "settings.fitnessGoalPlaceholder": "स्ट्रेंथ, फैट लॉस, मोबिलिटी...",
    "settings.saveProfile": "प्रोफाइल सेव करें",
    "settings.saving": "सेव हो रहा है...",
    "settings.profileSaved": "प्रोफाइल सेव हो गई.",
    "settings.enterContact": "पहले {{kind}} डालें.",
    "settings.contactCodeSent": "{{identifier}} पर कोड भेजा गया.",
    "settings.enterSixDigitCode": "6 अंकों का कोड डालें.",
    "settings.emailVerified": "ईमेल वेरिफाई हो गया.",
    "settings.phoneVerified": "फोन वेरिफाई हो गया.",
    "settings.notifications": "नोटिफिकेशन",
    "settings.notificationScope": "{{scope}} प्राथमिकताएं",
    "settings.notificationScopeGym": "जिम-विशेष",
    "settings.notificationScopeGlobal": "ग्लोबल",
    "settings.pushNotifications": "पुश नोटिफिकेशन",
    "settings.pushNotificationsSubtitle": "इस डिवाइस को चुनी गई नोटिफिकेशन श्रेणियां पाने दें",
    "settings.paymentsReceipts": "पेमेंट और रसीदें",
    "settings.paymentsReceiptsSubtitle": "मेंबरशिप पेमेंट और रिन्यूअल नोटिस",
    "settings.gymOperations": "जिम ऑपरेशन",
    "settings.gymOperationsSubtitle": "अटेंडेंस, मंजूरी और सुविधा अपडेट",
    "settings.trainingReminders": "ट्रेनिंग रिमाइंडर",
    "settings.trainingRemindersSubtitle": "प्लान, आदतें, स्ट्रीक और कोच संकेत",
    "settings.offers": "ऑफर",
    "settings.offersSubtitle": "रेफरल, कूपन और जिम कैंपेन संदेश",
    "settings.preferencesUpdated": "नोटिफिकेशन प्राथमिकताएं अपडेट हो गईं.",
    "settings.language": "भाषा",
    "settings.languageSubtitle": "ऐप की भाषा चुनें",
    "settings.languageSystem": "सिस्टम",
    "settings.languageEnglish": "English",
    "settings.languageHindi": "हिंदी",
    "settings.privacyData": "प्राइवेसी और डेटा",
    "settings.privacySubtitle": "डेटा एक्सपोर्ट या डिलीट करें",
    "settings.privacyWarning":
      "इन अनुरोधों को सेव किया जाता है और बदलाव से पहले रिव्यू किया जाता है.",
    "settings.export": "एक्सपोर्ट",
    "settings.delete": "डिलीट",
    "settings.exportRequested": "एक्सपोर्ट अनुरोध भेजा गया. तैयार होने पर आपको ईमेल मिलेगा.",
    "settings.deletionRequested":
      "डिलीशन अनुरोध भेजा गया. इसे लागू करने से पहले रिव्यू किया जाएगा.",
    "settings.latestExport": "नया एक्सपोर्ट",
    "settings.latestDeletion": "नया डिलीशन",
    "settings.noExport": "अभी कोई एक्सपोर्ट अनुरोध नहीं",
    "settings.noDeletion": "अभी कोई डिलीशन अनुरोध नहीं",
    "settings.system": "सिस्टम",
    "settings.systemSubtitle": "मदद, पॉलिसी और ऐप जानकारी",
    "settings.contactSupport": "सपोर्ट से संपर्क करें",
    "settings.contactSupportSubtitle":
      "अकाउंट या जिम समस्या के लिए support@zookfit.in पर ईमेल करें",
    "settings.aboutZook": "Zook के बारे में",
    "settings.aboutZookSubtitle": "जिम ऑपरेशन, मेंबरशिप, PT और मेंबर अनुभव",
    "settings.signedInGym": "साइन-इन जिम",
    "settings.noActiveGym": "कोई सक्रिय जिम नहीं",
    "settings.logout": "लॉगआउट",
    "settings.shareFriend": "दोस्त के साथ शेयर करें",
    "settings.copy": "कॉपी",
    "settings.copied": "कॉपी हो गया!",
    "settings.share": "शेयर",
    "branch.switch": "ब्रांच बदलें",
    "branch.current": "मौजूदा ब्रांच",
    "branch.allBranches": "सभी ब्रांच",
    "shop.readyForPickup": "पिकअप के लिए तैयार",
    "shop.readyForPickupSubtitle": "यह कोड फ्रंट डेस्क पर दिखाएं.",
    "shop.pickupCode": "पिकअप कोड",
    "shop.pickupCodeCopied": "पिकअप कोड कॉपी हुआ।",
    "shop.pickupCodeCopyFailed": "पिकअप कोड कॉपी नहीं हो सका।",
    "shop.pending": "पेंडिंग",
    "shop.paid": "पेड",
    "shop.signedPickupQrCode": "साइन किया हुआ पिकअप QR कोड",
    "shop.continuePayment": "पेमेंट जारी रखें",
    "shop.confirming": "कन्फर्म हो रहा है...",
    "shop.backToShop": "शॉप पर वापस",
    "shop.payment": "पेमेंट",
    "shop.paymentSubtitle": "आपका आइटम डेस्क पर तैयार रहेगा.",
    "shop.paySecurely": "सुरक्षित भुगतान",
    "shop.confirmOrder": "ऑर्डर कन्फर्म करें",
    "shop.getPickupCode": "पिकअप कोड पाएं",
    "shop.makeDeskCode": "हम डेस्क के लिए कोड बनाएंगे",
    "shop.collectAtDesk": "डेस्क से लें",
    "shop.showPickupCode": "लेने के लिए कोड दिखाएं",
    "shop.orderTotal": "ऑर्डर कुल",
    "shop.cart": "कार्ट",
    "shop.reviewOrder": "ऑर्डर देखें",
    "shop.reviewOrderSubtitle": "पेमेंट के बाद फ्रंट डेस्क से पिकअप करें.",
    "shop.back": "वापस",
    "shop.creating": "बन रहा है...",
    "shop.yourCartEmpty": "आपका कार्ट खाली है",
    "shop.cartEmptyBody": "शॉप से डेस्क पिकअप आइटम जोड़ें.",
    "shop.subtotal": "सबटोटल",
    "shop.openMiniCart": "मिनी कार्ट खोलें",
    "shop.openCart": "कार्ट खोलें",
    "shop.deskPickup": "डेस्क पिकअप",
    "shop.activeGym": "सक्रिय जिम",
    "shop.searchEssentials": "जरूरी सामान खोजें",
    "shop.availableNow": "अभी उपलब्ध",
    "shop.item": "आइटम",
    "shop.items": "आइटम",
    "shop.shopCouldNotLoad": "शॉप लोड नहीं हुई",
    "shop.shopCouldNotLoadBody":
      "स्टॉक या कीमतें रिफ्रेश नहीं हो पाईं. ऑर्डर से पहले फिर कोशिश करें.",
    "shop.tryAgain": "फिर कोशिश करें",
    "shop.noProductsFound": "कोई प्रोडक्ट नहीं मिला",
    "shop.noProductsFoundBody": "दूसरा आइटम खोजें या डेस्क से उपलब्धता पूछें.",
    "findGyms.searchPlaceholder": "जिम, क्षेत्र या पिन कोड से खोजें",
    "findGyms.cityPlaceholder": "क्षेत्र, शहर या पिन कोड",
    "findGyms.deviceLocation": "डिवाइस लोकेशन इस्तेमाल करें",
    "findGyms.recentSearches": "हाल की खोजें",
    "empty.loading": "लोड हो रहा है",
    "empty.loadingBody": "आपके जिम की ताजा जानकारी लाई जा रही है.",
    "tracking.bodyTimeline": "फोटो टाइमलाइन",
    "tracking.bodyTimelineSubtitle": "{{count}} बॉडी कंपोजिशन एंट्री",
    "tracking.photoLogged": "फोटो लॉग हुई",
    "tracking.noPhoto": "फोटो नहीं",
    "tracking.bodyComposition": "बॉडी कंपोजिशन",
    "tracking.latestEntry": "नयी एंट्री",
    "tracking.weight": "वजन",
    "tracking.bodyFat": "बॉडी फैट",
    "tracking.start": "शुरू",
    "tracking.end": "खत्म",
    "tracking.duration": "अवधि",
    "tracking.focus": "फोकस",
    "tracking.totalDuration": "कुल अवधि",
    "tracking.sessions": "सेशन",
    "common.seeAll": "सभी देखें",
    "more.title": "और",
    "more.subtitle": "बाकी सब कुछ एक जगह.",
    "more.accountSubtitle": "Zook मेंबर अकाउंट",
    "more.signOut": "साइन आउट",
    "more.signOutConfirmTitle": "साइन आउट करें?",
    "more.signOutConfirmBody": "आप कभी भी OTP से वापस साइन इन कर सकते हैं.",
    "more.signOutCancel": "रद्द करें",
    "more.tracking.title": "ट्रैकिंग",
    "more.tracking.subtitle": "वर्कआउट, वजन और आदतें लॉग करें.",
    "more.shop.title": "शॉप",
    "more.shop.subtitle": "जिम के सामान का ऑर्डर डेस्क पर लें.",
    "more.inbox.title": "इनबॉक्स",
    "more.inbox.subtitle": "पेमेंट, प्लान और जिम अपडेट.",
    "more.assistant.title": "प्लान असिस्टेंट",
    "more.assistant.subtitle": "अपनी ट्रेनिंग और प्लान के बारे में पूछें.",
    "more.profile.title": "प्रोफाइल",
    "more.profile.subtitle": "मेम्बरशिप और व्यक्तिगत जानकारी.",
    "more.settings.title": "सेटिंग्स",
    "more.settings.subtitle": "भाषा, रोल, प्राइवेसी और अकाउंट.",
    "more.fallbackName": "मेंबर",
  },
};

type I18nContextValue = {
  locale: AppLocale;
  preference: LocalePreference;
  setLocalePreference: (preference: LocalePreference) => Promise<void>;
  t: (key: TranslationKey, values?: TranslationValues) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function systemLocale(): AppLocale {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale.toLowerCase();
    return locale.startsWith("hi") ? "hi" : "en";
  } catch {
    return "en";
  }
}

function normalizePreference(value?: string | null): LocalePreference {
  return value === "hi" || value === "en" || value === "system" ? value : "system";
}

async function patchProfileLocale(preference: LocalePreference) {
  if (preference === "system") {
    return;
  }
  const token = await getStoredValue(SESSION_STORAGE_KEY);
  if (!token) {
    return;
  }
  await mobileApiFetch("/me/profile", {
    method: "PATCH",
    token,
    body: { preferredLocale: preference },
  });
}

export async function applySessionLocalePreference(value?: string | null) {
  const nextPreference = normalizePreference(value);
  if (nextPreference === "system") {
    return;
  }
  await setStoredValue(LOCALE_STORAGE_KEY, nextPreference);
  localeListeners.forEach((listener) => listener(nextPreference));
}

function interpolate(template: string, values?: TranslationValues) {
  if (!values) {
    return template;
  }
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replace(new RegExp(`{{${key}}}`, "g"), String(value)),
    template,
  );
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState<LocalePreference>("system");
  const [hydrated, setHydrated] = useState(false);
  const locale = preference === "system" ? systemLocale() : preference;

  useEffect(() => {
    let cancelled = false;
    const syncFromSession = (nextPreference: LocalePreference) => {
      if (!cancelled) {
        setPreference(nextPreference);
      }
    };
    localeListeners.add(syncFromSession);
    void getStoredValue(LOCALE_STORAGE_KEY)
      .then((storedPreference) => {
        if (!cancelled) {
          setPreference(normalizePreference(storedPreference));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setHydrated(true);
        }
      });
    return () => {
      cancelled = true;
      localeListeners.delete(syncFromSession);
    };
  }, []);

  const setLocalePreference = useCallback(async (nextPreference: LocalePreference) => {
    setPreference(nextPreference);
    await setStoredValue(LOCALE_STORAGE_KEY, nextPreference);
    void patchProfileLocale(nextPreference);
  }, []);

  const t = useCallback(
    (key: TranslationKey, values?: TranslationValues) =>
      interpolate(translations[locale][key] ?? translations.en[key] ?? key, values),
    [locale],
  );

  const value = useMemo(
    () => ({
      locale,
      preference: hydrated ? preference : "system",
      setLocalePreference,
      t,
    }),
    [hydrated, locale, preference, setLocalePreference, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (context) {
    return context;
  }
  return {
    locale: "en" as const,
    preference: "system" as const,
    setLocalePreference: async () => undefined,
    t: (key: TranslationKey, values?: TranslationValues) =>
      interpolate(translations.en[key] ?? key, values),
  };
}

export function useT() {
  return useI18n().t;
}
