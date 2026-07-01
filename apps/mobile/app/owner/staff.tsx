import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  BranchSelectorChip,
  Card,
  EmptyState,
  FormField,
  HeaderActions,
  IconBubble,
  Pill,
  QueryErrorState,
  ScreenHeader,
  ZookButton,
  ZookScreen,
} from "@/components/primitives";
import { RoleSwitcherContextPill } from "@/components/role-switcher";
import { useOrgStaff, type StaffAssignment, type StaffUser } from "@/lib/domains/owner/queries";
import { useInviteStaff, useRemoveStaff, useUpdateStaffRole, type StaffRole } from "@/lib/domains/owner/mutations";
import { useT } from "@/lib/i18n";
import { layout, radii, spacing, typography, useTheme } from "@/lib/theme";

function roleTone(role: string) {
  if (role === "OWNER") return "violet" as const;
  if (role === "ADMIN") return "blue" as const;
  if (role === "TRAINER") return "lime" as const;
  return "amber" as const;
}

export default function OwnerStaff() {
  const { palette } = useTheme();
  const t = useT();
  const staffQuery = useOrgStaff();
  const invite = useInviteStaff();
  const updateRole = useUpdateStaffRole();
  const removeStaff = useRemoveStaff();
  const [refreshing, setRefreshing] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<StaffRole>("TRAINER");
  const [editingId, setEditingId] = useState<string | null>(null);

  const staff = staffQuery.data?.staff ?? [];
  const users = staffQuery.data?.users ?? [];
  const pendingCount = staff.filter((row) => row.pending).length;
  const assignableRoles: Array<{ value: StaffRole; label: string }> = [
    { value: "ADMIN", label: t("owner.staff.admin") },
    { value: "TRAINER", label: t("owner.staff.trainer") },
  ];
  const roleLabel: Record<string, string> = {
    OWNER: t("owner.staff.owner"),
    ADMIN: t("owner.staff.admin"),
    TRAINER: t("owner.staff.trainer"),
    RECEPTIONIST: t("owner.staff.reception"),
  };
  const userById = new Map<string, StaffUser>(users.map((user) => [user.id, user]));
  const canSubmitInvite = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && !invite.isPending;

  async function refresh() {
    setRefreshing(true);
    await staffQuery.refetch();
    setRefreshing(false);
  }

  function submitInvite() {
    if (!canSubmitInvite) return;
    invite.mutate(
      { email: email.trim().toLowerCase(), role: inviteRole },
      {
        onSuccess: () => {
          setEmail("");
          setInviteRole("TRAINER");
          setShowInvite(false);
        },
      },
    );
  }

  function confirmRemove(row: StaffAssignment, name: string) {
    Alert.alert(t("owner.staff.removeTitle"), t("owner.staff.removeBody", { name }), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("owner.staff.remove"), style: "destructive", onPress: () => removeStaff.mutate(row.id) },
    ]);
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ZookScreen testID="owner-staff-screen">
        <ScrollView
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={palette.accent.base} colors={[palette.accent.base]} />}
        >
          <ScreenHeader
            title={t("owner.staff.title")}
            contextSlot={
              <View style={styles.headerContext}>
                <RoleSwitcherContextPill />
                <BranchSelectorChip style={styles.headerBranchSelector} />
              </View>
            }
            trailing={<HeaderActions showBell />}
          />

          <View style={styles.listToolbar}>
            <View style={styles.countCluster}>
              <Pill tone={staff.length ? "blue" : "neutral"}>
                {t("owner.staff.totalStaff", { count: staff.length })}
              </Pill>
              {pendingCount ? (
                <Pill tone="amber">
                  {t("owner.staff.pendingInvites", { count: pendingCount })}
                </Pill>
              ) : null}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={showInvite ? t("common.cancel") : t("owner.staff.invite")}
              hitSlop={8}
              onPress={() => setShowInvite((v) => !v)}
              style={({ pressed }) => [
                styles.toolbarAction,
                {
                  backgroundColor: showInvite ? palette.surface.default : palette.accent.base,
                  borderColor: showInvite ? palette.border.default : palette.accent.strong,
                },
                pressed ? styles.pressedAction : null,
              ]}
            >
              <Ionicons
                name={showInvite ? "close" : "person-add"}
                size={19}
                color={showInvite ? palette.text.secondary : palette.text.onAccent}
              />
            </Pressable>
          </View>

          {showInvite ? (
            <Card contentStyle={styles.formCard}>
              <Text style={[styles.formTitle, { color: palette.text.primary }]}>{t("owner.staff.inviteStaffMember")}</Text>
              <FormField label={t("owner.staff.email")} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="coach@email.com" />
              <Text style={[styles.label, { color: palette.text.secondary }]}>{t("owner.staff.role")}</Text>
              <View style={styles.chipWrap}>
                {assignableRoles.map((option) => {
                  const selected = inviteRole === option.value;
                  return (
                    <Pressable key={option.value} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => setInviteRole(option.value)} style={[styles.chip, { borderColor: selected ? palette.accent.base : palette.border.default, backgroundColor: selected ? palette.surface.accentSoft : palette.surface.default }]}>
                      <Text style={[styles.chipText, { color: selected ? palette.accent.base : palette.text.secondary }]}>{option.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={[styles.hint, { color: palette.text.tertiary }]}>{t("owner.staff.receptionWebHint")}</Text>
              <ZookButton onPress={submitInvite} disabled={!canSubmitInvite} busy={invite.isPending} busyLabel={t("owner.staff.sending")} icon="mail-outline">
                {t("owner.staff.sendInvite")}
              </ZookButton>
            </Card>
          ) : null}

          {staffQuery.isError ? (
            <QueryErrorState error={staffQuery.error} onRetry={() => void staffQuery.refetch()} />
          ) : null}
          {!staffQuery.isLoading && staff.length === 0 ? (
            <Card variant="compact">
              <EmptyState
                icon="people-outline"
                title={t("owner.staff.noStaffYet")}
                body={t("owner.staff.noStaffBody")}
                cta={{
                  label: t("owner.staff.invite"),
                  onPress: () => setShowInvite(true),
                }}
              />
            </Card>
          ) : null}

          <View style={styles.stack}>
            {staff.map((row) => {
              const user = userById.get(row.userId);
              const name = user?.name ?? user?.email ?? t("owner.staff.staffMember");
              const isOwner = row.role === "OWNER";
              const editing = editingId === row.id;
              return (
                <Card key={row.id} variant="compact" contentStyle={styles.staffCard}>
                  <View style={styles.staffMain}>
                    <IconBubble icon="person" tone={roleTone(row.role)} size={42} />
                    <View style={styles.staffCopy}>
                      <Text style={[styles.staffName, { color: palette.text.primary }]} numberOfLines={1}>{name}</Text>
                      <Text style={[styles.staffMeta, { color: palette.text.secondary }]} numberOfLines={1}>{user?.email ?? ""}</Text>
                      <View style={styles.staffStatusRow}>
                        <Pill tone={roleTone(row.role)}>{roleLabel[row.role] ?? row.role}</Pill>
                        {row.pending ? <Pill tone="neutral">{t("owner.staff.invited")}</Pill> : null}
                      </View>
                    </View>
                  </View>
                  {!isOwner ? (
                    <>
                      {editing ? (
                        <View style={styles.chipWrap}>
                          {assignableRoles.map((option) => {
                            const selected = row.role === option.value;
                            return (
                              <Pressable
                                key={option.value}
                                accessibilityRole="button"
                                accessibilityState={{ selected }}
                                onPress={() => updateRole.mutate({ assignmentId: row.id, role: option.value }, { onSuccess: () => setEditingId(null) })}
                                style={[styles.chip, { borderColor: selected ? palette.accent.base : palette.border.default, backgroundColor: selected ? palette.surface.accentSoft : palette.surface.default }]}
                              >
                                <Text style={[styles.chipText, { color: selected ? palette.accent.base : palette.text.secondary }]}>{option.label}</Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      ) : null}
                      <View style={styles.staffActions}>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={editing ? t("common.done") : t("owner.staff.changeRole")}
                          hitSlop={8}
                          onPress={() => setEditingId(editing ? null : row.id)}
                          style={({ pressed }) => [
                            styles.staffIconAction,
                            {
                              backgroundColor: editing ? palette.surface.accentSoft : palette.surface.default,
                              borderColor: editing ? palette.accent.base : palette.border.default,
                            },
                            pressed ? styles.pressedAction : null,
                          ]}
                        >
                          <Ionicons
                            name={editing ? "checkmark" : "swap-horizontal-outline"}
                            size={18}
                            color={editing ? palette.accent.strong : palette.text.secondary}
                          />
                        </Pressable>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={t("owner.staff.remove")}
                          hitSlop={8}
                          onPress={() => confirmRemove(row, name)}
                          style={({ pressed }) => [
                            styles.staffIconAction,
                            styles.staffDangerAction,
                            pressed ? styles.pressedAction : null,
                          ]}
                        >
                          <Ionicons name="trash-outline" size={18} color={palette.feedback.danger} />
                        </Pressable>
                      </View>
                    </>
                  ) : null}
                </Card>
              );
            })}
          </View>
        </ScrollView>
      </ZookScreen>
    </>
  );
}

const styles = StyleSheet.create({
  headerContext: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: spacing.xs,
    minWidth: 0,
    width: "100%",
  },
  headerBranchSelector: {
    flex: 1,
    minWidth: 0,
  },
  content: {
    alignSelf: "center",
    gap: spacing.md,
    maxWidth: layout.contentWidth,
    paddingBottom: layout.bottomNavContentPadding,
    paddingTop: layout.screenContentTopPadding,
    width: "100%",
  },
  formCard: { gap: spacing.md },
  formTitle: { ...typography.cardTitle },
  label: { ...typography.caption },
  hint: { ...typography.small },
  listToolbar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  countCluster: {
    alignItems: "center",
    flexDirection: "row",
    flexShrink: 1,
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  toolbarAction: {
    alignItems: "center",
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: -spacing.xs },
  chip: { borderRadius: radii.pill, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 9 },
  chipText: { ...typography.caption },
  stack: { gap: spacing.sm },
  staffCard: { gap: spacing.sm },
  staffMain: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  staffCopy: { flex: 1, gap: 2, minWidth: 0 },
  staffName: { ...typography.cardTitle },
  staffMeta: { ...typography.small },
  staffStatusRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    paddingTop: 2,
  },
  staffActions: { alignSelf: "flex-end", flexDirection: "row", gap: spacing.xs },
  staffIconAction: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  staffDangerAction: {
    borderColor: "rgba(255, 98, 74, 0.42)",
  },
  pressedAction: {
    opacity: 0.78,
    transform: [{ scale: 0.96 }],
  },
});
