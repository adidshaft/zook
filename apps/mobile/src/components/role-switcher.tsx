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
import { titleCaseFromCode } from "@/lib/formatting";
import { useT, type TranslationKey } from "@/lib/i18n";
import { useRoleContext } from "@/lib/role-context";
import { routeForRole } from "@/lib/route-guards";
import { layout, spacing, typography, useTheme } from "@/lib/theme";
import { showToast } from "@/lib/toast";

type RoleCombo = {
  key: string;
  orgId: string;
  orgName: string;
  logoUrl?: string | null;
  role: Role;
};

const roleLabelKeys: Partial<Record<Role, TranslationKey>> = {
  ADMIN: "roleSwitcher.role.admin",
  MEMBER: "roleSwitcher.role.member",
  OWNER: "roleSwitcher.role.owner",
  PLATFORM_ADMIN: "roleSwitcher.role.platformAdmin",
  RECEPTIONIST: "roleSwitcher.role.receptionist",
  TRAINER: "roleSwitcher.role.trainer",
};

function getRoleLabel(role: Role | null | undefined, t: ReturnType<typeof useT>) {
  if (!role) {
    return t("roleSwitcher.role.member");
  }
  const labelKey = roleLabelKeys[role];
  return labelKey ? t(labelKey) : titleCaseFromCode(role);
}

export function RoleSwitcherChip() {
  const { palette } = useTheme();
  const t = useT();
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
        logoUrl: organization.logoUrl,
        role,
      })),
    );
  }, [session?.organizations]);

  const currentOrgId = ctx?.org?.orgId ?? activeOrgId;
  const currentLabel = ctx?.isPlatformAdmin
    ? t("roleSwitcher.role.platformAdmin")
    : ctx?.role
      ? getRoleLabel(ctx.role, t)
      : t("roleSwitcher.role.member");
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
          title: t("roleSwitcher.roleUnavailable"),
          message: error instanceof Error ? error.message : t("roleSwitcher.roleUnavailableBody"),
          tone: "danger",
          haptic: "error",
        });
      } finally {
        setBusyKey(null);
      }
    },
    [ctx?.role, currentOrgId, router, switchOrg, switchRole, t],
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
        accessibilityLabel={t("roleSwitcher.currentRoleAccessibility", { role: currentLabel })}
        onPress={() => sheetRef.current?.present()}
        hitSlop={6}
        style={({ pressed }) => [styles.roleTrigger, pressed ? styles.roleTriggerPressed : null]}
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
            <Text style={[styles.sheetTitle, { color: palette.text.primary }]}>
              {t("roleSwitcher.title")}
            </Text>
            <Text style={[styles.sheetSubtitle, { color: palette.text.secondary }]}>
              {t("roleSwitcher.subtitle")}
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
                    title={`${combo.orgName} · ${getRoleLabel(combo.role, t)}`}
                    subtitle={
                      selected
                        ? t("roleSwitcher.currentWorkspace")
                        : t("roleSwitcher.switchToWorkspace")
                    }
                    leading={
                      <IconBubble
                        icon={selected ? "checkmark-circle-outline" : "business-outline"}
                        tone={selected ? "blue" : "neutral"}
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
                        {busy
                          ? t("roleSwitcher.switching")
                          : selected
                            ? t("roleSwitcher.active")
                            : t("roleSwitcher.use")}
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
  const t = useT();
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
        logoUrl: organization.logoUrl,
        role,
      })),
    );
  }, [session?.organizations]);

  const currentOrgId = ctx?.org?.orgId ?? activeOrgId;
  const roleLabel = ctx?.isPlatformAdmin
    ? t("roleSwitcher.role.platformAdmin")
    : ctx?.role
      ? getRoleLabel(ctx.role, t)
      : t("roleSwitcher.role.member");
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
          title: t("roleSwitcher.roleUnavailable"),
          message: error instanceof Error ? error.message : t("roleSwitcher.roleUnavailableBody"),
          tone: "danger",
          haptic: "error",
        });
      } finally {
        setBusyKey(null);
      }
    },
    [ctx?.role, currentOrgId, router, switchOrg, switchRole, t],
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
      <View style={[styles.contextRoleIcon, { backgroundColor: palette.bg.sunken }]}>
        <Ionicons name="shield-checkmark-outline" size={14} color={palette.text.secondary} />
      </View>
      <View style={styles.contextCopy}>
        <Text
          numberOfLines={1}
          ellipsizeMode="tail"
          style={[styles.contextName, { color: palette.text.primary }]}
        >
          {roleLabel}
        </Text>
      </View>
      {canSwitch ? (
        <Ionicons
          name="chevron-down"
          size={12}
          color={palette.text.tertiary}
          style={styles.contextChevron}
        />
      ) : null}
    </View>
  );

  if (!canSwitch) {
    return (
      <View
        testID="role-switcher-context-pill"
        accessibilityLabel={roleLabel}
      >
        {trigger}
      </View>
    );
  }

  return (
    <>
      <Pressable
        testID="role-switcher-context-pill"
        accessibilityRole="button"
        accessibilityLabel={t("roleSwitcher.currentRoleAccessibility", { role: roleLabel })}
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
            <Text style={[styles.sheetTitle, { color: palette.text.primary }]}>
              {t("roleSwitcher.title")}
            </Text>
            <Text style={[styles.sheetSubtitle, { color: palette.text.secondary }]}>
              {t("roleSwitcher.subtitle")}
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
                    title={`${combo.orgName} · ${getRoleLabel(combo.role, t)}`}
                    subtitle={
                      selected
                        ? t("roleSwitcher.currentWorkspace")
                        : t("roleSwitcher.switchToWorkspace")
                    }
                    leading={
                      <IconBubble
                        icon={selected ? "checkmark-circle-outline" : "business-outline"}
                        tone={selected ? "blue" : "neutral"}
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
                        {busy
                          ? t("roleSwitcher.switching")
                          : selected
                            ? t("roleSwitcher.active")
                            : t("roleSwitcher.use")}
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
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    flexShrink: 1,
    gap: 6,
    maxWidth: 132,
    minHeight: 36,
    minWidth: 0,
    paddingLeft: 7,
    paddingRight: 8,
    paddingVertical: 3,
  },
  contextRoleIcon: {
    alignItems: "center",
    borderRadius: 8,
    height: 22,
    justifyContent: "center",
    overflow: "hidden",
    width: 22,
  },
  contextCopy: {
    alignItems: "flex-start",
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  contextName: {
    ...typography.navLabel,
    lineHeight: 14,
    fontFamily: "Inter_700Bold",
    flexShrink: 1,
    minWidth: 0,
    textAlign: "left",
    width: "100%",
  },
  contextChevron: {
    flexShrink: 0,
    marginLeft: -2,
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
    ...typography.button,
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
    ...typography.small,
    fontFamily: "Inter_700Bold",
  },
  switchText: {
    ...typography.small,
    fontFamily: "Inter_700Bold",
  },
});
