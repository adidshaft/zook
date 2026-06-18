export const queryKeys = {
  member: {
    homePrefix: () => ["me", "home"] as const,
    home: (orgId?: string | null) => ["me", "home", orgId] as const,
    classes: (orgId?: string | null, branchId?: string | null) =>
      ["me", "classes", orgId, branchId] as const,
    membership: () => ["me", "memberships"] as const,
    activeMembership: (orgId?: string | null) => ["me", "membership", "active", orgId] as const,
    attendance: () => ["me", "attendance"] as const,
    profile: (orgId?: string | null) => ["me", "profile", orgId] as const,
    referralCodes: (orgId?: string | null) => ["me", "referral-codes", orgId] as const,
    diet: () => ["me", "diet"] as const,
  },
  trainer: {
    clients: (orgId?: string | null, trainerUserId?: string | null) =>
      ["org", orgId, "trainer", trainerUserId, "clients"] as const,
    payouts: (orgId?: string | null, trainerUserId?: string | null, month?: string | null) =>
      ["org", orgId, "trainer", trainerUserId, "payouts", month] as const,
  },
  owner: {
    all: () => ["org"] as const,
    dashboard: (orgId?: string | null, branchId?: string | null) =>
      ["org", orgId, "dashboard", branchId] as const,
    members: (orgId?: string | null, filter?: string | null, branchId?: string | null) =>
      filter
        ? (["org", orgId, "members", filter, branchId] as const)
        : (["org", orgId, "members", branchId] as const),
    approvals: (orgId?: string | null, branchId?: string | null) =>
      ["org", orgId, "join-requests", branchId] as const,
    setupStatus: (orgId?: string | null, branchId?: string | null) =>
      ["org", orgId, "setup-status", branchId] as const,
    billing: (orgId?: string | null, branchId?: string | null) =>
      ["org", orgId, "billing", "subscription", branchId] as const,
  },
  reception: {
    queue: (orgId?: string | null, branchId?: string | null) =>
      ["org", orgId, "attendance", "live", branchId] as const,
  },
  attendance: {
    today: (orgId?: string | null, branchId?: string | null) =>
      ["org", orgId, "attendance", "today", branchId] as const,
    pending: (orgId?: string | null, branchId?: string | null) =>
      ["org", orgId, "attendance", "pending", branchId] as const,
  },
  plans: {
    list: () => ["me", "plans"] as const,
    detail: (assignmentId?: string | null) => ["me", "plans", assignmentId] as const,
    exercises: (assignmentId?: string | null) =>
      ["me", "plans", assignmentId, "exercises"] as const,
  },
  shop: {
    all: () => ["shop"] as const,
    catalogPrefix: (orgId?: string | null) => ["shop", "products", orgId] as const,
    catalog: (orgId?: string | null, branchId?: string | null) =>
      ["shop", "products", orgId, branchId] as const,
    orders: () => ["me", "shop-orders"] as const,
    activeOrders: (orgId?: string | null, branchId?: string | null) =>
      ["org", orgId, "shop", "orders", "active", branchId] as const,
    activeOrdersPrefix: (orgId?: string | null) => ["org", orgId, "shop", "orders"] as const,
  },
  notifications: {
    list: () => ["me", "notifications"] as const,
    preferences: () => ["me", "notification-preferences"] as const,
  },
  payments: {
    invoices: () => ["me", "invoices"] as const,
    list: (orgId?: string | null, branchId?: string | null) =>
      ["org", orgId, "payments", "recent", branchId] as const,
  },
  tracking: {
    summary: () => ["me", "tracking", "summary"] as const,
    bodyProgress: () => ["me", "tracking", "body-progress"] as const,
    workouts: () => ["me", "tracking", "workouts"] as const,
  },
  gym: {
    search: (query?: string | null, city?: string | null) =>
      ["gyms", query ?? "", city ?? ""] as const,
    profile: (username: string) => ["gym", username] as const,
  },
} as const;
