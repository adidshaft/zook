import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getStoredValue, setStoredValue } from "./storage";

const LOCALE_STORAGE_KEY = "zook_mobile_locale";
const SESSION_STORAGE_KEY = "zook_session";
const localeListeners = new Set<(preference: LocalePreference) => void>();
let runtimePreference: LocalePreference = "system";

export type AppLocale = "en" | "hi";
export type LocalePreference = "system" | AppLocale;

export type TranslationKey =
  | "app.loadingSession"
  | "app.launchTagline"
  | "app.configErrorTitle"
  | "app.configErrorBody"
  | "common.cancel"
  | "common.confirm"
  | "common.actionFailed"
  | "common.datePicker"
  | "common.back"
  | "common.dismiss"
  | "common.done"
  | "common.scheduled"
  | "common.today"
  | "common.tomorrow"
  | "common.or"
  | "common.saving"
  | "common.authenticationRequired"
  | "common.activeGymRequired"
  | "common.closeSheet"
  | "common.dismissNotification"
  | "common.tryAgain"
  | "common.tryAgainMoment"
  | "common.ok"
  | "common.notNow"
  | "common.enable"
  | "common.plusCount"
  | "network.timeout"
  | "network.connectionUnavailable"
  | "auth.biometricPromptBody"
  | "auth.biometricPromptTitle"
  | "auth.gymUnavailableForAccount"
  | "auth.roleUnavailableForOrg"
  | "auth.socialNoToken"
  | "auth.socialUnavailable"
  | "approvalQueue.approve"
  | "approvalQueue.approving"
  | "approvalQueue.reject"
  | "approvalQueue.rejecting"
  | "branch.removedSwitched"
  | "privilegedAction.pinLoading"
  | "payments.statusRefreshed"
  | "routeGuard.billingSetupRequiredBody"
  | "routeGuard.permissionDeniedBody"
  | "routeGuard.permissionDeniedTitle"
  | "webHandoff.copyLink"
  | "webHandoff.linkCopied"
  | "webHandoff.manageOnWeb"
  | "webHandoff.open"
  | "webHandoff.subtitleDefault"
  | "payments.mutation.paymentRecordFailed"
  | "payments.mutation.paymentRecorded"
  | "payments.mutation.refundFailed"
  | "payments.mutation.refundIssued"
  | "payments.mutation.testCompleted"
  | "payments.mutation.testFailed"
  | "shop.mutation.orderCreateFailed"
  | "shop.mutation.orderCreated"
  | "shop.mutation.pickupFulfillFailed"
  | "shop.mutation.pickupFulfilled"
  | "gym.mutation.reviewFailed"
  | "gym.mutation.reviewThanks"
  | "gym.mutation.signInReview"
  | "plans.mutation.progressFailed"
  | "plans.mutation.progressSaved"
  | "rewards.mutation.signInWithdrawal"
  | "rewards.mutation.withdrawalFailed"
  | "rewards.mutation.withdrawalRequested"
  | "exerciseTemplates.mutation.removeFailed"
  | "exerciseTemplates.mutation.removeSuccess"
  | "exerciseTemplates.mutation.saveFailed"
  | "exerciseTemplates.mutation.saveSuccess"
  | "exerciseTemplates.mutation.signInRemove"
  | "exerciseTemplates.mutation.signInSave"
  | "owner.mutation.billingMandateCreated"
  | "owner.mutation.billingMandateFailed"
  | "owner.mutation.checkoutFailed"
  | "owner.mutation.checkoutStarted"
  | "owner.mutation.couponRemoveFailed"
  | "owner.mutation.couponRemoved"
  | "owner.mutation.couponSaveFailed"
  | "owner.mutation.couponSaved"
  | "owner.mutation.inviteFailed"
  | "owner.mutation.inviteSent"
  | "owner.mutation.joinApproveFailed"
  | "owner.mutation.joinApproved"
  | "owner.mutation.joinRejectFailed"
  | "owner.mutation.joinRejected"
  | "owner.mutation.payoutMarkFailed"
  | "owner.mutation.payoutMarkedPaid"
  | "owner.mutation.payoutSettingsFailed"
  | "owner.mutation.payoutSettingsSaved"
  | "owner.mutation.planRemoveFailed"
  | "owner.mutation.planRemoved"
  | "owner.mutation.planSaveFailed"
  | "owner.mutation.planSaved"
  | "owner.mutation.referralFailed"
  | "owner.mutation.referralSaved"
  | "owner.mutation.roleUpdateFailed"
  | "owner.mutation.roleUpdated"
  | "owner.mutation.staffRemoveFailed"
  | "owner.mutation.staffRemoved"
  | "owner.mutation.subscriptionCancelFailed"
  | "owner.mutation.subscriptionCancellationScheduled"
  | "trainer.mutation.attendanceUpdateFailed"
  | "trainer.mutation.classCancelFailed"
  | "trainer.mutation.classCancelled"
  | "trainer.mutation.classScheduleFailed"
  | "trainer.mutation.classScheduled"
  | "trainer.mutation.classUpdateFailed"
  | "trainer.mutation.classUpdated"
  | "trainer.mutation.dietPublishFailed"
  | "trainer.mutation.dietPublished"
  | "trainer.mutation.packageCreateFailed"
  | "trainer.mutation.packageCreated"
  | "trainer.mutation.packageRemoveFailed"
  | "trainer.mutation.packageRemoved"
  | "trainer.mutation.packageUpdateFailed"
  | "trainer.mutation.packageUpdated"
  | "trainer.mutation.payoutSettingsFailed"
  | "trainer.mutation.payoutSettingsSaved"
  | "trainer.mutation.profileFailed"
  | "trainer.mutation.profileSaved"
  | "trainer.mutation.ptClientAddFailed"
  | "trainer.mutation.ptClientAdded"
  | "trainer.mutation.ptRequestApproveFailed"
  | "trainer.mutation.ptRequestApproved"
  | "trainer.mutation.sessionLogFailed"
  | "trainer.mutation.sessionLogged"
  | "network.offline"
  | "notFound.body"
  | "notFound.goWorkspace"
  | "notFound.helper"
  | "notFound.title"
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
  | "nav.entryQr"
  | "notifications.today"
  | "notifications.yesterday"
  | "notifications.earlierThisWeek"
  | "notifications.older"
  | "notifications.allCaughtUp"
  | "notifications.allCaughtUpRecent"
  | "notifications.allMarkedRead"
  | "notifications.attendanceAlertReceived"
  | "notifications.backToInbox"
  | "notifications.closeDetails"
  | "notifications.couldNotUpdate"
  | "notifications.couldNotUpdateMany"
  | "notifications.done"
  | "notifications.emptyBody"
  | "notifications.emptyTitle"
  | "notifications.fallbackTitle"
  | "notifications.linkedActions"
  | "notifications.linkedActionsBody"
  | "notifications.markAllRead"
  | "notifications.markRead"
  | "notifications.markedRead"
  | "notifications.noDetails"
  | "notifications.openedFromPush"
  | "notifications.openingSuffix"
  | "notifications.openLinkedScreen"
  | "notifications.showFewer"
  | "notifications.showFewerOlder"
  | "notifications.showOlder"
  | "notifications.showOlderCount"
  | "notifications.timeDays"
  | "notifications.timeHours"
  | "notifications.timeMinutes"
  | "notifications.timeNow"
  | "notifications.totalMessages"
  | "notifications.totalMessagesBody"
  | "notifications.unread"
  | "notifications.unreadBody"
  | "notifications.unreadCount"
  | "notifications.unreadRecent"
  | "platform.billing"
  | "platform.gymSubtitle"
  | "platform.gyms"
  | "platform.loadingSubscriptionHealth"
  | "platform.mandateMeta"
  | "platform.missing"
  | "platform.mobileVisibilityBody"
  | "platform.mobileVisibilityTitle"
  | "platform.notScheduled"
  | "platform.openWebDashboard"
  | "platform.operator"
  | "platform.paying"
  | "platform.recentGyms"
  | "platform.referrals"
  | "platform.saasHealth"
  | "platform.signOut"
  | "platform.subtitle"
  | "platform.team"
  | "platform.trial"
  | "platform.updating"
  | "auth.heroEyebrow"
  | "auth.heroBody"
  | "auth.signIn"
  | "auth.verifyCode"
  | "auth.identifierSubtitle"
  | "auth.otpSubtitle"
  | "auth.memberPathBody"
  | "auth.memberPathTitle"
  | "auth.staffPathBody"
  | "auth.staffPathTitle"
  | "auth.trainerPathBody"
  | "auth.trainerPathTitle"
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
  | "auth.tooManyAttempts"
  | "auth.qaShortcuts"
  | "assistant.attachSummary"
  | "assistant.attachedClientData"
  | "assistant.attachedProfile"
  | "assistant.clear"
  | "assistant.clearConversation"
  | "assistant.clientData"
  | "assistant.contextActivePlans"
  | "assistant.contextAllergies"
  | "assistant.contextClient"
  | "assistant.contextDiet"
  | "assistant.contextGoal"
  | "assistant.contextPlans"
  | "assistant.contextWeight"
  | "assistant.copied"
  | "assistant.copyHint"
  | "assistant.inputPlaceholder"
  | "assistant.memberEyebrow"
  | "assistant.memberPromptFocus"
  | "assistant.memberPromptFood"
  | "assistant.memberPromptWorkout"
  | "assistant.memberStarter"
  | "assistant.memberSubtitle"
  | "assistant.memberTitle"
  | "assistant.myProfile"
  | "assistant.notSavedToastBody"
  | "assistant.notSavedToastTitle"
  | "assistant.resetToastBody"
  | "assistant.resetToastTitle"
  | "assistant.send"
  | "assistant.thinking"
  | "assistant.trainerEyebrow"
  | "assistant.trainerPromptPlan"
  | "assistant.trainerPromptSummary"
  | "assistant.trainerPromptSwaps"
  | "assistant.trainerStarter"
  | "assistant.trainerSubtitle"
  | "assistant.trainerTitle"
  | "assistant.unavailableBody"
  | "assistant.unavailableTitle"
  | "classRoster.attendanceHint"
  | "classRoster.bookedCount"
  | "classRoster.confirmed"
  | "classRoster.confirmedCount"
  | "classRoster.markedNoShowAccessibility"
  | "classRoster.markedPresentAccessibility"
  | "classRoster.markNoShowAccessibility"
  | "classRoster.markPresentAccessibility"
  | "classRoster.memberFallback"
  | "classRoster.noBookings"
  | "classRoster.noBookingsBody"
  | "classRoster.subtitle"
  | "classRoster.title"
  | "classRoster.waitlist"
  | "classRoster.waitlistCount"
  | "classRoster.waitlistHint"
  | "entryQr.branchAware"
  | "entryQr.branchAwareBody"
  | "entryQr.loadingQr"
  | "entryQr.manualCode"
  | "entryQr.noQr"
  | "entryQr.print"
  | "entryQr.regenerate"
  | "entryQr.refreshesIn"
  | "entryQr.refreshing"
  | "entryQr.refreshNow"
  | "entryQr.rollingMode"
  | "entryQr.secureToken"
  | "entryQr.secureTokenBody"
  | "entryQr.staticMode"
  | "entryQr.subtitle"
  | "entryQr.title"
  | "onboarding.allInOne"
  | "onboarding.allInOneCopy"
  | "onboarding.brand"
  | "onboarding.builtForGymDays"
  | "onboarding.changeLanguageAnytime"
  | "onboarding.continue"
  | "onboarding.continueToSignIn"
  | "onboarding.couldNotSaveLanguage"
  | "onboarding.couldNotSavePreference"
  | "onboarding.findGym"
  | "onboarding.findGymCopy"
  | "onboarding.pickLanguage"
  | "onboarding.skip"
  | "onboarding.skipIntro"
  | "onboarding.skipOnboarding"
  | "onboarding.splashBadge"
  | "onboarding.splashSubtitle"
  | "onboarding.trainTrack"
  | "onboarding.trainTrackCopy"
  | "qa.aarogyaGym"
  | "qa.adminApprovals"
  | "qa.adminHome"
  | "qa.adminMore"
  | "qa.adminStock"
  | "qa.gyms"
  | "qa.login"
  | "qa.memberAssistant"
  | "qa.memberAttendanceDetail"
  | "qa.memberClasses"
  | "qa.memberHistory"
  | "qa.memberHome"
  | "qa.memberMembership"
  | "qa.memberNotifications"
  | "qa.memberPlan"
  | "qa.memberProgress"
  | "qa.memberScan"
  | "qa.memberShop"
  | "qa.memberTrackingEntry"
  | "qa.ownerApprovals"
  | "qa.ownerBilling"
  | "qa.ownerHome"
  | "qa.ownerMemberDetail"
  | "qa.ownerMembers"
  | "qa.ownerMore"
  | "qa.ownerNotifications"
  | "qa.ownerRevenue"
  | "qa.ownerStock"
  | "qa.public"
  | "qa.receptionHome"
  | "qa.receptionMemberDetail"
  | "qa.receptionMembers"
  | "qa.receptionOrders"
  | "qa.receptionPayments"
  | "qa.receptionScan"
  | "qa.receptionVerification"
  | "qa.roles"
  | "qa.title"
  | "qa.trainerClientDetail"
  | "qa.trainerClientPlan"
  | "qa.trainerClientSessions"
  | "qa.trainerClients"
  | "qa.trainerHome"
  | "qa.trainerPayouts"
  | "qa.trainerPlans"
  | "qa.valueProps"
  | "settings.profileTitle"
  | "settings.profileSubtitle"
  | "settings.goBack"
  | "settings.account"
  | "settings.accountSubtitle"
  | "settings.addContact"
  | "settings.addFewDetails"
  | "settings.activeGymPreferenceNote"
  | "settings.appearanceSubtitle"
  | "settings.biometricUnlock"
  | "settings.signedIn"
  | "settings.contactVerification"
  | "settings.contactVerifiedUpdated"
  | "settings.couldNotSendOtp"
  | "settings.couldNotSendReport"
  | "settings.couldNotVerifyOtp"
  | "settings.currentValue"
  | "settings.enterCodeSentTo"
  | "settings.enterContactOtp"
  | "settings.enterEmail"
  | "settings.enterMobile"
  | "settings.enterSixDigitOtp"
  | "settings.useZookAs"
  | "settings.name"
  | "settings.email"
  | "settings.phone"
  | "settings.emailPlaceholder"
  | "settings.mobileNumber"
  | "settings.noEmailLinked"
  | "settings.noMobileLinked"
  | "settings.notSet"
  | "settings.otpFor"
  | "settings.problemDetails"
  | "settings.problemDetailsPlaceholder"
  | "settings.reportProblem"
  | "settings.reportProblemBody"
  | "settings.reportSent"
  | "settings.sendReport"
  | "settings.signInAgainContact"
  | "settings.supportContext"
  | "settings.supportDetailsPrompt"
  | "settings.terms"
  | "settings.termsSubtitle"
  | "settings.updateContact"
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
  | "settings.notificationsSubtitle"
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
  | "settings.preferenceNotSaved"
  | "settings.language"
  | "settings.languageSubtitle"
  | "settings.languageSystem"
  | "settings.languageEnglish"
  | "settings.languageHindi"
  | "settings.privacyData"
  | "settings.privacySubtitle"
  | "settings.privacyRequestBody"
  | "settings.privacyWarning"
  | "settings.requestAccountDeletion"
  | "settings.requestDataExport"
  | "settings.requestDeletion"
  | "settings.deleteConfirmTitle"
  | "settings.deleteConfirmBody"
  | "settings.export"
  | "settings.delete"
  | "settings.exportRequested"
  | "settings.deletionRequested"
  | "settings.noExport"
  | "settings.noDeletion"
  | "settings.system"
  | "settings.systemSubtitle"
  | "settings.supportSubtitle"
  | "settings.helpCenter"
  | "settings.helpCenterSubtitle"
  | "settings.privacyPolicy"
  | "settings.privacyPolicySubtitle"
  | "settings.theme"
  | "settings.verifyContactType"
  | "settings.version"
  | "settings.defaultRole"
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
  | "rewards.activity"
  | "rewards.earnCashPerGym"
  | "rewards.earnDaysPerGym"
  | "rewards.freeDaysAdded"
  | "rewards.lifetime"
  | "rewards.minToWithdraw"
  | "rewards.noEarningsYet"
  | "rewards.noEarningsYetBody"
  | "rewards.readyToWithdraw"
  | "rewards.request"
  | "rewards.requesting"
  | "rewards.requestWithdrawal"
  | "rewards.requestWithdrawalBody"
  | "rewards.requestWithdrawalTitle"
  | "rewards.shareMessage"
  | "rewards.shareHint"
  | "rewards.shareYourLink"
  | "rewards.status.clearing"
  | "rewards.status.paid"
  | "rewards.status.pending"
  | "rewards.status.ready"
  | "rewards.status.requested"
  | "rewards.status.reversed"
  | "rewards.subtitle"
  | "rewards.title"
  | "rewards.yourEarnings"
  | "referral.opening"
  | "referral.card.copyCodeAccessibility"
  | "referral.card.referFriend"
  | "referral.card.rewardCount"
  | "referral.card.rewardCount_plural"
  | "referral.card.shareCode"
  | "referral.card.unlimited"
  | "referral.card.used"
  | "branch.switch"
  | "branch.switchGym"
  | "branch.current"
  | "branch.currentGym"
  | "branch.branchPrefix"
  | "branch.allBranches"
  | "branch.branches"
  | "branch.enrolledGyms"
  | "branch.gymSubscriptionScope"
  | "branch.manageGym"
  | "branch.openMap"
  | "branch.mapReady"
  | "branch.mapMissing"
  | "branch.selectorSubtitle"
  | "branch.useBranch"
  | "branch.useGym"
  | "shop.readyForPickup"
  | "shop.readyForPickupSubtitle"
  | "shop.addShort"
  | "shop.addProductAccessibility"
  | "shop.availableAtGymDesk"
  | "shop.deskPickup"
  | "shop.pickupCode"
  | "shop.pickupCodeCopied"
  | "shop.pickupCodeCopyFailed"
  | "shop.pickupCodePending"
  | "shop.pending"
  | "shop.paid"
  | "shop.signedPickupQrCode"
  | "shop.branchLabel"
  | "shop.browserReturnBody"
  | "shop.cartReset"
  | "shop.cartResetBody"
  | "shop.categoryAll"
  | "shop.categoryCups"
  | "shop.categoryShake"
  | "shop.categorySupplements"
  | "shop.categoryTowel"
  | "shop.categoryWater"
  | "shop.checkStatus"
  | "shop.checking"
  | "shop.checkoutConsequence"
  | "shop.checkoutCreated"
  | "shop.deskPaymentOrderCreated"
  | "shop.codeWithValue"
  | "shop.continuePayment"
  | "shop.continueWithTotal"
  | "shop.continueInBrowser"
  | "shop.confirming"
  | "shop.awaitingDeskPayment"
  | "shop.choosePaymentMethod"
  | "shop.choosePaymentMethodSubtitle"
  | "shop.copyPickupCodeAccessibility"
  | "shop.couldNotCreateCheckout"
  | "shop.backToShop"
  | "shop.payment"
  | "shop.paymentSubtitle"
  | "shop.paymentConfirmed"
  | "shop.paymentCouldNotComplete"
  | "shop.paymentStillPending"
  | "shop.paymentPending"
  | "shop.payAtDesk"
  | "shop.payAtDeskBody"
  | "shop.payAtDeskInstructions"
  | "shop.payAtDeskSubtitle"
  | "shop.payOnline"
  | "shop.payOnlineBody"
  | "shop.payAmountNow"
  | "shop.payNow"
  | "shop.payAtDeskInstead"
  | "shop.otherPaymentOptions"
  | "shop.paySecurely"
  | "shop.confirmOrder"
  | "shop.getPickupCode"
  | "shop.makeDeskCode"
  | "shop.collectAtDesk"
  | "shop.showPickupCode"
  | "shop.showThisToCollect"
  | "shop.orderTotal"
  | "shop.pickupCheckout"
  | "shop.itemsLabel"
  | "shop.itemCount"
  | "shop.itemsCount"
  | "shop.pickupLabel"
  | "shop.selectedGym"
  | "shop.cart"
  | "shop.reviewOrder"
  | "shop.reviewOrderSubtitle"
  | "shop.back"
  | "shop.creating"
  | "shop.inStockCount"
  | "shop.mockPaymentUnavailable"
  | "shop.onlyLeft"
  | "shop.orderHistory"
  | "shop.orderHistorySubtitle"
  | "shop.activeOrders"
  | "shop.activeOrdersShort"
  | "shop.activeOrdersBody"
  | "shop.cartStatus"
  | "shop.cartStatusBody"
  | "shop.readyStock"
  | "shop.readyStockShort"
  | "shop.readyStockBody"
  | "shop.orderBeingPrepared"
  | "shop.orderCancelled"
  | "shop.orderNeedsPayment"
  | "shop.orderPickedUp"
  | "shop.orderReady"
  | "shop.orderReadyWithCode"
  | "shop.outOfStock"
  | "shop.outShort"
  | "shop.yourCartEmpty"
  | "shop.subtotal"
  | "shop.openMiniCart"
  | "shop.openCart"
  | "shop.deskPickup"
  | "shop.activeGym"
  | "shop.recently"
  | "shop.removeProductAccessibility"
  | "shop.searchEssentials"
  | "shop.availableNow"
  | "shop.searchResults"
  | "shop.title"
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
  | "findGyms.availableGyms"
  | "findGyms.allAreas"
  | "findGyms.city"
  | "findGyms.coverPhoto"
  | "findGyms.discovery"
  | "findGyms.gymNameOrUsername"
  | "findGyms.noGyms"
  | "findGyms.noGymsBody"
  | "findGyms.logo"
  | "findGyms.loadError"
  | "findGyms.openGym"
  | "findGyms.referralApplied"
  | "findGyms.referralPrefix"
  | "findGyms.referralSuffix"
  | "findGyms.resultCountMany"
  | "findGyms.resultCountOne"
  | "findGyms.searching"
  | "findGyms.searchLabel"
  | "findGyms.title"
  | "findGyms.view"
  | "findGyms.viewProfile"
  | "gymProfile.activeUntil"
  | "gymProfile.address"
  | "gymProfile.alreadyActive"
  | "gymProfile.apply"
  | "gymProfile.approvedDate"
  | "gymProfile.approvedForPayment"
  | "gymProfile.atAGlance"
  | "gymProfile.choosePlan"
  | "gymProfile.choosePlanToContinue"
  | "gymProfile.coaches"
  | "gymProfile.completeEarlierStep"
  | "gymProfile.couldNotLoad"
  | "gymProfile.currentMembership"
  | "gymProfile.dateRange"
  | "gymProfile.daysCount"
  | "gymProfile.demoTagline"
  | "gymProfile.distanceKm"
  | "gymProfile.distanceMeters"
  | "gymProfile.distanceUnavailable"
  | "gymProfile.equipment"
  | "gymProfile.eyebrow"
  | "gymProfile.flexibleMembership"
  | "gymProfile.getDirections"
  | "gymProfile.gettingThere"
  | "gymProfile.howToJoin"
  | "gymProfile.inside"
  | "gymProfile.instant"
  | "gymProfile.inviteCode"
  | "gymProfile.inviteOnly"
  | "gymProfile.inviteReferralRequired"
  | "gymProfile.inviteReferralRequiredBody"
  | "gymProfile.joinFlow"
  | "gymProfile.joinModeApproval"
  | "gymProfile.joinModeInvite"
  | "gymProfile.joinModeOpen"
  | "gymProfile.joinPath"
  | "gymProfile.joinRequest"
  | "gymProfile.location"
  | "gymProfile.membershipOptions"
  | "gymProfile.membershipProfile"
  | "gymProfile.membershipRequestSubmitted"
  | "gymProfile.membershipRequestSubmittedBody"
  | "gymProfile.membershipState"
  | "gymProfile.moveStraightToPayment"
  | "gymProfile.noBioAdded"
  | "gymProfile.noPublicPlans"
  | "gymProfile.noPublicTrainerProfiles"
  | "gymProfile.noTrainerBioPublished"
  | "gymProfile.notFound"
  | "gymProfile.notFoundBody"
  | "gymProfile.openTrainerProfile"
  | "gymProfile.openingPayment"
  | "gymProfile.overview"
  | "gymProfile.payAmountNow"
  | "gymProfile.paymentStarted"
  | "gymProfile.pendingSince"
  | "gymProfile.photoOf"
  | "gymProfile.planAvailableMany"
  | "gymProfile.planAvailableOne"
  | "gymProfile.planDescriptionHybrid"
  | "gymProfile.planDescriptionMonthly"
  | "gymProfile.planDescriptionTrial"
  | "gymProfile.planNameHybrid"
  | "gymProfile.planNameMonthly"
  | "gymProfile.planNameTrial"
  | "gymProfile.quickCheckout"
  | "gymProfile.quickCheckoutHint"
  | "gymProfile.tapPlanToChange"
  | "gymProfile.readyToJoin"
  | "gymProfile.recommendedCheckoutAbove"
  | "gymProfile.referralApplied"
  | "gymProfile.referralInviteRequired"
  | "gymProfile.referralPrice"
  | "gymProfile.requestMembershipFirst"
  | "gymProfile.requestMembershipFirstBody"
  | "gymProfile.reviewed"
  | "gymProfile.securePayment"
  | "gymProfile.selectPlanForCheckout"
  | "gymProfile.selectedForCheckout"
  | "gymProfile.selectedPlanHint"
  | "gymProfile.sendMembershipRequest"
  | "gymProfile.shareProfile"
  | "gymProfile.staffApprovalBeforePayment"
  | "gymProfile.standardMembershipPlan"
  | "gymProfile.stepActivatePlan"
  | "gymProfile.stepActivatePlanBody"
  | "gymProfile.stepBrowsePublicPlans"
  | "gymProfile.stepBrowsePublicPlansBody"
  | "gymProfile.stepPayInstantly"
  | "gymProfile.stepPayInstantlyBody"
  | "gymProfile.stepPaySecurely"
  | "gymProfile.stepPaySecurelyBody"
  | "gymProfile.stepReferralAttached"
  | "gymProfile.stepReferralRequired"
  | "gymProfile.stepReviewPlans"
  | "gymProfile.stepReviewPlansBody"
  | "gymProfile.stepSecureReferral"
  | "gymProfile.stepSendRequest"
  | "gymProfile.stepSendRequestBody"
  | "gymProfile.stepStaffReview"
  | "gymProfile.stepStaffReviewBody"
  | "gymProfile.stepStartTraining"
  | "gymProfile.stepStartTrainingBody"
  | "gymProfile.submitting"
  | "gymProfile.trainerTeam"
  | "gymProfile.unableStartPayment"
  | "gymProfile.unableSubmitMembershipRequest"
  | "gymProfile.updatingMembershipStatus"
  | "gymProfile.validityDays"
  | "gymProfile.visitCountMany"
  | "gymProfile.visitCountOne"
  | "gymProfile.visitsRemaining"
  | "gymProfile.whatsInside"
  | "gymReviews.beFirst"
  | "gymReviews.cancel"
  | "gymReviews.edit"
  | "gymReviews.editReview"
  | "gymReviews.empty"
  | "gymReviews.membersSay"
  | "gymReviews.onlyMembers"
  | "gymReviews.postReview"
  | "gymReviews.posting"
  | "gymReviews.reviews"
  | "gymReviews.reviewsCount"
  | "gymReviews.sharePlaceholder"
  | "gymReviews.starsAccessibility"
  | "gymReviews.update"
  | "gymReviews.write"
  | "gymReviews.writeReview"
  | "gallery.closePhotoViewer"
  | "empty.loading"
  | "empty.loadingBody"
  | "tracking.bodyTimeline"
  | "tracking.bodyTimelineSubtitle"
  | "tracking.addExercise"
  | "tracking.armsCm"
  | "tracking.body"
  | "tracking.bodyFatPercent"
  | "tracking.bodyMeasurements"
  | "tracking.bodyMeasurementsSaved"
  | "tracking.bodyProgress"
  | "tracking.moreMeasurements"
  | "tracking.hideMeasurements"
  | "tracking.calfCm"
  | "tracking.calvesCm"
  | "tracking.chestCm"
  | "tracking.couldNotSaveMeasurements"
  | "tracking.couldNotSaveWorkout"
  | "tracking.durationMinutes"
  | "tracking.exercise"
  | "tracking.exerciseName"
  | "tracking.exerciseNamePlaceholder"
  | "tracking.addExerciseToSave"
  | "tracking.forearmsCm"
  | "tracking.hipsCm"
  | "tracking.historyTitle"
  | "tracking.loggedWorkout"
  | "tracking.muscleMassKg"
  | "tracking.neckCm"
  | "tracking.noBodyMeasurements"
  | "tracking.noBodyMeasurementsBody"
  | "tracking.noWorkoutsYet"
  | "tracking.noWorkoutsYetBody"
  | "tracking.notes"
  | "tracking.notesPlaceholder"
  | "tracking.removeExercise"
  | "tracking.reps"
  | "tracking.restingHeartRate"
  | "tracking.saveMeasurements"
  | "tracking.saveWorkout"
  | "tracking.session"
  | "tracking.sets"
  | "tracking.shouldersCm"
  | "tracking.strength"
  | "tracking.thighsCm"
  | "tracking.visceralFatRating"
  | "tracking.waist"
  | "tracking.waistCm"
  | "tracking.weightKg"
  | "tracking.activeTime"
  | "tracking.activeHabits"
  | "tracking.addOne"
  | "tracking.loggedSessions"
  | "tracking.noSessions"
  | "tracking.workoutTime"
  | "tracking.addMeasurementToSave"
  | "tracking.workout"
  | "tracking.workoutSaved"
  | "tracking.workoutSet"
  | "tracking.workoutTitle"
  | "tracking.workoutTitlePlaceholder"
  | "tracking.mutation.habitAdded"
  | "tracking.mutation.habitAddFailed"
  | "tracking.mutation.habitUpdateFailed"
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
  | "member.attendance.activeMembership"
  | "member.attendance.approved"
  | "member.attendance.assignedBranch"
  | "member.attendance.backToHome"
  | "member.attendance.branch"
  | "member.attendance.checkIn"
  | "member.attendance.checkOut"
  | "member.attendance.checkedIn"
  | "member.attendance.checkedOut"
  | "member.attendance.checkedOutAutomatically"
  | "member.attendance.couldNotCheckOut"
  | "member.attendance.copyCodeFailed"
  | "member.attendance.copyEntryCodeAccessibility"
  | "member.attendance.deskCanHelp"
  | "member.attendance.deskConfirmationNeeded"
  | "member.attendance.deskHelpNeeded"
  | "member.attendance.dismissDetails"
  | "member.attendance.duration"
  | "member.attendance.entryApproved"
  | "member.attendance.entryCode"
  | "member.attendance.entryCodeCopied"
  | "member.attendance.entryCodeUnavailable"
  | "member.attendance.gymTimeRecorded"
  | "member.attendance.sessionStopped"
  | "member.attendance.inProgress"
  | "member.attendance.mainBranch"
  | "member.attendance.membershipActive"
  | "member.attendance.nextUp"
  | "member.attendance.notApproved"
  | "member.attendance.notFound"
  | "member.attendance.openAssignedPlanAccessibility"
  | "member.attendance.openAssignedPlanBody"
  | "member.attendance.openPlan"
  | "member.attendance.pendingApproval"
  | "member.attendance.pendingBody"
  | "member.attendance.plan"
  | "member.attendance.profilePhotoRecommended"
  | "member.attendance.refreshStatus"
  | "member.attendance.reviewAtDesk"
  | "member.attendance.showToDesk"
  | "member.attendance.status"
  | "member.attendance.title"
  | "member.attendance.updating"
  | "member.attendance.waitingDeskApproval"
  | "member.attendance.whyConfirmation"
  | "member.attendance.whyConfirmationBody"
  | "member.coaching.active"
  | "member.coaching.browsePtPackages"
  | "member.coaching.currentTab"
  | "member.coaching.ends"
  | "member.coaching.flexibleSessions"
  | "member.coaching.noActiveCoaching"
  | "member.coaching.noActiveCoachingBody"
  | "member.coaching.noPackagesAvailable"
  | "member.coaching.noPackagesAvailableBody"
  | "member.coaching.packagesTab"
  | "member.coaching.payAfterApproval"
  | "member.coaching.noSessionsYet"
  | "member.coaching.noSessionsYetBody"
  | "member.coaching.pending"
  | "member.coaching.requestPackage"
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
  | "member.classDetail.bookClass"
  | "member.classDetail.booked"
  | "member.classDetail.bookedHint"
  | "member.classDetail.bookWithPrice"
  | "member.classDetail.cancelBooking"
  | "member.classDetail.cancelling"
  | "member.classDetail.classDetails"
  | "member.classDetail.classFallback"
  | "member.classDetail.coachName"
  | "member.classDetail.continuePayment"
  | "member.classDetail.full"
  | "member.classDetail.fullHint"
  | "member.classDetail.freeBookingHint"
  | "member.classDetail.joinWaitlist"
  | "member.classDetail.left"
  | "member.classDetail.nextStep"
  | "member.classDetail.notFound"
  | "member.classDetail.paidBookingHint"
  | "member.classDetail.payAmountNow"
  | "member.classDetail.paymentDue"
  | "member.classDetail.paymentDueHint"
  | "member.classDetail.spots"
  | "member.classDetail.spotsBooked"
  | "member.classDetail.waitlisted"
  | "member.classDetail.waitlistedHint"
  | "member.classes.bookClass"
  | "member.classes.bookWithPrice"
  | "member.classes.booked"
  | "member.classes.branchSchedule"
  | "member.classes.cancelling"
  | "member.classes.coachName"
  | "member.classes.continuePayment"
  | "member.classes.couldNotLoad"
  | "member.classes.free"
  | "member.classes.full"
  | "member.classes.filterAll"
  | "member.classes.filterBooked"
  | "member.classes.filterOpen"
  | "member.classes.joinWaitlist"
  | "member.classes.left"
  | "member.classes.noBookedClasses"
  | "member.classes.noBookedClassesBody"
  | "member.classes.noClasses"
  | "member.classes.noClassesBody"
  | "member.classes.noOpenClasses"
  | "member.classes.noOpenClassesBody"
  | "member.classes.onWaitlist"
  | "member.classes.opening"
  | "member.classes.payAmountNow"
  | "member.classes.paymentDue"
  | "member.classes.spots"
  | "member.classes.subtitle"
  | "member.classes.title"
  | "member.classes.waitlisted"
  | "member.classes.yourBookings"
  | "member.mutation.bookingCancelled"
  | "member.mutation.bookingCancelFailed"
  | "member.mutation.classBooked"
  | "member.mutation.classBookingFailed"
  | "member.mutation.classCheckoutStarted"
  | "member.mutation.membershipCancelFailed"
  | "member.mutation.ptRequestFailed"
  | "member.mutation.signInBookClass"
  | "member.mutation.signInManageBooking"
  | "member.mutation.signInRequestPt"
  | "member.mutation.waitlistAdded"
  | "member.you.accountCenter"
  | "member.you.activeMembership"
  | "member.you.appearance"
  | "member.you.backToOwnerMode"
  | "member.you.browsePlans"
  | "member.you.findMembershipPlan"
  | "member.you.gymShop"
  | "member.you.assistant"
  | "member.you.editProfile"
  | "member.you.gymProfile"
  | "member.you.helpSupport"
  | "member.you.memberFallback"
  | "member.you.membership"
  | "member.you.membershipNeedsAttention"
  | "member.you.noGymSelected"
  | "member.you.notifications"
  | "member.you.noActiveMembership"
  | "member.you.privacy"
  | "member.you.quickActions"
  | "member.you.referrals"
  | "member.you.switchGym"
  | "member.you.switchToRole"
  | "member.you.theme.dark"
  | "member.you.theme.light"
  | "member.you.theme.system"
  | "member.you.trackingHistory"
  | "member.you.unreadCount"
  | "member.you.validUntil"
  | "member.you.viewMembership"
  | "member.you.visitsLeft"
  | "member.home.accessActive"
  | "member.home.active"
  | "member.home.activeCheckIn"
  | "member.home.activeCheckInHint"
  | "member.home.browsePlansToStart"
  | "member.home.bookClass"
  | "member.home.classBooked"
  | "member.home.classFull"
  | "member.home.classOpen"
  | "member.home.classSpotsLeft"
  | "member.home.classWaitlisted"
  | "member.home.classesTab"
  | "member.home.coachName"
  | "member.home.coachingTab"
  | "member.home.completeProfile"
  | "member.home.completeProfileBody"
  | "member.home.currentBranch"
  | "member.home.daysLeft"
  | "member.home.dayStreak"
  | "member.home.dismissBanner"
  | "member.home.estimatedMinutes"
  | "member.home.exerciseCount"
  | "member.home.exerciseCountOne"
  | "member.home.exerciseCountOther"
  | "member.home.expiredBody"
  | "member.home.expiredTitle"
  | "member.home.findYourGym"
  | "member.home.finishLoggingWork"
  | "member.home.firstRunBody"
  | "member.home.firstRunStepChoosePlan"
  | "member.home.firstRunStepFindGym"
  | "member.home.firstRunStepStartTraining"
  | "member.home.firstRunTitle"
  | "member.home.getMembership"
  | "member.home.greeting"
  | "member.home.gymFallback"
  | "member.home.habits"
  | "member.home.inviteFriend"
  | "member.home.inviteFriendBody"
  | "member.home.joinGym"
  | "member.home.joinGymBody"
  | "member.home.membershipDaysLeft"
  | "member.home.membershipEndsToday"
  | "member.home.membershipPendingBody"
  | "member.home.membershipPendingTitle"
  | "member.home.membershipStatusActive"
  | "member.home.membershipAccess"
  | "member.home.membershipAccessibility"
  | "member.home.membershipActive"
  | "member.home.noActiveMembership"
  | "member.home.noNextWorkout"
  | "member.home.noPlanAssigned"
  | "member.home.noPlanBody"
  | "member.home.open"
  | "member.home.openMembership"
  | "member.home.openPlan"
  | "member.home.openProgress"
  | "member.home.openYourCoaching"
  | "member.home.personalTraining"
  | "member.home.pickupAvailable"
  | "member.home.pickupCodeBody"
  | "member.home.referral"
  | "member.home.renew"
  | "member.home.renewMembership"
  | "member.home.renewNowBody"
  | "member.home.renewalNeeded"
  | "member.home.restDay"
  | "member.home.restDayBody"
  | "member.home.resume"
  | "member.home.scanIntoGym"
  | "member.home.seeAll"
  | "member.home.seeAllClasses"
  | "member.home.upcomingClasses"
  | "member.home.sessionsLeftShort"
  | "member.home.startWorkout"
  | "member.home.stopSession"
  | "member.home.stoppingSession"
  | "member.home.todaysWorkout"
  | "member.home.tomorrowPlan"
  | "member.home.update"
  | "member.home.viewMembership"
  | "member.home.viewPlan"
  | "member.home.visits"
  | "member.home.visitsLeft"
  | "member.home.weekTab"
  | "member.home.workoutInProgress"
  | "member.home.workoutLogged"
  | "member.home.workouts"
  | "member.home.yourCoaching"
  | "member.home.yourTrainer"
  | "member.membership.active"
  | "member.membership.activePlan"
  | "member.membership.autopayActive"
  | "member.membership.autopay"
  | "member.membership.autopayCancelled"
  | "member.membership.autopayEnabledTitle"
  | "member.membership.autopayPromptBody"
  | "member.membership.autopayPromptTitle"
  | "member.membership.autopayRenewalChoiceBody"
  | "member.membership.autopayRenewalChoiceTitle"
  | "member.membership.autopaySetupAction"
  | "member.membership.authorizeAutopay"
  | "member.membership.browseGymsBody"
  | "member.membership.browserReturnBody"
  | "member.membership.browserReturnHint"
  | "member.membership.cancelConfirmBody"
  | "member.membership.cancelConfirmTitle"
  | "member.membership.cancelMembership"
  | "member.membership.cancelAutopay"
  | "member.membership.cancelled"
  | "member.membership.checkingPaymentStatus"
  | "member.membership.choosePlan"
  | "member.membership.continueCheckout"
  | "member.membership.continuingBrowser"
  | "member.membership.continuingBrowserTitle"
  | "member.membership.currentPlan"
  | "member.membership.days"
  | "member.membership.daysOfDurationLeft"
  | "member.membership.documentsAfterSuccess"
  | "member.membership.downloadInvoice"
  | "member.membership.enableAutopay"
  | "member.membership.enabled"
  | "member.membership.endMembershipOptions"
  | "member.membership.endMembershipBody"
  | "member.membership.eyebrow"
  | "member.membership.findGyms"
  | "member.membership.gymDefinedValidity"
  | "member.membership.generateDocument"
  | "member.membership.generateReceiptOrInvoice"
  | "member.membership.guidanceActiveBody"
  | "member.membership.guidanceActiveTitle"
  | "member.membership.guidanceCompletePayment"
  | "member.membership.guidanceDaysLeftBody"
  | "member.membership.guidanceExpiredBody"
  | "member.membership.guidanceExpiredTitle"
  | "member.membership.guidanceFailedBody"
  | "member.membership.guidanceFailedTitle"
  | "member.membership.guidanceCancelledBody"
  | "member.membership.guidanceCancelledTitle"
  | "member.membership.guidanceInactiveBody"
  | "member.membership.guidanceInactiveTitle"
  | "member.membership.guidancePastDueBody"
  | "member.membership.guidancePastDueTitle"
  | "member.membership.guidancePaymentPendingBody"
  | "member.membership.guidancePaymentPendingTitle"
  | "member.membership.guidancePayNow"
  | "member.membership.guidanceRenewalWindowTitle"
  | "member.membership.guidanceRenewNow"
  | "member.membership.guidanceRenewOrChangePlan"
  | "member.membership.guidanceRenewTodayBody"
  | "member.membership.guidancePausedBody"
  | "member.membership.guidancePausedTitle"
  | "member.membership.guidanceTryPaymentAgain"
  | "member.membership.joinDifferentGym"
  | "member.membership.generatedInvoices"
  | "member.membership.history"
  | "member.membership.historyJumpBody"
  | "member.membership.invoiceGenerated"
  | "member.membership.invoice"
  | "member.membership.invoicesAndReceipts"
  | "member.membership.invoiceUnavailable"
  | "member.membership.keepMembership"
  | "member.membership.manageMembership"
  | "member.membership.manageMembershipBody"
  | "member.membership.manualRenewalTitle"
  | "member.membership.manualRenewalBody"
  | "member.membership.noActivePlans"
  | "member.membership.noAlternatePlans"
  | "member.membership.noMemberships"
  | "member.membership.noExpiry"
  | "member.membership.noPayments"
  | "member.membership.nextRenewalDate"
  | "member.membership.off"
  | "member.membership.pause"
  | "member.membership.pauseEndDateAccessibility"
  | "member.membership.pauseHelp"
  | "member.membership.pauseMembership"
  | "member.membership.pauseDisclosureBody"
  | "member.membership.pauseConfirmBody"
  | "member.membership.pauseConfirmTitle"
  | "member.membership.pauseReason"
  | "member.membership.pauseReasonInjury"
  | "member.membership.pauseReasonMedical"
  | "member.membership.pauseReasonOther"
  | "member.membership.pauseReasonTravel"
  | "member.membership.pausedToast"
  | "member.membership.pausedUntil"
  | "member.membership.pauseUntil"
  | "member.membership.paySecurely"
  | "member.membership.payAmountNow"
  | "member.membership.payNow"
  | "member.membership.payments"
  | "member.membership.paymentDocuments"
  | "member.membership.paymentDocumentsBody"
  | "member.membership.plan"
  | "member.membership.planSwitched"
  | "member.membership.receiptGenerated"
  | "member.membership.receipt"
  | "member.membership.receiptNumber"
  | "member.membership.receiptUnavailable"
  | "member.membership.recurringRenewalEnabled"
  | "member.membership.renewMembership"
  | "member.membership.renewalConfirmed"
  | "member.membership.renewalConsequence"
  | "member.membership.renewalFlowOpened"
  | "member.membership.renewalRequestSent"
  | "member.membership.renewalSheetBody"
  | "member.membership.renewalSummary"
  | "member.membership.resumed"
  | "member.membership.resumeMembership"
  | "member.membership.selectedPlan"
  | "member.membership.selectPlanAccessibility"
  | "member.membership.starting"
  | "member.membership.statusBelow"
  | "member.membership.subscriptionUpdated"
  | "member.membership.summary"
  | "member.membership.tabCurrent"
  | "member.membership.expiringSoon"
  | "member.membership.total"
  | "member.membership.tabHistory"
  | "member.membership.tabPayments"
  | "member.membership.switchNow"
  | "member.membership.switchWithoutCheckoutBody"
  | "member.membership.switchWithoutCheckoutTitle"
  | "member.membership.title"
  | "member.membership.typeDuration"
  | "member.membership.typeHybrid"
  | "member.membership.typeMembership"
  | "member.membership.typeTrial"
  | "member.membership.update"
  | "member.membership.updating"
  | "member.membership.validity"
  | "member.membership.visits"
  | "member.membership.visitsRemaining"
  | "member.membership.visitCount"
  | "member.membership.yourGym"
  | "member.profile.active"
  | "member.profile.activeGymOption"
  | "member.profile.activeRoleOption"
  | "member.profile.biometric"
  | "member.profile.biometricOn"
  | "member.profile.biometricUnlock"
  | "member.profile.biometricUnlockBody"
  | "member.profile.checkedIn"
  | "member.profile.classes"
  | "member.profile.daysReferralBenefit"
  | "member.profile.daysRemaining"
  | "member.profile.daysRemainingOf"
  | "member.profile.defaultReferralBenefit"
  | "member.profile.earnedCredit"
  | "member.profile.expires"
  | "member.profile.findGyms"
  | "member.profile.friendsStat"
  | "member.profile.membership"
  | "member.profile.membershipDetailsUnavailable"
  | "member.profile.accountTab"
  | "member.profile.detailsTab"
  | "member.profile.rewardsTab"
  | "member.profile.memberFallback"
  | "member.profile.myGym"
  | "member.profile.noActiveMembership"
  | "member.profile.noActivity"
  | "member.profile.noGyms"
  | "member.profile.noGymsBody"
  | "member.profile.noRoleAssigned"
  | "member.profile.noRoles"
  | "member.profile.noRolesBody"
  | "member.profile.otherGymRoleBody"
  | "member.profile.otherGymRoleTitle"
  | "member.profile.pendingCredit"
  | "member.profile.percentComplete"
  | "member.profile.percentCompleteWithDate"
  | "member.profile.qaShortcuts"
  | "member.profile.quickActions"
  | "member.profile.finishProfile"
  | "member.profile.recentActivity"
  | "member.profile.readinessContact"
  | "member.profile.readinessMembership"
  | "member.profile.readinessMore"
  | "member.profile.readinessNeedsBody"
  | "member.profile.readinessNeedsTitle"
  | "member.profile.readinessPhoto"
  | "member.profile.readinessReadyBody"
  | "member.profile.readinessReadyTitle"
  | "member.profile.referGymAccessibility"
  | "member.profile.referGymBody"
  | "member.profile.referGymTitle"
  | "member.profile.referralCodeCopied"
  | "member.profile.referralCopied"
  | "member.profile.referralLinkCopied"
  | "member.profile.renew"
  | "member.profile.roleUnavailable"
  | "member.profile.roleUnavailableBody"
  | "member.profile.roleAtGym"
  | "member.profile.settings"
  | "member.profile.shareReferralCode"
  | "member.profile.shareReferralWithLink"
  | "member.profile.signOut"
  | "member.profile.signOutConfirmBody"
  | "member.profile.signOutConfirmTitle"
  | "member.profile.switch"
  | "member.profile.switchFailed"
  | "member.profile.switchFailedBody"
  | "member.profile.switchGym"
  | "member.profile.switchGymBody"
  | "member.profile.switchGymConfirmBody"
  | "member.profile.switchGymConfirmTitle"
  | "member.profile.switchGymForRole"
  | "member.profile.switchRole"
  | "member.profile.switchRoleBody"
  | "member.profile.switchRoleConfirmBody"
  | "member.profile.switchRoleConfirmTitle"
  | "member.profile.switching"
  | "member.profile.title"
  | "member.profile.trainerReferralBenefit"
  | "member.profile.updating"
  | "member.profile.useRoleAccessibility"
  | "member.profile.viewHistory"
  | "member.profile.visitsReferralBenefit"
  | "member.profile.visitsRemaining"
  | "member.profile.workoutPlan"
  | "roleSwitcher.active"
  | "roleSwitcher.currentRoleAccessibility"
  | "roleSwitcher.currentWorkspace"
  | "roleSwitcher.currentWorkspaceAccessibility"
  | "roleSwitcher.role.admin"
  | "roleSwitcher.role.member"
  | "roleSwitcher.role.owner"
  | "roleSwitcher.role.platformAdmin"
  | "roleSwitcher.role.receptionist"
  | "roleSwitcher.role.trainer"
  | "roleSwitcher.roleUnavailable"
  | "roleSwitcher.roleUnavailableBody"
  | "roleSwitcher.subtitle"
  | "roleSwitcher.switching"
  | "roleSwitcher.switchToWorkspace"
  | "roleSwitcher.title"
  | "roleSwitcher.use"
  | "member.profileExtra.addDateOfBirth"
  | "member.profileExtra.aiConsent"
  | "member.profileExtra.aiConsentBody"
  | "member.profileExtra.completedFields"
  | "member.profileExtra.dateOfBirth"
  | "member.profileExtra.decreaseWeeklyWorkoutGoal"
  | "member.profileExtra.emergencyContact"
  | "member.profileExtra.gender"
  | "member.profileExtra.genderFemale"
  | "member.profileExtra.genderMale"
  | "member.profileExtra.genderNonBinary"
  | "member.profileExtra.genderNotSpecified"
  | "member.profileExtra.increaseWeeklyWorkoutGoal"
  | "member.profileExtra.locale"
  | "member.profileExtra.marketingOptIn"
  | "member.profileExtra.name"
  | "member.profileExtra.phone"
  | "member.profileExtra.saved"
  | "member.profileExtra.title"
  | "member.profileExtra.weeklyGoalValue"
  | "member.profileExtra.weeklyWorkoutGoal"
  | "member.profilePhoto.addProfilePhoto"
  | "member.profilePhoto.cameraPrimer"
  | "member.profilePhoto.cameraSettingsPrompt"
  | "member.profilePhoto.chooseFromLibrary"
  | "member.profilePhoto.continue"
  | "member.profilePhoto.libraryPrimer"
  | "member.profilePhoto.librarySettingsPrompt"
  | "member.profilePhoto.noFileId"
  | "member.profilePhoto.notNow"
  | "member.profilePhoto.permissionNeeded"
  | "member.profilePhoto.photoNotRemoved"
  | "member.profilePhoto.photoNotSaved"
  | "member.profilePhoto.photoTooLarge"
  | "member.profilePhoto.profilePhoto"
  | "member.profilePhoto.remove"
  | "member.profilePhoto.signInAgain"
  | "member.profilePhoto.takePhoto"
  | "member.profilePhoto.tryAgain"
  | "member.profilePhoto.updateProfilePhoto"
  | "memberList.all"
  | "memberList.couldNotLoad"
  | "memberList.noEmail"
  | "memberList.noMembers"
  | "memberList.noPhone"
  | "memberList.reveal"
  | "memberList.revealPhoneFor"
  | "memberList.searchMembers"
  | "memberList.status.active"
  | "memberList.status.expired"
  | "memberList.status.expiring"
  | "memberList.status.pending"
  | "memberList.tryDifferentSearch"
  | "privilegedPin.body"
  | "privilegedPin.confirmAction"
  | "privilegedPin.continue"
  | "privilegedPin.orgPin"
  | "member.diet.activePlan"
  | "member.diet.addCaloriesOrMacro"
  | "member.diet.addMealName"
  | "member.diet.calories"
  | "member.diet.carbs"
  | "member.diet.couldNotLogMeal"
  | "member.diet.fats"
  | "member.diet.historyTitle"
  | "member.diet.kcalRemainingToday"
  | "member.diet.logMeal"
  | "member.diet.logging"
  | "member.diet.meal"
  | "member.diet.mealLogged"
  | "member.diet.mealPlaceholder"
  | "member.diet.nextDay"
  | "member.diet.noDietPlan"
  | "member.diet.noDietPlanBody"
  | "member.diet.noMealsLogged"
  | "member.diet.noMealsLoggedBody"
  | "member.diet.noPlan"
  | "member.diet.previousDay"
  | "member.diet.protein"
  | "member.diet.today"
  | "member.habits.add"
  | "member.habits.addFirstHabit"
  | "member.habits.addHabit"
  | "member.habits.addHabitAccessibility"
  | "member.habits.closeAddHabit"
  | "member.habits.completedTodayAccessibility"
  | "member.habits.dailyHabits"
  | "member.habits.dayStreak"
  | "member.habits.dayStreakDoToday"
  | "member.habits.done"
  | "member.habits.doneToday"
  | "member.habits.emptyBody"
  | "member.habits.notDoneAccessibility"
  | "member.habits.proteinLabel"
  | "member.habits.proteinTitle"
  | "member.habits.sleepLabel"
  | "member.habits.sleepTitle"
  | "member.habits.stepsLabel"
  | "member.habits.stepsTitle"
  | "member.habits.stretchLabel"
  | "member.habits.stretchTitle"
  | "member.habits.tapToCompleteToday"
  | "member.habits.target"
  | "member.habits.waterLabel"
  | "member.habits.waterTitle"
  | "member.plan.assignedPlan"
  | "member.plan.coachGuided"
  | "member.plan.couldNotLoadExercises"
  | "member.plan.dietKind"
  | "member.plan.dietTab"
  | "member.plan.insideThisPlan"
  | "member.plan.morePlans"
  | "member.plan.nextWorkout"
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
  | "member.plan.workoutKind"
  | "member.plan.workoutTab"
  | "member.planDetail.actionFailed"
  | "member.planDetail.active"
  | "member.planDetail.addShortNote"
  | "member.planDetail.assigned"
  | "member.planDetail.assignedByCoach"
  | "member.planDetail.closeFeedback"
  | "member.planDetail.completedCount"
  | "member.planDetail.completeWorkout"
  | "member.planDetail.completing"
  | "member.planDetail.finishMoreExercises"
  | "member.planDetail.defaultSets"
  | "member.planDetail.dietFilter"
  | "member.planDetail.done"
  | "member.planDetail.exercises"
  | "member.planDetail.failedToSend"
  | "member.planDetail.feedback"
  | "member.planDetail.feedbackSent"
  | "member.planDetail.feedbackSheetBody"
  | "member.planDetail.needSwap"
  | "member.planDetail.noPlanAssignedBody"
  | "member.planDetail.pain"
  | "member.planDetail.pickNoteFirst"
  | "member.planDetail.progressNotSaved"
  | "member.planDetail.progressNotSavedBody"
  | "member.planDetail.seeWeeklyList"
  | "member.planDetail.send"
  | "member.planDetail.sending"
  | "member.planDetail.sentToCoach"
  | "member.planDetail.signInAgainFeedback"
  | "member.planDetail.tellCoach"
  | "member.planDetail.tooHard"
  | "member.planDetail.upNextThisWeek"
  | "member.planDetail.workoutFilter"
  | "member.planDetail.workoutMarkedComplete"
  | "member.planDetail.workoutProgress"
  | "member.planDetail.workoutProgressNotSaved"
  | "member.planDetail.yourCoach"
  | "member.planDetail.yourPlan"
  | "member.progress.history"
  | "member.progress.logWorkout"
  | "member.progress.noWorkoutsLogged"
  | "member.progress.noWorkoutsLoggedBody"
  | "member.progress.privacyNote"
  | "member.progress.recentWorkouts"
  | "member.progress.thisWeek"
  | "member.progress.title"
  | "member.receipt.amount"
  | "member.receipt.downloadInvoice"
  | "member.receipt.generating"
  | "member.receipt.gst"
  | "member.receipt.invoice"
  | "member.receipt.invoiceNo"
  | "member.receipt.issued"
  | "member.receipt.membership"
  | "member.receipt.mode"
  | "member.receipt.modeCash"
  | "member.receipt.modeOnline"
  | "member.receipt.notFound"
  | "member.receipt.notFoundBody"
  | "member.receipt.paymentDetails"
  | "member.receipt.purpose"
  | "member.receipt.receiptNo"
  | "member.receipt.receiptNumber"
  | "member.receipt.recorded"
  | "member.receipt.status"
  | "member.receipt.statusCancelled"
  | "member.receipt.statusCreated"
  | "member.receipt.statusFailed"
  | "member.receipt.statusIssued"
  | "member.receipt.statusPaused"
  | "member.receipt.statusRefunded"
  | "member.receipt.statusSucceeded"
  | "member.receipt.taxableAmount"
  | "member.receipt.title"
  | "member.receipt.total"
  | "member.scan.addPhoto"
  | "member.scan.allowCamera"
  | "member.scan.allowCameraQr"
  | "member.scan.allowCameraSettings"
  | "member.scan.alreadyCheckedInToday"
  | "member.scan.awaitingQr"
  | "member.scan.awaitingSubmit"
  | "member.scan.backToCameraScanner"
  | "member.scan.cameraAccessBlocked"
  | "member.scan.cameraAvailable"
  | "member.scan.cameraAvailableAnnouncement"
  | "member.scan.cameraBlockedAnnouncement"
  | "member.scan.cameraNeeded"
  | "member.scan.cameraNeededAnnouncement"
  | "member.scan.cameraPreviewAccessibility"
  | "member.scan.cantScan"
  | "member.scan.checkCodeAccessibility"
  | "member.scan.checkedIn"
  | "member.scan.checkingCode"
  | "member.scan.codeCaptured"
  | "member.scan.codeEntered"
  | "member.scan.codeHint"
  | "member.scan.couldNotReadQr"
  | "member.scan.enableCamera"
  | "member.scan.enterCheckInCode"
  | "member.scan.enterCode"
  | "member.scan.enterCodeManually"
  | "member.scan.enterDeskCodeManually"
  | "member.scan.enterManualCodeAccessibility"
  | "member.scan.membershipExpired"
  | "member.scan.needFourNumbers"
  | "member.scan.needTwoLetters"
  | "member.scan.notVerified"
  | "member.scan.offlineSavedBody"
  | "member.scan.offlineSavedTitle"
  | "member.scan.offlineSavedToast"
  | "member.scan.openDeviceSettings"
  | "member.scan.openSettings"
  | "member.scan.profilePhotoRecommended"
  | "member.scan.queuedScanWaiting"
  | "member.scan.queuedScansWaiting"
  | "member.scan.retryNow"
  | "member.scan.returnToQrScannerAccessibility"
  | "member.scan.savedCheckInConfirmed"
  | "member.scan.savedCheckInsConfirmed"
  | "member.scan.scanAgain"
  | "member.scan.searchingForCode"
  | "member.scan.serverCheck"
  | "member.scan.serverVerified"
  | "member.scan.signInAgain"
  | "member.scan.signInSelectGym"
  | "member.scan.subtitle"
  | "member.scan.title"
  | "member.scan.tryCameraAgain"
  | "member.scan.tryCheckIn"
  | "member.scan.verifying"
  | "member.scan.yourGym"
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
  | "owner.home.allClearBody"
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
  | "owner.home.reviewMembers"
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
  | "owner.members.active"
  | "owner.members.day"
  | "owner.members.days"
  | "owner.members.daysLeft"
  | "owner.members.expiring"
  | "owner.members.expiringReminderBody"
  | "owner.members.expiringReminderTitle"
  | "owner.members.missingContact"
  | "owner.members.reminderNotSent"
  | "owner.members.reminderSent"
  | "owner.members.sendReminder"
  | "owner.members.soon"
  | "owner.members.title"
  | "owner.members.total"
  | "owner.members.tryAgain"
  | "owner.member.couldNotLoadMember"
  | "owner.member.actionContactBody"
  | "owner.member.actionContactTitle"
  | "owner.member.actionExpiringBody"
  | "owner.member.actionExpiringTitle"
  | "owner.member.actionHealthyBody"
  | "owner.member.actionHealthyTitle"
  | "owner.member.actionPlanBody"
  | "owner.member.actionPlanTitle"
  | "owner.member.email"
  | "owner.member.fitnessGoal"
  | "owner.member.memberFallback"
  | "owner.member.memberSince"
  | "owner.member.nextBestAction"
  | "owner.member.noActivePlan"
  | "owner.member.notes"
  | "owner.member.notAvailable"
  | "owner.member.notFound"
  | "owner.member.notSet"
  | "owner.member.openingPaymentTools"
  | "owner.member.phone"
  | "owner.member.recordPayment"
  | "owner.member.reveal"
  | "owner.member.revealNotLogged"
  | "owner.member.revealNotLoggedBody"
  | "owner.member.revealPhoneFor"
  | "owner.member.sendReminder"
  | "owner.member.subscriptionHistory"
  | "owner.member.untilDate"
  | "owner.member.viewFullProfile"
  | "owner.member.visitsLeft"
  | "owner.approvals.allCaughtUp"
  | "owner.approvals.allCaughtUpBody"
  | "owner.approvals.approveAll"
  | "owner.approvals.approveAllBody"
  | "owner.approvals.approveAllTitle"
  | "owner.approvals.approveFailed"
  | "owner.approvals.approvedJoinRequests"
  | "owner.approvals.approvedPartial"
  | "owner.approvals.joinRequest"
  | "owner.approvals.joinRequests"
  | "owner.approvals.memberCheckIn"
  | "owner.approvals.none"
  | "owner.approvals.ownerApprovalRequired"
  | "owner.approvals.pending"
  | "owner.approvals.pendingReviews"
  | "owner.approvals.referral"
  | "owner.approvals.reject"
  | "owner.approvals.rejectBody"
  | "owner.approvals.rejected"
  | "owner.approvals.rejectFailed"
  | "owner.approvals.rejectTitle"
  | "owner.approvals.requestListCount"
  | "owner.approvals.scanReviewQueueCount"
  | "owner.approvals.scanReviews"
  | "owner.approvals.title"
  | "owner.more.approvals"
  | "owner.more.approvalsSubtitle"
  | "owner.more.billing"
  | "owner.more.billingSubtitle"
  | "owner.more.branches"
  | "owner.more.branchesSubtitle"
  | "owner.more.couponsOffers"
  | "owner.more.couponsOffersSubtitle"
  | "owner.more.entryQr"
  | "owner.more.entryQrSubtitle"
  | "owner.more.exerciseLibrary"
  | "owner.more.exerciseLibrarySubtitle"
  | "owner.more.membershipPlans"
  | "owner.more.membershipPlansSubtitle"
  | "owner.more.notificationTemplates"
  | "owner.more.notificationTemplatesSubtitle"
  | "owner.more.groupCatalog"
  | "owner.more.groupDailyWork"
  | "owner.more.groupFinance"
  | "owner.more.groupOperations"
  | "owner.more.members"
  | "owner.more.membersSubtitle"
  | "owner.more.ownerTools"
  | "owner.more.referGym"
  | "owner.more.referGymSubtitle"
  | "owner.more.referralProgram"
  | "owner.more.referralProgramSubtitle"
  | "owner.more.reports"
  | "owner.more.reportsSubtitle"
  | "owner.more.revenue"
  | "owner.more.revenueSubtitle"
  | "owner.more.staff"
  | "owner.more.staffSubtitle"
  | "owner.more.stock"
  | "owner.more.stockSubtitle"
  | "owner.more.trainerPayouts"
  | "owner.more.trainerPayoutsSubtitle"
  | "owner.more.webControlRoom"
  | "owner.exerciseLibrary.add"
  | "owner.exerciseLibrary.customExercise"
  | "owner.exerciseLibrary.edit"
  | "owner.exerciseLibrary.editTemplate"
  | "owner.exerciseLibrary.equipment"
  | "owner.exerciseLibrary.equipmentPlaceholder"
  | "owner.exerciseLibrary.exerciseName"
  | "owner.exerciseLibrary.exerciseNamePlaceholder"
  | "owner.exerciseLibrary.featured"
  | "owner.exerciseLibrary.featuredTemplates"
  | "owner.exerciseLibrary.muscle"
  | "owner.exerciseLibrary.musclePlaceholder"
  | "owner.exerciseLibrary.new"
  | "owner.exerciseLibrary.newTemplate"
  | "owner.exerciseLibrary.noSharedTemplates"
  | "owner.exerciseLibrary.noSharedTemplatesBody"
  | "owner.exerciseLibrary.notes"
  | "owner.exerciseLibrary.notesPlaceholder"
  | "owner.exerciseLibrary.programmingDefaults"
  | "owner.exerciseLibrary.remove"
  | "owner.exerciseLibrary.removeTemplateBody"
  | "owner.exerciseLibrary.removeTemplateTitle"
  | "owner.exerciseLibrary.reps"
  | "owner.exerciseLibrary.repsCount"
  | "owner.exerciseLibrary.restSec"
  | "owner.exerciseLibrary.saveTemplate"
  | "owner.exerciseLibrary.sets"
  | "owner.exerciseLibrary.setsCount"
  | "owner.exerciseLibrary.shared"
  | "owner.exerciseLibrary.sharedLibrary"
  | "owner.exerciseLibrary.sharedTemplates"
  | "owner.exerciseLibrary.starter"
  | "owner.exerciseLibrary.starterTemplates"
  | "owner.exerciseLibrary.starters"
  | "owner.exerciseLibrary.subtitle"
  | "owner.exerciseLibrary.tempo"
  | "owner.exerciseLibrary.title"
  | "owner.coupons.active"
  | "owner.coupons.activeOffers"
  | "owner.coupons.amountOffInput"
  | "owner.coupons.amountOffValue"
  | "owner.coupons.code"
  | "owner.coupons.coupons"
  | "owner.coupons.createCoupon"
  | "owner.coupons.discount"
  | "owner.coupons.edit"
  | "owner.coupons.editAccessibility"
  | "owner.coupons.editCoupon"
  | "owner.coupons.flatInrOff"
  | "owner.coupons.maxRedemptions"
  | "owner.coupons.newCoupon"
  | "owner.coupons.noCouponsYet"
  | "owner.coupons.noCouponsYetBody"
  | "owner.coupons.paused"
  | "owner.coupons.pausedOffers"
  | "owner.coupons.perMember"
  | "owner.coupons.perMemberLimit"
  | "owner.coupons.percentOff"
  | "owner.coupons.percentOffInput"
  | "owner.coupons.percentOffValue"
  | "owner.coupons.redemptions"
  | "owner.coupons.redemptionLimits"
  | "owner.coupons.remove"
  | "owner.coupons.removeCouponBody"
  | "owner.coupons.removeCouponTitle"
  | "owner.coupons.saveChanges"
  | "owner.coupons.subtitle"
  | "owner.coupons.title"
  | "owner.coupons.unlimited"
  | "owner.coupons.usedCount"
  | "owner.coupons.usedWithLimit"
  | "owner.plans.createPlan"
  | "owner.plans.dateRange"
  | "owner.plans.daysCount"
  | "owner.plans.duration"
  | "owner.plans.durationDays"
  | "owner.plans.edit"
  | "owner.plans.editAccessibility"
  | "owner.plans.editPlan"
  | "owner.plans.hidden"
  | "owner.plans.hiddenDrafts"
  | "owner.plans.hybrid"
  | "owner.plans.newPlan"
  | "owner.plans.noPlansYet"
  | "owner.plans.noPlansYetBody"
  | "owner.plans.planLimits"
  | "owner.plans.planName"
  | "owner.plans.planNamePlaceholder"
  | "owner.plans.plans"
  | "owner.plans.priceInr"
  | "owner.plans.publicPlans"
  | "owner.plans.remove"
  | "owner.plans.removePlanBody"
  | "owner.plans.removePlanTitle"
  | "owner.plans.saveChanges"
  | "owner.plans.showPublicly"
  | "owner.plans.subtitle"
  | "owner.plans.title"
  | "owner.plans.totalPlans"
  | "owner.plans.trial"
  | "owner.plans.type"
  | "owner.plans.visitPack"
  | "owner.plans.visits"
  | "owner.plans.visitsCount"
  | "owner.billing.activeMembers"
  | "owner.billing.activeMembersCopy"
  | "owner.billing.aiImages"
  | "owner.billing.aiText"
  | "owner.billing.autopay"
  | "owner.billing.branches"
  | "owner.billing.cancel"
  | "owner.billing.cancelAtPeriodEnd"
  | "owner.billing.cancelSubscriptionBody"
  | "owner.billing.cancelSubscriptionTitle"
  | "owner.billing.cancellationRequested"
  | "owner.billing.couldNotCancelSubscription"
  | "owner.billing.couldNotOpenPlanCheckout"
  | "owner.billing.couldNotStartBillingSetup"
  | "owner.billing.count"
  | "owner.billing.counts"
  | "owner.billing.currentPlanLimits"
  | "owner.billing.currentPlanLimitsBody"
  | "owner.billing.keep"
  | "owner.billing.mandate"
  | "owner.billing.member"
  | "owner.billing.members"
  | "owner.billing.messages"
  | "owner.billing.month"
  | "owner.billing.monthly"
  | "owner.billing.nextBilling"
  | "owner.billing.nextCharge"
  | "owner.billing.needsSetup"
  | "owner.billing.noPaymentMandate"
  | "owner.billing.notAvailable"
  | "owner.billing.openingBillingSetup"
  | "owner.billing.openingPlanCheckout"
  | "owner.billing.planName"
  | "owner.billing.platformReferral"
  | "owner.billing.products"
  | "owner.billing.referralPartnerships"
  | "owner.billing.reports"
  | "owner.billing.resumeSetup"
  | "owner.billing.select"
  | "owner.billing.setUpMandate"
  | "owner.billing.sixMonths"
  | "owner.billing.staff"
  | "owner.billing.ready"
  | "owner.billing.statusActive"
  | "owner.billing.statusCancelled"
  | "owner.billing.statusDeleted"
  | "owner.billing.statusMissing"
  | "owner.billing.statusPaymentPending"
  | "owner.billing.statusPaused"
  | "owner.billing.statusSuspended"
  | "owner.billing.statusTrialActive"
  | "owner.billing.statusTrialExpired"
  | "owner.billing.statusTrialExpiring"
  | "owner.billing.support"
  | "owner.billing.subscription"
  | "owner.billing.title"
  | "owner.billing.trainers"
  | "owner.billing.trialEnds"
  | "owner.billing.upgradePlan"
  | "owner.billing.upgradePlanBody"
  | "owner.billing.year"
  | "owner.billing.yearly"
  | "owner.payouts.baseMonthly"
  | "owner.payouts.confirmBody"
  | "owner.payouts.confirmTitle"
  | "owner.payouts.earningLines"
  | "owner.payouts.emptyBody"
  | "owner.payouts.emptyTitle"
  | "owner.payouts.hideSettings"
  | "owner.payouts.markPaid"
  | "owner.payouts.marking"
  | "owner.payouts.outstanding"
  | "owner.payouts.paid"
  | "owner.payouts.payableTrainers"
  | "owner.payouts.payDay"
  | "owner.payouts.perSession"
  | "owner.payouts.ptCommission"
  | "owner.payouts.saveSettings"
  | "owner.payouts.settings"
  | "owner.payouts.subtitle"
  | "owner.payouts.thisMonth"
  | "owner.payouts.thisMonthLower"
  | "owner.payouts.title"
  | "owner.payouts.trainerFallback"
  | "owner.payouts.trainerLower"
  | "owner.stock.allInStock"
  | "owner.stock.allInStockBody"
  | "owner.stock.collectPayment"
  | "owner.stock.collectPaymentBody"
  | "owner.stock.collectPaymentDone"
  | "owner.stock.leftThreshold"
  | "owner.stock.left"
  | "owner.stock.lowStock"
  | "owner.stock.memberPickup"
  | "owner.stock.noPickups"
  | "owner.stock.noPickupsBody"
  | "owner.stock.paidOrders"
  | "owner.stock.pickupOrders"
  | "owner.stock.pickupPending"
  | "owner.stock.pickups"
  | "owner.stock.productsToReorder"
  | "owner.stock.reorder"
  | "owner.stock.reorderAccessibility"
  | "owner.stock.reorderBody"
  | "owner.stock.reorderSubject"
  | "owner.stock.reorderStock"
  | "owner.stock.reorderStockBody"
  | "owner.stock.reorderStockDone"
  | "owner.stock.reorderNow"
  | "owner.stock.todayWork"
  | "owner.stock.thresholdShort"
  | "owner.stock.title"
  | "owner.stock.underThreshold"
  | "owner.stock.verifyPickup"
  | "owner.stock.verifyPickupBody"
  | "owner.stock.verifyPickupDone"
  | "owner.staff.admin"
  | "owner.staff.admins"
  | "owner.staff.changeRole"
  | "owner.staff.email"
  | "owner.staff.invite"
  | "owner.staff.inviteStaffMember"
  | "owner.staff.invited"
  | "owner.staff.noStaffBody"
  | "owner.staff.noStaffYet"
  | "owner.staff.owner"
  | "owner.staff.pendingInvites"
  | "owner.staff.reception"
  | "owner.staff.receptionWebHint"
  | "owner.staff.remove"
  | "owner.staff.removeBody"
  | "owner.staff.removeTitle"
  | "owner.staff.role"
  | "owner.staff.sendInvite"
  | "owner.staff.sending"
  | "owner.staff.staffMember"
  | "owner.staff.subtitle"
  | "owner.staff.team"
  | "owner.staff.title"
  | "owner.staff.totalStaff"
  | "owner.staff.trainer"
  | "owner.staff.trainers"
  | "owner.dashboard.activeCount"
  | "owner.dashboard.attendance7Days"
  | "owner.dashboard.chartAccessibility"
  | "owner.dashboard.collapseTrends"
  | "owner.dashboard.expandTrends"
  | "owner.dashboard.members30Days"
  | "owner.dashboard.noActiveMemberPlans"
  | "owner.dashboard.planMix"
  | "owner.dashboard.revenue7Days"
  | "owner.dashboard.trends"
  | "owner.dashboard.trendsSubtitle"
  | "reception.desk.active"
  | "reception.desk.branch"
  | "reception.desk.coachName"
  | "reception.desk.code"
  | "reception.desk.displayEntryQr"
  | "reception.desk.enterCode"
  | "reception.desk.flagged"
  | "reception.desk.gateQueueClear"
  | "reception.desk.needsApprovalQueue"
  | "reception.desk.noCheckIns"
  | "reception.desk.noCheckInsBody"
  | "reception.desk.openApprovalQueue"
  | "reception.desk.pending"
  | "reception.desk.pendingCount"
  | "reception.desk.queueClear"
  | "reception.desk.queueClearBody"
  | "reception.desk.queueMeta"
  | "reception.desk.queueNeedsAction"
  | "reception.desk.queueNeedsActionBody"
  | "reception.desk.recentActivity"
  | "reception.desk.referGym"
  | "reception.desk.referGymAccessibility"
  | "reception.desk.referGymBody"
  | "reception.desk.reviewRequired"
  | "reception.desk.statusApproved"
  | "reception.desk.statusFailed"
  | "reception.desk.statusPendingApproval"
  | "reception.desk.statusRejected"
  | "reception.desk.statusRecorded"
  | "reception.desk.today"
  | "reception.desk.todayCount"
  | "reception.desk.todaysClasses"
  | "reception.desk.verifying"
  | "reception.desk.verifyCode"
  | "reception.desk.verifyEntryCode"
  | "reception.desk.viewRosterFor"
  | "reception.workspace.backToOwnerTools"
  | "reception.workspace.goBack"
  | "reception.workspace.activeBranchSuffix"
  | "reception.workspace.activeGymFallback"
  | "reception.workspace.addAttendanceNote"
  | "reception.workspace.alreadyCheckedInToday"
  | "reception.workspace.approveFailed"
  | "reception.workspace.approvedScanReason"
  | "reception.workspace.authenticationRequiredAction"
  | "reception.workspace.bulkRecorded"
  | "reception.workspace.bulkRecordedMany"
  | "reception.workspace.bulkRecordedOne"
  | "reception.workspace.bulkRecordedPartial"
  | "reception.workspace.checkInApproved"
  | "reception.workspace.checkInNotValid"
  | "reception.workspace.checkInRejected"
  | "reception.workspace.checkInVerified"
  | "reception.workspace.couldNotRecordOne"
  | "reception.workspace.deskApprovalRequired"
  | "reception.workspace.enterCodeFirst"
  | "reception.workspace.entryCode"
  | "reception.workspace.entryCodeInvalidMessage"
  | "reception.workspace.fulfillFailed"
  | "reception.workspace.fulfillPickupAuth"
  | "reception.workspace.fulfillPickupReason"
  | "reception.workspace.mainBranchFallback"
  | "reception.workspace.manualAttendanceRecorded"
  | "reception.workspace.memberCheckInFallback"
  | "reception.workspace.memberFallback"
  | "reception.workspace.membershipAlreadyActive"
  | "reception.workspace.membershipFallback"
  | "reception.workspace.noActiveCode"
  | "reception.workspace.notValidForEntry"
  | "reception.workspace.onlyOneBranchBody"
  | "reception.workspace.onlyOneBranchTitle"
  | "reception.workspace.orderTotalDetail"
  | "reception.workspace.ownerApprovalRequired"
  | "reception.workspace.ownerDesk"
  | "reception.workspace.paymentRecorded"
  | "reception.workspace.pickedBadge"
  | "reception.workspace.pickupFulfilled"
  | "reception.workspace.pickupNotReady"
  | "reception.workspace.pickupStatusTitle"
  | "reception.workspace.pickupVerified"
  | "reception.workspace.pickupVerifiedFor"
  | "reception.workspace.recordManualAttendanceAuth"
  | "reception.workspace.recordManualPaymentAuth"
  | "reception.workspace.recording"
  | "reception.workspace.receptionDesk"
  | "reception.workspace.rejectFailed"
  | "reception.workspace.rejectedScanReason"
  | "reception.workspace.selectedBadge"
  | "reception.workspace.signInSelectGymVerify"
  | "reception.workspace.statusDetail"
  | "reception.workspace.switchBranchBody"
  | "reception.workspace.switchBranchTitle"
  | "reception.workspace.verifiedName"
  | "reception.workspace.verifyCodeFailed"
  | "reception.workspace.verifyFailedTitle"
  | "reception.workspace.verificationFailed"
  | "reception.workspace.verificationSuccessful"
  | "reception.home.title"
  | "reception.members.attendanceNote"
  | "reception.members.auditReason"
  | "reception.members.clearSelectedMember"
  | "reception.members.clear"
  | "reception.members.deskActions"
  | "reception.members.generalFitness"
  | "reception.members.hiddenHint"
  | "reception.members.memberTitle"
  | "reception.members.membership"
  | "reception.members.multiSelectCount"
  | "reception.members.noMembers"
  | "reception.members.noMembersBody"
  | "reception.members.noMembership"
  | "reception.members.reasonTooShort"
  | "reception.members.recordAttendance"
  | "reception.members.recordForAll"
  | "reception.members.recording"
  | "reception.members.searchOrSelect"
  | "reception.members.selectMultiple"
  | "reception.members.selectedCount"
  | "reception.members.title"
  | "reception.orders.confirmPickedUpBody"
  | "reception.orders.confirmPickedUpTitle"
  | "reception.orders.done"
  | "reception.orders.enterPickupCode"
  | "reception.orders.fulfillmentQueue"
  | "reception.orders.itemCount"
  | "reception.orders.markPickedUp"
  | "reception.orders.noPickupsBody"
  | "reception.orders.pickupCode"
  | "reception.orders.pickupVerification"
  | "reception.orders.pickupVerificationBody"
  | "reception.orders.ready"
  | "reception.orders.statusCancelled"
  | "reception.orders.statusFailed"
  | "reception.orders.statusFulfilled"
  | "reception.orders.statusPaid"
  | "reception.orders.statusPendingPayment"
  | "reception.orders.statusRefunded"
  | "reception.orders.thisMember"
  | "reception.orders.title"
  | "reception.orders.verifyPickupCode"
  | "reception.payments.activeDesk"
  | "reception.payments.additionalDetails"
  | "reception.payments.amount"
  | "reception.payments.amountInvalid"
  | "reception.payments.amountReceived"
  | "reception.payments.auditWarning"
  | "reception.payments.changeMember"
  | "reception.payments.collection"
  | "reception.payments.collectionMode"
  | "reception.payments.desk"
  | "reception.payments.deskNote"
  | "reception.payments.deskNotePlaceholder"
  | "reception.payments.due"
  | "reception.payments.dueAmount"
  | "reception.payments.findMember"
  | "reception.payments.invoice"
  | "reception.payments.memberPayment"
  | "reception.payments.membershipSelected"
  | "reception.payments.missing"
  | "reception.payments.mode"
  | "reception.payments.modeBank"
  | "reception.payments.modeCard"
  | "reception.payments.modeCash"
  | "reception.payments.modeManual"
  | "reception.payments.modeUpi"
  | "reception.payments.newPayment"
  | "reception.payments.noContact"
  | "reception.payments.noAdditionalDetails"
  | "reception.payments.noMembershipSelected"
  | "reception.payments.noPlan"
  | "reception.payments.recordPayment"
  | "reception.payments.reference"
  | "reception.payments.referencePlaceholder"
  | "reception.payments.reviewConsequence"
  | "reception.payments.reviewTitle"
  | "reception.payments.searchPlaceholder"
  | "reception.payments.selectMember"
  | "reception.payments.selectMemberAccessibility"
  | "reception.payments.selectMemberFirst"
  | "reception.payments.staffNote"
  | "reception.payments.subtitle"
  | "reception.payments.verified"
  | "reception.verification.title"
  | "reception.decision.addDeskNote"
  | "reception.decision.approve"
  | "reception.decision.approving"
  | "reception.decision.close"
  | "reception.decision.closeSheet"
  | "reception.decision.memberCheckIn"
  | "reception.decision.reason"
  | "reception.decision.reject"
  | "reception.decision.rejecting"
  | "attendance.mutation.approved"
  | "attendance.mutation.approveFailed"
  | "attendance.mutation.manualRecorded"
  | "attendance.mutation.manualFailed"
  | "attendance.mutation.rejected"
  | "attendance.mutation.rejectFailed"
  | "owner.referrals.allowTrainerReferrals"
  | "owner.referrals.codeExpiryDays"
  | "owner.referrals.creditInr"
  | "owner.referrals.discountInr"
  | "owner.referrals.discountPercent"
  | "owner.referrals.enabled"
  | "owner.referrals.enabledBody"
  | "owner.referrals.enabledShort"
  | "owner.referrals.flatInr"
  | "owner.referrals.freeDays"
  | "owner.referrals.limits"
  | "owner.referrals.limitSummary"
  | "owner.referrals.maxPerMemberMonth"
  | "owner.referrals.memberGymCreditBody"
  | "owner.referrals.memberRefersMember"
  | "owner.referrals.memberRefersNewGym"
  | "owner.referrals.moreRules"
  | "owner.referrals.moreRulesBody"
  | "owner.referrals.newMemberGets"
  | "owner.referrals.none"
  | "owner.referrals.off"
  | "owner.referrals.paused"
  | "owner.referrals.percent"
  | "owner.referrals.program"
  | "owner.referrals.referrerEarns"
  | "owner.referrals.saveSettings"
  | "owner.referrals.subtitle"
  | "owner.referrals.title"
  | "owner.referrals.trainerEarns"
  | "owner.referrals.trainerRefersMember"
  | "owner.referrals.trainers"
  | "owner.referrals.visits"
  | "owner.revenue.noPaymentsYet"
  | "owner.revenue.noPaymentsYetBody"
  | "owner.revenue.paymentFallback"
  | "owner.revenue.pickupPending"
  | "owner.revenue.pickupValue"
  | "owner.revenue.pickupValueBody"
  | "owner.revenue.pickupValueDone"
  | "owner.revenue.recentTransactions"
  | "owner.revenue.refund"
  | "owner.revenue.refundAccessibility"
  | "owner.revenue.refundPaymentBody"
  | "owner.revenue.refundPaymentTitle"
  | "owner.revenue.refundReview"
  | "owner.revenue.refundReviewBody"
  | "owner.revenue.refundReviewDone"
  | "owner.revenue.refundedByGym"
  | "owner.revenue.financeWork"
  | "owner.revenue.manualRecords"
  | "owner.revenue.manualRecordsBody"
  | "owner.revenue.manualRecordsDone"
  | "owner.revenue.manualRecordsWithAmount"
  | "owner.revenue.revenueToday"
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
  | "trainer.clients.coachingFocus"
  | "trainer.clients.coachingFocusBody"
  | "trainer.clients.generalFitness"
  | "trainer.clients.nextClient"
  | "trainer.clients.noClients"
  | "trainer.clients.noClientsBody"
  | "trainer.clients.noMatchingClients"
  | "trainer.clients.openNextClient"
  | "trainer.clients.searchClients"
  | "trainer.clients.subtitle"
  | "trainer.clients.title"
  | "trainer.clients.total"
  | "trainer.clients.tryAnotherSearch"
  | "trainer.aiDraft.body"
  | "trainer.aiDraft.createManual"
  | "trainer.aiDraft.title"
  | "trainer.classes.cancelBody"
  | "trainer.classes.cancelClass"
  | "trainer.classes.cancelled"
  | "trainer.classes.cancelTitle"
  | "trainer.classes.capacity"
  | "trainer.classes.classDateAccessibility"
  | "trainer.classes.className"
  | "trainer.classes.classNamePlaceholder"
  | "trainer.classes.date"
  | "trainer.classes.editAccessibility"
  | "trainer.classes.editClass"
  | "trainer.classes.keepClass"
  | "trainer.classes.loadingClasses"
  | "trainer.classes.loadingClassesBody"
  | "trainer.classes.newClass"
  | "trainer.classes.noClassesBody"
  | "trainer.classes.priceInr"
  | "trainer.classes.saveChanges"
  | "trainer.classes.schedule"
  | "trainer.classes.scheduleClass"
  | "trainer.classes.scheduling"
  | "trainer.classes.subtitle"
  | "trainer.classes.time"
  | "trainer.classes.title"
  | "trainer.classes.type"
  | "trainer.classes.typeBoxing"
  | "trainer.classes.typeCycling"
  | "trainer.classes.typeDance"
  | "trainer.classes.typeHiit"
  | "trainer.classes.typeMobility"
  | "trainer.classes.typeStrength"
  | "trainer.classes.typeYoga"
  | "trainer.classes.upcomingClasses"
  | "trainer.clientSessions.adherence"
  | "trainer.clientSessions.averageCompletion"
  | "trainer.clientSessions.backToClients"
  | "trainer.clientSessions.completePercent"
  | "trainer.clientSessions.durationMinutes"
  | "trainer.clientSessions.logged"
  | "trainer.clientSessions.noDetails"
  | "trainer.clientSessions.noPlans"
  | "trainer.clientSessions.planFeedback"
  | "trainer.clientSessions.planProgress"
  | "trainer.clientSessions.title"
  | "trainer.clientSessions.waitingForFeedback"
  | "trainer.clientDiet.addMeal"
  | "trainer.clientDiet.breakfast"
  | "trainer.clientDiet.dailyCalorieTarget"
  | "trainer.clientDiet.defaultTitle"
  | "trainer.clientDiet.kcal"
  | "trainer.clientDiet.kcalLabel"
  | "trainer.clientDiet.kcalTargetPrefix"
  | "trainer.clientDiet.mealCount"
  | "trainer.clientDiet.mealLabel"
  | "trainer.clientDiet.meals"
  | "trainer.clientDiet.mealsPlanned"
  | "trainer.clientDiet.dinner"
  | "trainer.clientDiet.lunch"
  | "trainer.clientDiet.midMorning"
  | "trainer.clientDiet.noPreviousPlan"
  | "trainer.clientDiet.planTitle"
  | "trainer.clientDiet.planTitlePlaceholder"
  | "trainer.clientDiet.preWorkout"
  | "trainer.clientDiet.previousPlan"
  | "trainer.clientDiet.publish"
  | "trainer.clientDiet.publishBody"
  | "trainer.clientDiet.publishing"
  | "trainer.clientDiet.publishTitle"
  | "trainer.clientDiet.publishToClient"
  | "trainer.clientDiet.subtitle"
  | "trainer.clientDiet.title"
  | "trainer.clientDetail.overviewTab"
  | "trainer.clientDetail.planTab"
  | "trainer.clientDetail.sessionsTab"
  | "trainer.clientOverview.nextStep"
  | "trainer.clientOverview.nextStepBody"
  | "trainer.clientOverview.reviewFeedback"
  | "trainer.clientOverview.reviewFeedbackBody"
  | "trainer.clientOverview.reviewSessions"
  | "trainer.clientOverview.reviewSessionsBody"
  | "trainer.clientPlan.assignedStatus"
  | "trainer.clientPlan.calories"
  | "trainer.clientPlan.clientDietPlanPlaceholder"
  | "trainer.clientPlan.dietPlanPublished"
  | "trainer.clientPlan.dietPublishedStatus"
  | "trainer.clientPlan.dietTitle"
  | "trainer.clientPlan.draftPrompt"
  | "trainer.clientPlan.draftSaved"
  | "trainer.clientPlan.exerciseGobletSquat"
  | "trainer.clientPlan.exerciseMachineSetup"
  | "trainer.clientPlan.exerciseNutritionCheckIn"
  | "trainer.clientPlan.exerciseRecoveryMobility"
  | "trainer.clientPlan.exerciseTemplates"
  | "trainer.clientPlan.exerciseWeeklyRoutineReview"
  | "trainer.clientPlan.noDietPlanForClient"
  | "trainer.clientPlan.planAssigned"
  | "trainer.clientPlan.planBuilder"
  | "trainer.clientPlan.planCouldNotBeCreated"
  | "trainer.clientPlan.proteinG"
  | "trainer.clientPlan.proteinPrefix"
  | "trainer.clientPlan.publishBody"
  | "trainer.clientPlan.publishFourMealDiet"
  | "trainer.clientPlan.publishToClient"
  | "trainer.clientPlan.publishToClientTitle"
  | "trainer.clientPlan.saveDraft"
  | "trainer.clientPlan.savedDraftStatus"
  | "trainer.clientPlan.saveExerciseTemplate"
  | "trainer.clientPlan.selectClientBeforeAssigning"
  | "trainer.clientPlan.selectClientBeforeDiet"
  | "trainer.clientPlan.selectClientBeforeSaving"
  | "trainer.clientPlan.templateDiet"
  | "trainer.clientPlan.templateMachine"
  | "trainer.clientPlan.templateNotes"
  | "trainer.clientPlan.templateRecovery"
  | "trainer.clientPlan.templateRoutine"
  | "trainer.clientPlan.templateWorkout"
  | "trainer.clientOverview.active"
  | "trainer.clientOverview.activeMember"
  | "trainer.clientOverview.allergyNote"
  | "trainer.clientOverview.averagePlanCompletion"
  | "trainer.clientOverview.baseline"
  | "trainer.clientOverview.bodyFatPercent"
  | "trainer.clientOverview.bodyProgressRecordedToast"
  | "trainer.clientOverview.bodyProgressTrend"
  | "trainer.clientOverview.createFirstPlan"
  | "trainer.clientOverview.dietNote"
  | "trainer.clientOverview.lastCheckIn"
  | "trainer.clientOverview.missing"
  | "trainer.clientOverview.needsFeedback"
  | "trainer.clientOverview.noLog"
  | "trainer.clientOverview.noneAdded"
  | "trainer.clientOverview.noMeasurements"
  | "trainer.clientOverview.noMeasurementsBody"
  | "trainer.clientOverview.noWorkoutLogged"
  | "trainer.clientOverview.notAdded"
  | "trainer.clientOverview.noteAudit"
  | "trainer.clientOverview.noteSavedToast"
  | "trainer.clientOverview.notShared"
  | "trainer.clientOverview.paused"
  | "trainer.clientOverview.pausedMember"
  | "trainer.clientOverview.ptPack"
  | "trainer.clientOverview.recordBodyProgress"
  | "trainer.clientOverview.saved"
  | "trainer.clientOverview.saveNote"
  | "trainer.clientOverview.shared"
  | "trainer.clientOverview.tracked"
  | "trainer.clientOverview.trainerNote"
  | "trainer.clientOverview.trainerNotePlaceholder"
  | "trainer.clientOverview.waistCm"
  | "trainer.clientOverview.weightKg"
  | "trainer.clientOverview.workoutPlan"
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
  | "trainer.pt.yourPtClients"
  | "trainer.payouts.breakdown"
  | "trainer.payouts.draft"
  | "trainer.payouts.earningLines"
  | "trainer.payouts.emptyBody"
  | "trainer.payouts.emptyTitle"
  | "trainer.payouts.settings"
  | "trainer.payouts.settingsSubtitle"
  | "trainer.payouts.thisMonthAccrued"
  | "trainer.payouts.title"
  | "trainer.payoutSettings.baseMonthly"
  | "trainer.payoutSettings.bio"
  | "trainer.payoutSettings.bioPlaceholder"
  | "trainer.payoutSettings.compensation"
  | "trainer.payoutSettings.footnote"
  | "trainer.payoutSettings.payDay"
  | "trainer.payoutSettings.payDayHint"
  | "trainer.payoutSettings.payDayInvalid"
  | "trainer.payoutSettings.perSessionFee"
  | "trainer.payoutSettings.perSessionFeeHint"
  | "trainer.payoutSettings.profileUpi"
  | "trainer.payoutSettings.ptCommission"
  | "trainer.payoutSettings.ptCommissionHint"
  | "trainer.payoutSettings.ptCommissionInvalid"
  | "trainer.payoutSettings.saveChanges"
  | "trainer.payoutSettings.subtitle"
  | "trainer.payoutSettings.title"
  | "trainer.payoutSettings.upiHint"
  | "trainer.payoutSettings.upiId"
  | "trainer.plans.activePlanWork"
  | "trainer.plans.createPlan"
  | "trainer.plans.emptyBody"
  | "trainer.plans.emptyTitle"
  | "trainer.plans.needsFirstPlan"
  | "trainer.plans.needsFirstPlanBody"
  | "trainer.plans.queueClear"
  | "trainer.plans.queueClearBody"
  | "trainer.plans.clientDetail"
  | "trainer.plans.reviewActivePlans"
  | "trainer.plans.reviewActivePlansBody"
  | "trainer.plans.title";

type TranslationValues = Record<string, string | number>;

const translations: Record<AppLocale, Record<TranslationKey, string>> = {
  en: {
    "app.loadingSession": "Restoring your Zook session...",
    "app.launchTagline": "Gym ops, without the clutter.",
    "app.configErrorTitle": "Zook can't open in this build.",
    "app.configErrorBody": "Please update the app or contact support if this keeps happening.",
    "common.cancel": "Cancel",
    "common.confirm": "Confirm",
    "common.actionFailed": "Action failed",
    "common.datePicker": "Date picker",
    "common.back": "Back",
    "common.dismiss": "Dismiss",
    "common.done": "Done",
    "common.scheduled": "Scheduled",
    "common.today": "Today",
    "common.tomorrow": "Tomorrow",
    "common.or": "or",
    "common.saving": "Saving...",
    "common.authenticationRequired": "Authentication is required.",
    "common.activeGymRequired": "An active gym is required.",
    "common.closeSheet": "Close sheet",
    "common.dismissNotification": "Dismiss notification",
    "common.tryAgain": "Try again",
    "common.tryAgainMoment": "Try again in a moment.",
    "common.ok": "OK",
    "common.notNow": "Not now",
    "common.enable": "Enable",
    "common.plusCount": "+{{count}} more",
    "network.timeout": "Request timed out. Try again in a moment.",
    "network.connectionUnavailable": "Connection failed. Try again.",
    "auth.biometricPromptBody": "Use Face ID or your device biometrics next time.",
    "auth.biometricPromptTitle": "Unlock Zook faster?",
    "auth.gymUnavailableForAccount": "Gym not available for this account",
    "auth.roleUnavailableForOrg": "Role not available in active org",
    "auth.socialNoToken": "{{provider}} did not return a sign-in token. Try again.",
    "auth.socialUnavailable":
      "{{provider}} sign-in needs the installed Zook app (not available in Expo Go).",
    "approvalQueue.approve": "Approve",
    "approvalQueue.approving": "Approving...",
    "approvalQueue.reject": "Reject",
    "approvalQueue.rejecting": "Rejecting...",
    "branch.removedSwitched": "Your branch was removed - switched to {{name}}.",
    "privilegedAction.pinLoading":
      "PIN entry is still loading. Try again after the app finishes opening.",
    "payments.statusRefreshed": "Payment status refreshed",
    "routeGuard.billingSetupRequiredBody":
      "Open billing to set up the trial mandate before continuing.",
    "routeGuard.permissionDeniedBody": "You don't have permission for that action.",
    "routeGuard.permissionDeniedTitle": "Permission denied",
    "webHandoff.copyLink": "Copy link",
    "webHandoff.linkCopied": "Link copied.",
    "webHandoff.manageOnWeb": "{{title}}, manage on web",
    "webHandoff.open": "Open",
    "webHandoff.subtitleDefault": "zookfit.in dashboard",
    "payments.mutation.paymentRecordFailed": "Payment could not be recorded.",
    "payments.mutation.paymentRecorded": "Payment recorded.",
    "payments.mutation.refundFailed": "Refund could not be issued.",
    "payments.mutation.refundIssued": "Refund issued.",
    "payments.mutation.testCompleted": "Test payment completed.",
    "payments.mutation.testFailed": "Test payment could not be completed.",
    "shop.mutation.orderCreateFailed": "Order could not be created.",
    "shop.mutation.orderCreated": "Order created.",
    "shop.mutation.pickupFulfillFailed": "Pickup order could not be fulfilled.",
    "shop.mutation.pickupFulfilled": "Pickup order fulfilled.",
    "gym.mutation.reviewFailed": "Could not post your review.",
    "gym.mutation.reviewThanks": "Thanks for your review!",
    "gym.mutation.signInReview": "Sign in again to post a review.",
    "plans.mutation.progressFailed": "Plan progress could not be saved.",
    "plans.mutation.progressSaved": "Plan progress saved.",
    "rewards.mutation.signInWithdrawal": "Sign in again to request a withdrawal.",
    "rewards.mutation.withdrawalFailed": "Could not request a withdrawal.",
    "rewards.mutation.withdrawalRequested":
      "Withdrawal requested. We'll review and pay it out shortly.",
    "exerciseTemplates.mutation.removeFailed": "Could not remove exercise template.",
    "exerciseTemplates.mutation.removeSuccess": "Exercise template removed.",
    "exerciseTemplates.mutation.saveFailed": "Could not save exercise template.",
    "exerciseTemplates.mutation.saveSuccess": "Exercise template saved.",
    "exerciseTemplates.mutation.signInRemove": "Sign in again to remove templates.",
    "exerciseTemplates.mutation.signInSave": "Sign in again to save templates.",
    "owner.mutation.billingMandateCreated": "Billing mandate created.",
    "owner.mutation.billingMandateFailed": "Billing mandate could not be created.",
    "owner.mutation.checkoutFailed": "Subscription checkout could not be started.",
    "owner.mutation.checkoutStarted": "Subscription checkout started.",
    "owner.mutation.couponRemoveFailed": "Could not remove coupon.",
    "owner.mutation.couponRemoved": "Coupon removed.",
    "owner.mutation.couponSaveFailed": "Could not save coupon.",
    "owner.mutation.couponSaved": "Coupon saved.",
    "owner.mutation.inviteFailed": "Could not send invite.",
    "owner.mutation.inviteSent": "Invite sent.",
    "owner.mutation.joinApproveFailed": "Join request could not be approved.",
    "owner.mutation.joinApproved": "Join request approved.",
    "owner.mutation.joinRejectFailed": "Join request could not be rejected.",
    "owner.mutation.joinRejected": "Join request rejected.",
    "owner.mutation.payoutMarkFailed": "Could not mark payout paid.",
    "owner.mutation.payoutMarkedPaid": "Payout marked paid.",
    "owner.mutation.payoutSettingsFailed": "Could not save payout settings.",
    "owner.mutation.payoutSettingsSaved": "Payout settings saved.",
    "owner.mutation.planRemoveFailed": "Could not remove plan.",
    "owner.mutation.planRemoved": "Plan removed.",
    "owner.mutation.planSaveFailed": "Could not save plan.",
    "owner.mutation.planSaved": "Plan saved.",
    "owner.mutation.referralFailed": "Could not save referral settings.",
    "owner.mutation.referralSaved": "Referral settings saved.",
    "owner.mutation.roleUpdateFailed": "Could not update role.",
    "owner.mutation.roleUpdated": "Role updated.",
    "owner.mutation.staffRemoveFailed": "Could not remove staff member.",
    "owner.mutation.staffRemoved": "Staff member removed.",
    "owner.mutation.subscriptionCancelFailed": "Subscription could not be cancelled.",
    "owner.mutation.subscriptionCancellationScheduled": "Subscription cancellation scheduled.",
    "trainer.mutation.attendanceUpdateFailed": "Attendance could not be updated.",
    "trainer.mutation.classCancelFailed": "Could not cancel class.",
    "trainer.mutation.classCancelled": "Class cancelled.",
    "trainer.mutation.classScheduleFailed": "Could not schedule class.",
    "trainer.mutation.classScheduled": "Class scheduled.",
    "trainer.mutation.classUpdateFailed": "Could not update class.",
    "trainer.mutation.classUpdated": "Class updated.",
    "trainer.mutation.dietPublishFailed": "Could not publish diet plan.",
    "trainer.mutation.dietPublished": "Diet plan published.",
    "trainer.mutation.packageCreateFailed": "Could not create package.",
    "trainer.mutation.packageCreated": "Package created.",
    "trainer.mutation.packageRemoveFailed": "Could not remove package.",
    "trainer.mutation.packageRemoved": "Package removed.",
    "trainer.mutation.packageUpdateFailed": "Could not update package.",
    "trainer.mutation.packageUpdated": "Package updated.",
    "trainer.mutation.payoutSettingsFailed": "Could not save payout settings.",
    "trainer.mutation.payoutSettingsSaved": "Payout settings saved.",
    "trainer.mutation.profileFailed": "Could not save profile.",
    "trainer.mutation.profileSaved": "Profile saved.",
    "trainer.mutation.ptClientAddFailed": "Could not add client.",
    "trainer.mutation.ptClientAdded": "PT client added.",
    "trainer.mutation.ptRequestApproveFailed": "Could not approve the request.",
    "trainer.mutation.ptRequestApproved": "PT request approved.",
    "trainer.mutation.sessionLogFailed": "Could not log session.",
    "trainer.mutation.sessionLogged": "Session logged.",
    "network.offline": "Working offline. Data may be stale.",
    "notFound.body": "The link may be old, or this role may not have access to that workflow.",
    "notFound.goWorkspace": "Go to my workspace",
    "notFound.helper": "Return to your workspace to continue.",
    "notFound.title": "This screen is not available",
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
    "nav.entryQr": "Entry QR",
    "notifications.today": "Today",
    "notifications.yesterday": "Yesterday",
    "notifications.earlierThisWeek": "Earlier this week",
    "notifications.older": "Older",
    "notifications.allCaughtUp": "All caught up",
    "notifications.allCaughtUpRecent": "All caught up · recent {{date}}",
    "notifications.allMarkedRead": "All notifications marked read.",
    "notifications.attendanceAlertReceived": "Attendance alert received",
    "notifications.backToInbox": "Back to inbox",
    "notifications.closeDetails": "Close notification details",
    "notifications.couldNotUpdate": "Notification could not be updated.",
    "notifications.couldNotUpdateMany": "Notifications could not be updated.",
    "notifications.done": "Done",
    "notifications.emptyBody": "New alerts about your membership, classes and coaching land here.",
    "notifications.emptyTitle": "You're all caught up",
    "notifications.fallbackTitle": "Notification",
    "notifications.linkedActions": "Linked actions",
    "notifications.linkedActionsBody": "Open details or next screens from here.",
    "notifications.markAllRead": "Mark all read",
    "notifications.markRead": "Mark read",
    "notifications.markedRead": "Notification marked read.",
    "notifications.noDetails": "No details available.",
    "notifications.openedFromPush": "Opened from push notification",
    "notifications.openingSuffix": " · Opening...",
    "notifications.openLinkedScreen": "Open linked screen",
    "notifications.showFewer": "Show fewer",
    "notifications.showFewerOlder": "Show fewer older notifications",
    "notifications.showOlder": "Show older notifications",
    "notifications.showOlderCount": "Show {{count}} older",
    "notifications.timeDays": "{{count}}d",
    "notifications.timeHours": "{{count}}h",
    "notifications.timeMinutes": "{{count}}m",
    "notifications.timeNow": "now",
    "notifications.totalMessages": "Total",
    "notifications.totalMessagesBody": "Grouped by when they arrived.",
    "notifications.unread": "Unread",
    "notifications.unreadBody": "Read these first.",
    "notifications.unreadCount": "{{count}} unread",
    "notifications.unreadRecent": "{{count}} unread · recent {{date}}",
    "platform.billing": "Platform billing",
    "platform.gymSubtitle":
      "{{tier}} {{cycle}} · {{amount}} · next {{next}} · {{referrals}} referrals",
    "platform.gyms": "gyms",
    "platform.loadingSubscriptionHealth": "Loading subscription health...",
    "platform.mandateMeta": "Mandate {{status}} · {{count}} paid",
    "platform.missing": "missing",
    "platform.mobileVisibilityBody":
      "Pricing edits, trial extensions, credits, notes, and policy changes still open in the web console for full review.",
    "platform.mobileVisibilityTitle": "SaaS subscriptions are visible on mobile.",
    "platform.notScheduled": "Not scheduled",
    "platform.openWebDashboard": "Open Web Dashboard",
    "platform.operator": "Platform operator",
    "platform.paying": "paying",
    "platform.recentGyms": "Recent gyms",
    "platform.referrals": "referrals",
    "platform.saasHealth": "SaaS health",
    "platform.signOut": "Sign out",
    "platform.subtitle": "{{name}} · SaaS health and mandate state",
    "platform.team": "Platform team",
    "platform.trial": "trial",
    "platform.updating": "Updating",
    "auth.heroEyebrow": "Fitness Operating System",
    "auth.heroBody": "Your gym, your membership, your rhythm. Sign in to get started.",
    "auth.signIn": "Sign in",
    "auth.verifyCode": "Verify Code",
    "auth.identifierSubtitle": "Use your registered email or mobile number.",
    "auth.otpSubtitle": "Check your messages.",
    "auth.memberPathBody": "Membership, QR entry, classes, shop orders, and checkout.",
    "auth.memberPathTitle": "Members",
    "auth.staffPathBody": "Desk payments, approvals, class rosters, clients, and owner tools.",
    "auth.staffPathTitle": "Owners and staff",
    "auth.trainerPathBody": "Client plans, sessions, classes, payouts, and coaching notes.",
    "auth.trainerPathTitle": "Trainers",
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
    "auth.tooManyAttempts": "Too many attempts. Try again in {{seconds}}s.",
    "auth.qaShortcuts": "QA shortcuts",
    "assistant.attachSummary": "Attach summary",
    "assistant.attachedClientData": "Attached client data",
    "assistant.attachedProfile": "Attached profile",
    "assistant.clear": "Clear",
    "assistant.clearConversation": "Clear conversation",
    "assistant.clientData": "Client data",
    "assistant.contextActivePlans": "Active plans",
    "assistant.contextAllergies": "Allergies",
    "assistant.contextClient": "Client",
    "assistant.contextDiet": "Diet",
    "assistant.contextGoal": "Goal",
    "assistant.contextPlans": "Plans",
    "assistant.contextWeight": "Weight",
    "assistant.copied": "Copied",
    "assistant.copyHint": "Long press to copy",
    "assistant.inputPlaceholder": "Ask in any language...",
    "assistant.memberEyebrow": "Plan assistant",
    "assistant.memberPromptFocus": "What should I focus on today?",
    "assistant.memberPromptFood": "What should I eat after training?",
    "assistant.memberPromptWorkout": "Make my workout easier to follow.",
    "assistant.memberStarter":
      "Ask in any language. I can help with your assigned plans, diet preferences, recovery, and gym routine.",
    "assistant.memberSubtitle": "Ask in any language — answers are tied to your profile.",
    "assistant.memberTitle": "Talk through training",
    "assistant.myProfile": "My profile",
    "assistant.notSavedToastBody": "New messages may not be restored next time.",
    "assistant.notSavedToastTitle": "Assistant not saved",
    "assistant.resetToastBody": "Saved messages were unreadable.",
    "assistant.resetToastTitle": "Assistant reset",
    "assistant.send": "Send",
    "assistant.thinking": "Thinking...",
    "assistant.trainerEyebrow": "Trainer assistant",
    "assistant.trainerPromptPlan": "Draft a 4-week hypertrophy plan.",
    "assistant.trainerPromptSummary": "Summarize this client's progress.",
    "assistant.trainerPromptSwaps": "Suggest safe exercise swaps.",
    "assistant.trainerStarter":
      "Send a client summary, workout data, or a natural-language question. I can help draft plans, diet notes, and recovery guidance.",
    "assistant.trainerSubtitle": "Attach client summaries, import notes, draft plans.",
    "assistant.trainerTitle": "Coach with context",
    "assistant.unavailableBody": "Owner and desk operations stay in the web dashboard.",
    "assistant.unavailableTitle": "Plan assistant",
    "classRoster.attendanceHint":
      "Tap the check or cross next to a member to mark them present or no-show.",
    "classRoster.bookedCount": "{{count}}/{{capacity}} booked",
    "classRoster.confirmed": "Confirmed",
    "classRoster.confirmedCount": "Confirmed ({{count}})",
    "classRoster.markedNoShowAccessibility": "{{name}} marked no-show",
    "classRoster.markedPresentAccessibility": "{{name}} marked present",
    "classRoster.markNoShowAccessibility": "Mark {{name}} no-show",
    "classRoster.markPresentAccessibility": "Mark {{name}} present",
    "classRoster.memberFallback": "Member",
    "classRoster.noBookings": "No bookings yet",
    "classRoster.noBookingsBody": "Members who book this class will show up here.",
    "classRoster.subtitle": "Who's coming to this class",
    "classRoster.title": "Class roster",
    "classRoster.waitlist": "Waitlist",
    "classRoster.waitlistCount": "Waitlist ({{count}})",
    "classRoster.waitlistHint":
      "Waitlisted members are promoted automatically when someone cancels.",
    "entryQr.branchAware": "Branch-aware",
    "entryQr.branchAwareBody":
      "This QR is tied to your active branch. Only members with a valid membership at this gym can check in — others are turned away automatically.",
    "entryQr.loadingQr": "Loading QR...",
    "entryQr.manualCode": "Manual check-in code",
    "entryQr.noQr": "No QR",
    "entryQr.print": "Print",
    "entryQr.regenerate": "Regenerate",
    "entryQr.refreshesIn": "Refreshes in {{seconds}}s",
    "entryQr.refreshing": "Refreshing...",
    "entryQr.refreshNow": "Refresh now",
    "entryQr.rollingMode": "Rolling",
    "entryQr.secureToken": "Secure rolling token",
    "entryQr.secureTokenBody":
      "Rotates automatically. Members scan the QR or type the code in Zook.",
    "entryQr.staticMode": "Static",
    "entryQr.subtitle": "Display this at your entrance. Members scan it to check in.",
    "entryQr.title": "Entry QR",
    "onboarding.allInOne": "All in one",
    "onboarding.allInOneCopy":
      "Memberships, classes, payments and store pickup — all in one place.",
    "onboarding.brand": "Zook",
    "onboarding.builtForGymDays": "Built for gym days",
    "onboarding.changeLanguageAnytime": "You can change this any time in Settings.",
    "onboarding.continue": "Continue",
    "onboarding.continueToSignIn": "Continue to sign in",
    "onboarding.couldNotSaveLanguage": "Couldn't save language",
    "onboarding.couldNotSavePreference": "Couldn't save preference",
    "onboarding.findGym": "Find your gym",
    "onboarding.findGymCopy":
      "Discover gyms near you across Pune, Mumbai, Bengaluru, Delhi and 50+ cities.",
    "onboarding.pickLanguage": "Pick your language",
    "onboarding.skip": "Skip",
    "onboarding.skipIntro": "Skip intro",
    "onboarding.skipOnboarding": "Skip onboarding",
    "onboarding.splashBadge": "Gym ops, without the clutter.",
    "onboarding.splashSubtitle":
      "Check-ins, memberships, plans, and the front desk flow in one place.",
    "onboarding.trainTrack": "Train & track",
    "onboarding.trainTrackCopy":
      "Scan in seconds, follow your plan, and watch every workout add up.",
    "qa.aarogyaGym": "Aarogya gym",
    "qa.adminApprovals": "Admin approvals",
    "qa.adminHome": "Admin home",
    "qa.adminMore": "Admin more",
    "qa.adminStock": "Admin stock",
    "qa.gyms": "Gyms",
    "qa.login": "Login",
    "qa.memberAssistant": "Member assistant",
    "qa.memberAttendanceDetail": "Member attendance detail",
    "qa.memberClasses": "Member classes",
    "qa.memberHistory": "Member history",
    "qa.memberHome": "Member home",
    "qa.memberMembership": "Member membership",
    "qa.memberNotifications": "Member notifications",
    "qa.memberPlan": "Member plan",
    "qa.memberProgress": "Member progress",
    "qa.memberScan": "Member scan",
    "qa.memberShop": "Member shop",
    "qa.memberTrackingEntry": "Member tracking entry",
    "qa.ownerApprovals": "Owner approvals",
    "qa.ownerBilling": "Owner billing",
    "qa.ownerHome": "Owner home",
    "qa.ownerMemberDetail": "Owner member detail",
    "qa.ownerMembers": "Owner members",
    "qa.ownerMore": "Owner more",
    "qa.ownerNotifications": "Owner notifications",
    "qa.ownerRevenue": "Owner revenue",
    "qa.ownerStock": "Owner stock",
    "qa.public": "Public",
    "qa.receptionHome": "Reception home",
    "qa.receptionMemberDetail": "Reception member detail",
    "qa.receptionMembers": "Reception members",
    "qa.receptionOrders": "Reception orders",
    "qa.receptionPayments": "Reception payments",
    "qa.receptionScan": "Reception scan",
    "qa.receptionVerification": "Reception verification",
    "qa.roles": "Roles",
    "qa.title": "QA shortcuts",
    "qa.trainerClientDetail": "Trainer client detail",
    "qa.trainerClientPlan": "Trainer client plan",
    "qa.trainerClientSessions": "Trainer client sessions",
    "qa.trainerClients": "Trainer clients",
    "qa.trainerHome": "Trainer home",
    "qa.trainerPayouts": "Trainer payouts",
    "qa.trainerPlans": "Trainer plans",
    "qa.valueProps": "Value props",
    "settings.profileTitle": "Profile",
    "settings.profileSubtitle": "Account, notifications, and support",
    "settings.goBack": "Go back",
    "settings.account": "Account",
    "settings.accountSubtitle": "Name, phone, email, and biometric unlock",
    "settings.addContact": "Add {{contact}}",
    "settings.addFewDetails": "Add a few details",
    "settings.activeGymPreferenceNote": "Changes apply to your active gym when available.",
    "settings.appearanceSubtitle": "Theme and default role",
    "settings.biometricUnlock": "Biometric unlock",
    "settings.signedIn": "Signed in",
    "settings.contactVerification": "Contact verification",
    "settings.contactVerifiedUpdated": "{{contact}} verified. Your account has been updated.",
    "settings.couldNotSendOtp": "Could not send OTP.",
    "settings.couldNotSendReport": "Could not send report",
    "settings.couldNotVerifyOtp": "Could not verify OTP.",
    "settings.currentValue": "Current: {{value}}",
    "settings.enterCodeSentTo": "Enter the code sent to {{identifier}}.",
    "settings.enterContactOtp": "Enter {{contact}} OTP",
    "settings.enterEmail": "Enter your email.",
    "settings.enterMobile": "Enter your mobile number.",
    "settings.enterSixDigitOtp": "Enter the 6 digit OTP.",
    "settings.useZookAs": "Use Zook as",
    "settings.name": "Name",
    "settings.email": "Email",
    "settings.phone": "Phone",
    "settings.emailPlaceholder": "you@example.com",
    "settings.mobileNumber": "Mobile number",
    "settings.noEmailLinked": "No email linked.",
    "settings.noMobileLinked": "No mobile number linked.",
    "settings.notSet": "Not set",
    "settings.otpFor": "OTP for {{identifier}}",
    "settings.problemDetails": "Problem details",
    "settings.problemDetailsPlaceholder": "I was trying to...",
    "settings.reportProblem": "Report a problem",
    "settings.reportProblemBody": "Include the issue, what you expected, and what happened.",
    "settings.reportSent": "Report sent to support.",
    "settings.sendReport": "Send report",
    "settings.signInAgainContact": "Sign in again to update your contact details.",
    "settings.supportContext": "{{role}} · {{gym}} · {{version}}",
    "settings.supportDetailsPrompt": "Tell us what went wrong so support can follow up.",
    "settings.terms": "Terms",
    "settings.termsSubtitle": "View terms of service",
    "settings.updateContact": "Update {{contact}}",
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
    "settings.notificationsSubtitle": "Push categories and reminders",
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
    "settings.preferenceNotSaved": "Preference was not saved.",
    "settings.language": "Language",
    "settings.languageSubtitle": "Choose app language",
    "settings.languageSystem": "System",
    "settings.languageEnglish": "English",
    "settings.languageHindi": "Hindi",
    "settings.privacyData": "Privacy & data",
    "settings.privacySubtitle": "Export or delete data",
    "settings.privacyRequestBody":
      "Request a copy of your Zook data or start an account deletion request.",
    "settings.privacyWarning": "These requests are saved and reviewed before anything changes.",
    "settings.requestAccountDeletion": "Request account deletion",
    "settings.requestDataExport": "Request data export",
    "settings.requestDeletion": "Request deletion",
    "settings.deleteConfirmTitle": "Request account deletion?",
    "settings.deleteConfirmBody":
      "Zook support will review this request before any account data is removed.",
    "settings.export": "Export",
    "settings.delete": "Delete",
    "settings.exportRequested":
      "Export requested. You'll receive an email when the file is available.",
    "settings.deletionRequested": "Deletion requested. This is being reviewed before execution.",
    "settings.noExport": "No export request",
    "settings.noDeletion": "No deletion request",
    "settings.system": "System",
    "settings.systemSubtitle": "Help, policies, and app info",
    "settings.supportSubtitle": "Contact, legal, and app version",
    "settings.helpCenter": "Help center",
    "settings.helpCenterSubtitle": "Open zookfit.in/help",
    "settings.privacyPolicy": "Privacy Policy",
    "settings.privacyPolicySubtitle": "View privacy policy",
    "settings.theme": "Theme",
    "settings.verifyContactType": "Verify {{contact}}",
    "settings.version": "Version {{version}}",
    "settings.defaultRole": "Default role",
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
    "rewards.activity": "Activity",
    "rewards.earnCashPerGym": "Earn {{amount}} per gym",
    "rewards.earnDaysPerGym": "Earn {{count}} free days per gym",
    "rewards.freeDaysAdded":
      "Free Zook days are added to your subscription automatically once a referred gym subscribes.",
    "rewards.lifetime": "Lifetime",
    "rewards.minToWithdraw": "Min {{amount}} to withdraw",
    "rewards.noEarningsYet": "No earnings yet",
    "rewards.noEarningsYetBody": "Share your link — you'll earn when a gym you refer subscribes.",
    "rewards.readyToWithdraw": "Ready to withdraw",
    "rewards.request": "Request",
    "rewards.requesting": "Requesting...",
    "rewards.requestWithdrawal": "Request withdrawal",
    "rewards.requestWithdrawalBody":
      "We'll review and pay out {{amount}} to you. You'll get a confirmation once it's sent.",
    "rewards.requestWithdrawalTitle": "Request withdrawal?",
    "rewards.shareMessage": "Run your gym on Zook — sign up with my link: {{url}}",
    "rewards.shareHint": "Share with gym owners",
    "rewards.shareYourLink": "Share your link",
    "rewards.status.clearing": "Clearing",
    "rewards.status.paid": "Paid",
    "rewards.status.pending": "Pending",
    "rewards.status.ready": "Ready",
    "rewards.status.requested": "Requested",
    "rewards.status.reversed": "Reversed",
    "rewards.subtitle": "Bring new gyms to Zook and get rewarded.",
    "rewards.title": "Refer & earn",
    "rewards.yourEarnings": "Your earnings",
    "referral.opening": "Opening referral...",
    "referral.card.copyCodeAccessibility": "Copy referral code {{code}}",
    "referral.card.referFriend": "Refer a friend",
    "referral.card.rewardCount": "{{count}} reward",
    "referral.card.rewardCount_plural": "{{count}} rewards",
    "referral.card.shareCode": "Share referral code",
    "referral.card.unlimited": "unlimited",
    "referral.card.used": "{{used}}/{{max}} used · {{rewards}}",
    "branch.switch": "Switch branch",
    "branch.switchGym": "Switch gym",
    "branch.current": "Current branch",
    "branch.currentGym": "Current gym",
    "branch.branchPrefix": "Branch:",
    "branch.allBranches": "All branches",
    "branch.branches": "Branches",
    "branch.enrolledGyms": "Gyms you manage",
    "branch.gymSubscriptionScope":
      "Choose the gym you operate here. Billing stays on the owner account, and each gym can manage its own branches.",
    "branch.manageGym": "Manage gym",
    "branch.openMap": "Open map",
    "branch.mapReady": "Map ready",
    "branch.mapMissing": "Map missing",
    "branch.selectorSubtitle": "Choose where this app session should point.",
    "branch.useBranch": "Use",
    "branch.useGym": "Use",
    "shop.readyForPickup": "Ready for pickup",
    "shop.readyForPickupSubtitle": "Show this code at the front desk.",
    "shop.addShort": "Add",
    "shop.addProductAccessibility": "Add {{name}}",
    "shop.availableAtGymDesk": "Available at gym desk after payment",
    "shop.pickupCode": "Pickup code",
    "shop.pickupCodeCopied": "Pickup code copied.",
    "shop.pickupCodeCopyFailed": "Could not copy pickup code.",
    "shop.pickupCodePending": "Pickup code pending",
    "shop.pending": "Pending",
    "shop.paid": "Paid",
    "shop.signedPickupQrCode": "Signed pickup QR code",
    "shop.branchLabel": "Branch",
    "shop.browserReturnBody":
      "Come back after payment. Zook refreshes your order status automatically.",
    "shop.cartReset": "Cart reset",
    "shop.cartResetBody": "We could not restore your saved cart.",
    "shop.categoryAll": "All",
    "shop.categoryCups": "Cups",
    "shop.categoryShake": "Shake",
    "shop.categorySupplements": "Supplements",
    "shop.categoryTowel": "Towel",
    "shop.categoryWater": "Water",
    "shop.checkStatus": "Check status",
    "shop.checking": "Checking...",
    "shop.checkoutConsequence":
      "After payment, Zook creates a pickup code for desk verification. Do not collect without the code.",
    "shop.checkoutCreated": "Checkout created.",
    "shop.deskPaymentOrderCreated": "Order sent to the desk.",
    "shop.codeWithValue": "Code: {{code}}",
    "shop.continuePayment": "Continue to payment",
    "shop.continueWithTotal": "Continue · {{amount}}",
    "shop.continueInBrowser": "Continue in browser",
    "shop.confirming": "Confirming...",
    "shop.awaitingDeskPayment": "Awaiting desk payment",
    "shop.choosePaymentMethod": "Choose payment method",
    "shop.choosePaymentMethodSubtitle": "Pay online now or pay at the gym desk.",
    "shop.copyPickupCodeAccessibility": "Copy pickup code {{code}}",
    "shop.couldNotCreateCheckout": "Could not create checkout.",
    "shop.backToShop": "Back to Shop",
    "shop.payment": "Payment",
    "shop.paymentSubtitle": "Pickup unlocks after payment.",
    "shop.paymentConfirmed": "Payment confirmed.",
    "shop.paymentCouldNotComplete": "Payment could not be completed.",
    "shop.paymentStillPending": "Payment is still pending. Try again in a moment.",
    "shop.paymentPending": "Payment pending",
    "shop.payAtDesk": "Pay at Desk",
    "shop.payAtDeskBody": "Cash, UPI, card, or bank transfer at the front desk.",
    "shop.payAtDeskInstructions":
      "Ask the front desk to collect this order payment. Once they record it, Zook will create your pickup code.",
    "shop.payAtDeskSubtitle": "Pay at the front desk to unlock your pickup code.",
    "shop.payOnline": "Pay Online",
    "shop.payOnlineBody": "Open secure online checkout and return here for your pickup code.",
    "shop.payAmountNow": "Pay {{amount}} now",
    "shop.payNow": "Pay now",
    "shop.payAtDeskInstead": "Pay at desk instead",
    "shop.otherPaymentOptions": "Other payment options",
    "shop.paySecurely": "Pay securely",
    "shop.confirmOrder": "Confirm the order",
    "shop.getPickupCode": "Get pickup code",
    "shop.makeDeskCode": "We will make a code for the desk",
    "shop.collectAtDesk": "Collect at desk",
    "shop.showPickupCode": "Show the code to pick it up",
    "shop.showThisToCollect": "Show this to collect your order",
    "shop.orderTotal": "Order total",
    "shop.pickupCheckout": "Pickup checkout",
    "shop.itemsLabel": "Items",
    "shop.itemCount": "{{count}} item",
    "shop.itemsCount": "{{count}} items",
    "shop.pickupLabel": "Pickup",
    "shop.selectedGym": "Selected gym",
    "shop.cart": "Cart",
    "shop.reviewOrder": "Review order",
    "shop.reviewOrderSubtitle": "Pick it up at the front desk after payment.",
    "shop.back": "Back",
    "shop.creating": "Creating...",
    "shop.inStockCount": "{{count}} in stock",
    "shop.mockPaymentUnavailable": "Mock payment completion is not available in backend builds.",
    "shop.onlyLeft": "Only {{count}} left",
    "shop.orderHistory": "Order history",
    "shop.orderHistorySubtitle": "Pickup and payment orders appear first.",
    "shop.activeOrders": "Active orders",
    "shop.activeOrdersShort": "Orders",
    "shop.activeOrdersBody": "Payment or pickup items waiting.",
    "shop.cartStatus": "Cart",
    "shop.cartStatusBody": "{{amount}} ready for checkout.",
    "shop.readyStock": "Ready stock",
    "shop.readyStockShort": "Stock",
    "shop.readyStockBody": "Items available for desk pickup.",
    "shop.orderBeingPrepared": "Paid. The desk is preparing your order.",
    "shop.orderCancelled": "This order was cancelled.",
    "shop.orderNeedsPayment": "Payment is pending. Open this order to continue.",
    "shop.orderPickedUp": "Picked up at the desk.",
    "shop.orderReady": "Ready for pickup at the desk.",
    "shop.orderReadyWithCode": "Code {{code}}",
    "shop.outOfStock": "Out of stock",
    "shop.outShort": "Out",
    "shop.yourCartEmpty": "Your cart is empty",
    "shop.subtotal": "Subtotal",
    "shop.openMiniCart": "Open mini cart",
    "shop.openCart": "Open cart",
    "shop.deskPickup": "Desk pickup",
    "shop.activeGym": "Active gym",
    "shop.recently": "Recently",
    "shop.removeProductAccessibility": "Remove {{name}}",
    "shop.searchEssentials": "Search essentials",
    "shop.availableNow": "Available now",
    "shop.searchResults": "Search results",
    "shop.title": "Shop",
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
    "findGyms.availableGyms": "Available gyms",
    "findGyms.allAreas": "All areas",
    "findGyms.city": "City",
    "findGyms.coverPhoto": "{{name}} cover photo",
    "findGyms.discovery": "Discovery",
    "findGyms.gymNameOrUsername": "Gym name or username",
    "findGyms.noGyms": "No gyms",
    "findGyms.noGymsBody": "Try widening the city or clearing the search.",
    "findGyms.logo": "{{name}} logo",
    "findGyms.loadError": "Gyms did not load",
    "findGyms.openGym": "Open {{name}}",
    "findGyms.referralApplied": "Referral code applied",
    "findGyms.referralPrefix": "Code",
    "findGyms.referralSuffix": "is attached. Open any gym to use it.",
    "findGyms.resultCountMany": "{{count}} results",
    "findGyms.resultCountOne": "1 result",
    "findGyms.searching": "Searching...",
    "findGyms.searchLabel": "Search gyms",
    "findGyms.title": "Find your gym",
    "findGyms.view": "View",
    "findGyms.viewProfile": "View profile",
    "gymProfile.activeUntil": "Active until {{date}}",
    "gymProfile.address": "Address",
    "gymProfile.alreadyActive": "Already active",
    "gymProfile.apply": "Apply",
    "gymProfile.approvedDate": "Approved {{date}}",
    "gymProfile.approvedForPayment": "Approved for payment",
    "gymProfile.atAGlance": "At a glance",
    "gymProfile.choosePlan": "Choose plan",
    "gymProfile.choosePlanToContinue": "Choose a plan to continue.",
    "gymProfile.coaches": "Coaches",
    "gymProfile.completeEarlierStep": "Complete earlier step first",
    "gymProfile.couldNotLoad": "Could not load this gym",
    "gymProfile.currentMembership": "Current membership",
    "gymProfile.dateRange": "{{start}} to {{end}}",
    "gymProfile.daysCount": "{{count}} days",
    "gymProfile.demoTagline": "Strength, PT, and recovery in one gym workspace.",
    "gymProfile.distanceKm": "{{distance}} km away",
    "gymProfile.distanceMeters": "{{distance}} m away",
    "gymProfile.distanceUnavailable": "Distance unavailable",
    "gymProfile.equipment": "Equipment",
    "gymProfile.eyebrow": "Gym profile",
    "gymProfile.flexibleMembership": "Flexible membership",
    "gymProfile.getDirections": "Get directions",
    "gymProfile.gettingThere": "Getting there",
    "gymProfile.howToJoin": "How to join",
    "gymProfile.inside": "Inside",
    "gymProfile.instant": "Instant",
    "gymProfile.inviteCode": "Invite code",
    "gymProfile.inviteOnly": "Invite only",
    "gymProfile.inviteReferralRequired": "Invite or referral required",
    "gymProfile.inviteReferralRequiredBody":
      "Open this gym from a referral link or ask the gym team for a code to continue.",
    "gymProfile.joinFlow": "Join flow",
    "gymProfile.joinModeApproval": "Approval required",
    "gymProfile.joinModeInvite": "Invite only",
    "gymProfile.joinModeOpen": "Anyone can join",
    "gymProfile.joinPath": "Join path",
    "gymProfile.joinRequest": "Join request",
    "gymProfile.location": "Location",
    "gymProfile.membershipOptions": "Membership options",
    "gymProfile.membershipProfile": "Membership profile",
    "gymProfile.membershipRequestSubmitted": "Membership request submitted.",
    "gymProfile.membershipRequestSubmittedBody":
      "Membership request submitted. The gym team can now review it from their dashboard.",
    "gymProfile.membershipState": "Membership state",
    "gymProfile.moveStraightToPayment": "You can move straight to payment.",
    "gymProfile.noBioAdded": "No bio added.",
    "gymProfile.noPublicPlans": "No public plans",
    "gymProfile.noPublicTrainerProfiles": "No public trainer profiles",
    "gymProfile.noTrainerBioPublished": "No trainer bio published.",
    "gymProfile.notFound": "Gym not found",
    "gymProfile.notFoundBody": "This link may be expired or the gym may have moved.",
    "gymProfile.openTrainerProfile": "Open {{name}} profile",
    "gymProfile.openingPayment": "Opening payment...",
    "gymProfile.overview": "Overview",
    "gymProfile.payAmountNow": "Pay {{amount}} now",
    "gymProfile.paymentStarted": "Payment started. Complete it to activate your membership.",
    "gymProfile.pendingSince": "Pending since {{date}}",
    "gymProfile.photoOf": "Photo {{index}} of {{count}}",
    "gymProfile.planAvailableMany": "{{count}} plans available",
    "gymProfile.planAvailableOne": "1 plan available",
    "gymProfile.planDescriptionHybrid": "30 days with 12 visits and coach plan access.",
    "gymProfile.planDescriptionMonthly": "30 days of gym access for regular training.",
    "gymProfile.planDescriptionTrial": "One supervised visit for new members.",
    "gymProfile.planNameHybrid": "Hybrid Pro",
    "gymProfile.planNameMonthly": "Monthly Active",
    "gymProfile.planNameTrial": "Trial Pass",
    "gymProfile.quickCheckout": "Fast membership checkout",
    "gymProfile.quickCheckoutHint":
      "Secure checkout. Membership starts after payment confirmation.",
    "gymProfile.tapPlanToChange": "Tap another plan below to change.",
    "gymProfile.readyToJoin": "Ready to join",
    "gymProfile.recommendedCheckoutAbove": "Fast checkout is above",
    "gymProfile.referralApplied": "Referral applied",
    "gymProfile.referralInviteRequired": "Referral or invite is required.",
    "gymProfile.referralPrice": "Referral price",
    "gymProfile.requestMembershipFirst": "Request membership first",
    "gymProfile.requestMembershipFirstBody":
      "This gym reviews new members before payment. Submit your request and the owner can approve it from the web dashboard.",
    "gymProfile.reviewed": "Reviewed",
    "gymProfile.securePayment": "Secure payment",
    "gymProfile.selectPlanForCheckout": "Select for checkout",
    "gymProfile.selectedForCheckout": "Selected for checkout",
    "gymProfile.selectedPlanHint": "{{plan}} selected. You can compare plans below.",
    "gymProfile.sendMembershipRequest": "Send membership request",
    "gymProfile.shareProfile": "Share gym profile",
    "gymProfile.staffApprovalBeforePayment": "Staff approval happens before payment.",
    "gymProfile.standardMembershipPlan": "Standard membership plan.",
    "gymProfile.stepActivatePlan": "Activate plan",
    "gymProfile.stepActivatePlanBody": "Return here and complete payment once you are approved.",
    "gymProfile.stepBrowsePublicPlans": "Browse public plans",
    "gymProfile.stepBrowsePublicPlansBody":
      "Compare price, access, trainer support, and plan format without waiting for staff.",
    "gymProfile.stepPayInstantly": "Pay instantly",
    "gymProfile.stepPayInstantlyBody": "Pay securely from mobile.",
    "gymProfile.stepPaySecurely": "Pay securely",
    "gymProfile.stepPaySecurelyBody":
      "Payment activates the membership once the invite rules are met.",
    "gymProfile.stepReferralAttached": "Referral {{code}} is attached.",
    "gymProfile.stepReferralRequired": "A referral or invite is required before you can continue.",
    "gymProfile.stepReviewPlans": "Review plans",
    "gymProfile.stepReviewPlansBody": "Once the code is accepted, plans can be joined.",
    "gymProfile.stepSecureReferral": "Secure a referral",
    "gymProfile.stepSendRequest": "Send request",
    "gymProfile.stepSendRequestBody":
      "Send your request before payment if this gym reviews new members.",
    "gymProfile.stepStaffReview": "Staff review",
    "gymProfile.stepStaffReviewBody": "The gym team reviews your request.",
    "gymProfile.stepStartTraining": "Start training",
    "gymProfile.stepStartTrainingBody":
      "Scan the gym QR, get a unique entry code, and present it at the floor or desk.",
    "gymProfile.submitting": "Submitting...",
    "gymProfile.trainerTeam": "Trainer team",
    "gymProfile.unableStartPayment": "Unable to start payment.",
    "gymProfile.unableSubmitMembershipRequest": "Unable to submit membership request.",
    "gymProfile.updatingMembershipStatus": "Updating membership status...",
    "gymProfile.validityDays": "{{count}} validity days",
    "gymProfile.visitCountMany": "{{count}} visits",
    "gymProfile.visitCountOne": "1 visit",
    "gymProfile.visitsRemaining": "{{count}} visits remaining",
    "gymProfile.whatsInside": "What's inside",
    "gymReviews.beFirst": "Be the first member to leave a review.",
    "gymReviews.cancel": "Cancel",
    "gymReviews.edit": "Edit",
    "gymReviews.editReview": "Edit your review",
    "gymReviews.empty": "No reviews yet",
    "gymReviews.membersSay": "Members say",
    "gymReviews.onlyMembers": "Only members can review this gym.",
    "gymReviews.postReview": "Post review",
    "gymReviews.posting": "Posting...",
    "gymReviews.reviews": "Reviews",
    "gymReviews.reviewsCount": "{{count}} reviews",
    "gymReviews.sharePlaceholder": "Share what you like about this gym...",
    "gymReviews.starsAccessibility": "{{count}} stars",
    "gymReviews.update": "Update",
    "gymReviews.write": "Write",
    "gymReviews.writeReview": "Write a review",
    "gallery.closePhotoViewer": "Close photo viewer",
    "empty.loading": "Loading",
    "empty.loadingBody": "Loading details from your gym.",
    "tracking.bodyTimeline": "Photo timeline",
    "tracking.bodyTimelineSubtitle": "{{count}} body composition entries",
    "tracking.addExercise": "Add exercise",
    "tracking.armsCm": "Arms cm",
    "tracking.body": "Body",
    "tracking.bodyFatPercent": "Body fat %",
    "tracking.bodyMeasurements": "Body measurements",
    "tracking.bodyMeasurementsSaved": "Body measurements saved.",
    "tracking.bodyProgress": "Body progress",
    "tracking.moreMeasurements": "More measurements",
    "tracking.hideMeasurements": "Hide measurements",
    "tracking.calfCm": "Calf cm",
    "tracking.calvesCm": "Calves cm",
    "tracking.chestCm": "Chest cm",
    "tracking.couldNotSaveMeasurements": "Could not save measurements",
    "tracking.couldNotSaveWorkout": "Could not save workout",
    "tracking.durationMinutes": "Duration (minutes)",
    "tracking.exercise": "Exercise",
    "tracking.exerciseName": "Exercise name",
    "tracking.exerciseNamePlaceholder": "Push press",
    "tracking.addExerciseToSave": "Add one exercise name to save this workout.",
    "tracking.forearmsCm": "Forearms cm",
    "tracking.hipsCm": "Hips cm",
    "tracking.historyTitle": "Progress history",
    "tracking.loggedWorkout": "Logged workout",
    "tracking.muscleMassKg": "Muscle mass kg",
    "tracking.neckCm": "Neck cm",
    "tracking.noBodyMeasurements": "No body measurements",
    "tracking.noBodyMeasurementsBody": "Log your measurements to see your trends over time.",
    "tracking.noWorkoutsYet": "No workouts yet",
    "tracking.noWorkoutsYetBody": "Your logged workouts will show up here.",
    "tracking.notes": "Notes",
    "tracking.notesPlaceholder": "Front/side/back photos can be attached from progress photos.",
    "tracking.removeExercise": "Remove exercise",
    "tracking.reps": "Reps",
    "tracking.restingHeartRate": "Resting heart rate",
    "tracking.saveMeasurements": "Save measurements",
    "tracking.saveWorkout": "Save workout",
    "tracking.session": "Session",
    "tracking.sets": "Sets",
    "tracking.shouldersCm": "Shoulders cm",
    "tracking.strength": "Strength",
    "tracking.thighsCm": "Thighs cm",
    "tracking.visceralFatRating": "Visceral fat rating",
    "tracking.waist": "Waist",
    "tracking.waistCm": "Waist cm",
    "tracking.weightKg": "Weight kg",
    "tracking.activeTime": "Active time",
    "tracking.activeHabits": "Active habits",
    "tracking.addOne": "Add one",
    "tracking.loggedSessions": "Logged sessions",
    "tracking.noSessions": "No sessions",
    "tracking.workoutTime": "Workout time",
    "tracking.addMeasurementToSave": "Add at least one measurement to save.",
    "tracking.workout": "Workout",
    "tracking.workoutSaved": "Workout saved.",
    "tracking.workoutSet": "Workout set",
    "tracking.workoutTitle": "Workout title",
    "tracking.workoutTitlePlaceholder": "e.g. Push day",
    "tracking.mutation.habitAdded": "Habit added.",
    "tracking.mutation.habitAddFailed": "Could not add habit.",
    "tracking.mutation.habitUpdateFailed": "Could not update habit.",
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
    "member.attendance.activeMembership": "Active membership",
    "member.attendance.approved": "Approved",
    "member.attendance.assignedBranch": "Assigned branch",
    "member.attendance.backToHome": "Back to Home",
    "member.attendance.branch": "Branch",
    "member.attendance.checkIn": "Check-in",
    "member.attendance.checkOut": "Check-out",
    "member.attendance.checkedIn": "Checked in",
    "member.attendance.checkedOut": "Checked out",
    "member.attendance.checkedOutAutomatically": "Checked out automatically",
    "member.attendance.couldNotCheckOut": "Could not check out",
    "member.attendance.copyCodeFailed": "Could not copy code.",
    "member.attendance.copyEntryCodeAccessibility": "Copy entry code {{code}}",
    "member.attendance.deskCanHelp": "The desk can help you complete this check-in.",
    "member.attendance.deskConfirmationNeeded": "Desk confirmation needed",
    "member.attendance.deskHelpNeeded": "Desk help needed",
    "member.attendance.dismissDetails": "Dismiss attendance details",
    "member.attendance.duration": "Duration",
    "member.attendance.entryApproved": "Entry approved for your gym",
    "member.attendance.entryCode": "Entry Code",
    "member.attendance.entryCodeCopied": "Entry code copied.",
    "member.attendance.entryCodeUnavailable":
      "Entry code unavailable - please ask reception to check you in manually.",
    "member.attendance.gymTimeRecorded": "Your gym time was recorded.",
    "member.attendance.sessionStopped": "Session stopped",
    "member.attendance.inProgress": "In progress",
    "member.attendance.mainBranch": "Main branch",
    "member.attendance.membershipActive": "Membership active",
    "member.attendance.nextUp": "Next up",
    "member.attendance.notApproved": "Check-in not approved",
    "member.attendance.notFound": "Record not found in your history",
    "member.attendance.openAssignedPlanAccessibility": "Open assigned plan",
    "member.attendance.openAssignedPlanBody": "Open your current assigned plan.",
    "member.attendance.openPlan": "Open Plan",
    "member.attendance.pendingApproval": "Pending approval",
    "member.attendance.pendingBody":
      "Your check-in was received. Show this code at the front desk.",
    "member.attendance.plan": "Plan",
    "member.attendance.profilePhotoRecommended": "Profile photo recommended",
    "member.attendance.refreshStatus": "Refresh status",
    "member.attendance.reviewAtDesk": "Please ask the front desk to review this check-in.",
    "member.attendance.showToDesk": "Show this to the front desk if asked.",
    "member.attendance.status": "Status",
    "member.attendance.title": "Attendance",
    "member.attendance.updating": "Updating...",
    "member.attendance.waitingDeskApproval": "Waiting for desk approval",
    "member.attendance.whyConfirmation": "Why confirmation?",
    "member.attendance.whyConfirmationBody":
      "Your gym asks the desk to confirm some check-ins before entry is marked approved.",
    "member.coaching.active": "Active",
    "member.coaching.browsePtPackages": "Browse PT packages",
    "member.coaching.currentTab": "Coaching",
    "member.coaching.ends": "Ends {{date}}",
    "member.coaching.flexibleSessions": "Flexible sessions",
    "member.coaching.noActiveCoaching": "No active coaching",
    "member.coaching.noActiveCoachingBody":
      "Browse packages when you are ready. A trainer confirms the request, then payment is one step.",
    "member.coaching.noPackagesAvailable": "No packages available",
    "member.coaching.noPackagesAvailableBody":
      "Check back later — trainers haven't published PT packages yet.",
    "member.coaching.packagesTab": "Packages",
    "member.coaching.payAfterApproval": "Pay after trainer approval",
    "member.coaching.noSessionsYet": "No sessions yet",
    "member.coaching.noSessionsYetBody": "Your logged sessions will appear here.",
    "member.coaching.pending": "Pending",
    "member.coaching.requestPackage": "Request",
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
    "member.classDetail.bookClass": "Book class",
    "member.classDetail.booked": "Booked",
    "member.classDetail.bookedHint":
      "You are in. Keep this booking, or cancel if your plans change.",
    "member.classDetail.bookWithPrice": "Book · {{price}}",
    "member.classDetail.cancelBooking": "Cancel booking",
    "member.classDetail.cancelling": "Cancelling...",
    "member.classDetail.classDetails": "Class details",
    "member.classDetail.classFallback": "Class",
    "member.classDetail.coachName": "Coach {{name}}",
    "member.classDetail.continuePayment": "Continue payment",
    "member.classDetail.full": "Full",
    "member.classDetail.fullHint":
      "This class is full. Join the waitlist and we will update your status if a spot opens.",
    "member.classDetail.freeBookingHint":
      "Reserve your spot now. You can cancel from this screen if your plans change.",
    "member.classDetail.joinWaitlist": "Join waitlist",
    "member.classDetail.left": "{{count}} left",
    "member.classDetail.nextStep": "Next step",
    "member.classDetail.notFound": "Class not found",
    "member.classDetail.paidBookingHint":
      "Pay now to reserve your spot. Unpaid bookings stay marked as payment due.",
    "member.classDetail.payAmountNow": "Pay {{amount}} now",
    "member.classDetail.paymentDue": "Payment due",
    "member.classDetail.paymentDueHint":
      "Finish payment to confirm your spot before the class fills up.",
    "member.classDetail.spots": "{{count}} left",
    "member.classDetail.spotsBooked": "spots booked",
    "member.classDetail.waitlisted": "Waitlisted",
    "member.classDetail.waitlistedHint":
      "You are on the waitlist. Cancel from here if you no longer want the spot.",
    "member.classes.bookClass": "Book class",
    "member.classes.bookWithPrice": "Book · {{price}}",
    "member.classes.booked": "Booked",
    "member.classes.branchSchedule": "{{branch}} schedule",
    "member.classes.cancelling": "Cancelling...",
    "member.classes.coachName": "Coach {{name}}",
    "member.classes.continuePayment": "Continue payment",
    "member.classes.couldNotLoad": "Classes could not load.",
    "member.classes.filterAll": "All {{count}}",
    "member.classes.filterBooked": "Booked {{count}}",
    "member.classes.filterOpen": "Open {{count}}",
    "member.classes.free": "Free",
    "member.classes.full": "Full",
    "member.classes.joinWaitlist": "Join waitlist",
    "member.classes.left": "{{count}} left",
    "member.classes.noBookedClasses": "No bookings yet",
    "member.classes.noBookedClassesBody": "Book a class from the open tab when you are ready.",
    "member.classes.noClasses": "No classes scheduled",
    "member.classes.noClassesBody": "Check back soon - new group sessions are added every week.",
    "member.classes.noOpenClasses": "No open classes",
    "member.classes.noOpenClassesBody": "All upcoming classes are booked or waitlisted right now.",
    "member.classes.onWaitlist": "On waitlist",
    "member.classes.opening": "Opening...",
    "member.classes.payAmountNow": "Pay {{amount}} now",
    "member.classes.paymentDue": "Payment due",
    "member.classes.spots": "{{count}} spots",
    "member.classes.subtitle": "Reserve your spot in upcoming group sessions.",
    "member.classes.title": "Classes",
    "member.classes.waitlisted": "Waitlisted",
    "member.classes.yourBookings": "Your bookings",
    "member.mutation.bookingCancelled": "Booking cancelled.",
    "member.mutation.bookingCancelFailed": "Could not cancel your booking.",
    "member.mutation.classBooked": "Class booked.",
    "member.mutation.classBookingFailed": "Class booking could not be completed.",
    "member.mutation.classCheckoutStarted": "Class checkout started.",
    "member.mutation.membershipCancelFailed": "Could not cancel membership.",
    "member.mutation.ptRequestFailed": "Could not send your PT request.",
    "member.mutation.signInBookClass": "Sign in again to book a class.",
    "member.mutation.signInManageBooking": "Sign in again to manage your booking.",
    "member.mutation.signInRequestPt": "Sign in again to request personal training.",
    "member.mutation.waitlistAdded": "Added to waitlist. We'll prompt payment when a spot opens.",
    "member.you.accountCenter": "Zook account center",
    "member.you.activeMembership": "Active membership",
    "member.you.appearance": "Appearance",
    "member.you.backToOwnerMode": "Switch to owner",
    "member.you.browsePlans": "Plans",
    "member.you.findMembershipPlan": "Find a plan to start training.",
    "member.you.gymShop": "Gym shop",
    "member.you.assistant": "Assistant",
    "member.you.editProfile": "Edit",
    "member.you.gymProfile": "Gym profile",
    "member.you.helpSupport": "Help & support",
    "member.you.memberFallback": "Member",
    "member.you.membership": "Membership",
    "member.you.membershipNeedsAttention": "Membership needs attention",
    "member.you.noGymSelected": "No gym selected",
    "member.you.notifications": "Notifications",
    "member.you.noActiveMembership": "No active membership",
    "member.you.privacy": "Privacy",
    "member.you.quickActions": "Quick actions",
    "member.you.referrals": "Referrals",
    "member.you.switchGym": "Switch gym",
    "member.you.switchToRole": "Switch to {{role}}",
    "member.you.theme.dark": "Dark",
    "member.you.theme.light": "Light",
    "member.you.theme.system": "System",
    "member.you.trackingHistory": "Tracking history",
    "member.you.unreadCount": "{{count}} unread",
    "member.you.validUntil": "Valid until {{date}}",
    "member.you.viewMembership": "View",
    "member.you.visitsLeft": "{{count}} visits left",
    "member.home.accessActive": "Access active",
    "member.home.active": "Active",
    "member.home.activeCheckIn": "Active check-in",
    "member.home.activeCheckInHint": "Re-scan the branch QR to check out, or stop it here.",
    "member.home.browsePlansToStart": "Browse plans to start training here",
    "member.home.bookClass": "Book a class",
    "member.home.classBooked": "Booked",
    "member.home.classFull": "Full",
    "member.home.classOpen": "Open",
    "member.home.classSpotsLeft": "{{count}} left",
    "member.home.classWaitlisted": "Waitlisted",
    "member.home.classesTab": "Classes",
    "member.home.coachName": "Coach {{name}}",
    "member.home.coachingTab": "Coaching",
    "member.home.completeProfile": "Complete your profile",
    "member.home.completeProfileBody": "Add your details so staff and trainers can help faster.",
    "member.home.currentBranch": "Current branch",
    "member.home.daysLeft": "{{count}} days left",
    "member.home.dayStreak": "{{count}}-day streak",
    "member.home.dismissBanner": "Dismiss {{title}}",
    "member.home.estimatedMinutes": "~{{minutes}} min",
    "member.home.exerciseCount": "{{count}} exercise",
    "member.home.exerciseCountOne": "1 exercise",
    "member.home.exerciseCountOther": "{{count}} exercises",
    "member.home.expiredBody": "Renew your membership to keep check-ins and plan access moving.",
    "member.home.expiredTitle": "Your membership expired",
    "member.home.findYourGym": "Find your gym",
    "member.home.finishLoggingWork": "Finish logging your work.",
    "member.home.firstRunBody":
      "Your membership, workouts, and check-ins collect here once your gym adds you.",
    "member.home.firstRunStepChoosePlan": "Pick a plan or send a request",
    "member.home.firstRunStepFindGym": "Open your gym profile",
    "member.home.firstRunStepStartTraining": "Check in and start training",
    "member.home.firstRunTitle": "Welcome to Zook",
    "member.home.getMembership": "Get membership",
    "member.home.greeting": "Hello, {{name}}",
    "member.home.gymFallback": "Gym",
    "member.home.habits": "Habits",
    "member.home.inviteFriend": "Invite a friend",
    "member.home.inviteFriendBody": "Share Zook with someone who should train with you.",
    "member.home.joinGym": "Join a gym",
    "member.home.joinGymBody":
      "Find your gym to unlock membership, plans, check-ins, and trainer updates.",
    "member.home.membershipDaysLeft": "{{count}} membership days left.",
    "member.home.membershipEndsToday": "Membership ends today",
    "member.home.membershipPendingBody":
      "Your payment is linked to {{gym}}. The front desk still needs to activate your membership before check-ins and plans unlock.",
    "member.home.membershipPendingTitle": "Membership pending activation",
    "member.home.membershipStatusActive": "Membership status is active.",
    "member.home.membershipAccess": "Membership access",
    "member.home.membershipAccessibility": "{{status}}. {{detail}}. {{gym}}.",
    "member.home.membershipActive": "Membership active",
    "member.home.noActiveMembership": "No active membership",
    "member.home.noNextWorkout": "Nice work. No next workout scheduled.",
    "member.home.noPlanAssigned": "No plan assigned",
    "member.home.noPlanBody": "You are active at {{gym}}. Ask your trainer for a workout plan.",
    "member.home.open": "Open",
    "member.home.openMembership": "Open Membership",
    "member.home.openPlan": "Open Plan",
    "member.home.openProgress": "Open progress",
    "member.home.openYourCoaching": "Open your coaching",
    "member.home.personalTraining": "Personal training",
    "member.home.pickupAvailable": "Pickup available",
    "member.home.pickupCodeBody": "Show pickup code {{code}} at the desk.",
    "member.home.referral": "Referral",
    "member.home.renew": "Renew",
    "member.home.renewMembership": "Renew membership",
    "member.home.renewNowBody": "Renew now to keep check-ins and plan access moving.",
    "member.home.renewalNeeded": "Renewal needed",
    "member.home.restDay": "Rest day",
    "member.home.restDayBody":
      "{{plan}} has no workout scheduled today. Recover well and keep the routine warm.",
    "member.home.resume": "Resume",
    "member.home.scanIntoGym": "Scan into gym",
    "member.home.seeAll": "See all",
    "member.home.seeAllClasses": "See all classes",
    "member.home.upcomingClasses": "Upcoming classes",
    "member.home.sessionsLeftShort": "{{count}} left",
    "member.home.startWorkout": "Start workout",
    "member.home.stopSession": "Stop session",
    "member.home.stoppingSession": "Stopping...",
    "member.home.todaysWorkout": "TODAY'S WORKOUT",
    "member.home.tomorrowPlan": "Tomorrow: {{name}}.",
    "member.home.update": "Update",
    "member.home.viewMembership": "View membership",
    "member.home.viewPlan": "View plan",
    "member.home.visits": "Visits",
    "member.home.visitsLeft": "{{count}} visits left",
    "member.home.weekTab": "Week",
    "member.home.workoutInProgress": "Workout in progress",
    "member.home.workoutLogged": "Workout logged",
    "member.home.workouts": "Workouts",
    "member.home.yourCoaching": "Your coaching",
    "member.home.yourTrainer": "Your trainer",
    "member.membership.active": "Active",
    "member.membership.activePlan": "Active plan",
    "member.membership.autopay": "Autopay",
    "member.membership.autopayActive": "Autopay is active.",
    "member.membership.autopayCancelled": "Autopay cancelled.",
    "member.membership.autopayEnabledTitle": "Autopay ready",
    "member.membership.autopayPromptBody": "Set it once. Cancel anytime.",
    "member.membership.autopayPromptTitle": "Auto-renew in one tap",
    "member.membership.autopayRenewalChoiceBody": "Optional. Set it after this payment so the next renewal is automatic.",
    "member.membership.autopayRenewalChoiceTitle": "After payment: autopay",
    "member.membership.autopaySetupAction": "Enable",
    "member.membership.authorizeAutopay": "Renew this plan automatically.",
    "member.membership.browseGymsBody": "Browse gyms and purchase a membership to get started.",
    "member.membership.browserReturnBody":
      "Return after checkout. Zook refreshes your membership when you come back.",
    "member.membership.browserReturnHint":
      "If the browser already closed, tap Check status to refresh payment confirmation.",
    "member.membership.cancelConfirmBody":
      "You'll keep access until your current term ends, but it won't renew and can't be resumed afterwards. This can't be undone.",
    "member.membership.cancelConfirmTitle": "Cancel membership?",
    "member.membership.cancelMembership": "Cancel membership",
    "member.membership.cancelAutopay": "Cancel autopay",
    "member.membership.cancelled": "Membership cancelled.",
    "member.membership.checkingPaymentStatus": "Checking payment status...",
    "member.membership.choosePlan": "Choose a plan",
    "member.membership.continueCheckout": "Continue checkout",
    "member.membership.continuingBrowser": "Continuing in your browser.",
    "member.membership.continuingBrowserTitle": "Continuing in your browser",
    "member.membership.currentPlan": "Current plan",
    "member.membership.days": "{{count}} days",
    "member.membership.daysOfDurationLeft": "{{daysLeft}} of {{durationDays}} days left",
    "member.membership.documentsAfterSuccess": "Documents after {{status}}.",
    "member.membership.downloadInvoice": "Download invoice",
    "member.membership.enableAutopay": "Enable autopay",
    "member.membership.eyebrow": "Membership",
    "member.membership.findGyms": "Find gyms",
    "member.membership.generateDocument": "Generate {{label}}",
    "member.membership.generateReceiptOrInvoice": "Generate a receipt or invoice.",
    "member.membership.guidanceActiveBody":
      "Your QR entry and member benefits are active for this gym.",
    "member.membership.guidanceActiveTitle": "Membership active",
    "member.membership.guidanceCompletePayment": "Complete payment",
    "member.membership.guidanceDaysLeftBody":
      "{{count}} days left. Renew early to keep entry uninterrupted.",
    "member.membership.guidanceExpiredBody":
      "Renew this plan or choose a new plan to restore QR entry and member benefits.",
    "member.membership.guidanceExpiredTitle": "Membership expired",
    "member.membership.guidanceFailedBody":
      "No money was confirmed for this membership. Try again or ask the desk for help.",
    "member.membership.guidanceFailedTitle": "Payment failed",
    "member.membership.guidanceCancelledBody":
      "Your membership has ended. Rejoin this gym or explore a new one to restore your access.",
    "member.membership.guidanceCancelledTitle": "Membership cancelled",
    "member.membership.guidanceInactiveBody":
      "This membership cannot be used for entry. Contact the gym or choose another plan.",
    "member.membership.guidanceInactiveTitle": "Membership not active",
    "member.membership.guidancePastDueBody":
      "Your membership needs payment confirmation before the gym can treat it as active.",
    "member.membership.guidancePastDueTitle": "Renewal overdue",
    "member.membership.guidancePaymentPendingBody":
      "Complete payment or ask the desk to record an offline payment before using entry.",
    "member.membership.guidancePaymentPendingTitle": "Payment pending",
    "member.membership.guidancePayNow": "Pay now",
    "member.membership.guidanceRenewalWindowTitle": "Renewal window",
    "member.membership.guidanceRenewNow": "Renew now",
    "member.membership.guidanceRenewOrChangePlan": "Renew or change plan",
    "member.membership.guidanceRenewTodayBody": "Renew today to avoid an entry interruption.",
    "member.membership.guidancePausedBody":
      "Access is frozen until your pause date. Resume any time to restore entry.",
    "member.membership.guidancePausedTitle": "Membership paused",
    "member.membership.guidanceTryPaymentAgain": "Try payment again",
    "member.membership.joinDifferentGym": "Join a different gym",
    "member.membership.gymDefinedValidity": "Gym-defined validity",
    "member.membership.generatedInvoices": "Generated invoices",
    "member.membership.history": "Membership history",
    "member.membership.invoice": "Invoice",
    "member.membership.historyJumpBody": "Jumped to your previous memberships and payment trail.",
    "member.membership.invoiceGenerated": "Invoice generated.",
    "member.membership.invoicesAndReceipts": "Invoices and receipts",
    "member.membership.invoiceUnavailable": "Invoice unavailable",
    "member.membership.keepMembership": "Keep membership",
    "member.membership.manageMembership": "Manage membership",
    "member.membership.manageMembershipBody":
      "Pause or cancel only when you need to change access.",
    "member.membership.manualRenewalTitle": "Manual renewal",
    "member.membership.manualRenewalBody": "Renew from the current plan card when your next payment is due.",
    "member.membership.noActivePlans": "No active plans",
    "member.membership.noAlternatePlans":
      "No alternate plans are published. Same-plan renewal is requested.",
    "member.membership.noExpiry": "No expiry",
    "member.membership.noMemberships": "No memberships",
    "member.membership.noPayments": "No payments",
    "member.membership.nextRenewalDate": "Next renewal {{date}}",
    "member.membership.off": "Off",
    "member.membership.enabled": "Enabled",
    "member.membership.endMembershipOptions": "End membership",
    "member.membership.endMembershipBody": "Cancel only if you do not want this access anymore.",
    "member.membership.pause": "Pause",
    "member.membership.pauseEndDateAccessibility": "Membership pause end date",
    "member.membership.pauseHelp":
      "Pausing freezes check-ins until this date, and your remaining days carry over.",
    "member.membership.pauseMembership": "Pause membership",
    "member.membership.pauseDisclosureBody": "Freeze access only for travel, injury, or a planned break.",
    "member.membership.pauseConfirmBody":
      "Your access stays frozen until {{date}}. You can resume anytime before then.",
    "member.membership.pauseConfirmTitle": "Pause membership?",
    "member.membership.pauseReason": "Member selected a membership pause date from mobile.",
    "member.membership.pauseReasonInjury": "Injury",
    "member.membership.pauseReasonMedical": "Medical",
    "member.membership.pauseReasonOther": "Other",
    "member.membership.pauseReasonTravel": "Travel",
    "member.membership.pausedToast": "Paused until {{date}}.",
    "member.membership.pausedUntil": "Membership paused until {{date}}.",
    "member.membership.pauseUntil": "Pause until",
    "member.membership.payments": "Payments",
    "member.membership.payAmountNow": "Pay {{amount}} now",
    "member.membership.payNow": "Pay now",
    "member.membership.paySecurely": "Pay securely",
    "member.membership.paymentDocuments": "Payment documents",
    "member.membership.paymentDocumentsBody": "Receipts and invoices are below.",
    "member.membership.plan": "Plan",
    "member.membership.planSwitched": "Plan switched.",
    "member.membership.receipt": "Receipt",
    "member.membership.receiptGenerated": "Receipt generated.",
    "member.membership.receiptNumber": "Receipt {{number}}",
    "member.membership.receiptUnavailable": "Receipt unavailable",
    "member.membership.recurringRenewalEnabled": "Recurring renewal is enabled.",
    "member.membership.renewMembership": "Renew membership",
    "member.membership.renewalConfirmed": "Renewal confirmed.",
    "member.membership.renewalConsequence":
      "The renewed membership activates after payment confirmation from the payment service or gym desk.",
    "member.membership.renewalFlowOpened": "We opened the renewal flow for this membership.",
    "member.membership.renewalRequestSent": "Renewal request sent.",
    "member.membership.renewalSheetBody":
      "Continue at {{gym}} with the same plan or choose another available option.",
    "member.membership.renewalSummary": "Renewal summary",
    "member.membership.resumed": "Membership resumed.",
    "member.membership.resumeMembership": "Resume membership",
    "member.membership.selectedPlan": "Selected plan",
    "member.membership.selectPlanAccessibility": "Select {{plan}}",
    "member.membership.starting": "Starting...",
    "member.membership.statusBelow": "Membership status is below.",
    "member.membership.subscriptionUpdated": "Your subscription has been updated.",
    "member.membership.summary": "{{active}} active · {{expiring}} expiring soon · {{total}} total",
    "member.membership.tabCurrent": "Current",
    "member.membership.expiringSoon": "Ending soon",
    "member.membership.total": "Total",
    "member.membership.tabHistory": "History",
    "member.membership.tabPayments": "Payments",
    "member.membership.switchNow": "Switch now",
    "member.membership.switchWithoutCheckoutBody":
      "Use this only if your gym approved a plan change without a fresh checkout.",
    "member.membership.switchWithoutCheckoutTitle": "Change active plan without checkout",
    "member.membership.title": "Your plans",
    "member.membership.typeDuration": "Duration",
    "member.membership.typeHybrid": "Hybrid",
    "member.membership.typeMembership": "Membership",
    "member.membership.typeTrial": "Trial",
    "member.membership.update": "Membership update",
    "member.membership.updating": "Updating...",
    "member.membership.validity": "Validity",
    "member.membership.visits": "Visits",
    "member.membership.visitsRemaining": "{{visits}} remaining",
    "member.membership.visitCount": "{{count}} visits",
    "member.membership.yourGym": "your gym",
    "member.profile.active": "Active",
    "member.profile.activeGymOption": "{{gym}} (active)",
    "member.profile.activeRoleOption": "{{role}} (active)",
    "member.profile.biometric": "Biometric",
    "member.profile.biometricOn": "Biometric on",
    "member.profile.biometricUnlock": "Biometric unlock",
    "member.profile.biometricUnlockBody": "Set up Face ID or device biometrics to enable this.",
    "member.profile.checkedIn": "Checked in",
    "member.profile.classes": "Classes",
    "member.profile.daysReferralBenefit":
      "You'll get {{count}} free days for every friend who joins.",
    "member.profile.daysRemaining": "{{count}} days remaining",
    "member.profile.daysRemainingOf": "{{remaining}} of {{total}} days remaining",
    "member.profile.defaultReferralBenefit":
      "Share your code so the gym can track friends you bring in.",
    "member.profile.earnedCredit": "{{amount}} earned",
    "member.profile.expires": "Expires {{date}}",
    "member.profile.findGyms": "Find gyms",
    "member.profile.friendsStat": "Your friends: {{joined}} joined, {{pending}} pending",
    "member.profile.membership": "Membership",
    "member.profile.membershipDetailsUnavailable": "Membership details unavailable",
    "member.profile.accountTab": "Account",
    "member.profile.detailsTab": "Details",
    "member.profile.rewardsTab": "Rewards",
    "member.profile.memberFallback": "Zook member",
    "member.profile.myGym": "my gym",
    "member.profile.noActiveMembership": "No active membership",
    "member.profile.noActivity": "No activity",
    "member.profile.noGyms": "No gyms",
    "member.profile.noGymsBody": "Join or request access to a gym first.",
    "member.profile.noRoleAssigned": "No role assigned",
    "member.profile.noRoles": "No roles",
    "member.profile.noRolesBody": "This account does not have another role in the active gym.",
    "member.profile.otherGymRoleBody": "Switch gyms before opening {{role}} tools.",
    "member.profile.otherGymRoleTitle": "{{role}} is in another gym",
    "member.profile.pendingCredit": "{{amount}} pending",
    "member.profile.percentComplete": "{{percent}}% complete",
    "member.profile.percentCompleteWithDate": "{{percent}}% complete - {{date}}",
    "member.profile.qaShortcuts": "QA shortcuts",
    "member.profile.quickActions": "Quick actions",
    "member.profile.finishProfile": "Finish profile",
    "member.profile.readinessContact": "Reachable phone or email",
    "member.profile.readinessMembership": "Active membership on file",
    "member.profile.readinessMore": "+{{count}} more",
    "member.profile.readinessNeedsBody": "{{count}} left.",
    "member.profile.readinessNeedsTitle": "Make check-ins easier",
    "member.profile.readinessPhoto": "Clear profile photo",
    "member.profile.readinessReadyBody":
      "Desk staff can verify you quickly and your gym has the basics it needs.",
    "member.profile.readinessReadyTitle": "Profile ready for the desk",
    "member.profile.recentActivity": "Recent activity",
    "member.profile.referGymAccessibility": "Refer a gym to Zook and earn",
    "member.profile.referGymBody": "Earn when a referred gym joins Zook.",
    "member.profile.referGymTitle": "Refer a gym & earn cash",
    "member.profile.referralCodeCopied": "Your referral code is copied.",
    "member.profile.referralCopied": "Referral copied",
    "member.profile.referralLinkCopied": "Your referral link is copied.",
    "member.profile.renew": "Renew",
    "member.profile.roleUnavailable": "Role unavailable",
    "member.profile.roleUnavailableBody": "That role is not available here.",
    "member.profile.roleAtGym": "{{role}} at {{gym}}",
    "member.profile.settings": "Settings",
    "member.profile.shareReferralCode": "Use my referral code {{code}} at {{gym}}.",
    "member.profile.shareReferralWithLink": "Join {{gym}} with my referral code {{code}}: {{link}}",
    "member.profile.signOut": "Sign out",
    "member.profile.signOutConfirmBody": "You can sign back in with OTP any time.",
    "member.profile.signOutConfirmTitle": "Sign out?",
    "member.profile.switch": "Switch",
    "member.profile.switchFailed": "Switch failed",
    "member.profile.switchFailedBody": "Could not switch gyms right now.",
    "member.profile.switchGym": "Switch gym",
    "member.profile.switchGymBody": "Choose your active gym.",
    "member.profile.switchGymConfirmBody": "Your profile refreshes for that gym.",
    "member.profile.switchGymConfirmTitle": "Switch to {{gym}}?",
    "member.profile.switchGymForRole": "Switch to {{gym}} to access {{role}} tools",
    "member.profile.switchRole": "Switch role",
    "member.profile.switchRoleBody": "Choose the role to use in this gym.",
    "member.profile.switchRoleConfirmBody": "Zook opens that role's tools.",
    "member.profile.switchRoleConfirmTitle": "Switch to {{role}}?",
    "member.profile.switching": "Switching...",
    "member.profile.title": "Profile",
    "member.profile.trainerReferralBenefit":
      "Trainer referrals are tracked for commission review when a member joins or a gym signs up through your link.",
    "member.profile.updating": "Updating",
    "member.profile.useRoleAccessibility": "Use Zook as {{role}}",
    "member.profile.viewHistory": "View history",
    "member.profile.visitsReferralBenefit":
      "You'll get {{count}} visits for every friend who joins.",
    "member.profile.visitsRemaining": "{{remaining}} of {{total}} remaining",
    "member.profile.workoutPlan": "Workout plan",
    "roleSwitcher.active": "Active",
    "roleSwitcher.currentRoleAccessibility": "Switch role. Current role: {{role}}",
    "roleSwitcher.currentWorkspace": "Current workspace",
    "roleSwitcher.currentWorkspaceAccessibility": "Switch role. Current workspace: {{workspace}}",
    "roleSwitcher.role.admin": "Admin",
    "roleSwitcher.role.member": "Member",
    "roleSwitcher.role.owner": "Owner",
    "roleSwitcher.role.platformAdmin": "Platform Admin",
    "roleSwitcher.role.receptionist": "Reception",
    "roleSwitcher.role.trainer": "Trainer",
    "roleSwitcher.roleUnavailable": "Role unavailable",
    "roleSwitcher.roleUnavailableBody": "That role is not available here.",
    "roleSwitcher.subtitle": "Choose the gym and role for this workspace.",
    "roleSwitcher.switching": "Switching...",
    "roleSwitcher.switchToWorkspace": "Switch to this workspace",
    "roleSwitcher.title": "Switch role",
    "roleSwitcher.use": "Use",
    "member.profileExtra.addDateOfBirth": "Add date of birth",
    "member.profileExtra.aiConsent": "AI consent",
    "member.profileExtra.aiConsentBody": "Allow AI features to use your profile context.",
    "member.profileExtra.completedFields":
      "{{completed}}/{{total}} safety and KYC fields complete.",
    "member.profileExtra.dateOfBirth": "Date of birth",
    "member.profileExtra.decreaseWeeklyWorkoutGoal": "Decrease weekly workout goal",
    "member.profileExtra.emergencyContact": "Emergency contact",
    "member.profileExtra.gender": "Gender",
    "member.profileExtra.genderFemale": "Female",
    "member.profileExtra.genderMale": "Male",
    "member.profileExtra.genderNonBinary": "Non-binary",
    "member.profileExtra.genderNotSpecified": "Not specified",
    "member.profileExtra.increaseWeeklyWorkoutGoal": "Increase weekly workout goal",
    "member.profileExtra.locale": "Locale",
    "member.profileExtra.marketingOptIn": "Marketing opt-in",
    "member.profileExtra.name": "Name",
    "member.profileExtra.phone": "Phone",
    "member.profileExtra.saved": "Saved",
    "member.profileExtra.title": "Profile details",
    "member.profileExtra.weeklyGoalValue": "{{count}} / week",
    "member.profileExtra.weeklyWorkoutGoal": "Weekly workout goal",
    "member.profilePhoto.addProfilePhoto": "Add profile photo",
    "member.profilePhoto.cameraPrimer":
      "Zook needs camera access so you can take a profile photo for check-ins and your member profile.",
    "member.profilePhoto.cameraSettingsPrompt":
      "Camera access is off. Enable it in Settings to take a profile photo.",
    "member.profilePhoto.chooseFromLibrary": "Choose from library",
    "member.profilePhoto.continue": "Continue",
    "member.profilePhoto.libraryPrimer":
      "Zook needs photo access so you can choose a profile photo for check-ins and your member profile.",
    "member.profilePhoto.librarySettingsPrompt":
      "Photo access is off. Enable it in Settings to choose a profile photo.",
    "member.profilePhoto.noFileId": "Photo uploaded, but no file ID was returned.",
    "member.profilePhoto.notNow": "Not now",
    "member.profilePhoto.permissionNeeded": "Permission needed",
    "member.profilePhoto.photoNotRemoved": "Photo not removed",
    "member.profilePhoto.photoNotSaved": "Photo not saved",
    "member.profilePhoto.photoTooLarge": "Choose a photo smaller than 5 MB.",
    "member.profilePhoto.profilePhoto": "Profile photo",
    "member.profilePhoto.remove": "Remove",
    "member.profilePhoto.signInAgain": "Sign in again before updating your profile photo.",
    "member.profilePhoto.takePhoto": "Take photo",
    "member.profilePhoto.tryAgain": "Try again in a moment.",
    "member.profilePhoto.updateProfilePhoto": "Update profile photo",
    "memberList.all": "All",
    "memberList.couldNotLoad": "Members could not load.",
    "memberList.noEmail": "No email",
    "memberList.noMembers": "No members",
    "memberList.noPhone": "No phone",
    "memberList.reveal": "View contact",
    "memberList.revealPhoneFor": "View contact for {{name}}",
    "memberList.searchMembers": "Search members",
    "memberList.status.active": "Active",
    "memberList.status.expired": "Expired",
    "memberList.status.expiring": "Expiring",
    "memberList.status.pending": "Pending",
    "memberList.tryDifferentSearch": "Try a different search or filter.",
    "privilegedPin.body": "Enter the 4-digit org PIN to continue.",
    "privilegedPin.confirmAction": "Confirm action",
    "privilegedPin.continue": "Continue",
    "privilegedPin.orgPin": "Org PIN",
    "member.diet.activePlan": "Active plan",
    "member.diet.addCaloriesOrMacro": "Add calories or at least one macro before logging.",
    "member.diet.addMealName": "Add a meal name before logging.",
    "member.diet.calories": "Calories",
    "member.diet.carbs": "Carbs",
    "member.diet.couldNotLogMeal": "Could not log meal",
    "member.diet.fats": "Fats",
    "member.diet.historyTitle": "Diet history",
    "member.diet.kcalRemainingToday": "{{kcal}} kcal remaining today",
    "member.diet.logMeal": "Log meal",
    "member.diet.logging": "Logging...",
    "member.diet.meal": "Meal",
    "member.diet.mealLogged": "Meal logged.",
    "member.diet.mealPlaceholder": "Paneer sandwich",
    "member.diet.nextDay": "Next day",
    "member.diet.noDietPlan": "No diet plan",
    "member.diet.noDietPlanBody": "Your trainer will publish your meal plan here.",
    "member.diet.noMealsLogged": "No meals logged",
    "member.diet.noMealsLoggedBody": "Meals you log for this day will appear here.",
    "member.diet.noPlan": "No plan",
    "member.diet.previousDay": "Previous day",
    "member.diet.protein": "Protein",
    "member.diet.today": "Today",
    "member.habits.add": "Add",
    "member.habits.addFirstHabit": "Add your first habit",
    "member.habits.addHabit": "Add a habit",
    "member.habits.addHabitAccessibility": "Add habit {{title}}",
    "member.habits.closeAddHabit": "Close add habit",
    "member.habits.completedTodayAccessibility": "{{title}}. Completed today",
    "member.habits.dailyHabits": "Daily habits",
    "member.habits.dayStreak": "{{count}}-day streak",
    "member.habits.dayStreakDoToday": "{{count}}-day streak · do it today",
    "member.habits.done": "Done",
    "member.habits.doneToday": "Done today",
    "member.habits.emptyBody": "Track daily habits like water, sleep and steps to build streaks.",
    "member.habits.notDoneAccessibility": "{{title}}. Not done",
    "member.habits.proteinLabel": "Protein",
    "member.habits.proteinTitle": "Hit protein target",
    "member.habits.sleepLabel": "Sleep",
    "member.habits.sleepTitle": "Sleep 8 hours",
    "member.habits.stepsLabel": "Steps",
    "member.habits.stepsTitle": "10,000 steps",
    "member.habits.stretchLabel": "Stretch",
    "member.habits.stretchTitle": "Stretch 10 min",
    "member.habits.tapToCompleteToday": "Tap to complete today",
    "member.habits.target": "Target {{value}}{{unit}}",
    "member.habits.waterLabel": "Water",
    "member.habits.waterTitle": "Drink 3L water",
    "member.plan.assignedPlan": "Assigned plan",
    "member.plan.coachGuided": "Coach guided",
    "member.plan.couldNotLoadExercises": "Could not load exercises",
    "member.plan.dietKind": "Diet plan",
    "member.plan.dietTab": "Diet",
    "member.plan.insideThisPlan": "Inside this plan",
    "member.plan.morePlans": "More plans",
    "member.plan.nextWorkout": "Next workout",
    "member.plan.noExercises": "No exercises",
    "member.plan.noPlanAssigned": "No plan assigned",
    "member.plan.noPlanAssignedBody": "Your trainer will assign a workout plan here.",
    "member.plan.openTodayPlan": "Open today plan",
    "member.plan.percentComplete": "{{percent}}% complete",
    "member.plan.planMeta": "{{kind}} · {{assignment}}",
    "member.plan.progress": "Progress",
    "member.plan.title": "Plan",
    "member.plan.todaysWorkout": "Today's workout",
    "member.plan.trainerAssigned": "Assigned by trainer",
    "member.plan.viewFullExerciseList": "View full exercise list",
    "member.plan.workoutKind": "Workout plan",
    "member.plan.workoutTab": "Workout",
    "member.planDetail.actionFailed": "Action failed",
    "member.planDetail.active": "ACTIVE",
    "member.planDetail.addShortNote": "Add a short note",
    "member.planDetail.assigned": "Assigned",
    "member.planDetail.assignedByCoach": "Assigned by coach",
    "member.planDetail.closeFeedback": "Close feedback",
    "member.planDetail.completedCount": "{{completed}} of {{total}} completed",
    "member.planDetail.completeWorkout": "Complete workout",
    "member.planDetail.completing": "Completing...",
    "member.planDetail.finishMoreExercises": "Finish {{count}} more",
    "member.planDetail.defaultSets": "3 sets",
    "member.planDetail.dietFilter": "Diet",
    "member.planDetail.done": "Done",
    "member.planDetail.exercises": "Exercises",
    "member.planDetail.failedToSend": "Failed to send. Try again.",
    "member.planDetail.feedback": "Feedback",
    "member.planDetail.feedbackSent": "Feedback sent to coach.",
    "member.planDetail.feedbackSheetBody": "Send a note about this assignment.",
    "member.planDetail.needSwap": "Need swap",
    "member.planDetail.noPlanAssignedBody":
      "Your trainer will assign a workout plan here. Check back soon.",
    "member.planDetail.pain": "Pain",
    "member.planDetail.pickNoteFirst": "Pick one note first.",
    "member.planDetail.progressNotSaved": "Progress not saved",
    "member.planDetail.progressNotSavedBody": "This device may not restore the checkbox state.",
    "member.planDetail.seeWeeklyList": "See weekly list",
    "member.planDetail.send": "Send",
    "member.planDetail.sending": "Sending...",
    "member.planDetail.sentToCoach": "Sent to coach.",
    "member.planDetail.signInAgainFeedback": "Sign in again to send feedback.",
    "member.planDetail.tellCoach": "Tell coach",
    "member.planDetail.tooHard": "Too hard",
    "member.planDetail.upNextThisWeek": "Up next this week",
    "member.planDetail.workoutFilter": "Workout",
    "member.planDetail.workoutMarkedComplete": "Workout marked complete.",
    "member.planDetail.workoutProgress": "Workout progress",
    "member.planDetail.workoutProgressNotSaved": "Workout progress could not be saved.",
    "member.planDetail.yourCoach": "Your coach",
    "member.planDetail.yourPlan": "Your plan",
    "member.progress.history": "History",
    "member.progress.logWorkout": "Log workout",
    "member.progress.noWorkoutsLogged": "No workouts logged",
    "member.progress.noWorkoutsLoggedBody":
      "Log your first workout to start tracking your progress.",
    "member.progress.privacyNote":
      "Private entries stay with you unless you choose trainer visibility.",
    "member.progress.recentWorkouts": "Recent workouts",
    "member.progress.thisWeek": "This week",
    "member.progress.title": "Progress",
    "member.receipt.amount": "Amount",
    "member.receipt.downloadInvoice": "Download invoice",
    "member.receipt.generating": "Generating after confirmation",
    "member.receipt.gst": "GST",
    "member.receipt.invoice": "Invoice",
    "member.receipt.invoiceNo": "Invoice no.",
    "member.receipt.issued": "Issued",
    "member.receipt.membership": "Membership",
    "member.receipt.mode": "Mode",
    "member.receipt.modeCash": "Cash",
    "member.receipt.modeOnline": "Online",
    "member.receipt.notFound": "Receipt not found",
    "member.receipt.notFoundBody": "We couldn't find that payment in your membership history.",
    "member.receipt.paymentDetails": "Payment details",
    "member.receipt.purpose": "Purpose",
    "member.receipt.receiptNo": "Receipt no.",
    "member.receipt.receiptNumber": "Receipt {{number}}",
    "member.receipt.recorded": "Recorded",
    "member.receipt.status": "Status",
    "member.receipt.statusCancelled": "Cancelled",
    "member.receipt.statusCreated": "Created",
    "member.receipt.statusFailed": "Failed",
    "member.receipt.statusIssued": "Issued",
    "member.receipt.statusPaused": "Paused",
    "member.receipt.statusRefunded": "Refunded",
    "member.receipt.statusSucceeded": "Paid",
    "member.receipt.taxableAmount": "Taxable amount",
    "member.receipt.title": "Receipt",
    "member.receipt.total": "Total",
    "member.scan.addPhoto": "Add photo",
    "member.scan.allowCamera": "Allow camera",
    "member.scan.allowCameraQr": "Allow camera access to scan the gym QR.",
    "member.scan.allowCameraSettings": "Allow camera access in Settings to scan QR codes.",
    "member.scan.alreadyCheckedInToday": "Already checked in today.",
    "member.scan.awaitingQr": "Awaiting QR",
    "member.scan.awaitingSubmit": "Awaiting submit",
    "member.scan.backToCameraScanner": "Back to camera scanner",
    "member.scan.cameraAccessBlocked": "Camera access blocked",
    "member.scan.cameraAvailable": "Camera available",
    "member.scan.cameraAvailableAnnouncement": "Camera available. Point it at your gym QR code.",
    "member.scan.cameraBlockedAnnouncement":
      "Camera access blocked. Open device settings to allow QR scanning.",
    "member.scan.cameraNeeded": "Camera needed",
    "member.scan.cameraNeededAnnouncement": "Camera permission needed before scanning.",
    "member.scan.cameraPreviewAccessibility": "QR scanner camera preview",
    "member.scan.cantScan": "Can't scan?",
    "member.scan.checkCodeAccessibility": "Check code",
    "member.scan.checkedIn": "Checked in",
    "member.scan.checkingCode": "Checking code...",
    "member.scan.codeCaptured": "Code captured",
    "member.scan.codeEntered": "Code entered",
    "member.scan.codeHint": "Use the two letters and four digits shown with the QR.",
    "member.scan.couldNotReadQr": "Could not read QR code. Try again.",
    "member.scan.enableCamera": "Enable camera",
    "member.scan.enterCheckInCode": "Enter check-in code",
    "member.scan.enterCode": "Enter code",
    "member.scan.enterCodeManually": "Enter code manually",
    "member.scan.enterDeskCodeManually": "Use the code shown near the QR.",
    "member.scan.enterManualCodeAccessibility": "Enter manual check-in code",
    "member.scan.membershipExpired": "Membership expired. Renew before checking in.",
    "member.scan.needFourNumbers": "Need 4 numbers (e.g. 1234)",
    "member.scan.needTwoLetters": "Need 2 letters (e.g. AB)",
    "member.scan.notVerified": "Not verified",
    "member.scan.offlineSavedBody":
      "No connection. Your scan is saved to retry, but entry is not confirmed yet.",
    "member.scan.offlineSavedTitle": "Scan saved for retry",
    "member.scan.offlineSavedToast": "Entry is not confirmed until the server accepts it.",
    "member.scan.openDeviceSettings": "Open device settings to allow QR scanning.",
    "member.scan.openSettings": "Open settings",
    "member.scan.profilePhotoRecommended":
      "Add a profile photo after check-in so the desk can verify you faster next time.",
    "member.scan.queuedScanWaiting": "{{count}} scan waiting for server confirmation.",
    "member.scan.queuedScansWaiting": "{{count}} scans waiting for server confirmation.",
    "member.scan.retryNow": "Retry now",
    "member.scan.returnToQrScannerAccessibility": "Return to QR scanner",
    "member.scan.savedCheckInConfirmed": "Saved check-in confirmed.",
    "member.scan.savedCheckInsConfirmed": "{{count}} saved check-ins confirmed.",
    "member.scan.scanAgain": "Scan again",
    "member.scan.searchingForCode": "Searching for code...",
    "member.scan.serverCheck": "Server check",
    "member.scan.serverVerified": "Server verified",
    "member.scan.signInAgain": "Sign in again before scanning.",
    "member.scan.signInSelectGym": "Sign in and select a gym before scanning.",
    "member.scan.subtitle": "Point your camera at the QR code at your gym",
    "member.scan.title": "Scan to check in",
    "member.scan.tryCameraAgain": "Try camera again",
    "member.scan.tryCheckIn": "Try check-in",
    "member.scan.verifying": "Verifying",
    "member.scan.yourGym": "Your gym",
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
    "owner.home.allClearBody":
      "No urgent approvals, payment exceptions, low-stock items, or expiring plans need action right now.",
    "owner.home.approvals": "Approvals",
    "owner.home.approvalsWaiting": "Approvals waiting",
    "owner.home.approvalsWaitingSubtitle":
      "{{join}} join {{joinLabel}} · {{scans}} scan {{scanLabel}}",
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
    "owner.home.reviewMembers": "Review members",
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
    "owner.members.active": "Active",
    "owner.members.day": "day",
    "owner.members.days": "days",
    "owner.members.daysLeft": "{{count}} {{label}} left",
    "owner.members.expiring": "Expiring",
    "owner.members.expiringReminderBody": "Your membership ends on {{date}}. Renew in the app.",
    "owner.members.expiringReminderTitle": "Membership expiring soon",
    "owner.members.missingContact": "Missing contact",
    "owner.members.reminderNotSent": "Reminder not sent",
    "owner.members.reminderSent": "Reminder sent to {{name}}.",
    "owner.members.sendReminder": "Send reminder",
    "owner.members.soon": "soon",
    "owner.members.title": "Members",
    "owner.members.total": "{{count}} total",
    "owner.members.tryAgain": "Try again.",
    "owner.member.couldNotLoadMember": "Could not load member",
    "owner.member.actionContactBody":
      "Add a phone and email before assigning offers or sending reminders.",
    "owner.member.actionContactTitle": "Complete contact details",
    "owner.member.actionExpiringBody":
      "Plan ends in {{count}} days. Send a reminder before access lapses.",
    "owner.member.actionExpiringTitle": "Renewal window is open",
    "owner.member.actionHealthyBody":
      "Profile, contact, and membership status look ready for daily operations.",
    "owner.member.actionHealthyTitle": "Member is in good shape",
    "owner.member.actionPlanBody":
      "No active membership is ready. Record payment or assign a plan before check-ins.",
    "owner.member.actionPlanTitle": "Set up an active plan",
    "owner.member.email": "Email",
    "owner.member.fitnessGoal": "Fitness goal",
    "owner.member.memberFallback": "Member",
    "owner.member.memberSince": "Member since",
    "owner.member.nextBestAction": "Next best action",
    "owner.member.noActivePlan": "No active plan",
    "owner.member.notes": "Notes",
    "owner.member.notAvailable": "Not available",
    "owner.member.notFound": "Member not found",
    "owner.member.notSet": "Not set",
    "owner.member.openingPaymentTools": "Opening payment tools.",
    "owner.member.phone": "Phone",
    "owner.member.recordPayment": "Record payment",
    "owner.member.reveal": "View contact",
    "owner.member.revealNotLogged": "Contact view not logged",
    "owner.member.revealNotLoggedBody":
      "The phone was shown, but the audit log could not be saved.",
    "owner.member.revealPhoneFor": "View contact for {{name}}",
    "owner.member.sendReminder": "Send reminder",
    "owner.member.subscriptionHistory": "Subscription history",
    "owner.member.untilDate": "Until {{date}}",
    "owner.member.viewFullProfile": "View full profile",
    "owner.member.visitsLeft": "{{count}} visits left",
    "owner.approvals.allCaughtUp": "All caught up",
    "owner.approvals.allCaughtUpBody": "No join requests or flagged check-ins need your review.",
    "owner.approvals.approveAll": "Approve all",
    "owner.approvals.approveAllBody": "{{count}} pending members will be added to this gym.",
    "owner.approvals.approveAllTitle": "Approve all join requests?",
    "owner.approvals.approveFailed": "Unable to approve join requests.",
    "owner.approvals.approvedJoinRequests": "Approved {{count}} join requests.",
    "owner.approvals.approvedPartial": "Approved {{approved}} of {{total}}.",
    "owner.approvals.joinRequest": "Join request",
    "owner.approvals.joinRequests": "Join requests",
    "owner.approvals.memberCheckIn": "Member check-in",
    "owner.approvals.none": "none",
    "owner.approvals.ownerApprovalRequired": "Owner approval required",
    "owner.approvals.pending": "Pending",
    "owner.approvals.pendingReviews": "Pending reviews",
    "owner.approvals.referral": "Referral",
    "owner.approvals.reject": "Reject",
    "owner.approvals.rejectBody":
      "This person won't be added to the gym and would need to request again.",
    "owner.approvals.rejected": "Join request rejected.",
    "owner.approvals.rejectFailed": "Unable to reject join request.",
    "owner.approvals.rejectTitle": "Reject join request?",
    "owner.approvals.requestListCount": "Request list ({{count}})",
    "owner.approvals.scanReviewQueueCount": "Scan review queue ({{count}})",
    "owner.approvals.scanReviews": "Scan reviews",
    "owner.approvals.title": "Approvals",
    "owner.more.approvals": "Approvals",
    "owner.more.approvalsSubtitle": "Review join requests and flagged scans",
    "owner.more.billing": "Billing",
    "owner.more.billingSubtitle": "Trial and subscription",
    "owner.more.branches": "Branches",
    "owner.more.branchesSubtitle": "Locations and operating details",
    "owner.more.couponsOffers": "Coupons & offers",
    "owner.more.couponsOffersSubtitle": "Discount codes for checkout campaigns",
    "owner.more.entryQr": "Entry QR",
    "owner.more.entryQrSubtitle": "Display the rolling check-in QR at your door",
    "owner.more.exerciseLibrary": "Exercise library",
    "owner.more.exerciseLibrarySubtitle": "Shared workout templates for trainers",
    "owner.more.membershipPlans": "Membership plans",
    "owner.more.membershipPlansSubtitle": "Create and price the plans members buy",
    "owner.more.notificationTemplates": "Notification templates",
    "owner.more.notificationTemplatesSubtitle": "Reusable message drafts",
    "owner.more.groupCatalog": "Catalog",
    "owner.more.groupDailyWork": "Daily work",
    "owner.more.groupFinance": "Finance & growth",
    "owner.more.groupOperations": "Operations",
    "owner.more.members": "Members",
    "owner.more.membersSubtitle": "Find profiles, renewals, and expiring plans",
    "owner.more.ownerTools": "Owner tools",
    "owner.more.referGym": "Refer a gym & earn",
    "owner.more.referGymSubtitle": "Get free Zook days when a gym you refer subscribes",
    "owner.more.referralProgram": "Referral program",
    "owner.more.referralProgramSubtitle": "Set rewards for members, trainers & gym referrals",
    "owner.more.reports": "Reports",
    "owner.more.reportsSubtitle": "Revenue, attendance, and member movement",
    "owner.more.revenue": "Revenue",
    "owner.more.revenueSubtitle": "Track collections, receipts, and failed payments",
    "owner.more.staff": "Staff",
    "owner.more.staffSubtitle": "Invite and manage admins and trainers",
    "owner.more.stock": "Stock",
    "owner.more.stockSubtitle": "Products and pickups",
    "owner.more.trainerPayouts": "Trainer payouts",
    "owner.more.trainerPayoutsSubtitle": "Review and pay your coaches",
    "owner.more.webControlRoom": "Web control room",
    "owner.exerciseLibrary.add": "Add",
    "owner.exerciseLibrary.customExercise": "Custom exercise",
    "owner.exerciseLibrary.edit": "Edit",
    "owner.exerciseLibrary.editTemplate": "Edit template",
    "owner.exerciseLibrary.equipment": "Equipment",
    "owner.exerciseLibrary.equipmentPlaceholder": "Barbell",
    "owner.exerciseLibrary.exerciseName": "Exercise name",
    "owner.exerciseLibrary.exerciseNamePlaceholder": "Bench press",
    "owner.exerciseLibrary.featured": "Featured",
    "owner.exerciseLibrary.featuredTemplates": "Featured",
    "owner.exerciseLibrary.muscle": "Muscle",
    "owner.exerciseLibrary.musclePlaceholder": "Chest",
    "owner.exerciseLibrary.new": "New",
    "owner.exerciseLibrary.newTemplate": "New template",
    "owner.exerciseLibrary.noSharedTemplates": "No shared templates",
    "owner.exerciseLibrary.noSharedTemplatesBody":
      "Add starters or create your own house favorites.",
    "owner.exerciseLibrary.notes": "Notes",
    "owner.exerciseLibrary.notesPlaceholder": "Coaching cues",
    "owner.exerciseLibrary.programmingDefaults": "Programming defaults",
    "owner.exerciseLibrary.remove": "Remove",
    "owner.exerciseLibrary.removeTemplateBody":
      '"{{name}}" will be hidden from the shared library.',
    "owner.exerciseLibrary.removeTemplateTitle": "Remove template?",
    "owner.exerciseLibrary.reps": "Reps",
    "owner.exerciseLibrary.repsCount": "{{count}} reps",
    "owner.exerciseLibrary.restSec": "Rest sec",
    "owner.exerciseLibrary.saveTemplate": "Save template",
    "owner.exerciseLibrary.sets": "Sets",
    "owner.exerciseLibrary.setsCount": "{{count}} sets",
    "owner.exerciseLibrary.shared": "Shared",
    "owner.exerciseLibrary.sharedLibrary": "Shared library",
    "owner.exerciseLibrary.sharedTemplates": "Shared",
    "owner.exerciseLibrary.starter": "Starter",
    "owner.exerciseLibrary.starterTemplates": "Starters",
    "owner.exerciseLibrary.starters": "Starters",
    "owner.exerciseLibrary.subtitle": "Shared workout templates your trainers can reuse.",
    "owner.exerciseLibrary.tempo": "Tempo",
    "owner.exerciseLibrary.title": "Exercise library",
    "owner.coupons.active": "Active",
    "owner.coupons.activeOffers": "{{count}} active",
    "owner.coupons.amountOffInput": "Amount off (₹)",
    "owner.coupons.amountOffValue": "{{amount}} off",
    "owner.coupons.code": "Code",
    "owner.coupons.coupons": "Coupons",
    "owner.coupons.createCoupon": "Create coupon",
    "owner.coupons.discount": "Discount",
    "owner.coupons.edit": "Edit",
    "owner.coupons.editAccessibility": "Edit {{code}}",
    "owner.coupons.editCoupon": "Edit coupon",
    "owner.coupons.flatInrOff": "Flat ₹ off",
    "owner.coupons.maxRedemptions": "Max redemptions",
    "owner.coupons.newCoupon": "New coupon",
    "owner.coupons.noCouponsYet": "No coupons yet",
    "owner.coupons.noCouponsYetBody": "Create a discount code to run a campaign.",
    "owner.coupons.paused": "Paused",
    "owner.coupons.pausedOffers": "{{count}} paused",
    "owner.coupons.perMember": "Per member",
    "owner.coupons.perMemberLimit": "{{count}}/member",
    "owner.coupons.percentOff": "Percent off",
    "owner.coupons.percentOffInput": "Percent off (%)",
    "owner.coupons.percentOffValue": "{{value}}% off",
    "owner.coupons.redemptions": "Redemptions",
    "owner.coupons.redemptionLimits": "Redemption limits",
    "owner.coupons.remove": "Remove",
    "owner.coupons.removeCouponBody": '"{{code}}" will no longer be redeemable.',
    "owner.coupons.removeCouponTitle": "Remove coupon?",
    "owner.coupons.saveChanges": "Save changes",
    "owner.coupons.subtitle": "Discount codes members can apply at checkout.",
    "owner.coupons.title": "Coupons & offers",
    "owner.coupons.unlimited": "Unlimited",
    "owner.coupons.usedCount": "{{count}} used",
    "owner.coupons.usedWithLimit": "{{used}}/{{limit}} used",
    "owner.plans.createPlan": "Create plan",
    "owner.plans.dateRange": "Date range",
    "owner.plans.daysCount": "{{count}} days",
    "owner.plans.duration": "Duration",
    "owner.plans.durationDays": "Duration (days)",
    "owner.plans.edit": "Edit",
    "owner.plans.editAccessibility": "Edit {{name}}",
    "owner.plans.editPlan": "Edit plan",
    "owner.plans.hidden": "Hidden",
    "owner.plans.hiddenDrafts": "Hidden drafts",
    "owner.plans.hybrid": "Hybrid",
    "owner.plans.newPlan": "New plan",
    "owner.plans.noPlansYet": "No plans yet",
    "owner.plans.noPlansYetBody": "Create your first membership plan.",
    "owner.plans.planLimits": "Plan limits",
    "owner.plans.planName": "Plan name",
    "owner.plans.planNamePlaceholder": "Monthly Active",
    "owner.plans.plans": "Plans",
    "owner.plans.priceInr": "Price (₹)",
    "owner.plans.publicPlans": "Public plans",
    "owner.plans.remove": "Remove",
    "owner.plans.removePlanBody": 'Members won\'t be able to buy "{{name}}" anymore.',
    "owner.plans.removePlanTitle": "Remove plan?",
    "owner.plans.saveChanges": "Save changes",
    "owner.plans.showPublicly": "Show publicly",
    "owner.plans.subtitle": "The plans members can buy at your gym.",
    "owner.plans.title": "Membership plans",
    "owner.plans.totalPlans": "{{count}} total",
    "owner.plans.trial": "Trial",
    "owner.plans.type": "Type",
    "owner.plans.visitPack": "Visit pack",
    "owner.plans.visits": "Visits",
    "owner.plans.visitsCount": "{{count}} visits",
    "owner.billing.activeMembers": "Active members",
    "owner.billing.activeMembersCopy": "{{count}} {{noun}} {{verb}} toward your plan limits",
    "owner.billing.aiImages": "AI images",
    "owner.billing.aiText": "AI text",
    "owner.billing.autopay": "Autopay",
    "owner.billing.branches": "Branches",
    "owner.billing.cancel": "Cancel",
    "owner.billing.cancelAtPeriodEnd": "Cancel at period end",
    "owner.billing.cancelSubscriptionBody": "The subscription is marked to cancel at period end.",
    "owner.billing.cancelSubscriptionTitle": "Cancel subscription?",
    "owner.billing.cancellationRequested": "Subscription cancellation requested.",
    "owner.billing.couldNotCancelSubscription": "Could not cancel subscription.",
    "owner.billing.couldNotOpenPlanCheckout": "Could not open plan checkout.",
    "owner.billing.couldNotStartBillingSetup": "Could not start billing setup.",
    "owner.billing.count": "count",
    "owner.billing.counts": "counts",
    "owner.billing.currentPlanLimits": "Current plan limits",
    "owner.billing.currentPlanLimitsBody":
      "Limits are enforced for gym size, team size, branches, inventory, messages, and AI usage.",
    "owner.billing.keep": "Keep",
    "owner.billing.mandate": "Mandate",
    "owner.billing.member": "member",
    "owner.billing.members": "members",
    "owner.billing.messages": "Messages",
    "owner.billing.month": "month",
    "owner.billing.monthly": "Monthly",
    "owner.billing.nextBilling": "Next billing",
    "owner.billing.nextCharge": "Next charge",
    "owner.billing.needsSetup": "Needs setup",
    "owner.billing.noPaymentMandate": "No payment mandate is set up.",
    "owner.billing.notAvailable": "Not available",
    "owner.billing.openingBillingSetup": "Opening billing setup.",
    "owner.billing.openingPlanCheckout": "Opening plan checkout.",
    "owner.billing.planName": "{{name}} plan",
    "owner.billing.platformReferral": "Platform referral",
    "owner.billing.products": "Products",
    "owner.billing.referralPartnerships": "{{count}} gym referral partnerships recorded.",
    "owner.billing.reports": "Reports",
    "owner.billing.resumeSetup": "Resume setup",
    "owner.billing.select": "Select",
    "owner.billing.setUpMandate": "Set up mandate",
    "owner.billing.sixMonths": "6 months",
    "owner.billing.staff": "Staff",
    "owner.billing.ready": "Ready",
    "owner.billing.statusActive": "Active",
    "owner.billing.statusCancelled": "Cancelled",
    "owner.billing.statusDeleted": "Deleted",
    "owner.billing.statusMissing": "Missing",
    "owner.billing.statusPaymentPending": "Payment pending",
    "owner.billing.statusPaused": "Paused",
    "owner.billing.statusSuspended": "Suspended",
    "owner.billing.statusTrialActive": "Trial active",
    "owner.billing.statusTrialExpired": "Trial expired",
    "owner.billing.statusTrialExpiring": "Trial expiring",
    "owner.billing.support": "Support",
    "owner.billing.subscription": "Subscription",
    "owner.billing.title": "Billing",
    "owner.billing.trainers": "Trainers",
    "owner.billing.trialEnds": "Trial ends",
    "owner.billing.upgradePlan": "Upgrade plan",
    "owner.billing.upgradePlanBody": "Choose the same SaaS tiers used on web billing.",
    "owner.billing.year": "year",
    "owner.billing.yearly": "Yearly",
    "owner.payouts.baseMonthly": "Base / month (₹)",
    "owner.payouts.confirmBody": "Mark {{amount}} as paid for {{period}}.",
    "owner.payouts.confirmTitle": "Pay {{name}}?",
    "owner.payouts.earningLines": "{{count}} earning lines",
    "owner.payouts.emptyBody": "Trainer earnings appear here as they accrue.",
    "owner.payouts.emptyTitle": "No payouts yet",
    "owner.payouts.hideSettings": "Hide payout settings",
    "owner.payouts.markPaid": "Mark paid",
    "owner.payouts.marking": "Marking...",
    "owner.payouts.outstanding": "Outstanding this month",
    "owner.payouts.paid": "Paid",
    "owner.payouts.payableTrainers": "Payable trainers",
    "owner.payouts.payDay": "Pay day (1-28)",
    "owner.payouts.perSession": "Per session (₹)",
    "owner.payouts.ptCommission": "PT commission (%)",
    "owner.payouts.saveSettings": "Save settings",
    "owner.payouts.settings": "Payout settings",
    "owner.payouts.subtitle": "Review and pay your coaches.",
    "owner.payouts.thisMonth": "This month",
    "owner.payouts.thisMonthLower": "this month",
    "owner.payouts.title": "Trainer payouts",
    "owner.payouts.trainerFallback": "Trainer",
    "owner.payouts.trainerLower": "trainer",
    "owner.stock.allInStock": "All products in stock",
    "owner.stock.allInStockBody": "Items running low on inventory will appear here.",
    "owner.stock.collectPayment": "Collect payment",
    "owner.stock.collectPaymentBody": "{{count}} orders still need payment before pickup.",
    "owner.stock.collectPaymentDone": "No unpaid shop orders are waiting.",
    "owner.stock.leftThreshold": "{{stock}} left · threshold {{threshold}}",
    "owner.stock.left": "left",
    "owner.stock.lowStock": "Low stock",
    "owner.stock.memberPickup": "Member pickup",
    "owner.stock.noPickups": "No pickups waiting",
    "owner.stock.noPickupsBody": "Paid shop orders awaiting collection will appear here.",
    "owner.stock.paidOrders": "Paid orders",
    "owner.stock.pickupOrders": "Pickup orders",
    "owner.stock.pickupPending": "Pickup pending",
    "owner.stock.pickups": "Pickups",
    "owner.stock.productsToReorder": "Products to reorder",
    "owner.stock.reorder": "Reorder",
    "owner.stock.reorderAccessibility": "Reorder {{name}}",
    "owner.stock.reorderBody":
      "Hi,\n\nPlease share supplier options for {{name}}.\n\nCurrent stock: {{stock}}\nThreshold: {{threshold}}\n\nThanks.",
    "owner.stock.reorderSubject": "Reorder {{name}}",
    "owner.stock.reorderStock": "Reorder stock",
    "owner.stock.reorderStockBody": "{{count}} products are at or below threshold.",
    "owner.stock.reorderStockDone": "No products are below threshold.",
    "owner.stock.reorderNow": "Reorder now",
    "owner.stock.todayWork": "Today's stock work",
    "owner.stock.thresholdShort": "Min {{threshold}}",
    "owner.stock.title": "Stock",
    "owner.stock.underThreshold": "Under threshold",
    "owner.stock.verifyPickup": "Verify pickup",
    "owner.stock.verifyPickupBody": "{{count}} paid orders are ready for handoff.",
    "owner.stock.verifyPickupDone": "No member pickups are waiting.",
    "owner.staff.admin": "Admin",
    "owner.staff.admins": "Admins",
    "owner.staff.changeRole": "Change role",
    "owner.staff.email": "Email",
    "owner.staff.invite": "Invite",
    "owner.staff.inviteStaffMember": "Invite a staff member",
    "owner.staff.invited": "Invited",
    "owner.staff.noStaffBody": "Invite your first admin or trainer.",
    "owner.staff.noStaffYet": "No staff yet",
    "owner.staff.owner": "Owner",
    "owner.staff.pendingInvites": "{{count}} pending",
    "owner.staff.reception": "Reception",
    "owner.staff.receptionWebHint":
      "Reception staff are assigned to a branch from the web dashboard.",
    "owner.staff.remove": "Remove",
    "owner.staff.removeBody": "{{name}} will lose access to this gym.",
    "owner.staff.removeTitle": "Remove staff member?",
    "owner.staff.role": "Role",
    "owner.staff.sendInvite": "Send invite",
    "owner.staff.sending": "Sending...",
    "owner.staff.staffMember": "Staff member",
    "owner.staff.subtitle": "Admins, trainers and reception at your gym.",
    "owner.staff.team": "Team",
    "owner.staff.title": "Staff",
    "owner.staff.totalStaff": "{{count}} total",
    "owner.staff.trainer": "Trainer",
    "owner.staff.trainers": "Trainers",
    "owner.dashboard.activeCount": "{{count}} active",
    "owner.dashboard.attendance7Days": "Attendance · 7 days",
    "owner.dashboard.chartAccessibility": "Dashboard chart",
    "owner.dashboard.collapseTrends": "Hide trend details",
    "owner.dashboard.expandTrends": "Show trend details",
    "owner.dashboard.members30Days": "Members · 30 days",
    "owner.dashboard.noActiveMemberPlans": "No active member plans.",
    "owner.dashboard.planMix": "Plan mix",
    "owner.dashboard.revenue7Days": "Revenue · 7 days",
    "owner.dashboard.trends": "Trends",
    "owner.dashboard.trendsSubtitle": "Revenue, attendance, and member trends",
    "reception.desk.active": "Active",
    "reception.desk.branch": "Branch",
    "reception.desk.coachName": "Coach {{name}}",
    "reception.desk.code": "Code",
    "reception.desk.displayEntryQr": "Entry QR",
    "reception.desk.enterCode": "Enter code",
    "reception.desk.flagged": "Flagged",
    "reception.desk.gateQueueClear": "Gate queue clear",
    "reception.desk.needsApprovalQueue": "Needs Approval queue",
    "reception.desk.noCheckIns": "No check-ins yet",
    "reception.desk.noCheckInsBody": "Member check-ins for today will appear here.",
    "reception.desk.openApprovalQueue": "Open approval queue",
    "reception.desk.pending": "Pending",
    "reception.desk.pendingCount": "{{count}} pending",
    "reception.desk.queueClear": "Desk queue clear",
    "reception.desk.queueClearBody": "No pending or flagged scans need the desk.",
    "reception.desk.queueMeta": "{{pending}} pending · {{flagged}} flagged",
    "reception.desk.queueNeedsAction": "Desk queue needs action",
    "reception.desk.queueNeedsActionBody":
      "Review pending and flagged entry attempts before they age out.",
    "reception.desk.recentActivity": "Recent activity",
    "reception.desk.referGym": "Refer a gym & earn",
    "reception.desk.referGymAccessibility": "Refer a gym to Zook and earn",
    "reception.desk.referGymBody": "Earn cash when a gym you refer subscribes to Zook",
    "reception.desk.reviewRequired": "Review required",
    "reception.desk.statusApproved": "Approved",
    "reception.desk.statusFailed": "Failed",
    "reception.desk.statusPendingApproval": "Needs review",
    "reception.desk.statusRejected": "Rejected",
    "reception.desk.statusRecorded": "Recorded",
    "reception.desk.today": "Today",
    "reception.desk.todayCount": "{{count}} today",
    "reception.desk.todaysClasses": "Today's classes",
    "reception.desk.verifying": "Verifying...",
    "reception.desk.verifyCode": "Verify Code",
    "reception.desk.verifyEntryCode": "Verify Entry Code",
    "reception.desk.viewRosterFor": "View roster for {{name}}",
    "reception.workspace.backToOwnerTools": "Back to owner tools",
    "reception.workspace.goBack": "Go back",
    "reception.workspace.activeBranchSuffix": "{{name}} (active)",
    "reception.workspace.activeGymFallback": "Active gym",
    "reception.workspace.addAttendanceNote": "Add an attendance note before recording.",
    "reception.workspace.alreadyCheckedInToday": "This member is already checked in today.",
    "reception.workspace.approveFailed": "Could not approve. Please try again.",
    "reception.workspace.approvedScanReason": "Reception approved scan after review",
    "reception.workspace.authenticationRequiredAction":
      "Authentication required to perform this action.",
    "reception.workspace.bulkRecorded": "Recorded attendance for {{count}} {{memberLabel}}.",
    "reception.workspace.bulkRecordedMany": "Recorded attendance for {{count}} members.",
    "reception.workspace.bulkRecordedOne": "Recorded attendance for 1 member.",
    "reception.workspace.bulkRecordedPartial":
      "Recorded {{successes}} of {{total}}. {{failures}} failed.",
    "reception.workspace.checkInApproved": "Check-in approved.",
    "reception.workspace.checkInNotValid": "Check-in not valid",
    "reception.workspace.checkInRejected": "Check-in rejected.",
    "reception.workspace.checkInVerified": "Check-in verified",
    "reception.workspace.couldNotRecordOne": "Could not record one entry.",
    "reception.workspace.deskApprovalRequired": "Desk approval required.",
    "reception.workspace.enterCodeFirst": "Enter a code first.",
    "reception.workspace.entryCode": "Entry code",
    "reception.workspace.entryCodeInvalidMessage":
      "Entry code found for {{name}}, but it is not valid for entry.",
    "reception.workspace.fulfillFailed": "Could not fulfill this order.",
    "reception.workspace.fulfillPickupAuth": "Fulfill pickup without code",
    "reception.workspace.fulfillPickupReason":
      "Reception manually fulfilled pickup after local re-auth.",
    "reception.workspace.mainBranchFallback": "Main branch",
    "reception.workspace.manualAttendanceRecorded": "Manual attendance recorded.",
    "reception.workspace.memberCheckInFallback": "Member check-in",
    "reception.workspace.memberFallback": "Member",
    "reception.workspace.membershipAlreadyActive":
      "This membership is already active. Choose a pending subscription or create a new manual activation.",
    "reception.workspace.membershipFallback": "Membership",
    "reception.workspace.noActiveCode": "No active entry or pickup code.",
    "reception.workspace.notValidForEntry": "Not valid for entry",
    "reception.workspace.onlyOneBranchBody": "This gym has no other branches to switch to.",
    "reception.workspace.onlyOneBranchTitle": "Only one branch",
    "reception.workspace.orderTotalDetail": "Order total: {{amount}}",
    "reception.workspace.ownerApprovalRequired": "Owner approval required",
    "reception.workspace.ownerDesk": "Owner desk",
    "reception.workspace.paymentRecorded": "Recorded {{amount}} by {{mode}}.",
    "reception.workspace.pickedBadge": "Picked",
    "reception.workspace.pickupFulfilled": "Pickup fulfilled.",
    "reception.workspace.pickupNotReady": "Pickup not ready",
    "reception.workspace.pickupStatusTitle": "Pickup {{status}}",
    "reception.workspace.pickupVerified": "Pickup verified",
    "reception.workspace.pickupVerifiedFor": "Pickup verified for {{name}}",
    "reception.workspace.recordManualAttendanceAuth": "Record manual attendance",
    "reception.workspace.recordManualPaymentAuth": "Record manual payment",
    "reception.workspace.recording": "Recording...",
    "reception.workspace.receptionDesk": "Front desk",
    "reception.workspace.rejectFailed": "Could not reject. Please try again.",
    "reception.workspace.rejectedScanReason": "Reception rejected scan after review",
    "reception.workspace.selectedBadge": "Selected",
    "reception.workspace.signInSelectGymVerify": "Sign in and select a gym before verifying.",
    "reception.workspace.statusDetail": "Status: {{status}}",
    "reception.workspace.switchBranchBody": "Choose the branch you are at.",
    "reception.workspace.switchBranchTitle": "Switch branch",
    "reception.workspace.verifiedName": "Verified {{name}}",
    "reception.workspace.verifyCodeFailed": "Could not verify this code.",
    "reception.workspace.verifyFailedTitle": "Verify failed",
    "reception.workspace.verificationFailed": "Verification failed.",
    "reception.workspace.verificationSuccessful": "Verification successful.",
    "reception.home.title": "Front desk",
    "reception.members.attendanceNote": "Attendance note",
    "reception.members.auditReason": "Add a reason so the gym has a clear record.",
    "reception.members.clearSelectedMember": "Clear selected member",
    "reception.members.clear": "Clear",
    "reception.members.deskActions": "Desk actions",
    "reception.members.generalFitness": "General fitness",
    "reception.members.hiddenHint":
      "Showing {{visible}} of {{total}} matches. Refine the search to find a specific member faster.",
    "reception.members.memberTitle": "Member",
    "reception.members.membership": "Membership",
    "reception.members.multiSelectCount": "Multi-select · {{count}}",
    "reception.members.noMembers": "No members",
    "reception.members.noMembersBody": "Try a different name or email.",
    "reception.members.noMembership": "No membership",
    "reception.members.reasonTooShort": "Add at least 2 characters.",
    "reception.members.recordAttendance": "Record Attendance",
    "reception.members.recordForAll": "Record for all",
    "reception.members.recording": "Recording...",
    "reception.members.searchOrSelect": "Search or select a member",
    "reception.members.selectMultiple": "Select multiple",
    "reception.members.selectedCount": "{{count}} members selected",
    "reception.members.title": "Members",
    "reception.orders.confirmPickedUpBody": "{{name}} is marked as collected for {{amount}}.",
    "reception.orders.confirmPickedUpTitle": "Mark order picked up?",
    "reception.orders.done": "Done",
    "reception.orders.enterPickupCode": "Enter pickup code",
    "reception.orders.fulfillmentQueue": "Fulfillment queue",
    "reception.orders.itemCount": "{{count}} items",
    "reception.orders.markPickedUp": "Mark picked up",
    "reception.orders.noPickupsBody": "Paid shop orders ready for collection will appear here.",
    "reception.orders.pickupCode": "Pickup code",
    "reception.orders.pickupVerification": "Pickup verification",
    "reception.orders.pickupVerificationBody":
      "Match the code and member before giving out the order.",
    "reception.orders.ready": "Ready",
    "reception.orders.statusCancelled": "Cancelled",
    "reception.orders.statusFailed": "Failed",
    "reception.orders.statusFulfilled": "Picked up",
    "reception.orders.statusPaid": "Paid",
    "reception.orders.statusPendingPayment": "Payment pending",
    "reception.orders.statusRefunded": "Refunded",
    "reception.orders.thisMember": "This member",
    "reception.orders.title": "Orders",
    "reception.orders.verifyPickupCode": "Verify pickup code",
    "reception.payments.activeDesk": "Active desk",
    "reception.payments.additionalDetails": "Additional details",
    "reception.payments.amount": "Amount",
    "reception.payments.amountInvalid": "Enter an amount greater than 0.",
    "reception.payments.amountReceived": "Amount received",
    "reception.payments.auditWarning":
      "All offline payments are recorded with audit logs. Ensure payment is received before recording.",
    "reception.payments.changeMember": "Change member",
    "reception.payments.collection": "Payment collection",
    "reception.payments.collectionMode": "Collection mode",
    "reception.payments.desk": "Desk",
    "reception.payments.deskNote": "Desk note",
    "reception.payments.deskNotePlaceholder": "Anything finance should see",
    "reception.payments.due": "Due",
    "reception.payments.dueAmount": "{{amount}} due",
    "reception.payments.findMember": "Find a member",
    "reception.payments.invoice": "Invoice",
    "reception.payments.memberPayment": "Reception member payment",
    "reception.payments.membershipSelected": "{{status}} membership selected",
    "reception.payments.missing": "Missing",
    "reception.payments.mode": "Mode",
    "reception.payments.modeBank": "Bank",
    "reception.payments.modeCard": "Card",
    "reception.payments.modeCash": "Cash",
    "reception.payments.modeManual": "Manual",
    "reception.payments.modeUpi": "Direct UPI",
    "reception.payments.newPayment": "New Payment",
    "reception.payments.noContact": "No contact",
    "reception.payments.noAdditionalDetails": "No reference or note",
    "reception.payments.noMembershipSelected": "No membership selected",
    "reception.payments.noPlan": "No plan",
    "reception.payments.recordPayment": "Record Payment",
    "reception.payments.reference": "Receipt or reference",
    "reception.payments.referencePlaceholder": "UPI ref, bank UTR, card slip",
    "reception.payments.reviewConsequence":
      "Only record this after cash, UPI, card, or bank transfer is actually received at the desk.",
    "reception.payments.reviewTitle": "Desk payment review",
    "reception.payments.searchPlaceholder": "Name, email, or phone",
    "reception.payments.selectMember": "Select a member",
    "reception.payments.selectMemberAccessibility": "Select {{name}}",
    "reception.payments.selectMemberFirst": "Select member first",
    "reception.payments.staffNote": "Staff note",
    "reception.payments.subtitle": "Reception",
    "reception.payments.verified": "Verified",
    "reception.verification.title": "Verification",
    "reception.decision.addDeskNote": "Add the desk note before approving or rejecting this scan.",
    "reception.decision.approve": "Approve",
    "reception.decision.approving": "Approving...",
    "reception.decision.close": "Close",
    "reception.decision.closeSheet": "Close decision sheet",
    "reception.decision.memberCheckIn": "Member check-in",
    "reception.decision.reason": "Decision reason",
    "reception.decision.reject": "Reject",
    "reception.decision.rejecting": "Rejecting...",
    "attendance.mutation.approved": "Attendance approved.",
    "attendance.mutation.approveFailed": "Attendance could not be approved.",
    "attendance.mutation.manualRecorded": "Manual check-in recorded.",
    "attendance.mutation.manualFailed": "Manual check-in could not be recorded.",
    "attendance.mutation.rejected": "Attendance rejected.",
    "attendance.mutation.rejectFailed": "Attendance could not be rejected.",
    "owner.referrals.allowTrainerReferrals": "Allow trainer referrals",
    "owner.referrals.codeExpiryDays": "Code expiry (days)",
    "owner.referrals.creditInr": "Credit (₹)",
    "owner.referrals.discountInr": "Discount ₹",
    "owner.referrals.discountPercent": "Discount %",
    "owner.referrals.enabled": "Referrals enabled",
    "owner.referrals.enabledBody": "Turn the whole referral program on or off.",
    "owner.referrals.enabledShort": "Enabled",
    "owner.referrals.flatInr": "Flat ₹",
    "owner.referrals.freeDays": "Free days",
    "owner.referrals.limits": "Limits",
    "owner.referrals.limitSummary": "{{count}}/month · {{days}} days",
    "owner.referrals.maxPerMemberMonth": "Max / member / month",
    "owner.referrals.memberGymCreditBody":
      "Account credit a member earns when a gym they refer signs up.",
    "owner.referrals.memberRefersMember": "Member refers a member",
    "owner.referrals.memberRefersNewGym": "Member refers a new gym",
    "owner.referrals.moreRules": "More referral rules",
    "owner.referrals.moreRulesBody": "Trainer rewards, new-gym credit, and monthly limits",
    "owner.referrals.newMemberGets": "New member gets",
    "owner.referrals.none": "None",
    "owner.referrals.off": "Off",
    "owner.referrals.paused": "Paused",
    "owner.referrals.percent": "Percent",
    "owner.referrals.program": "Program",
    "owner.referrals.referrerEarns": "Referrer earns",
    "owner.referrals.saveSettings": "Save referral settings",
    "owner.referrals.subtitle": "Set how much everyone earns for referrals.",
    "owner.referrals.title": "Referral program",
    "owner.referrals.trainerEarns": "Trainer earns",
    "owner.referrals.trainerRefersMember": "Trainer refers a member",
    "owner.referrals.trainers": "Trainers",
    "owner.referrals.visits": "Visits",
    "owner.revenue.noPaymentsYet": "No payments yet",
    "owner.revenue.noPaymentsYetBody":
      "Payments and shop pickups will appear here as they come in.",
    "owner.revenue.paymentFallback": "payment",
    "owner.revenue.pickupPending": "Pickup pending",
    "owner.revenue.pickupValue": "Pickup value",
    "owner.revenue.pickupValueBody": "{{count}} shop pickups hold {{amount}} in member orders.",
    "owner.revenue.pickupValueDone": "No pickup value is waiting at the desk.",
    "owner.revenue.recentTransactions": "Recent transactions",
    "owner.revenue.refund": "Refund",
    "owner.revenue.refundAccessibility": "Refund {{name}}",
    "owner.revenue.refundPaymentBody": "Refund {{amount}} to {{name}}. This can't be undone.",
    "owner.revenue.refundPaymentTitle": "Refund payment?",
    "owner.revenue.refundReview": "Refund review",
    "owner.revenue.refundReviewBody":
      "{{count}} successful payments can still be refunded from the feed.",
    "owner.revenue.refundReviewDone": "No successful payments need refund review.",
    "owner.revenue.refundedByGym": "Refunded by gym",
    "owner.revenue.financeWork": "Finance work",
    "owner.revenue.manualRecords": "Manual records",
    "owner.revenue.manualRecordsBody":
      "{{count}} desk-recorded payments need daily reconciliation.",
    "owner.revenue.manualRecordsDone": "No manual payments need reconciliation.",
    "owner.revenue.manualRecordsWithAmount": "Desk records {{amount}}",
    "owner.revenue.revenueToday": "Revenue today",
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
    "trainer.home.noCoachingActionsBody":
      "You're on top of your clients. New tasks will show up here.",
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
    "trainer.clients.coachingFocus": "Coaching focus",
    "trainer.clients.coachingFocusBody": "Start with clients who need a plan or feedback review.",
    "trainer.clients.generalFitness": "General fitness",
    "trainer.clients.nextClient": "Next client",
    "trainer.clients.noClients": "No clients",
    "trainer.clients.noClientsBody": "No clients added by your gym.",
    "trainer.clients.noMatchingClients": "No matching clients",
    "trainer.clients.openNextClient": "Open",
    "trainer.clients.searchClients": "Search clients",
    "trainer.clients.subtitle": "Your assigned clients",
    "trainer.clients.title": "Clients",
    "trainer.clients.total": "{{count}} total",
    "trainer.clients.tryAnotherSearch": "Try another search or filter.",
    "trainer.aiDraft.body":
      "Your gym owner can turn on AI plan drafting in settings. You can still create and edit plans manually.",
    "trainer.aiDraft.createManual": "Create plan manually",
    "trainer.aiDraft.title": "AI drafting is off",
    "trainer.classes.cancelBody":
      "Members who booked this class will be notified right away. This can't be undone.",
    "trainer.classes.cancelClass": "Cancel class",
    "trainer.classes.cancelled": "Cancelled",
    "trainer.classes.cancelTitle": "Cancel {{name}}?",
    "trainer.classes.capacity": "Capacity",
    "trainer.classes.classDateAccessibility": "Class date",
    "trainer.classes.className": "Class name",
    "trainer.classes.classNamePlaceholder": "Sunset Yoga Flow",
    "trainer.classes.date": "Date",
    "trainer.classes.editAccessibility": "Edit {{name}}",
    "trainer.classes.editClass": "Edit class",
    "trainer.classes.keepClass": "Keep class",
    "trainer.classes.loadingClasses": "Loading classes...",
    "trainer.classes.loadingClassesBody": "Hang tight, fetching your schedule.",
    "trainer.classes.newClass": "New class",
    "trainer.classes.noClassesBody": "Schedule a class and members can book it.",
    "trainer.classes.priceInr": "Price (₹)",
    "trainer.classes.saveChanges": "Save changes",
    "trainer.classes.schedule": "Schedule",
    "trainer.classes.scheduleClass": "Schedule class",
    "trainer.classes.scheduling": "Scheduling...",
    "trainer.classes.subtitle": "Schedule group sessions members can book.",
    "trainer.classes.time": "Time",
    "trainer.classes.title": "Classes",
    "trainer.classes.type": "Type",
    "trainer.classes.typeBoxing": "Boxing",
    "trainer.classes.typeCycling": "Cycling",
    "trainer.classes.typeDance": "Dance",
    "trainer.classes.typeHiit": "HIIT",
    "trainer.classes.typeMobility": "Mobility",
    "trainer.classes.typeStrength": "Strength",
    "trainer.classes.typeYoga": "Yoga",
    "trainer.classes.upcomingClasses": "Upcoming classes",
    "trainer.clientSessions.adherence": "Adherence",
    "trainer.clientSessions.averageCompletion":
      "{{percent}}% average completion across recent plan feedback.",
    "trainer.clientSessions.backToClients": "Back to clients",
    "trainer.clientSessions.completePercent": "{{percent}}% complete",
    "trainer.clientSessions.durationMinutes": "{{minutes}} min",
    "trainer.clientSessions.logged": "Logged",
    "trainer.clientSessions.noDetails": "No details added.",
    "trainer.clientSessions.noPlans": "No plans",
    "trainer.clientSessions.planFeedback": "Plan feedback",
    "trainer.clientSessions.planProgress": "Plan progress",
    "trainer.clientSessions.title": "Client detail",
    "trainer.clientSessions.waitingForFeedback": "Waiting for member feedback and workout logs.",
    "trainer.clientDiet.addMeal": "Add meal",
    "trainer.clientDiet.breakfast": "Breakfast",
    "trainer.clientDiet.dailyCalorieTarget": "Daily calorie target",
    "trainer.clientDiet.defaultTitle": "Coached diet plan",
    "trainer.clientDiet.kcal": "{{kcal}} kcal",
    "trainer.clientDiet.kcalLabel": "kcal",
    "trainer.clientDiet.kcalTargetPrefix": "{{kcal}} kcal target · ",
    "trainer.clientDiet.mealCount": "{{count}} meals",
    "trainer.clientDiet.mealLabel": "Meal {{index}}",
    "trainer.clientDiet.meals": "Meals",
    "trainer.clientDiet.mealsPlanned": "{{count}} meals · {{kcal}} kcal planned",
    "trainer.clientDiet.dinner": "Dinner",
    "trainer.clientDiet.lunch": "Lunch",
    "trainer.clientDiet.midMorning": "Mid-morning",
    "trainer.clientDiet.noPreviousPlan":
      "No plan published yet for this client. Build the first one below.",
    "trainer.clientDiet.planTitle": "Plan title",
    "trainer.clientDiet.planTitlePlaceholder": "Muscle gain · Vegetarian",
    "trainer.clientDiet.preWorkout": "Pre-workout",
    "trainer.clientDiet.previousPlan": "Previous plan",
    "trainer.clientDiet.publish": "Publish",
    "trainer.clientDiet.publishBody": "The member sees this plan in their Diet tab immediately.",
    "trainer.clientDiet.publishing": "Publishing...",
    "trainer.clientDiet.publishTitle": "Publish diet plan?",
    "trainer.clientDiet.publishToClient": "Publish to client",
    "trainer.clientDiet.subtitle": "Build and publish a plan for your client.",
    "trainer.clientDiet.title": "Diet plan",
    "trainer.clientDetail.overviewTab": "Overview",
    "trainer.clientDetail.planTab": "Plan",
    "trainer.clientDetail.sessionsTab": "Sessions",
    "trainer.clientOverview.nextStep": "Next coaching step",
    "trainer.clientOverview.nextStepBody": "Pick the action that moves this client forward today.",
    "trainer.clientOverview.reviewFeedback": "Review feedback",
    "trainer.clientOverview.reviewFeedbackBody":
      "Check completion and recent workout notes before changing the plan.",
    "trainer.clientOverview.reviewSessions": "Review sessions",
    "trainer.clientOverview.reviewSessionsBody":
      "No workout is logged yet. Open sessions to capture the latest training work.",
    "trainer.clientPlan.assignedStatus": "{{title}} assigned. {{name}} can now see it.",
    "trainer.clientPlan.calories": "Calories",
    "trainer.clientPlan.clientDietPlanPlaceholder": "{{name}} diet plan",
    "trainer.clientPlan.dietPlanPublished": "Diet plan published.",
    "trainer.clientPlan.dietPublishedStatus": "{{title}} published. {{name}} can log meals now.",
    "trainer.clientPlan.dietTitle": "Diet title",
    "trainer.clientPlan.draftPrompt": "{{title}} is saved as a draft. Review before assigning.",
    "trainer.clientPlan.draftSaved": "Draft saved.",
    "trainer.clientPlan.exerciseGobletSquat": "Goblet squat",
    "trainer.clientPlan.exerciseMachineSetup": "Machine setup walkthrough",
    "trainer.clientPlan.exerciseNutritionCheckIn": "Nutrition check-in",
    "trainer.clientPlan.exerciseRecoveryMobility": "Recovery mobility flow",
    "trainer.clientPlan.exerciseTemplates": "Exercise templates",
    "trainer.clientPlan.exerciseWeeklyRoutineReview": "Weekly routine review",
    "trainer.clientPlan.noDietPlanForClient":
      "No diet plan published yet for {{name}}. You are starting fresh below.",
    "trainer.clientPlan.planAssigned": "Plan assigned.",
    "trainer.clientPlan.planBuilder": "Plan builder",
    "trainer.clientPlan.planCouldNotBeCreated": "Plan could not be created.",
    "trainer.clientPlan.proteinG": "Protein g",
    "trainer.clientPlan.proteinPrefix": "{{protein}}g protein · ",
    "trainer.clientPlan.publishBody": "The member sees this plan immediately.",
    "trainer.clientPlan.publishFourMealDiet": "Publish 4-meal diet",
    "trainer.clientPlan.publishToClient": "Publish to {{name}}",
    "trainer.clientPlan.publishToClientTitle": "Publish to {{name}}?",
    "trainer.clientPlan.saveDraft": "Save draft",
    "trainer.clientPlan.savedDraftStatus": "{{title}} saved as a draft.",
    "trainer.clientPlan.saveExerciseTemplate": "Save exercise as template",
    "trainer.clientPlan.selectClientBeforeAssigning": "Select a client before assigning.",
    "trainer.clientPlan.selectClientBeforeDiet": "Select a client before publishing diet.",
    "trainer.clientPlan.selectClientBeforeSaving": "Select a client before saving.",
    "trainer.clientPlan.templateDiet": "Diet",
    "trainer.clientPlan.templateMachine": "Machine Guide",
    "trainer.clientPlan.templateNotes": "Template notes",
    "trainer.clientPlan.templateRecovery": "Recovery",
    "trainer.clientPlan.templateRoutine": "Routine",
    "trainer.clientPlan.templateWorkout": "Workout",
    "trainer.clientOverview.active": "Active",
    "trainer.clientOverview.activeMember": "Active member",
    "trainer.clientOverview.allergyNote": "Allergy note",
    "trainer.clientOverview.averagePlanCompletion": "{{percent}}% average plan completion",
    "trainer.clientOverview.baseline": "Baseline",
    "trainer.clientOverview.bodyFatPercent": "Body fat %",
    "trainer.clientOverview.bodyProgressRecordedToast": "Body progress recorded.",
    "trainer.clientOverview.bodyProgressTrend": "Body progress trend",
    "trainer.clientOverview.createFirstPlan": "Create first plan",
    "trainer.clientOverview.dietNote": "Diet note",
    "trainer.clientOverview.lastCheckIn": "Last check-in",
    "trainer.clientOverview.missing": "Missing",
    "trainer.clientOverview.needsFeedback": "Needs feedback",
    "trainer.clientOverview.noLog": "No log",
    "trainer.clientOverview.noneAdded": "None added",
    "trainer.clientOverview.noMeasurements": "No measurements yet",
    "trainer.clientOverview.noMeasurementsBody":
      "Record body progress above to start tracking this client's trend.",
    "trainer.clientOverview.noWorkoutLogged": "No workout logged",
    "trainer.clientOverview.notAdded": "Not added",
    "trainer.clientOverview.noteAudit":
      "Only assigned trainers and owners/admins can see trainer notes.",
    "trainer.clientOverview.noteSavedToast": "Trainer note saved.",
    "trainer.clientOverview.notShared": "Not shared",
    "trainer.clientOverview.paused": "Paused",
    "trainer.clientOverview.pausedMember": "Paused member",
    "trainer.clientOverview.ptPack": "PT pack",
    "trainer.clientOverview.recordBodyProgress": "Record body progress",
    "trainer.clientOverview.saved": "Saved",
    "trainer.clientOverview.saveNote": "Save note",
    "trainer.clientOverview.shared": "Shared",
    "trainer.clientOverview.tracked": "Tracked",
    "trainer.clientOverview.trainerNote": "Trainer note",
    "trainer.clientOverview.trainerNotePlaceholder": "Add coaching note for your own follow-up...",
    "trainer.clientOverview.waistCm": "Waist cm",
    "trainer.clientOverview.weightKg": "Weight kg",
    "trainer.clientOverview.workoutPlan": "Workout plan",
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
    "trainer.payouts.breakdown": "Breakdown",
    "trainer.payouts.draft": "draft",
    "trainer.payouts.earningLines": "{{count}} earning lines",
    "trainer.payouts.emptyBody": "Your PT commissions and class payouts will show up here.",
    "trainer.payouts.emptyTitle": "No earnings yet",
    "trainer.payouts.settings": "Payout settings",
    "trainer.payouts.settingsSubtitle": "Compensation, pay day & UPI details",
    "trainer.payouts.thisMonthAccrued": "This month accrued",
    "trainer.payouts.title": "Payouts",
    "trainer.payoutSettings.baseMonthly": "Base / month (₹)",
    "trainer.payoutSettings.bio": "Bio",
    "trainer.payoutSettings.bioPlaceholder": "Tell members a bit about your coaching style.",
    "trainer.payoutSettings.compensation": "Compensation",
    "trainer.payoutSettings.footnote": "Changes apply from your next payout cycle.",
    "trainer.payoutSettings.payDay": "Pay day of month",
    "trainer.payoutSettings.payDayHint": "Day of the month your payout is processed (1-28).",
    "trainer.payoutSettings.payDayInvalid": "Enter a day from 1 to 28.",
    "trainer.payoutSettings.perSessionFee": "Per-session fee (₹)",
    "trainer.payoutSettings.perSessionFeeHint": "Flat amount credited for every session you log.",
    "trainer.payoutSettings.profileUpi": "Profile & UPI",
    "trainer.payoutSettings.ptCommission": "PT commission (%)",
    "trainer.payoutSettings.ptCommissionHint": "Share of personal training revenue you earn.",
    "trainer.payoutSettings.ptCommissionInvalid": "Enter a commission from 0 to 100.",
    "trainer.payoutSettings.saveChanges": "Save changes",
    "trainer.payoutSettings.subtitle": "Set how you get paid and your UPI details.",
    "trainer.payoutSettings.title": "Payout settings",
    "trainer.payoutSettings.upiHint": "Used by the gym to pay you directly when needed.",
    "trainer.payoutSettings.upiId": "UPI ID",
    "trainer.plans.activePlanWork": "Active plan work",
    "trainer.plans.createPlan": "Create plan",
    "trainer.plans.emptyBody": "Clients who need a plan or an update will appear here.",
    "trainer.plans.emptyTitle": "No active plan work",
    "trainer.plans.needsFirstPlan": "Needs first plan",
    "trainer.plans.needsFirstPlanBody": "Start with clients who do not have any active plan yet.",
    "trainer.plans.queueClear": "Planning queue clear",
    "trainer.plans.queueClearBody": "No client plans need assignment.",
    "trainer.plans.clientDetail": "Client Detail",
    "trainer.plans.reviewActivePlans": "Review active plans",
    "trainer.plans.reviewActivePlansBody":
      "Open each client to adjust workouts, diet notes, and feedback before publishing changes.",
    "trainer.plans.title": "Plan work",
  },
  hi: {
    "app.loadingSession": "आपका Zook सेशन वापस लाया जा रहा है...",
    "app.launchTagline": "Gym ops, बिना clutter के.",
    "app.configErrorTitle": "इस बिल्ड में Zook नहीं खुल सकता.",
    "app.configErrorBody": "कृपया ऐप अपडेट करें या समस्या बनी रहे तो सपोर्ट से संपर्क करें.",
    "common.cancel": "रद्द करें",
    "common.confirm": "Confirm करें",
    "common.actionFailed": "एक्शन फेल हुआ",
    "common.datePicker": "तारीख चुनें",
    "common.back": "वापस",
    "common.dismiss": "बंद करें",
    "common.done": "हो गया",
    "common.scheduled": "शेड्यूल्ड",
    "common.today": "आज",
    "common.tomorrow": "कल",
    "common.or": "या",
    "common.saving": "सेव हो रहा है...",
    "common.authenticationRequired": "लॉगिन जरूरी है.",
    "common.activeGymRequired": "सक्रिय जिम जरूरी है.",
    "common.closeSheet": "शीट बंद करें",
    "common.dismissNotification": "नोटिफिकेशन हटाएं",
    "common.tryAgain": "फिर कोशिश करें",
    "common.tryAgainMoment": "थोड़ी देर में फिर कोशिश करें.",
    "common.ok": "OK",
    "common.notNow": "अभी नहीं",
    "common.enable": "चालू करें",
    "common.plusCount": "+{{count}} और",
    "network.timeout": "अनुरोध पूरा नहीं हुआ. थोड़ी देर में फिर कोशिश करें.",
    "network.connectionUnavailable": "कनेक्शन नहीं हो पाया. फिर कोशिश करें.",
    "auth.biometricPromptBody": "अगली बार Face ID या डिवाइस बायोमेट्रिक इस्तेमाल करें.",
    "auth.biometricPromptTitle": "Zook जल्दी खोलें?",
    "auth.gymUnavailableForAccount": "इस अकाउंट के लिए जिम उपलब्ध नहीं है",
    "auth.roleUnavailableForOrg": "सक्रिय जिम में यह भूमिका उपलब्ध नहीं है",
    "auth.socialNoToken": "{{provider}} ने साइन-इन टोकन नहीं दिया. फिर कोशिश करें.",
    "auth.socialUnavailable":
      "{{provider}} साइन-इन के लिए इंस्टॉल किया हुआ Zook ऐप चाहिए (Expo Go में उपलब्ध नहीं).",
    "approvalQueue.approve": "मंजूर करें",
    "approvalQueue.approving": "मंजूर हो रहा है...",
    "approvalQueue.reject": "अस्वीकार करें",
    "approvalQueue.rejecting": "अस्वीकार हो रहा है...",
    "branch.removedSwitched": "आपकी ब्रांच हट गई - {{name}} पर बदला गया.",
    "privilegedAction.pinLoading": "PIN एंट्री अभी लोड हो रही है. ऐप खुलने के बाद फिर कोशिश करें.",
    "payments.statusRefreshed": "भुगतान स्थिति अपडेट हो गई",
    "routeGuard.billingSetupRequiredBody":
      "जारी रखने से पहले ट्रायल मैंडेट सेटअप करने के लिए बिलिंग खोलें.",
    "routeGuard.permissionDeniedBody": "आपके पास इस काम की अनुमति नहीं है.",
    "routeGuard.permissionDeniedTitle": "अनुमति नहीं है",
    "webHandoff.copyLink": "लिंक कॉपी करें",
    "webHandoff.linkCopied": "लिंक कॉपी हो गया.",
    "webHandoff.manageOnWeb": "{{title}}, वेब पर मैनेज करें",
    "webHandoff.open": "खोलें",
    "webHandoff.subtitleDefault": "zookfit.in डैशबोर्ड",
    "payments.mutation.paymentRecordFailed": "भुगतान रिकॉर्ड नहीं हो सका.",
    "payments.mutation.paymentRecorded": "भुगतान रिकॉर्ड हो गया.",
    "payments.mutation.refundFailed": "Refund issue नहीं हो सका.",
    "payments.mutation.refundIssued": "Refund issue हो गया.",
    "payments.mutation.testCompleted": "Test payment complete हो गया.",
    "payments.mutation.testFailed": "Test payment complete नहीं हो सका.",
    "shop.mutation.orderCreateFailed": "Order create नहीं हो सका.",
    "shop.mutation.orderCreated": "Order create हो गया.",
    "shop.mutation.pickupFulfillFailed": "Pickup order fulfill नहीं हो सका.",
    "shop.mutation.pickupFulfilled": "Pickup order fulfill हो गया.",
    "gym.mutation.reviewFailed": "आपका review post नहीं हो सका.",
    "gym.mutation.reviewThanks": "आपके review के लिए धन्यवाद!",
    "gym.mutation.signInReview": "Review post करने के लिए फिर से sign in करें.",
    "plans.mutation.progressFailed": "Plan progress save नहीं हो सका.",
    "plans.mutation.progressSaved": "Plan progress save हो गया.",
    "rewards.mutation.signInWithdrawal": "Withdrawal request करने के लिए फिर से sign in करें.",
    "rewards.mutation.withdrawalFailed": "Withdrawal request नहीं हो सकी.",
    "rewards.mutation.withdrawalRequested":
      "Withdrawal request हो गई. हम review करके payout करेंगे.",
    "exerciseTemplates.mutation.removeFailed": "Exercise template remove नहीं हो सका.",
    "exerciseTemplates.mutation.removeSuccess": "Exercise template remove हो गया.",
    "exerciseTemplates.mutation.saveFailed": "Exercise template save नहीं हो सका.",
    "exerciseTemplates.mutation.saveSuccess": "Exercise template save हो गया.",
    "exerciseTemplates.mutation.signInRemove": "Templates remove करने के लिए फिर से sign in करें.",
    "exerciseTemplates.mutation.signInSave": "Templates save करने के लिए फिर से sign in करें.",
    "owner.mutation.billingMandateCreated": "Billing mandate create हो गया.",
    "owner.mutation.billingMandateFailed": "Billing mandate create नहीं हो सका.",
    "owner.mutation.checkoutFailed": "Subscription checkout शुरू नहीं हो सका.",
    "owner.mutation.checkoutStarted": "Subscription checkout शुरू हुआ.",
    "owner.mutation.couponRemoveFailed": "Coupon remove नहीं हो सका.",
    "owner.mutation.couponRemoved": "Coupon remove हो गया.",
    "owner.mutation.couponSaveFailed": "Coupon save नहीं हो सका.",
    "owner.mutation.couponSaved": "Coupon save हो गया.",
    "owner.mutation.inviteFailed": "Invite भेजा नहीं जा सका.",
    "owner.mutation.inviteSent": "Invite भेजा गया.",
    "owner.mutation.joinApproveFailed": "Join request approve नहीं हो सका.",
    "owner.mutation.joinApproved": "Join request approve हो गया.",
    "owner.mutation.joinRejectFailed": "Join request reject नहीं हो सका.",
    "owner.mutation.joinRejected": "Join request reject हो गया.",
    "owner.mutation.payoutMarkFailed": "Payout paid mark नहीं हो सका.",
    "owner.mutation.payoutMarkedPaid": "Payout paid mark हो गया.",
    "owner.mutation.payoutSettingsFailed": "Payout settings save नहीं हो सकीं.",
    "owner.mutation.payoutSettingsSaved": "Payout settings save हो गईं.",
    "owner.mutation.planRemoveFailed": "Plan remove नहीं हो सका.",
    "owner.mutation.planRemoved": "Plan remove हो गया.",
    "owner.mutation.planSaveFailed": "Plan save नहीं हो सका.",
    "owner.mutation.planSaved": "Plan save हो गया.",
    "owner.mutation.referralFailed": "Referral settings save नहीं हो सकीं.",
    "owner.mutation.referralSaved": "Referral settings save हो गईं.",
    "owner.mutation.roleUpdateFailed": "Role update नहीं हो सका.",
    "owner.mutation.roleUpdated": "Role update हो गया.",
    "owner.mutation.staffRemoveFailed": "Staff member remove नहीं हो सका.",
    "owner.mutation.staffRemoved": "Staff member remove हो गया.",
    "owner.mutation.subscriptionCancelFailed": "Subscription cancel नहीं हो सका.",
    "owner.mutation.subscriptionCancellationScheduled": "Subscription cancellation schedule हो गई.",
    "trainer.mutation.attendanceUpdateFailed": "Attendance update नहीं हो सकी.",
    "trainer.mutation.classCancelFailed": "Class cancel नहीं हो सकी.",
    "trainer.mutation.classCancelled": "Class cancel हो गई.",
    "trainer.mutation.classScheduleFailed": "Class schedule नहीं हो सकी.",
    "trainer.mutation.classScheduled": "Class schedule हो गई.",
    "trainer.mutation.classUpdateFailed": "Class update नहीं हो सकी.",
    "trainer.mutation.classUpdated": "Class update हो गई.",
    "trainer.mutation.dietPublishFailed": "Diet plan publish नहीं हो सका.",
    "trainer.mutation.dietPublished": "Diet plan publish हो गया.",
    "trainer.mutation.packageCreateFailed": "Package create नहीं हो सका.",
    "trainer.mutation.packageCreated": "Package create हो गया.",
    "trainer.mutation.packageRemoveFailed": "Package remove नहीं हो सका.",
    "trainer.mutation.packageRemoved": "Package remove हो गया.",
    "trainer.mutation.packageUpdateFailed": "Package update नहीं हो सका.",
    "trainer.mutation.packageUpdated": "Package update हो गया.",
    "trainer.mutation.payoutSettingsFailed": "Payout settings save नहीं हो सकीं.",
    "trainer.mutation.payoutSettingsSaved": "Payout settings save हो गईं.",
    "trainer.mutation.profileFailed": "Profile save नहीं हो सकी.",
    "trainer.mutation.profileSaved": "Profile save हो गई.",
    "trainer.mutation.ptClientAddFailed": "Client add नहीं हो सका.",
    "trainer.mutation.ptClientAdded": "PT client add हो गया.",
    "trainer.mutation.ptRequestApproveFailed": "Request approve नहीं हो सकी.",
    "trainer.mutation.ptRequestApproved": "PT request approve हो गई.",
    "trainer.mutation.sessionLogFailed": "Session log नहीं हो सका.",
    "trainer.mutation.sessionLogged": "Session log हो गया.",
    "network.offline": "आप ऑफलाइन हैं. डेटा पुराना हो सकता है.",
    "notFound.body": "लिंक पुराना हो सकता है, या इस रोल को उस वर्कफ्लो का एक्सेस नहीं है.",
    "notFound.goWorkspace": "मेरे वर्कस्पेस पर जाएं",
    "notFound.helper": "जारी रखने के लिए अपने वर्कस्पेस पर वापस जाएं.",
    "notFound.title": "यह स्क्रीन उपलब्ध नहीं है",
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
    "nav.entryQr": "एंट्री QR",
    "notifications.today": "आज",
    "notifications.yesterday": "कल",
    "notifications.earlierThisWeek": "इस हफ्ते पहले",
    "notifications.older": "पुराने",
    "notifications.allCaughtUp": "सब पढ़ लिया गया",
    "notifications.allCaughtUpRecent": "सब पढ़ लिया गया · हाल का {{date}}",
    "notifications.allMarkedRead": "सभी सूचनाएं पढ़ी हुई मार्क हो गईं.",
    "notifications.attendanceAlertReceived": "अटेंडेंस अलर्ट मिला",
    "notifications.backToInbox": "इनबॉक्स पर लौटें",
    "notifications.closeDetails": "सूचना विवरण बंद करें",
    "notifications.couldNotUpdate": "सूचना अपडेट नहीं हो सकी.",
    "notifications.couldNotUpdateMany": "सूचनाएं अपडेट नहीं हो सकीं.",
    "notifications.done": "हो गया",
    "notifications.emptyBody": "मेंबरशिप, क्लास और कोचिंग से जुड़ी नई सूचनाएं यहां आएंगी.",
    "notifications.emptyTitle": "कोई नई सूचना नहीं",
    "notifications.fallbackTitle": "सूचना",
    "notifications.linkedActions": "जुड़ी हुई कार्रवाई",
    "notifications.linkedActionsBody": "विवरण या अगली स्क्रीन यहीं से खोलें.",
    "notifications.markAllRead": "सभी पढ़ी हुई मार्क करें",
    "notifications.markRead": "पढ़ी हुई मार्क करें",
    "notifications.markedRead": "सूचना पढ़ी हुई मार्क हो गई.",
    "notifications.noDetails": "कोई विवरण उपलब्ध नहीं.",
    "notifications.openedFromPush": "पुश सूचना से खोला गया",
    "notifications.openingSuffix": " · खुल रहा है...",
    "notifications.openLinkedScreen": "जुड़ी स्क्रीन खोलें",
    "notifications.showFewer": "कम दिखाएं",
    "notifications.showFewerOlder": "पुरानी सूचनाएं कम दिखाएं",
    "notifications.showOlder": "पुरानी सूचनाएं दिखाएं",
    "notifications.showOlderCount": "{{count}} पुराने दिखाएं",
    "notifications.timeDays": "{{count}} दिन",
    "notifications.timeHours": "{{count}} घं",
    "notifications.timeMinutes": "{{count}} मि",
    "notifications.timeNow": "अभी",
    "notifications.totalMessages": "कुल",
    "notifications.totalMessagesBody": "आने के समय के हिसाब से समूहित.",
    "notifications.unread": "अपठित",
    "notifications.unreadBody": "इन्हें पहले पढ़ें.",
    "notifications.unreadCount": "{{count}} अपठित",
    "notifications.unreadRecent": "{{count}} अपठित · हाल का {{date}}",
    "platform.billing": "प्लेटफॉर्म बिलिंग",
    "platform.gymSubtitle": "{{tier}} {{cycle}} · {{amount}} · अगला {{next}} · {{referrals}} रेफरल",
    "platform.gyms": "जिम",
    "platform.loadingSubscriptionHealth": "सब्सक्रिप्शन स्वास्थ्य लोड हो रहा है...",
    "platform.mandateMeta": "मैंडेट {{status}} · {{count}} भुगतान",
    "platform.missing": "नहीं मिला",
    "platform.mobileVisibilityBody":
      "कीमत, ट्रायल, क्रेडिट, नोट्स और पॉलिसी बदलाव पूरे रिव्यू के लिए वेब कंसोल में खुलते हैं.",
    "platform.mobileVisibilityTitle": "SaaS सब्सक्रिप्शन मोबाइल पर दिखते हैं.",
    "platform.notScheduled": "शेड्यूल नहीं",
    "platform.openWebDashboard": "वेब डैशबोर्ड खोलें",
    "platform.operator": "प्लेटफॉर्म ऑपरेटर",
    "platform.paying": "भुगतान कर रहे",
    "platform.recentGyms": "हाल के जिम",
    "platform.referrals": "रेफरल",
    "platform.saasHealth": "SaaS स्वास्थ्य",
    "platform.signOut": "साइन आउट",
    "platform.subtitle": "{{name}} · SaaS स्वास्थ्य और मैंडेट स्थिति",
    "platform.team": "प्लेटफॉर्म टीम",
    "platform.trial": "ट्रायल",
    "platform.updating": "अपडेट हो रहा है",
    "auth.heroEyebrow": "फिटनेस ऑपरेटिंग सिस्टम",
    "auth.heroBody": "आपका जिम, आपकी मेंबरशिप, आपकी लय. शुरू करने के लिए साइन इन करें.",
    "auth.signIn": "साइन इन",
    "auth.verifyCode": "कोड वेरिफाई करें",
    "auth.identifierSubtitle": "अपना रजिस्टर्ड ईमेल या मोबाइल नंबर इस्तेमाल करें.",
    "auth.otpSubtitle": "अपने संदेश देखें.",
    "auth.memberPathBody": "मेंबरशिप, QR एंट्री, क्लास, शॉप ऑर्डर और चेकआउट.",
    "auth.memberPathTitle": "मेंबर",
    "auth.staffPathBody": "डेस्क पेमेंट, अप्रूवल, क्लास रोस्टर, क्लाइंट और ओनर टूल.",
    "auth.staffPathTitle": "ओनर और स्टाफ",
    "auth.trainerPathBody": "क्लाइंट प्लान, सेशन, क्लास, पेआउट और कोचिंग नोट्स.",
    "auth.trainerPathTitle": "ट्रेनर",
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
    "auth.legalTerms": "शर्तें",
    "auth.legalJoiner": "और",
    "auth.legalPrivacy": "प्राइवेसी पॉलिसी",
    "auth.openTerms": "Zook की शर्तें खोलें",
    "auth.openPrivacy": "Zook की प्राइवेसी पॉलिसी खोलें",
    "auth.resendCode": "कोड फिर भेजें",
    "auth.resendIn": "{{seconds}} सेकंड में फिर भेजें",
    "auth.changeSignIn": "साइन-इन बदलें",
    "auth.testCode": "टेस्ट कोड",
    "auth.enterIdentifier": "अपना ईमेल या मोबाइल नंबर डालें.",
    "auth.codeSent": "{{identifier}} पर कोड भेजा गया.",
    "auth.freshCodeSent": "{{identifier}} पर नया कोड भेजा गया.",
    "auth.signedIn": "साइन इन हो गया.",
    "auth.invalidEmail": "मान्य ईमेल या मोबाइल नंबर दर्ज करें.",
    "auth.invalidEmailOnly": "मान्य ईमेल पता दर्ज करें.",
    "auth.invalidMobile": "मान्य 10 अंकों का मोबाइल नंबर दर्ज करें.",
    "auth.sessionExpired": "आपका सेशन खत्म हो गया है. जारी रखने के लिए फिर से साइन इन करें.",
    "auth.sessionExpiredTitle": "सेशन खत्म हो गया",
    "auth.sessionExpiredBody": "जारी रखने के लिए फिर से साइन इन करें.",
    "auth.verifyToContinue": "जारी रखने के लिए अपनी पहचान वेरिफाई करें.",
    "auth.tooManyAttempts": "बहुत ज़्यादा कोशिशें. {{seconds}} सेकंड में फिर कोशिश करें.",
    "auth.qaShortcuts": "QA shortcuts",
    "assistant.attachSummary": "सारांश जोड़ें",
    "assistant.attachedClientData": "क्लाइंट डेटा जुड़ा है",
    "assistant.attachedProfile": "प्रोफाइल जुड़ी है",
    "assistant.clear": "साफ करें",
    "assistant.clearConversation": "बातचीत साफ करें",
    "assistant.clientData": "क्लाइंट डेटा",
    "assistant.contextActivePlans": "सक्रिय प्लान",
    "assistant.contextAllergies": "एलर्जी",
    "assistant.contextClient": "क्लाइंट",
    "assistant.contextDiet": "डाइट",
    "assistant.contextGoal": "लक्ष्य",
    "assistant.contextPlans": "प्लान",
    "assistant.contextWeight": "वजन",
    "assistant.copied": "कॉपी हुआ",
    "assistant.copyHint": "कॉपी करने के लिए देर तक दबाएं",
    "assistant.inputPlaceholder": "किसी भी भाषा में पूछें...",
    "assistant.memberEyebrow": "प्लान असिस्टेंट",
    "assistant.memberPromptFocus": "आज मुझे किस पर फोकस करना चाहिए?",
    "assistant.memberPromptFood": "ट्रेनिंग के बाद मुझे क्या खाना चाहिए?",
    "assistant.memberPromptWorkout": "मेरा वर्कआउट समझना आसान बनाएं.",
    "assistant.memberStarter":
      "किसी भी भाषा में पूछें. मैं असाइन किए प्लान, डाइट पसंद, रिकवरी और जिम रूटीन में मदद कर सकता हूं.",
    "assistant.memberSubtitle": "किसी भी भाषा में पूछें — जवाब आपकी प्रोफाइल से जुड़े होते हैं.",
    "assistant.memberTitle": "ट्रेनिंग पर बात करें",
    "assistant.myProfile": "मेरी प्रोफाइल",
    "assistant.notSavedToastBody": "नए मैसेज अगली बार वापस नहीं आ सकते.",
    "assistant.notSavedToastTitle": "असिस्टेंट सेव नहीं हुआ",
    "assistant.resetToastBody": "सेव किए मैसेज पढ़े नहीं जा सके.",
    "assistant.resetToastTitle": "असिस्टेंट रीसेट हुआ",
    "assistant.send": "भेजें",
    "assistant.thinking": "सोच रहा है...",
    "assistant.trainerEyebrow": "ट्रेनर असिस्टेंट",
    "assistant.trainerPromptPlan": "4-हफ्ते का हाइपरट्रॉफी प्लान ड्राफ्ट करें.",
    "assistant.trainerPromptSummary": "इस क्लाइंट की प्रगति का सार दें.",
    "assistant.trainerPromptSwaps": "सुरक्षित एक्सरसाइज बदलाव सुझाएं.",
    "assistant.trainerStarter":
      "क्लाइंट सार, वर्कआउट डेटा या सामान्य भाषा में सवाल भेजें. मैं प्लान, डाइट नोट्स और रिकवरी गाइड ड्राफ्ट करने में मदद कर सकता हूं.",
    "assistant.trainerSubtitle": "क्लाइंट सार जोड़ें, नोट्स लाएं, प्लान ड्राफ्ट करें.",
    "assistant.trainerTitle": "संदर्भ के साथ कोच करें",
    "assistant.unavailableBody": "ओनर और डेस्क ऑपरेशन वेब डैशबोर्ड में रहते हैं.",
    "assistant.unavailableTitle": "प्लान असिस्टेंट",
    "classRoster.attendanceHint":
      "Member को present या no-show mark करने के लिए check या cross tap करें.",
    "classRoster.bookedCount": "{{count}}/{{capacity}} बुक्ड",
    "classRoster.confirmed": "कन्फर्म",
    "classRoster.confirmedCount": "कन्फर्म ({{count}})",
    "classRoster.markedNoShowAccessibility": "{{name}} no-show mark है",
    "classRoster.markedPresentAccessibility": "{{name}} present mark है",
    "classRoster.markNoShowAccessibility": "{{name}} को no-show mark करें",
    "classRoster.markPresentAccessibility": "{{name}} को present mark करें",
    "classRoster.memberFallback": "मेंबर",
    "classRoster.noBookings": "अभी कोई बुकिंग नहीं",
    "classRoster.noBookingsBody": "इस क्लास को बुक करने वाले मेंबर यहां दिखेंगे.",
    "classRoster.subtitle": "इस क्लास में कौन आ रहा है",
    "classRoster.title": "क्लास रोस्टर",
    "classRoster.waitlist": "वेटलिस्ट",
    "classRoster.waitlistCount": "वेटलिस्ट ({{count}})",
    "classRoster.waitlistHint": "किसी के कैंसल करने पर वेटलिस्ट मेंबर अपने आप promote होते हैं.",
    "entryQr.branchAware": "शाखा से जुड़ा",
    "entryQr.branchAwareBody":
      "यह QR आपकी active branch से जुड़ा है. सिर्फ इस gym की valid membership वाले member check in कर सकते हैं.",
    "entryQr.loadingQr": "QR लोड हो रहा है...",
    "entryQr.manualCode": "मैनुअल check-in कोड",
    "entryQr.noQr": "QR नहीं मिला",
    "entryQr.print": "प्रिंट",
    "entryQr.regenerate": "नया बनाएं",
    "entryQr.refreshesIn": "{{seconds}}s में बदलेगा",
    "entryQr.refreshing": "बदला जा रहा है...",
    "entryQr.refreshNow": "अभी बदलें",
    "entryQr.rollingMode": "रोलिंग",
    "entryQr.secureToken": "सुरक्षित रोलिंग टोकन",
    "entryQr.secureTokenBody": "Code अपने आप बदलता है. Member QR scan करें या Zook में code डालें.",
    "entryQr.staticMode": "स्टैटिक",
    "entryQr.subtitle": "इसे एंट्री पर दिखाएं. सदस्य check-in के लिए इसे scan करते हैं.",
    "entryQr.title": "एंट्री QR",
    "onboarding.allInOne": "सब एक जगह",
    "onboarding.allInOneCopy": "मेंबरशिप, क्लास, पेमेंट और स्टोर पिकअप — सब एक जगह.",
    "onboarding.brand": "Zook",
    "onboarding.builtForGymDays": "जिम वाले दिनों के लिए बनाया गया",
    "onboarding.changeLanguageAnytime": "आप इसे सेटिंग्स में कभी भी बदल सकते हैं.",
    "onboarding.continue": "जारी रखें",
    "onboarding.continueToSignIn": "साइन इन पर जाएं",
    "onboarding.couldNotSaveLanguage": "भाषा सेव नहीं हो सकी",
    "onboarding.couldNotSavePreference": "पसंद सेव नहीं हो सकी",
    "onboarding.findGym": "अपना जिम खोजें",
    "onboarding.findGymCopy": "Pune, Mumbai, Bengaluru, Delhi और 50+ शहरों में अपने पास जिम खोजें.",
    "onboarding.pickLanguage": "अपनी भाषा चुनें",
    "onboarding.skip": "छोड़ें",
    "onboarding.skipIntro": "परिचय छोड़ें",
    "onboarding.skipOnboarding": "ऑनबोर्डिंग छोड़ें",
    "onboarding.splashBadge": "जिम ऑप्स, बिना भीड़भाड़.",
    "onboarding.splashSubtitle": "चेक-इन, मेंबरशिप, प्लान और फ्रंट डेस्क फ्लो एक जगह.",
    "onboarding.trainTrack": "ट्रेन करें और ट्रैक करें",
    "onboarding.trainTrackCopy":
      "सेकंडों में स्कैन करें, अपना प्लान फॉलो करें, और हर वर्कआउट जुड़ता देखें.",
    "qa.aarogyaGym": "Aarogya gym",
    "qa.adminApprovals": "Admin approvals",
    "qa.adminHome": "Admin home",
    "qa.adminMore": "Admin more",
    "qa.adminStock": "Admin stock",
    "qa.gyms": "Gyms",
    "qa.login": "Login",
    "qa.memberAssistant": "Member assistant",
    "qa.memberAttendanceDetail": "Member attendance detail",
    "qa.memberClasses": "Member classes",
    "qa.memberHistory": "Member history",
    "qa.memberHome": "Member home",
    "qa.memberMembership": "Member membership",
    "qa.memberNotifications": "Member notifications",
    "qa.memberPlan": "Member plan",
    "qa.memberProgress": "Member progress",
    "qa.memberScan": "Member scan",
    "qa.memberShop": "Member shop",
    "qa.memberTrackingEntry": "Member tracking entry",
    "qa.ownerApprovals": "Owner approvals",
    "qa.ownerBilling": "Owner billing",
    "qa.ownerHome": "Owner home",
    "qa.ownerMemberDetail": "Owner member detail",
    "qa.ownerMembers": "Owner members",
    "qa.ownerMore": "Owner more",
    "qa.ownerNotifications": "Owner notifications",
    "qa.ownerRevenue": "Owner revenue",
    "qa.ownerStock": "Owner stock",
    "qa.public": "Public",
    "qa.receptionHome": "Reception home",
    "qa.receptionMemberDetail": "Reception member detail",
    "qa.receptionMembers": "Reception members",
    "qa.receptionOrders": "Reception orders",
    "qa.receptionPayments": "Reception payments",
    "qa.receptionScan": "Reception scan",
    "qa.receptionVerification": "Reception verification",
    "qa.roles": "Roles",
    "qa.title": "QA shortcuts",
    "qa.trainerClientDetail": "Trainer client detail",
    "qa.trainerClientPlan": "Trainer client plan",
    "qa.trainerClientSessions": "Trainer client sessions",
    "qa.trainerClients": "Trainer clients",
    "qa.trainerHome": "Trainer home",
    "qa.trainerPayouts": "Trainer payouts",
    "qa.trainerPlans": "Trainer plans",
    "qa.valueProps": "Value props",
    "settings.profileTitle": "प्रोफाइल",
    "settings.profileSubtitle": "अकाउंट, नोटिफिकेशन और सपोर्ट",
    "settings.goBack": "वापस जाएं",
    "settings.account": "अकाउंट",
    "settings.accountSubtitle": "नाम, फोन, ईमेल और biometric unlock",
    "settings.addContact": "{{contact}} जोड़ें",
    "settings.addFewDetails": "थोड़ी जानकारी जोड़ें",
    "settings.activeGymPreferenceNote": "उपलब्ध होने पर बदलाव आपके सक्रिय जिम पर लागू होते हैं.",
    "settings.appearanceSubtitle": "थीम और default role",
    "settings.biometricUnlock": "Biometric unlock",
    "settings.signedIn": "साइन इन",
    "settings.contactVerification": "कॉन्टैक्ट वेरिफिकेशन",
    "settings.contactVerifiedUpdated": "{{contact}} वेरिफाई हो गया. आपका अकाउंट अपडेट हो गया.",
    "settings.couldNotSendOtp": "OTP नहीं भेजा जा सका.",
    "settings.couldNotSendReport": "रिपोर्ट नहीं भेजी जा सकी",
    "settings.couldNotVerifyOtp": "OTP वेरिफाई नहीं हो सका.",
    "settings.currentValue": "मौजूदा: {{value}}",
    "settings.enterCodeSentTo": "{{identifier}} पर भेजा गया कोड डालें.",
    "settings.enterContactOtp": "{{contact}} OTP डालें",
    "settings.enterEmail": "अपना ईमेल डालें.",
    "settings.enterMobile": "अपना मोबाइल नंबर डालें.",
    "settings.enterSixDigitOtp": "6 अंकों का OTP डालें.",
    "settings.useZookAs": "Zook इस्तेमाल करें",
    "settings.name": "नाम",
    "settings.email": "ईमेल",
    "settings.phone": "फोन",
    "settings.emailPlaceholder": "you@example.com",
    "settings.mobileNumber": "मोबाइल नंबर",
    "settings.noEmailLinked": "कोई ईमेल लिंक नहीं है.",
    "settings.noMobileLinked": "कोई मोबाइल नंबर लिंक नहीं है.",
    "settings.notSet": "सेट नहीं",
    "settings.otpFor": "{{identifier}} के लिए OTP",
    "settings.problemDetails": "समस्या का विवरण",
    "settings.problemDetailsPlaceholder": "मैं कोशिश कर रहा था...",
    "settings.reportProblem": "समस्या रिपोर्ट करें",
    "settings.reportProblemBody": "समस्या, आपकी उम्मीद और क्या हुआ, यह शामिल करें.",
    "settings.reportSent": "रिपोर्ट सपोर्ट को भेजी गई.",
    "settings.sendReport": "रिपोर्ट भेजें",
    "settings.signInAgainContact": "कॉन्टैक्ट विवरण अपडेट करने के लिए फिर से साइन इन करें.",
    "settings.supportContext": "{{role}} · {{gym}} · {{version}}",
    "settings.supportDetailsPrompt": "क्या गलत हुआ बताएं ताकि सपोर्ट आगे बात कर सके.",
    "settings.terms": "शर्तें",
    "settings.termsSubtitle": "सेवा की शर्तें देखें",
    "settings.updateContact": "{{contact}} अपडेट करें",
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
    "settings.notificationsSubtitle": "पुश श्रेणियां और रिमाइंडर",
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
    "settings.preferenceNotSaved": "प्राथमिकता सेव नहीं हुई.",
    "settings.language": "भाषा",
    "settings.languageSubtitle": "ऐप की भाषा चुनें",
    "settings.languageSystem": "सिस्टम",
    "settings.languageEnglish": "English",
    "settings.languageHindi": "हिंदी",
    "settings.privacyData": "प्राइवेसी और डेटा",
    "settings.privacySubtitle": "डेटा एक्सपोर्ट या डिलीट करें",
    "settings.privacyRequestBody":
      "अपने Zook डेटा की कॉपी मांगें या अकाउंट डिलीशन अनुरोध शुरू करें.",
    "settings.privacyWarning":
      "इन अनुरोधों को सेव किया जाता है और बदलाव से पहले रिव्यू किया जाता है.",
    "settings.requestAccountDeletion": "अकाउंट डिलीशन अनुरोध करें",
    "settings.requestDataExport": "डेटा एक्सपोर्ट अनुरोध करें",
    "settings.requestDeletion": "डिलीशन अनुरोध करें",
    "settings.deleteConfirmTitle": "अकाउंट डिलीशन अनुरोध करें?",
    "settings.deleteConfirmBody":
      "कोई भी अकाउंट डेटा हटाने से पहले Zook support इस अनुरोध को रिव्यू करेगा.",
    "settings.export": "एक्सपोर्ट",
    "settings.delete": "डिलीट",
    "settings.exportRequested": "एक्सपोर्ट अनुरोध भेजा गया. फ़ाइल उपलब्ध होने पर आपको ईमेल मिलेगा.",
    "settings.deletionRequested":
      "डिलीशन अनुरोध भेजा गया. इसे लागू करने से पहले रिव्यू किया जाएगा.",
    "settings.noExport": "अभी कोई एक्सपोर्ट अनुरोध नहीं",
    "settings.noDeletion": "अभी कोई डिलीशन अनुरोध नहीं",
    "settings.system": "सिस्टम",
    "settings.systemSubtitle": "मदद, पॉलिसी और ऐप जानकारी",
    "settings.supportSubtitle": "कॉन्टैक्ट, लीगल और ऐप version",
    "settings.helpCenter": "Help center",
    "settings.helpCenterSubtitle": "zookfit.in/help खोलें",
    "settings.privacyPolicy": "Privacy Policy",
    "settings.privacyPolicySubtitle": "Privacy policy देखें",
    "settings.theme": "थीम",
    "settings.verifyContactType": "{{contact}} वेरिफाई करें",
    "settings.version": "Version {{version}}",
    "settings.defaultRole": "Default role",
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
    "rewards.activity": "Activity",
    "rewards.earnCashPerGym": "हर जिम पर {{amount}} कमाएं",
    "rewards.earnDaysPerGym": "हर जिम पर {{count}} मुफ्त दिन पाएं",
    "rewards.freeDaysAdded":
      "Referred gym subscribe करने पर free Zook days आपकी subscription में अपने आप जुड़ जाते हैं.",
    "rewards.lifetime": "कुल",
    "rewards.minToWithdraw": "निकासी के लिए कम से कम {{amount}}",
    "rewards.noEarningsYet": "अभी कोई कमाई नहीं",
    "rewards.noEarningsYetBody":
      "अपना link share करें — referred gym subscribe करने पर आप earn करेंगे.",
    "rewards.readyToWithdraw": "निकासी के लिए तैयार",
    "rewards.request": "अनुरोध करें",
    "rewards.requesting": "अनुरोध भेजा जा रहा है...",
    "rewards.requestWithdrawal": "निकासी अनुरोध करें",
    "rewards.requestWithdrawalBody":
      "हम review करके आपको {{amount}} payout करेंगे. भेजे जाने पर confirmation मिलेगा.",
    "rewards.requestWithdrawalTitle": "निकासी अनुरोध करें?",
    "rewards.shareMessage": "Zook पर अपना gym चलाएं — मेरे link से sign up करें: {{url}}",
    "rewards.shareHint": "जिम मालिकों के साथ शेयर करें",
    "rewards.shareYourLink": "अपना लिंक शेयर करें",
    "rewards.status.clearing": "क्लियरिंग",
    "rewards.status.paid": "भुगतान हुआ",
    "rewards.status.pending": "पेंडिंग",
    "rewards.status.ready": "तैयार",
    "rewards.status.requested": "अनुरोध भेजा",
    "rewards.status.reversed": "रिवर्स",
    "rewards.subtitle": "नए जिम को Zook पर लाएं और रिवॉर्ड पाएं.",
    "rewards.title": "रेफर करें और कमाएं",
    "rewards.yourEarnings": "आपकी कमाई",
    "referral.opening": "रेफरल खुल रहा है...",
    "referral.card.copyCodeAccessibility": "रेफरल कोड {{code}} कॉपी करें",
    "referral.card.referFriend": "दोस्त को रेफर करें",
    "referral.card.rewardCount": "{{count}} रिवॉर्ड",
    "referral.card.rewardCount_plural": "{{count}} रिवॉर्ड",
    "referral.card.shareCode": "रेफरल कोड शेयर करें",
    "referral.card.unlimited": "असीमित",
    "referral.card.used": "{{used}}/{{max}} इस्तेमाल · {{rewards}}",
    "branch.switch": "ब्रांच बदलें",
    "branch.switchGym": "जिम बदलें",
    "branch.current": "मौजूदा ब्रांच",
    "branch.currentGym": "मौजूदा जिम",
    "branch.branchPrefix": "ब्रांच:",
    "branch.allBranches": "सभी ब्रांच",
    "branch.branches": "ब्रांच",
    "branch.enrolledGyms": "आपके मैनेज किए गए जिम",
    "branch.gymSubscriptionScope":
      "यहां वह gym चुनें जिसे आप चला रहे हैं. Billing owner account पर रहती है, और हर gym अपनी branches manage कर सकता है.",
    "branch.manageGym": "जिम मैनेज करें",
    "branch.openMap": "मैप खोलें",
    "branch.mapReady": "मैप तैयार",
    "branch.mapMissing": "मैप बाकी",
    "branch.selectorSubtitle": "इस ऐप सेशन के लिए सक्रिय जिम या ब्रांच चुनें.",
    "branch.useBranch": "चुनें",
    "branch.useGym": "चुनें",
    "shop.readyForPickup": "पिकअप के लिए तैयार",
    "shop.readyForPickupSubtitle": "यह कोड फ्रंट डेस्क पर दिखाएं.",
    "shop.addShort": "जोड़ें",
    "shop.addProductAccessibility": "{{name}} जोड़ें",
    "shop.availableAtGymDesk": "पेमेंट के बाद जिम डेस्क पर उपलब्ध",
    "shop.pickupCode": "पिकअप कोड",
    "shop.pickupCodeCopied": "पिकअप कोड कॉपी हुआ।",
    "shop.pickupCodeCopyFailed": "पिकअप कोड कॉपी नहीं हो सका।",
    "shop.pickupCodePending": "पिकअप कोड पेंडिंग",
    "shop.pending": "पेंडिंग",
    "shop.paid": "पेड",
    "shop.signedPickupQrCode": "साइन किया हुआ पिकअप QR कोड",
    "shop.branchLabel": "ब्रांच",
    "shop.browserReturnBody":
      "पेमेंट के बाद वापस आएं. Zook आपके ऑर्डर की स्थिति अपने-आप रीफ्रेश करेगा.",
    "shop.cartReset": "कार्ट रीसेट हुआ",
    "shop.cartResetBody": "आपका सेव कार्ट वापस नहीं आ सका.",
    "shop.categoryAll": "सभी",
    "shop.categoryCups": "शेकर",
    "shop.categoryShake": "शेक",
    "shop.categorySupplements": "सप्लीमेंट",
    "shop.categoryTowel": "टॉवल",
    "shop.categoryWater": "पानी",
    "shop.checkStatus": "स्थिति जांचें",
    "shop.checking": "जांच हो रही है...",
    "shop.checkoutConsequence":
      "पेमेंट के बाद Zook डेस्क वेरिफिकेशन के लिए पिकअप कोड बनाता है. कोड के बिना सामान न लें.",
    "shop.checkoutCreated": "चेकआउट बन गया.",
    "shop.deskPaymentOrderCreated": "ऑर्डर डेस्क को भेज दिया गया.",
    "shop.codeWithValue": "कोड: {{code}}",
    "shop.continuePayment": "पेमेंट जारी रखें",
    "shop.continueWithTotal": "{{amount}} के साथ जारी रखें",
    "shop.continueInBrowser": "ब्राउजर में जारी रखें",
    "shop.confirming": "कन्फर्म हो रहा है...",
    "shop.awaitingDeskPayment": "डेस्क पेमेंट बाकी",
    "shop.choosePaymentMethod": "पेमेंट तरीका चुनें",
    "shop.choosePaymentMethodSubtitle": "अभी ऑनलाइन पे करें या जिम डेस्क पर भुगतान करें.",
    "shop.copyPickupCodeAccessibility": "पिकअप कोड {{code}} कॉपी करें",
    "shop.couldNotCreateCheckout": "चेकआउट नहीं बन सका.",
    "shop.backToShop": "शॉप पर वापस",
    "shop.payment": "पेमेंट",
    "shop.paymentSubtitle": "पेमेंट के बाद पिकअप शुरू होगा.",
    "shop.paymentConfirmed": "पेमेंट कन्फर्म हो गया.",
    "shop.paymentCouldNotComplete": "पेमेंट पूरा नहीं हो सका.",
    "shop.paymentStillPending": "पेमेंट अभी बाकी है. थोड़ी देर में फिर कोशिश करें.",
    "shop.paymentPending": "पेमेंट बाकी",
    "shop.payAtDesk": "डेस्क पर भुगतान",
    "shop.payAtDeskBody": "फ्रंट डेस्क पर cash, UPI, card या bank transfer.",
    "shop.payAtDeskInstructions":
      "फ्रंट डेस्क से इस ऑर्डर का पेमेंट कलेक्ट करने को कहें. रिकॉर्ड होते ही Zook पिकअप कोड बनाएगा.",
    "shop.payAtDeskSubtitle": "पिकअप कोड पाने के लिए फ्रंट डेस्क पर भुगतान करें.",
    "shop.payOnline": "ऑनलाइन पे करें",
    "shop.payOnlineBody": "सुरक्षित ऑनलाइन चेकआउट खोलें और पिकअप कोड के लिए वापस आएं.",
    "shop.payAmountNow": "अभी {{amount}} पे करें",
    "shop.payNow": "अभी पे करें",
    "shop.payAtDeskInstead": "डेस्क पर भुगतान करें",
    "shop.otherPaymentOptions": "दूसरे पेमेंट विकल्प",
    "shop.paySecurely": "सुरक्षित भुगतान",
    "shop.confirmOrder": "ऑर्डर कन्फर्म करें",
    "shop.getPickupCode": "पिकअप कोड पाएं",
    "shop.makeDeskCode": "हम डेस्क के लिए कोड बनाएंगे",
    "shop.collectAtDesk": "डेस्क से लें",
    "shop.showPickupCode": "लेने के लिए कोड दिखाएं",
    "shop.showThisToCollect": "ऑर्डर लेने के लिए यह दिखाएं",
    "shop.orderTotal": "ऑर्डर कुल",
    "shop.pickupCheckout": "पिकअप चेकआउट",
    "shop.itemsLabel": "आइटम",
    "shop.itemCount": "{{count}} आइटम",
    "shop.itemsCount": "{{count}} आइटम",
    "shop.pickupLabel": "पिकअप",
    "shop.selectedGym": "चुना हुआ जिम",
    "shop.cart": "कार्ट",
    "shop.reviewOrder": "ऑर्डर देखें",
    "shop.reviewOrderSubtitle": "पेमेंट के बाद फ्रंट डेस्क से पिकअप करें.",
    "shop.back": "वापस",
    "shop.creating": "बन रहा है...",
    "shop.inStockCount": "{{count}} स्टॉक में",
    "shop.mockPaymentUnavailable": "बैकएंड बिल्ड में टेस्ट भुगतान पूरा करना उपलब्ध नहीं है.",
    "shop.onlyLeft": "सिर्फ {{count}} बचे हैं",
    "shop.orderHistory": "ऑर्डर हिस्ट्री",
    "shop.orderHistorySubtitle": "पिकअप और पेमेंट वाले ऑर्डर पहले दिखते हैं.",
    "shop.activeOrders": "सक्रिय ऑर्डर",
    "shop.activeOrdersShort": "ऑर्डर",
    "shop.activeOrdersBody": "पेमेंट या पिकअप आइटम बाकी हैं.",
    "shop.cartStatus": "कार्ट",
    "shop.cartStatusBody": "{{amount}} चेकआउट के लिए तैयार.",
    "shop.readyStock": "तैयार स्टॉक",
    "shop.readyStockShort": "स्टॉक",
    "shop.readyStockBody": "डेस्क पिकअप के लिए आइटम उपलब्ध.",
    "shop.orderBeingPrepared": "पेमेंट हो गया. डेस्क आपका ऑर्डर तैयार कर रहा है.",
    "shop.orderCancelled": "यह ऑर्डर कैंसल हो चुका है.",
    "shop.orderNeedsPayment": "पेमेंट बाकी है. जारी रखने के लिए ऑर्डर खोलें.",
    "shop.orderPickedUp": "डेस्क से पिकअप हो गया.",
    "shop.orderReady": "डेस्क पर पिकअप के लिए तैयार.",
    "shop.orderReadyWithCode": "कोड {{code}}",
    "shop.outOfStock": "स्टॉक खत्म",
    "shop.outShort": "खत्म",
    "shop.yourCartEmpty": "आपका कार्ट खाली है",
    "shop.subtotal": "सबटोटल",
    "shop.openMiniCart": "मिनी कार्ट खोलें",
    "shop.openCart": "कार्ट खोलें",
    "shop.deskPickup": "डेस्क पिकअप",
    "shop.activeGym": "सक्रिय जिम",
    "shop.recently": "हाल ही में",
    "shop.removeProductAccessibility": "{{name}} हटाएं",
    "shop.searchEssentials": "जरूरी सामान खोजें",
    "shop.availableNow": "अभी उपलब्ध",
    "shop.searchResults": "खोज परिणाम",
    "shop.title": "शॉप",
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
    "findGyms.availableGyms": "उपलब्ध जिम",
    "findGyms.allAreas": "सभी क्षेत्र",
    "findGyms.city": "शहर",
    "findGyms.coverPhoto": "{{name}} की कवर फोटो",
    "findGyms.discovery": "डिस्कवरी",
    "findGyms.gymNameOrUsername": "जिम का नाम या यूज़रनेम",
    "findGyms.noGyms": "कोई जिम नहीं",
    "findGyms.noGymsBody": "शहर को व्यापक करें या खोज साफ करें.",
    "findGyms.logo": "{{name}} का लोगो",
    "findGyms.loadError": "जिम लोड नहीं हुए",
    "findGyms.openGym": "{{name}} खोलें",
    "findGyms.referralApplied": "रेफरल कोड लागू हुआ",
    "findGyms.referralPrefix": "कोड",
    "findGyms.referralSuffix": "जुड़ा है. इसे इस्तेमाल करने के लिए कोई भी जिम खोलें.",
    "findGyms.resultCountMany": "{{count}} नतीजे",
    "findGyms.resultCountOne": "1 नतीजा",
    "findGyms.searching": "खोज हो रही है...",
    "findGyms.searchLabel": "जिम खोजें",
    "findGyms.title": "अपना जिम खोजें",
    "findGyms.view": "देखें",
    "findGyms.viewProfile": "प्रोफाइल देखें",
    "gymProfile.activeUntil": "{{date}} तक सक्रिय",
    "gymProfile.address": "पता",
    "gymProfile.alreadyActive": "पहले से सक्रिय",
    "gymProfile.apply": "लागू करें",
    "gymProfile.approvedDate": "{{date}} को मंजूर",
    "gymProfile.approvedForPayment": "पेमेंट के लिए मंजूर",
    "gymProfile.atAGlance": "एक नजर में",
    "gymProfile.choosePlan": "प्लान चुनें",
    "gymProfile.choosePlanToContinue": "जारी रखने के लिए प्लान चुनें.",
    "gymProfile.coaches": "कोच",
    "gymProfile.completeEarlierStep": "पहले वाला स्टेप पूरा करें",
    "gymProfile.couldNotLoad": "यह जिम लोड नहीं हो सका",
    "gymProfile.currentMembership": "मौजूदा मेंबरशिप",
    "gymProfile.dateRange": "{{start}} से {{end}}",
    "gymProfile.daysCount": "{{count}} दिन",
    "gymProfile.demoTagline": "स्ट्रेंथ, पीटी और रिकवरी एक ही जिम वर्कस्पेस में.",
    "gymProfile.distanceKm": "{{distance}} किमी दूर",
    "gymProfile.distanceMeters": "{{distance}} मीटर दूर",
    "gymProfile.distanceUnavailable": "दूरी उपलब्ध नहीं",
    "gymProfile.equipment": "उपकरण",
    "gymProfile.eyebrow": "जिम प्रोफाइल",
    "gymProfile.flexibleMembership": "लचीली मेंबरशिप",
    "gymProfile.getDirections": "रास्ता देखें",
    "gymProfile.gettingThere": "वहां पहुंचना",
    "gymProfile.howToJoin": "कैसे जुड़ें",
    "gymProfile.inside": "अंदर",
    "gymProfile.instant": "तुरंत",
    "gymProfile.inviteCode": "इनवाइट कोड",
    "gymProfile.inviteOnly": "सिर्फ इनवाइट",
    "gymProfile.inviteReferralRequired": "इनवाइट या रेफरल जरूरी",
    "gymProfile.inviteReferralRequiredBody":
      "इस जिम को रेफरल लिंक से खोलें या जारी रखने के लिए जिम टीम से कोड मांगें.",
    "gymProfile.joinFlow": "जुड़ने की प्रक्रिया",
    "gymProfile.joinModeApproval": "मंजूरी जरूरी",
    "gymProfile.joinModeInvite": "सिर्फ इनवाइट",
    "gymProfile.joinModeOpen": "कोई भी जुड़ सकता है",
    "gymProfile.joinPath": "जुड़ने का तरीका",
    "gymProfile.joinRequest": "जुड़ने का अनुरोध",
    "gymProfile.location": "लोकेशन",
    "gymProfile.membershipOptions": "मेंबरशिप विकल्प",
    "gymProfile.membershipProfile": "मेंबरशिप प्रोफाइल",
    "gymProfile.membershipRequestSubmitted": "मेंबरशिप अनुरोध भेजा गया.",
    "gymProfile.membershipRequestSubmittedBody":
      "मेंबरशिप अनुरोध भेजा गया. जिम टीम अब इसे अपने डैशबोर्ड से देख सकती है.",
    "gymProfile.membershipState": "मेंबरशिप स्थिति",
    "gymProfile.moveStraightToPayment": "आप सीधे भुगतान पर जा सकते हैं.",
    "gymProfile.noBioAdded": "बायो नहीं जोड़ा गया.",
    "gymProfile.noPublicPlans": "कोई सार्वजनिक प्लान नहीं",
    "gymProfile.noPublicTrainerProfiles": "कोई सार्वजनिक ट्रेनर प्रोफाइल नहीं",
    "gymProfile.noTrainerBioPublished": "ट्रेनर बायो प्रकाशित नहीं है.",
    "gymProfile.notFound": "जिम नहीं मिला",
    "gymProfile.notFoundBody": "यह लिंक समाप्त हो सकता है या जिम स्थान बदल चुका हो सकता है.",
    "gymProfile.openTrainerProfile": "{{name}} प्रोफाइल खोलें",
    "gymProfile.openingPayment": "भुगतान खुल रहा है...",
    "gymProfile.overview": "ओवरव्यू",
    "gymProfile.payAmountNow": "अभी {{amount}} भुगतान करें",
    "gymProfile.paymentStarted": "भुगतान शुरू हुआ. मेंबरशिप चालू करने के लिए इसे पूरा करें.",
    "gymProfile.pendingSince": "{{date}} से लंबित",
    "gymProfile.photoOf": "फोटो {{index}} / {{count}}",
    "gymProfile.planAvailableMany": "{{count}} प्लान उपलब्ध",
    "gymProfile.planAvailableOne": "1 प्लान उपलब्ध",
    "gymProfile.planDescriptionHybrid": "30 दिन, 12 विजिट और कोच प्लान एक्सेस.",
    "gymProfile.planDescriptionMonthly": "नियमित ट्रेनिंग के लिए 30 दिन का जिम एक्सेस.",
    "gymProfile.planDescriptionTrial": "नए मेंबरों के लिए एक सुपरवाइज्ड विजिट.",
    "gymProfile.planNameHybrid": "हाइब्रिड प्रो",
    "gymProfile.planNameMonthly": "मंथली एक्टिव",
    "gymProfile.planNameTrial": "ट्रायल पास",
    "gymProfile.quickCheckout": "तेज मेंबरशिप भुगतान",
    "gymProfile.quickCheckoutHint": "सुरक्षित चेकआउट. भुगतान कन्फर्म होते ही मेंबरशिप शुरू होगी.",
    "gymProfile.tapPlanToChange": "बदलने के लिए नीचे दूसरा प्लान चुनें.",
    "gymProfile.readyToJoin": "जुड़ने के लिए तैयार",
    "gymProfile.recommendedCheckoutAbove": "तेज चेकआउट ऊपर है",
    "gymProfile.referralApplied": "रेफरल लागू",
    "gymProfile.referralInviteRequired": "रेफरल या इनवाइट जरूरी है.",
    "gymProfile.referralPrice": "रेफरल कीमत",
    "gymProfile.requestMembershipFirst": "पहले मेंबरशिप अनुरोध करें",
    "gymProfile.requestMembershipFirstBody":
      "यह जिम भुगतान से पहले नए मेंबरों की समीक्षा करता है. अपना अनुरोध भेजें, फिर जिम टीम मंजूरी दे सकती है.",
    "gymProfile.reviewed": "समीक्षा हो चुकी",
    "gymProfile.securePayment": "सुरक्षित भुगतान",
    "gymProfile.selectPlanForCheckout": "चेकआउट के लिए चुनें",
    "gymProfile.selectedForCheckout": "चेकआउट के लिए चुना",
    "gymProfile.selectedPlanHint": "{{plan}} चुना है. नीचे प्लान की तुलना कर सकते हैं.",
    "gymProfile.sendMembershipRequest": "मेंबरशिप अनुरोध भेजें",
    "gymProfile.shareProfile": "जिम प्रोफाइल शेयर करें",
    "gymProfile.staffApprovalBeforePayment": "भुगतान से पहले स्टाफ मंजूरी होती है.",
    "gymProfile.standardMembershipPlan": "स्टैंडर्ड मेंबरशिप प्लान.",
    "gymProfile.stepActivatePlan": "प्लान चालू करें",
    "gymProfile.stepActivatePlanBody": "मंजूरी के बाद यहां लौटकर भुगतान पूरा करें.",
    "gymProfile.stepBrowsePublicPlans": "सार्वजनिक प्लान देखें",
    "gymProfile.stepBrowsePublicPlansBody":
      "स्टाफ का इंतजार किए बिना कीमत, एक्सेस, ट्रेनर सपोर्ट और प्लान प्रारूप की तुलना करें.",
    "gymProfile.stepPayInstantly": "तुरंत भुगतान करें",
    "gymProfile.stepPayInstantlyBody": "मोबाइल से सुरक्षित भुगतान करें.",
    "gymProfile.stepPaySecurely": "सुरक्षित भुगतान करें",
    "gymProfile.stepPaySecurelyBody": "इनवाइट नियम पूरे होने पर भुगतान से मेंबरशिप चालू होती है.",
    "gymProfile.stepReferralAttached": "रेफरल {{code}} जुड़ा है.",
    "gymProfile.stepReferralRequired": "जारी रखने से पहले रेफरल या इनवाइट जरूरी है.",
    "gymProfile.stepReviewPlans": "प्लान देखें",
    "gymProfile.stepReviewPlansBody": "कोड स्वीकार होने के बाद प्लान लिए जा सकते हैं.",
    "gymProfile.stepSecureReferral": "रेफरल पाएं",
    "gymProfile.stepSendRequest": "अनुरोध भेजें",
    "gymProfile.stepSendRequestBody":
      "अगर यह जिम नए मेंबरों की समीक्षा करता है, तो भुगतान से पहले अनुरोध भेजें.",
    "gymProfile.stepStaffReview": "स्टाफ समीक्षा",
    "gymProfile.stepStaffReviewBody": "जिम टीम आपका अनुरोध देखती है.",
    "gymProfile.stepStartTraining": "ट्रेनिंग शुरू करें",
    "gymProfile.stepStartTrainingBody":
      "जिम QR स्कैन करें, एंट्री कोड लें, और फ्लोर या डेस्क पर दिखाएं.",
    "gymProfile.submitting": "भेजा जा रहा है...",
    "gymProfile.trainerTeam": "ट्रेनर टीम",
    "gymProfile.unableStartPayment": "पेमेंट शुरू नहीं हो सका.",
    "gymProfile.unableSubmitMembershipRequest": "मेंबरशिप अनुरोध नहीं भेजा जा सका.",
    "gymProfile.updatingMembershipStatus": "मेंबरशिप स्थिति अपडेट हो रही है...",
    "gymProfile.validityDays": "{{count}} वैधता दिन",
    "gymProfile.visitCountMany": "{{count}} विजिट",
    "gymProfile.visitCountOne": "1 विजिट",
    "gymProfile.visitsRemaining": "{{count}} विजिट बाकी",
    "gymProfile.whatsInside": "अंदर क्या है",
    "gymReviews.beFirst": "रिव्यू छोड़ने वाले पहले मेंबर बनें.",
    "gymReviews.cancel": "रद्द करें",
    "gymReviews.edit": "संपादित करें",
    "gymReviews.editReview": "अपना रिव्यू संपादित करें",
    "gymReviews.empty": "अभी कोई रिव्यू नहीं",
    "gymReviews.membersSay": "मेंबर क्या कहते हैं",
    "gymReviews.onlyMembers": "सिर्फ मेंबर इस जिम को रिव्यू कर सकते हैं.",
    "gymReviews.postReview": "रिव्यू पोस्ट करें",
    "gymReviews.posting": "पोस्ट हो रहा है...",
    "gymReviews.reviews": "रिव्यू",
    "gymReviews.reviewsCount": "{{count}} रिव्यू",
    "gymReviews.sharePlaceholder": "इस जिम के बारे में आपको क्या पसंद है...",
    "gymReviews.starsAccessibility": "{{count}} स्टार",
    "gymReviews.update": "अपडेट करें",
    "gymReviews.write": "लिखें",
    "gymReviews.writeReview": "रिव्यू लिखें",
    "gallery.closePhotoViewer": "फोटो व्यूअर बंद करें",
    "empty.loading": "लोड हो रहा है",
    "empty.loadingBody": "आपके जिम की जानकारी लाई जा रही है.",
    "tracking.bodyTimeline": "फोटो टाइमलाइन",
    "tracking.bodyTimelineSubtitle": "{{count}} बॉडी कंपोजिशन एंट्री",
    "tracking.addExercise": "एक्सरसाइज जोड़ें",
    "tracking.armsCm": "बांहें सेमी",
    "tracking.body": "शरीर",
    "tracking.bodyFatPercent": "बॉडी फैट %",
    "tracking.bodyMeasurements": "शरीर के माप",
    "tracking.bodyMeasurementsSaved": "शरीर के माप सेव हो गए.",
    "tracking.bodyProgress": "शरीर की प्रगति",
    "tracking.moreMeasurements": "और माप",
    "tracking.hideMeasurements": "माप छिपाएं",
    "tracking.calfCm": "पिंडली सेमी",
    "tracking.calvesCm": "पिंडलियां सेमी",
    "tracking.chestCm": "छाती सेमी",
    "tracking.couldNotSaveMeasurements": "माप सेव नहीं हो सके",
    "tracking.couldNotSaveWorkout": "वर्कआउट सेव नहीं हो सका",
    "tracking.durationMinutes": "अवधि (मिनट)",
    "tracking.exercise": "एक्सरसाइज",
    "tracking.exerciseName": "एक्सरसाइज का नाम",
    "tracking.exerciseNamePlaceholder": "Push press",
    "tracking.addExerciseToSave": "वर्कआउट सेव करने के लिए एक एक्सरसाइज नाम जोड़ें.",
    "tracking.forearmsCm": "फोरआर्म सेमी",
    "tracking.hipsCm": "कूल्हे सेमी",
    "tracking.historyTitle": "प्रगति इतिहास",
    "tracking.loggedWorkout": "लॉग किया गया वर्कआउट",
    "tracking.muscleMassKg": "मांसपेशी वजन किलो",
    "tracking.neckCm": "गर्दन सेमी",
    "tracking.noBodyMeasurements": "शरीर के माप नहीं हैं",
    "tracking.noBodyMeasurementsBody": "समय के साथ बदलाव देखने के लिए माप लॉग करें.",
    "tracking.noWorkoutsYet": "अभी कोई वर्कआउट नहीं",
    "tracking.noWorkoutsYetBody": "आपके लॉग किए गए वर्कआउट यहां दिखेंगे.",
    "tracking.notes": "नोट्स",
    "tracking.notesPlaceholder":
      "प्रोग्रेस फोटो में सामने, साइड और पीछे की तस्वीरें जोड़ी जा सकती हैं.",
    "tracking.removeExercise": "एक्सरसाइज हटाएं",
    "tracking.reps": "रेप्स",
    "tracking.restingHeartRate": "आराम की हृदय गति",
    "tracking.saveMeasurements": "माप सेव करें",
    "tracking.saveWorkout": "वर्कआउट सेव करें",
    "tracking.session": "सेशन",
    "tracking.sets": "सेट्स",
    "tracking.shouldersCm": "कंधे सेमी",
    "tracking.strength": "स्ट्रेंथ",
    "tracking.thighsCm": "जांघें सेमी",
    "tracking.visceralFatRating": "विसरल फैट रेटिंग",
    "tracking.waist": "कमर",
    "tracking.waistCm": "कमर सेमी",
    "tracking.weightKg": "वजन किलो",
    "tracking.activeTime": "सक्रिय समय",
    "tracking.activeHabits": "सक्रिय आदतें",
    "tracking.addOne": "एक जोड़ें",
    "tracking.loggedSessions": "लॉग सेशन",
    "tracking.noSessions": "कोई सेशन नहीं",
    "tracking.workoutTime": "वर्कआउट समय",
    "tracking.addMeasurementToSave": "सेव करने के लिए कम से कम एक माप जोड़ें.",
    "tracking.workout": "वर्कआउट",
    "tracking.workoutSaved": "वर्कआउट सेव हो गया.",
    "tracking.workoutSet": "वर्कआउट सेट",
    "tracking.workoutTitle": "वर्कआउट शीर्षक",
    "tracking.workoutTitlePlaceholder": "जैसे Push day",
    "tracking.mutation.habitAdded": "Habit जोड़ दी गई.",
    "tracking.mutation.habitAddFailed": "Habit जोड़ी नहीं जा सकी.",
    "tracking.mutation.habitUpdateFailed": "Habit update नहीं हो सकी.",
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
    "member.attendance.activeMembership": "सक्रिय मेंबरशिप",
    "member.attendance.approved": "स्वीकृत",
    "member.attendance.assignedBranch": "असाइन ब्रांच",
    "member.attendance.backToHome": "होम पर वापस",
    "member.attendance.branch": "ब्रांच",
    "member.attendance.checkIn": "चेक-इन",
    "member.attendance.checkOut": "चेक-आउट",
    "member.attendance.checkedIn": "चेक-इन हुआ",
    "member.attendance.checkedOut": "चेक-आउट हुआ",
    "member.attendance.checkedOutAutomatically": "अपने आप चेक-आउट हुआ",
    "member.attendance.couldNotCheckOut": "चेक-आउट नहीं हो सका",
    "member.attendance.copyCodeFailed": "कोड कॉपी नहीं हो सका.",
    "member.attendance.copyEntryCodeAccessibility": "एंट्री कोड {{code}} कॉपी करें",
    "member.attendance.deskCanHelp": "डेस्क इस चेक-इन को पूरा करने में मदद कर सकता है.",
    "member.attendance.deskConfirmationNeeded": "डेस्क पुष्टि चाहिए",
    "member.attendance.deskHelpNeeded": "डेस्क मदद चाहिए",
    "member.attendance.dismissDetails": "अटेंडेंस विवरण बंद करें",
    "member.attendance.duration": "अवधि",
    "member.attendance.entryApproved": "आपके जिम के लिए एंट्री स्वीकृत है",
    "member.attendance.entryCode": "एंट्री कोड",
    "member.attendance.entryCodeCopied": "एंट्री कोड कॉपी हुआ.",
    "member.attendance.entryCodeUnavailable":
      "एंट्री कोड उपलब्ध नहीं - रिसेप्शन से मैन्युअल चेक-इन करने को कहें.",
    "member.attendance.gymTimeRecorded": "आपका जिम समय दर्ज हो गया.",
    "member.attendance.sessionStopped": "सेशन रुक गया",
    "member.attendance.inProgress": "चल रहा है",
    "member.attendance.mainBranch": "मुख्य ब्रांच",
    "member.attendance.membershipActive": "मेंबरशिप सक्रिय है",
    "member.attendance.nextUp": "अगला कदम",
    "member.attendance.notApproved": "चेक-इन approve नहीं हुआ",
    "member.attendance.notFound": "यह record आपकी history में नहीं मिला",
    "member.attendance.openAssignedPlanAccessibility": "असाइन किया गया प्लान खोलें",
    "member.attendance.openAssignedPlanBody": "अपना मौजूदा असाइन किया गया प्लान खोलें.",
    "member.attendance.openPlan": "प्लान खोलें",
    "member.attendance.pendingApproval": "मंज़ूरी बाकी",
    "member.attendance.pendingBody":
      "आपका check-in receive हो गया है. यह code front desk पर दिखाएं.",
    "member.attendance.plan": "प्लान",
    "member.attendance.profilePhotoRecommended": "प्रोफाइल फोटो सुझाई गई",
    "member.attendance.refreshStatus": "स्थिति रीफ्रेश करें",
    "member.attendance.reviewAtDesk": "फ्रंट डेस्क से इस चेक-इन को रिव्यू करने को कहें.",
    "member.attendance.showToDesk": "पूछे जाने पर इसे फ्रंट डेस्क को दिखाएं.",
    "member.attendance.status": "स्टेटस",
    "member.attendance.title": "अटेंडेंस",
    "member.attendance.updating": "अपडेट हो रहा है...",
    "member.attendance.waitingDeskApproval": "डेस्क मंज़ूरी का इंतज़ार",
    "member.attendance.whyConfirmation": "Confirmation क्यों?",
    "member.attendance.whyConfirmationBody":
      "आपका gym कुछ check-ins को approved mark करने से पहले desk confirmation मांगता है.",
    "member.coaching.active": "सक्रिय",
    "member.coaching.browsePtPackages": "PT पैकेज देखें",
    "member.coaching.currentTab": "कोचिंग",
    "member.coaching.ends": "{{date}} खत्म",
    "member.coaching.flexibleSessions": "Flexible sessions",
    "member.coaching.noActiveCoaching": "कोई सक्रिय कोचिंग नहीं",
    "member.coaching.noActiveCoachingBody":
      "तैयार होने पर पैकेज देखें. ट्रेनर request confirm करेगा, फिर payment एक step में होगा.",
    "member.coaching.noPackagesAvailable": "कोई पैकेज उपलब्ध नहीं",
    "member.coaching.noPackagesAvailableBody":
      "बाद में देखें — ट्रेनरों ने अभी PT पैकेज प्रकाशित नहीं किए हैं.",
    "member.coaching.packagesTab": "पैकेज",
    "member.coaching.payAfterApproval": "Trainer approval के बाद payment",
    "member.coaching.noSessionsYet": "अभी कोई सेशन नहीं",
    "member.coaching.noSessionsYetBody": "आपके लॉग किए हुए सेशन यहां दिखेंगे.",
    "member.coaching.pending": "पेंडिंग",
    "member.coaching.requestPackage": "Request",
    "member.coaching.recentSessions": "हाल के सेशन",
    "member.coaching.requesting": "Request भेजी जा रही है...",
    "member.coaching.requestSent": "Request भेजी गई — ट्रेनर पुष्टि करेगा",
    "member.coaching.requestThisPackage": "यह पैकेज request करें",
    "member.coaching.sessionsCount": "{{count}} सेशन",
    "member.coaching.sessionsLeft": "{{remaining}} में से {{total}} सेशन बाकी",
    "member.coaching.subtitle": "अपने कोच के साथ पर्सनल ट्रेनिंग.",
    "member.coaching.title": "आपकी कोचिंग",
    "member.coaching.trainerFallback": "ट्रेनर",
    "member.coaching.trainingSession": "ट्रेनिंग सेशन",
    "member.coaching.viewDietPlan": "मेरा डाइट प्लान देखें",
    "member.coaching.yourCoach": "आपके कोच",
    "member.coaching.yourTrainer": "आपके ट्रेनर",
    "member.classDetail.bookClass": "क्लास बुक करें",
    "member.classDetail.booked": "बुक हो चुकी",
    "member.classDetail.bookedHint": "आपकी बुकिंग हो गई है. प्लान बदलें तो यहीं से रद्द करें.",
    "member.classDetail.bookWithPrice": "बुक करें · {{price}}",
    "member.classDetail.cancelBooking": "बुकिंग रद्द करें",
    "member.classDetail.cancelling": "रद्द हो रहा है...",
    "member.classDetail.classDetails": "क्लास विवरण",
    "member.classDetail.classFallback": "क्लास",
    "member.classDetail.coachName": "कोच {{name}}",
    "member.classDetail.continuePayment": "भुगतान जारी रखें",
    "member.classDetail.full": "भरी हुई",
    "member.classDetail.fullHint":
      "यह क्लास भर चुकी है. वेटलिस्ट में जुड़ें, जगह खुली तो आपकी स्थिति अपडेट होगी.",
    "member.classDetail.freeBookingHint":
      "अभी अपनी जगह पक्की करें. प्लान बदलें तो इसी स्क्रीन से रद्द करें.",
    "member.classDetail.joinWaitlist": "वेटलिस्ट में जुड़ें",
    "member.classDetail.left": "{{count}} बाकी",
    "member.classDetail.nextStep": "अगला कदम",
    "member.classDetail.notFound": "क्लास नहीं मिली",
    "member.classDetail.paidBookingHint":
      "अपनी जगह पक्की करने के लिए अभी भुगतान करें. भुगतान बाकी होने पर बुकिंग अधूरी रहेगी.",
    "member.classDetail.payAmountNow": "अभी {{amount}} भुगतान करें",
    "member.classDetail.paymentDue": "भुगतान बाकी",
    "member.classDetail.paymentDueHint":
      "क्लास भरने से पहले अपनी जगह पक्की करने के लिए भुगतान पूरा करें.",
    "member.classDetail.spots": "{{count}} जगह बाकी",
    "member.classDetail.spotsBooked": "जगह बुक",
    "member.classDetail.waitlisted": "वेटलिस्ट पर",
    "member.classDetail.waitlistedHint": "आप वेटलिस्ट पर हैं. जगह नहीं चाहिए तो यहीं से रद्द करें.",
    "member.classes.bookClass": "क्लास बुक करें",
    "member.classes.bookWithPrice": "बुक करें · {{price}}",
    "member.classes.booked": "बुक हो चुकी",
    "member.classes.branchSchedule": "{{branch}} शेड्यूल",
    "member.classes.cancelling": "रद्द हो रहा है...",
    "member.classes.coachName": "कोच {{name}}",
    "member.classes.continuePayment": "भुगतान जारी रखें",
    "member.classes.couldNotLoad": "क्लासेस लोड नहीं हो सकीं.",
    "member.classes.filterAll": "सभी {{count}}",
    "member.classes.filterBooked": "बुक्ड {{count}}",
    "member.classes.filterOpen": "ओपन {{count}}",
    "member.classes.free": "मुफ्त",
    "member.classes.full": "भरी हुई",
    "member.classes.joinWaitlist": "वेटलिस्ट में जुड़ें",
    "member.classes.left": "{{count}} बाकी",
    "member.classes.noBookedClasses": "अभी कोई बुकिंग नहीं",
    "member.classes.noBookedClassesBody": "तैयार हों तो ओपन टैब से क्लास बुक करें.",
    "member.classes.noClasses": "कोई क्लास शेड्यूल नहीं",
    "member.classes.noClassesBody": "जल्द फिर देखें - हर हफ्ते नए ग्रुप सेशन जोड़े जाते हैं.",
    "member.classes.noOpenClasses": "कोई ओपन क्लास नहीं",
    "member.classes.noOpenClassesBody": "अभी आने वाली क्लासेस बुक या वेटलिस्टेड हैं.",
    "member.classes.onWaitlist": "वेटलिस्ट पर",
    "member.classes.opening": "खुल रहा है...",
    "member.classes.payAmountNow": "अभी {{amount}} भुगतान करें",
    "member.classes.paymentDue": "भुगतान बाकी",
    "member.classes.spots": "{{count}} जगह",
    "member.classes.subtitle": "आने वाले ग्रुप सेशन में अपनी जगह पक्की करें.",
    "member.classes.title": "क्लासेस",
    "member.classes.waitlisted": "वेटलिस्ट पर",
    "member.classes.yourBookings": "आपकी बुकिंग",
    "member.mutation.bookingCancelled": "बुकिंग रद्द हो गई.",
    "member.mutation.bookingCancelFailed": "आपकी बुकिंग रद्द नहीं हो सकी.",
    "member.mutation.classBooked": "क्लास बुक हो गई.",
    "member.mutation.classBookingFailed": "क्लास बुकिंग पूरी नहीं हो सकी.",
    "member.mutation.classCheckoutStarted": "क्लास चेकआउट शुरू हुआ.",
    "member.mutation.membershipCancelFailed": "मेंबरशिप कैंसल नहीं हो सकी.",
    "member.mutation.ptRequestFailed": "आपका PT अनुरोध भेजा नहीं जा सका.",
    "member.mutation.signInBookClass": "क्लास बुक करने के लिए फिर से साइन इन करें.",
    "member.mutation.signInManageBooking": "बुकिंग प्रबंधित करने के लिए फिर से साइन इन करें.",
    "member.mutation.signInRequestPt": "पर्सनल ट्रेनिंग अनुरोध के लिए फिर से साइन इन करें.",
    "member.mutation.waitlistAdded":
      "वेटलिस्ट में जोड़ दिया गया. जगह खुलने पर भुगतान के लिए बताया जाएगा.",
    "member.you.accountCenter": "Zook खाता केंद्र",
    "member.you.activeMembership": "सक्रिय मेंबरशिप",
    "member.you.appearance": "दिखावट",
    "member.you.backToOwnerMode": "ओनर मोड पर स्विच करें",
    "member.you.browsePlans": "प्लान",
    "member.you.findMembershipPlan": "ट्रेनिंग शुरू करने के लिए प्लान चुनें.",
    "member.you.gymShop": "जिम शॉप",
    "member.you.assistant": "असिस्टेंट",
    "member.you.editProfile": "बदलें",
    "member.you.gymProfile": "जिम प्रोफाइल",
    "member.you.helpSupport": "मदद और सपोर्ट",
    "member.you.memberFallback": "मेंबर",
    "member.you.membership": "मेंबरशिप",
    "member.you.membershipNeedsAttention": "मेंबरशिप पर ध्यान दें",
    "member.you.noGymSelected": "कोई जिम चयनित नहीं",
    "member.you.notifications": "नोटिफिकेशन",
    "member.you.noActiveMembership": "कोई सक्रिय मेंबरशिप नहीं",
    "member.you.privacy": "प्राइवेसी",
    "member.you.quickActions": "त्वरित एक्शन",
    "member.you.referrals": "रेफरल",
    "member.you.switchGym": "जिम बदलें",
    "member.you.switchToRole": "{{role}} पर स्विच करें",
    "member.you.theme.dark": "डार्क",
    "member.you.theme.light": "लाइट",
    "member.you.theme.system": "सिस्टम",
    "member.you.trackingHistory": "ट्रैकिंग हिस्ट्री",
    "member.you.unreadCount": "{{count}} अपठित",
    "member.you.validUntil": "{{date}} तक मान्य",
    "member.you.viewMembership": "देखें",
    "member.you.visitsLeft": "{{count}} विजिट बाकी",
    "member.home.accessActive": "एक्सेस सक्रिय है",
    "member.home.active": "सक्रिय",
    "member.home.activeCheckIn": "सक्रिय चेक-इन",
    "member.home.activeCheckInHint": "चेक आउट करने के लिए ब्रांच QR फिर स्कैन करें, या यहां रोकें.",
    "member.home.browsePlansToStart": "यहां ट्रेनिंग शुरू करने के लिए प्लान देखें",
    "member.home.bookClass": "क्लास बुक करें",
    "member.home.classBooked": "बुक्ड",
    "member.home.classFull": "फुल",
    "member.home.classOpen": "ओपन",
    "member.home.classSpotsLeft": "{{count}} बाकी",
    "member.home.classWaitlisted": "वेटलिस्टेड",
    "member.home.classesTab": "क्लासेस",
    "member.home.coachName": "कोच {{name}}",
    "member.home.coachingTab": "कोचिंग",
    "member.home.completeProfile": "अपनी प्रोफाइल पूरी करें",
    "member.home.completeProfileBody":
      "अपनी जानकारी जोड़ें ताकि स्टाफ और ट्रेनर तेजी से मदद कर सकें.",
    "member.home.currentBranch": "मौजूदा ब्रांच",
    "member.home.daysLeft": "{{count}} दिन बाकी",
    "member.home.dayStreak": "{{count}} दिन की स्ट्रीक",
    "member.home.dismissBanner": "{{title}} हटाएं",
    "member.home.estimatedMinutes": "~{{minutes}} मिनट",
    "member.home.exerciseCount": "{{count}} एक्सरसाइज",
    "member.home.exerciseCountOne": "1 एक्सरसाइज",
    "member.home.exerciseCountOther": "{{count}} एक्सरसाइज",
    "member.home.expiredBody": "चेक-इन और प्लान एक्सेस जारी रखने के लिए मेंबरशिप रिन्यू करें.",
    "member.home.expiredTitle": "आपकी मेंबरशिप खत्म हो गई",
    "member.home.findYourGym": "अपना जिम ढूंढें",
    "member.home.finishLoggingWork": "अपना वर्कआउट लॉग पूरा करें.",
    "member.home.firstRunBody": "आपका जिम जोड़ने के बाद मेंबरशिप, वर्कआउट और चेक-इन यहां दिखेंगे.",
    "member.home.firstRunStepChoosePlan": "प्लान चुनें या अनुरोध भेजें",
    "member.home.firstRunStepFindGym": "अपनी जिम प्रोफाइल खोलें",
    "member.home.firstRunStepStartTraining": "चेक-इन करें और ट्रेनिंग शुरू करें",
    "member.home.firstRunTitle": "Zook में स्वागत है",
    "member.home.getMembership": "मेंबरशिप लें",
    "member.home.greeting": "नमस्ते, {{name}}",
    "member.home.gymFallback": "जिम",
    "member.home.habits": "आदतें",
    "member.home.inviteFriend": "दोस्त को बुलाएं",
    "member.home.inviteFriendBody":
      "Zook किसी ऐसे व्यक्ति से शेयर करें जिसे आपके साथ ट्रेन करना चाहिए.",
    "member.home.joinGym": "जिम जॉइन करें",
    "member.home.joinGymBody":
      "मेंबरशिप, प्लान, चेक-इन और ट्रेनर अपडेट शुरू करने के लिए अपना जिम ढूंढें.",
    "member.home.membershipDaysLeft": "{{count}} मेंबरशिप दिन बाकी.",
    "member.home.membershipEndsToday": "मेंबरशिप आज खत्म होती है",
    "member.home.membershipPendingBody":
      "आपका भुगतान {{gym}} से जुड़ा है. चेक-इन और प्लान शुरू होने से पहले फ्रंट डेस्क को मेंबरशिप सक्रिय करनी होगी.",
    "member.home.membershipPendingTitle": "मेंबरशिप सक्रिय होना बाकी है",
    "member.home.membershipStatusActive": "मेंबरशिप स्थिति सक्रिय है.",
    "member.home.membershipAccess": "मेंबरशिप एक्सेस",
    "member.home.membershipAccessibility": "{{status}}. {{detail}}. {{gym}}.",
    "member.home.membershipActive": "मेंबरशिप सक्रिय",
    "member.home.noActiveMembership": "कोई सक्रिय मेंबरशिप नहीं",
    "member.home.noNextWorkout": "बढ़िया काम. अगला वर्कआउट शेड्यूल नहीं है.",
    "member.home.noPlanAssigned": "कोई प्लान असाइन नहीं",
    "member.home.noPlanBody":
      "आप {{gym}} में सक्रिय हैं. वर्कआउट प्लान के लिए अपने ट्रेनर से पूछें.",
    "member.home.open": "खोलें",
    "member.home.openMembership": "मेंबरशिप खोलें",
    "member.home.openPlan": "प्लान खोलें",
    "member.home.openProgress": "प्रोग्रेस खोलें",
    "member.home.openYourCoaching": "अपनी कोचिंग खोलें",
    "member.home.personalTraining": "पर्सनल ट्रेनिंग",
    "member.home.pickupAvailable": "पिकअप उपलब्ध",
    "member.home.pickupCodeBody": "डेस्क पर पिकअप कोड {{code}} दिखाएं.",
    "member.home.referral": "रेफरल",
    "member.home.renew": "रिन्यू करें",
    "member.home.renewMembership": "मेंबरशिप रिन्यू करें",
    "member.home.renewNowBody": "चेक-इन और प्लान एक्सेस जारी रखने के लिए अभी रिन्यू करें.",
    "member.home.renewalNeeded": "रिन्यूअल जरूरी है",
    "member.home.restDay": "आराम का दिन",
    "member.home.restDayBody":
      "{{plan}} में आज वर्कआउट शेड्यूल नहीं है. अच्छी रिकवरी करें और रूटीन बनाए रखें.",
    "member.home.resume": "जारी रखें",
    "member.home.scanIntoGym": "जिम में स्कैन करें",
    "member.home.seeAll": "सब देखें",
    "member.home.seeAllClasses": "सभी क्लास देखें",
    "member.home.upcomingClasses": "आने वाली क्लासेस",
    "member.home.sessionsLeftShort": "{{count}} बाकी",
    "member.home.startWorkout": "वर्कआउट शुरू करें",
    "member.home.stopSession": "सेशन रोकें",
    "member.home.stoppingSession": "रुक रहा है...",
    "member.home.todaysWorkout": "आज का वर्कआउट",
    "member.home.tomorrowPlan": "कल: {{name}}.",
    "member.home.update": "अपडेट",
    "member.home.viewMembership": "मेंबरशिप देखें",
    "member.home.viewPlan": "प्लान देखें",
    "member.home.visits": "विजिट",
    "member.home.visitsLeft": "{{count}} विजिट बाकी",
    "member.home.weekTab": "हफ्ता",
    "member.home.workoutInProgress": "वर्कआउट चल रहा है",
    "member.home.workoutLogged": "वर्कआउट लॉग हुआ",
    "member.home.workouts": "वर्कआउट",
    "member.home.yourCoaching": "आपकी कोचिंग",
    "member.home.yourTrainer": "आपके ट्रेनर",
    "member.membership.active": "सक्रिय",
    "member.membership.activePlan": "सक्रिय प्लान",
    "member.membership.autopay": "ऑटो-पे",
    "member.membership.autopayActive": "ऑटो-पे चालू है.",
    "member.membership.autopayCancelled": "ऑटो-पे बंद हो गया.",
    "member.membership.autopayEnabledTitle": "ऑटो-पे तैयार है",
    "member.membership.autopayPromptBody": "एक बार सेट करें. कभी भी बंद करें.",
    "member.membership.autopayPromptTitle": "एक टैप में ऑटो-रिन्यू",
    "member.membership.autopayRenewalChoiceBody": "वैकल्पिक. इस भुगतान के बाद सेट करें ताकि अगला रिन्यूअल अपने-आप हो.",
    "member.membership.autopayRenewalChoiceTitle": "पेमेंट के बाद: ऑटो-पे",
    "member.membership.autopaySetupAction": "चालू करें",
    "member.membership.authorizeAutopay": "यह प्लान अपने-आप रिन्यू होगा.",
    "member.membership.browseGymsBody": "शुरू करने के लिए जिम देखें और मेंबरशिप खरीदें.",
    "member.membership.browserReturnBody":
      "भुगतान के बाद वापस आएं. वापस आने पर Zook आपकी मेंबरशिप अपडेट करेगा.",
    "member.membership.cancelConfirmBody":
      "मौजूदा अवधि खत्म होने तक एक्सेस रहेगा, लेकिन रिन्यूअल नहीं होगा और बाद में फिर शुरू नहीं किया जा सकेगा. इसे वापस नहीं किया जा सकता.",
    "member.membership.cancelConfirmTitle": "मेंबरशिप रद्द करें?",
    "member.membership.cancelMembership": "मेंबरशिप रद्द करें",
    "member.membership.cancelAutopay": "ऑटो-पे बंद करें",
    "member.membership.cancelled": "मेंबरशिप रद्द हो गई.",
    "member.membership.browserReturnHint":
      "ब्राउजर बंद हो चुका है तो भुगतान पुष्टि अपडेट करने के लिए स्टेटस जांचें.",
    "member.membership.checkingPaymentStatus": "भुगतान स्टेटस जांचा जा रहा है...",
    "member.membership.choosePlan": "प्लान चुनें",
    "member.membership.continueCheckout": "भुगतान जारी रखें",
    "member.membership.continuingBrowser": "ब्राउजर में जारी है.",
    "member.membership.continuingBrowserTitle": "ब्राउजर में जारी",
    "member.membership.currentPlan": "मौजूदा प्लान",
    "member.membership.days": "{{count}} दिन",
    "member.membership.daysOfDurationLeft": "{{durationDays}} में से {{daysLeft}} दिन बाकी",
    "member.membership.documentsAfterSuccess": "{{status}} के बाद दस्तावेज उपलब्ध होंगे.",
    "member.membership.downloadInvoice": "इनवॉइस डाउनलोड करें",
    "member.membership.enableAutopay": "ऑटो-पे चालू करें",
    "member.membership.eyebrow": "मेंबरशिप",
    "member.membership.findGyms": "जिम खोजें",
    "member.membership.generateDocument": "{{label}} जनरेट करें",
    "member.membership.generateReceiptOrInvoice": "रसीद या इनवॉइस जनरेट करें.",
    "member.membership.guidanceActiveBody": "इस जिम के लिए आपकी QR एंट्री और मेंबर लाभ चालू हैं.",
    "member.membership.guidanceActiveTitle": "मेंबरशिप सक्रिय है",
    "member.membership.guidanceCompletePayment": "पेमेंट पूरी करें",
    "member.membership.guidanceDaysLeftBody":
      "{{count}} दिन बाकी. बिना रुकावट एंट्री जारी रखने के लिए जल्दी रिन्यू करें.",
    "member.membership.guidanceExpiredBody":
      "QR एंट्री और मेंबर लाभ वापस चालू करने के लिए यह प्लान रिन्यू करें या नया प्लान चुनें.",
    "member.membership.guidanceExpiredTitle": "मेंबरशिप खत्म हो गई",
    "member.membership.guidanceFailedBody":
      "इस मेंबरशिप का भुगतान कन्फर्म नहीं हुआ. फिर कोशिश करें या डेस्क से मदद लें.",
    "member.membership.guidanceFailedTitle": "पेमेंट फेल हुआ",
    "member.membership.guidanceCancelledBody":
      "आपकी मेंबरशिप समाप्त हो गई है. एक्सेस वापस पाने के लिए इस जिम में फिर जुड़ें या नया जिम खोजें.",
    "member.membership.guidanceCancelledTitle": "मेंबरशिप रद्द हो गई",
    "member.membership.guidanceInactiveBody":
      "यह मेंबरशिप एंट्री के लिए इस्तेमाल नहीं हो सकती. जिम से संपर्क करें या दूसरा प्लान चुनें.",
    "member.membership.guidanceInactiveTitle": "मेंबरशिप सक्रिय नहीं है",
    "member.membership.guidancePastDueBody":
      "जिम इसे सक्रिय मान सके, उससे पहले आपकी मेंबरशिप के भुगतान की पुष्टि जरूरी है.",
    "member.membership.guidancePastDueTitle": "रिन्यूअल बाकी है",
    "member.membership.guidancePaymentPendingBody":
      "एंट्री से पहले पेमेंट पूरा करें या डेस्क से ऑफलाइन पेमेंट रिकॉर्ड करवाएं.",
    "member.membership.guidancePaymentPendingTitle": "पेमेंट बाकी है",
    "member.membership.guidancePayNow": "अभी पेमेंट करें",
    "member.membership.guidanceRenewalWindowTitle": "रिन्यूअल विंडो",
    "member.membership.guidanceRenewNow": "अभी रिन्यू करें",
    "member.membership.guidanceRenewOrChangePlan": "रिन्यू करें या प्लान बदलें",
    "member.membership.guidanceRenewTodayBody": "एंट्री में रुकावट से बचने के लिए आज रिन्यू करें.",
    "member.membership.guidancePausedBody":
      "चुनी गई तारीख तक जिम एक्सेस रुका है. एंट्री फिर चालू करने के लिए कभी भी फिर शुरू करें.",
    "member.membership.guidancePausedTitle": "मेंबरशिप रुकी हुई है",
    "member.membership.guidanceTryPaymentAgain": "पेमेंट फिर कोशिश करें",
    "member.membership.joinDifferentGym": "दूसरे जिम में जुड़ें",
    "member.membership.gymDefinedValidity": "जिम द्वारा तय वैधता",
    "member.membership.generatedInvoices": "बनी हुई इनवॉइस",
    "member.membership.history": "मेंबरशिप हिस्ट्री",
    "member.membership.invoice": "इनवॉइस",
    "member.membership.historyJumpBody": "आपकी पिछली मेंबरशिप और भुगतान हिस्ट्री पर ले गए.",
    "member.membership.invoiceGenerated": "इनवॉइस जनरेट हुई.",
    "member.membership.invoicesAndReceipts": "इनवॉइस और रसीदें",
    "member.membership.invoiceUnavailable": "इनवॉइस उपलब्ध नहीं",
    "member.membership.keepMembership": "मेंबरशिप रखें",
    "member.membership.manageMembership": "मेंबरशिप प्रबंधित करें",
    "member.membership.manageMembershipBody": "एक्सेस बदलना हो तभी रोकें या कैंसल करें.",
    "member.membership.manualRenewalTitle": "मैनुअल रिन्यूअल",
    "member.membership.manualRenewalBody": "अगला भुगतान देय होने पर वर्तमान प्लान कार्ड से रिन्यू करें.",
    "member.membership.noActivePlans": "कोई सक्रिय प्लान नहीं",
    "member.membership.noAlternatePlans":
      "कोई दूसरा प्लान पब्लिश नहीं है. इसी प्लान के लिए रिन्यूअल अनुरोध भेजा जाएगा.",
    "member.membership.noExpiry": "कोई समाप्ति तारीख नहीं",
    "member.membership.noMemberships": "कोई मेंबरशिप नहीं",
    "member.membership.noPayments": "कोई भुगतान नहीं",
    "member.membership.nextRenewalDate": "अगला रिन्यूअल {{date}}",
    "member.membership.off": "बंद",
    "member.membership.enabled": "चालू",
    "member.membership.endMembershipOptions": "मेंबरशिप समाप्त करें",
    "member.membership.endMembershipBody": "जब यह एक्सेस आगे नहीं चाहिए तभी कैंसल करें.",
    "member.membership.pause": "रोकें",
    "member.membership.pauseEndDateAccessibility": "मेंबरशिप रोकने की अंतिम तारीख",
    "member.membership.pauseHelp":
      "रोकने पर इस तारीख तक चेक-इन बंद रहते हैं, और बचे हुए दिन आगे जुड़ जाते हैं.",
    "member.membership.pauseMembership": "मेंबरशिप रोकें",
    "member.membership.pauseDisclosureBody": "यात्रा, चोट या तय ब्रेक के लिए ही एक्सेस रोकें.",
    "member.membership.pauseConfirmBody":
      "{{date}} तक आपका एक्सेस रुका रहेगा. उससे पहले कभी भी फिर शुरू कर सकते हैं.",
    "member.membership.pauseConfirmTitle": "मेंबरशिप रोकें?",
    "member.membership.pauseReason": "Member selected a membership pause date from mobile.",
    "member.membership.pauseReasonInjury": "चोट",
    "member.membership.pauseReasonMedical": "मेडिकल",
    "member.membership.pauseReasonOther": "अन्य",
    "member.membership.pauseReasonTravel": "यात्रा",
    "member.membership.pausedToast": "{{date}} तक रोकी गई.",
    "member.membership.pausedUntil": "मेंबरशिप {{date}} तक रोकी गई.",
    "member.membership.pauseUntil": "कब तक रोकें",
    "member.membership.payments": "भुगतान",
    "member.membership.payAmountNow": "अभी {{amount}} भुगतान करें",
    "member.membership.payNow": "अभी भुगतान करें",
    "member.membership.paySecurely": "सुरक्षित भुगतान करें",
    "member.membership.paymentDocuments": "भुगतान दस्तावेज",
    "member.membership.paymentDocumentsBody": "रसीदें और इनवॉइस नीचे हैं.",
    "member.membership.plan": "प्लान",
    "member.membership.planSwitched": "प्लान बदल गया.",
    "member.membership.receipt": "रसीद",
    "member.membership.receiptGenerated": "रसीद जनरेट हुई.",
    "member.membership.receiptNumber": "रसीद {{number}}",
    "member.membership.receiptUnavailable": "रसीद उपलब्ध नहीं",
    "member.membership.recurringRenewalEnabled": "ऑटो रिन्यूअल चालू है.",
    "member.membership.renewMembership": "मेंबरशिप रिन्यू करें",
    "member.membership.renewalConfirmed": "रिन्यूअल कन्फर्म हुआ.",
    "member.membership.renewalConsequence":
      "रिन्यू की गई मेंबरशिप भुगतान सेवा या जिम डेस्क से भुगतान कन्फर्म होने के बाद सक्रिय होती है.",
    "member.membership.renewalFlowOpened": "इस मेंबरशिप के लिए रिन्यूअल फ्लो खोल दिया गया.",
    "member.membership.renewalRequestSent": "रिन्यूअल अनुरोध भेज दिया गया.",
    "member.membership.renewalSheetBody":
      "{{gym}} में यही प्लान जारी रखें या दूसरा उपलब्ध विकल्प चुनें.",
    "member.membership.renewalSummary": "रिन्यूअल सारांश",
    "member.membership.resumed": "मेंबरशिप फिर शुरू हो गई.",
    "member.membership.resumeMembership": "मेंबरशिप फिर शुरू करें",
    "member.membership.selectedPlan": "चुना गया प्लान",
    "member.membership.selectPlanAccessibility": "{{plan}} चुनें",
    "member.membership.starting": "शुरू हो रहा है...",
    "member.membership.statusBelow": "मेंबरशिप स्थिति नीचे है.",
    "member.membership.subscriptionUpdated": "आपकी सदस्यता अपडेट हो गई.",
    "member.membership.summary": "{{active}} सक्रिय · {{expiring}} जल्द खत्म · {{total}} कुल",
    "member.membership.tabCurrent": "वर्तमान",
    "member.membership.expiringSoon": "जल्द खत्म",
    "member.membership.total": "कुल",
    "member.membership.tabHistory": "हिस्ट्री",
    "member.membership.tabPayments": "भुगतान",
    "member.membership.switchNow": "अब बदलें",
    "member.membership.switchWithoutCheckoutBody":
      "इसे तभी चुनें जब जिम ने fresh checkout के बिना plan change approve किया हो.",
    "member.membership.switchWithoutCheckoutTitle": "चेकआउट के बिना active plan बदलें",
    "member.membership.title": "आपके प्लान",
    "member.membership.typeDuration": "अवधि",
    "member.membership.typeHybrid": "हाइब्रिड",
    "member.membership.typeMembership": "मेंबरशिप",
    "member.membership.typeTrial": "ट्रायल",
    "member.membership.update": "मेंबरशिप अपडेट",
    "member.membership.updating": "अपडेट हो रहा है...",
    "member.membership.validity": "मान्यता",
    "member.membership.visits": "विजिट",
    "member.membership.visitsRemaining": "{{visits}} बाकी",
    "member.membership.visitCount": "{{count}} विजिट",
    "member.membership.yourGym": "आपका जिम",
    "member.profile.active": "सक्रिय",
    "member.profile.activeGymOption": "{{gym}} (active)",
    "member.profile.activeRoleOption": "{{role}} (active)",
    "member.profile.biometric": "Biometric",
    "member.profile.biometricOn": "Biometric on",
    "member.profile.biometricUnlock": "Biometric unlock",
    "member.profile.biometricUnlockBody":
      "इसे enable करने के लिए Face ID या device biometrics set up करें.",
    "member.profile.checkedIn": "Checked in",
    "member.profile.classes": "क्लासेस",
    "member.profile.daysReferralBenefit":
      "हर join करने वाले friend पर आपको {{count}} free days मिलेंगे.",
    "member.profile.daysRemaining": "{{count}} दिन बाकी",
    "member.profile.daysRemainingOf": "{{remaining}} में से {{total}} दिन बाकी",
    "member.profile.defaultReferralBenefit":
      "अपना code share करें ताकि gym आपके लाए friends track कर सके.",
    "member.profile.earnedCredit": "{{amount}} earned",
    "member.profile.expires": "{{date}} expire",
    "member.profile.findGyms": "जिम खोजें",
    "member.profile.friendsStat": "आपके दोस्त: {{joined}} जुड़ चुके, {{pending}} बाकी",
    "member.profile.membership": "मेंबरशिप",
    "member.profile.membershipDetailsUnavailable": "सदस्यता विवरण उपलब्ध नहीं",
    "member.profile.accountTab": "अकाउंट",
    "member.profile.detailsTab": "विवरण",
    "member.profile.rewardsTab": "रिवॉर्ड",
    "member.profile.memberFallback": "Zook सदस्य",
    "member.profile.myGym": "मेरा जिम",
    "member.profile.noActiveMembership": "कोई सक्रिय सदस्यता नहीं",
    "member.profile.noActivity": "कोई गतिविधि नहीं",
    "member.profile.noGyms": "कोई जिम नहीं",
    "member.profile.noGymsBody": "पहले जिम जॉइन करें या एक्सेस अनुरोध भेजें.",
    "member.profile.noRoleAssigned": "कोई भूमिका असाइन नहीं",
    "member.profile.noRoles": "कोई भूमिका नहीं",
    "member.profile.noRolesBody": "इस अकाउंट में सक्रिय जिम में दूसरी भूमिका नहीं है.",
    "member.profile.otherGymRoleBody": "{{role}} टूल्स खोलने से पहले जिम बदलें.",
    "member.profile.otherGymRoleTitle": "{{role}} दूसरे जिम में है",
    "member.profile.pendingCredit": "{{amount}} pending",
    "member.profile.percentComplete": "{{percent}}% पूरा",
    "member.profile.percentCompleteWithDate": "{{percent}}% पूरा - {{date}}",
    "member.profile.qaShortcuts": "QA शॉर्टकट",
    "member.profile.quickActions": "त्वरित एक्शन",
    "member.profile.finishProfile": "प्रोफाइल पूरी करें",
    "member.profile.readinessContact": "चलता हुआ फोन या ईमेल",
    "member.profile.readinessMembership": "सक्रिय सदस्यता जुड़ी है",
    "member.profile.readinessMore": "+{{count}} और",
    "member.profile.readinessNeedsBody": "{{count}} बाकी.",
    "member.profile.readinessNeedsTitle": "चेक-इन आसान बनाएं",
    "member.profile.readinessPhoto": "साफ प्रोफाइल फोटो",
    "member.profile.readinessReadyBody":
      "डेस्क स्टाफ आपको जल्दी वेरिफाई कर सकता है और जिम के पास जरूरी जानकारी है.",
    "member.profile.readinessReadyTitle": "प्रोफाइल डेस्क के लिए तैयार है",
    "member.profile.recentActivity": "हाल की गतिविधि",
    "member.profile.referGymAccessibility": "Zook को जिम रेफर करें और कमाएं",
    "member.profile.referGymBody": "रेफर किया गया जिम Zook जॉइन करे तो कमाएं.",
    "member.profile.referGymTitle": "जिम रेफर करें और कैश कमाएं",
    "member.profile.referralCodeCopied": "आपका रेफरल कोड कॉपी हो गया.",
    "member.profile.referralCopied": "रेफरल कॉपी हुआ",
    "member.profile.referralLinkCopied": "आपका रेफरल लिंक कॉपी हो गया.",
    "member.profile.renew": "रिन्यू करें",
    "member.profile.roleUnavailable": "भूमिका उपलब्ध नहीं है",
    "member.profile.roleUnavailableBody": "यह भूमिका यहां उपलब्ध नहीं है.",
    "member.profile.roleAtGym": "{{gym}} में {{role}}",
    "member.profile.settings": "सेटिंग्स",
    "member.profile.shareReferralCode": "{{gym}} पर मेरा referral code {{code}} use करें.",
    "member.profile.shareReferralWithLink":
      "{{gym}} join करें मेरे referral code {{code}} से: {{link}}",
    "member.profile.signOut": "साइन आउट",
    "member.profile.signOutConfirmBody": "आप OTP से कभी भी दोबारा साइन इन कर सकते हैं.",
    "member.profile.signOutConfirmTitle": "साइन आउट करें?",
    "member.profile.switch": "बदलें",
    "member.profile.switchFailed": "बदल नहीं सके",
    "member.profile.switchFailedBody": "अभी जिम नहीं बदला जा सका.",
    "member.profile.switchGym": "जिम बदलें",
    "member.profile.switchGymBody": "अपना सक्रिय जिम चुनें.",
    "member.profile.switchGymConfirmBody": "आपकी प्रोफाइल उस जिम के हिसाब से रीफ्रेश होगी.",
    "member.profile.switchGymConfirmTitle": "{{gym}} पर बदलें?",
    "member.profile.switchGymForRole": "{{role}} टूल्स के लिए {{gym}} पर बदलें",
    "member.profile.switchRole": "भूमिका बदलें",
    "member.profile.switchRoleBody": "इस जिम में इस्तेमाल करने वाली भूमिका चुनें.",
    "member.profile.switchRoleConfirmBody": "Zook उस भूमिका के टूल्स खोलेगा.",
    "member.profile.switchRoleConfirmTitle": "{{role}} पर बदलें?",
    "member.profile.switching": "बदला जा रहा है...",
    "member.profile.title": "प्रोफाइल",
    "member.profile.trainerReferralBenefit":
      "Trainer referrals commission review के लिए track होते हैं जब member join करता है या gym आपके link से sign up करता है.",
    "member.profile.updating": "अपडेट हो रहा है",
    "member.profile.useRoleAccessibility": "Zook को {{role}} की तरह इस्तेमाल करें",
    "member.profile.viewHistory": "हिस्ट्री देखें",
    "member.profile.visitsReferralBenefit":
      "हर join करने वाले friend पर आपको {{count}} visits मिलेंगे.",
    "member.profile.visitsRemaining": "{{total}} में से {{remaining}} बाकी",
    "member.profile.workoutPlan": "वर्कआउट प्लान",
    "roleSwitcher.active": "सक्रिय",
    "roleSwitcher.currentRoleAccessibility": "भूमिका बदलें. मौजूदा भूमिका: {{role}}",
    "roleSwitcher.currentWorkspace": "मौजूदा वर्कस्पेस",
    "roleSwitcher.currentWorkspaceAccessibility": "भूमिका बदलें. मौजूदा वर्कस्पेस: {{workspace}}",
    "roleSwitcher.role.admin": "एडमिन",
    "roleSwitcher.role.member": "मेंबर",
    "roleSwitcher.role.owner": "ओनर",
    "roleSwitcher.role.platformAdmin": "प्लैटफॉर्म एडमिन",
    "roleSwitcher.role.receptionist": "रिसेप्शन",
    "roleSwitcher.role.trainer": "ट्रेनर",
    "roleSwitcher.roleUnavailable": "भूमिका उपलब्ध नहीं",
    "roleSwitcher.roleUnavailableBody": "यह भूमिका यहां उपलब्ध नहीं है.",
    "roleSwitcher.subtitle": "इस वर्कस्पेस के लिए जिम और भूमिका चुनें.",
    "roleSwitcher.switching": "बदला जा रहा है...",
    "roleSwitcher.switchToWorkspace": "इस वर्कस्पेस पर बदलें",
    "roleSwitcher.title": "भूमिका बदलें",
    "roleSwitcher.use": "इस्तेमाल करें",
    "member.profileExtra.addDateOfBirth": "जन्म तारीख जोड़ें",
    "member.profileExtra.aiConsent": "AI सहमति",
    "member.profileExtra.aiConsentBody": "AI सुविधाओं को आपका प्रोफाइल संदर्भ इस्तेमाल करने दें.",
    "member.profileExtra.completedFields": "{{completed}}/{{total}} सुरक्षा और KYC फ़ील्ड पूरे.",
    "member.profileExtra.dateOfBirth": "जन्म तारीख",
    "member.profileExtra.decreaseWeeklyWorkoutGoal": "साप्ताहिक वर्कआउट लक्ष्य घटाएं",
    "member.profileExtra.emergencyContact": "आपातकालीन संपर्क",
    "member.profileExtra.gender": "लिंग",
    "member.profileExtra.genderFemale": "महिला",
    "member.profileExtra.genderMale": "पुरुष",
    "member.profileExtra.genderNonBinary": "नॉन-बाइनरी",
    "member.profileExtra.genderNotSpecified": "नहीं बताया",
    "member.profileExtra.increaseWeeklyWorkoutGoal": "साप्ताहिक वर्कआउट लक्ष्य बढ़ाएं",
    "member.profileExtra.locale": "भाषा",
    "member.profileExtra.marketingOptIn": "मार्केटिंग सहमति",
    "member.profileExtra.name": "नाम",
    "member.profileExtra.phone": "फोन",
    "member.profileExtra.saved": "सेव हुआ",
    "member.profileExtra.title": "प्रोफाइल विवरण",
    "member.profileExtra.weeklyGoalValue": "{{count}} / हफ्ता",
    "member.profileExtra.weeklyWorkoutGoal": "साप्ताहिक वर्कआउट लक्ष्य",
    "member.profilePhoto.addProfilePhoto": "प्रोफाइल फोटो जोड़ें",
    "member.profilePhoto.cameraPrimer":
      "चेक-इन और सदस्य प्रोफाइल के लिए प्रोफाइल फोटो लेने हेतु Zook को कैमरा एक्सेस चाहिए.",
    "member.profilePhoto.cameraSettingsPrompt":
      "कैमरा एक्सेस बंद है. प्रोफाइल फोटो लेने के लिए सेटिंग्स में चालू करें.",
    "member.profilePhoto.chooseFromLibrary": "लाइब्रेरी से चुनें",
    "member.profilePhoto.continue": "जारी रखें",
    "member.profilePhoto.libraryPrimer":
      "चेक-इन और सदस्य प्रोफाइल के लिए प्रोफाइल फोटो चुनने हेतु Zook को फोटो एक्सेस चाहिए.",
    "member.profilePhoto.librarySettingsPrompt":
      "फोटो एक्सेस बंद है. प्रोफाइल फोटो चुनने के लिए सेटिंग्स में चालू करें.",
    "member.profilePhoto.noFileId": "फोटो अपलोड हुई, लेकिन फाइल ID वापस नहीं आई.",
    "member.profilePhoto.notNow": "अभी नहीं",
    "member.profilePhoto.permissionNeeded": "अनुमति चाहिए",
    "member.profilePhoto.photoNotRemoved": "फोटो हट नहीं सकी",
    "member.profilePhoto.photoNotSaved": "फोटो सेव नहीं हुई",
    "member.profilePhoto.photoTooLarge": "5 MB से छोटी फोटो चुनें.",
    "member.profilePhoto.profilePhoto": "प्रोफाइल फोटो",
    "member.profilePhoto.remove": "हटाएं",
    "member.profilePhoto.signInAgain": "प्रोफाइल फोटो अपडेट करने से पहले फिर साइन इन करें.",
    "member.profilePhoto.takePhoto": "फोटो लें",
    "member.profilePhoto.tryAgain": "थोड़ी देर में फिर कोशिश करें.",
    "member.profilePhoto.updateProfilePhoto": "प्रोफाइल फोटो अपडेट करें",
    "memberList.all": "सभी",
    "memberList.couldNotLoad": "सदस्य लोड नहीं हो सके.",
    "memberList.noEmail": "ईमेल नहीं है",
    "memberList.noMembers": "कोई सदस्य नहीं",
    "memberList.noPhone": "फोन नहीं है",
    "memberList.reveal": "संपर्क देखें",
    "memberList.revealPhoneFor": "{{name}} का संपर्क देखें",
    "memberList.searchMembers": "सदस्य खोजें",
    "memberList.status.active": "सक्रिय",
    "memberList.status.expired": "समाप्त",
    "memberList.status.expiring": "जल्द समाप्त",
    "memberList.status.pending": "लंबित",
    "memberList.tryDifferentSearch": "दूसरी खोज या फिल्टर आजमाएं.",
    "privilegedPin.body": "जारी रखने के लिए 4 अंकों का जिम PIN डालें.",
    "privilegedPin.confirmAction": "एक्शन कन्फर्म करें",
    "privilegedPin.continue": "जारी रखें",
    "privilegedPin.orgPin": "जिम PIN",
    "member.diet.activePlan": "Active plan",
    "member.diet.addCaloriesOrMacro": "Log करने से पहले calories या कम से कम एक macro जोड़ें.",
    "member.diet.addMealName": "Log करने से पहले meal name जोड़ें.",
    "member.diet.calories": "कैलोरी",
    "member.diet.carbs": "कार्ब्स",
    "member.diet.couldNotLogMeal": "मील लॉग नहीं हो सका",
    "member.diet.fats": "फैट",
    "member.diet.historyTitle": "डाइट इतिहास",
    "member.diet.kcalRemainingToday": "आज {{kcal}} kcal बाकी",
    "member.diet.logMeal": "मील लॉग करें",
    "member.diet.logging": "लॉग हो रहा है...",
    "member.diet.meal": "मील",
    "member.diet.mealLogged": "मील लॉग हो गया.",
    "member.diet.mealPlaceholder": "Paneer sandwich",
    "member.diet.nextDay": "अगला दिन",
    "member.diet.noDietPlan": "कोई डाइट प्लान नहीं",
    "member.diet.noDietPlanBody": "आपका ट्रेनर आपका मील प्लान यहां पब्लिश करेगा.",
    "member.diet.noMealsLogged": "कोई मील लॉग नहीं",
    "member.diet.noMealsLoggedBody": "इस दिन के लिए लॉग किए गए मील यहां दिखेंगे.",
    "member.diet.noPlan": "कोई प्लान नहीं",
    "member.diet.previousDay": "पिछला दिन",
    "member.diet.protein": "प्रोटीन",
    "member.diet.today": "आज",
    "member.habits.add": "Add",
    "member.habits.addFirstHabit": "पहली habit जोड़ें",
    "member.habits.addHabit": "Habit जोड़ें",
    "member.habits.addHabitAccessibility": "{{title}} habit जोड़ें",
    "member.habits.closeAddHabit": "Add habit बंद करें",
    "member.habits.completedTodayAccessibility": "{{title}}. आज complete",
    "member.habits.dailyHabits": "Daily habits",
    "member.habits.dayStreak": "{{count}}-day streak",
    "member.habits.dayStreakDoToday": "{{count}}-day streak · आज करें",
    "member.habits.done": "Done",
    "member.habits.doneToday": "आज done",
    "member.habits.emptyBody": "Water, sleep और steps जैसी daily habits track करके streaks बनाएं.",
    "member.habits.notDoneAccessibility": "{{title}}. Done नहीं",
    "member.habits.proteinLabel": "Protein",
    "member.habits.proteinTitle": "Protein target पूरा करें",
    "member.habits.sleepLabel": "Sleep",
    "member.habits.sleepTitle": "8 घंटे sleep",
    "member.habits.stepsLabel": "Steps",
    "member.habits.stepsTitle": "10,000 steps",
    "member.habits.stretchLabel": "Stretch",
    "member.habits.stretchTitle": "10 min stretch",
    "member.habits.tapToCompleteToday": "आज complete करने के लिए tap करें",
    "member.habits.target": "Target {{value}}{{unit}}",
    "member.habits.waterLabel": "Water",
    "member.habits.waterTitle": "3L water पिएं",
    "member.plan.assignedPlan": "असाइन किया गया प्लान",
    "member.plan.coachGuided": "कोच गाइडेड",
    "member.plan.couldNotLoadExercises": "एक्सरसाइज लोड नहीं हो सकीं",
    "member.plan.dietKind": "डाइट प्लान",
    "member.plan.dietTab": "डाइट",
    "member.plan.insideThisPlan": "इस प्लान में",
    "member.plan.morePlans": "और प्लान",
    "member.plan.nextWorkout": "अगला वर्कआउट",
    "member.plan.noExercises": "कोई एक्सरसाइज नहीं",
    "member.plan.noPlanAssigned": "कोई प्लान असाइन नहीं",
    "member.plan.noPlanAssignedBody": "आपका ट्रेनर यहां वर्कआउट प्लान असाइन करेगा.",
    "member.plan.openTodayPlan": "आज का प्लान खोलें",
    "member.plan.percentComplete": "{{percent}}% पूरा",
    "member.plan.planMeta": "{{kind}} · {{assignment}}",
    "member.plan.progress": "प्रोग्रेस",
    "member.plan.title": "प्लान",
    "member.plan.todaysWorkout": "आज का वर्कआउट",
    "member.plan.trainerAssigned": "ट्रेनर द्वारा असाइन",
    "member.plan.viewFullExerciseList": "पूरी एक्सरसाइज सूची देखें",
    "member.plan.workoutKind": "वर्कआउट प्लान",
    "member.plan.workoutTab": "वर्कआउट",
    "member.planDetail.actionFailed": "कार्रवाई पूरी नहीं हुई",
    "member.planDetail.active": "सक्रिय",
    "member.planDetail.addShortNote": "छोटा नोट जोड़ें",
    "member.planDetail.assigned": "असाइन किया गया",
    "member.planDetail.assignedByCoach": "कोच ने असाइन किया",
    "member.planDetail.closeFeedback": "फीडबैक बंद करें",
    "member.planDetail.completedCount": "{{total}} में से {{completed}} पूरे",
    "member.planDetail.completeWorkout": "वर्कआउट पूरा करें",
    "member.planDetail.completing": "पूरा हो रहा है...",
    "member.planDetail.finishMoreExercises": "{{count}} और पूरी करें",
    "member.planDetail.defaultSets": "3 sets",
    "member.planDetail.dietFilter": "डाइट",
    "member.planDetail.done": "हो गया",
    "member.planDetail.exercises": "एक्सरसाइज",
    "member.planDetail.failedToSend": "भेजा नहीं गया. फिर कोशिश करें.",
    "member.planDetail.feedback": "फीडबैक",
    "member.planDetail.feedbackSent": "फीडबैक कोच को भेज दिया गया.",
    "member.planDetail.feedbackSheetBody": "इस असाइनमेंट के बारे में छोटा नोट भेजें.",
    "member.planDetail.needSwap": "बदलाव चाहिए",
    "member.planDetail.noPlanAssignedBody":
      "आपका ट्रेनर यहां वर्कआउट प्लान असाइन करेगा. फिर देखें.",
    "member.planDetail.pain": "दर्द",
    "member.planDetail.pickNoteFirst": "पहले एक नोट चुनें.",
    "member.planDetail.progressNotSaved": "प्रोग्रेस सेव नहीं हुई",
    "member.planDetail.progressNotSavedBody": "यह डिवाइस checkbox state restore नहीं कर पाएगा.",
    "member.planDetail.seeWeeklyList": "हफ्ते की सूची देखें",
    "member.planDetail.send": "भेजें",
    "member.planDetail.sending": "भेजा जा रहा है...",
    "member.planDetail.sentToCoach": "कोच को भेज दिया गया.",
    "member.planDetail.signInAgainFeedback": "फीडबैक भेजने के लिए फिर से साइन इन करें.",
    "member.planDetail.tellCoach": "कोच को बताएं",
    "member.planDetail.tooHard": "बहुत कठिन",
    "member.planDetail.upNextThisWeek": "इस हफ्ते आगे",
    "member.planDetail.workoutFilter": "वर्कआउट",
    "member.planDetail.workoutMarkedComplete": "वर्कआउट पूरा मार्क हो गया.",
    "member.planDetail.workoutProgress": "वर्कआउट प्रगति",
    "member.planDetail.workoutProgressNotSaved": "वर्कआउट प्रोग्रेस सेव नहीं हो सकी.",
    "member.planDetail.yourCoach": "आपका कोच",
    "member.planDetail.yourPlan": "आपका प्लान",
    "member.progress.history": "हिस्ट्री",
    "member.progress.logWorkout": "वर्कआउट लॉग करें",
    "member.progress.noWorkoutsLogged": "कोई वर्कआउट लॉग नहीं",
    "member.progress.noWorkoutsLoggedBody":
      "प्रोग्रेस ट्रैक करने के लिए अपना पहला वर्कआउट लॉग करें.",
    "member.progress.privacyNote":
      "निजी एंट्री आपके पास रहती हैं जब तक आप ट्रेनर विजिबिलिटी नहीं चुनते.",
    "member.progress.recentWorkouts": "हाल के वर्कआउट",
    "member.progress.thisWeek": "इस हफ्ते",
    "member.progress.title": "प्रोग्रेस",
    "member.receipt.amount": "राशि",
    "member.receipt.downloadInvoice": "इनवॉइस डाउनलोड करें",
    "member.receipt.generating": "कन्फर्मेशन के बाद जनरेट होगा",
    "member.receipt.gst": "GST",
    "member.receipt.invoice": "इनवॉइस",
    "member.receipt.invoiceNo": "इनवॉइस नं.",
    "member.receipt.issued": "जारी",
    "member.receipt.membership": "मेंबरशिप",
    "member.receipt.mode": "मोड",
    "member.receipt.modeCash": "कैश",
    "member.receipt.modeOnline": "ऑनलाइन",
    "member.receipt.notFound": "रसीद नहीं मिली",
    "member.receipt.notFoundBody": "आपकी मेंबरशिप history में यह payment नहीं मिला.",
    "member.receipt.paymentDetails": "पेमेंट विवरण",
    "member.receipt.purpose": "उद्देश्य",
    "member.receipt.receiptNo": "रसीद नं.",
    "member.receipt.receiptNumber": "रसीद {{number}}",
    "member.receipt.recorded": "रिकॉर्ड हुआ",
    "member.receipt.status": "स्टेटस",
    "member.receipt.statusCancelled": "रद्द",
    "member.receipt.statusCreated": "बन गई",
    "member.receipt.statusFailed": "असफल",
    "member.receipt.statusIssued": "जारी",
    "member.receipt.statusPaused": "रोकी गई",
    "member.receipt.statusRefunded": "रिफंड",
    "member.receipt.statusSucceeded": "भुगतान हो गया",
    "member.receipt.taxableAmount": "कर योग्य राशि",
    "member.receipt.title": "रसीद",
    "member.receipt.total": "कुल",
    "member.scan.addPhoto": "फोटो जोड़ें",
    "member.scan.allowCamera": "कैमरा अनुमति दें",
    "member.scan.allowCameraQr": "जिम QR स्कैन करने के लिए कैमरा अनुमति दें.",
    "member.scan.allowCameraSettings":
      "QR code स्कैन करने के लिए Settings में camera access allow करें.",
    "member.scan.alreadyCheckedInToday": "आज पहले से चेक-इन हो चुका है.",
    "member.scan.awaitingQr": "QR का इंतज़ार",
    "member.scan.awaitingSubmit": "सबमिट का इंतज़ार",
    "member.scan.backToCameraScanner": "कैमरा स्कैनर पर वापस",
    "member.scan.cameraAccessBlocked": "कैमरा access बंद है",
    "member.scan.cameraAvailable": "कैमरा उपलब्ध है",
    "member.scan.cameraAvailableAnnouncement": "कैमरा उपलब्ध है. इसे जिम QR कोड पर पॉइंट करें.",
    "member.scan.cameraBlockedAnnouncement":
      "कैमरा एक्सेस बंद है. QR स्कैनिंग की अनुमति देने के लिए डिवाइस सेटिंग्स खोलें.",
    "member.scan.cameraNeeded": "कैमरा चाहिए",
    "member.scan.cameraNeededAnnouncement": "स्कैन करने से पहले कैमरा अनुमति चाहिए.",
    "member.scan.cameraPreviewAccessibility": "QR स्कैनर कैमरा प्रीव्यू",
    "member.scan.cantScan": "स्कैन नहीं हो रहा?",
    "member.scan.checkCodeAccessibility": "कोड जांचें",
    "member.scan.checkedIn": "चेक-इन हुआ",
    "member.scan.checkingCode": "कोड जांचा जा रहा है...",
    "member.scan.codeCaptured": "कोड कैप्चर हुआ",
    "member.scan.codeEntered": "कोड दर्ज हुआ",
    "member.scan.codeHint": "QR के साथ दिखाए गए दो अक्षर और चार अंक डालें.",
    "member.scan.couldNotReadQr": "QR कोड पढ़ा नहीं जा सका. फिर कोशिश करें.",
    "member.scan.enableCamera": "कैमरा चालू करें",
    "member.scan.enterCheckInCode": "चेक-इन कोड डालें",
    "member.scan.enterCode": "कोड डालें",
    "member.scan.enterCodeManually": "कोड मैन्युअली डालें",
    "member.scan.enterDeskCodeManually": "QR के पास दिखा कोड डालें.",
    "member.scan.enterManualCodeAccessibility": "मैनुअल चेक-इन कोड डालें",
    "member.scan.membershipExpired": "सदस्यता खत्म हो गई है. चेक-इन से पहले रिन्यू करें.",
    "member.scan.needFourNumbers": "4 नंबर चाहिए (जैसे 1234)",
    "member.scan.needTwoLetters": "2 अक्षर चाहिए (जैसे AB)",
    "member.scan.notVerified": "वेरिफाई नहीं हुआ",
    "member.scan.offlineSavedBody":
      "कनेक्शन नहीं है. आपका स्कैन फिर कोशिश के लिए सेव है, लेकिन एंट्री अभी कन्फर्म नहीं है.",
    "member.scan.offlineSavedTitle": "स्कैन फिर कोशिश के लिए सेव हुआ",
    "member.scan.offlineSavedToast": "सर्वर स्वीकार करने तक एंट्री कन्फर्म नहीं है.",
    "member.scan.openDeviceSettings": "QR स्कैनिंग की अनुमति देने के लिए डिवाइस सेटिंग्स खोलें.",
    "member.scan.openSettings": "सेटिंग्स खोलें",
    "member.scan.profilePhotoRecommended":
      "चेक-इन के बाद प्रोफाइल फोटो जोड़ें ताकि डेस्क अगली बार आपको जल्दी वेरिफाई कर सके.",
    "member.scan.queuedScanWaiting": "{{count}} स्कैन सर्वर पुष्टि का इंतज़ार कर रहा है.",
    "member.scan.queuedScansWaiting": "{{count}} स्कैन सर्वर पुष्टि का इंतज़ार कर रहे हैं.",
    "member.scan.retryNow": "अब फिर कोशिश करें",
    "member.scan.returnToQrScannerAccessibility": "QR scanner पर वापस जाएं",
    "member.scan.savedCheckInConfirmed": "Saved check-in confirm हुआ.",
    "member.scan.savedCheckInsConfirmed": "{{count}} saved check-ins confirm हुए.",
    "member.scan.scanAgain": "फिर scan करें",
    "member.scan.searchingForCode": "कोड खोज रहा है...",
    "member.scan.serverCheck": "Server check",
    "member.scan.serverVerified": "Server verified",
    "member.scan.signInAgain": "स्कैन करने से पहले फिर sign in करें.",
    "member.scan.signInSelectGym": "स्कैन करने से पहले sign in करें और gym चुनें.",
    "member.scan.subtitle": "अपने gym के QR code पर camera point करें",
    "member.scan.title": "Check-in scan करें",
    "member.scan.tryCameraAgain": "कैमरा फिर try करें",
    "member.scan.tryCheckIn": "Check-in try करें",
    "member.scan.verifying": "Verify हो रहा है",
    "member.scan.yourGym": "आपका gym",
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
    "owner.home.allClearBody":
      "अभी कोई urgent approval, payment exception, low-stock item या expiring plan action में नहीं है.",
    "owner.home.approvals": "मंजूरी",
    "owner.home.approvalsWaiting": "मंजूरी बाकी",
    "owner.home.approvalsWaitingSubtitle":
      "{{join}} जॉइन {{joinLabel}} · {{scans}} स्कैन {{scanLabel}}",
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
    "owner.home.reviewMembers": "Members review करें",
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
    "owner.members.active": "Active",
    "owner.members.day": "दिन",
    "owner.members.days": "दिन",
    "owner.members.daysLeft": "{{count}} {{label}} बाकी",
    "owner.members.expiring": "Expiring",
    "owner.members.expiringReminderBody":
      "आपकी मेंबरशिप {{date}} को खत्म होती है. ऐप में रिन्यू करें.",
    "owner.members.expiringReminderTitle": "मेंबरशिप जल्द खत्म हो रही है",
    "owner.members.missingContact": "Missing contact",
    "owner.members.reminderNotSent": "रिमाइंडर नहीं भेजा गया",
    "owner.members.reminderSent": "{{name}} को रिमाइंडर भेजा गया.",
    "owner.members.sendReminder": "रिमाइंडर भेजें",
    "owner.members.soon": "जल्द",
    "owner.members.title": "मेंबर",
    "owner.members.total": "कुल {{count}}",
    "owner.members.tryAgain": "फिर कोशिश करें.",
    "owner.member.couldNotLoadMember": "मेंबर load नहीं हो सका",
    "owner.member.actionContactBody":
      "Offers assign करने या reminders भेजने से पहले phone और email जोड़ें.",
    "owner.member.actionContactTitle": "Contact details complete करें",
    "owner.member.actionExpiringBody":
      "Plan {{count}} दिनों में खत्म होगा. Access lapse होने से पहले reminder भेजें.",
    "owner.member.actionExpiringTitle": "Renewal window खुली है",
    "owner.member.actionHealthyBody":
      "Profile, contact और membership status daily operations के लिए ready हैं.",
    "owner.member.actionHealthyTitle": "मेंबर अच्छी स्थिति में है",
    "owner.member.actionPlanBody":
      "कोई active membership ready नहीं है. Check-ins से पहले payment record करें या plan assign करें.",
    "owner.member.actionPlanTitle": "Active plan सेट करें",
    "owner.member.email": "ईमेल",
    "owner.member.fitnessGoal": "फिटनेस लक्ष्य",
    "owner.member.memberFallback": "मेंबर",
    "owner.member.memberSince": "मेंबर since",
    "owner.member.nextBestAction": "Next best action",
    "owner.member.noActivePlan": "कोई active plan नहीं",
    "owner.member.notes": "नोट्स",
    "owner.member.notAvailable": "उपलब्ध नहीं",
    "owner.member.notFound": "मेंबर नहीं मिला",
    "owner.member.notSet": "सेट नहीं",
    "owner.member.openingPaymentTools": "पेमेंट tools खुल रहे हैं.",
    "owner.member.phone": "फोन",
    "owner.member.recordPayment": "पेमेंट record करें",
    "owner.member.reveal": "Contact देखें",
    "owner.member.revealNotLogged": "Contact view log नहीं हुआ",
    "owner.member.revealNotLoggedBody": "फोन दिखा दिया गया, लेकिन audit log save नहीं हो सका.",
    "owner.member.revealPhoneFor": "{{name}} का contact देखें",
    "owner.member.sendReminder": "रिमाइंडर भेजें",
    "owner.member.subscriptionHistory": "Subscription history",
    "owner.member.untilDate": "{{date}} तक",
    "owner.member.viewFullProfile": "पूरा profile देखें",
    "owner.member.visitsLeft": "{{count}} visits बाकी",
    "owner.approvals.allCaughtUp": "सब पूरा है",
    "owner.approvals.allCaughtUpBody":
      "कोई जॉइन रिक्वेस्ट या फ्लैग किया गया चेक-इन रिव्यू में नहीं है.",
    "owner.approvals.approveAll": "सभी मंजूर करें",
    "owner.approvals.approveAllBody": "{{count}} लंबित सदस्य इस जिम में जोड़े जाएंगे.",
    "owner.approvals.approveAllTitle": "सभी जॉइन रिक्वेस्ट मंजूर करें?",
    "owner.approvals.approveFailed": "जॉइन रिक्वेस्ट मंजूर नहीं हो सकीं.",
    "owner.approvals.approvedJoinRequests": "{{count}} जॉइन रिक्वेस्ट मंजूर हुईं.",
    "owner.approvals.approvedPartial": "{{total}} में से {{approved}} मंजूर हुए.",
    "owner.approvals.joinRequest": "जॉइन रिक्वेस्ट",
    "owner.approvals.joinRequests": "जॉइन रिक्वेस्ट",
    "owner.approvals.memberCheckIn": "मेंबर चेक-इन",
    "owner.approvals.none": "नहीं है",
    "owner.approvals.ownerApprovalRequired": "ओनर की मंजूरी जरूरी है",
    "owner.approvals.pending": "लंबित",
    "owner.approvals.pendingReviews": "लंबित रिव्यू",
    "owner.approvals.referral": "रेफरल",
    "owner.approvals.reject": "अस्वीकार करें",
    "owner.approvals.rejectBody":
      "यह व्यक्ति जिम में नहीं जोड़ा जाएगा और उसे फिर से रिक्वेस्ट करनी होगी.",
    "owner.approvals.rejected": "जॉइन रिक्वेस्ट अस्वीकार हो गई.",
    "owner.approvals.rejectFailed": "जॉइन रिक्वेस्ट अस्वीकार नहीं हो सकी.",
    "owner.approvals.rejectTitle": "जॉइन रिक्वेस्ट अस्वीकार करें?",
    "owner.approvals.requestListCount": "रिक्वेस्ट ({{count}})",
    "owner.approvals.scanReviewQueueCount": "स्कैन रिव्यू ({{count}})",
    "owner.approvals.scanReviews": "स्कैन रिव्यू",
    "owner.approvals.title": "मंजूरी",
    "owner.more.approvals": "स्वीकृतियां",
    "owner.more.approvalsSubtitle": "जॉइन अनुरोध और flagged scan देखें",
    "owner.more.billing": "बिलिंग",
    "owner.more.billingSubtitle": "ट्रायल और सब्सक्रिप्शन",
    "owner.more.branches": "शाखाएं",
    "owner.more.branchesSubtitle": "लोकेशन और संचालन जानकारी",
    "owner.more.couponsOffers": "कूपन और ऑफर",
    "owner.more.couponsOffersSubtitle": "चेकआउट कैंपेन के छूट कोड",
    "owner.more.entryQr": "एंट्री QR",
    "owner.more.entryQrSubtitle": "दरवाजे पर चेक-इन QR दिखाएं",
    "owner.more.exerciseLibrary": "एक्सरसाइज लाइब्रेरी",
    "owner.more.exerciseLibrarySubtitle": "ट्रेनर के लिए साझा वर्कआउट टेम्पलेट",
    "owner.more.membershipPlans": "सदस्यता प्लान",
    "owner.more.membershipPlansSubtitle": "सदस्य जो प्लान खरीदते हैं उन्हें बनाएं और कीमत दें",
    "owner.more.notificationTemplates": "नोटिफिकेशन टेम्पलेट",
    "owner.more.notificationTemplatesSubtitle": "बार-बार इस्तेमाल होने वाले मैसेज ड्राफ्ट",
    "owner.more.groupCatalog": "कैटलॉग",
    "owner.more.groupDailyWork": "रोज़ का काम",
    "owner.more.groupFinance": "फाइनेंस और ग्रोथ",
    "owner.more.groupOperations": "ऑपरेशंस",
    "owner.more.members": "सदस्य",
    "owner.more.membersSubtitle": "प्रोफाइल, रिन्यूअल और जल्द खत्म होने वाले प्लान खोजें",
    "owner.more.ownerTools": "ओनर टूल्स",
    "owner.more.referGym": "जिम रेफर करें",
    "owner.more.referGymSubtitle": "रेफर किए गए जिम के सब्सक्राइब करने पर मुफ्त Zook दिन पाएं",
    "owner.more.referralProgram": "रेफरल प्रोग्राम",
    "owner.more.referralProgramSubtitle": "सदस्य, ट्रेनर और जिम रेफरल के reward सेट करें",
    "owner.more.reports": "रिपोर्ट",
    "owner.more.reportsSubtitle": "कमाई, हाज़िरी और सदस्य बदलाव",
    "owner.more.revenue": "कमाई",
    "owner.more.revenueSubtitle": "कलेक्शन, receipt और failed payment देखें",
    "owner.more.staff": "स्टाफ",
    "owner.more.staffSubtitle": "एडमिन और ट्रेनर आमंत्रित या manage करें",
    "owner.more.stock": "स्टॉक",
    "owner.more.stockSubtitle": "प्रोडक्ट और पिकअप",
    "owner.more.trainerPayouts": "ट्रेनर पेआउट",
    "owner.more.trainerPayoutsSubtitle": "अपने कोच की payout समीक्षा और भुगतान करें",
    "owner.more.webControlRoom": "वेब कंट्रोल रूम",
    "owner.exerciseLibrary.add": "Add",
    "owner.exerciseLibrary.customExercise": "Custom exercise",
    "owner.exerciseLibrary.edit": "Edit",
    "owner.exerciseLibrary.editTemplate": "Template edit करें",
    "owner.exerciseLibrary.equipment": "Equipment",
    "owner.exerciseLibrary.equipmentPlaceholder": "Barbell",
    "owner.exerciseLibrary.exerciseName": "Exercise name",
    "owner.exerciseLibrary.exerciseNamePlaceholder": "Bench press",
    "owner.exerciseLibrary.featured": "Featured",
    "owner.exerciseLibrary.featuredTemplates": "Featured",
    "owner.exerciseLibrary.muscle": "Muscle",
    "owner.exerciseLibrary.musclePlaceholder": "Chest",
    "owner.exerciseLibrary.new": "New",
    "owner.exerciseLibrary.newTemplate": "New template",
    "owner.exerciseLibrary.noSharedTemplates": "अभी कोई shared template नहीं",
    "owner.exerciseLibrary.noSharedTemplatesBody":
      "Starter add करें या अपने house favorites बनाएं.",
    "owner.exerciseLibrary.notes": "Notes",
    "owner.exerciseLibrary.notesPlaceholder": "Coaching cues",
    "owner.exerciseLibrary.programmingDefaults": "प्रोग्रामिंग डिफॉल्ट",
    "owner.exerciseLibrary.remove": "Remove",
    "owner.exerciseLibrary.removeTemplateBody": '"{{name}}" shared library से hidden हो जाएगा.',
    "owner.exerciseLibrary.removeTemplateTitle": "Template remove करें?",
    "owner.exerciseLibrary.reps": "Reps",
    "owner.exerciseLibrary.repsCount": "{{count}} reps",
    "owner.exerciseLibrary.restSec": "Rest sec",
    "owner.exerciseLibrary.saveTemplate": "Template save करें",
    "owner.exerciseLibrary.sets": "Sets",
    "owner.exerciseLibrary.setsCount": "{{count}} sets",
    "owner.exerciseLibrary.shared": "Shared",
    "owner.exerciseLibrary.sharedLibrary": "Shared library",
    "owner.exerciseLibrary.sharedTemplates": "Shared",
    "owner.exerciseLibrary.starter": "Starter",
    "owner.exerciseLibrary.starterTemplates": "Starters",
    "owner.exerciseLibrary.starters": "Starters",
    "owner.exerciseLibrary.subtitle":
      "Shared workout templates जिन्हें trainers reuse कर सकते हैं.",
    "owner.exerciseLibrary.tempo": "Tempo",
    "owner.exerciseLibrary.title": "Exercise library",
    "owner.coupons.active": "सक्रिय",
    "owner.coupons.activeOffers": "{{count}} सक्रिय",
    "owner.coupons.amountOffInput": "छूट राशि (₹)",
    "owner.coupons.amountOffValue": "{{amount}} छूट",
    "owner.coupons.code": "कोड",
    "owner.coupons.coupons": "कूपन",
    "owner.coupons.createCoupon": "कूपन बनाएं",
    "owner.coupons.discount": "छूट",
    "owner.coupons.edit": "बदलें",
    "owner.coupons.editAccessibility": "{{code}} बदलें",
    "owner.coupons.editCoupon": "कूपन बदलें",
    "owner.coupons.flatInrOff": "फ्लैट ₹ छूट",
    "owner.coupons.maxRedemptions": "अधिकतम उपयोग",
    "owner.coupons.newCoupon": "नया कूपन",
    "owner.coupons.noCouponsYet": "अभी कोई कूपन नहीं",
    "owner.coupons.noCouponsYetBody": "ऑफर चलाने के लिए छूट कोड बनाएं.",
    "owner.coupons.paused": "रोका गया",
    "owner.coupons.pausedOffers": "{{count}} रुके",
    "owner.coupons.perMember": "प्रति सदस्य",
    "owner.coupons.perMemberLimit": "{{count}}/सदस्य",
    "owner.coupons.percentOff": "प्रतिशत छूट",
    "owner.coupons.percentOffInput": "प्रतिशत छूट (%)",
    "owner.coupons.percentOffValue": "{{value}}% छूट",
    "owner.coupons.redemptions": "उपयोग",
    "owner.coupons.redemptionLimits": "उपयोग सीमा",
    "owner.coupons.remove": "हटाएं",
    "owner.coupons.removeCouponBody": '"{{code}}" अब इस्तेमाल नहीं होगा.',
    "owner.coupons.removeCouponTitle": "कूपन हटाएं?",
    "owner.coupons.saveChanges": "बदलाव सेव करें",
    "owner.coupons.subtitle": "वे छूट कोड जिन्हें सदस्य checkout पर लगा सकते हैं.",
    "owner.coupons.title": "कूपन और ऑफर",
    "owner.coupons.unlimited": "कोई सीमा नहीं",
    "owner.coupons.usedCount": "{{count}} उपयोग",
    "owner.coupons.usedWithLimit": "{{used}}/{{limit}} उपयोग",
    "owner.plans.createPlan": "प्लान बनाएं",
    "owner.plans.dateRange": "तारीख सीमा",
    "owner.plans.daysCount": "{{count}} दिन",
    "owner.plans.duration": "अवधि",
    "owner.plans.durationDays": "अवधि (दिन)",
    "owner.plans.edit": "बदलें",
    "owner.plans.editAccessibility": "{{name}} edit करें",
    "owner.plans.editPlan": "प्लान बदलें",
    "owner.plans.hidden": "छिपा हुआ",
    "owner.plans.hiddenDrafts": "छिपे ड्राफ्ट",
    "owner.plans.hybrid": "मिश्रित",
    "owner.plans.newPlan": "नया प्लान",
    "owner.plans.noPlansYet": "अभी कोई प्लान नहीं",
    "owner.plans.noPlansYetBody": "अपना पहला सदस्यता प्लान बनाएं.",
    "owner.plans.planLimits": "प्लान सीमा",
    "owner.plans.planName": "प्लान नाम",
    "owner.plans.planNamePlaceholder": "Monthly Active",
    "owner.plans.plans": "प्लान",
    "owner.plans.priceInr": "कीमत (₹)",
    "owner.plans.publicPlans": "सार्वजनिक प्लान",
    "owner.plans.remove": "हटाएं",
    "owner.plans.removePlanBody": 'सदस्य अब "{{name}}" नहीं खरीद पाएंगे.',
    "owner.plans.removePlanTitle": "प्लान हटाएं?",
    "owner.plans.saveChanges": "बदलाव सेव करें",
    "owner.plans.showPublicly": "सदस्यों को दिखाएं",
    "owner.plans.subtitle": "वे प्लान जिन्हें सदस्य आपके जिम में खरीद सकते हैं.",
    "owner.plans.title": "सदस्यता प्लान",
    "owner.plans.totalPlans": "कुल {{count}}",
    "owner.plans.trial": "ट्रायल",
    "owner.plans.type": "प्रकार",
    "owner.plans.visitPack": "विजिट पैक",
    "owner.plans.visits": "विजिट",
    "owner.plans.visitsCount": "{{count}} विजिट",
    "owner.billing.activeMembers": "सक्रिय सदस्य",
    "owner.billing.activeMembersCopy": "{{count}} {{noun}} आपके प्लान की सीमा में गिने जाते हैं",
    "owner.billing.aiImages": "AI इमेज",
    "owner.billing.aiText": "AI टेक्स्ट",
    "owner.billing.autopay": "ऑटोपे",
    "owner.billing.branches": "शाखाएं",
    "owner.billing.cancel": "रद्द करें",
    "owner.billing.cancelAtPeriodEnd": "पीरियड खत्म होने पर रद्द करें",
    "owner.billing.cancelSubscriptionBody":
      "Subscription period end पर cancel होने के लिए mark होगा.",
    "owner.billing.cancelSubscriptionTitle": "सब्सक्रिप्शन रद्द करें?",
    "owner.billing.cancellationRequested": "सब्सक्रिप्शन रद्द करने का अनुरोध भेजा गया.",
    "owner.billing.couldNotCancelSubscription": "सब्सक्रिप्शन रद्द नहीं हो सका.",
    "owner.billing.couldNotOpenPlanCheckout": "प्लान checkout नहीं खुल सका.",
    "owner.billing.couldNotStartBillingSetup": "बिलिंग setup शुरू नहीं हो सका.",
    "owner.billing.count": "गिने",
    "owner.billing.counts": "गिने",
    "owner.billing.currentPlanLimits": "प्लान सीमाएं",
    "owner.billing.currentPlanLimitsBody":
      "Limits gym size, team size, branches, inventory, messages और AI usage पर लागू हैं.",
    "owner.billing.keep": "जारी रखें",
    "owner.billing.mandate": "पेमेंट मैंडेट",
    "owner.billing.member": "सदस्य",
    "owner.billing.members": "सदस्य",
    "owner.billing.messages": "मैसेज",
    "owner.billing.month": "माह",
    "owner.billing.monthly": "मासिक",
    "owner.billing.nextBilling": "अगली बिलिंग",
    "owner.billing.nextCharge": "अगला चार्ज",
    "owner.billing.needsSetup": "Setup चाहिए",
    "owner.billing.noPaymentMandate": "Payment mandate set up नहीं है.",
    "owner.billing.notAvailable": "उपलब्ध नहीं",
    "owner.billing.openingBillingSetup": "Billing setup खुल रहा है.",
    "owner.billing.openingPlanCheckout": "Plan checkout खुल रहा है.",
    "owner.billing.planName": "{{name}} प्लान",
    "owner.billing.platformReferral": "प्लैटफॉर्म रेफरल",
    "owner.billing.products": "प्रोडक्ट",
    "owner.billing.referralPartnerships": "{{count}} gym referral partnerships recorded.",
    "owner.billing.reports": "रिपोर्ट",
    "owner.billing.resumeSetup": "Setup जारी रखें",
    "owner.billing.select": "चुनें",
    "owner.billing.setUpMandate": "मैंडेट setup करें",
    "owner.billing.sixMonths": "6 महीने",
    "owner.billing.staff": "स्टाफ",
    "owner.billing.ready": "तैयार",
    "owner.billing.statusActive": "सक्रिय",
    "owner.billing.statusCancelled": "रद्द",
    "owner.billing.statusDeleted": "हटाया गया",
    "owner.billing.statusMissing": "मौजूद नहीं",
    "owner.billing.statusPaymentPending": "पेमेंट लंबित",
    "owner.billing.statusPaused": "रोका गया",
    "owner.billing.statusSuspended": "निलंबित",
    "owner.billing.statusTrialActive": "ट्रायल सक्रिय",
    "owner.billing.statusTrialExpired": "ट्रायल समाप्त",
    "owner.billing.statusTrialExpiring": "ट्रायल जल्द समाप्त",
    "owner.billing.support": "सपोर्ट",
    "owner.billing.subscription": "सब्सक्रिप्शन",
    "owner.billing.title": "बिलिंग",
    "owner.billing.trainers": "ट्रेनर",
    "owner.billing.trialEnds": "ट्रायल खत्म",
    "owner.billing.upgradePlan": "प्लान अपग्रेड करें",
    "owner.billing.upgradePlanBody": "वेब बिलिंग वाले वही SaaS tier चुनें.",
    "owner.billing.year": "साल",
    "owner.billing.yearly": "वार्षिक",
    "owner.payouts.baseMonthly": "मासिक बेस (₹)",
    "owner.payouts.confirmBody": "{{period}} के लिए {{amount}} को भुगतान मानें.",
    "owner.payouts.confirmTitle": "{{name}} को भुगतान करें?",
    "owner.payouts.earningLines": "{{count}} कमाई लाइन",
    "owner.payouts.emptyBody": "ट्रेनर की कमाई जुड़ते ही यहां दिखेगी.",
    "owner.payouts.emptyTitle": "अभी कोई पेआउट नहीं",
    "owner.payouts.hideSettings": "पेआउट सेटिंग्स छिपाएं",
    "owner.payouts.markPaid": "भुगतान हो गया",
    "owner.payouts.marking": "मार्क हो रहा है...",
    "owner.payouts.outstanding": "इस महीने बाकी",
    "owner.payouts.paid": "भुगतान हो गया",
    "owner.payouts.payableTrainers": "भुगतान योग्य ट्रेनर",
    "owner.payouts.payDay": "भुगतान दिन (1-28)",
    "owner.payouts.perSession": "प्रति सेशन (₹)",
    "owner.payouts.ptCommission": "PT कमीशन (%)",
    "owner.payouts.saveSettings": "सेटिंग्स सेव करें",
    "owner.payouts.settings": "पेआउट सेटिंग्स",
    "owner.payouts.subtitle": "अपने कोच की समीक्षा और भुगतान करें.",
    "owner.payouts.thisMonth": "इस महीने",
    "owner.payouts.thisMonthLower": "इस महीने",
    "owner.payouts.title": "ट्रेनर पेआउट",
    "owner.payouts.trainerFallback": "ट्रेनर",
    "owner.payouts.trainerLower": "ट्रेनर",
    "owner.stock.allInStock": "सभी प्रोडक्ट स्टॉक में हैं",
    "owner.stock.allInStockBody": "जिन आइटम का स्टॉक कम होगा, वे यहां दिखेंगे.",
    "owner.stock.collectPayment": "पेमेंट लें",
    "owner.stock.collectPaymentBody": "{{count}} ऑर्डर को पिकअप से पहले पेमेंट चाहिए.",
    "owner.stock.collectPaymentDone": "कोई unpaid shop order waiting नहीं है.",
    "owner.stock.leftThreshold": "{{stock}} बचे · सीमा {{threshold}}",
    "owner.stock.left": "बचे",
    "owner.stock.lowStock": "कम स्टॉक",
    "owner.stock.memberPickup": "मेंबर पिकअप",
    "owner.stock.noPickups": "कोई पिकअप बाकी नहीं",
    "owner.stock.noPickupsBody": "कलेक्शन के लिए तैयार paid shop orders यहां दिखेंगे.",
    "owner.stock.paidOrders": "पेड ऑर्डर",
    "owner.stock.pickupOrders": "पिकअप ऑर्डर",
    "owner.stock.pickupPending": "पिकअप लंबित",
    "owner.stock.pickups": "पिकअप",
    "owner.stock.productsToReorder": "रीऑर्डर वाले प्रोडक्ट",
    "owner.stock.reorder": "रीऑर्डर",
    "owner.stock.reorderAccessibility": "{{name}} reorder करें",
    "owner.stock.reorderBody":
      "Hi,\n\nकृपया {{name}} के supplier options share करें.\n\nCurrent stock: {{stock}}\nThreshold: {{threshold}}\n\nThanks.",
    "owner.stock.reorderSubject": "{{name}} रीऑर्डर",
    "owner.stock.reorderStock": "स्टॉक रीऑर्डर करें",
    "owner.stock.reorderStockBody": "{{count}} प्रोडक्ट सीमा पर या उससे कम हैं.",
    "owner.stock.reorderStockDone": "कोई प्रोडक्ट सीमा से कम नहीं है.",
    "owner.stock.reorderNow": "अभी reorder करें",
    "owner.stock.todayWork": "आज का स्टॉक काम",
    "owner.stock.thresholdShort": "Min {{threshold}}",
    "owner.stock.title": "स्टॉक",
    "owner.stock.underThreshold": "सीमा से कम",
    "owner.stock.verifyPickup": "पिकअप सत्यापित करें",
    "owner.stock.verifyPickupBody": "{{count}} paid orders handoff के लिए ready हैं.",
    "owner.stock.verifyPickupDone": "कोई मेंबर पिकअप बाकी नहीं है.",
    "owner.staff.admin": "एडमिन",
    "owner.staff.admins": "एडमिन",
    "owner.staff.changeRole": "भूमिका बदलें",
    "owner.staff.email": "ईमेल",
    "owner.staff.invite": "आमंत्रित करें",
    "owner.staff.inviteStaffMember": "स्टाफ सदस्य को आमंत्रित करें",
    "owner.staff.invited": "आमंत्रित",
    "owner.staff.noStaffBody": "अपना पहला एडमिन या ट्रेनर आमंत्रित करें.",
    "owner.staff.noStaffYet": "अभी कोई स्टाफ नहीं",
    "owner.staff.owner": "मालिक",
    "owner.staff.pendingInvites": "{{count}} लंबित",
    "owner.staff.reception": "रिसेप्शन",
    "owner.staff.receptionWebHint": "रिसेप्शन स्टाफ को वेब डैशबोर्ड से शाखा दी जाती है.",
    "owner.staff.remove": "हटाएं",
    "owner.staff.removeBody": "{{name}} इस जिम का एक्सेस खो देगा.",
    "owner.staff.removeTitle": "स्टाफ सदस्य हटाएं?",
    "owner.staff.role": "भूमिका",
    "owner.staff.sendInvite": "आमंत्रण भेजें",
    "owner.staff.sending": "भेजा जा रहा है...",
    "owner.staff.staffMember": "स्टाफ सदस्य",
    "owner.staff.subtitle": "आपके जिम के एडमिन, ट्रेनर और रिसेप्शन.",
    "owner.staff.team": "टीम",
    "owner.staff.title": "स्टाफ",
    "owner.staff.totalStaff": "कुल {{count}}",
    "owner.staff.trainer": "ट्रेनर",
    "owner.staff.trainers": "ट्रेनर",
    "owner.dashboard.activeCount": "{{count}} सक्रिय",
    "owner.dashboard.attendance7Days": "हाज़िरी · 7 दिन",
    "owner.dashboard.chartAccessibility": "डैशबोर्ड चार्ट",
    "owner.dashboard.collapseTrends": "ट्रेंड विवरण छिपाएं",
    "owner.dashboard.expandTrends": "ट्रेंड विवरण दिखाएं",
    "owner.dashboard.members30Days": "सदस्य · 30 दिन",
    "owner.dashboard.noActiveMemberPlans": "कोई सक्रिय सदस्य प्लान नहीं.",
    "owner.dashboard.planMix": "प्लान मिक्स",
    "owner.dashboard.revenue7Days": "कमाई · 7 दिन",
    "owner.dashboard.trends": "ट्रेंड",
    "owner.dashboard.trendsSubtitle": "कमाई, हाज़िरी और सदस्य बदलाव",
    "reception.desk.active": "Active",
    "reception.desk.branch": "Branch",
    "reception.desk.coachName": "Coach {{name}}",
    "reception.desk.code": "Code",
    "reception.desk.displayEntryQr": "Entry QR",
    "reception.desk.enterCode": "Code डालें",
    "reception.desk.flagged": "Flagged",
    "reception.desk.gateQueueClear": "Gate queue clear",
    "reception.desk.needsApprovalQueue": "Needs Approval queue",
    "reception.desk.noCheckIns": "अभी कोई check-in नहीं",
    "reception.desk.noCheckInsBody": "आज के member check-ins यहां दिखेंगे.",
    "reception.desk.openApprovalQueue": "Approval queue खोलें",
    "reception.desk.pending": "Pending",
    "reception.desk.pendingCount": "{{count}} pending",
    "reception.desk.queueClear": "Desk queue clear",
    "reception.desk.queueClearBody": "कोई pending या flagged scan desk attention नहीं चाहता.",
    "reception.desk.queueMeta": "{{pending}} pending · {{flagged}} flagged",
    "reception.desk.queueNeedsAction": "Desk queue को action चाहिए",
    "reception.desk.queueNeedsActionBody":
      "Pending और flagged entry attempts age out होने से पहले review करें.",
    "reception.desk.recentActivity": "Recent activity",
    "reception.desk.referGym": "Gym refer करें और earn करें",
    "reception.desk.referGymAccessibility": "Zook को gym refer करें और earn करें",
    "reception.desk.referGymBody": "आपके refer किए gym के subscribe करने पर cash earn करें",
    "reception.desk.reviewRequired": "Review required",
    "reception.desk.statusApproved": "Approved",
    "reception.desk.statusFailed": "Failed",
    "reception.desk.statusPendingApproval": "Review चाहिए",
    "reception.desk.statusRejected": "Rejected",
    "reception.desk.statusRecorded": "Recorded",
    "reception.desk.today": "आज",
    "reception.desk.todayCount": "{{count}} today",
    "reception.desk.todaysClasses": "आज की classes",
    "reception.desk.verifying": "Verify हो रहा है...",
    "reception.desk.verifyCode": "Code verify करें",
    "reception.desk.verifyEntryCode": "Entry code verify करें",
    "reception.desk.viewRosterFor": "{{name}} का roster देखें",
    "reception.workspace.backToOwnerTools": "Owner tools पर वापस",
    "reception.workspace.goBack": "वापस जाएं",
    "reception.workspace.activeBranchSuffix": "{{name}} (active)",
    "reception.workspace.activeGymFallback": "Active gym",
    "reception.workspace.addAttendanceNote": "Attendance note जोड़ें, फिर record करें.",
    "reception.workspace.alreadyCheckedInToday": "यह member आज पहले से checked in है.",
    "reception.workspace.approveFailed": "Approve नहीं हो सका. फिर कोशिश करें.",
    "reception.workspace.approvedScanReason": "Reception ने review के बाद scan approve किया",
    "reception.workspace.authenticationRequiredAction":
      "यह action करने के लिए authentication जरूरी है.",
    "reception.workspace.bulkRecorded": "{{count}} {{memberLabel}} के लिए attendance record हुई.",
    "reception.workspace.bulkRecordedMany": "{{count}} सदस्यों की उपस्थिति दर्ज हुई.",
    "reception.workspace.bulkRecordedOne": "1 सदस्य की उपस्थिति दर्ज हुई.",
    "reception.workspace.bulkRecordedPartial":
      "{{total}} में से {{successes}} दर्ज हुए. {{failures}} असफल रहे.",
    "reception.workspace.checkInApproved": "चेक-इन स्वीकृत हो गया.",
    "reception.workspace.checkInNotValid": "चेक-इन मान्य नहीं है",
    "reception.workspace.checkInRejected": "चेक-इन अस्वीकार हो गया.",
    "reception.workspace.checkInVerified": "चेक-इन सत्यापित",
    "reception.workspace.couldNotRecordOne": "एक एंट्री दर्ज नहीं हो सकी.",
    "reception.workspace.deskApprovalRequired": "डेस्क स्वीकृति जरूरी है.",
    "reception.workspace.enterCodeFirst": "पहले कोड डालें.",
    "reception.workspace.entryCode": "एंट्री कोड",
    "reception.workspace.entryCodeInvalidMessage":
      "{{name}} का एंट्री कोड मिला, पर एंट्री के लिए मान्य नहीं है.",
    "reception.workspace.fulfillFailed": "यह ऑर्डर पूरा नहीं हो सका.",
    "reception.workspace.fulfillPickupAuth": "कोड के बिना पिकअप पूरा करें",
    "reception.workspace.fulfillPickupReason":
      "रिसेप्शन ने लोकल री-ऑथ के बाद पिकअप मैन्युअली पूरा किया.",
    "reception.workspace.mainBranchFallback": "मुख्य ब्रांच",
    "reception.workspace.manualAttendanceRecorded": "मैन्युअल अटेंडेंस दर्ज हो गई.",
    "reception.workspace.memberCheckInFallback": "मेंबर चेक-इन",
    "reception.workspace.memberFallback": "मेंबर",
    "reception.workspace.membershipAlreadyActive":
      "यह मेंबरशिप पहले से सक्रिय है. पेंडिंग सब्सक्रिप्शन चुनें या नया मैन्युअल एक्टिवेशन बनाएं.",
    "reception.workspace.membershipFallback": "मेंबरशिप",
    "reception.workspace.noActiveCode": "कोई सक्रिय एंट्री या पिकअप कोड नहीं.",
    "reception.workspace.notValidForEntry": "एंट्री के लिए मान्य नहीं",
    "reception.workspace.onlyOneBranchBody": "इस जिम में बदलने के लिए कोई और ब्रांच नहीं है.",
    "reception.workspace.onlyOneBranchTitle": "सिर्फ एक ब्रांच",
    "reception.workspace.orderTotalDetail": "ऑर्डर कुल: {{amount}}",
    "reception.workspace.ownerApprovalRequired": "ओनर स्वीकृति जरूरी है",
    "reception.workspace.ownerDesk": "ओनर डेस्क",
    "reception.workspace.paymentRecorded": "{{amount}} {{mode}} से दर्ज हुआ.",
    "reception.workspace.pickedBadge": "पिक हुआ",
    "reception.workspace.pickupFulfilled": "पिकअप पूरा हो गया.",
    "reception.workspace.pickupNotReady": "पिकअप तैयार नहीं है",
    "reception.workspace.pickupStatusTitle": "पिकअप {{status}}",
    "reception.workspace.pickupVerified": "पिकअप वेरिफाई हुआ",
    "reception.workspace.pickupVerifiedFor": "{{name}} का पिकअप वेरिफाई हुआ",
    "reception.workspace.recordManualAttendanceAuth": "मैन्युअल अटेंडेंस दर्ज करें",
    "reception.workspace.recordManualPaymentAuth": "मैन्युअल भुगतान दर्ज करें",
    "reception.workspace.recording": "दर्ज हो रहा है...",
    "reception.workspace.receptionDesk": "रिसेप्शन डेस्क",
    "reception.workspace.rejectFailed": "अस्वीकार नहीं हो सका. फिर कोशिश करें.",
    "reception.workspace.rejectedScanReason": "रिसेप्शन ने समीक्षा के बाद स्कैन अस्वीकार किया",
    "reception.workspace.selectedBadge": "चुना गया",
    "reception.workspace.signInSelectGymVerify":
      "वेरिफाई करने से पहले साइन इन करें और जिम चुनें.",
    "reception.workspace.statusDetail": "स्थिति: {{status}}",
    "reception.workspace.switchBranchBody": "आप जिस ब्रांच पर हैं उसे चुनें.",
    "reception.workspace.switchBranchTitle": "ब्रांच बदलें",
    "reception.workspace.verifiedName": "{{name}} वेरिफाई हुआ",
    "reception.workspace.verifyCodeFailed": "यह कोड वेरिफाई नहीं हो सका.",
    "reception.workspace.verifyFailedTitle": "वेरिफिकेशन फेल हुआ",
    "reception.workspace.verificationFailed": "वेरिफिकेशन फेल हुआ.",
    "reception.workspace.verificationSuccessful": "वेरिफिकेशन सफल हुआ.",
    "reception.home.title": "रिसेप्शन डेस्क",
    "reception.members.attendanceNote": "अटेंडेंस नोट",
    "reception.members.auditReason": "कारण जोड़ें ताकि जिम के पास साफ रिकॉर्ड रहे.",
    "reception.members.clearSelectedMember": "चुना हुआ मेंबर हटाएं",
    "reception.members.clear": "हटाएं",
    "reception.members.deskActions": "Desk actions",
    "reception.members.generalFitness": "General fitness",
    "reception.members.hiddenHint":
      "{{visible}} of {{total}} matches दिख रहे हैं. Specific member जल्दी ढूंढने के लिए search refine करें.",
    "reception.members.memberTitle": "Member",
    "reception.members.membership": "Membership",
    "reception.members.multiSelectCount": "Multi-select · {{count}}",
    "reception.members.noMembers": "कोई member नहीं",
    "reception.members.noMembersBody": "अलग नाम या email try करें.",
    "reception.members.noMembership": "No membership",
    "reception.members.reasonTooShort": "कम से कम 2 characters जोड़ें.",
    "reception.members.recordAttendance": "Attendance record करें",
    "reception.members.recordForAll": "सभी के लिए record करें",
    "reception.members.recording": "Record हो रहा है...",
    "reception.members.searchOrSelect": "Member search या select करें",
    "reception.members.selectMultiple": "Multiple select करें",
    "reception.members.selectedCount": "{{count}} members selected",
    "reception.members.title": "Members",
    "reception.orders.confirmPickedUpBody":
      "{{name}} को {{amount}} के लिए collected mark किया जाएगा.",
    "reception.orders.confirmPickedUpTitle": "Order picked up mark करें?",
    "reception.orders.done": "Done",
    "reception.orders.enterPickupCode": "Pickup code डालें",
    "reception.orders.fulfillmentQueue": "Fulfillment queue",
    "reception.orders.itemCount": "{{count}} items",
    "reception.orders.markPickedUp": "Picked up mark करें",
    "reception.orders.noPickupsBody": "Collection के लिए ready paid shop orders यहां दिखेंगे.",
    "reception.orders.pickupCode": "Pickup code",
    "reception.orders.pickupVerification": "Pickup verification",
    "reception.orders.pickupVerificationBody": "Order देने से पहले code और member match करें.",
    "reception.orders.ready": "Ready",
    "reception.orders.statusCancelled": "रद्द",
    "reception.orders.statusFailed": "असफल",
    "reception.orders.statusFulfilled": "पिकअप हो गया",
    "reception.orders.statusPaid": "Paid",
    "reception.orders.statusPendingPayment": "Payment pending",
    "reception.orders.statusRefunded": "रिफंड",
    "reception.orders.thisMember": "यह member",
    "reception.orders.title": "Orders",
    "reception.orders.verifyPickupCode": "Pickup code verify करें",
    "reception.payments.activeDesk": "सक्रिय डेस्क",
    "reception.payments.additionalDetails": "अतिरिक्त जानकारी",
    "reception.payments.amount": "राशि",
    "reception.payments.amountInvalid": "0 से बड़ी राशि दर्ज करें.",
    "reception.payments.amountReceived": "मिली राशि",
    "reception.payments.auditWarning":
      "सभी offline payments audit log में जाते हैं. Record करने से पहले payment मिलना पक्का करें.",
    "reception.payments.changeMember": "मेंबर बदलें",
    "reception.payments.collection": "पेमेंट कलेक्शन",
    "reception.payments.collectionMode": "पेमेंट मोड",
    "reception.payments.desk": "डेस्क",
    "reception.payments.deskNote": "डेस्क नोट",
    "reception.payments.deskNotePlaceholder": "Finance team के लिए जरूरी बात",
    "reception.payments.due": "बकाया",
    "reception.payments.dueAmount": "{{amount}} बकाया",
    "reception.payments.findMember": "मेंबर ढूंढें",
    "reception.payments.invoice": "इनवॉइस",
    "reception.payments.memberPayment": "Reception मेंबर पेमेंट",
    "reception.payments.membershipSelected": "{{status}} मेंबरशिप selected",
    "reception.payments.missing": "नहीं मिला",
    "reception.payments.mode": "मोड",
    "reception.payments.modeBank": "बैंक",
    "reception.payments.modeCard": "कार्ड",
    "reception.payments.modeCash": "कैश",
    "reception.payments.modeManual": "मैनुअल",
    "reception.payments.modeUpi": "डायरेक्ट UPI",
    "reception.payments.newPayment": "नई पेमेंट",
    "reception.payments.noContact": "कॉन्टैक्ट नहीं है",
    "reception.payments.noAdditionalDetails": "रेफरेंस या नोट नहीं है",
    "reception.payments.noMembershipSelected": "कोई मेंबरशिप चुनी नहीं गई",
    "reception.payments.noPlan": "कोई प्लान नहीं",
    "reception.payments.recordPayment": "पेमेंट रिकॉर्ड करें",
    "reception.payments.reference": "रसीद या रेफरेंस",
    "reception.payments.referencePlaceholder": "UPI रेफ, बैंक UTR, कार्ड स्लिप",
    "reception.payments.reviewConsequence":
      "इसे तभी record करें जब cash, UPI, card या bank transfer desk पर मिल चुका हो.",
    "reception.payments.reviewTitle": "डेस्क पेमेंट रिव्यू",
    "reception.payments.searchPlaceholder": "नाम, email, या phone",
    "reception.payments.selectMember": "मेंबर चुनें",
    "reception.payments.selectMemberAccessibility": "{{name}} चुनें",
    "reception.payments.selectMemberFirst": "पहले मेंबर चुनें",
    "reception.payments.staffNote": "स्टाफ नोट",
    "reception.payments.subtitle": "Reception",
    "reception.payments.verified": "Verified",
    "reception.verification.title": "Verification",
    "reception.decision.addDeskNote": "इस scan को approve या reject करने से पहले desk note जोड़ें.",
    "reception.decision.approve": "Approve",
    "reception.decision.approving": "Approve हो रहा है...",
    "reception.decision.close": "Close",
    "reception.decision.closeSheet": "Decision sheet बंद करें",
    "reception.decision.memberCheckIn": "Member check-in",
    "reception.decision.reason": "Decision reason",
    "reception.decision.reject": "Reject",
    "reception.decision.rejecting": "Reject हो रहा है...",
    "attendance.mutation.approved": "Attendance approve हो गई.",
    "attendance.mutation.approveFailed": "Attendance approve नहीं हो सकी.",
    "attendance.mutation.manualRecorded": "Manual check-in record हो गया.",
    "attendance.mutation.manualFailed": "Manual check-in record नहीं हो सका.",
    "attendance.mutation.rejected": "Attendance reject हो गई.",
    "attendance.mutation.rejectFailed": "Attendance reject नहीं हो सकी.",
    "owner.referrals.allowTrainerReferrals": "ट्रेनर रेफरल चालू करें",
    "owner.referrals.codeExpiryDays": "कोड की वैधता (दिन)",
    "owner.referrals.creditInr": "क्रेडिट (₹)",
    "owner.referrals.discountInr": "छूट ₹",
    "owner.referrals.discountPercent": "छूट %",
    "owner.referrals.enabled": "रेफरल चालू",
    "owner.referrals.enabledBody": "पूरा रेफरल प्रोग्राम चालू या बंद करें.",
    "owner.referrals.enabledShort": "चालू",
    "owner.referrals.flatInr": "फ्लैट ₹",
    "owner.referrals.freeDays": "मुफ्त दिन",
    "owner.referrals.limits": "सीमाएं",
    "owner.referrals.limitSummary": "{{count}}/माह · {{days}} दिन",
    "owner.referrals.maxPerMemberMonth": "हर सदस्य / माह की सीमा",
    "owner.referrals.memberGymCreditBody":
      "रेफर किए गए जिम के साइन अप करने पर सदस्य को मिलने वाला क्रेडिट.",
    "owner.referrals.memberRefersMember": "सदस्य किसी सदस्य को लाए",
    "owner.referrals.memberRefersNewGym": "सदस्य नया जिम लाए",
    "owner.referrals.moreRules": "बाकी रेफरल नियम",
    "owner.referrals.moreRulesBody": "ट्रेनर रिवॉर्ड, नया जिम क्रेडिट और मासिक सीमा",
    "owner.referrals.newMemberGets": "नए सदस्य को मिलेगा",
    "owner.referrals.none": "कुछ नहीं",
    "owner.referrals.off": "बंद",
    "owner.referrals.paused": "रोका गया",
    "owner.referrals.percent": "प्रतिशत",
    "owner.referrals.program": "प्रोग्राम",
    "owner.referrals.referrerEarns": "रेफर करने वाले को मिलेगा",
    "owner.referrals.saveSettings": "रेफरल सेटिंग्स सेव करें",
    "owner.referrals.subtitle": "रेफरल पर किसे कितना रिवॉर्ड मिलेगा, यह सेट करें.",
    "owner.referrals.title": "रेफरल प्रोग्राम",
    "owner.referrals.trainerEarns": "ट्रेनर को मिलेगा",
    "owner.referrals.trainerRefersMember": "ट्रेनर सदस्य लाए",
    "owner.referrals.trainers": "ट्रेनर",
    "owner.referrals.visits": "विजिट",
    "owner.revenue.noPaymentsYet": "अभी कोई पेमेंट नहीं",
    "owner.revenue.noPaymentsYetBody": "पेमेंट और शॉप पिकअप आते ही यहां दिखेंगे.",
    "owner.revenue.paymentFallback": "पेमेंट",
    "owner.revenue.pickupPending": "पिकअप पेंडिंग",
    "owner.revenue.pickupValue": "पिकअप वैल्यू",
    "owner.revenue.pickupValueBody": "{{count}} शॉप पिकअप में {{amount}} के सदस्य ऑर्डर हैं.",
    "owner.revenue.pickupValueDone": "डेस्क पर कोई पिकअप वैल्यू बाकी नहीं है.",
    "owner.revenue.recentTransactions": "हाल के ट्रांजैक्शन",
    "owner.revenue.refund": "रिफंड",
    "owner.revenue.refundAccessibility": "{{name}} को रिफंड करें",
    "owner.revenue.refundPaymentBody":
      "{{name}} को {{amount}} रिफंड करें. इसे वापस नहीं किया जा सकता.",
    "owner.revenue.refundPaymentTitle": "पेमेंट रिफंड करें?",
    "owner.revenue.refundReview": "रिफंड समीक्षा",
    "owner.revenue.refundReviewBody": "{{count}} सफल पेमेंट फीड से रिफंड हो सकते हैं.",
    "owner.revenue.refundReviewDone": "कोई सफल पेमेंट रिफंड समीक्षा में नहीं है.",
    "owner.revenue.refundedByGym": "जिम द्वारा रिफंड",
    "owner.revenue.financeWork": "फाइनेंस काम",
    "owner.revenue.manualRecords": "डेस्क रिकॉर्ड",
    "owner.revenue.manualRecordsBody": "{{count}} डेस्क पेमेंट का दैनिक मिलान बाकी है.",
    "owner.revenue.manualRecordsDone": "कोई डेस्क पेमेंट मिलान में नहीं है.",
    "owner.revenue.manualRecordsWithAmount": "डेस्क रिकॉर्ड {{amount}}",
    "owner.revenue.revenueToday": "आज की कमाई",
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
    "trainer.clients.coachingFocus": "कोचिंग फोकस",
    "trainer.clients.coachingFocusBody":
      "पहले उन क्लाइंट से शुरू करें जिन्हें प्लान या फीडबैक रिव्यू चाहिए.",
    "trainer.clients.generalFitness": "सामान्य फिटनेस",
    "trainer.clients.nextClient": "अगला क्लाइंट",
    "trainer.clients.noClients": "कोई क्लाइंट नहीं",
    "trainer.clients.noClientsBody": "आपके जिम ने अभी कोई क्लाइंट असाइन नहीं किया.",
    "trainer.clients.noMatchingClients": "कोई मेल खाता क्लाइंट नहीं",
    "trainer.clients.openNextClient": "खोलें",
    "trainer.clients.searchClients": "क्लाइंट खोजें",
    "trainer.clients.subtitle": "आपके असाइन किए गए क्लाइंट",
    "trainer.clients.title": "क्लाइंट",
    "trainer.clients.total": "कुल {{count}}",
    "trainer.clients.tryAnotherSearch": "दूसरी खोज या फिल्टर आजमाएं.",
    "trainer.aiDraft.body":
      "आपके जिम ओनर सेटिंग्स में AI प्लान ड्राफ्टिंग चालू कर सकते हैं. तब तक आप प्लान मैन्युअली बना और एडिट कर सकते हैं.",
    "trainer.aiDraft.createManual": "प्लान मैन्युअली बनाएं",
    "trainer.aiDraft.title": "AI ड्राफ्टिंग बंद है",
    "trainer.classes.cancelBody":
      "जिन मेंबरों ने यह क्लास बुक की है उन्हें तुरंत सूचना मिलेगी. यह वापस नहीं होगा.",
    "trainer.classes.cancelClass": "क्लास कैंसल करें",
    "trainer.classes.cancelled": "कैंसल",
    "trainer.classes.cancelTitle": "{{name}} कैंसल करें?",
    "trainer.classes.capacity": "क्षमता",
    "trainer.classes.classDateAccessibility": "क्लास तारीख",
    "trainer.classes.className": "क्लास नाम",
    "trainer.classes.classNamePlaceholder": "Evening Strength Flow",
    "trainer.classes.date": "तारीख",
    "trainer.classes.editAccessibility": "{{name}} बदलें",
    "trainer.classes.editClass": "क्लास बदलें",
    "trainer.classes.keepClass": "क्लास रखें",
    "trainer.classes.loadingClasses": "क्लासेस लोड हो रही हैं...",
    "trainer.classes.loadingClassesBody": "थोड़ा रुकें, आपका शेड्यूल आ रहा है.",
    "trainer.classes.newClass": "नई क्लास",
    "trainer.classes.noClassesBody": "क्लास शेड्यूल करें, फिर मेंबर इसे बुक कर पाएंगे.",
    "trainer.classes.priceInr": "कीमत (₹)",
    "trainer.classes.saveChanges": "बदलाव सेव करें",
    "trainer.classes.schedule": "शेड्यूल",
    "trainer.classes.scheduleClass": "क्लास शेड्यूल करें",
    "trainer.classes.scheduling": "शेड्यूल हो रहा है...",
    "trainer.classes.subtitle": "सदस्य जिन group sessions को बुक कर सकें, उन्हें शेड्यूल करें.",
    "trainer.classes.time": "समय",
    "trainer.classes.title": "क्लासेस",
    "trainer.classes.type": "प्रकार",
    "trainer.classes.typeBoxing": "बॉक्सिंग",
    "trainer.classes.typeCycling": "साइक्लिंग",
    "trainer.classes.typeDance": "डांस",
    "trainer.classes.typeHiit": "HIIT",
    "trainer.classes.typeMobility": "मोबिलिटी",
    "trainer.classes.typeStrength": "स्ट्रेंथ",
    "trainer.classes.typeYoga": "योग",
    "trainer.classes.upcomingClasses": "आने वाली क्लास",
    "trainer.clientSessions.adherence": "पालन",
    "trainer.clientSessions.averageCompletion":
      "हालिया प्लान फीडबैक में {{percent}}% औसत पूरा हुआ.",
    "trainer.clientSessions.backToClients": "क्लाइंट्स पर वापस",
    "trainer.clientSessions.completePercent": "{{percent}}% पूरा",
    "trainer.clientSessions.durationMinutes": "{{minutes}} मिनट",
    "trainer.clientSessions.logged": "लॉग किया गया",
    "trainer.clientSessions.noDetails": "कोई विवरण नहीं जोड़ा गया.",
    "trainer.clientSessions.noPlans": "कोई प्लान नहीं",
    "trainer.clientSessions.planFeedback": "प्लान फीडबैक",
    "trainer.clientSessions.planProgress": "प्लान प्रगति",
    "trainer.clientSessions.title": "क्लाइंट विवरण",
    "trainer.clientSessions.waitingForFeedback": "Member feedback और workout logs का इंतजार है.",
    "trainer.clientDiet.addMeal": "मील जोड़ें",
    "trainer.clientDiet.breakfast": "नाश्ता",
    "trainer.clientDiet.dailyCalorieTarget": "रोज़ का कैलोरी लक्ष्य",
    "trainer.clientDiet.defaultTitle": "कोच्ड डाइट प्लान",
    "trainer.clientDiet.kcal": "{{kcal}} kcal",
    "trainer.clientDiet.kcalLabel": "kcal",
    "trainer.clientDiet.kcalTargetPrefix": "{{kcal}} kcal target · ",
    "trainer.clientDiet.mealCount": "{{count}} मील",
    "trainer.clientDiet.mealLabel": "मील {{index}}",
    "trainer.clientDiet.meals": "मील",
    "trainer.clientDiet.mealsPlanned": "{{count}} मील · {{kcal}} kcal प्लान",
    "trainer.clientDiet.dinner": "डिनर",
    "trainer.clientDiet.lunch": "लंच",
    "trainer.clientDiet.midMorning": "मिड-मॉर्निंग",
    "trainer.clientDiet.noPreviousPlan":
      "इस client के लिए अभी कोई plan published नहीं. पहला plan नीचे बनाएं.",
    "trainer.clientDiet.planTitle": "प्लान शीर्षक",
    "trainer.clientDiet.planTitlePlaceholder": "Muscle gain · Vegetarian",
    "trainer.clientDiet.preWorkout": "वर्कआउट से पहले",
    "trainer.clientDiet.previousPlan": "पिछला प्लान",
    "trainer.clientDiet.publish": "पब्लिश करें",
    "trainer.clientDiet.publishBody": "मेंबर इस प्लान को तुरंत अपने डाइट टैब में देखेगा.",
    "trainer.clientDiet.publishing": "पब्लिश हो रहा है...",
    "trainer.clientDiet.publishTitle": "डाइट प्लान पब्लिश करें?",
    "trainer.clientDiet.publishToClient": "क्लाइंट को पब्लिश करें",
    "trainer.clientDiet.subtitle": "क्लाइंट के लिए डाइट प्लान बनाएं और पब्लिश करें.",
    "trainer.clientDiet.title": "डाइट प्लान",
    "trainer.clientDetail.overviewTab": "ओवरव्यू",
    "trainer.clientDetail.planTab": "प्लान",
    "trainer.clientDetail.sessionsTab": "सेशन",
    "trainer.clientOverview.nextStep": "अगला कोचिंग कदम",
    "trainer.clientOverview.nextStepBody": "आज इस क्लाइंट को आगे बढ़ाने वाला एक्शन चुनें.",
    "trainer.clientOverview.reviewFeedback": "फीडबैक रिव्यू करें",
    "trainer.clientOverview.reviewFeedbackBody":
      "प्लान बदलने से पहले completion और हाल के workout notes देखें.",
    "trainer.clientOverview.reviewSessions": "सेशन रिव्यू करें",
    "trainer.clientOverview.reviewSessionsBody":
      "अभी कोई workout log नहीं है. हाल की ट्रेनिंग अपडेट लेने के लिए सेशन खोलें.",
    "trainer.clientPlan.assignedStatus": "{{title}} assign हुआ. {{name}} अब इसे देख सकता है.",
    "trainer.clientPlan.calories": "कैलोरी",
    "trainer.clientPlan.clientDietPlanPlaceholder": "{{name}} डाइट प्लान",
    "trainer.clientPlan.dietPlanPublished": "डाइट प्लान पब्लिश हुआ.",
    "trainer.clientPlan.dietPublishedStatus":
      "{{title}} पब्लिश हुआ. {{name}} अब मील लॉग कर सकता है.",
    "trainer.clientPlan.dietTitle": "डाइट शीर्षक",
    "trainer.clientPlan.draftPrompt":
      "{{title}} draft के रूप में save है. Assign करने से पहले review करें.",
    "trainer.clientPlan.draftSaved": "ड्राफ्ट सेव हुआ.",
    "trainer.clientPlan.exerciseGobletSquat": "Goblet squat",
    "trainer.clientPlan.exerciseMachineSetup": "Machine setup walkthrough",
    "trainer.clientPlan.exerciseNutritionCheckIn": "Nutrition check-in",
    "trainer.clientPlan.exerciseRecoveryMobility": "Recovery mobility flow",
    "trainer.clientPlan.exerciseTemplates": "एक्सरसाइज टेम्पलेट",
    "trainer.clientPlan.exerciseWeeklyRoutineReview": "Weekly routine review",
    "trainer.clientPlan.noDietPlanForClient":
      "{{name}} के लिए अभी कोई डाइट प्लान पब्लिश नहीं हुआ. नीचे नया प्लान शुरू करें.",
    "trainer.clientPlan.planAssigned": "प्लान असाइन हुआ.",
    "trainer.clientPlan.planBuilder": "प्लान बिल्डर",
    "trainer.clientPlan.planCouldNotBeCreated": "प्लान नहीं बन सका.",
    "trainer.clientPlan.proteinG": "प्रोटीन g",
    "trainer.clientPlan.proteinPrefix": "{{protein}}g protein · ",
    "trainer.clientPlan.publishBody": "मेंबर यह प्लान तुरंत देखेगा.",
    "trainer.clientPlan.publishFourMealDiet": "4-मील डाइट पब्लिश करें",
    "trainer.clientPlan.publishToClient": "{{name}} को पब्लिश करें",
    "trainer.clientPlan.publishToClientTitle": "{{name}} को पब्लिश करें?",
    "trainer.clientPlan.saveDraft": "ड्राफ्ट सेव करें",
    "trainer.clientPlan.savedDraftStatus": "{{title}} ड्राफ्ट के रूप में सेव हुआ.",
    "trainer.clientPlan.saveExerciseTemplate": "एक्सरसाइज को टेम्पलेट सेव करें",
    "trainer.clientPlan.selectClientBeforeAssigning": "असाइन करने से पहले क्लाइंट चुनें.",
    "trainer.clientPlan.selectClientBeforeDiet": "डाइट पब्लिश करने से पहले क्लाइंट चुनें.",
    "trainer.clientPlan.selectClientBeforeSaving": "सेव करने से पहले क्लाइंट चुनें.",
    "trainer.clientPlan.templateDiet": "डाइट",
    "trainer.clientPlan.templateMachine": "मशीन गाइड",
    "trainer.clientPlan.templateNotes": "टेम्पलेट नोट्स",
    "trainer.clientPlan.templateRecovery": "Recovery",
    "trainer.clientPlan.templateRoutine": "Routine",
    "trainer.clientPlan.templateWorkout": "Workout",
    "trainer.clientOverview.active": "सक्रिय",
    "trainer.clientOverview.activeMember": "सक्रिय मेंबर",
    "trainer.clientOverview.allergyNote": "एलर्जी नोट",
    "trainer.clientOverview.averagePlanCompletion": "{{percent}}% औसत प्लान completion",
    "trainer.clientOverview.baseline": "बेसलाइन",
    "trainer.clientOverview.bodyFatPercent": "Body fat %",
    "trainer.clientOverview.bodyProgressRecordedToast": "Body progress record हुआ.",
    "trainer.clientOverview.bodyProgressTrend": "बॉडी प्रोग्रेस ट्रेंड",
    "trainer.clientOverview.createFirstPlan": "पहला plan बनाएं",
    "trainer.clientOverview.dietNote": "डाइट नोट",
    "trainer.clientOverview.lastCheckIn": "आखिरी चेक-इन",
    "trainer.clientOverview.missing": "नहीं मिला",
    "trainer.clientOverview.needsFeedback": "फीडबैक चाहिए",
    "trainer.clientOverview.noLog": "कोई लॉग नहीं",
    "trainer.clientOverview.noneAdded": "कुछ नहीं जोड़ा",
    "trainer.clientOverview.noMeasurements": "अभी कोई measurement नहीं",
    "trainer.clientOverview.noMeasurementsBody":
      "इस client का trend track करने के लिए ऊपर body progress record करें.",
    "trainer.clientOverview.noWorkoutLogged": "कोई workout logged नहीं",
    "trainer.clientOverview.notAdded": "नहीं जोड़ा",
    "trainer.clientOverview.noteAudit":
      "Trainer notes केवल assigned trainers और owners/admins देख सकते हैं.",
    "trainer.clientOverview.noteSavedToast": "Trainer note save हुआ.",
    "trainer.clientOverview.notShared": "शेयर नहीं किया",
    "trainer.clientOverview.paused": "पॉज",
    "trainer.clientOverview.pausedMember": "पॉज मेंबर",
    "trainer.clientOverview.ptPack": "PT pack",
    "trainer.clientOverview.recordBodyProgress": "Body progress record करें",
    "trainer.clientOverview.saved": "सेव हुआ",
    "trainer.clientOverview.saveNote": "Note save करें",
    "trainer.clientOverview.shared": "शेयर किया",
    "trainer.clientOverview.tracked": "ट्रैक हुआ",
    "trainer.clientOverview.trainerNote": "ट्रेनर नोट",
    "trainer.clientOverview.trainerNotePlaceholder":
      "अपने follow-up के लिए coaching note जोड़ें...",
    "trainer.clientOverview.waistCm": "Waist cm",
    "trainer.clientOverview.weightKg": "Weight kg",
    "trainer.clientOverview.workoutPlan": "Workout plan",
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
    "trainer.payouts.breakdown": "कमाई का विवरण",
    "trainer.payouts.draft": "ड्राफ्ट",
    "trainer.payouts.earningLines": "{{count}} कमाई लाइन",
    "trainer.payouts.emptyBody": "आपके PT कमीशन और class payout यहां दिखेंगे.",
    "trainer.payouts.emptyTitle": "अभी कोई कमाई नहीं",
    "trainer.payouts.settings": "पेआउट सेटिंग्स",
    "trainer.payouts.settingsSubtitle": "कमाई, भुगतान दिन और UPI जानकारी",
    "trainer.payouts.thisMonthAccrued": "इस महीने की कमाई",
    "trainer.payouts.title": "पेआउट",
    "trainer.payoutSettings.baseMonthly": "महीने का बेस (₹)",
    "trainer.payoutSettings.bio": "बायो",
    "trainer.payoutSettings.bioPlaceholder":
      "सदस्यों को अपने coaching style के बारे में थोड़ा बताएं.",
    "trainer.payoutSettings.compensation": "कमाई",
    "trainer.payoutSettings.footnote": "बदलाव आपके अगले payout cycle से लागू होंगे.",
    "trainer.payoutSettings.payDay": "महीने का भुगतान दिन",
    "trainer.payoutSettings.payDayHint": "महीने का वह दिन जब payout process होता है (1-28).",
    "trainer.payoutSettings.payDayInvalid": "1 से 28 के बीच का दिन दर्ज करें.",
    "trainer.payoutSettings.perSessionFee": "हर सेशन फीस (₹)",
    "trainer.payoutSettings.perSessionFeeHint":
      "हर logged session के लिए credit होने वाली flat राशि.",
    "trainer.payoutSettings.profileUpi": "प्रोफाइल और UPI",
    "trainer.payoutSettings.ptCommission": "PT कमीशन (%)",
    "trainer.payoutSettings.ptCommissionHint": "Personal training revenue में आपका हिस्सा.",
    "trainer.payoutSettings.ptCommissionInvalid": "0 से 100 के बीच कमीशन दर्ज करें.",
    "trainer.payoutSettings.saveChanges": "बदलाव सेव करें",
    "trainer.payoutSettings.subtitle": "आपको payment कैसे मिले और आपकी UPI जानकारी सेट करें.",
    "trainer.payoutSettings.title": "पेआउट सेटिंग्स",
    "trainer.payoutSettings.upiHint":
      "जिम जरूरत पड़ने पर आपको सीधे pay करने के लिए इस्तेमाल करता है.",
    "trainer.payoutSettings.upiId": "UPI ID",
    "trainer.plans.activePlanWork": "सक्रिय प्लान",
    "trainer.plans.createPlan": "प्लान बनाएं",
    "trainer.plans.emptyBody": "जिन क्लाइंट को प्लान या अपडेट चाहिए वे यहां दिखेंगे.",
    "trainer.plans.emptyTitle": "अभी कोई प्लान काम नहीं",
    "trainer.plans.needsFirstPlan": "पहला प्लान चाहिए",
    "trainer.plans.needsFirstPlanBody":
      "पहले उन क्लाइंट से शुरू करें जिनके पास सक्रिय प्लान नहीं है.",
    "trainer.plans.queueClear": "प्लानिंग क्यू खाली",
    "trainer.plans.queueClearBody": "किसी क्लाइंट को अभी प्लान असाइनमेंट नहीं चाहिए.",
    "trainer.plans.clientDetail": "क्लाइंट विवरण",
    "trainer.plans.reviewActivePlans": "सक्रिय प्लान",
    "trainer.plans.reviewActivePlansBody":
      "बदलाव पब्लिश करने से पहले workouts, diet notes और feedback adjust करने के लिए हर क्लाइंट खोलें.",
    "trainer.plans.title": "प्लानिंग",
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

function localeForPreference(preference: LocalePreference): AppLocale {
  return preference === "system" ? systemLocale() : preference;
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
  const { mobileApiFetch } = await import("./api");
  await mobileApiFetch("/me/profile", {
    method: "PATCH",
    token,
    body: { preferredLocale: preference },
  });
}

export async function applySessionLocalePreference(value?: string | null) {
  const nextPreference = normalizePreference(value);
  runtimePreference = nextPreference;
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

export function translate(key: TranslationKey, values?: TranslationValues) {
  const locale = localeForPreference(runtimePreference);
  return interpolate(translations[locale][key] ?? translations.en[key] ?? key, values);
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState<LocalePreference>("system");
  const [hydrated, setHydrated] = useState(false);
  const locale = localeForPreference(preference);

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
          const nextPreference = normalizePreference(storedPreference);
          runtimePreference = nextPreference;
          setPreference(nextPreference);
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
    runtimePreference = nextPreference;
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
