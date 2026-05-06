import type {
  AttendanceStatus,
  GymJoinMode,
  NotificationType,
  OrderStatus,
  PaymentMode,
  PaymentStatus,
  PlanStatus,
  PlanType,
  ProductCategory,
  ProviderCategory,
  ProviderDiagnosticStatus,
  ProviderMode,
  Role,
} from "./types";

export type DemoAttendanceOutcome = "approved" | "pending" | "rejected" | "flagged";

export interface DemoUser {
  id: string;
  email: string;
  name: string;
  phone: string;
  dateOfBirth: string;
  isMinor: boolean;
  guardianPending: boolean;
  marketingOptIn: boolean;
  aiConsent: boolean;
}

export interface DemoOrganization {
  id: string;
  name: string;
  username: string;
  city: string;
  state: string;
  address: string;
  status: "ACTIVE" | "SUSPENDED";
  joinMode: GymJoinMode;
  amenities: string[];
  ownerName: string;
}

export interface DemoBranch {
  id: string;
  orgId: string;
  name: string;
  city: string;
  state: string;
  address: string;
  attendanceMode: "AUTOMATIC" | "EXCEPTION_APPROVAL" | "MANUAL_APPROVAL";
}

export interface DemoRoleAssignment {
  id: string;
  orgId: string;
  userId: string;
  role: Role;
}

export interface DemoMemberProfile {
  id: string;
  userId: string;
  memberId: string;
  goal: string;
  dietPreference: string;
  allergyNote: string;
  trainerVisibleTracking: boolean;
  assignedTrainerId: string;
}

export interface DemoMembershipPlan {
  id: string;
  orgId: string;
  name: string;
  description: string;
  type: "TRIAL" | "DURATION" | "VISIT_PACK" | "HYBRID";
  pricePaise: number;
  durationDays: number;
  visitLimit: number;
  publicVisible: boolean;
}

export interface DemoMembership {
  id: string;
  orgId: string;
  branchId: string;
  memberUserId: string;
  planId: string;
  status: "ACTIVE" | "PENDING_PAYMENT" | "EXPIRED";
  daysLeft: number;
  remainingVisits: number;
  lastCheckInLabel: string;
  weeklyGoalCompleted: number;
  weeklyGoalTarget: number;
  streakDays: number;
}

export interface DemoJoinRequest {
  id: string;
  orgId: string;
  userId: string;
  userName: string;
  userEmail: string;
  planId: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  referralCode: string;
  createdAt: string;
}

export interface DemoReferralCode {
  id: string;
  orgId: string;
  code: string;
  status: "active" | "paused" | "expired";
  discountPaise: number;
  referrerName: string;
}

export interface DemoAttendanceSession {
  id: string;
  orgId: string;
  branchId: string;
  rollingToken: string;
  expiresAt: string;
  issuedAt: string;
}

export interface DemoAttendanceAttempt {
  id: string;
  orgId: string;
  branchId: string;
  memberUserId: string;
  memberName: string;
  status: AttendanceStatus;
  entryCode: string;
  checkedInAt: string;
  branchName: string;
  planName: string;
  reason: string;
  auditTrail: string[];
}

export interface DemoPaymentRecord {
  id: string;
  orgId: string;
  memberUserId: string;
  purpose: "MEMBERSHIP" | "SHOP_ORDER" | "PERSONAL_TRAINING";
  summary: string;
  amountPaise: number;
  mode: PaymentMode;
  status: PaymentStatus;
  createdAt: string;
  reason: string;
}

export interface DemoShopProduct {
  id: string;
  orgId: string;
  name: string;
  category: ProductCategory;
  pricePaise: number;
  stock: number;
  lowStockThreshold: number;
  fulfillmentLabel: string;
}

export interface DemoShopOrder {
  id: string;
  orgId: string;
  memberUserId: string;
  status: OrderStatus;
  totalPaise: number;
  pickupCode: string;
  items: Array<{ productId: string; quantity: number; unitPaise: number }>;
  createdAt: string;
}

export interface DemoTrainerClientAssignment {
  id: string;
  orgId: string;
  trainerUserId: string;
  memberUserId: string;
  active: boolean;
}

export interface DemoPtPack {
  id: string;
  orgId: string;
  trainerUserId: string;
  memberUserId: string;
  label: string;
  sessionsLeft: number;
  status: "ACTIVE" | "PENDING_PAYMENT";
}

export interface DemoTrainingPlan {
  id: string;
  orgId: string;
  trainerUserId: string;
  memberUserId: string;
  title: string;
  type: PlanType;
  status: PlanStatus;
  aiGenerated: boolean;
  reviewed: boolean;
  visibleToMember: boolean;
  durationLabel: string;
  difficulty: string;
  exercises: Array<{ name: string; sets: string; equipment: string; reps: string }>;
}

export interface DemoPlanDraft {
  id: string;
  orgId: string;
  trainerUserId: string;
  memberUserId: string;
  title: string;
  goal: string;
  difficulty: string;
  visibleToMember: boolean;
  safety: {
    blockedContent: string;
    medicalRisk: string;
    trainerApproval: "Required" | "Complete";
  };
  sections: Array<{ title: string; body: string }>;
}

export interface DemoAIUsageRecord {
  id: string;
  orgId: string;
  actorRole: Role;
  requestType: "CHAT" | "STRUCTURED_PLAN" | "IMAGE";
  promptSummary: string;
  quotaConsumed: number;
  safetyStatus: "CLEAR" | "BLOCKED";
  createdAt: string;
}

export interface DemoNotification {
  id: string;
  orgId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  targetRoute: string;
  readAt: string | null;
  createdAt: string;
}

export interface DemoGuardianConsentChallenge {
  id: string;
  minorId: string;
  guardianEmail: string;
  status: "PENDING" | "GRANTED" | "EXPIRED";
  expiresAt: string;
}

export interface DemoAuditLog {
  id: string;
  orgId: string;
  action: string;
  entityType: string;
  entityId: string;
  actorName: string;
  reason: string;
  createdAt: string;
  requestId: string;
}

export interface DemoReportJob {
  id: string;
  orgId: string;
  type: string;
  status: "PROCESSING" | "READY" | "FAILED";
  createdAt: string;
}

export interface DemoProviderDiagnostic {
  id: string;
  category: ProviderCategory;
  provider: string;
  mode: ProviderMode;
  status: ProviderDiagnosticStatus;
  lastCheckedAt: string;
  requestId: string;
  notes: string;
}

export interface DemoCheckoutSession {
  id: string;
  purpose: "MEMBERSHIP" | "SHOP_ORDER";
  targetId: string;
  amountPaise: number;
  status: "CREATED" | "PENDING" | "SUCCEEDED" | "FAILED";
  hostedUrl: string;
  activatesOnConfirmation: boolean;
}

export interface ZookDemoFixtures {
  users: DemoUser[];
  organizations: DemoOrganization[];
  branches: DemoBranch[];
  roleAssignments: DemoRoleAssignment[];
  memberProfiles: DemoMemberProfile[];
  membershipPlans: DemoMembershipPlan[];
  memberships: DemoMembership[];
  joinRequests: DemoJoinRequest[];
  referralCodes: DemoReferralCode[];
  attendanceSessions: DemoAttendanceSession[];
  attendanceAttempts: DemoAttendanceAttempt[];
  payments: DemoPaymentRecord[];
  shopProducts: DemoShopProduct[];
  shopOrders: DemoShopOrder[];
  trainerClientAssignments: DemoTrainerClientAssignment[];
  ptPacks: DemoPtPack[];
  trainingPlans: DemoTrainingPlan[];
  planDrafts: DemoPlanDraft[];
  aiUsageRecords: DemoAIUsageRecord[];
  notifications: DemoNotification[];
  guardianConsentChallenges: DemoGuardianConsentChallenge[];
  auditLogs: DemoAuditLog[];
  reportJobs: DemoReportJob[];
  providerDiagnostics: DemoProviderDiagnostic[];
  checkoutSessions: DemoCheckoutSession[];
}

export const zookDemoFixtures: ZookDemoFixtures = {
  users: [
    {
      id: "user-aarav",
      email: "member@zook.local",
      name: "Nisha Menon",
      phone: "+919876543210",
      dateOfBirth: "1996-08-14",
      isMinor: false,
      guardianPending: false,
      marketingOptIn: true,
      aiConsent: true,
    },
    {
      id: "user-owner",
      email: "owner@zook.local",
      name: "Aditya Rao",
      phone: "+919988777665",
      dateOfBirth: "1987-03-12",
      isMinor: false,
      guardianPending: false,
      marketingOptIn: false,
      aiConsent: true,
    },
    {
      id: "user-rhea",
      email: "trainer@zook.local",
      name: "Coach Rohan",
      phone: "+919123456780",
      dateOfBirth: "1993-11-19",
      isMinor: false,
      guardianPending: false,
      marketingOptIn: false,
      aiConsent: true,
    },
    {
      id: "user-kabir",
      email: "kabir@zook.local",
      name: "Coach Kavya",
      phone: "+919345678120",
      dateOfBirth: "1991-02-09",
      isMinor: false,
      guardianPending: false,
      marketingOptIn: false,
      aiConsent: true,
    },
    {
      id: "user-priya",
      email: "reception@zook.local",
      name: "Farah Khan",
      phone: "+919765432109",
      dateOfBirth: "1998-06-21",
      isMinor: false,
      guardianPending: false,
      marketingOptIn: false,
      aiConsent: false,
    },
    {
      id: "user-riya",
      email: "minor@zook.local",
      name: "Ira Shah",
      phone: "+919000012345",
      dateOfBirth: "2011-09-18",
      isMinor: true,
      guardianPending: true,
      marketingOptIn: false,
      aiConsent: false,
    },
  ],
  organizations: [
    {
      id: "org-aarogya-strength",
      name: "Aarogya Strength Club",
      username: "aarogya-strength",
      city: "Pune",
      state: "Maharashtra",
      address: "Lane 7, Koregaon Park, Pune",
      status: "ACTIVE",
      joinMode: "OPEN_JOIN",
      amenities: ["Strength", "Cardio", "Personal Training", "Protein Bar", "Locker"],
      ownerName: "Aditya Rao",
    },
  ],
  branches: [
    {
      id: "branch-default",
      orgId: "org-aarogya-strength",
      name: "Aarogya Koregaon Park",
      city: "Pune",
      state: "Maharashtra",
      address: "Lane 7, Koregaon Park, Pune",
      attendanceMode: "EXCEPTION_APPROVAL",
    },
  ],
  roleAssignments: [
    { id: "role-aarav-member", orgId: "org-aarogya-strength", userId: "user-aarav", role: "MEMBER" },
    { id: "role-owner-owner", orgId: "org-aarogya-strength", userId: "user-owner", role: "OWNER" },
    { id: "role-owner-admin", orgId: "org-aarogya-strength", userId: "user-owner", role: "ADMIN" },
    { id: "role-owner-member", orgId: "org-aarogya-strength", userId: "user-owner", role: "MEMBER" },
    { id: "role-rohan-trainer", orgId: "org-aarogya-strength", userId: "user-rhea", role: "TRAINER" },
    { id: "role-priya-reception", orgId: "org-aarogya-strength", userId: "user-priya", role: "RECEPTIONIST" },
    { id: "role-riya-member", orgId: "org-aarogya-strength", userId: "user-riya", role: "MEMBER" },
  ],
  memberProfiles: [
    {
      id: "profile-aarav",
      userId: "user-aarav",
      memberId: "ZK-M-10234",
      goal: "Muscle gain",
      dietPreference: "Vegetarian",
      allergyNote: "None added",
      trainerVisibleTracking: true,
      assignedTrainerId: "user-rhea",
    },
    {
      id: "profile-riya",
      userId: "user-riya",
      memberId: "ZK-M-10492",
      goal: "General fitness",
      dietPreference: "Home food",
      allergyNote: "Guardian to confirm",
      trainerVisibleTracking: false,
      assignedTrainerId: "user-kabir",
    },
  ],
  membershipPlans: [
    {
      id: "plan-trial",
      orgId: "org-aarogya-strength",
      name: "Trial Pass",
      description: "One supervised visit for new members.",
      type: "TRIAL",
      pricePaise: 19900,
      durationDays: 1,
      visitLimit: 1,
      publicVisible: true,
    },
    {
      id: "plan-monthly-active",
      orgId: "org-aarogya-strength",
      name: "Monthly Active",
      description: "30 days of gym access for regular training.",
      type: "DURATION",
      pricePaise: 149900,
      durationDays: 30,
      visitLimit: 0,
      publicVisible: true,
    },
    {
      id: "plan-hybrid-pro",
      orgId: "org-aarogya-strength",
      name: "Hybrid Pro",
      description: "30 days with 12 visits and coach plan access.",
      type: "HYBRID",
      pricePaise: 249900,
      durationDays: 30,
      visitLimit: 12,
      publicVisible: true,
    },
  ],
  memberships: [
    {
      id: "membership-aarav-hybrid",
      orgId: "org-aarogya-strength",
      branchId: "branch-default",
      memberUserId: "user-aarav",
      planId: "plan-hybrid-pro",
      status: "ACTIVE",
      daysLeft: 22,
      remainingVisits: 8,
      lastCheckInLabel: "7:12 AM",
      weeklyGoalCompleted: 3,
      weeklyGoalTarget: 5,
      streakDays: 5,
    },
    {
      id: "membership-expired-demo",
      orgId: "org-aarogya-strength",
      branchId: "branch-default",
      memberUserId: "user-priya",
      planId: "plan-hybrid-pro",
      status: "EXPIRED",
      daysLeft: -1,
      remainingVisits: 0,
      lastCheckInLabel: "Yesterday",
      weeklyGoalCompleted: 1,
      weeklyGoalTarget: 5,
      streakDays: 0,
    },
  ],
  joinRequests: [
    {
      id: "join-neha",
      orgId: "org-aarogya-strength",
      userId: "user-pooja",
      userName: "Pooja Malhotra",
      userEmail: "pooja.malhotra@example.com",
      planId: "plan-hybrid-pro",
      status: "PENDING",
      referralCode: "ROHAN500",
      createdAt: "2026-04-26T06:50:00.000Z",
    },
  ],
  referralCodes: [
    {
      id: "ref-rohan500",
      orgId: "org-aarogya-strength",
      code: "ROHAN500",
      status: "active",
      discountPaise: 25000,
      referrerName: "Coach Rohan",
    },
  ],
  attendanceSessions: [
    {
      id: "qr-current",
      orgId: "org-aarogya-strength",
      branchId: "branch-default",
      rollingToken: "zook://qr/org-aarogya-strength/branch-default/demo-approved",
      issuedAt: "2026-04-26T01:42:00.000Z",
      expiresAt: "2026-04-26T01:42:30.000Z",
    },
  ],
  attendanceAttempts: [
    {
      id: "attendance-approved",
      orgId: "org-aarogya-strength",
      branchId: "branch-default",
      memberUserId: "user-aarav",
      memberName: "Nisha Menon",
      status: "APPROVED",
      entryCode: "ZK-4821",
      checkedInAt: "2026-04-26T01:44:00.000Z",
      branchName: "Aarogya Koregaon Park",
      planName: "Hybrid Pro",
      reason: "Membership active and branch verified.",
      auditTrail: ["QR token valid", "Replay clear", "Membership active", "Minor gate clear"],
    },
    {
      id: "attendance-pending",
      orgId: "org-aarogya-strength",
      branchId: "branch-default",
      memberUserId: "user-aarav",
      memberName: "Nisha Menon",
      status: "PENDING_APPROVAL",
      entryCode: "AS-7319",
      checkedInAt: "2026-04-26T01:44:00.000Z",
      branchName: "Aarogya Koregaon Park",
      planName: "Hybrid Pro",
      reason: "Attendance approval mode is enabled.",
      auditTrail: ["QR token valid", "Membership active", "Desk approval required"],
    },
    {
      id: "attendance-flagged",
      orgId: "org-aarogya-strength",
      branchId: "branch-default",
      memberUserId: "user-pooja",
      memberName: "Pooja Malhotra",
      status: "FLAGGED",
      entryCode: "ZK-1180",
      checkedInAt: "2026-04-26T01:48:00.000Z",
      branchName: "Aarogya Koregaon Park",
      planName: "Visit Pack",
      reason: "Replay protection detected a repeated scan.",
      auditTrail: ["QR token valid", "Replay suspicion", "Desk review required"],
    },
  ],
  payments: [
    {
      id: "payment-hybrid-renewal",
      orgId: "org-aarogya-strength",
      memberUserId: "user-aarav",
      purpose: "MEMBERSHIP",
      summary: "Hybrid Pro renewal",
      amountPaise: 249900,
      mode: "DIRECT_UPI",
      status: "PENDING",
      createdAt: "2026-04-25T13:30:00.000Z",
      reason: "Membership expired yesterday",
    },
  ],
  shopProducts: [
    {
      id: "product-protein-shake",
      orgId: "org-aarogya-strength",
      name: "Protein Shake",
      category: "PROTEIN_SHAKE",
      pricePaise: 14900,
      stock: 18,
      lowStockThreshold: 5,
      fulfillmentLabel: "Ready at desk",
    },
    {
      id: "product-zook-shaker",
      orgId: "org-aarogya-strength",
      name: "Zook Shaker",
      category: "SHAKER",
      pricePaise: 39900,
      stock: 2,
      lowStockThreshold: 4,
      fulfillmentLabel: "Low stock",
    },
    {
      id: "product-gym-towel",
      orgId: "org-aarogya-strength",
      name: "Gym Towel",
      category: "TOWEL",
      pricePaise: 24900,
      stock: 12,
      lowStockThreshold: 5,
      fulfillmentLabel: "In stock",
    },
    {
      id: "product-water-bottle",
      orgId: "org-aarogya-strength",
      name: "Water Bottle",
      category: "WATER",
      pricePaise: 4000,
      stock: 40,
      lowStockThreshold: 12,
      fulfillmentLabel: "In stock",
    },
  ],
  shopOrders: [
    {
      id: "order-aarav-pickup",
      orgId: "org-aarogya-strength",
      memberUserId: "user-aarav",
      status: "READY_FOR_PICKUP",
      totalPaise: 54800,
      pickupCode: "PU-9142",
      createdAt: "2026-04-26T02:15:00.000Z",
      items: [
        { productId: "product-protein-shake", quantity: 1, unitPaise: 14900 },
        { productId: "product-zook-shaker", quantity: 1, unitPaise: 39900 },
      ],
    },
  ],
  trainerClientAssignments: [
    {
      id: "assign-rohan-nisha",
      orgId: "org-aarogya-strength",
      trainerUserId: "user-rhea",
      memberUserId: "user-aarav",
      active: true,
    },
  ],
  ptPacks: [
    {
      id: "pt-nisha-rohan",
      orgId: "org-aarogya-strength",
      trainerUserId: "user-rhea",
      memberUserId: "user-aarav",
      label: "Strength PT Pack",
      sessionsLeft: 6,
      status: "ACTIVE",
    },
  ],
  trainingPlans: [
    {
      id: "plan-push-day",
      orgId: "org-aarogya-strength",
      trainerUserId: "user-rhea",
      memberUserId: "user-aarav",
      title: "Push Day",
      type: "WORKOUT",
      status: "PUBLISHED",
      aiGenerated: false,
      reviewed: true,
      visibleToMember: true,
      durationLabel: "45-60 min",
      difficulty: "Medium",
      exercises: [
        { name: "Bench Press", sets: "4 sets", equipment: "Barbell", reps: "8-12 reps" },
        { name: "Incline Dumbbell Press", sets: "3 sets", equipment: "Dumbbells", reps: "8-12 reps" },
        { name: "Shoulder Press", sets: "3 sets", equipment: "Dumbbells", reps: "8-12 reps" },
        { name: "Tricep Pushdown", sets: "3 sets", equipment: "Cable", reps: "10-15 reps" },
        { name: "Lateral Raise", sets: "3 sets", equipment: "Dumbbells", reps: "12-15 reps" },
        { name: "Push-up Finisher", sets: "2 rounds", equipment: "Bodyweight", reps: "To failure" },
      ],
    },
  ],
  planDrafts: [
    {
      id: "draft-strength-block",
      orgId: "org-aarogya-strength",
      trainerUserId: "user-rhea",
      memberUserId: "user-aarav",
      title: "4-week Push/Pull Routine",
      goal: "Muscle gain",
      difficulty: "Medium",
      visibleToMember: false,
      safety: {
        blockedContent: "None",
        medicalRisk: "Clear",
        trainerApproval: "Required",
      },
      sections: [
        { title: "Week 1 Focus", body: "Rebuild pressing volume and keep shoulder warm-up strict." },
        { title: "Workout A", body: "Push emphasis with controlled barbell volume and triceps finish." },
        { title: "Workout B", body: "Pull emphasis with rows, lat work, and posterior chain support." },
        { title: "Recovery Notes", body: "Two mobility blocks and one low-intensity cardio day." },
      ],
    },
  ],
  aiUsageRecords: [
    {
      id: "ai-draft-usage",
      orgId: "org-aarogya-strength",
      actorRole: "TRAINER",
      requestType: "STRUCTURED_PLAN",
      promptSummary: "Draft push/pull routine for Nisha Menon",
      quotaConsumed: 1,
      safetyStatus: "CLEAR",
      createdAt: "2026-04-26T02:05:00.000Z",
    },
  ],
  notifications: [
    {
      id: "notif-push-day",
      orgId: "org-aarogya-strength",
      userId: "user-aarav",
      type: "PLAN",
      title: "Push Day assigned",
      message: "Coach Rohan assigned Push Day for your next session.",
      targetRoute: "/plans",
      readAt: null,
      createdAt: "2026-04-26T01:30:00.000Z",
    },
  ],
  guardianConsentChallenges: [
    {
      id: "guardian-riya-active",
      minorId: "user-riya",
      guardianEmail: "parent.shah@example.com",
      status: "PENDING",
      expiresAt: "2026-04-26T18:30:00.000Z",
    },
  ],
  auditLogs: [
    {
      id: "audit-offline-payment",
      orgId: "org-aarogya-strength",
      action: "payment.offline.recorded",
      entityType: "PaymentRecord",
      entityId: "payment-hybrid-renewal",
      actorName: "Farah Khan",
      reason: "Desk collected payment",
      createdAt: "2026-04-26T02:20:00.000Z",
      requestId: "req_demo_payment_01",
    },
  ],
  reportJobs: [
    {
      id: "report-attendance-apr",
      orgId: "org-aarogya-strength",
      type: "attendance",
      status: "READY",
      createdAt: "2026-04-26T02:25:00.000Z",
    },
  ],
  providerDiagnostics: [
    {
      id: "provider-email",
      category: "email",
      provider: "MockEmailProvider",
      mode: "mock",
      status: "default",
      lastCheckedAt: "2026-04-26T02:30:00.000Z",
      requestId: "req_provider_email",
      notes: "Mock active. OTP delivery is local-only.",
    },
    {
      id: "provider-payments",
      category: "payment",
      provider: "MockPaymentProvider",
      mode: "mock",
      status: "default",
      lastCheckedAt: "2026-04-26T02:30:00.000Z",
      requestId: "req_provider_payment",
      notes: "Provider-ready. Razorpay secrets are never displayed.",
    },
    {
      id: "provider-ai",
      category: "ai",
      provider: "MockAIProvider",
      mode: "mock",
      status: "default",
      lastCheckedAt: "2026-04-26T02:30:00.000Z",
      requestId: "req_provider_ai",
      notes: "Mock-first, quota-controlled service facade.",
    },
    {
      id: "provider-push",
      category: "push",
      provider: "MockPushProvider",
      mode: "mock",
      status: "default",
      lastCheckedAt: "2026-04-26T02:30:00.000Z",
      requestId: "req_provider_push",
      notes: "In-app inbox is canonical; push is best-effort.",
    },
    {
      id: "provider-storage",
      category: "storage",
      provider: "LocalStorageProvider",
      mode: "local",
      status: "ready",
      lastCheckedAt: "2026-04-26T02:30:00.000Z",
      requestId: "req_provider_storage",
      notes: "Local storage path configured for demo.",
    },
  ],
  checkoutSessions: [],
};
