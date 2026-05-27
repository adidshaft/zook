export const queryKeys = {
  auth: {
    currentUser: (orgId?: string | null) => ["auth", "me", orgId] as const,
  },
  member: {
    all: () => ["me"] as const,
    homePrefix: () => ["me", "home"] as const,
    organizations: (orgId?: string | null) => ["me", "orgs", orgId] as const,
    activeOrganization: (orgId?: string | null) => ["me", "active-org", orgId] as const,
    home: (orgId?: string | null) => ["me", "home", orgId] as const,
    dashboard: (orgId?: string | null) => ["me", "dashboard", orgId] as const,
    membership: () => ["me", "memberships"] as const,
    activeMembership: (orgId?: string | null) => ["me", "membership", "active", orgId] as const,
    attendance: () => ["me", "attendance"] as const,
    engagement: (orgId?: string | null) => ["me", "engagement", orgId] as const,
    badges: (orgId?: string | null) => ["me", "badges", orgId] as const,
    profile: (orgId?: string | null) => ["me", "profile", orgId] as const,
    referralCodes: (orgId?: string | null) => ["me", "referral-codes", orgId] as const,
    goals: () => ["me", "goals"] as const,
    diet: () => ["me", "diet"] as const,
  },
  trainer: {
    all: () => ["trainer"] as const,
    home: (orgId?: string | null) => ["trainer", "home", orgId] as const,
    clients: (orgId?: string | null, trainerUserId?: string | null) =>
      ["org", orgId, "trainer", trainerUserId, "clients"] as const,
    client: (clientId: string) => ["trainer", "client", clientId] as const,
    plans: (orgId?: string | null) => ["trainer", "plans", orgId] as const,
    payouts: (orgId?: string | null, trainerUserId?: string | null, month?: string | null) =>
      ["org", orgId, "trainer", trainerUserId, "payouts", month] as const,
  },
  owner: {
    all: () => ["org"] as const,
    dashboard: (orgId?: string | null) => ["org", orgId, "dashboard"] as const,
    members: (orgId?: string | null, filter?: string | null) =>
      filter ? (["org", orgId, "members", filter] as const) : (["org", orgId, "members"] as const),
    approvals: (orgId?: string | null) => ["org", orgId, "join-requests"] as const,
    revenue: (orgId?: string | null) => ["owner", "revenue", orgId] as const,
    stock: (orgId?: string | null) => ["owner", "stock", orgId] as const,
    billing: (orgId?: string | null) => ["org", orgId, "billing", "subscription"] as const,
    member: (memberId: string) => ["owner", "member", memberId] as const,
  },
  reception: {
    queue: (orgId?: string | null) => ["org", orgId, "attendance", "live"] as const,
    members: (orgId?: string | null) => ["reception", "members", orgId] as const,
    payments: (orgId?: string | null) => ["reception", "payments", orgId] as const,
    orders: (orgId?: string | null) => ["reception", "orders", orgId] as const,
  },
  attendance: {
    today: (orgId?: string | null) => ["org", orgId, "attendance", "today"] as const,
    pending: (orgId?: string | null) => ["org", orgId, "attendance", "pending"] as const,
    record: (id: string) => ["attendance", "record", id] as const,
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
    cart: () => ["shop", "cart"] as const,
    orders: () => ["me", "shop-orders"] as const,
    activeOrders: (orgId?: string | null, branchId?: string | null) =>
      ["org", orgId, "shop", "orders", "active", branchId] as const,
    activeOrdersPrefix: (orgId?: string | null) => ["org", orgId, "shop", "orders"] as const,
    order: (orderId: string) => ["shop", "order", orderId] as const,
  },
  notifications: {
    list: () => ["me", "notifications"] as const,
    detail: (id: string) => ["notifications", "detail", id] as const,
    preferences: () => ["me", "notification-preferences"] as const,
    pushDevices: () => ["me", "push-devices"] as const,
  },
  payments: {
    invoices: () => ["me", "invoices"] as const,
    list: (orgId?: string | null, branchId?: string | null) =>
      ["org", orgId, "payments", "recent", branchId] as const,
  },
  ai: {
    all: () => ["ai"] as const,
    draft: (clientId: string) => ["ai", "draft", clientId] as const,
  },
  privacy: {
    settings: () => ["privacy", "settings"] as const,
    consents: () => ["me", "consents"] as const,
  },
  tracking: {
    all: () => ["me", "tracking"] as const,
    history: () => ["tracking", "history"] as const,
    summary: () => ["me", "tracking", "summary"] as const,
    bodyProgress: () => ["me", "tracking", "body-progress"] as const,
    workouts: () => ["me", "tracking", "workouts"] as const,
    habits: () => ["me", "tracking", "habits"] as const,
    entry: (id: string) => ["tracking", "entry", id] as const,
  },
  gym: {
    all: () => ["gym"] as const,
    search: (query?: string | null, city?: string | null) =>
      ["gyms", query ?? "", city ?? ""] as const,
    profile: (username: string) => ["gym", username] as const,
  },
} as const;
