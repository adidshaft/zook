import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { MemberList } from "@/components/domain/member-list";
import { toneForStatus } from "@/components/membership/helpers";
import { AuditWarning, Card, FormField, ListRow, Pill, PrimaryButton, SectionHeader } from "@/components/primitives";
import { formatAgeLabel, titleCaseFromCode } from "@/lib/formatting";
import { useTheme } from "@/lib/theme";
import { useReceptionWorkspace, receptionWorkspaceStyles as styles } from "../reception-workspace";

export function ReceptionMembersScreenBody() {
  const { palette } = useTheme();
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
                    ? `Multi-select · ${selectedMemberIds.size}`
                    : "Select multiple"}
                </Text>
              </Pressable>
              {memberRecord && !multiSelectMode ? (
                <Pressable
                  onPress={() => setSelectedMemberId(null)}
                  accessibilityRole="button"
                  accessibilityLabel="Clear selected member"
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
                  <Text style={[styles.membersToolbarText, { color: palette.text.secondary }]}>Clear</Text>
                </Pressable>
              ) : null}
            </View>
            {multiSelectMode && selectedMemberIds.size ? (
              <Card variant="compact" padding={14} contentStyle={styles.stack}>
                <SectionHeader
                  title={`${selectedMemberIds.size} member${selectedMemberIds.size === 1 ? "" : "s"} selected`}
                />
                <FormField
                  testID="reception-bulk-attendance-reason"
                  label="Attendance note"
                  value={reason}
                  onChangeText={setReason}
                  required
                  error={attendanceReasonInvalid ? "Add at least 2 characters." : undefined}
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
                  {manualAttendanceMutation.isPending ? "Recording..." : "Record for all"}
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
                  title="Desk actions"
                  subtitle={
                    member?.name
                      ? `${member.name} selected · ${formatAgeLabel(member.dateOfBirth)}`
                      : "Search or select a member"
                  }
                />
                <ListRow
                  title="Membership"
                  subtitle={member?.fitnessGoal ?? profile?.fitnessGoal ?? "General fitness"}
                  trailing={
                    <Pill tone={membership ? toneForStatus(membership.status) : "amber"}>
                      {membership ? titleCaseFromCode(membership.status) : "No membership"}
                    </Pill>
                  }
                />
                <AuditWarning>Add a reason so the gym has a clear record.</AuditWarning>
                <FormField
                  testID="reception-attendance-reason"
                  label="Attendance note"
                  value={reason}
                  onChangeText={setReason}
                  returnKeyType="done"
                  blurOnSubmit
                  required
                  error={attendanceReasonInvalid ? "Add at least 2 characters." : undefined}
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
                  {manualAttendanceMutation.isPending ? "Recording..." : "Record Attendance"}
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
                emptyState={{ title: "No members found", subtitle: "Try a different name or email." }}
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
                  Showing {visibleMembers.length} of {filteredMembers.length} matches. Refine the search
                  to find a specific member faster.
                </Text>
              ) : null}
            </View>
    </>
  );
}
