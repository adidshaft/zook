export type PublicLocale = "en" | "hi";

type SearchParamsLike = Record<string, string | string[] | undefined> | undefined;

export function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function resolvePublicLocale(searchParams?: SearchParamsLike): PublicLocale {
  return firstParam(searchParams?.lang)?.toLowerCase() === "hi" ? "hi" : "en";
}

export function resolvePublicLocaleFromHeader(acceptLanguage?: string | null): PublicLocale {
  if (!acceptLanguage) return "en";
  return /\bhi\b/i.test(acceptLanguage) ? "hi" : "en";
}

export function alternatePublicLocale(locale: PublicLocale): PublicLocale {
  return locale === "hi" ? "en" : "hi";
}

export function localizedPath(
  path: string,
  locale: PublicLocale,
  params: Record<string, string | number | null | undefined> = {},
) {
  if (/^(mailto:|tel:|https?:|zook:)/.test(path)) {
    return path;
  }
  const [pathWithoutHash, hash] = path.split("#");
  const url = new URL(pathWithoutHash || "/", "https://zook.local");
  if (locale === "hi") {
    url.searchParams.set("lang", "hi");
  } else {
    url.searchParams.delete("lang");
  }
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === "") {
      url.searchParams.delete(key);
    } else {
      url.searchParams.set(key, String(value));
    }
  }
  return `${url.pathname}${url.search}${hash ? `#${hash}` : ""}`;
}

export function joinModeLabelForLocale(mode: string | null | undefined, locale: PublicLocale) {
  if (locale === "hi") {
    if (mode === "OPEN_JOIN") return "कोई भी जुड़ सकता है";
    if (mode === "APPROVAL_REQUIRED") return "स्वीकृति आवश्यक";
    if (mode === "INVITE_ONLY") return "केवल आमंत्रण";
  }
  if (mode === "OPEN_JOIN") return "Anyone can join";
  if (mode === "APPROVAL_REQUIRED") return "Approval required";
  if (mode === "INVITE_ONLY") return "Invite only";
  return mode ? mode.replace(/[-_]+/g, " ").toLowerCase() : "Unknown";
}

export function joinModeTone(mode: string | null | undefined) {
  if (mode === "OPEN_JOIN") return "lime" as const;
  if (mode === "APPROVAL_REQUIRED") return "amber" as const;
  return "neutral" as const;
}

export const publicMessages = {
  en: {
    languageSwitch: "हिंदी",
    login: "Login",
    dashboard: "Dashboard",
    desk: "Desk",
    coach: "Coach",
    myMembership: "My membership",
    home: "Home",
    startGym: "Start your gym",
    findGym: "Find a gym",
    navGyms: "Gyms",
    homeHeroTitle: "Zook for modern gyms.",
    homeHeroCopy:
      "Run memberships, QR entry, trainer plans, desk operations, shop pickup, and owner reporting from one clean operating record.",
    pilotReady: "Start without payment details",
    ownerDashboard: "Owner dashboard",
    runOpsWeb: "Know what is happening before the rush starts.",
    sellMemberships: "Sell memberships and shop items",
    publishJoin: "Publish join links and QR codes",
    owners: "Owners",
    ownersValue: "Plans, staff, shop, reports",
    members: "Members",
    membersValue: "QR entry, plans, progress",
    staff: "Staff",
    staffValue: "Desk approvals and coaching",
    rolesLabel: "roles",
    recordLabel: "record",
    uptimeLabel: "uptime",
    forOwners: "For gym owners",
    forMembers: "For members",
    membershipManagement: "Membership management",
    staffTrainerTools: "Staff and trainer tools",
    paymentInvoicing: "Payment and invoicing",
    referralPrograms: "Referral programs",
    shopInventory: "Shop and inventory",
    analyticsReports: "Analytics and reports",
    qrCheckIn: "QR check-in",
    workoutPlans: "Workout plans",
    fitnessAssistant: "Fitness assistant",
    progressTracking: "Progress tracking",
    shopPickup: "Shop and pickup",
    notifications: "Notifications",
    indiaOps: "Built for India-first gym operations",
    indiaOpsCopy:
      "Zook keeps owner setup on web and member daily workflows on mobile, so each role gets the surface that fits the job.",
    socialProof: "Social proof",
    socialTitle: "Built around the roles that keep a gym moving.",
    socialCopy:
      "The product evidence in this release comes from Zook workflows in the app: owners, members, trainers, and front desk staff all have dedicated paths.",
    proofOwnerWeb:
      "Owner setup stays on web, where plans, payments, staff, and reports are easier to review.",
    proofMemberMobile:
      "Member workflows stay on mobile, so entry, workout plans, and progress sit where members already check in.",
    proofSharedRecord:
      "Desk and trainer workflows use the same operating record, reducing delays during busy hours.",
    opsLoopLabel: "Operating loop",
    opsLoopTitle: "Every role moves from the same source of truth.",
    opsLoopCopy:
      "Zook keeps the daily loop tight: members join, reception verifies, trainers guide, and owners see the business picture without waiting for spreadsheets.",
    loopJoin: "Join",
    loopJoinCopy: "Public profiles, referrals, approvals, and checkout stay connected.",
    loopCheckIn: "Check in",
    loopCheckInCopy: "QR, desk review, manual attendance, and pickup codes meet at reception.",
    loopCoach: "Coach",
    loopCoachCopy: "Trainer plans, notes, progress, and AI drafts stay reviewable.",
    loopGrow: "Grow",
    loopGrowCopy: "Owners track revenue, stock, staff, billing, and audit activity in one view.",
    memberApps: "Member apps",
    memberAppsCopy:
      "Mobile distribution badges will link to the app stores when the apps are published.",
    iosSoon: "iOS store link pending",
    androidSoon: "Android store link pending",
    downloadIos: "Download on iOS",
    downloadAndroid: "Get it on Android",
    privacy: "Privacy",
    terms: "Terms",
    contact: "Contact",
    gymDiscovery: "Gym discovery",
    findGymNear: "Find a gym near you.",
    gymSearchCopy:
      "Search public Zook gyms by city, name, or username and jump straight into the gym profile or membership flow.",
    search: "Search",
    gymNamePlaceholder: "Gym name or username",
    city: "City",
    people: "People",
    allPeople: "All join types",
    price: "Price",
    anyPrice: "Any price",
    freeToJoin: "Free to join",
    paidPlans: "Paid plans",
    searchGyms: "Search gyms",
    memberships: "Memberships",
    startingAt: "Starting at",
    perMonth: "month",
    publicPlans: "public plans",
    plansComingSoon: "Plans not published",
    publicSignupPending: "Public sign-up pending",
    noResults: "No results",
    noGyms: "No gyms in this city yet",
    noGymsCopy: "Try a different city or share Zook with your favorite gym owner.",
    shareGymOwner: "Share with a gym owner",
    previous: "Previous",
    next: "Next",
    page: "Page",
    of: "of",
    gymNotFound: "Gym not found",
    gymNotFoundCopy: "This link may be expired or the gym may have moved.",
    membershipPreview: "What you get with this gym",
    choosePlanProfile:
      "Choose a plan here, then continue in Zook for check-ins, workouts, notifications, and desk pickup.",
    gymTaglineFallback:
      "Join this gym, choose a plan, check in with QR, follow assigned plans, and pick up desk orders through Zook.",
    viewPlans: "View plans",
    openInApp: "Open in app",
    scanToJoin: "Scan from your phone to join instantly",
    copyJoinLink: "Copy join link",
    copied: "Copied!",
    mostPopular: "Most popular",
    days: "days",
    trial: "Trial",
    visitPack: "Visit pack",
    unlimited: "Unlimited",
    visit: "visit",
    noPublicPlanCopy:
      "This gym can still use Zook internally, but public sign-up starts only after an owner publishes a membership plan.",
    seeAllPlansPrefix: "See all",
    seeAllPlansSuffix: "plans at the gym desk. Custom add-ons are available after sign-up.",
    securePayment: "Secure payment",
    paymentActivation: "Your membership is activated after payment confirmation.",
    afterJoining: "What happens after you join",
    afterJoiningCopy:
      "Zook keeps payment, entry, training, and pickup steps visible in one place.",
    afterJoinScan: "Scan at entry",
    afterJoinScanCopy: "Use the mobile QR code; reception can approve edge cases from the desk.",
    afterJoinTrain: "Follow your plan",
    afterJoinTrainCopy: "Trainer plans, progress, notes, and feedback stay attached to your membership.",
    afterJoinPickup: "Pick up orders",
    afterJoinPickupCopy: "Shop orders use pickup codes so the desk can match each pickup.",
    trustTitle: "Trust, pricing, and support",
    trustCopy:
      "Plan prices are shown before checkout, payment status is visible after payment, and the gym team can help from the same operating record.",
    transparentPricing: "Transparent pricing",
    transparentPricingCopy:
      "You see duration, visits, discounts, and final amount before moving into payment.",
    facilities: "Photos & Facilities",
    facilitiesPending: "Facilities not published yet.",
    galleryTitle: "Photos & Gallery",
    galleryCopy: "Explore the gym's published facility, workout-floor, and training-space photos.",
    equipment: "Equipment",
    equipmentPending: "Equipment not published yet.",
    shareOrInstall: "Share or install",
    shareInstallCopyPrefix: "Scan the QR, open this gym in Zook, or install the app and search for",
    appStore: "App Store",
    playStore: "Play Store",
    downloadQr: "Download QR",
    visibleTrainers: "Visible trainers",
    trainersPending: "Trainer profiles not published yet.",
    bioComingSoon: "Bio not published.",
    referral: "Referral",
    referralCopy:
      "Have a referral or invite code? Apply it during payment so the gym can track the source and any eligible discount.",
    shareJoinLink: "Share join link",
    choosePlan: "Choose plan",
    changingPlan: "Changing the plan...",
    verifyEmail: "Verify email",
    paySecurely: "Pay securely",
    joinUnavailable: "Join flow unavailable.",
    approvalRequired: "Approval required",
    approvalCopy:
      "This gym reviews access before checkout. Sign in to request access; Zook will show the request status in your inbox.",
    signInRequestAccess: "Sign in to request access",
    requestAccess: "Request access",
    requestingAccess: "Requesting access",
    joinRequestSubmitted: "Request submitted. The gym team can now review it.",
    joinRequestError: "Unable to submit your request.",
    pendingApprovalTitle: "Request pending",
    pendingApprovalCopy:
      "You have sent the request. The gym team will approve it before checkout opens.",
    membershipInProgressTitle: "Membership already in progress",
    membershipInProgressCopy:
      "This account already has an active membership or payment in progress for this gym.",
    viewMembership: "View membership",
    backToGym: "Back to gym",
    inviteRequired: "Invite code required",
    inviteCopy: "This gym requires an active referral or invite code before checkout can start.",
    inviteCodeLabel: "Invite code",
    inviteCodePlaceholder: "Enter code",
    applyInviteCode: "Apply invite code",
    gymProfile: "Gym profile",
    reviewMembership: "Review your membership",
    plan: "Plan",
    duration: "Duration",
    visits: "Visits",
    referralDiscount: "Referral discount",
    couponDiscount: "Coupon discount",
    none: "None",
    finalAmount: "Total today",
    paymentMethod: "Payment method",
    razorpay: "Razorpay",
    paymentUnavailable: "Payment is temporarily unavailable. Please try again in a few minutes.",
    retry: "Retry",
    paymentDetails: "Enter payment details",
    paymentConfirmed: "Payment confirmed",
    membershipActivates: "Membership activates",
    testMode:
      "Test mode is on for this environment. The next page simulates payment outcomes and will not collect real money.",
    simulatedPayment: "Pay securely · test mode",
    statusLabel: "Zook status",
    lastChecked: "Last checked",
    components: "Services",
    component: "Service",
    provider: "Partner",
    detail: "Detail",
    signInTitle: "Sign in to Zook",
    signInPlatform: "Sign in on web to continue to the platform dashboard.",
    signInDefault: "Choose mobile or email to sign in to your Zook account.",
    alreadySignedIn: "You are already signed in.",
    switchAccountHint:
      "Use the form below to sign in with a different member or gym staff account.",
    loginRoleHint: "Supported login roles",
    roleMember: "Member",
    roleTrainer: "Trainer",
    roleOwner: "Owner",
    roleReceptionist: "Reception",
    phone: "Phone",
    email: "Email",
    mobileNumber: "Mobile number",
    emailAddress: "Email address",
    emailHint: "Use the email linked to your Zook account.",
    mobileHint: "Use the mobile number linked to your Zook account.",
    otp: "One-time code",
    sendOtp: "Send code",
    sendingOtp: "Sending code",
    verifyContinue: "Verify and continue",
    verifying: "Verifying",
    resendOtp: "Resend code",
    resendUnavailable: "Resend unavailable",
    changeSignIn: "Change sign-in",
    tooManyAttempts: "Too many attempts. Try again in {seconds} seconds.",
    invalidEmail: "Enter a valid email address.",
    invalidPhone: "Enter a valid mobile number.",
    unableSendOtp: "Unable to send code.",
    unableVerifyOtp: "Unable to verify code.",
    otpHint: "Enter the 6-digit code sent to {identifier}.",
    otpSent: "Code sent to {identifier}.",
    freshOtpSent: "New code sent to {identifier}.",
    testCode: "Test code: {code}.",
    resendAvailable: "Resend code available in {seconds}s",
  },
  hi: {
    languageSwitch: "English",
    login: "लॉगिन",
    dashboard: "डैशबोर्ड",
    desk: "डेस्क",
    coach: "कोच",
    myMembership: "मेरी सदस्यता",
    home: "होम",
    startGym: "अपना जिम शुरू करें",
    findGym: "जिम खोजें",
    navGyms: "जिम",
    homeHeroTitle: "आधुनिक जिम के लिए Zook.",
    homeHeroCopy:
      "सदस्यता, QR एंट्री, ट्रेनर प्लान, फ्रंट डेस्क, शॉप पिकअप और मालिक रिपोर्टिंग - सब एक साफ ऑपरेटिंग रिकॉर्ड में चलाएं.",
    pilotReady: "पेमेंट डिटेल के बिना शुरू करें",
    ownerDashboard: "ओनर डैशबोर्ड",
    runOpsWeb: "भीड़ शुरू होने से पहले जानें क्या हो रहा है.",
    sellMemberships: "सदस्यता और शॉप आइटम बेचें",
    publishJoin: "जॉइन लिंक और QR कोड प्रकाशित करें",
    owners: "मालिक",
    ownersValue: "प्लान, स्टाफ, शॉप, रिपोर्ट",
    members: "सदस्य",
    membersValue: "QR एंट्री, प्लान, प्रगति",
    staff: "स्टाफ",
    staffValue: "डेस्क स्वीकृति और कोचिंग",
    rolesLabel: "भूमिकाएं",
    recordLabel: "रिकॉर्ड",
    uptimeLabel: "अपटाइम",
    forOwners: "जिम मालिकों के लिए",
    forMembers: "सदस्यों के लिए",
    membershipManagement: "सदस्यता प्रबंधन",
    staffTrainerTools: "स्टाफ और ट्रेनर टूल्स",
    paymentInvoicing: "भुगतान और इनवॉइस",
    referralPrograms: "रेफरल कार्यक्रम",
    shopInventory: "शॉप और इन्वेंटरी",
    analyticsReports: "एनालिटिक्स और रिपोर्ट",
    qrCheckIn: "QR चेक-इन",
    workoutPlans: "वर्कआउट प्लान",
    fitnessAssistant: "फिटनेस असिस्टेंट",
    progressTracking: "प्रगति ट्रैकिंग",
    shopPickup: "शॉप और पिकअप",
    notifications: "नोटिफिकेशन",
    indiaOps: "भारत-केंद्रित जिम संचालन के लिए बना",
    indiaOpsCopy:
      "Zook में मालिकों का सेटअप वेब पर और सदस्यों के रोज़ाना काम मोबाइल पर रहते हैं, ताकि हर भूमिका को सही सतह मिले.",
    socialProof: "प्रोडक्ट प्रमाण",
    socialTitle: "उन भूमिकाओं के इर्द-गिर्द बना जो जिम को चलाती हैं.",
    socialCopy:
      "इस रिलीज़ का प्रोडक्ट प्रमाण लाइव Zook वर्कफ्लो से आता है: मालिक, सदस्य, ट्रेनर और फ्रंट डेस्क स्टाफ सभी के लिए अलग रास्ते हैं.",
    proofOwnerWeb:
      "मालिकों का सेटअप वेब पर रहता है, जहां प्लान, भुगतान, स्टाफ और रिपोर्ट देखना आसान है.",
    proofMemberMobile:
      "सदस्यों के काम मोबाइल पर रहते हैं, ताकि एंट्री, वर्कआउट प्लान और प्रगति वहीं मिलें जहां सदस्य चेक-इन करते हैं.",
    proofSharedRecord:
      "डेस्क और ट्रेनर वर्कफ्लो एक ही ऑपरेटिंग रिकॉर्ड इस्तेमाल करते हैं, जिससे व्यस्त समय में देरी घटती है.",
    opsLoopLabel: "ऑपरेटिंग लूप",
    opsLoopTitle: "हर भूमिका एक ही भरोसेमंद रिकॉर्ड से चलती है.",
    opsLoopCopy:
      "Zook रोज़ का लूप साफ रखता है: सदस्य जुड़ते हैं, रिसेप्शन सत्यापित करता है, ट्रेनर गाइड करते हैं और मालिक बिना स्प्रेडशीट का इंतज़ार किए बिजनेस देखता है.",
    loopJoin: "जुड़ें",
    loopJoinCopy: "पब्लिक प्रोफाइल, रेफरल, स्वीकृति और चेकआउट जुड़े रहते हैं.",
    loopCheckIn: "चेक-इन",
    loopCheckInCopy: "QR, डेस्क समीक्षा, मैनुअल अटेंडेंस और पिकअप कोड रिसेप्शन पर मिलते हैं.",
    loopCoach: "कोचिंग",
    loopCoachCopy: "ट्रेनर प्लान, नोट्स, प्रगति और AI ड्राफ्ट समीक्षा योग्य रहते हैं.",
    loopGrow: "बढ़त",
    loopGrowCopy: "मालिक revenue, stock, staff, billing और audit activity एक जगह देखते हैं.",
    memberApps: "सदस्य ऐप्स",
    memberAppsCopy: "ऐप प्रकाशित होने पर मोबाइल वितरण बैज लाइव स्टोर से जुड़ेंगे.",
    iosSoon: "iOS स्टोर लिंक लंबित",
    androidSoon: "Android स्टोर लिंक लंबित",
    downloadIos: "iOS पर डाउनलोड करें",
    downloadAndroid: "Android पर पाएं",
    privacy: "गोपनीयता",
    terms: "शर्तें",
    contact: "संपर्क",
    gymDiscovery: "जिम खोज",
    findGymNear: "अपने पास जिम खोजें.",
    gymSearchCopy:
      "शहर, नाम या यूज़रनेम से सार्वजनिक Zook जिम खोजें और सीधे जिम प्रोफाइल या सदस्यता फ्लो में जाएं.",
    search: "खोज",
    gymNamePlaceholder: "जिम नाम या यूज़रनेम",
    city: "शहर",
    people: "लोग",
    allPeople: "सभी जॉइन प्रकार",
    price: "कीमत",
    anyPrice: "कोई भी कीमत",
    freeToJoin: "मुफ़्त जॉइन",
    paidPlans: "पेड प्लान",
    searchGyms: "जिम खोजें",
    memberships: "सदस्यताएं",
    startingAt: "शुरुआत",
    perMonth: "माह",
    publicPlans: "सार्वजनिक प्लान",
    plansComingSoon: "प्लान प्रकाशित नहीं हैं",
    publicSignupPending: "सार्वजनिक साइन-अप लंबित",
    noResults: "कोई परिणाम नहीं",
    noGyms: "इस शहर में अभी कोई जिम नहीं",
    noGymsCopy: "कोई दूसरा शहर आज़माएं या अपने पसंदीदा जिम मालिक को Zook शेयर करें.",
    shareGymOwner: "जिम मालिक से शेयर करें",
    previous: "पिछला",
    next: "अगला",
    page: "पेज",
    of: "में से",
    gymNotFound: "जिम नहीं मिला",
    gymNotFoundCopy: "यह लिंक समाप्त हो सकता है या जिम ने पेज बदला हो सकता है.",
    membershipPreview: "इस जिम में आपको क्या मिलेगा",
    choosePlanProfile:
      "यहां प्लान चुनें, फिर चेक-इन, वर्कआउट, नोटिफिकेशन और डेस्क पिकअप के लिए Zook में जारी रखें.",
    gymTaglineFallback:
      "इस जिम से जुड़ें, प्लान चुनें, QR से चेक-इन करें, असाइन किए गए प्लान फॉलो करें और डेस्क ऑर्डर Zook से पिकअप करें.",
    viewPlans: "प्लान देखें",
    openInApp: "ऐप में खोलें",
    scanToJoin: "फोन से स्कैन करें और तुरंत जुड़ें",
    copyJoinLink: "जॉइन लिंक कॉपी करें",
    copied: "कॉपी हुआ!",
    mostPopular: "सबसे लोकप्रिय",
    days: "दिन",
    trial: "ट्रायल",
    visitPack: "विज़िट पैक",
    unlimited: "असीमित",
    visit: "विज़िट",
    noPublicPlanCopy:
      "यह जिम Zook को अंदरूनी काम के लिए इस्तेमाल कर सकता है, लेकिन सार्वजनिक साइन-अप तभी शुरू होगा जब मालिक सदस्यता प्लान प्रकाशित करेगा.",
    seeAllPlansPrefix: "सभी",
    seeAllPlansSuffix: "प्लान जिम डेस्क पर देखें. साइन-अप के बाद कस्टम ऐड-ऑन उपलब्ध हैं.",
    securePayment: "सुरक्षित भुगतान",
    paymentActivation: "भुगतान पुष्टि के बाद सदस्यता सक्रिय होगी.",
    afterJoining: "जुड़ने के बाद क्या होगा",
    afterJoiningCopy:
      "Zook भुगतान, एंट्री, ट्रेनिंग और पिकअप के कदम एक जगह साफ दिखाता है.",
    afterJoinScan: "एंट्री पर स्कैन",
    afterJoinScanCopy: "मोबाइल QR इस्तेमाल करें; ज़रूरत पड़ने पर रिसेप्शन डेस्क से समीक्षा कर सकता है.",
    afterJoinTrain: "अपना प्लान फॉलो करें",
    afterJoinTrainCopy: "ट्रेनर प्लान, प्रगति, नोट्स और फीडबैक आपकी सदस्यता से जुड़े रहते हैं.",
    afterJoinPickup: "ऑर्डर पिकअप करें",
    afterJoinPickupCopy: "शॉप ऑर्डर पिकअप कोड से चलते हैं ताकि डेस्क हर पिकअप मिला सके.",
    trustTitle: "भरोसा, कीमत और सहायता",
    trustCopy:
      "चेकआउट से पहले प्लान कीमत दिखती है, भुगतान के बाद स्थिति दिखती है, और जिम टीम उसी रिकॉर्ड से मदद कर सकती है.",
    transparentPricing: "साफ कीमत",
    transparentPricingCopy:
      "भुगतान से पहले अवधि, विज़िट, छूट और अंतिम राशि साफ दिखती है.",
    facilities: "सुविधाएं और तस्वीरें",
    facilitiesPending: "जिम प्रकाशित करेगा तो सुविधाएं यहां दिखेंगी.",
    galleryTitle: "तस्वीरें और गैलरी",
    galleryCopy: "जिम की प्रकाशित सुविधा, वर्कआउट फ्लोर और ट्रेनिंग स्पेस की तस्वीरें देखें.",
    equipment: "उपकरण",
    equipmentPending: "जिम सूची प्रकाशित करेगा तो उपकरण यहां दिखेंगे.",
    shareOrInstall: "शेयर या इंस्टॉल",
    shareInstallCopyPrefix: "QR स्कैन करें, इस जिम को Zook में खोलें, या ऐप इंस्टॉल करके खोजें",
    appStore: "App Store",
    playStore: "Play Store",
    downloadQr: "QR डाउनलोड करें",
    visibleTrainers: "दिखने वाले ट्रेनर",
    trainersPending: "जिम प्रकाशित करेगा तो ट्रेनर प्रोफाइल यहां दिखेंगी.",
    bioComingSoon: "बायो प्रकाशित नहीं है.",
    referral: "रेफरल",
    referralCopy:
      "रेफरल या आमंत्रण कोड है? भुगतान के दौरान लगाएं ताकि जिम स्रोत और छूट ट्रैक कर सके.",
    shareJoinLink: "जॉइन लिंक शेयर करें",
    choosePlan: "प्लान चुनें",
    changingPlan: "प्लान बदला जा रहा है...",
    verifyEmail: "ईमेल सत्यापित करें",
    paySecurely: "सुरक्षित भुगतान करें",
    joinUnavailable: "जॉइन फ्लो उपलब्ध नहीं है.",
    approvalRequired: "स्वीकृति आवश्यक",
    approvalCopy:
      "यह जिम चेकआउट से पहले एक्सेस की समीक्षा करता है. एक्सेस मांगने के लिए लॉगिन करें; Zook आपके इनबॉक्स में स्थिति दिखाएगा.",
    signInRequestAccess: "एक्सेस मांगने के लिए लॉगिन करें",
    requestAccess: "एक्सेस का अनुरोध करें",
    requestingAccess: "अनुरोध भेजा जा रहा है",
    joinRequestSubmitted: "अनुरोध भेजा गया. जिम टीम अब इसे समीक्षा कर सकती है.",
    joinRequestError: "आपका अनुरोध भेजा नहीं जा सका.",
    pendingApprovalTitle: "अनुरोध लंबित",
    pendingApprovalCopy: "आपने अनुरोध भेज दिया है. चेकआउट खुलने से पहले जिम टीम इसे स्वीकृत करेगी.",
    membershipInProgressTitle: "सदस्यता पहले से जारी है",
    membershipInProgressCopy:
      "इस अकाउंट की इस जिम में सक्रिय सदस्यता या भुगतान प्रक्रिया पहले से जारी है.",
    viewMembership: "सदस्यता देखें",
    backToGym: "जिम पर वापस जाएं",
    inviteRequired: "आमंत्रण कोड आवश्यक",
    inviteCopy: "इस जिम में चेकआउट शुरू करने से पहले सक्रिय रेफरल या आमंत्रण कोड चाहिए.",
    inviteCodeLabel: "आमंत्रण कोड",
    inviteCodePlaceholder: "कोड दर्ज करें",
    applyInviteCode: "आमंत्रण कोड लगाएं",
    gymProfile: "जिम प्रोफाइल",
    reviewMembership: "अपनी सदस्यता जांचें",
    plan: "प्लान",
    duration: "अवधि",
    visits: "विज़िट",
    referralDiscount: "रेफरल छूट",
    couponDiscount: "कूपन छूट",
    none: "कोई नहीं",
    finalAmount: "आज कुल",
    paymentMethod: "भुगतान विधि",
    razorpay: "Razorpay",
    paymentUnavailable: "भुगतान अभी उपलब्ध नहीं है. कुछ मिनटों बाद फिर कोशिश करें.",
    retry: "फिर कोशिश करें",
    paymentDetails: "भुगतान विवरण भरें",
    paymentConfirmed: "भुगतान पुष्टि",
    membershipActivates: "सदस्यता सक्रिय",
    testMode:
      "इस वातावरण में टेस्ट मोड चालू है. अगला पेज भुगतान परिणामों का सिमुलेशन करेगा और असली पैसा नहीं लेगा.",
    simulatedPayment: "सुरक्षित भुगतान · टेस्ट मोड",
    statusLabel: "Zook स्थिति",
    lastChecked: "अंतिम जांच",
    components: "सेवाएं",
    component: "सेवा",
    provider: "पार्टनर",
    detail: "विवरण",
    signInTitle: "Zook में लॉगिन करें",
    signInPlatform: "प्लैटफॉर्म डैशबोर्ड जारी रखने के लिए वेब पर लॉगिन करें.",
    signInDefault: "अपने Zook अकाउंट में लॉगिन करने के लिए मोबाइल या ईमेल चुनें.",
    alreadySignedIn: "आप पहले से लॉगिन हैं.",
    switchAccountHint:
      "किसी दूसरे मेंबर या जिम स्टाफ अकाउंट से लॉगिन करने के लिए नीचे फॉर्म इस्तेमाल करें.",
    loginRoleHint: "समर्थित लॉगिन भूमिकाएं",
    roleMember: "मेंबर",
    roleTrainer: "ट्रेनर",
    roleOwner: "ओनर",
    roleReceptionist: "रिसेप्शन",
    phone: "फोन",
    email: "ईमेल",
    mobileNumber: "मोबाइल नंबर",
    emailAddress: "ईमेल पता",
    emailHint: "अपने Zook अकाउंट से जुड़ा ईमेल इस्तेमाल करें.",
    mobileHint: "अपने Zook अकाउंट से जुड़ा मोबाइल नंबर इस्तेमाल करें.",
    otp: "एक बार वाला कोड",
    sendOtp: "कोड भेजें",
    sendingOtp: "कोड भेजा जा रहा है",
    verifyContinue: "सत्यापित कर जारी रखें",
    verifying: "सत्यापित हो रहा है",
    resendOtp: "कोड फिर भेजें",
    resendUnavailable: "रीसेंड उपलब्ध नहीं",
    changeSignIn: "लॉगिन बदलें",
    tooManyAttempts: "बहुत अधिक प्रयास. {seconds} सेकंड बाद फिर कोशिश करें.",
    invalidEmail: "सही ईमेल पता दर्ज करें.",
    invalidPhone: "सही मोबाइल नंबर दर्ज करें.",
    unableSendOtp: "कोड भेजा नहीं जा सका.",
    unableVerifyOtp: "कोड सत्यापित नहीं हो सका.",
    otpHint: "{identifier} पर भेजा गया 6 अंकों वाला कोड दर्ज करें.",
    otpSent: "{identifier} पर कोड भेजा गया.",
    freshOtpSent: "{identifier} पर नया कोड भेजा गया.",
    testCode: "टेस्ट कोड: {code}.",
    resendAvailable: "{seconds}s में कोड फिर भेज सकेंगे",
  },
} as const;

export type PublicMessageKey = keyof typeof publicMessages.en;

export function publicT(
  locale: PublicLocale,
  key: PublicMessageKey,
  replacements: Record<string, string | number> = {},
) {
  let message: string = publicMessages[locale][key] ?? publicMessages.en[key];
  for (const [name, value] of Object.entries(replacements)) {
    message = message.replaceAll(`{${name}}`, String(value));
  }
  return message;
}
