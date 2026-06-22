import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";

export type DomainTone = "neutral" | "lime" | "amber" | "danger" | "blue" | "violet";

export type MemberRowItem = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  status: "active" | "expiring" | "expired" | "pending";
  badges?: Array<{ label: string; tone: DomainTone }>;
  meta?: string;
  phoneRevealed?: boolean;
  action?: { label: string; onPress: () => void };
};

export type MemberListFilter =
  | { kind: "all" }
  | { kind: "status"; status: MemberRowItem["status"] }
  | { kind: "tag"; tag: string };

export type MemberListProps = {
  items: MemberRowItem[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  onPressMember: (member: MemberRowItem) => void;
  onRevealPhone?: (member: MemberRowItem) => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  filter?: MemberListFilter;
  onFilterChange?: (filter: MemberListFilter) => void;
  availableFilters?: MemberListFilter[];
  emptyState?: { title: string; subtitle?: string };
  testID?: string;
  searchTestID?: string;
  refreshing?: boolean;
  onRefresh?: () => void;
  header?: ReactNode;
  scrollEnabled?: boolean;
  style?: StyleProp<ViewStyle>;
};
