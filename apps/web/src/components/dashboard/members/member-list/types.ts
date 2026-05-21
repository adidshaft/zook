import type {
  JoinRequestRow,
  MemberDetailPayload,
  MemberRow,
  MembershipPlanRow,
  OrganizationSnapshot,
} from "../../../dashboard-operational-model";

export type MemberFilter =
  | "All"
  | "Active"
  | "Pending Payment"
  | "Expired"
  | "Paused"
  | "Visit Pack"
  | "Trial";

export const memberFilters: MemberFilter[] = [
  "All",
  "Active",
  "Pending Payment",
  "Expired",
  "Paused",
  "Visit Pack",
  "Trial",
];

export type MembersState = {
  error: string;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  loadMore: () => void;
  reload: () => void;
};

export type ResourceState<T> = {
  data: T | undefined;
  error: string;
  loading: boolean;
  reload: () => void;
};

export type MembersPageProps = {
  view?: "members" | "join-requests";
  orgId: string;
  organization: OrganizationSnapshot;
  members: MemberRow[];
  membersState: MembersState;
  selectedMemberId: string | null;
  setSelectedMemberId: (memberId: string | null) => void;
  memberDetailState: ResourceState<MemberDetailPayload>;
  joinRequests: JoinRequestRow[];
  joinRequestsState: ResourceState<{ joinRequests: JoinRequestRow[] }>;
  queueError: string;
  queueBusyId: string | null;
  updateJoinRequest: (requestId: string, action: "approve" | "reject") => Promise<void>;
  membershipPlans: MembershipPlanRow[];
  membershipPlansState: ResourceState<{ plans: MembershipPlanRow[] }>;
  planNamesById: Map<string, string>;
};

export function normalizeMemberText(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}
