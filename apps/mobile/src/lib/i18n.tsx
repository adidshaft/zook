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
  | "app.loadingSession"
  | "app.configErrorTitle"
  | "app.configErrorBody"
  | "common.cancel"
  | "common.datePicker"
  | "common.dismiss"
  | "common.done"
  | "common.or"
  | "network.offline"
  | "nav.home"
  | "nav.plans"
  | "nav.billing"
  | "nav.checkIn"
  | "nav.coaching"
  | "nav.scan"
  | "nav.diet"
  | "nav.tracking"
  | "nav.more"
  | "nav.shop"
  | "nav.inbox"
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
  | "nav.payouts"
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
  | "auth.continueWithApple"
  | "auth.continueWithGoogle"
  | "auth.legalPrefix"
  | "auth.legalTerms"
  | "auth.legalJoiner"
  | "auth.legalPrivacy"
  | "auth.openTerms"
  | "auth.openPrivacy"
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
  | "member.coaching.active"
  | "member.coaching.browsePtPackages"
  | "member.coaching.completedCount"
  | "member.coaching.ends"
  | "member.coaching.noActiveCoaching"
  | "member.coaching.noActiveCoachingBody"
  | "member.coaching.noPackagesAvailable"
  | "member.coaching.noPackagesAvailableBody"
  | "member.coaching.noSessionsYet"
  | "member.coaching.noSessionsYetBody"
  | "member.coaching.pending"
  | "member.coaching.recentSessions"
  | "member.coaching.requesting"
  | "member.coaching.requestSent"
  | "member.coaching.requestThisPackage"
  | "member.coaching.sessionsCount"
  | "member.coaching.sessionsLeft"
  | "member.coaching.subtitle"
  | "member.coaching.title"
  | "member.coaching.trainerFallback"
  | "member.coaching.trainingSession"
  | "member.coaching.viewDietPlan"
  | "member.coaching.yourCoach"
  | "member.coaching.yourTrainer"
  | "member.home.accessActive"
  | "member.home.active"
  | "member.home.activeCheckIn"
  | "member.home.activeCheckInHint"
  | "member.home.browsePlansToStart"
  | "member.home.currentBranch"
  | "member.home.daysLeft"
  | "member.home.dayStreak"
  | "member.home.getMembership"
  | "member.home.greeting"
  | "member.home.gymFallback"
  | "member.home.habits"
  | "member.home.membershipAccess"
  | "member.home.membershipAccessibility"
  | "member.home.membershipActive"
  | "member.home.noActiveMembership"
  | "member.home.openProgress"
  | "member.home.renewMembership"
  | "member.home.renewalNeeded"
  | "member.home.stopSession"
  | "member.home.stoppingSession"
  | "member.home.visits"
  | "member.home.visitsLeft"
  | "member.home.workouts"
  | "member.plan.assignedPlan"
  | "member.plan.coachGuided"
  | "member.plan.couldNotLoadExercises"
  | "member.plan.dietTab"
  | "member.plan.insideThisPlan"
  | "member.plan.morePlans"
  | "member.plan.noExercises"
  | "member.plan.noPlanAssigned"
  | "member.plan.noPlanAssignedBody"
  | "member.plan.openTodayPlan"
  | "member.plan.percentComplete"
  | "member.plan.planMeta"
  | "member.plan.progress"
  | "member.plan.title"
  | "member.plan.todaysWorkout"
  | "member.plan.trainerAssigned"
  | "member.plan.viewFullExerciseList"
  | "member.plan.workoutTab"
  | "member.progress.history"
  | "member.progress.logWorkout"
  | "member.progress.noWorkoutsLogged"
  | "member.progress.noWorkoutsLoggedBody"
  | "member.progress.privacyNote"
  | "member.progress.recentWorkouts"
  | "member.progress.thisWeek"
  | "member.progress.title"
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
  | "more.profile.title"
  | "more.profile.subtitle"
  | "more.settings.title"
  | "more.settings.subtitle"
  | "more.fallbackName"
  | "owner.home.activeMembers"
  | "owner.home.allClear"
  | "owner.home.approvals"
  | "owner.home.approvalsWaiting"
  | "owner.home.approvalsWaitingSubtitle"
  | "owner.home.billingSetupBody"
  | "owner.home.billingSetupRequired"
  | "owner.home.collectedPickup"
  | "owner.home.createMembershipPlans"
  | "owner.home.displayCheckInQr"
  | "owner.home.expiringSoon"
  | "owner.home.expiringSoonSubtitle"
  | "owner.home.finishGymSetup"
  | "owner.home.gymFallback"
  | "owner.home.inviteStaff"
  | "owner.home.join"
  | "owner.home.lowStock"
  | "owner.home.lowStockSubtitle"
  | "owner.home.mainBranch"
  | "owner.home.membership"
  | "owner.home.memberships"
  | "owner.home.needsAttention"
  | "owner.home.open"
  | "owner.home.openBilling"
  | "owner.home.paymentExceptions"
  | "owner.home.paymentExceptionsSubtitle"
  | "owner.home.pendingReviews"
  | "owner.home.productIs"
  | "owner.home.productsAre"
  | "owner.home.request"
  | "owner.home.requests"
  | "owner.home.revenue"
  | "owner.home.review"
  | "owner.home.reviews"
  | "owner.home.scan"
  | "owner.home.setup"
  | "owner.home.shareJoinLink"
  | "owner.home.shareJoinMessage"
  | "owner.home.today"
  | "owner.home.todayCheckIns"
  | "owner.home.transactionNeeds"
  | "owner.home.transactionsNeed"
  | "owner.members.day"
  | "owner.members.days"
  | "owner.members.daysLeft"
  | "owner.members.expiringReminderBody"
  | "owner.members.expiringReminderTitle"
  | "owner.members.reminderNotSent"
  | "owner.members.reminderSent"
  | "owner.members.sendReminder"
  | "owner.members.soon"
  | "owner.members.title"
  | "owner.members.total"
  | "owner.members.tryAgain"
  | "owner.revenue.noPaymentsYet"
  | "owner.revenue.noPaymentsYetBody"
  | "owner.revenue.paymentFallback"
  | "owner.revenue.pickupPending"
  | "owner.revenue.recentTransactions"
  | "owner.revenue.refund"
  | "owner.revenue.refundAccessibility"
  | "owner.revenue.refundPaymentBody"
  | "owner.revenue.refundPaymentTitle"
  | "owner.revenue.refundedByGym"
  | "owner.revenue.shopPickupOrder"
  | "owner.revenue.tapToRefund"
  | "owner.revenue.thisMember"
  | "owner.revenue.title"
  | "trainer.home.activePlanWork"
  | "trainer.home.activePlanWorkSubtitle"
  | "trainer.home.activePlanWorkTitle"
  | "trainer.home.activePlans"
  | "trainer.home.classes"
  | "trainer.home.classesSubtitle"
  | "trainer.home.client"
  | "trainer.home.clientFallback"
  | "trainer.home.clientHas"
  | "trainer.home.clientPlanSubtitle"
  | "trainer.home.clients"
  | "trainer.home.clientsHave"
  | "trainer.home.clientsNeedPlan"
  | "trainer.home.createPlanNext"
  | "trainer.home.createPlansManually"
  | "trainer.home.noCoachingActions"
  | "trainer.home.noCoachingActionsBody"
  | "trainer.home.noRecentFeedback"
  | "trainer.home.noRecentFeedbackBody"
  | "trainer.home.needsPlan"
  | "trainer.home.openClasses"
  | "trainer.home.openClients"
  | "trainer.home.openPersonalTraining"
  | "trainer.home.personalTraining"
  | "trainer.home.personalTrainingSubtitle"
  | "trainer.home.plan"
  | "trainer.home.planBuilder"
  | "trainer.home.planQueueClear"
  | "trainer.home.planQueueClearBody"
  | "trainer.home.plans"
  | "trainer.home.recentFeedback"
  | "trainer.home.referGym"
  | "trainer.home.referGymAccessibility"
  | "trainer.home.referGymSubtitle"
  | "trainer.home.today"
  | "trainer.home.trainerFallback"
  | "trainer.home.trainerPlanningQueue"
  | "trainer.clients.activePlanCount"
  | "trainer.clients.generalFitness"
  | "trainer.clients.noClients"
  | "trainer.clients.noClientsBody"
  | "trainer.clients.noMatchingClients"
  | "trainer.clients.subtitle"
  | "trainer.clients.title"
  | "trainer.clients.tryAnotherSearch"
  | "trainer.pt.add"
  | "trainer.pt.adding"
  | "trainer.pt.allSessionsCompleted"
  | "trainer.pt.approve"
  | "trainer.pt.approving"
  | "trainer.pt.couldNotLoadMembers"
  | "trainer.pt.createPackage"
  | "trainer.pt.creating"
  | "trainer.pt.clientFallback"
  | "trainer.pt.daysCount"
  | "trainer.pt.edit"
  | "trainer.pt.keep"
  | "trainer.pt.logSession"
  | "trainer.pt.logging"
  | "trainer.pt.member"
  | "trainer.pt.new"
  | "trainer.pt.noMembersAvailable"
  | "trainer.pt.noPackagesYet"
  | "trainer.pt.noPackagesYetBody"
  | "trainer.pt.noPtClientsYet"
  | "trainer.pt.noPtClientsYetBody"
  | "trainer.pt.package"
  | "trainer.pt.packageName"
  | "trainer.pt.packageNamePlaceholder"
  | "trainer.pt.packages"
  | "trainer.pt.payment"
  | "trainer.pt.paymentMode.CASH"
  | "trainer.pt.paymentMode.DIRECT_UPI"
  | "trainer.pt.paymentMode.OTHER"
  | "trainer.pt.pending"
  | "trainer.pt.pendingRequests"
  | "trainer.pt.priceInr"
  | "trainer.pt.ptClients"
  | "trainer.pt.ptPackage"
  | "trainer.pt.recordClient"
  | "trainer.pt.recordClientWithPrice"
  | "trainer.pt.remove"
  | "trainer.pt.removePackageBody"
  | "trainer.pt.removePackageTitle"
  | "trainer.pt.removing"
  | "trainer.pt.savePackage"
  | "trainer.pt.sessions"
  | "trainer.pt.sessionsCount"
  | "trainer.pt.sessionsLeftShort"
  | "trainer.pt.subtitle"
  | "trainer.pt.title"
  | "trainer.pt.validDays"
  | "trainer.pt.yourPackages"
  | "trainer.pt.yourPtClients";

type TranslationValues = Record<string, string | number>;

const translations: Record<AppLocale, Record<TranslationKey, string>> = {
  en: {
    "app.loadingSession": "Restoring your Zook session...",
    "app.configErrorTitle": "Zook can't open in this build.",
    "app.configErrorBody": "Please update the app or contact support if this keeps happening.",
    "common.cancel": "Cancel",
    "common.datePicker": "Date picker",
    "common.dismiss": "Dismiss",
    "common.done": "Done",
    "common.or": "or",
    "network.offline": "Working offline. Data may be stale.",
    "nav.home": "Home",
    "nav.plans": "Plans",
    "nav.billing": "Billing",
    "nav.checkIn": "Check in",
    "nav.coaching": "Coaching",
    "nav.scan": "Scan",
    "nav.diet": "Diet",
    "nav.tracking": "Tracking",
    "nav.more": "More",
    "nav.shop": "Shop",
    "nav.inbox": "Inbox",
    "nav.trainer": "Trainer",
    "nav.clients": "Clients",
    "nav.drafts": "Drafts",
    "nav.desk": "Front desk",
    "nav.members": "Members",
    "nav.payments": "Payments",
    "nav.orders": "Orders",
    "nav.owner": "Owner",
    "nav.command": "Today",
    "nav.needs": "Needs",
    "nav.approvals": "Approvals",
    "nav.revenue": "Revenue",
    "nav.stock": "Stock",
    "nav.profile": "You",
    "nav.payouts": "Payouts",
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
    "auth.continueWithApple": "Continue with Apple",
    "auth.continueWithGoogle": "Continue with Google",
    "auth.legalPrefix": "By continuing you agree to our",
    "auth.legalTerms": "Terms",
    "auth.legalJoiner": "and",
    "auth.legalPrivacy": "Privacy Policy",
    "auth.openTerms": "Open Zook terms",
    "auth.openPrivacy": "Open Zook privacy policy",
    "auth.resendCode": "Resend code",
    "auth.resendIn": "Resend in {{seconds}}s",
    "auth.changeSignIn": "Change sign-in",
    "auth.testCode": "TEST CODE",
    "auth.enterIdentifier": "Enter your email or mobile number.",
    "auth.codeSent": "Code sent to {{identifier}}.",
    "auth.freshCodeSent": "New code sent to {{identifier}}.",
    "auth.signedIn": "Signed in.",
    "auth.invalidEmail": "Enter a valid email or mobile number.",
    "auth.invalidEmailOnly": "Enter a valid email address.",
    "auth.invalidMobile": "Enter a valid 10-digit mobile number.",
    "auth.sessionExpired": "Your session expired. Sign in again to continue.",
    "auth.sessionExpiredTitle": "Session expired",
    "auth.sessionExpiredBody": "Sign in again to continue.",
    "auth.verifyToContinue": "Verify it's you to continue.",
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
    "settings.exportRequested": "Export requested. You'll receive an email when the file is available.",
    "settings.deletionRequested": "Deletion requested. This is being reviewed before execution.",
    "settings.noExport": "No export request",
    "settings.noDeletion": "No deletion request",
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
    "shop.paymentSubtitle": "Your item is ready at the desk after payment.",
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
    "shop.noProductsFound": "No products",
    "findGyms.searchPlaceholder": "Search by gym, area, or pin code",
    "findGyms.cityPlaceholder": "Area, city, or pin code",
    "findGyms.deviceLocation": "Use device location",
    "findGyms.recentSearches": "Recent searches",
    "empty.loading": "Loading",
    "empty.loadingBody": "Loading details from your gym.",
    "tracking.bodyTimeline": "Photo timeline",
    "tracking.bodyTimelineSubtitle": "{{count}} body composition entries",
    "tracking.photoLogged": "Photo logged",
    "tracking.noPhoto": "No photo",
    "tracking.bodyComposition": "Body composition",
    "tracking.latestEntry": "Logged entry",
    "tracking.weight": "Weight",
    "tracking.bodyFat": "Body fat",
    "tracking.start": "Start",
    "tracking.end": "End",
    "tracking.duration": "Duration",
    "tracking.focus": "Focus",
    "tracking.totalDuration": "Total duration",
    "tracking.sessions": "Sessions",
    "common.seeAll": "See all",
    "member.coaching.active": "Active",
    "member.coaching.browsePtPackages": "Browse PT packages",
    "member.coaching.completedCount": "{{count}} completed",
    "member.coaching.ends": "Ends {{date}}",
    "member.coaching.noActiveCoaching": "No active coaching",
    "member.coaching.noActiveCoachingBody":
      "Browse PT packages below and request one — a trainer will confirm and collect payment.",
    "member.coaching.noPackagesAvailable": "No packages available",
    "member.coaching.noPackagesAvailableBody":
      "Check back later — trainers haven't published PT packages yet.",
    "member.coaching.noSessionsYet": "No sessions yet",
    "member.coaching.noSessionsYetBody": "Your logged sessions will appear here.",
    "member.coaching.pending": "Pending",
    "member.coaching.recentSessions": "Recent sessions",
    "member.coaching.requesting": "Requesting...",
    "member.coaching.requestSent": "Request sent — a trainer will confirm",
    "member.coaching.requestThisPackage": "Request this package",
    "member.coaching.sessionsCount": "{{count}} sessions",
    "member.coaching.sessionsLeft": "{{remaining}} of {{total}} sessions left",
    "member.coaching.subtitle": "Personal training with your coach.",
    "member.coaching.title": "Your coaching",
    "member.coaching.trainerFallback": "Trainer",
    "member.coaching.trainingSession": "Training session",
    "member.coaching.viewDietPlan": "View my diet plan",
    "member.coaching.yourCoach": "Your coach",
    "member.coaching.yourTrainer": "Your trainer",
    "member.home.accessActive": "Access active",
    "member.home.active": "Active",
    "member.home.activeCheckIn": "Active check-in",
    "member.home.activeCheckInHint": "Re-scan the branch QR to check out, or stop it here.",
    "member.home.browsePlansToStart": "Browse plans to start training here",
    "member.home.currentBranch": "Current branch",
    "member.home.daysLeft": "{{count}} days left",
    "member.home.dayStreak": "{{count}}-day streak",
    "member.home.getMembership": "Get membership",
    "member.home.greeting": "Hello, {{name}}",
    "member.home.gymFallback": "Gym",
    "member.home.habits": "Habits",
    "member.home.membershipAccess": "Membership access",
    "member.home.membershipAccessibility": "{{status}}. {{detail}}. {{gym}}.",
    "member.home.membershipActive": "Membership active",
    "member.home.noActiveMembership": "No active membership",
    "member.home.openProgress": "Open progress",
    "member.home.renewMembership": "Renew membership",
    "member.home.renewalNeeded": "Renewal needed",
    "member.home.stopSession": "Stop session",
    "member.home.stoppingSession": "Stopping...",
    "member.home.visits": "Visits",
    "member.home.visitsLeft": "{{count}} visits left",
    "member.home.workouts": "Workouts",
    "member.plan.assignedPlan": "Assigned plan",
    "member.plan.coachGuided": "Coach guided",
    "member.plan.couldNotLoadExercises": "Could not load exercises",
    "member.plan.dietTab": "Diet",
    "member.plan.insideThisPlan": "Inside this plan",
    "member.plan.morePlans": "More plans",
    "member.plan.noExercises": "No exercises",
    "member.plan.noPlanAssigned": "No plan assigned",
    "member.plan.noPlanAssignedBody": "Your trainer will assign a workout plan here.",
    "member.plan.openTodayPlan": "Open today plan",
    "member.plan.percentComplete": "{{percent}}% complete",
    "member.plan.planMeta": "{{kind}} · {{assignment}}",
    "member.plan.progress": "Progress",
    "member.plan.title": "Plan",
    "member.plan.todaysWorkout": "Today's workout",
    "member.plan.trainerAssigned": "trainer assigned",
    "member.plan.viewFullExerciseList": "View full exercise list",
    "member.plan.workoutTab": "Workout",
    "member.progress.history": "History",
    "member.progress.logWorkout": "Log workout",
    "member.progress.noWorkoutsLogged": "No workouts logged",
    "member.progress.noWorkoutsLoggedBody": "Log your first workout to start tracking your progress.",
    "member.progress.privacyNote": "Private entries stay with you unless you choose trainer visibility.",
    "member.progress.recentWorkouts": "Recent workouts",
    "member.progress.thisWeek": "This week",
    "member.progress.title": "Progress",
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
    "more.profile.title": "Profile",
    "more.profile.subtitle": "Membership details and personal info.",
    "more.settings.title": "Settings",
    "more.settings.subtitle": "Language, roles, privacy, and account.",
    "more.fallbackName": "Member",
    "owner.home.activeMembers": "Active members",
    "owner.home.allClear": "All clear",
    "owner.home.approvals": "Approvals",
    "owner.home.approvalsWaiting": "Approvals waiting",
    "owner.home.approvalsWaitingSubtitle": "{{join}} join {{joinLabel}} · {{scans}} scan {{scanLabel}}",
    "owner.home.billingSetupBody":
      "Trial access is on, but owner/admin writes need a SaaS mandate before the gym can operate normally.",
    "owner.home.billingSetupRequired": "Billing setup required",
    "owner.home.collectedPickup": "Collected + pickup",
    "owner.home.createMembershipPlans": "Create membership plans",
    "owner.home.displayCheckInQr": "Display your check-in QR",
    "owner.home.expiringSoon": "Expiring soon",
    "owner.home.expiringSoonSubtitle": "{{count}} active {{label}} in the next 7 days",
    "owner.home.finishGymSetup": "Finish gym setup",
    "owner.home.gymFallback": "Gym",
    "owner.home.inviteStaff": "Invite staff",
    "owner.home.join": "join",
    "owner.home.lowStock": "Low stock",
    "owner.home.lowStockSubtitle": "{{count}} {{label}} under threshold",
    "owner.home.mainBranch": "Main branch",
    "owner.home.membership": "membership",
    "owner.home.memberships": "memberships",
    "owner.home.needsAttention": "Needs attention",
    "owner.home.open": "Open",
    "owner.home.openBilling": "Open billing",
    "owner.home.paymentExceptions": "Payment exceptions",
    "owner.home.paymentExceptionsSubtitle": "{{count}} {{action}} review",
    "owner.home.pendingReviews": "{{count}} pending {{label}}",
    "owner.home.productIs": "product is",
    "owner.home.productsAre": "products are",
    "owner.home.request": "request",
    "owner.home.requests": "requests",
    "owner.home.revenue": "Revenue",
    "owner.home.review": "review",
    "owner.home.reviews": "reviews",
    "owner.home.scan": "scan",
    "owner.home.setup": "Setup",
    "owner.home.shareJoinLink": "Share your join link",
    "owner.home.shareJoinMessage": "Join my gym on Zook: {{url}}",
    "owner.home.today": "Today",
    "owner.home.todayCheckIns": "Today check-ins",
    "owner.home.transactionNeeds": "transaction needs",
    "owner.home.transactionsNeed": "transactions need",
    "owner.members.day": "day",
    "owner.members.days": "days",
    "owner.members.daysLeft": "{{count}} {{label}} left",
    "owner.members.expiringReminderBody": "Your membership ends on {{date}}. Renew in the app.",
    "owner.members.expiringReminderTitle": "Membership expiring soon",
    "owner.members.reminderNotSent": "Reminder not sent",
    "owner.members.reminderSent": "Reminder sent to {{name}}.",
    "owner.members.sendReminder": "Send reminder",
    "owner.members.soon": "soon",
    "owner.members.title": "Members",
    "owner.members.total": "{{count}} total",
    "owner.members.tryAgain": "Try again.",
    "owner.revenue.noPaymentsYet": "No payments yet",
    "owner.revenue.noPaymentsYetBody": "Payments and shop pickups will appear here as they come in.",
    "owner.revenue.paymentFallback": "payment",
    "owner.revenue.pickupPending": "Pickup pending",
    "owner.revenue.recentTransactions": "Recent transactions",
    "owner.revenue.refund": "Refund",
    "owner.revenue.refundAccessibility": "Refund {{name}}",
    "owner.revenue.refundPaymentBody": "Refund {{amount}} to {{name}}. This can't be undone.",
    "owner.revenue.refundPaymentTitle": "Refund payment?",
    "owner.revenue.refundedByGym": "Refunded by gym",
    "owner.revenue.shopPickupOrder": "Shop pickup order",
    "owner.revenue.tapToRefund": "Tap to refund",
    "owner.revenue.thisMember": "this member",
    "owner.revenue.title": "Revenue",
    "trainer.home.activePlanWork": "Active plan work",
    "trainer.home.activePlanWorkSubtitle": "Open Plan work to review what is in motion.",
    "trainer.home.activePlanWorkTitle": "{{count}} {{label}} active plan work",
    "trainer.home.activePlans": "Active plans",
    "trainer.home.classes": "Classes",
    "trainer.home.classesSubtitle": "Schedule group sessions members can book",
    "trainer.home.client": "client",
    "trainer.home.clientFallback": "Client",
    "trainer.home.clientHas": "client has",
    "trainer.home.clientPlanSubtitle": "{{count}} active {{label}} · {{goal}}",
    "trainer.home.clients": "Clients",
    "trainer.home.clientsHave": "clients have",
    "trainer.home.clientsNeedPlan": "{{count}} {{label}} need a plan",
    "trainer.home.createPlanNext": "Create plan next",
    "trainer.home.createPlansManually": "Create plans manually",
    "trainer.home.noCoachingActions": "No coaching actions today",
    "trainer.home.noCoachingActionsBody": "You're on top of your clients. New tasks will show up here.",
    "trainer.home.noRecentFeedback": "No recent feedback",
    "trainer.home.noRecentFeedbackBody": "Client workout feedback will appear here.",
    "trainer.home.needsPlan": "Needs plan",
    "trainer.home.openClasses": "Open classes",
    "trainer.home.openClients": "Open clients",
    "trainer.home.openPersonalTraining": "Open personal training",
    "trainer.home.personalTraining": "Personal Training",
    "trainer.home.personalTrainingSubtitle": "Your own packages and PT clients",
    "trainer.home.plan": "plan",
    "trainer.home.planBuilder": "Plan builder",
    "trainer.home.planQueueClear": "Plan queue clear",
    "trainer.home.planQueueClearBody": "Every client has an active plan. Nice work.",
    "trainer.home.plans": "plans",
    "trainer.home.recentFeedback": "Recent feedback",
    "trainer.home.referGym": "Refer a gym & earn",
    "trainer.home.referGymAccessibility": "Refer a gym to Zook and earn",
    "trainer.home.referGymSubtitle": "Earn cash when a gym you refer subscribes to Zook",
    "trainer.home.today": "Today",
    "trainer.home.trainerFallback": "Trainer",
    "trainer.home.trainerPlanningQueue": "Trainer planning queue",
    "trainer.clients.activePlanCount": "{{count}} active {{label}}",
    "trainer.clients.generalFitness": "General fitness",
    "trainer.clients.noClients": "No clients",
    "trainer.clients.noClientsBody": "No clients added by your gym.",
    "trainer.clients.noMatchingClients": "No matching clients",
    "trainer.clients.subtitle": "{{name}} · client list is access-controlled",
    "trainer.clients.title": "Clients",
    "trainer.clients.tryAnotherSearch": "Try another search or filter.",
    "trainer.pt.add": "Add",
    "trainer.pt.adding": "Adding...",
    "trainer.pt.allSessionsCompleted": "All sessions completed",
    "trainer.pt.approve": "Approve",
    "trainer.pt.approving": "Approving...",
    "trainer.pt.couldNotLoadMembers": "Could not load members",
    "trainer.pt.createPackage": "Create package",
    "trainer.pt.creating": "Creating...",
    "trainer.pt.clientFallback": "Client",
    "trainer.pt.daysCount": "{{count}} days",
    "trainer.pt.edit": "Edit",
    "trainer.pt.keep": "Keep",
    "trainer.pt.logSession": "Log session",
    "trainer.pt.logging": "Logging...",
    "trainer.pt.member": "Member",
    "trainer.pt.new": "New",
    "trainer.pt.noMembersAvailable": "No members available.",
    "trainer.pt.noPackagesYet": "No packages yet",
    "trainer.pt.noPackagesYetBody": "Create a PT package, then add clients to it.",
    "trainer.pt.noPtClientsYet": "No PT clients yet",
    "trainer.pt.noPtClientsYetBody": "Add a client to start coaching them one-on-one.",
    "trainer.pt.package": "Package",
    "trainer.pt.packageName": "Package name",
    "trainer.pt.packageNamePlaceholder": "1-on-1 Strength · 12 sessions",
    "trainer.pt.packages": "Packages",
    "trainer.pt.payment": "Payment",
    "trainer.pt.paymentMode.CASH": "Cash",
    "trainer.pt.paymentMode.DIRECT_UPI": "UPI",
    "trainer.pt.paymentMode.OTHER": "Other",
    "trainer.pt.pending": "Pending",
    "trainer.pt.pendingRequests": "Pending requests",
    "trainer.pt.priceInr": "Price (₹)",
    "trainer.pt.ptClients": "PT clients",
    "trainer.pt.ptPackage": "PT package",
    "trainer.pt.recordClient": "Record client",
    "trainer.pt.recordClientWithPrice": "Record client · {{price}}",
    "trainer.pt.remove": "Remove",
    "trainer.pt.removePackageBody": "{{name}} will no longer be available to members.",
    "trainer.pt.removePackageTitle": "Remove package?",
    "trainer.pt.removing": "Removing...",
    "trainer.pt.savePackage": "Save package",
    "trainer.pt.sessions": "Sessions",
    "trainer.pt.sessionsCount": "{{count}} sessions",
    "trainer.pt.sessionsLeftShort": "{{remaining}}/{{total}} left",
    "trainer.pt.subtitle": "Your own coaching packages and clients.",
    "trainer.pt.title": "Personal Training",
    "trainer.pt.validDays": "Valid days",
    "trainer.pt.yourPackages": "Your packages",
    "trainer.pt.yourPtClients": "Your PT clients",
  },
  hi: {
    "app.loadingSession": "आपका Zook सेशन वापस लाया जा रहा है...",
    "app.configErrorTitle": "इस बिल्ड में Zook नहीं खुल सकता.",
    "app.configErrorBody": "कृपया ऐप अपडेट करें या समस्या बनी रहे तो सपोर्ट से संपर्क करें.",
    "common.cancel": "रद्द करें",
    "common.datePicker": "तारीख चुनें",
    "common.dismiss": "बंद करें",
    "common.done": "हो गया",
    "common.or": "या",
    "network.offline": "आप ऑफलाइन हैं. डेटा पुराना हो सकता है.",
    "nav.home": "होम",
    "nav.plans": "प्लान",
    "nav.billing": "बिलिंग",
    "nav.checkIn": "चेक इन",
    "nav.coaching": "कोचिंग",
    "nav.scan": "स्कैन",
    "nav.diet": "डाइट",
    "nav.tracking": "ट्रैकिंग",
    "nav.more": "और",
    "nav.shop": "शॉप",
    "nav.inbox": "इनबॉक्स",
    "nav.trainer": "ट्रेनर",
    "nav.clients": "क्लाइंट",
    "nav.drafts": "ड्राफ्ट",
    "nav.desk": "फ्रंट डेस्क",
    "nav.members": "मेंबर",
    "nav.payments": "पेमेंट",
    "nav.orders": "ऑर्डर",
    "nav.owner": "ओनर",
    "nav.command": "आज",
    "nav.needs": "जरूरतें",
    "nav.approvals": "मंजूरी",
    "nav.revenue": "रेवेन्यू",
    "nav.stock": "स्टॉक",
    "nav.profile": "आप",
    "nav.payouts": "पेयआउट",
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
    "auth.continueWithApple": "Apple के साथ जारी रखें",
    "auth.continueWithGoogle": "Google के साथ जारी रखें",
    "auth.legalPrefix": "जारी रखकर आप हमारी",
    "auth.legalTerms": "Terms",
    "auth.legalJoiner": "और",
    "auth.legalPrivacy": "Privacy Policy",
    "auth.openTerms": "Zook terms खोलें",
    "auth.openPrivacy": "Zook privacy policy खोलें",
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
    "settings.exportRequested": "एक्सपोर्ट अनुरोध भेजा गया. फ़ाइल उपलब्ध होने पर आपको ईमेल मिलेगा.",
    "settings.deletionRequested":
      "डिलीशन अनुरोध भेजा गया. इसे लागू करने से पहले रिव्यू किया जाएगा.",
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
    "shop.paymentSubtitle": "भुगतान के बाद आपका आइटम डेस्क पर मिलेगा.",
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
    "findGyms.searchPlaceholder": "जिम, क्षेत्र या पिन कोड से खोजें",
    "findGyms.cityPlaceholder": "क्षेत्र, शहर या पिन कोड",
    "findGyms.deviceLocation": "डिवाइस लोकेशन इस्तेमाल करें",
    "findGyms.recentSearches": "हाल की खोजें",
    "empty.loading": "लोड हो रहा है",
    "empty.loadingBody": "आपके जिम की जानकारी लाई जा रही है.",
    "tracking.bodyTimeline": "फोटो टाइमलाइन",
    "tracking.bodyTimelineSubtitle": "{{count}} बॉडी कंपोजिशन एंट्री",
    "tracking.photoLogged": "फोटो लॉग हुई",
    "tracking.noPhoto": "फोटो नहीं",
    "tracking.bodyComposition": "बॉडी कंपोजिशन",
    "tracking.latestEntry": "लॉग एंट्री",
    "tracking.weight": "वजन",
    "tracking.bodyFat": "बॉडी फैट",
    "tracking.start": "शुरू",
    "tracking.end": "खत्म",
    "tracking.duration": "अवधि",
    "tracking.focus": "फोकस",
    "tracking.totalDuration": "कुल अवधि",
    "tracking.sessions": "सेशन",
    "common.seeAll": "सभी देखें",
    "member.coaching.active": "सक्रिय",
    "member.coaching.browsePtPackages": "PT पैकेज देखें",
    "member.coaching.completedCount": "{{count}} पूरे हुए",
    "member.coaching.ends": "{{date}} खत्म",
    "member.coaching.noActiveCoaching": "कोई सक्रिय कोचिंग नहीं",
    "member.coaching.noActiveCoachingBody":
      "नीचे PT पैकेज देखें और अनुरोध करें — ट्रेनर पुष्टि करके भुगतान लेगा.",
    "member.coaching.noPackagesAvailable": "कोई पैकेज उपलब्ध नहीं",
    "member.coaching.noPackagesAvailableBody":
      "बाद में देखें — ट्रेनरों ने अभी PT पैकेज प्रकाशित नहीं किए हैं.",
    "member.coaching.noSessionsYet": "अभी कोई सेशन नहीं",
    "member.coaching.noSessionsYetBody": "आपके लॉग किए हुए सेशन यहां दिखेंगे.",
    "member.coaching.pending": "पेंडिंग",
    "member.coaching.recentSessions": "हाल के सेशन",
    "member.coaching.requesting": "अनुरोध भेजा जा रहा है...",
    "member.coaching.requestSent": "अनुरोध भेजा गया — ट्रेनर पुष्टि करेगा",
    "member.coaching.requestThisPackage": "यह पैकेज अनुरोध करें",
    "member.coaching.sessionsCount": "{{count}} सेशन",
    "member.coaching.sessionsLeft": "{{remaining}} में से {{total}} सेशन बाकी",
    "member.coaching.subtitle": "अपने कोच के साथ पर्सनल ट्रेनिंग.",
    "member.coaching.title": "आपकी कोचिंग",
    "member.coaching.trainerFallback": "ट्रेनर",
    "member.coaching.trainingSession": "ट्रेनिंग सेशन",
    "member.coaching.viewDietPlan": "मेरा डाइट प्लान देखें",
    "member.coaching.yourCoach": "आपके कोच",
    "member.coaching.yourTrainer": "आपके ट्रेनर",
    "member.home.accessActive": "एक्सेस सक्रिय है",
    "member.home.active": "सक्रिय",
    "member.home.activeCheckIn": "सक्रिय चेक-इन",
    "member.home.activeCheckInHint": "चेक आउट करने के लिए ब्रांच QR फिर स्कैन करें, या यहां रोकें.",
    "member.home.browsePlansToStart": "यहां ट्रेनिंग शुरू करने के लिए प्लान देखें",
    "member.home.currentBranch": "मौजूदा ब्रांच",
    "member.home.daysLeft": "{{count}} दिन बाकी",
    "member.home.dayStreak": "{{count}} दिन की स्ट्रीक",
    "member.home.getMembership": "मेंबरशिप लें",
    "member.home.greeting": "नमस्ते, {{name}}",
    "member.home.gymFallback": "जिम",
    "member.home.habits": "आदतें",
    "member.home.membershipAccess": "मेंबरशिप एक्सेस",
    "member.home.membershipAccessibility": "{{status}}. {{detail}}. {{gym}}.",
    "member.home.membershipActive": "मेंबरशिप सक्रिय है",
    "member.home.noActiveMembership": "कोई सक्रिय मेंबरशिप नहीं",
    "member.home.openProgress": "प्रोग्रेस खोलें",
    "member.home.renewMembership": "मेंबरशिप रिन्यू करें",
    "member.home.renewalNeeded": "रिन्यूअल जरूरी है",
    "member.home.stopSession": "सेशन रोकें",
    "member.home.stoppingSession": "रुक रहा है...",
    "member.home.visits": "विजिट",
    "member.home.visitsLeft": "{{count}} विजिट बाकी",
    "member.home.workouts": "वर्कआउट",
    "member.plan.assignedPlan": "असाइन किया गया प्लान",
    "member.plan.coachGuided": "कोच गाइडेड",
    "member.plan.couldNotLoadExercises": "एक्सरसाइज लोड नहीं हो सकीं",
    "member.plan.dietTab": "डाइट",
    "member.plan.insideThisPlan": "इस प्लान में",
    "member.plan.morePlans": "और प्लान",
    "member.plan.noExercises": "कोई एक्सरसाइज नहीं",
    "member.plan.noPlanAssigned": "कोई प्लान असाइन नहीं",
    "member.plan.noPlanAssignedBody": "आपका ट्रेनर यहां वर्कआउट प्लान असाइन करेगा.",
    "member.plan.openTodayPlan": "आज का प्लान खोलें",
    "member.plan.percentComplete": "{{percent}}% पूरा",
    "member.plan.planMeta": "{{kind}} · {{assignment}}",
    "member.plan.progress": "प्रोग्रेस",
    "member.plan.title": "प्लान",
    "member.plan.todaysWorkout": "आज का वर्कआउट",
    "member.plan.trainerAssigned": "ट्रेनर ने असाइन किया",
    "member.plan.viewFullExerciseList": "पूरी एक्सरसाइज सूची देखें",
    "member.plan.workoutTab": "वर्कआउट",
    "member.progress.history": "हिस्ट्री",
    "member.progress.logWorkout": "वर्कआउट लॉग करें",
    "member.progress.noWorkoutsLogged": "कोई वर्कआउट लॉग नहीं",
    "member.progress.noWorkoutsLoggedBody": "प्रोग्रेस ट्रैक करने के लिए अपना पहला वर्कआउट लॉग करें.",
    "member.progress.privacyNote": "निजी एंट्री आपके पास रहती हैं जब तक आप ट्रेनर विजिबिलिटी नहीं चुनते.",
    "member.progress.recentWorkouts": "हाल के वर्कआउट",
    "member.progress.thisWeek": "इस हफ्ते",
    "member.progress.title": "प्रोग्रेस",
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
    "more.profile.title": "प्रोफाइल",
    "more.profile.subtitle": "मेम्बरशिप और व्यक्तिगत जानकारी.",
    "more.settings.title": "सेटिंग्स",
    "more.settings.subtitle": "भाषा, रोल, प्राइवेसी और अकाउंट.",
    "more.fallbackName": "मेंबर",
    "owner.home.activeMembers": "सक्रिय मेंबर",
    "owner.home.allClear": "सब ठीक",
    "owner.home.approvals": "मंजूरी",
    "owner.home.approvalsWaiting": "मंजूरी बाकी",
    "owner.home.approvalsWaitingSubtitle": "{{join}} जॉइन {{joinLabel}} · {{scans}} स्कैन {{scanLabel}}",
    "owner.home.billingSetupBody":
      "ट्रायल एक्सेस चालू है, लेकिन जिम सामान्य रूप से चलाने से पहले owner/admin बदलावों के लिए SaaS mandate चाहिए.",
    "owner.home.billingSetupRequired": "बिलिंग सेटअप जरूरी",
    "owner.home.collectedPickup": "कलेक्टेड + पिकअप",
    "owner.home.createMembershipPlans": "मेंबरशिप प्लान बनाएं",
    "owner.home.displayCheckInQr": "अपना चेक-इन QR दिखाएं",
    "owner.home.expiringSoon": "जल्द खत्म",
    "owner.home.expiringSoonSubtitle": "अगले 7 दिनों में {{count}} सक्रिय {{label}}",
    "owner.home.finishGymSetup": "जिम सेटअप पूरा करें",
    "owner.home.gymFallback": "जिम",
    "owner.home.inviteStaff": "स्टाफ आमंत्रित करें",
    "owner.home.join": "जॉइन",
    "owner.home.lowStock": "कम स्टॉक",
    "owner.home.lowStockSubtitle": "{{count}} {{label}} threshold से कम",
    "owner.home.mainBranch": "मुख्य ब्रांच",
    "owner.home.membership": "मेंबरशिप",
    "owner.home.memberships": "मेंबरशिप",
    "owner.home.needsAttention": "ध्यान चाहिए",
    "owner.home.open": "खोलें",
    "owner.home.openBilling": "बिलिंग खोलें",
    "owner.home.paymentExceptions": "पेमेंट अपवाद",
    "owner.home.paymentExceptionsSubtitle": "{{count}} {{action}} रिव्यू",
    "owner.home.pendingReviews": "{{count}} पेंडिंग {{label}}",
    "owner.home.productIs": "प्रोडक्ट है",
    "owner.home.productsAre": "प्रोडक्ट हैं",
    "owner.home.request": "रिक्वेस्ट",
    "owner.home.requests": "रिक्वेस्ट",
    "owner.home.revenue": "रेवेन्यू",
    "owner.home.review": "रिव्यू",
    "owner.home.reviews": "रिव्यू",
    "owner.home.scan": "स्कैन",
    "owner.home.setup": "सेटअप",
    "owner.home.shareJoinLink": "अपना जॉइन लिंक शेयर करें",
    "owner.home.shareJoinMessage": "Zook पर मेरे जिम से जुड़ें: {{url}}",
    "owner.home.today": "आज",
    "owner.home.todayCheckIns": "आज के चेक-इन",
    "owner.home.transactionNeeds": "ट्रांजैक्शन को चाहिए",
    "owner.home.transactionsNeed": "ट्रांजैक्शन को चाहिए",
    "owner.members.day": "दिन",
    "owner.members.days": "दिन",
    "owner.members.daysLeft": "{{count}} {{label}} बाकी",
    "owner.members.expiringReminderBody": "आपकी मेंबरशिप {{date}} को खत्म होती है. ऐप में रिन्यू करें.",
    "owner.members.expiringReminderTitle": "मेंबरशिप जल्द खत्म हो रही है",
    "owner.members.reminderNotSent": "रिमाइंडर नहीं भेजा गया",
    "owner.members.reminderSent": "{{name}} को रिमाइंडर भेजा गया.",
    "owner.members.sendReminder": "रिमाइंडर भेजें",
    "owner.members.soon": "जल्द",
    "owner.members.title": "मेंबर",
    "owner.members.total": "कुल {{count}}",
    "owner.members.tryAgain": "फिर कोशिश करें.",
    "owner.revenue.noPaymentsYet": "अभी कोई पेमेंट नहीं",
    "owner.revenue.noPaymentsYetBody": "पेमेंट और शॉप पिकअप आते ही यहां दिखेंगे.",
    "owner.revenue.paymentFallback": "पेमेंट",
    "owner.revenue.pickupPending": "पिकअप पेंडिंग",
    "owner.revenue.recentTransactions": "हाल के ट्रांजैक्शन",
    "owner.revenue.refund": "रिफंड",
    "owner.revenue.refundAccessibility": "{{name}} को रिफंड करें",
    "owner.revenue.refundPaymentBody": "{{name}} को {{amount}} रिफंड करें. इसे वापस नहीं किया जा सकता.",
    "owner.revenue.refundPaymentTitle": "पेमेंट रिफंड करें?",
    "owner.revenue.refundedByGym": "जिम द्वारा रिफंड",
    "owner.revenue.shopPickupOrder": "शॉप पिकअप ऑर्डर",
    "owner.revenue.tapToRefund": "रिफंड के लिए टैप करें",
    "owner.revenue.thisMember": "इस मेंबर",
    "owner.revenue.title": "रेवेन्यू",
    "trainer.home.activePlanWork": "सक्रिय प्लान काम",
    "trainer.home.activePlanWorkSubtitle": "जो चल रहा है उसे देखने के लिए Plan work खोलें.",
    "trainer.home.activePlanWorkTitle": "{{count}} {{label}} सक्रिय प्लान काम",
    "trainer.home.activePlans": "सक्रिय प्लान",
    "trainer.home.classes": "क्लासेस",
    "trainer.home.classesSubtitle": "ग्रुप सेशन शेड्यूल करें जिन्हें मेंबर बुक कर सकें",
    "trainer.home.client": "क्लाइंट",
    "trainer.home.clientFallback": "क्लाइंट",
    "trainer.home.clientHas": "क्लाइंट के पास",
    "trainer.home.clientPlanSubtitle": "{{count}} सक्रिय {{label}} · {{goal}}",
    "trainer.home.clients": "क्लाइंट",
    "trainer.home.clientsHave": "क्लाइंट्स के पास",
    "trainer.home.clientsNeedPlan": "{{count}} {{label}} को प्लान चाहिए",
    "trainer.home.createPlanNext": "अगला प्लान बनाएं",
    "trainer.home.createPlansManually": "प्लान मैन्युअली बनाएं",
    "trainer.home.noCoachingActions": "आज कोई कोचिंग एक्शन नहीं",
    "trainer.home.noCoachingActionsBody": "आपके क्लाइंट संभले हुए हैं. नए काम यहां दिखेंगे.",
    "trainer.home.noRecentFeedback": "हाल की कोई फीडबैक नहीं",
    "trainer.home.noRecentFeedbackBody": "क्लाइंट वर्कआउट फीडबैक यहां दिखेगी.",
    "trainer.home.needsPlan": "प्लान चाहिए",
    "trainer.home.openClasses": "क्लासेस खोलें",
    "trainer.home.openClients": "क्लाइंट खोलें",
    "trainer.home.openPersonalTraining": "पर्सनल ट्रेनिंग खोलें",
    "trainer.home.personalTraining": "पर्सनल ट्रेनिंग",
    "trainer.home.personalTrainingSubtitle": "आपके पैकेज और PT क्लाइंट",
    "trainer.home.plan": "प्लान",
    "trainer.home.planBuilder": "प्लान बिल्डर",
    "trainer.home.planQueueClear": "प्लान क्यू साफ",
    "trainer.home.planQueueClearBody": "हर क्लाइंट के पास सक्रिय प्लान है. अच्छा काम.",
    "trainer.home.plans": "प्लान",
    "trainer.home.recentFeedback": "हाल की फीडबैक",
    "trainer.home.referGym": "जिम रेफर करें और कमाएं",
    "trainer.home.referGymAccessibility": "Zook को जिम रेफर करें और कमाएं",
    "trainer.home.referGymSubtitle": "आपके रेफर किए जिम के Zook subscribe करने पर cash कमाएं",
    "trainer.home.today": "आज",
    "trainer.home.trainerFallback": "ट्रेनर",
    "trainer.home.trainerPlanningQueue": "ट्रेनर प्लानिंग क्यू",
    "trainer.clients.activePlanCount": "{{count}} सक्रिय {{label}}",
    "trainer.clients.generalFitness": "सामान्य फिटनेस",
    "trainer.clients.noClients": "कोई क्लाइंट नहीं",
    "trainer.clients.noClientsBody": "आपके जिम ने कोई क्लाइंट नहीं जोड़ा.",
    "trainer.clients.noMatchingClients": "कोई मेल खाता क्लाइंट नहीं",
    "trainer.clients.subtitle": "{{name}} · क्लाइंट सूची access-controlled है",
    "trainer.clients.title": "क्लाइंट",
    "trainer.clients.tryAnotherSearch": "दूसरी खोज या फिल्टर आजमाएं.",
    "trainer.pt.add": "जोड़ें",
    "trainer.pt.adding": "जोड़ा जा रहा है...",
    "trainer.pt.allSessionsCompleted": "सभी सेशन पूरे",
    "trainer.pt.approve": "मंजूर करें",
    "trainer.pt.approving": "मंजूर हो रहा है...",
    "trainer.pt.couldNotLoadMembers": "मेंबर लोड नहीं हो सके",
    "trainer.pt.createPackage": "पैकेज बनाएं",
    "trainer.pt.creating": "बन रहा है...",
    "trainer.pt.clientFallback": "क्लाइंट",
    "trainer.pt.daysCount": "{{count}} दिन",
    "trainer.pt.edit": "एडिट",
    "trainer.pt.keep": "रखें",
    "trainer.pt.logSession": "सेशन लॉग करें",
    "trainer.pt.logging": "लॉग हो रहा है...",
    "trainer.pt.member": "मेंबर",
    "trainer.pt.new": "नया",
    "trainer.pt.noMembersAvailable": "कोई मेंबर उपलब्ध नहीं.",
    "trainer.pt.noPackagesYet": "अभी कोई पैकेज नहीं",
    "trainer.pt.noPackagesYetBody": "PT पैकेज बनाएं, फिर उसमें क्लाइंट जोड़ें.",
    "trainer.pt.noPtClientsYet": "अभी कोई PT क्लाइंट नहीं",
    "trainer.pt.noPtClientsYetBody": "वन-ऑन-वन कोचिंग शुरू करने के लिए क्लाइंट जोड़ें.",
    "trainer.pt.package": "पैकेज",
    "trainer.pt.packageName": "पैकेज नाम",
    "trainer.pt.packageNamePlaceholder": "1-on-1 Strength · 12 sessions",
    "trainer.pt.packages": "पैकेज",
    "trainer.pt.payment": "पेमेंट",
    "trainer.pt.paymentMode.CASH": "कैश",
    "trainer.pt.paymentMode.DIRECT_UPI": "UPI",
    "trainer.pt.paymentMode.OTHER": "अन्य",
    "trainer.pt.pending": "पेंडिंग",
    "trainer.pt.pendingRequests": "पेंडिंग अनुरोध",
    "trainer.pt.priceInr": "कीमत (₹)",
    "trainer.pt.ptClients": "PT क्लाइंट",
    "trainer.pt.ptPackage": "PT पैकेज",
    "trainer.pt.recordClient": "क्लाइंट रिकॉर्ड करें",
    "trainer.pt.recordClientWithPrice": "क्लाइंट रिकॉर्ड करें · {{price}}",
    "trainer.pt.remove": "हटाएं",
    "trainer.pt.removePackageBody": "{{name}} अब मेंबरों के लिए उपलब्ध नहीं रहेगा.",
    "trainer.pt.removePackageTitle": "पैकेज हटाएं?",
    "trainer.pt.removing": "हटाया जा रहा है...",
    "trainer.pt.savePackage": "पैकेज सेव करें",
    "trainer.pt.sessions": "सेशन",
    "trainer.pt.sessionsCount": "{{count}} सेशन",
    "trainer.pt.sessionsLeftShort": "{{remaining}}/{{total}} बाकी",
    "trainer.pt.subtitle": "आपके कोचिंग पैकेज और क्लाइंट.",
    "trainer.pt.title": "पर्सनल ट्रेनिंग",
    "trainer.pt.validDays": "मान्य दिन",
    "trainer.pt.yourPackages": "आपके पैकेज",
    "trainer.pt.yourPtClients": "आपके PT क्लाइंट",
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
