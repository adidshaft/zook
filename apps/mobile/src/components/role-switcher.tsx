import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Role } from "@zook/core";

import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from "@/components/expo-safe-bottom-sheet";
import { IconBubble, ListRow, ZookChip } from "@/components/primitives";
import { useAuth } from "@/lib/auth";
import { useRoleContext } from "@/lib/role-context";
import { routeForRole } from "@/lib/route-guards";
import { layout, spacing, typography, useTheme } from "@/lib/theme";
import { showToast } from "@/lib/toast";

type RoleCombo = {
  key: string;
  orgId: string;
  orgName: string;
  role: Role;
};

function titleCaseRole(role: Role) {
  return role
    .replace(/_/g, " ")
    .toLowerCase()
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function RoleSwitcherChip() {
  const { palette } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const sheetRef = useRef<BottomSheetModal>(null);
  const ctx = useRoleContext();
  const { activeOrgId, session, switchOrg, switchRole } = useAuth();
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const combos = useMemo<RoleCombo[]>(() => {
    return (session?.organizations ?? []).flatMap((organization) =>
      organization.roles.map((role) => ({
        key: `${organization.orgId}:${role}`,
        orgId: organization.orgId,
        orgName: organization.name,
        role,
      })),
    );
  }, [session?.organizations]);

  const currentOrgId = ctx?.org?.orgId ?? activeOrgId;
  const currentLabel = ctx?.org
    ? `${ctx.org.name} · ${titleCaseRole(ctx.role)}`
    : ctx?.isPlatformAdmin
      ? "Zook · Platform Admin"
      : "Zook · Member";
  const canSwitch = combos.length > 1;

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
      />
    ),
    [],
  );

  const chooseCombo = useCallback(
    async (combo: RoleCombo) => {
      if (combo.orgId === currentOrgId && combo.role === ctx?.role) {
        sheetRef.current?.dismiss();
        return;
      }
      setBusyKey(combo.key);
      try {
        if (combo.orgId !== currentOrgId) {
          await switchOrg(combo.orgId);
        }
        await switchRole(combo.role);
        sheetRef.current?.dismiss();
        router.replace(routeForRole(combo.role) as never);
      } catch (error) {
        showToast({
          title: "Role unavailable",
          message: error instanceof Error ? error.message : "That role is not available here.",
          tone: "danger",
          haptic: "error",
        });
      } finally {
        setBusyKey(null);
      }
    },
    [ctx?.role, currentOrgId, router, switchOrg, switchRole],
  );

  if (!ctx) {
    return null;
  }

  const chip = (
    <ZookChip
      icon="shield-checkmark-outline"
      tone={canSwitch ? "lime" : "neutral"}
      style={styles.chip}
      textStyle={styles.chipText}
    >
      {currentLabel}
    </ZookChip>
  );

  if (!canSwitch) {
    return (
      <View testID="role-switcher-chip" accessibilityLabel={currentLabel}>
        {chip}
      </View>
    );
  }

  return (
    <>
      <Pressable
        testID="role-switcher-chip"
        accessibilityRole="button"
        accessibilityLabel={`Switch role. Current role: ${currentLabel}`}
        onPress={() => sheetRef.current?.present()}
        hitSlop={6}
        style={({ pressed }) => [
          styles.roleTrigger,
          pressed ? styles.roleTriggerPressed : null,
        ]}
      >
        <View style={styles.interactiveChip}>
          {chip}
          <Ionicons name="chevron-down" size={15} color={palette.accent.base} />
        </View>
      </Pressable>
      <BottomSheetModal
        ref={sheetRef}
        backdropComponent={renderBackdrop}
        bottomInset={insets.bottom}
        enablePanDownToClose
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={StyleSheet.flatten([
          styles.sheetHandle,
          { backgroundColor: palette.border.strong },
        ])}
        snapPoints={["CONTENT_HEIGHT"]}
      >
        <BottomSheetView style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: palette.text.primary }]}>Switch role</Text>
            <Text style={[styles.sheetSubtitle, { color: palette.text.secondary }]}>
              Choose the gym and role for this workspace.
            </Text>
          </View>
          <View style={styles.optionStack}>
            {combos.map((combo) => {
              const selected = combo.orgId === currentOrgId && combo.role === ctx.role;
              const busy = busyKey === combo.key;
              return (
                <Pressable
                  key={combo.key}
                  testID={`role-switcher-option-${combo.key}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected, disabled: Boolean(busyKey), busy }}
                  disabled={Boolean(busyKey)}
                  onPress={() => void chooseCombo(combo)}
                  style={({ pressed }) => [
                    styles.option,
                    selected
                      ? [
                          styles.optionSelected,
                          {
                            borderColor: palette.border.focus,
                            backgroundColor: palette.surface.accentSoft,
                          },
                        ]
                      : null,
                    !selected ? { backgroundColor: palette.surface.default } : null,
                    pressed && !busyKey ? styles.optionPressed : null,
                  ]}
                >
                  <ListRow
                    title={`${combo.orgName} · ${titleCaseRole(combo.role)}`}
                    subtitle={selected ? "Current workspace" : "Switch to this workspace"}
                    leading={
                      <IconBubble
                        icon={selected ? "checkmark-circle-outline" : "business-outline"}
                        tone={selected ? "lime" : "neutral"}
                      />
                    }
                    trailing={
                      <Text
                        style={[
                          selected ? styles.currentText : styles.switchText,
                          {
                            color: selected ? palette.accent.base : palette.text.secondary,
                          },
                        ]}
                      >
                        {busy ? "Switching..." : selected ? "Active" : "Use"}
                      </Text>
                    }
                  />
                </Pressable>
              );
            })}
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    </>
  );
}

export function RoleSwitcherContextPill() {
  const { palette } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const sheetRef = useRef<BottomSheetModal>(null);
  const ctx = useRoleContext();
  const { activeOrgId, session, switchOrg, switchRole } = useAuth();
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const combos = useMemo<RoleCombo[]>(() => {
    return (session?.organizations ?? []).flatMap((organization) =>
      organization.roles.map((role) => ({
        key: `${organization.orgId}:${role}`,
        orgId: organization.orgId,
        orgName: organization.name,
        role,
      })),
    );
  }, [session?.organizations]);

  const currentOrgId = ctx?.org?.orgId ?? activeOrgId;
  const currentOrgName = ctx?.org?.name ?? "Zook";
  const rolesInOrg =
    session?.organizations.find((organization) => organization.orgId === currentOrgId)?.roles ?? [];
  const roleTag = rolesInOrg.length > 1 && ctx?.role ? titleCaseRole(ctx.role) : null;
  const canSwitch = combos.length > 1;
  const initial = currentOrgName.trim().charAt(0).toUpperCase() || "Z";

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
      />
    ),
    [],
  );

  const chooseCombo = useCallback(
    async (combo: RoleCombo) => {
      if (combo.orgId === currentOrgId && combo.role === ctx?.role) {
        sheetRef.current?.dismiss();
        return;
      }
      setBusyKey(combo.key);
      try {
        if (combo.orgId !== currentOrgId) {
          await switchOrg(combo.orgId);
        }
        await switchRole(combo.role);
        sheetRef.current?.dismiss();
        router.replace(routeForRole(combo.role) as never);
      } catch (error) {
        showToast({
          title: "Role unavailable",
          message: error instanceof Error ? error.message : "That role is not available here.",
          tone: "danger",
          haptic: "error",
        });
      } finally {
        setBusyKey(null);
      }
    },
    [ctx?.role, currentOrgId, router, switchOrg, switchRole],
  );

  if (!ctx) {
    return null;
  }

  const trigger = (
    <View
      style={[
        styles.contextPill,
        {
          backgroundColor: palette.surface.default,
          borderColor: palette.border.subtle,
        },
      ]}
    >
      <View style={[styles.contextAvatar, { backgroundColor: palette.surface.accentSoft }]}>
        <Text style={[styles.contextAvatarText, { color: palette.accent.base }]}>{initial}</Text>
      </View>
      <Text numberOfLines={1} style={[styles.contextName, { color: palette.text.primary }]}>
        {currentOrgName}
      </Text>
      {roleTag ? (
        <Text numberOfLines={1} style={[styles.contextRole, { color: palette.text.secondary }]}>
          {roleTag}
        </Text>
      ) : null}
      {canSwitch ? <Ionicons name="chevron-down" size={14} color={palette.text.tertiary} /> : null}
    </View>
  );

  if (!canSwitch) {
    return (
      <View testID="role-switcher-context-pill" accessibilityLabel={currentOrgName}>
        {trigger}
      </View>
    );
  }

  return (
    <>
      <Pressable
        testID="role-switcher-context-pill"
        accessibilityRole="button"
        accessibilityLabel={`Switch role. Current workspace: ${currentOrgName}`}
        onPress={() => sheetRef.current?.present()}
        hitSlop={6}
        style={({ pressed }) => (pressed ? styles.contextTriggerPressed : null)}
      >
        {trigger}
      </Pressable>
      <BottomSheetModal
        ref={sheetRef}
        backdropComponent={renderBackdrop}
        bottomInset={insets.bottom}
        enablePanDownToClose
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={StyleSheet.flatten([
          styles.sheetHandle,
          { backgroundColor: palette.border.strong },
        ])}
        snapPoints={["CONTENT_HEIGHT"]}
      >
        <BottomSheetView style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: palette.text.primary }]}>Switch role</Text>
            <Text style={[styles.sheetSubtitle, { color: palette.text.secondary }]}>
              Choose the gym and role for this workspace.
            </Text>
          </View>
          <View style={styles.optionStack}>
            {combos.map((combo) => {
              const selected = combo.orgId === currentOrgId && combo.role === ctx.role;
              const busy = busyKey === combo.key;
              return (
                <Pressable
                  key={combo.key}
                  testID={`role-switcher-option-${combo.key}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected, disabled: Boolean(busyKey), busy }}
                  disabled={Boolean(busyKey)}
                  onPress={() => void chooseCombo(combo)}
                  style={({ pressed }) => [
                    styles.option,
                    selected
                      ? [
                          styles.optionSelected,
                          {
                            borderColor: palette.border.focus,
                            backgroundColor: palette.surface.accentSoft,
                          },
                        ]
                      : null,
                    !selected ? { backgroundColor: palette.surface.default } : null,
                    pressed && !busyKey ? styles.optionPressed : null,
                  ]}
                >
                  <ListRow
                    title={`${combo.orgName} · ${titleCaseRole(combo.role)}`}
                    subtitle={selected ? "Current workspace" : "Switch to this workspace"}
                    leading={
                      <IconBubble
                        icon={selected ? "checkmark-circle-outline" : "business-outline"}
                        tone={selected ? "lime" : "neutral"}
                      />
                    }
                    trailing={
                      <Text
                        style={[
                          selected ? styles.currentText : styles.switchText,
                          {
                            color: selected ? palette.accent.base : palette.text.secondary,
                          },
                        ]}
                      >
                        {busy ? "Switching..." : selected ? "Active" : "Use"}
                      </Text>
                    }
                  />
                </Pressable>
              );
            })}
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    </>
  );
}

const styles = StyleSheet.create({
  chip: {
    maxWidth: 280,
  },
  chipText: {
    flexShrink: 1,
  },
  roleTrigger: {
    minHeight: 44,
    justifyContent: "center",
  },
  roleTriggerPressed: {
    opacity: 0.84,
    transform: [{ scale: 0.985 }],
  },
  interactiveChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  contextPill: {
    alignItems: "center",
    borderCurve: "continuous",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    maxWidth: 280,
    minHeight: 36,
    minWidth: 0,
    paddingLeft: 6,
    paddingRight: spacing.sm,
  },
  contextAvatar: {
    alignItems: "center",
    borderRadius: 999,
    height: 20,
    justifyContent: "center",
    width: 20,
  },
  contextAvatarText: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    lineHeight: 12,
  },
  contextName: {
    ...typography.caption,
    flexShrink: 1,
    minWidth: 0,
  },
  contextRole: {
    ...typography.caption,
    maxWidth: 72,
  },
  contextTriggerPressed: {
    opacity: 0.84,
    transform: [{ scale: 0.985 }],
  },
  sheet: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  sheetBackground: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  sheetHandle: {
    width: 44,
    height: 5,
    borderRadius: 999,
  },
  sheetHeader: {
    gap: 4,
  },
  sheetTitle: {
    ...typography.sectionTitle,
  },
  sheetSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  optionStack: {
    gap: spacing.sm,
  },
  option: {
    borderRadius: 18,
  },
  optionSelected: {
    borderWidth: 1,
  },
  optionPressed: {
    opacity: 0.84,
  },
  currentText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  switchText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
});
