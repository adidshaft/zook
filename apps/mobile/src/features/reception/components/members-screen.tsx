import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { MemberList } from "@/components/domain/member-list";
import { toneForStatus } from "@/components/membership/helpers";
import { AuditWarning, Card, FormField, ListRow, Pill, PrimaryButton, SectionHeader } from "@/components/primitives";
import { formatAgeLabel, titleCaseFromCode } from "@/lib/formatting";
import { type TranslationKey, useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { useReceptionWorkspace, receptionWorkspaceStyles as styles } from "../reception-workspace";

const membershipStatusLabelKeys: Record<string, TranslationKey> = {
  ACTIVE: "memberList.status.active",
  EXPIRED: "memberList.status.expired",
  PAST_DUE: "memberList.status.expired",
  PENDING: "memberList.status.pending",
  PENDING_PAYMENT: "memberList.status.pending",
};

function membershipStatusLabel(status: string | null | undefined, t: ReturnType<typeof useI18n>["t"]) {
  const key = String(status ?? "").toUpperCase();
  const labelKey = membershipStatusLabelKeys[key];
  return labelKey ? t(labelKey) : titleCaseFromCode(status);
}

export function ReceptionMembersScreenBody() {
  const { palette } = useTheme();
  const { t } = useI18n();
  const {
    attendanceReason,
    attendanceReasonInvalid,
    attendanceStatus,
    bulkAttendanceStatus,
    canRecordManualAttendance,
    filteredMembers,
    hiddenMemberCount,
    manualAttendanceMutation,
    member,
    memberRecord,
    memberSearch,
    membersQuery,
    membership,
    multiSelectMode,
    profile,
    reason,
    receptionMemberItems,
    recordBulkAttendance,
    recordManualAttendance,
    revealMemberPhone,
    router,
    selectedMemberIds,
    setMemberSearch,
    setMultiSelectMode,
    setReason,
    setSelectedMemberId,
    setSelectedMemberIds,
    showOwnerApprovalRequired,
    toggleMemberSelection,
    visibleMembers,
  } = useReceptionWorkspace();

  return (
    <>
            <View style={styles.membersToolbar}>
              <Pressable
                testID="reception-member-multi-toggle"
                onPress={() => {
                  setMultiSelectMode((value) => {
                    if (value) setSelectedMemberIds(new Set());
                    return !value;
                  });
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: multiSelectMode }}
                style={({ pressed }) => [
                  styles.membersToolbarChip,
                  {
                    borderColor: multiSelectMode ? palette.border.focus : palette.border.default,
                    backgroundColor: multiSelectMode
                      ? palette.surface.accentSoft
                      : palette.surface.raised,
                  },
                  pressed ? styles.membersToolbarChipPressed : null,
                ]}
              >
                <Ionicons
                  name={multiSelectMode ? "checkbox-outline" : "square-outline"}
                  size={16}
                  color={multiSelectMode ? palette.accent.base : palette.text.tertiary}
                />
                <Text
                  style={[
                    styles.membersToolbarText,
                    { color: multiSelectMode ? palette.accent.base : palette.text.secondary },
                  ]}
                >
                  {multiSelectMode
                    ? t("reception.members.multiSelectCount", { count: selectedMemberIds.size })
                    : t("reception.members.selectMultiple")}
                </Text>
              </Pressable>
              {memberRecord && !multiSelectMode ? (
                <Pressable
                  onPress={() => setSelectedMemberId(null)}
                  accessibilityRole="button"
                  accessibilityLabel={t("reception.members.clearSelectedMember")}
                  style={({ pressed }) => [
                    styles.membersToolbarChip,
                    {
                      borderColor: palette.border.default,
                      backgroundColor: palette.surface.raised,
                    },
                    pressed ? styles.membersToolbarChipPressed : null,
                  ]}
                >
                  <Ionicons name="close-outline" size={16} color={palette.text.tertiary} />
                  <Text style={[styles.membersToolbarText, { color: palette.text.secondary }]}>
                    {t("assistant.clear")}
                  </Text>
                </Pressable>
              ) : null}
            </View>
            {multiSelectMode && selectedMemberIds.size ? (
              <Card variant="compact" padding={14} contentStyle={styles.stack}>
                <SectionHeader
                  title={t("reception.members.selectedCount", { count: selectedMemberIds.size })}
                />
                <FormField
                  testID="reception-bulk-attendance-reason"
                  label={t("reception.members.attendanceNote")}
                  value={reason}
                  onChangeText={setReason}
                  required
                  error={attendanceReasonInvalid ? t("reception.members.reasonTooShort") : undefined}
                />
                <PrimaryButton
                  testID="reception-bulk-record-attendance"
                  icon="checkmark-done-outline"
                  disabled={
                    !canRecordManualAttendance ||
                    attendanceReason.length < 2 ||
                    manualAttendanceMutation.isPending
                  }
                  onLongPress={!canRecordManualAttendance ? showOwnerApprovalRequired : undefined}
                  onPress={() => void recordBulkAttendance()}
                >
                  {manualAttendanceMutation.isPending ? t("reception.members.recording") : t("reception.members.recordForAll")}
                </PrimaryButton>
                {bulkAttendanceStatus ? (
                  <Text style={[styles.statusText, { color: palette.accent.base }]}>
                    {bulkAttendanceStatus}
                  </Text>
                ) : null}
              </Card>
            ) : null}
            {!multiSelectMode && memberRecord ? (
              <Card variant="compact" padding={14} contentStyle={styles.stack}>
                <SectionHeader
                  title={t("reception.members.deskActions")}
                  subtitle={
                    member?.name
                      ? `${member.name} selected · ${formatAgeLabel(member.dateOfBirth)}`
                      : t("reception.members.searchOrSelect")
                  }
                />
                <ListRow
                  title={t("reception.members.membership")}
                  subtitle={member?.fitnessGoal ?? profile?.fitnessGoal ?? t("reception.members.generalFitness")}
                  trailing={
                    <Pill tone={membership ? toneForStatus(membership.status) : "amber"}>
                      {membership ? membershipStatusLabel(membership.status, t) : t("reception.members.noMembership")}
                    </Pill>
                  }
                />
                <AuditWarning>{t("reception.members.auditReason")}</AuditWarning>
                <FormField
                  testID="reception-attendance-reason"
                  label={t("reception.members.attendanceNote")}
                  value={reason}
                  onChangeText={setReason}
                  returnKeyType="done"
                  blurOnSubmit
                  required
                  error={attendanceReasonInvalid ? t("reception.members.reasonTooShort") : undefined}
                />
                <PrimaryButton
                  testID="reception-record-attendance"
                  icon="create-outline"
                  disabled={
                    !canRecordManualAttendance ||
                    !member?.id ||
                    attendanceReason.length < 2 ||
                    manualAttendanceMutation.isPending
                  }
                  onLongPress={!canRecordManualAttendance ? showOwnerApprovalRequired : undefined}
                  onPress={recordManualAttendance}
                >
                  {manualAttendanceMutation.isPending ? t("reception.members.recording") : t("reception.members.recordAttendance")}
                </PrimaryButton>
                {attendanceStatus ? (
                  <Text
                    testID="reception-attendance-status"
                    style={[styles.statusText, { color: palette.accent.base }]}
                  >
                    {attendanceStatus}
                  </Text>
                ) : null}
              </Card>
            ) : null}
            <View style={[styles.stack, styles.memberListSection]}>
              <MemberList
                testID="reception-member"
                searchTestID="reception-member-search"
                items={receptionMemberItems}
                isLoading={membersQuery.isLoading}
                isError={membersQuery.isError}
                onRetry={() => void membersQuery.refetch()}
                searchValue={memberSearch}
                onSearchChange={setMemberSearch}
                emptyState={{ title: t("reception.members.noMembers"), subtitle: t("reception.members.noMembersBody") }}
                onPressMember={(user) => {
                  if (multiSelectMode) {
                    toggleMemberSelection(user.id);
                  } else {
                    setSelectedMemberId(user.id);
                    router.push(`/reception/members/${user.id}`);
                  }
                }}
                onRevealPhone={(user) => revealMemberPhone(user.id)}
                style={styles.memberList}
              />
              {hiddenMemberCount ? (
                <Text style={[styles.resultHint, { color: palette.text.tertiary }]}>
                  {t("reception.members.hiddenHint", {
                    visible: visibleMembers.length,
                    total: filteredMembers.length,
                  })}
                </Text>
              ) : null}
            </View>
    </>
  );
}
