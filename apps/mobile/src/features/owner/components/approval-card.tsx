import { View } from "react-native";

import { GlassCard, IconBubble, ListRow, Pill, PrimaryButton, SecondaryButton } from "@/components/primitives";
import type { OrgJoinRequestRecord, ReceptionQueueRecord } from "@/lib/domains/shared/types";
import { cleanReviewReason, titleCase } from "@/features/owner/helpers";

export function JoinRequestCard({
  request,
  disabled,
  onApprove,
  onReject,
  testID,
}: {
  request: OrgJoinRequestRecord;
  disabled: boolean;
  onApprove: () => void;
  onReject: () => void;
  testID?: string;
}) {
  return (
    <GlassCard testID={testID} contentStyle={{ gap: 12 }}>
      <ListRow
        title={request.userName ?? "Join request"}
        subtitle={`${request.userEmail ?? request.userId} · Referral ${request.referralCode ?? "none"}`}
        leading={<IconBubble icon="person-add-outline" tone="amber" />}
        trailing={<Pill tone="amber">Pending</Pill>}
      />
      <View style={{ flexDirection: "row", gap: 10 }}>
        <PrimaryButton onPress={onApprove} disabled={disabled} style={{ flex: 1 }}>
          Approve
        </PrimaryButton>
        <SecondaryButton onPress={onReject} disabled={disabled} style={{ flex: 1 }}>
          Reject
        </SecondaryButton>
      </View>
    </GlassCard>
  );
}

export function AttendanceApprovalCard({
  record,
  disabled,
  onApprove,
  onLongPress,
  testID,
}: {
  record: ReceptionQueueRecord;
  disabled: boolean;
  onApprove: () => void;
  onLongPress?: () => void;
  testID?: string;
}) {
  const flagged = record.status === "FLAGGED";
  return (
    <GlassCard testID={testID} contentStyle={{ gap: 12 }}>
      <ListRow
        title={record.user?.name ?? record.user?.email ?? "Member check-in"}
        subtitle={`${record.branchName ?? "Main branch"} · ${titleCase(record.status)} · ${cleanReviewReason(
          Array.isArray(record.suspiciousFlags) ? record.suspiciousFlags.join(", ") : null,
        )}`}
        leading={<IconBubble icon={flagged ? "alert-outline" : "qr-code-outline"} tone={flagged ? "red" : "amber"} />}
        trailing={<Pill tone={flagged ? "red" : "amber"}>{titleCase(record.status)}</Pill>}
      />
      <PrimaryButton
        onPress={onApprove}
        disabled={disabled}
        onLongPress={onLongPress}
        icon="checkmark-outline"
      >
        Approve Check-in
      </PrimaryButton>
    </GlassCard>
  );
}
