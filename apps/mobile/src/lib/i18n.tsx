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
  | "common.actionFailed"
  | "common.datePicker"
  | "common.back"
  | "common.dismiss"
  | "common.done"
  | "common.or"
  | "common.saving"
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
  | "notifications.today"
  | "notifications.yesterday"
  | "notifications.earlierThisWeek"
  | "notifications.older"
  | "notifications.allCaughtUp"
  | "notifications.allCaughtUpRecent"
  | "notifications.allMarkedRead"
  | "notifications.attendanceAlertReceived"
  | "notifications.closeDetails"
  | "notifications.couldNotUpdate"
  | "notifications.couldNotUpdateMany"
  | "notifications.emptyBody"
  | "notifications.emptyTitle"
  | "notifications.fallbackTitle"
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
  | "notifications.unreadCount"
  | "notifications.unreadRecent"
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
  | "branch.switch"
  | "branch.current"
  | "branch.allBranches"
  | "shop.readyForPickup"
  | "shop.readyForPickupSubtitle"
  | "shop.addProductAccessibility"
  | "shop.availableAtGymDesk"
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
  | "shop.codeWithValue"
  | "shop.continuePayment"
  | "shop.continueInBrowser"
  | "shop.confirming"
  | "shop.copyPickupCodeAccessibility"
  | "shop.couldNotCreateCheckout"
  | "shop.backToShop"
  | "shop.payment"
  | "shop.paymentSubtitle"
  | "shop.paymentConfirmed"
  | "shop.paymentCouldNotComplete"
  | "shop.paymentStillPending"
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
  | "shop.outOfStock"
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
  | "findGyms.city"
  | "findGyms.coverPhoto"
  | "findGyms.discovery"
  | "findGyms.gymNameOrUsername"
  | "findGyms.noGyms"
  | "findGyms.noGymsBody"
  | "findGyms.openGym"
  | "findGyms.referralApplied"
  | "findGyms.referralPrefix"
  | "findGyms.referralSuffix"
  | "findGyms.resultCountMany"
  | "findGyms.resultCountOne"
  | "findGyms.searching"
  | "findGyms.title"
  | "findGyms.view"
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
  | "gymProfile.paymentStarted"
  | "gymProfile.pendingSince"
  | "gymProfile.photoOf"
  | "gymProfile.planAvailableMany"
  | "gymProfile.planAvailableOne"
  | "gymProfile.referralApplied"
  | "gymProfile.referralInviteRequired"
  | "gymProfile.referralPrice"
  | "gymProfile.requestMembershipFirst"
  | "gymProfile.requestMembershipFirstBody"
  | "gymProfile.reviewed"
  | "gymProfile.securePayment"
  | "gymProfile.sendMembershipRequest"
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
  | "gymProfile.visitsRemaining"
  | "gymProfile.whatsInside"
  | "empty.loading"
  | "empty.loadingBody"
  | "tracking.bodyTimeline"
  | "tracking.bodyTimelineSubtitle"
  | "tracking.armsCm"
  | "tracking.body"
  | "tracking.bodyFatPercent"
  | "tracking.bodyMeasurements"
  | "tracking.bodyMeasurementsSaved"
  | "tracking.bodyProgress"
  | "tracking.calfCm"
  | "tracking.calvesCm"
  | "tracking.chestCm"
  | "tracking.couldNotSaveMeasurements"
  | "tracking.couldNotSaveWorkout"
  | "tracking.durationMinutes"
  | "tracking.exercise"
  | "tracking.exerciseName"
  | "tracking.exerciseNamePlaceholder"
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
  | "tracking.workout"
  | "tracking.workoutSaved"
  | "tracking.workoutSet"
  | "tracking.workoutTitle"
  | "tracking.workoutTitlePlaceholder"
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
  | "member.classDetail.bookClass"
  | "member.classDetail.booked"
  | "member.classDetail.bookWithPrice"
  | "member.classDetail.cancelBooking"
  | "member.classDetail.cancelling"
  | "member.classDetail.classDetails"
  | "member.classDetail.classFallback"
  | "member.classDetail.coachName"
  | "member.classDetail.continuePayment"
  | "member.classDetail.full"
  | "member.classDetail.joinWaitlist"
  | "member.classDetail.left"
  | "member.classDetail.notFound"
  | "member.classDetail.paymentDue"
  | "member.classDetail.spots"
  | "member.classDetail.spotsBooked"
  | "member.classDetail.waitlisted"
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
  | "member.classes.joinWaitlist"
  | "member.classes.left"
  | "member.classes.noClasses"
  | "member.classes.noClassesBody"
  | "member.classes.onWaitlist"
  | "member.classes.opening"
  | "member.classes.paymentDue"
  | "member.classes.spots"
  | "member.classes.subtitle"
  | "member.classes.title"
  | "member.classes.waitlisted"
  | "member.you.accountCenter"
  | "member.you.appearance"
  | "member.you.backToOwnerMode"
  | "member.you.gymShop"
  | "member.you.helpSupport"
  | "member.you.membership"
  | "member.you.privacy"
  | "member.you.quickActions"
  | "member.you.switchGym"
  | "member.you.switchToRole"
  | "member.you.theme.dark"
  | "member.you.theme.light"
  | "member.you.theme.system"
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
  | "member.membership.activePlan"
  | "member.membership.autopayActive"
  | "member.membership.autopayCancelled"
  | "member.membership.browseGymsBody"
  | "member.membership.browserReturnBody"
  | "member.membership.cancelConfirmBody"
  | "member.membership.cancelConfirmTitle"
  | "member.membership.cancelMembership"
  | "member.membership.cancelled"
  | "member.membership.checkingPaymentStatus"
  | "member.membership.choosePlan"
  | "member.membership.continueCheckout"
  | "member.membership.continuingBrowser"
  | "member.membership.continuingBrowserTitle"
  | "member.membership.currentPlan"
  | "member.membership.days"
  | "member.membership.eyebrow"
  | "member.membership.findGyms"
  | "member.membership.gymDefinedValidity"
  | "member.membership.history"
  | "member.membership.historyJumpBody"
  | "member.membership.invoiceGenerated"
  | "member.membership.invoiceUnavailable"
  | "member.membership.keepMembership"
  | "member.membership.noActivePlans"
  | "member.membership.noAlternatePlans"
  | "member.membership.noMemberships"
  | "member.membership.pause"
  | "member.membership.pauseConfirmBody"
  | "member.membership.pauseConfirmTitle"
  | "member.membership.pauseReason"
  | "member.membership.pausedToast"
  | "member.membership.pausedUntil"
  | "member.membership.paySecurely"
  | "member.membership.paymentDocuments"
  | "member.membership.paymentDocumentsBody"
  | "member.membership.plan"
  | "member.membership.planSwitched"
  | "member.membership.receiptGenerated"
  | "member.membership.receiptUnavailable"
  | "member.membership.renewMembership"
  | "member.membership.renewalConfirmed"
  | "member.membership.renewalConsequence"
  | "member.membership.renewalFlowOpened"
  | "member.membership.renewalRequestSent"
  | "member.membership.renewalSheetBody"
  | "member.membership.renewalSummary"
  | "member.membership.resumed"
  | "member.membership.selectedPlan"
  | "member.membership.selectPlanAccessibility"
  | "member.membership.starting"
  | "member.membership.statusBelow"
  | "member.membership.subscriptionUpdated"
  | "member.membership.summary"
  | "member.membership.switchNow"
  | "member.membership.title"
  | "member.membership.update"
  | "member.membership.updating"
  | "member.membership.validity"
  | "member.membership.visits"
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
  | "member.profile.recentActivity"
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
  | "member.receipt.amount"
  | "member.receipt.downloadInvoice"
  | "member.receipt.generating"
  | "member.receipt.invoice"
  | "member.receipt.invoiceNo"
  | "member.receipt.issued"
  | "member.receipt.membership"
  | "member.receipt.mode"
  | "member.receipt.notFound"
  | "member.receipt.notFoundBody"
  | "member.receipt.paymentDetails"
  | "member.receipt.purpose"
  | "member.receipt.receiptNo"
  | "member.receipt.receiptNumber"
  | "member.receipt.recorded"
  | "member.receipt.status"
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
  | "owner.stock.lowStock"
  | "owner.stock.memberPickup"
  | "owner.stock.noPickups"
  | "owner.stock.noPickupsBody"
  | "owner.stock.paidOrders"
  | "owner.stock.pickupOrders"
  | "owner.stock.pickupPending"
  | "owner.stock.pickups"
  | "owner.stock.productsToReorder"
  | "owner.stock.reorderBody"
  | "owner.stock.reorderSubject"
  | "owner.stock.title"
  | "owner.stock.underThreshold"
  | "owner.referrals.allowTrainerReferrals"
  | "owner.referrals.codeExpiryDays"
  | "owner.referrals.creditInr"
  | "owner.referrals.discountInr"
  | "owner.referrals.discountPercent"
  | "owner.referrals.enabled"
  | "owner.referrals.enabledBody"
  | "owner.referrals.flatInr"
  | "owner.referrals.freeDays"
  | "owner.referrals.limits"
  | "owner.referrals.maxPerMemberMonth"
  | "owner.referrals.memberGymCreditBody"
  | "owner.referrals.memberRefersMember"
  | "owner.referrals.memberRefersNewGym"
  | "owner.referrals.newMemberGets"
  | "owner.referrals.none"
  | "owner.referrals.percent"
  | "owner.referrals.referrerEarns"
  | "owner.referrals.saveSettings"
  | "owner.referrals.subtitle"
  | "owner.referrals.title"
  | "owner.referrals.trainerEarns"
  | "owner.referrals.trainerRefersMember"
  | "owner.referrals.visits"
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
  | "trainer.clientSessions.adherence"
  | "trainer.clientSessions.averageCompletion"
  | "trainer.clientSessions.backToClients"
  | "trainer.clientSessions.noDetails"
  | "trainer.clientSessions.noPlans"
  | "trainer.clientSessions.planFeedback"
  | "trainer.clientSessions.title"
  | "trainer.clientSessions.waitingForFeedback"
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
    "common.actionFailed": "Action failed",
    "common.datePicker": "Date picker",
    "common.back": "Back",
    "common.dismiss": "Dismiss",
    "common.done": "Done",
    "common.or": "or",
    "common.saving": "Saving...",
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
    "notifications.today": "Today",
    "notifications.yesterday": "Yesterday",
    "notifications.earlierThisWeek": "Earlier this week",
    "notifications.older": "Older",
    "notifications.allCaughtUp": "All caught up",
    "notifications.allCaughtUpRecent": "All caught up · recent {{date}}",
    "notifications.allMarkedRead": "All notifications marked read.",
    "notifications.attendanceAlertReceived": "Attendance alert received",
    "notifications.closeDetails": "Close notification details",
    "notifications.couldNotUpdate": "Notification could not be updated.",
    "notifications.couldNotUpdateMany": "Notifications could not be updated.",
    "notifications.emptyBody": "New alerts about your membership, classes and coaching land here.",
    "notifications.emptyTitle": "You're all caught up",
    "notifications.fallbackTitle": "Notification",
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
    "notifications.unreadCount": "{{count}} unread",
    "notifications.unreadRecent": "{{count}} unread · recent {{date}}",
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
    "assistant.memberStarter": "Ask in any language. I can help with your assigned plans, diet preferences, recovery, and gym routine.",
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
    "assistant.trainerStarter": "Send a client summary, workout data, or a natural-language question. I can help draft plans, diet notes, and recovery guidance.",
    "assistant.trainerSubtitle": "Attach client summaries, import notes, draft plans.",
    "assistant.trainerTitle": "Coach with context",
    "assistant.unavailableBody": "Owner and desk operations stay in the web dashboard.",
    "assistant.unavailableTitle": "Plan assistant",
    "onboarding.allInOne": "All in one",
    "onboarding.allInOneCopy": "Memberships, classes, payments and store pickup — all in one place.",
    "onboarding.brand": "Zook",
    "onboarding.builtForGymDays": "Built for gym days",
    "onboarding.changeLanguageAnytime": "You can change this any time in Settings.",
    "onboarding.continue": "Continue",
    "onboarding.continueToSignIn": "Continue to sign in",
    "onboarding.couldNotSaveLanguage": "Couldn't save language",
    "onboarding.couldNotSavePreference": "Couldn't save preference",
    "onboarding.findGym": "Find your gym",
    "onboarding.findGymCopy": "Discover gyms near you across Pune, Mumbai, Bengaluru, Delhi and 50+ cities.",
    "onboarding.pickLanguage": "Pick your language",
    "onboarding.skip": "Skip",
    "onboarding.skipIntro": "Skip intro",
    "onboarding.skipOnboarding": "Skip onboarding",
    "onboarding.splashBadge": "Gym ops, without the clutter.",
    "onboarding.splashSubtitle": "Check-ins, memberships, plans, and the front desk flow in one place.",
    "onboarding.trainTrack": "Train & track",
    "onboarding.trainTrackCopy": "Scan in seconds, follow your plan, and watch every workout add up.",
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
    "settings.privacyRequestBody": "Request a copy of your Zook data or start an account deletion request.",
    "settings.privacyWarning": "These requests are saved and reviewed before anything changes.",
    "settings.requestAccountDeletion": "Request account deletion",
    "settings.requestDataExport": "Request data export",
    "settings.requestDeletion": "Request deletion",
    "settings.deleteConfirmTitle": "Request account deletion?",
    "settings.deleteConfirmBody": "Zook support will review this request before any account data is removed.",
    "settings.export": "Export",
    "settings.delete": "Delete",
    "settings.exportRequested": "Export requested. You'll receive an email when the file is available.",
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
    "rewards.freeDaysAdded": "Free Zook days are added to your subscription automatically once a referred gym subscribes.",
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
    "branch.switch": "Switch branch",
    "branch.current": "Current branch",
    "branch.allBranches": "All branches",
    "shop.readyForPickup": "Ready for pickup",
    "shop.readyForPickupSubtitle": "Show this code at the front desk.",
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
    "shop.browserReturnBody": "Come back after payment. Zook refreshes your order status automatically.",
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
    "shop.checkoutConsequence": "After payment, Zook creates a pickup code for desk verification. Do not collect without the code.",
    "shop.checkoutCreated": "Checkout created.",
    "shop.codeWithValue": "Code: {{code}}",
    "shop.continuePayment": "Continue to payment",
    "shop.continueInBrowser": "Continue in browser",
    "shop.confirming": "Confirming...",
    "shop.copyPickupCodeAccessibility": "Copy pickup code {{code}}",
    "shop.couldNotCreateCheckout": "Could not create checkout.",
    "shop.backToShop": "Back to Shop",
    "shop.payment": "Payment",
    "shop.paymentSubtitle": "Your item is ready at the desk after payment.",
    "shop.paymentConfirmed": "Payment confirmed.",
    "shop.paymentCouldNotComplete": "Payment could not be completed.",
    "shop.paymentStillPending": "Payment is still pending. Try again in a moment.",
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
    "shop.outOfStock": "Out of stock",
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
    "findGyms.city": "City",
    "findGyms.coverPhoto": "{{name}} cover photo",
    "findGyms.discovery": "Discovery",
    "findGyms.gymNameOrUsername": "Gym name or username",
    "findGyms.noGyms": "No gyms",
    "findGyms.noGymsBody": "Try widening the city or clearing the search.",
    "findGyms.openGym": "Open {{name}}",
    "findGyms.referralApplied": "Referral code applied",
    "findGyms.referralPrefix": "Code",
    "findGyms.referralSuffix": "is attached. Open any gym to use it.",
    "findGyms.resultCountMany": "{{count}} results",
    "findGyms.resultCountOne": "1 result",
    "findGyms.searching": "Searching...",
    "findGyms.title": "Find your gym",
    "findGyms.view": "View",
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
    "gymProfile.paymentStarted": "Payment started. Complete it to activate your membership.",
    "gymProfile.pendingSince": "Pending since {{date}}",
    "gymProfile.photoOf": "Photo {{index}} of {{count}}",
    "gymProfile.planAvailableMany": "{{count}} plans available",
    "gymProfile.planAvailableOne": "1 plan available",
    "gymProfile.referralApplied": "Referral applied",
    "gymProfile.referralInviteRequired": "Referral or invite is required.",
    "gymProfile.referralPrice": "Referral price",
    "gymProfile.requestMembershipFirst": "Request membership first",
    "gymProfile.requestMembershipFirstBody":
      "This gym reviews new members before payment. Submit your request and the owner can approve it from the web dashboard.",
    "gymProfile.reviewed": "Reviewed",
    "gymProfile.securePayment": "Secure payment",
    "gymProfile.sendMembershipRequest": "Send membership request",
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
    "gymProfile.stepPaySecurelyBody": "Payment activates the membership once the invite rules are met.",
    "gymProfile.stepReferralAttached": "Referral {{code}} is attached.",
    "gymProfile.stepReferralRequired": "A referral or invite is required before you can continue.",
    "gymProfile.stepReviewPlans": "Review plans",
    "gymProfile.stepReviewPlansBody": "Once the code is accepted, plans can be joined.",
    "gymProfile.stepSecureReferral": "Secure a referral",
    "gymProfile.stepSendRequest": "Send request",
    "gymProfile.stepSendRequestBody": "Send your request before payment if this gym reviews new members.",
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
    "gymProfile.visitsRemaining": "{{count}} visits remaining",
    "gymProfile.whatsInside": "What's inside",
    "empty.loading": "Loading",
    "empty.loadingBody": "Loading details from your gym.",
    "tracking.bodyTimeline": "Photo timeline",
    "tracking.bodyTimelineSubtitle": "{{count}} body composition entries",
    "tracking.armsCm": "Arms cm",
    "tracking.body": "Body",
    "tracking.bodyFatPercent": "Body fat %",
    "tracking.bodyMeasurements": "Body measurements",
    "tracking.bodyMeasurementsSaved": "Body measurements saved.",
    "tracking.bodyProgress": "Body progress",
    "tracking.calfCm": "Calf cm",
    "tracking.calvesCm": "Calves cm",
    "tracking.chestCm": "Chest cm",
    "tracking.couldNotSaveMeasurements": "Could not save measurements",
    "tracking.couldNotSaveWorkout": "Could not save workout",
    "tracking.durationMinutes": "Duration (minutes)",
    "tracking.exercise": "Exercise",
    "tracking.exerciseName": "Exercise name",
    "tracking.exerciseNamePlaceholder": "Push press",
    "tracking.forearmsCm": "Forearms cm",
    "tracking.hipsCm": "Hips cm",
    "tracking.historyTitle": "Workout history",
    "tracking.loggedWorkout": "Logged workout",
    "tracking.muscleMassKg": "Muscle mass kg",
    "tracking.neckCm": "Neck cm",
    "tracking.noBodyMeasurements": "No body measurements",
    "tracking.noBodyMeasurementsBody": "Log your measurements to see your trends over time.",
    "tracking.noWorkoutsYet": "No workouts yet",
    "tracking.noWorkoutsYetBody": "Your logged workouts will show up here.",
    "tracking.notes": "Notes",
    "tracking.notesPlaceholder": "Front/side/back photos can be attached from progress photos.",
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
    "tracking.workout": "Workout",
    "tracking.workoutSaved": "Workout saved.",
    "tracking.workoutSet": "Workout set",
    "tracking.workoutTitle": "Workout title",
    "tracking.workoutTitlePlaceholder": "e.g. Push day",
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
    "member.attendance.entryCodeUnavailable": "Entry code unavailable - please ask reception to check you in manually.",
    "member.attendance.gymTimeRecorded": "Your gym time was recorded.",
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
    "member.attendance.pendingBody": "Your check-in was received. Show this code at the front desk.",
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
    "member.attendance.whyConfirmationBody": "Your gym asks the desk to confirm some check-ins before entry is marked approved.",
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
    "member.classDetail.bookClass": "Book class",
    "member.classDetail.booked": "Booked",
    "member.classDetail.bookWithPrice": "Book · {{price}}",
    "member.classDetail.cancelBooking": "Cancel booking",
    "member.classDetail.cancelling": "Cancelling...",
    "member.classDetail.classDetails": "Class details",
    "member.classDetail.classFallback": "Class",
    "member.classDetail.coachName": "Coach {{name}}",
    "member.classDetail.continuePayment": "Continue payment",
    "member.classDetail.full": "Full",
    "member.classDetail.joinWaitlist": "Join waitlist",
    "member.classDetail.left": "{{count}} left",
    "member.classDetail.notFound": "Class not found",
    "member.classDetail.paymentDue": "Payment due",
    "member.classDetail.spots": "{{count}} spots",
    "member.classDetail.spotsBooked": "spots booked",
    "member.classDetail.waitlisted": "Waitlisted",
    "member.classes.bookClass": "Book class",
    "member.classes.bookWithPrice": "Book · {{price}}",
    "member.classes.booked": "Booked",
    "member.classes.branchSchedule": "{{branch}} schedule",
    "member.classes.cancelling": "Cancelling...",
    "member.classes.coachName": "Coach {{name}}",
    "member.classes.continuePayment": "Continue payment",
    "member.classes.couldNotLoad": "Classes could not load.",
    "member.classes.free": "Free",
    "member.classes.full": "Full",
    "member.classes.joinWaitlist": "Join waitlist",
    "member.classes.left": "{{count}} left",
    "member.classes.noClasses": "No classes scheduled",
    "member.classes.noClassesBody": "Check back soon - new group sessions are added every week.",
    "member.classes.onWaitlist": "On waitlist",
    "member.classes.opening": "Opening...",
    "member.classes.paymentDue": "Payment due",
    "member.classes.spots": "{{count}} spots",
    "member.classes.subtitle": "Reserve your spot in upcoming group sessions.",
    "member.classes.title": "Classes",
    "member.classes.waitlisted": "Waitlisted",
    "member.you.accountCenter": "Zook account center",
    "member.you.appearance": "Appearance",
    "member.you.backToOwnerMode": "Back to Owner mode",
    "member.you.gymShop": "Gym shop",
    "member.you.helpSupport": "Help & support",
    "member.you.membership": "Membership",
    "member.you.privacy": "Privacy",
    "member.you.quickActions": "Quick actions",
    "member.you.switchGym": "Switch gym",
    "member.you.switchToRole": "Switch to {{role}}",
    "member.you.theme.dark": "Dark",
    "member.you.theme.light": "Light",
    "member.you.theme.system": "System",
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
    "member.membership.activePlan": "Active plan",
    "member.membership.autopayActive": "Autopay is active.",
    "member.membership.autopayCancelled": "Autopay cancelled.",
    "member.membership.browseGymsBody": "Browse gyms and purchase a membership to get started.",
    "member.membership.browserReturnBody": "Return after checkout. Zook refreshes your membership when you come back.",
    "member.membership.cancelConfirmBody": "You'll keep access until your current term ends, but it won't renew and can't be resumed afterwards. This can't be undone.",
    "member.membership.cancelConfirmTitle": "Cancel membership?",
    "member.membership.cancelMembership": "Cancel membership",
    "member.membership.cancelled": "Membership cancelled.",
    "member.membership.checkingPaymentStatus": "Checking payment status...",
    "member.membership.choosePlan": "Choose a plan",
    "member.membership.continueCheckout": "Continue checkout",
    "member.membership.continuingBrowser": "Continuing in your browser.",
    "member.membership.continuingBrowserTitle": "Continuing in your browser",
    "member.membership.currentPlan": "Current plan",
    "member.membership.days": "{{count}} days",
    "member.membership.eyebrow": "Membership",
    "member.membership.findGyms": "Find gyms",
    "member.membership.gymDefinedValidity": "Gym-defined validity",
    "member.membership.history": "Membership history",
    "member.membership.historyJumpBody": "Jumped to your previous memberships and payment trail.",
    "member.membership.invoiceGenerated": "Invoice generated.",
    "member.membership.invoiceUnavailable": "Invoice unavailable",
    "member.membership.keepMembership": "Keep membership",
    "member.membership.noActivePlans": "No active plans",
    "member.membership.noAlternatePlans": "No alternate plans are published. Same-plan renewal is requested.",
    "member.membership.noMemberships": "No memberships",
    "member.membership.pause": "Pause",
    "member.membership.pauseConfirmBody": "Your access stays frozen until {{date}}. You can resume anytime before then.",
    "member.membership.pauseConfirmTitle": "Pause membership?",
    "member.membership.pauseReason": "Member selected a membership pause date from mobile.",
    "member.membership.pausedToast": "Paused until {{date}}.",
    "member.membership.pausedUntil": "Membership paused until {{date}}.",
    "member.membership.paySecurely": "Pay securely",
    "member.membership.paymentDocuments": "Payment documents",
    "member.membership.paymentDocumentsBody": "Receipts and invoices are below.",
    "member.membership.plan": "Plan",
    "member.membership.planSwitched": "Plan switched.",
    "member.membership.receiptGenerated": "Receipt generated.",
    "member.membership.receiptUnavailable": "Receipt unavailable",
    "member.membership.renewMembership": "Renew membership",
    "member.membership.renewalConfirmed": "Renewal confirmed.",
    "member.membership.renewalConsequence": "The renewed membership activates after payment confirmation from the payment service or gym desk.",
    "member.membership.renewalFlowOpened": "We opened the renewal flow for this membership.",
    "member.membership.renewalRequestSent": "Renewal request sent.",
    "member.membership.renewalSheetBody": "Continue at {{gym}} with the same plan or choose another available option.",
    "member.membership.renewalSummary": "Renewal summary",
    "member.membership.resumed": "Membership resumed.",
    "member.membership.selectedPlan": "Selected plan",
    "member.membership.selectPlanAccessibility": "Select {{plan}}",
    "member.membership.starting": "Starting...",
    "member.membership.statusBelow": "Membership status is below.",
    "member.membership.subscriptionUpdated": "Your subscription has been updated.",
    "member.membership.summary": "{{active}} active · {{expiring}} expiring soon · {{total}} total",
    "member.membership.switchNow": "Switch now",
    "member.membership.title": "Your plans",
    "member.membership.update": "Membership update",
    "member.membership.updating": "Updating...",
    "member.membership.validity": "Validity",
    "member.membership.visits": "Visits",
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
    "member.profile.daysReferralBenefit": "You'll get {{count}} free days for every friend who joins.",
    "member.profile.daysRemaining": "{{count}} days remaining",
    "member.profile.daysRemainingOf": "{{remaining}} of {{total}} days remaining",
    "member.profile.defaultReferralBenefit": "Share your code so the gym can track friends you bring in.",
    "member.profile.earnedCredit": "{{amount}} earned",
    "member.profile.expires": "Expires {{date}}",
    "member.profile.findGyms": "Find gyms",
    "member.profile.friendsStat": "Your friends: {{joined}} joined, {{pending}} pending",
    "member.profile.membership": "Membership",
    "member.profile.membershipDetailsUnavailable": "Membership details unavailable",
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
    "member.profile.recentActivity": "Recent activity",
    "member.profile.referGymAccessibility": "Refer a gym to Zook and earn",
    "member.profile.referGymBody": "Earn when a gym you refer subscribes to Zook on a 6-month or yearly plan.",
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
    "member.profile.trainerReferralBenefit": "Trainer referrals are tracked for commission review when a member joins or a gym signs up through your link.",
    "member.profile.updating": "Updating",
    "member.profile.useRoleAccessibility": "Use Zook as {{role}}",
    "member.profile.viewHistory": "View history",
    "member.profile.visitsReferralBenefit": "You'll get {{count}} visits for every friend who joins.",
    "member.profile.visitsRemaining": "{{remaining}} of {{total}} remaining",
    "member.profile.workoutPlan": "Workout plan",
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
    "member.receipt.amount": "Amount",
    "member.receipt.downloadInvoice": "Download invoice",
    "member.receipt.generating": "Generating after confirmation",
    "member.receipt.invoice": "Invoice",
    "member.receipt.invoiceNo": "Invoice no.",
    "member.receipt.issued": "Issued",
    "member.receipt.membership": "Membership",
    "member.receipt.mode": "Mode",
    "member.receipt.notFound": "Receipt not found",
    "member.receipt.notFoundBody": "We couldn't find that payment in your membership history.",
    "member.receipt.paymentDetails": "Payment details",
    "member.receipt.purpose": "Purpose",
    "member.receipt.receiptNo": "Receipt no.",
    "member.receipt.receiptNumber": "Receipt {{number}}",
    "member.receipt.recorded": "Recorded",
    "member.receipt.status": "Status",
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
    "member.scan.cameraBlockedAnnouncement": "Camera access blocked. Open device settings to allow QR scanning.",
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
    "member.scan.enterDeskCodeManually": "Enter the desk code manually.",
    "member.scan.enterManualCodeAccessibility": "Enter manual check-in code",
    "member.scan.membershipExpired": "Membership expired. Renew before checking in.",
    "member.scan.needFourNumbers": "Need 4 numbers (e.g. 1234)",
    "member.scan.needTwoLetters": "Need 2 letters (e.g. AB)",
    "member.scan.notVerified": "Not verified",
    "member.scan.offlineSavedBody": "No connection. Your scan is saved to retry, but entry is not confirmed yet.",
    "member.scan.offlineSavedTitle": "Scan saved for retry",
    "member.scan.offlineSavedToast": "Entry is not confirmed until the server accepts it.",
    "member.scan.openDeviceSettings": "Open device settings to allow QR scanning.",
    "member.scan.openSettings": "Open settings",
    "member.scan.profilePhotoRecommended": "Add a profile photo after check-in so the desk can verify you faster next time.",
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
    "owner.stock.lowStock": "Low stock",
    "owner.stock.memberPickup": "Member pickup",
    "owner.stock.noPickups": "No pickups waiting",
    "owner.stock.noPickupsBody": "Paid shop orders awaiting collection will appear here.",
    "owner.stock.paidOrders": "Paid orders",
    "owner.stock.pickupOrders": "Pickup orders",
    "owner.stock.pickupPending": "Pickup pending",
    "owner.stock.pickups": "Pickups",
    "owner.stock.productsToReorder": "Products to reorder",
    "owner.stock.reorderBody": "Hi,\n\nPlease share supplier options for {{name}}.\n\nCurrent stock: {{stock}}\nThreshold: {{threshold}}\n\nThanks.",
    "owner.stock.reorderSubject": "Reorder {{name}}",
    "owner.stock.title": "Stock",
    "owner.stock.underThreshold": "Under threshold",
    "owner.referrals.allowTrainerReferrals": "Allow trainer referrals",
    "owner.referrals.codeExpiryDays": "Code expiry (days)",
    "owner.referrals.creditInr": "Credit (₹)",
    "owner.referrals.discountInr": "Discount ₹",
    "owner.referrals.discountPercent": "Discount %",
    "owner.referrals.enabled": "Referrals enabled",
    "owner.referrals.enabledBody": "Turn the whole referral program on or off.",
    "owner.referrals.flatInr": "Flat ₹",
    "owner.referrals.freeDays": "Free days",
    "owner.referrals.limits": "Limits",
    "owner.referrals.maxPerMemberMonth": "Max / member / month",
    "owner.referrals.memberGymCreditBody": "Account credit a member earns when a gym they refer signs up.",
    "owner.referrals.memberRefersMember": "Member refers a member",
    "owner.referrals.memberRefersNewGym": "Member refers a new gym",
    "owner.referrals.newMemberGets": "New member gets",
    "owner.referrals.none": "None",
    "owner.referrals.percent": "Percent",
    "owner.referrals.referrerEarns": "Referrer earns",
    "owner.referrals.saveSettings": "Save referral settings",
    "owner.referrals.subtitle": "Set how much everyone earns for referrals.",
    "owner.referrals.title": "Referral program",
    "owner.referrals.trainerEarns": "Trainer earns",
    "owner.referrals.trainerRefersMember": "Trainer refers a member",
    "owner.referrals.visits": "Visits",
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
    "trainer.clientSessions.adherence": "Adherence",
    "trainer.clientSessions.averageCompletion": "{{percent}}% average completion across recent plan feedback.",
    "trainer.clientSessions.backToClients": "Back to clients",
    "trainer.clientSessions.noDetails": "No details added.",
    "trainer.clientSessions.noPlans": "No plans",
    "trainer.clientSessions.planFeedback": "Plan feedback",
    "trainer.clientSessions.title": "Client Detail",
    "trainer.clientSessions.waitingForFeedback": "Waiting for member feedback and workout logs.",
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
    "common.actionFailed": "एक्शन फेल हुआ",
    "common.datePicker": "तारीख चुनें",
    "common.back": "वापस",
    "common.dismiss": "बंद करें",
    "common.done": "हो गया",
    "common.or": "या",
    "common.saving": "सेव हो रहा है...",
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
    "notifications.today": "आज",
    "notifications.yesterday": "कल",
    "notifications.earlierThisWeek": "इस हफ्ते पहले",
    "notifications.older": "पुराने",
    "notifications.allCaughtUp": "सब देखा जा चुका है",
    "notifications.allCaughtUpRecent": "सब देखा जा चुका है · हाल का {{date}}",
    "notifications.allMarkedRead": "सभी notifications read mark हो गए.",
    "notifications.attendanceAlertReceived": "Attendance alert मिला",
    "notifications.closeDetails": "Notification details बंद करें",
    "notifications.couldNotUpdate": "Notification update नहीं हो सका.",
    "notifications.couldNotUpdateMany": "Notifications update नहीं हो सके.",
    "notifications.emptyBody": "Membership, classes और coaching से जुड़े नए alerts यहां आएंगे.",
    "notifications.emptyTitle": "आप all caught up हैं",
    "notifications.fallbackTitle": "Notification",
    "notifications.markAllRead": "सभी read mark करें",
    "notifications.markRead": "Read mark करें",
    "notifications.markedRead": "Notification read mark हो गया.",
    "notifications.noDetails": "कोई details उपलब्ध नहीं.",
    "notifications.openedFromPush": "Push notification से खोला गया",
    "notifications.openingSuffix": " · खुल रहा है...",
    "notifications.openLinkedScreen": "Linked screen खोलें",
    "notifications.showFewer": "कम दिखाएं",
    "notifications.showFewerOlder": "पुराने notifications कम दिखाएं",
    "notifications.showOlder": "पुराने notifications दिखाएं",
    "notifications.showOlderCount": "{{count}} पुराने दिखाएं",
    "notifications.unreadCount": "{{count}} unread",
    "notifications.unreadRecent": "{{count}} unread · हाल का {{date}}",
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
    "auth.tooManyAttempts": "बहुत ज़्यादा attempts. {{seconds}}s में फिर कोशिश करें.",
    "auth.qaShortcuts": "QA shortcuts",
    "assistant.attachSummary": "Summary जोड़ें",
    "assistant.attachedClientData": "जुड़ा हुआ client data",
    "assistant.attachedProfile": "जुड़ी हुई profile",
    "assistant.clear": "Clear",
    "assistant.clearConversation": "Conversation clear करें",
    "assistant.clientData": "Client data",
    "assistant.contextActivePlans": "Active plans",
    "assistant.contextAllergies": "Allergies",
    "assistant.contextClient": "Client",
    "assistant.contextDiet": "Diet",
    "assistant.contextGoal": "Goal",
    "assistant.contextPlans": "Plans",
    "assistant.contextWeight": "Weight",
    "assistant.copied": "Copied",
    "assistant.copyHint": "Copy करने के लिए long press करें",
    "assistant.inputPlaceholder": "किसी भी भाषा में पूछें...",
    "assistant.memberEyebrow": "Plan assistant",
    "assistant.memberPromptFocus": "आज मुझे किस पर focus करना चाहिए?",
    "assistant.memberPromptFood": "Training के बाद मुझे क्या खाना चाहिए?",
    "assistant.memberPromptWorkout": "मेरा workout follow करना आसान बनाएं.",
    "assistant.memberStarter": "किसी भी भाषा में पूछें. मैं assigned plans, diet preferences, recovery और gym routine में मदद कर सकता हूं.",
    "assistant.memberSubtitle": "किसी भी भाषा में पूछें — answers आपकी profile से जुड़े होते हैं.",
    "assistant.memberTitle": "Training पर बात करें",
    "assistant.myProfile": "मेरी profile",
    "assistant.notSavedToastBody": "नए messages अगली बार restore नहीं हो सकते.",
    "assistant.notSavedToastTitle": "Assistant save नहीं हुआ",
    "assistant.resetToastBody": "Saved messages पढ़े नहीं जा सके.",
    "assistant.resetToastTitle": "Assistant reset हुआ",
    "assistant.send": "भेजें",
    "assistant.thinking": "सोच रहा है...",
    "assistant.trainerEyebrow": "Trainer assistant",
    "assistant.trainerPromptPlan": "4-week hypertrophy plan draft करें.",
    "assistant.trainerPromptSummary": "इस client की progress summarize करें.",
    "assistant.trainerPromptSwaps": "Safe exercise swaps suggest करें.",
    "assistant.trainerStarter": "Client summary, workout data, या natural-language question भेजें. मैं plans, diet notes और recovery guidance draft करने में मदद कर सकता हूं.",
    "assistant.trainerSubtitle": "Client summaries जोड़ें, notes import करें, plans draft करें.",
    "assistant.trainerTitle": "Context के साथ coach करें",
    "assistant.unavailableBody": "Owner और desk operations web dashboard में रहते हैं.",
    "assistant.unavailableTitle": "Plan assistant",
    "onboarding.allInOne": "सब एक जगह",
    "onboarding.allInOneCopy": "Memberships, classes, payments और store pickup — सब एक जगह.",
    "onboarding.brand": "Zook",
    "onboarding.builtForGymDays": "Gym days के लिए बनाया गया",
    "onboarding.changeLanguageAnytime": "आप इसे Settings में कभी भी बदल सकते हैं.",
    "onboarding.continue": "जारी रखें",
    "onboarding.continueToSignIn": "Sign in पर जाएं",
    "onboarding.couldNotSaveLanguage": "भाषा सेव नहीं हो सकी",
    "onboarding.couldNotSavePreference": "Preference सेव नहीं हो सकी",
    "onboarding.findGym": "अपना जिम खोजें",
    "onboarding.findGymCopy": "Pune, Mumbai, Bengaluru, Delhi और 50+ cities में अपने पास gyms खोजें.",
    "onboarding.pickLanguage": "अपनी भाषा चुनें",
    "onboarding.skip": "Skip",
    "onboarding.skipIntro": "Intro skip करें",
    "onboarding.skipOnboarding": "Onboarding skip करें",
    "onboarding.splashBadge": "Gym ops, बिना clutter.",
    "onboarding.splashSubtitle": "Check-ins, memberships, plans और front desk flow एक जगह.",
    "onboarding.trainTrack": "Train और track",
    "onboarding.trainTrackCopy": "Seconds में scan करें, अपना plan follow करें, और हर workout जुड़ता देखें.",
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
    "settings.supportDetailsPrompt": "क्या गलत हुआ बताएं ताकि सपोर्ट follow up कर सके.",
    "settings.terms": "Terms",
    "settings.termsSubtitle": "Terms of service देखें",
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
    "settings.privacyRequestBody": "अपने Zook डेटा की कॉपी मांगें या अकाउंट डिलीशन अनुरोध शुरू करें.",
    "settings.privacyWarning":
      "इन अनुरोधों को सेव किया जाता है और बदलाव से पहले रिव्यू किया जाता है.",
    "settings.requestAccountDeletion": "अकाउंट डिलीशन अनुरोध करें",
    "settings.requestDataExport": "डेटा एक्सपोर्ट अनुरोध करें",
    "settings.requestDeletion": "डिलीशन अनुरोध करें",
    "settings.deleteConfirmTitle": "अकाउंट डिलीशन अनुरोध करें?",
    "settings.deleteConfirmBody": "कोई भी अकाउंट डेटा हटाने से पहले Zook support इस अनुरोध को रिव्यू करेगा.",
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
    "rewards.earnDaysPerGym": "हर जिम पर {{count}} free days पाएं",
    "rewards.freeDaysAdded": "Referred gym subscribe करने पर free Zook days आपकी subscription में अपने आप जुड़ जाते हैं.",
    "rewards.lifetime": "Lifetime",
    "rewards.minToWithdraw": "Withdraw के लिए minimum {{amount}}",
    "rewards.noEarningsYet": "अभी कोई earning नहीं",
    "rewards.noEarningsYetBody": "अपना link share करें — referred gym subscribe करने पर आप earn करेंगे.",
    "rewards.readyToWithdraw": "Withdraw के लिए ready",
    "rewards.request": "Request",
    "rewards.requesting": "Request हो रहा है...",
    "rewards.requestWithdrawal": "Withdrawal request करें",
    "rewards.requestWithdrawalBody":
      "हम review करके आपको {{amount}} payout करेंगे. भेजे जाने पर confirmation मिलेगा.",
    "rewards.requestWithdrawalTitle": "Withdrawal request करें?",
    "rewards.shareMessage": "Zook पर अपना gym चलाएं — मेरे link से sign up करें: {{url}}",
    "rewards.shareYourLink": "अपना link share करें",
    "rewards.status.clearing": "Clearing",
    "rewards.status.paid": "Paid",
    "rewards.status.pending": "Pending",
    "rewards.status.ready": "Ready",
    "rewards.status.requested": "Requested",
    "rewards.status.reversed": "Reversed",
    "rewards.subtitle": "नए gyms को Zook पर लाएं और reward पाएं.",
    "rewards.title": "Refer & earn",
    "rewards.yourEarnings": "आपकी earnings",
    "referral.opening": "Referral खुल रहा है...",
    "branch.switch": "ब्रांच बदलें",
    "branch.current": "मौजूदा ब्रांच",
    "branch.allBranches": "सभी ब्रांच",
    "shop.readyForPickup": "पिकअप के लिए तैयार",
    "shop.readyForPickupSubtitle": "यह कोड फ्रंट डेस्क पर दिखाएं.",
    "shop.addProductAccessibility": "{{name}} जोड़ें",
    "shop.availableAtGymDesk": "पेमेंट के बाद gym desk पर उपलब्ध",
    "shop.pickupCode": "पिकअप कोड",
    "shop.pickupCodeCopied": "पिकअप कोड कॉपी हुआ।",
    "shop.pickupCodeCopyFailed": "पिकअप कोड कॉपी नहीं हो सका।",
    "shop.pickupCodePending": "पिकअप कोड पेंडिंग",
    "shop.pending": "पेंडिंग",
    "shop.paid": "पेड",
    "shop.signedPickupQrCode": "साइन किया हुआ पिकअप QR कोड",
    "shop.branchLabel": "ब्रांच",
    "shop.browserReturnBody": "पेमेंट के बाद वापस आएं. Zook आपका order status automatically refresh करेगा.",
    "shop.cartReset": "Cart reset हुआ",
    "shop.cartResetBody": "आपका saved cart restore नहीं हो सका.",
    "shop.categoryAll": "सभी",
    "shop.categoryCups": "कप",
    "shop.categoryShake": "शेक",
    "shop.categorySupplements": "Supplements",
    "shop.categoryTowel": "टॉवल",
    "shop.categoryWater": "पानी",
    "shop.checkStatus": "Status check करें",
    "shop.checking": "Check हो रहा है...",
    "shop.checkoutConsequence": "पेमेंट के बाद Zook desk verification के लिए pickup code बनाता है. Code के बिना collect न करें.",
    "shop.checkoutCreated": "Checkout बन गया.",
    "shop.codeWithValue": "Code: {{code}}",
    "shop.continuePayment": "पेमेंट जारी रखें",
    "shop.continueInBrowser": "Browser में जारी रखें",
    "shop.confirming": "कन्फर्म हो रहा है...",
    "shop.copyPickupCodeAccessibility": "Pickup code {{code}} copy करें",
    "shop.couldNotCreateCheckout": "Checkout नहीं बन सका.",
    "shop.backToShop": "शॉप पर वापस",
    "shop.payment": "पेमेंट",
    "shop.paymentSubtitle": "भुगतान के बाद आपका आइटम डेस्क पर मिलेगा.",
    "shop.paymentConfirmed": "Payment confirmed.",
    "shop.paymentCouldNotComplete": "Payment पूरा नहीं हो सका.",
    "shop.paymentStillPending": "Payment अभी pending है. थोड़ी देर में फिर कोशिश करें.",
    "shop.paySecurely": "सुरक्षित भुगतान",
    "shop.confirmOrder": "ऑर्डर कन्फर्म करें",
    "shop.getPickupCode": "पिकअप कोड पाएं",
    "shop.makeDeskCode": "हम डेस्क के लिए कोड बनाएंगे",
    "shop.collectAtDesk": "डेस्क से लें",
    "shop.showPickupCode": "लेने के लिए कोड दिखाएं",
    "shop.showThisToCollect": "Order collect करने के लिए यह दिखाएं",
    "shop.orderTotal": "ऑर्डर कुल",
    "shop.pickupCheckout": "Pickup checkout",
    "shop.itemsLabel": "Items",
    "shop.itemCount": "{{count}} item",
    "shop.itemsCount": "{{count}} items",
    "shop.pickupLabel": "Pickup",
    "shop.selectedGym": "चुना हुआ gym",
    "shop.cart": "कार्ट",
    "shop.reviewOrder": "ऑर्डर देखें",
    "shop.reviewOrderSubtitle": "पेमेंट के बाद फ्रंट डेस्क से पिकअप करें.",
    "shop.back": "वापस",
    "shop.creating": "बन रहा है...",
    "shop.inStockCount": "{{count}} stock में",
    "shop.mockPaymentUnavailable": "Backend builds में mock payment completion available नहीं है.",
    "shop.onlyLeft": "सिर्फ {{count}} बचे हैं",
    "shop.orderHistory": "Order history",
    "shop.outOfStock": "Out of stock",
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
    "findGyms.city": "शहर",
    "findGyms.coverPhoto": "{{name}} cover photo",
    "findGyms.discovery": "डिस्कवरी",
    "findGyms.gymNameOrUsername": "जिम का नाम या username",
    "findGyms.noGyms": "कोई जिम नहीं",
    "findGyms.noGymsBody": "शहर को व्यापक करें या खोज साफ करें.",
    "findGyms.openGym": "{{name}} खोलें",
    "findGyms.referralApplied": "Referral code लागू हुआ",
    "findGyms.referralPrefix": "कोड",
    "findGyms.referralSuffix": "जुड़ा है. इसे इस्तेमाल करने के लिए कोई भी जिम खोलें.",
    "findGyms.resultCountMany": "{{count}} results",
    "findGyms.resultCountOne": "1 result",
    "findGyms.searching": "खोज हो रही है...",
    "findGyms.title": "अपना जिम खोजें",
    "findGyms.view": "देखें",
    "gymProfile.activeUntil": "{{date}} तक सक्रिय",
    "gymProfile.address": "पता",
    "gymProfile.alreadyActive": "पहले से सक्रिय",
    "gymProfile.apply": "लागू करें",
    "gymProfile.approvedDate": "{{date}} को approved",
    "gymProfile.approvedForPayment": "पेमेंट के लिए approved",
    "gymProfile.atAGlance": "एक नजर में",
    "gymProfile.choosePlan": "प्लान चुनें",
    "gymProfile.choosePlanToContinue": "जारी रखने के लिए प्लान चुनें.",
    "gymProfile.coaches": "कोच",
    "gymProfile.completeEarlierStep": "पहले वाला स्टेप पूरा करें",
    "gymProfile.couldNotLoad": "यह जिम लोड नहीं हो सका",
    "gymProfile.currentMembership": "मौजूदा मेंबरशिप",
    "gymProfile.dateRange": "{{start}} से {{end}}",
    "gymProfile.daysCount": "{{count}} दिन",
    "gymProfile.equipment": "उपकरण",
    "gymProfile.eyebrow": "जिम प्रोफाइल",
    "gymProfile.flexibleMembership": "Flexible membership",
    "gymProfile.getDirections": "Directions पाएं",
    "gymProfile.gettingThere": "वहां पहुंचना",
    "gymProfile.howToJoin": "कैसे जुड़ें",
    "gymProfile.inside": "अंदर",
    "gymProfile.instant": "तुरंत",
    "gymProfile.inviteCode": "Invite code",
    "gymProfile.inviteOnly": "Invite only",
    "gymProfile.inviteReferralRequired": "Invite या referral जरूरी",
    "gymProfile.inviteReferralRequiredBody":
      "इस जिम को referral link से खोलें या जारी रखने के लिए gym team से code मांगें.",
    "gymProfile.joinFlow": "Join flow",
    "gymProfile.joinPath": "Join path",
    "gymProfile.joinRequest": "Join request",
    "gymProfile.location": "लोकेशन",
    "gymProfile.membershipOptions": "मेंबरशिप विकल्प",
    "gymProfile.membershipProfile": "मेंबरशिप प्रोफाइल",
    "gymProfile.membershipRequestSubmitted": "मेंबरशिप अनुरोध भेजा गया.",
    "gymProfile.membershipRequestSubmittedBody":
      "मेंबरशिप अनुरोध भेजा गया. जिम टीम अब इसे अपने dashboard से review कर सकती है.",
    "gymProfile.membershipState": "मेंबरशिप स्थिति",
    "gymProfile.moveStraightToPayment": "आप सीधे पेमेंट पर जा सकते हैं.",
    "gymProfile.noBioAdded": "Bio नहीं जोड़ा गया.",
    "gymProfile.noPublicPlans": "कोई public plan नहीं",
    "gymProfile.noPublicTrainerProfiles": "कोई public trainer profile नहीं",
    "gymProfile.noTrainerBioPublished": "Trainer bio प्रकाशित नहीं है.",
    "gymProfile.notFound": "जिम नहीं मिला",
    "gymProfile.notFoundBody": "यह लिंक expire हो सकता है या जिम move हो गया हो सकता है.",
    "gymProfile.openTrainerProfile": "{{name}} profile खोलें",
    "gymProfile.openingPayment": "पेमेंट खुल रहा है...",
    "gymProfile.paymentStarted": "पेमेंट शुरू हुआ. मेंबरशिप activate करने के लिए इसे पूरा करें.",
    "gymProfile.pendingSince": "{{date}} से pending",
    "gymProfile.photoOf": "फोटो {{index}} / {{count}}",
    "gymProfile.planAvailableMany": "{{count}} plans उपलब्ध",
    "gymProfile.planAvailableOne": "1 plan उपलब्ध",
    "gymProfile.referralApplied": "Referral लागू",
    "gymProfile.referralInviteRequired": "Referral या invite जरूरी है.",
    "gymProfile.referralPrice": "Referral price",
    "gymProfile.requestMembershipFirst": "पहले मेंबरशिप अनुरोध करें",
    "gymProfile.requestMembershipFirstBody":
      "यह जिम पेमेंट से पहले नए members को review करता है. अपना request भेजें और owner web dashboard से approve कर सकता है.",
    "gymProfile.reviewed": "Reviewed",
    "gymProfile.securePayment": "Secure payment",
    "gymProfile.sendMembershipRequest": "मेंबरशिप अनुरोध भेजें",
    "gymProfile.staffApprovalBeforePayment": "पेमेंट से पहले staff approval होता है.",
    "gymProfile.standardMembershipPlan": "Standard membership plan.",
    "gymProfile.stepActivatePlan": "प्लान activate करें",
    "gymProfile.stepActivatePlanBody": "Approved होने के बाद यहां लौटकर payment पूरा करें.",
    "gymProfile.stepBrowsePublicPlans": "Public plans देखें",
    "gymProfile.stepBrowsePublicPlansBody":
      "Staff का इंतजार किए बिना price, access, trainer support और plan format compare करें.",
    "gymProfile.stepPayInstantly": "तुरंत पेमेंट करें",
    "gymProfile.stepPayInstantlyBody": "मोबाइल से सुरक्षित पेमेंट करें.",
    "gymProfile.stepPaySecurely": "सुरक्षित पेमेंट करें",
    "gymProfile.stepPaySecurelyBody": "Invite rules पूरी होने पर payment membership activate करता है.",
    "gymProfile.stepReferralAttached": "Referral {{code}} जुड़ा है.",
    "gymProfile.stepReferralRequired": "जारी रखने से पहले referral या invite जरूरी है.",
    "gymProfile.stepReviewPlans": "Plans review करें",
    "gymProfile.stepReviewPlansBody": "Code accept होने के बाद plans join किए जा सकते हैं.",
    "gymProfile.stepSecureReferral": "Referral सुरक्षित करें",
    "gymProfile.stepSendRequest": "Request भेजें",
    "gymProfile.stepSendRequestBody": "अगर यह जिम नए members review करता है, तो payment से पहले request भेजें.",
    "gymProfile.stepStaffReview": "Staff review",
    "gymProfile.stepStaffReviewBody": "Gym team आपका request review करती है.",
    "gymProfile.stepStartTraining": "Training शुरू करें",
    "gymProfile.stepStartTrainingBody":
      "Gym QR scan करें, unique entry code लें, और floor या desk पर दिखाएं.",
    "gymProfile.submitting": "भेजा जा रहा है...",
    "gymProfile.trainerTeam": "Trainer team",
    "gymProfile.unableStartPayment": "पेमेंट शुरू नहीं हो सका.",
    "gymProfile.unableSubmitMembershipRequest": "मेंबरशिप अनुरोध नहीं भेजा जा सका.",
    "gymProfile.updatingMembershipStatus": "मेंबरशिप status update हो रहा है...",
    "gymProfile.validityDays": "{{count}} validity days",
    "gymProfile.visitsRemaining": "{{count}} visits बाकी",
    "gymProfile.whatsInside": "अंदर क्या है",
    "empty.loading": "लोड हो रहा है",
    "empty.loadingBody": "आपके जिम की जानकारी लाई जा रही है.",
    "tracking.bodyTimeline": "फोटो टाइमलाइन",
    "tracking.bodyTimelineSubtitle": "{{count}} बॉडी कंपोजिशन एंट्री",
    "tracking.armsCm": "Arms cm",
    "tracking.body": "Body",
    "tracking.bodyFatPercent": "Body fat %",
    "tracking.bodyMeasurements": "Body measurements",
    "tracking.bodyMeasurementsSaved": "Body measurements सेव हो गईं.",
    "tracking.bodyProgress": "Body progress",
    "tracking.calfCm": "Calf cm",
    "tracking.calvesCm": "Calves cm",
    "tracking.chestCm": "Chest cm",
    "tracking.couldNotSaveMeasurements": "Measurements सेव नहीं हो सकीं",
    "tracking.couldNotSaveWorkout": "Workout सेव नहीं हो सका",
    "tracking.durationMinutes": "Duration (minutes)",
    "tracking.exercise": "Exercise",
    "tracking.exerciseName": "Exercise name",
    "tracking.exerciseNamePlaceholder": "Push press",
    "tracking.forearmsCm": "Forearms cm",
    "tracking.hipsCm": "Hips cm",
    "tracking.historyTitle": "Workout history",
    "tracking.loggedWorkout": "Logged workout",
    "tracking.muscleMassKg": "Muscle mass kg",
    "tracking.neckCm": "Neck cm",
    "tracking.noBodyMeasurements": "Body measurements नहीं हैं",
    "tracking.noBodyMeasurementsBody": "समय के साथ trends देखने के लिए measurements log करें.",
    "tracking.noWorkoutsYet": "अभी कोई workout नहीं",
    "tracking.noWorkoutsYetBody": "आपके logged workouts यहां दिखेंगे.",
    "tracking.notes": "Notes",
    "tracking.notesPlaceholder": "Front/side/back photos progress photos से attach की जा सकती हैं.",
    "tracking.reps": "Reps",
    "tracking.restingHeartRate": "Resting heart rate",
    "tracking.saveMeasurements": "Measurements सेव करें",
    "tracking.saveWorkout": "Workout सेव करें",
    "tracking.session": "Session",
    "tracking.sets": "Sets",
    "tracking.shouldersCm": "Shoulders cm",
    "tracking.strength": "Strength",
    "tracking.thighsCm": "Thighs cm",
    "tracking.visceralFatRating": "Visceral fat rating",
    "tracking.waist": "Waist",
    "tracking.waistCm": "Waist cm",
    "tracking.weightKg": "Weight kg",
    "tracking.workout": "Workout",
    "tracking.workoutSaved": "Workout सेव हो गया.",
    "tracking.workoutSet": "Workout set",
    "tracking.workoutTitle": "Workout title",
    "tracking.workoutTitlePlaceholder": "जैसे Push day",
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
    "member.attendance.approved": "Approved",
    "member.attendance.assignedBranch": "Assigned branch",
    "member.attendance.backToHome": "Home पर वापस",
    "member.attendance.branch": "ब्रांच",
    "member.attendance.checkIn": "Check-in",
    "member.attendance.checkOut": "Check-out",
    "member.attendance.checkedIn": "Checked in",
    "member.attendance.checkedOut": "Checked out",
    "member.attendance.copyCodeFailed": "Code copy नहीं हो सका.",
    "member.attendance.copyEntryCodeAccessibility": "Entry code {{code}} copy करें",
    "member.attendance.deskCanHelp": "Desk इस check-in को पूरा करने में मदद कर सकता है.",
    "member.attendance.deskConfirmationNeeded": "Desk confirmation चाहिए",
    "member.attendance.deskHelpNeeded": "Desk help चाहिए",
    "member.attendance.dismissDetails": "Attendance details बंद करें",
    "member.attendance.duration": "अवधि",
    "member.attendance.entryApproved": "आपके gym के लिए entry approved है",
    "member.attendance.entryCode": "Entry Code",
    "member.attendance.entryCodeCopied": "Entry code copy हुआ.",
    "member.attendance.entryCodeUnavailable": "Entry code unavailable - reception से manual check-in करने को कहें.",
    "member.attendance.gymTimeRecorded": "आपका gym time record हो गया.",
    "member.attendance.inProgress": "चल रहा है",
    "member.attendance.mainBranch": "Main branch",
    "member.attendance.membershipActive": "मेंबरशिप सक्रिय है",
    "member.attendance.nextUp": "Next up",
    "member.attendance.notApproved": "Check-in approved नहीं हुआ",
    "member.attendance.notFound": "यह record आपकी history में नहीं मिला",
    "member.attendance.openAssignedPlanAccessibility": "Assigned plan खोलें",
    "member.attendance.openAssignedPlanBody": "अपना current assigned plan खोलें.",
    "member.attendance.openPlan": "Plan खोलें",
    "member.attendance.pendingApproval": "Pending approval",
    "member.attendance.pendingBody": "आपका check-in receive हो गया है. यह code front desk पर दिखाएं.",
    "member.attendance.plan": "प्लान",
    "member.attendance.profilePhotoRecommended": "Profile photo recommended",
    "member.attendance.refreshStatus": "Status refresh करें",
    "member.attendance.reviewAtDesk": "Front desk से इस check-in को review करने को कहें.",
    "member.attendance.showToDesk": "पूछे जाने पर इसे front desk को दिखाएं.",
    "member.attendance.status": "Status",
    "member.attendance.title": "Attendance",
    "member.attendance.updating": "Update हो रहा है...",
    "member.attendance.waitingDeskApproval": "Desk approval का इंतज़ार",
    "member.attendance.whyConfirmation": "Confirmation क्यों?",
    "member.attendance.whyConfirmationBody": "आपका gym कुछ check-ins को approved mark करने से पहले desk confirmation मांगता है.",
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
    "member.classDetail.bookClass": "क्लास बुक करें",
    "member.classDetail.booked": "बुक्ड",
    "member.classDetail.bookWithPrice": "बुक करें · {{price}}",
    "member.classDetail.cancelBooking": "बुकिंग रद्द करें",
    "member.classDetail.cancelling": "रद्द हो रहा है...",
    "member.classDetail.classDetails": "क्लास विवरण",
    "member.classDetail.classFallback": "क्लास",
    "member.classDetail.coachName": "कोच {{name}}",
    "member.classDetail.continuePayment": "पेमेंट जारी रखें",
    "member.classDetail.full": "फुल",
    "member.classDetail.joinWaitlist": "वेटलिस्ट में जुड़ें",
    "member.classDetail.left": "{{count}} बाकी",
    "member.classDetail.notFound": "क्लास नहीं मिली",
    "member.classDetail.paymentDue": "पेमेंट बाकी",
    "member.classDetail.spots": "{{count}} स्पॉट",
    "member.classDetail.spotsBooked": "स्पॉट बुक",
    "member.classDetail.waitlisted": "वेटलिस्टेड",
    "member.classes.bookClass": "क्लास बुक करें",
    "member.classes.bookWithPrice": "बुक करें · {{price}}",
    "member.classes.booked": "बुक्ड",
    "member.classes.branchSchedule": "{{branch}} schedule",
    "member.classes.cancelling": "रद्द हो रहा है...",
    "member.classes.coachName": "कोच {{name}}",
    "member.classes.continuePayment": "पेमेंट जारी रखें",
    "member.classes.couldNotLoad": "Classes लोड नहीं हो सकीं.",
    "member.classes.free": "फ्री",
    "member.classes.full": "फुल",
    "member.classes.joinWaitlist": "वेटलिस्ट में जुड़ें",
    "member.classes.left": "{{count}} बाकी",
    "member.classes.noClasses": "कोई क्लास scheduled नहीं",
    "member.classes.noClassesBody": "जल्द फिर देखें - हर हफ्ते नए group sessions जोड़े जाते हैं.",
    "member.classes.onWaitlist": "वेटलिस्ट पर",
    "member.classes.opening": "खुल रहा है...",
    "member.classes.paymentDue": "पेमेंट बाकी",
    "member.classes.spots": "{{count}} स्पॉट",
    "member.classes.subtitle": "Upcoming group sessions में अपनी spot reserve करें.",
    "member.classes.title": "क्लासेस",
    "member.classes.waitlisted": "वेटलिस्टेड",
    "member.you.accountCenter": "Zook अकाउंट सेंटर",
    "member.you.appearance": "दिखावट",
    "member.you.backToOwnerMode": "Owner मोड पर वापस",
    "member.you.gymShop": "जिम शॉप",
    "member.you.helpSupport": "मदद और सपोर्ट",
    "member.you.membership": "मेंबरशिप",
    "member.you.privacy": "प्राइवेसी",
    "member.you.quickActions": "त्वरित एक्शन",
    "member.you.switchGym": "जिम बदलें",
    "member.you.switchToRole": "{{role}} पर स्विच करें",
    "member.you.theme.dark": "डार्क",
    "member.you.theme.light": "लाइट",
    "member.you.theme.system": "सिस्टम",
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
    "member.membership.activePlan": "सक्रिय प्लान",
    "member.membership.autopayActive": "Autopay active है.",
    "member.membership.autopayCancelled": "Autopay cancel हो गया.",
    "member.membership.browseGymsBody": "शुरू करने के लिए gyms देखें और membership खरीदें.",
    "member.membership.browserReturnBody": "Checkout के बाद वापस आएं. वापस आने पर Zook आपकी membership refresh करेगा.",
    "member.membership.cancelConfirmBody": "आपका current term खत्म होने तक access रहेगा, लेकिन renew नहीं होगा और बाद में resume नहीं किया जा सकेगा. इसे undo नहीं किया जा सकता.",
    "member.membership.cancelConfirmTitle": "Membership cancel करें?",
    "member.membership.cancelMembership": "Membership cancel करें",
    "member.membership.cancelled": "Membership cancel हो गई.",
    "member.membership.checkingPaymentStatus": "Payment status check हो रहा है...",
    "member.membership.choosePlan": "Plan चुनें",
    "member.membership.continueCheckout": "Checkout जारी रखें",
    "member.membership.continuingBrowser": "Browser में जारी है.",
    "member.membership.continuingBrowserTitle": "Browser में जारी",
    "member.membership.currentPlan": "Current plan",
    "member.membership.days": "{{count}} दिन",
    "member.membership.eyebrow": "Membership",
    "member.membership.findGyms": "Gyms खोजें",
    "member.membership.gymDefinedValidity": "Gym-defined validity",
    "member.membership.history": "Membership history",
    "member.membership.historyJumpBody": "आपकी previous memberships और payment trail पर ले गए.",
    "member.membership.invoiceGenerated": "Invoice generated.",
    "member.membership.invoiceUnavailable": "Invoice unavailable",
    "member.membership.keepMembership": "Membership रखें",
    "member.membership.noActivePlans": "कोई active plan नहीं",
    "member.membership.noAlternatePlans": "कोई alternate plan published नहीं है. Same-plan renewal request होगा.",
    "member.membership.noMemberships": "कोई membership नहीं",
    "member.membership.pause": "Pause",
    "member.membership.pauseConfirmBody": "{{date}} तक आपका access frozen रहेगा. उससे पहले कभी भी resume कर सकते हैं.",
    "member.membership.pauseConfirmTitle": "Membership pause करें?",
    "member.membership.pauseReason": "Member selected a membership pause date from mobile.",
    "member.membership.pausedToast": "{{date}} तक paused.",
    "member.membership.pausedUntil": "Membership {{date}} तक paused.",
    "member.membership.paySecurely": "Securely pay करें",
    "member.membership.paymentDocuments": "Payment documents",
    "member.membership.paymentDocumentsBody": "Receipts और invoices नीचे हैं.",
    "member.membership.plan": "Plan",
    "member.membership.planSwitched": "Plan switch हो गया.",
    "member.membership.receiptGenerated": "Receipt generated.",
    "member.membership.receiptUnavailable": "Receipt unavailable",
    "member.membership.renewMembership": "Membership renew करें",
    "member.membership.renewalConfirmed": "Renewal confirmed.",
    "member.membership.renewalConsequence": "Renewed membership payment service या gym desk से payment confirmation के बाद activate होती है.",
    "member.membership.renewalFlowOpened": "इस membership के लिए renewal flow खोल दिया गया.",
    "member.membership.renewalRequestSent": "Renewal request भेज दी गई.",
    "member.membership.renewalSheetBody": "{{gym}} में same plan जारी रखें या दूसरा available option चुनें.",
    "member.membership.renewalSummary": "Renewal summary",
    "member.membership.resumed": "Membership resume हो गई.",
    "member.membership.selectedPlan": "Selected plan",
    "member.membership.selectPlanAccessibility": "{{plan}} चुनें",
    "member.membership.starting": "Start हो रहा है...",
    "member.membership.statusBelow": "Membership status नीचे है.",
    "member.membership.subscriptionUpdated": "आपकी subscription update हो गई.",
    "member.membership.summary": "{{active}} active · {{expiring}} expiring soon · {{total}} total",
    "member.membership.switchNow": "अब switch करें",
    "member.membership.title": "आपके plans",
    "member.membership.update": "Membership update",
    "member.membership.updating": "Update हो रहा है...",
    "member.membership.validity": "Validity",
    "member.membership.visits": "Visits",
    "member.membership.yourGym": "आपका gym",
    "member.profile.active": "सक्रिय",
    "member.profile.activeGymOption": "{{gym}} (active)",
    "member.profile.activeRoleOption": "{{role}} (active)",
    "member.profile.biometric": "Biometric",
    "member.profile.biometricOn": "Biometric on",
    "member.profile.biometricUnlock": "Biometric unlock",
    "member.profile.biometricUnlockBody": "इसे enable करने के लिए Face ID या device biometrics set up करें.",
    "member.profile.checkedIn": "Checked in",
    "member.profile.classes": "क्लासेस",
    "member.profile.daysReferralBenefit": "हर join करने वाले friend पर आपको {{count}} free days मिलेंगे.",
    "member.profile.daysRemaining": "{{count}} दिन बाकी",
    "member.profile.daysRemainingOf": "{{remaining}} में से {{total}} दिन बाकी",
    "member.profile.defaultReferralBenefit": "अपना code share करें ताकि gym आपके लाए friends track कर सके.",
    "member.profile.earnedCredit": "{{amount}} earned",
    "member.profile.expires": "{{date}} expire",
    "member.profile.findGyms": "Gyms खोजें",
    "member.profile.friendsStat": "आपके friends: {{joined}} joined, {{pending}} pending",
    "member.profile.membership": "मेंबरशिप",
    "member.profile.membershipDetailsUnavailable": "Membership details unavailable",
    "member.profile.memberFallback": "Zook member",
    "member.profile.myGym": "मेरा gym",
    "member.profile.noActiveMembership": "कोई active membership नहीं",
    "member.profile.noActivity": "कोई activity नहीं",
    "member.profile.noGyms": "कोई gym नहीं",
    "member.profile.noGymsBody": "पहले gym join करें या access request करें.",
    "member.profile.noRoleAssigned": "कोई role assigned नहीं",
    "member.profile.noRoles": "कोई roles नहीं",
    "member.profile.noRolesBody": "इस account में active gym में दूसरा role नहीं है.",
    "member.profile.otherGymRoleBody": "{{role}} tools खोलने से पहले gyms switch करें.",
    "member.profile.otherGymRoleTitle": "{{role}} दूसरे gym में है",
    "member.profile.pendingCredit": "{{amount}} pending",
    "member.profile.percentComplete": "{{percent}}% complete",
    "member.profile.percentCompleteWithDate": "{{percent}}% complete - {{date}}",
    "member.profile.qaShortcuts": "QA shortcuts",
    "member.profile.quickActions": "Quick actions",
    "member.profile.recentActivity": "Recent activity",
    "member.profile.referGymAccessibility": "Zook को gym refer करें और earn करें",
    "member.profile.referGymBody": "आपके referred gym के 6-month या yearly plan पर Zook subscribe करने पर earn करें.",
    "member.profile.referGymTitle": "Gym refer करें और cash earn करें",
    "member.profile.referralCodeCopied": "आपका referral code copy हो गया.",
    "member.profile.referralCopied": "Referral copy हुआ",
    "member.profile.referralLinkCopied": "आपका referral link copy हो गया.",
    "member.profile.renew": "Renew",
    "member.profile.roleUnavailable": "Role unavailable",
    "member.profile.roleUnavailableBody": "यह role यहां available नहीं है.",
    "member.profile.roleAtGym": "{{gym}} में {{role}}",
    "member.profile.settings": "Settings",
    "member.profile.shareReferralCode": "{{gym}} पर मेरा referral code {{code}} use करें.",
    "member.profile.shareReferralWithLink": "{{gym}} join करें मेरे referral code {{code}} से: {{link}}",
    "member.profile.signOut": "Sign out",
    "member.profile.signOutConfirmBody": "आप OTP से कभी भी वापस sign in कर सकते हैं.",
    "member.profile.signOutConfirmTitle": "Sign out करें?",
    "member.profile.switch": "Switch",
    "member.profile.switchFailed": "Switch failed",
    "member.profile.switchFailedBody": "अभी gyms switch नहीं हो सके.",
    "member.profile.switchGym": "Gym switch करें",
    "member.profile.switchGymBody": "अपना active gym चुनें.",
    "member.profile.switchGymConfirmBody": "आपका profile उस gym के लिए refresh होगा.",
    "member.profile.switchGymConfirmTitle": "{{gym}} पर switch करें?",
    "member.profile.switchGymForRole": "{{role}} tools access करने के लिए {{gym}} पर switch करें",
    "member.profile.switchRole": "Role switch करें",
    "member.profile.switchRoleBody": "इस gym में use करने वाला role चुनें.",
    "member.profile.switchRoleConfirmBody": "Zook उस role के tools खोलेगा.",
    "member.profile.switchRoleConfirmTitle": "{{role}} पर switch करें?",
    "member.profile.switching": "Switch हो रहा है...",
    "member.profile.title": "Profile",
    "member.profile.trainerReferralBenefit": "Trainer referrals commission review के लिए track होते हैं जब member join करता है या gym आपके link से sign up करता है.",
    "member.profile.updating": "Updating",
    "member.profile.useRoleAccessibility": "Zook को {{role}} की तरह use करें",
    "member.profile.viewHistory": "History देखें",
    "member.profile.visitsReferralBenefit": "हर join करने वाले friend पर आपको {{count}} visits मिलेंगे.",
    "member.profile.visitsRemaining": "{{remaining}} of {{total}} remaining",
    "member.profile.workoutPlan": "Workout plan",
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
    "member.receipt.amount": "राशि",
    "member.receipt.downloadInvoice": "Invoice डाउनलोड करें",
    "member.receipt.generating": "Confirmation के बाद generate होगा",
    "member.receipt.invoice": "Invoice",
    "member.receipt.invoiceNo": "Invoice no.",
    "member.receipt.issued": "Issued",
    "member.receipt.membership": "मेंबरशिप",
    "member.receipt.mode": "Mode",
    "member.receipt.notFound": "Receipt नहीं मिली",
    "member.receipt.notFoundBody": "आपकी membership history में यह payment नहीं मिला.",
    "member.receipt.paymentDetails": "Payment details",
    "member.receipt.purpose": "Purpose",
    "member.receipt.receiptNo": "Receipt no.",
    "member.receipt.receiptNumber": "Receipt {{number}}",
    "member.receipt.recorded": "Recorded",
    "member.receipt.status": "Status",
    "member.receipt.title": "Receipt",
    "member.receipt.total": "Total",
    "member.scan.addPhoto": "फोटो जोड़ें",
    "member.scan.allowCamera": "कैमरा allow करें",
    "member.scan.allowCameraQr": "जिम QR स्कैन करने के लिए कैमरा access allow करें.",
    "member.scan.allowCameraSettings": "QR code स्कैन करने के लिए Settings में camera access allow करें.",
    "member.scan.alreadyCheckedInToday": "आज पहले से चेक-इन हो चुका है.",
    "member.scan.awaitingQr": "QR का इंतज़ार",
    "member.scan.awaitingSubmit": "Submit का इंतज़ार",
    "member.scan.backToCameraScanner": "Camera scanner पर वापस",
    "member.scan.cameraAccessBlocked": "Camera access blocked",
    "member.scan.cameraAvailable": "Camera available",
    "member.scan.cameraAvailableAnnouncement": "Camera available है. इसे gym QR code पर point करें.",
    "member.scan.cameraBlockedAnnouncement": "Camera access blocked है. QR scanning allow करने के लिए device settings खोलें.",
    "member.scan.cameraNeeded": "Camera चाहिए",
    "member.scan.cameraNeededAnnouncement": "Scanning से पहले camera permission चाहिए.",
    "member.scan.cameraPreviewAccessibility": "QR scanner camera preview",
    "member.scan.cantScan": "Scan नहीं हो रहा?",
    "member.scan.checkCodeAccessibility": "Code check करें",
    "member.scan.checkedIn": "Checked in",
    "member.scan.checkingCode": "Code check हो रहा है...",
    "member.scan.codeCaptured": "Code captured",
    "member.scan.codeEntered": "Code entered",
    "member.scan.codeHint": "QR के साथ दिखाए गए दो letters और चार digits डालें.",
    "member.scan.couldNotReadQr": "QR code पढ़ा नहीं जा सका. फिर कोशिश करें.",
    "member.scan.enableCamera": "Camera enable करें",
    "member.scan.enterCheckInCode": "Check-in code डालें",
    "member.scan.enterCode": "Code डालें",
    "member.scan.enterCodeManually": "Code manually डालें",
    "member.scan.enterDeskCodeManually": "Desk code manually डालें.",
    "member.scan.enterManualCodeAccessibility": "Manual check-in code डालें",
    "member.scan.membershipExpired": "Membership expire हो गई है. Check-in से पहले renew करें.",
    "member.scan.needFourNumbers": "4 numbers चाहिए (जैसे 1234)",
    "member.scan.needTwoLetters": "2 letters चाहिए (जैसे AB)",
    "member.scan.notVerified": "Verified नहीं",
    "member.scan.offlineSavedBody": "Connection नहीं है. आपका scan retry के लिए save है, लेकिन entry अभी confirm नहीं है.",
    "member.scan.offlineSavedTitle": "Scan retry के लिए save हुआ",
    "member.scan.offlineSavedToast": "Server accept करने तक entry confirm नहीं है.",
    "member.scan.openDeviceSettings": "QR scanning allow करने के लिए device settings खोलें.",
    "member.scan.openSettings": "Settings खोलें",
    "member.scan.profilePhotoRecommended": "Check-in के बाद profile photo जोड़ें ताकि desk अगली बार आपको जल्दी verify कर सके.",
    "member.scan.queuedScanWaiting": "{{count}} scan server confirmation का इंतज़ार कर रहा है.",
    "member.scan.queuedScansWaiting": "{{count}} scans server confirmation का इंतज़ार कर रहे हैं.",
    "member.scan.retryNow": "अब retry करें",
    "member.scan.returnToQrScannerAccessibility": "QR scanner पर वापस जाएं",
    "member.scan.savedCheckInConfirmed": "Saved check-in confirmed.",
    "member.scan.savedCheckInsConfirmed": "{{count}} saved check-ins confirmed.",
    "member.scan.scanAgain": "फिर scan करें",
    "member.scan.searchingForCode": "Code खोज रहा है...",
    "member.scan.serverCheck": "Server check",
    "member.scan.serverVerified": "Server verified",
    "member.scan.signInAgain": "Scanning से पहले फिर sign in करें.",
    "member.scan.signInSelectGym": "Scanning से पहले sign in करें और gym चुनें.",
    "member.scan.subtitle": "अपने gym के QR code पर camera point करें",
    "member.scan.title": "Check-in scan करें",
    "member.scan.tryCameraAgain": "Camera फिर try करें",
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
    "owner.payouts.baseMonthly": "Base / month (₹)",
    "owner.payouts.confirmBody": "{{period}} के लिए {{amount}} paid mark करें.",
    "owner.payouts.confirmTitle": "{{name}} को pay करें?",
    "owner.payouts.earningLines": "{{count}} earning lines",
    "owner.payouts.emptyBody": "Trainer earnings accrue होने पर यहां दिखेंगी.",
    "owner.payouts.emptyTitle": "अभी कोई payout नहीं",
    "owner.payouts.hideSettings": "Payout settings छिपाएं",
    "owner.payouts.markPaid": "Paid mark करें",
    "owner.payouts.marking": "Mark हो रहा है...",
    "owner.payouts.outstanding": "इस महीने outstanding",
    "owner.payouts.paid": "Paid",
    "owner.payouts.payDay": "Pay day (1-28)",
    "owner.payouts.perSession": "Per session (₹)",
    "owner.payouts.ptCommission": "PT commission (%)",
    "owner.payouts.saveSettings": "Settings save करें",
    "owner.payouts.settings": "Payout settings",
    "owner.payouts.subtitle": "अपने coaches को review और pay करें.",
    "owner.payouts.thisMonth": "इस महीने",
    "owner.payouts.thisMonthLower": "इस महीने",
    "owner.payouts.title": "Trainer payouts",
    "owner.payouts.trainerFallback": "Trainer",
    "owner.payouts.trainerLower": "trainer",
    "owner.stock.allInStock": "सभी products stock में हैं",
    "owner.stock.allInStockBody": "Inventory कम होने वाले items यहां दिखेंगे.",
    "owner.stock.lowStock": "Low stock",
    "owner.stock.memberPickup": "Member pickup",
    "owner.stock.noPickups": "कोई pickup waiting नहीं",
    "owner.stock.noPickupsBody": "Collection के लिए waiting paid shop orders यहां दिखेंगे.",
    "owner.stock.paidOrders": "Paid orders",
    "owner.stock.pickupOrders": "Pickup orders",
    "owner.stock.pickupPending": "Pickup pending",
    "owner.stock.pickups": "Pickups",
    "owner.stock.productsToReorder": "Reorder करने वाले products",
    "owner.stock.reorderBody": "Hi,\n\nकृपया {{name}} के supplier options share करें.\n\nCurrent stock: {{stock}}\nThreshold: {{threshold}}\n\nThanks.",
    "owner.stock.reorderSubject": "{{name}} reorder",
    "owner.stock.title": "Stock",
    "owner.stock.underThreshold": "Threshold से कम",
    "owner.referrals.allowTrainerReferrals": "Trainer referrals allow करें",
    "owner.referrals.codeExpiryDays": "Code expiry (दिन)",
    "owner.referrals.creditInr": "Credit (₹)",
    "owner.referrals.discountInr": "Discount ₹",
    "owner.referrals.discountPercent": "Discount %",
    "owner.referrals.enabled": "Referrals enabled",
    "owner.referrals.enabledBody": "पूरे referral program को on या off करें.",
    "owner.referrals.flatInr": "Flat ₹",
    "owner.referrals.freeDays": "Free days",
    "owner.referrals.limits": "Limits",
    "owner.referrals.maxPerMemberMonth": "Max / member / month",
    "owner.referrals.memberGymCreditBody": "जब member के referral से gym sign up करे, member को मिलने वाला account credit.",
    "owner.referrals.memberRefersMember": "Member refers a member",
    "owner.referrals.memberRefersNewGym": "Member refers a new gym",
    "owner.referrals.newMemberGets": "New member gets",
    "owner.referrals.none": "None",
    "owner.referrals.percent": "Percent",
    "owner.referrals.referrerEarns": "Referrer earns",
    "owner.referrals.saveSettings": "Referral settings save करें",
    "owner.referrals.subtitle": "Referrals पर सबको कितना reward मिलता है, सेट करें.",
    "owner.referrals.title": "Referral program",
    "owner.referrals.trainerEarns": "Trainer earns",
    "owner.referrals.trainerRefersMember": "Trainer refers a member",
    "owner.referrals.visits": "Visits",
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
    "trainer.clientSessions.adherence": "Adherence",
    "trainer.clientSessions.averageCompletion": "Recent plan feedback में {{percent}}% average completion.",
    "trainer.clientSessions.backToClients": "Clients पर वापस",
    "trainer.clientSessions.noDetails": "कोई details नहीं जोड़ी गई.",
    "trainer.clientSessions.noPlans": "कोई plan नहीं",
    "trainer.clientSessions.planFeedback": "Plan feedback",
    "trainer.clientSessions.title": "Client Detail",
    "trainer.clientSessions.waitingForFeedback": "Member feedback और workout logs का इंतजार है.",
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
