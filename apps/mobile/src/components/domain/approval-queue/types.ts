import type { ReactNode } from "react";

export type ApprovalItem = {
  id: string;
  primaryText: string;
  secondaryText?: string;
  metaText?: string;
  reason?: string;
  context?: ReactNode;
};

export type ApprovalQueueProps = {
  items: ApprovalItem[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  onApprove: (id: string) => void;
  onReject?: (id: string) => void;
  approvingId?: string;
  rejectingId?: string;
  emptyState?: { title: string; subtitle?: string };
  testID?: string;
};
