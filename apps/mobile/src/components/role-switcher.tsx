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
import { legacyColors, layout, spacing, typography } from "@/lib/theme";
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
      >
        <View style={styles.interactiveChip}>
          {chip}
          <Ionicons name="chevron-down" size={15} color={legacyColors.lime} />
        </View>
      </Pressable>
      <BottomSheetModal
        ref={sheetRef}
        backdropComponent={renderBackdrop}
        bottomInset={insets.bottom}
        enablePanDownToClose
        snapPoints={["CONTENT_HEIGHT"]}
      >
        <BottomSheetView style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Switch role</Text>
            <Text style={styles.sheetSubtitle}>Choose the gym and role for this workspace.</Text>
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
                    selected ? styles.optionSelected : null,
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
                      <Text style={selected ? styles.currentText : styles.switchText}>
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
  interactiveChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  sheet: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  sheetHeader: {
    gap: 4,
  },
  sheetTitle: {
    ...typography.sectionTitle,
    color: legacyColors.text,
  },
  sheetSubtitle: {
    color: legacyColors.muted,
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
    borderColor: legacyColors.lime,
  },
  optionPressed: {
    opacity: 0.84,
  },
  currentText: {
    color: legacyColors.lime,
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  switchText: {
    color: legacyColors.muted,
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
});
