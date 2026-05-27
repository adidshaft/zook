import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "./keys";

const orgDomainKey = (orgId: string | undefined | null, domain: string) =>
  orgId ? ["org", orgId, domain] : ["org"];

export const invalidations = {
  member: {
    all: (qc: QueryClient) => qc.invalidateQueries({ queryKey: queryKeys.member.all() }),
    home: (qc: QueryClient) => qc.invalidateQueries({ queryKey: queryKeys.member.homePrefix() }),
    membership: (qc: QueryClient) =>
      qc.invalidateQueries({ queryKey: queryKeys.member.membership() }),
    invoices: (qc: QueryClient) =>
      qc.invalidateQueries({ queryKey: queryKeys.payments.invoices() }),
  },
  attendance: {
    all: (qc: QueryClient, orgId?: string | null) =>
      qc.invalidateQueries({ queryKey: orgDomainKey(orgId, "attendance") }),
    pending: (qc: QueryClient, orgId?: string | null) =>
      qc.invalidateQueries({ queryKey: queryKeys.attendance.pending(orgId) }),
  },
  trainer: {
    all: (qc: QueryClient) => qc.invalidateQueries({ queryKey: queryKeys.trainer.all() }),
  },
  owner: {
    all: (qc: QueryClient) => qc.invalidateQueries({ queryKey: queryKeys.owner.all() }),
    dashboard: (qc: QueryClient, orgId?: string | null) =>
      qc.invalidateQueries({ queryKey: queryKeys.owner.dashboard(orgId) }),
    members: (qc: QueryClient, orgId?: string | null) =>
      qc.invalidateQueries({ queryKey: queryKeys.owner.members(orgId) }),
    approvals: (qc: QueryClient, orgId?: string | null) =>
      qc.invalidateQueries({ queryKey: queryKeys.owner.approvals(orgId) }),
    billing: (qc: QueryClient, orgId?: string | null) =>
      qc.invalidateQueries({ queryKey: queryKeys.owner.billing(orgId) }),
  },
  reception: {
    queue: (qc: QueryClient, orgId?: string | null) =>
      qc.invalidateQueries({ queryKey: queryKeys.reception.queue(orgId) }),
  },
  plans: {
    all: (qc: QueryClient) => qc.invalidateQueries({ queryKey: queryKeys.plans.list() }),
    detail: (qc: QueryClient, assignmentId?: string | null) =>
      qc.invalidateQueries({ queryKey: queryKeys.plans.detail(assignmentId) }),
    exercises: (qc: QueryClient, assignmentId?: string | null) =>
      qc.invalidateQueries({ queryKey: queryKeys.plans.exercises(assignmentId) }),
  },
  shop: {
    all: (qc: QueryClient) => qc.invalidateQueries({ queryKey: queryKeys.shop.all() }),
    catalog: (qc: QueryClient, orgId?: string | null) =>
      qc.invalidateQueries({ queryKey: queryKeys.shop.catalogPrefix(orgId) }),
    orders: (qc: QueryClient) => qc.invalidateQueries({ queryKey: queryKeys.shop.orders() }),
    activeOrders: (qc: QueryClient, orgId?: string | null) =>
      qc.invalidateQueries({ queryKey: queryKeys.shop.activeOrdersPrefix(orgId) }),
  },
  payments: {
    all: (qc: QueryClient, orgId?: string | null) =>
      qc.invalidateQueries({ queryKey: orgDomainKey(orgId, "payments") }),
    invoices: (qc: QueryClient) =>
      qc.invalidateQueries({ queryKey: queryKeys.payments.invoices() }),
  },
  notifications: {
    all: (qc: QueryClient) => qc.invalidateQueries({ queryKey: queryKeys.notifications.list() }),
    preferences: (qc: QueryClient) =>
      qc.invalidateQueries({ queryKey: queryKeys.notifications.preferences() }),
  },
  ai: {
    all: (qc: QueryClient) => qc.invalidateQueries({ queryKey: queryKeys.ai.all() }),
  },
  privacy: {
    all: (qc: QueryClient) => qc.invalidateQueries({ queryKey: queryKeys.privacy.consents() }),
  },
  tracking: {
    all: (qc: QueryClient) => qc.invalidateQueries({ queryKey: queryKeys.tracking.all() }),
  },
  gym: {
    all: (qc: QueryClient) => qc.invalidateQueries({ queryKey: queryKeys.gym.all() }),
  },
};
