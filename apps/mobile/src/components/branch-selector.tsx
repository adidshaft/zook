import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useRef } from "react";
import { Linking, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from "@/components/expo-safe-bottom-sheet";
import { GymBrandMark } from "@/components/gym-brand-mark";
import { normalizeWebUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useBranchSelection } from "@/lib/branch-selection";
import { formatBranchName, formatGymHeaderIdentity } from "@/lib/formatting";
import { gymBrandColor } from "@/lib/gym-brand";
import { useI18n } from "@/lib/i18n";
import { spacing, typography, useTheme } from "@/lib/theme";

function compactBranchLabel(orgName: string | null | undefined, branchName: string) {
  const formatted =
    formatBranchName(orgName ?? null, branchName, {
      collapseOrgMatch: true,
      fallback: branchName,
    }) ?? branchName;
  const orgLead = orgName?.trim().split(/\s+/)[0]?.toLowerCase();
  if (orgLead && formatted.toLowerCase().startsWith(`${orgLead} `)) {
    return formatted.slice(orgLead.length).trim();
  }
  return formatted;
}

function toCoordinate(value: unknown) {
  const coordinate = typeof value === "number" ? value : Number(value);
  return Number.isFinite(coordinate) ? coordinate : null;
}

function branchMapUrl(branch: {
  name?: string | null;
  address?: string | null;
  city?: string | null;
  googleMapsUrl?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
}) {
  const providedMapsUrl = normalizeWebUrl(branch.googleMapsUrl);
  if (providedMapsUrl) {
    return providedMapsUrl;
  }
  const latitude = toCoordinate(branch.latitude);
  const longitude = toCoordinate(branch.longitude);
  if (latitude != null && longitude != null) {
    return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
  }
  const query = [branch.name, branch.address, branch.city].filter(Boolean).join(", ");
  return query ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : null;
}

export function BranchSelectorChip({
  compactTitle = false,
  style,
  variant = "stacked",
}: {
  compactTitle?: boolean;
  style?: StyleProp<ViewStyle>;
  variant?: "stacked" | "inline" | "header";
} = {}) {
  const { branches, selectedBranch, selectBranch } = useBranchSelection();
  const { session, activeOrgId, switchOrg } = useAuth();
  const { t } = useI18n();
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  const sheetRef = useRef<BottomSheetModal>(null);
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

  if (!selectedBranch) {
    return null;
  }

  const selectedBranchId = selectedBranch.id;
  const activeOrganization =
    session?.organizations.find((organization) => organization.orgId === activeOrgId) ??
    session?.activeOrganization ??
    null;
  const organizations = session?.organizations ?? [];
  const canSwitchGym = organizations.length > 1;
  const canSwitchBranch = branches.length > 1;
  const identity = formatGymHeaderIdentity({
    address: selectedBranch.address,
    branchName: selectedBranch.name,
    city: selectedBranch.city,
    orgCity: activeOrganization?.city,
    orgName: activeOrganization?.name,
  });
  const displayTitle = identity.title;
  const brand = gymBrandColor(activeOrganization?.name ?? identity.title);
  const logoUrl = activeOrganization?.logoUrl;
  const selectedMapUrl = branchMapUrl(selectedBranch);
  function openBranchMenu() {
    void Haptics.selectionAsync();
    sheetRef.current?.present();
  }

  return (
    <>
      <Pressable
        onPress={openBranchMenu}
        accessibilityRole="button"
        accessibilityLabel={
          identity.subtitle
            ? `${t("branch.switch")}: ${identity.title}, ${identity.subtitle}`
            : `${t("branch.switch")}: ${identity.title}`
        }
        hitSlop={8}
        style={({ pressed }) => [
          variant === "inline"
            ? styles.selectorInline
            : variant === "header"
              ? styles.selectorHeader
              : styles.selectorChip,
          {
            borderColor: palette.border.subtle,
            backgroundColor: variant === "inline" ? "transparent" : palette.surface.default,
          },
          pressed ? styles.pressed : null,
          style,
          variant === "inline"
            ? styles.selectorInlineReadable
            : variant === "header"
              ? styles.selectorHeaderReadable
              : styles.selectorReadable,
        ]}
      >
        <GymBrandMark
          brand={brand}
          logoUrl={logoUrl}
          size={variant === "inline" || variant === "header" ? "compact" : "regular"}
        />
        {variant === "inline" ? (
          <View style={styles.selectorInlineCopy}>
            <Text
              numberOfLines={compactTitle ? 1 : 2}
              ellipsizeMode="tail"
              adjustsFontSizeToFit={compactTitle}
              minimumFontScale={0.88}
              style={[styles.selectorInlineTitle, { color: palette.text.primary }]}
            >
              {displayTitle}
            </Text>
            {identity.subtitle ? (
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                adjustsFontSizeToFit
                minimumFontScale={0.9}
                style={[styles.selectorInlineMeta, { color: palette.text.secondary }]}
              >
                {identity.subtitle}
              </Text>
            ) : null}
          </View>
        ) : (
          <View style={styles.selectorCopy}>
            <Text
              numberOfLines={compactTitle ? 1 : 2}
              ellipsizeMode="tail"
              adjustsFontSizeToFit={compactTitle}
              minimumFontScale={0.88}
              style={[styles.selectorText, { color: palette.text.primary }]}
            >
              {displayTitle}
            </Text>
            {identity.subtitle ? (
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                adjustsFontSizeToFit
                minimumFontScale={0.9}
                style={[styles.selectorMeta, { color: palette.text.secondary }]}
              >
                {identity.subtitle}
              </Text>
            ) : null}
          </View>
        )}
        <Ionicons
          name="chevron-down"
          size={variant === "inline" ? 12 : 13}
          color={palette.text.secondary}
        />
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
            <GymBrandMark brand={brand} logoUrl={logoUrl} size="sheet" />
            <View style={styles.sheetHeaderCopy}>
              <Text
                style={[styles.sheetTitle, { color: palette.text.primary }]}
                numberOfLines={2}
                adjustsFontSizeToFit
                minimumFontScale={0.9}
              >
                {identity.title}
              </Text>
              <Text
                style={[styles.sheetSubtitle, { color: palette.text.secondary }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.9}
              >
                {identity.subtitle ?? t(canSwitchGym ? "branch.switchGym" : "branch.switch")}
              </Text>
            </View>
          </View>
          {selectedMapUrl ? (
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={t("branch.openMap")}
              onPress={() => {
                void Linking.openURL(selectedMapUrl);
              }}
              style={({ pressed }) => [
                styles.mapAction,
                {
                  backgroundColor: palette.bg.sunken,
                  borderColor: palette.border.subtle,
                },
                pressed ? styles.pressed : null,
              ]}
            >
              <View style={styles.mapActionIcon}>
                <Ionicons name="navigate-outline" size={16} color={palette.text.primary} />
              </View>
              <View style={styles.mapActionCopy}>
                <Text style={[styles.mapActionTitle, { color: palette.text.primary }]}>
                  {t("branch.openMap")}
                </Text>
                <Text
                  style={[styles.mapActionSubtitle, { color: palette.text.secondary }]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {identity.subtitle ?? selectedBranch.name}
                </Text>
              </View>
              <Ionicons name="open-outline" size={16} color={palette.text.secondary} />
            </Pressable>
          ) : null}
          {canSwitchGym ? (
            <View style={styles.sheetSection}>
              <Text style={[styles.sheetLabel, { color: palette.text.tertiary }]}>
                {t("branch.manageGym")}
              </Text>
              <View style={styles.optionStack}>
                {organizations.map((organization) => {
                  const selected = organization.orgId === activeOrgId;
                  const optionBrand = gymBrandColor(organization.name);
                  const location = selected
                    ? identity.subtitle
                    : [organization.city].filter(Boolean).join(", ");
                  return (
                    <Pressable
                      key={organization.orgId}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      accessibilityLabel={
                        location
                          ? `${organization.name}, ${location}, ${selected ? t("branch.currentGym") : t("branch.useGym")}`
                          : `${organization.name}, ${selected ? t("branch.currentGym") : t("branch.useGym")}`
                      }
                      onPress={() => {
                        if (selected) return;
                        sheetRef.current?.dismiss();
                        void switchOrg(organization.orgId);
                      }}
                      style={({ pressed }) => [
                        styles.sheetOption,
                        {
                          backgroundColor: selected
                            ? palette.surface.accentSoft
                            : palette.surface.default,
                          borderColor: selected ? palette.border.focus : palette.border.subtle,
                        },
                        pressed ? styles.pressed : null,
                      ]}
                    >
                      <GymBrandMark brand={optionBrand} logoUrl={organization.logoUrl} size="option" />
                      <View style={styles.optionCopy}>
                        <Text
                          style={[styles.optionTitle, { color: palette.text.primary }]}
                          numberOfLines={2}
                          ellipsizeMode="tail"
                        >
                          {organization.name}
                        </Text>
                        {location ? (
                          <Text
                            style={[styles.optionMeta, { color: palette.text.secondary }]}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                          >
                            {location}
                          </Text>
                        ) : null}
                      </View>
                      <View
                        style={[
                          styles.optionAction,
                          {
                            backgroundColor: selected ? palette.accent.base : palette.bg.sunken,
                            borderColor: selected ? palette.accent.base : palette.border.subtle,
                          },
                        ]}
                      >
                        <Ionicons
                          name={selected ? "checkmark" : "chevron-forward"}
                          size={15}
                          color={selected ? palette.text.onAccent : palette.text.secondary}
                        />
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}

          <View
            style={[
              styles.scopeNote,
              {
                backgroundColor: palette.bg.sunken,
                borderColor: palette.border.subtle,
              },
            ]}
          >
            <Ionicons name="card-outline" size={14} color={palette.text.secondary} />
            <Text style={[styles.scopeNoteText, { color: palette.text.secondary }]} numberOfLines={3}>
              {t("branch.gymSubscriptionScope")}
            </Text>
          </View>

          {canSwitchBranch ? (
            <View style={styles.sheetSection}>
              <Text style={[styles.sheetLabel, { color: palette.text.tertiary }]}>
                {t("branch.branches")}
              </Text>
              <View style={styles.optionStack}>
                {branches.map((branch) => {
                  const selected = branch.id === selectedBranchId;
                  const branchMapsUrl = branchMapUrl(branch);
                  const label = compactBranchLabel(activeOrganization?.name, branch.name);
                  const branchIdentity = formatGymHeaderIdentity({
                    address: branch.address,
                    branchName: branch.name,
                    city: branch.city,
                    orgCity: activeOrganization?.city,
                    orgName: activeOrganization?.name,
                  });
                  return (
                    <Pressable
                      key={branch.id}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      accessibilityLabel={
                        branchIdentity.subtitle
                          ? `${label}, ${branchIdentity.subtitle}, ${selected ? t("branch.current") : t("branch.useBranch")}`
                          : `${label}, ${selected ? t("branch.current") : t("branch.useBranch")}`
                      }
                      onPress={() => {
                        if (selected) return;
                        sheetRef.current?.dismiss();
                        void selectBranch(branch.id);
                      }}
                      style={({ pressed }) => [
                        styles.sheetOption,
                        {
                          backgroundColor: selected
                            ? palette.surface.accentSoft
                            : palette.surface.default,
                          borderColor: selected ? palette.border.focus : palette.border.subtle,
                        },
                        pressed ? styles.pressed : null,
                      ]}
                    >
                      <GymBrandMark brand={brand} logoUrl={logoUrl} size="option" />
                      <View style={styles.optionCopy}>
                        <Text
                          style={[styles.optionTitle, { color: palette.text.primary }]}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {label}
                        </Text>
                        {branchIdentity.subtitle ? (
                          <Text
                            style={[styles.optionMeta, { color: palette.text.secondary }]}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                          >
                            {branchIdentity.subtitle}
                          </Text>
                        ) : null}
                      </View>
                      <View
                        accessibilityLabel={
                          branchMapsUrl ? t("branch.mapReady") : t("branch.mapMissing")
                        }
                        style={[
                          styles.optionStatus,
                          {
                            backgroundColor: branchMapsUrl
                              ? palette.surface.accentSoft
                              : palette.surface.warningSoft,
                            borderColor: branchMapsUrl
                              ? palette.border.focus
                              : palette.feedback.warning,
                          },
                        ]}
                      >
                        <Ionicons
                          name={branchMapsUrl ? "navigate-outline" : "alert-circle-outline"}
                          size={13}
                          color={branchMapsUrl ? palette.accent.base : palette.feedback.warning}
                        />
                      </View>
                      <View
                        style={[
                          styles.optionAction,
                          {
                            backgroundColor: selected ? palette.accent.base : palette.bg.sunken,
                            borderColor: selected ? palette.accent.base : palette.border.subtle,
                          },
                        ]}
                      >
                        <Ionicons
                          name={selected ? "checkmark" : "chevron-forward"}
                          size={15}
                          color={selected ? palette.text.onAccent : palette.text.secondary}
                        />
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}
        </BottomSheetView>
      </BottomSheetModal>
    </>
  );
}

const styles = StyleSheet.create({
  selectorChip: {
    minHeight: 36,
    maxWidth: "100%",
    minWidth: 0,
    alignSelf: "flex-start",
    borderRadius: 14,
    borderWidth: 1,
    flexShrink: 1,
    paddingLeft: 5,
    paddingRight: 7,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  selectorReadable: {
    width: "100%",
  },
  selectorInline: {
    alignSelf: "flex-start",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    maxWidth: "100%",
    minWidth: 0,
    minHeight: 40,
    paddingLeft: 8,
    paddingRight: 7,
    paddingVertical: 5,
  },
  selectorInlineReadable: {
    flexGrow: 1,
    minWidth: 176,
    width: "100%",
  },
  selectorHeader: {
    alignSelf: "flex-start",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    maxWidth: "100%",
    minHeight: 36,
    minWidth: 0,
    paddingLeft: 6,
    paddingRight: 7,
    paddingVertical: 4,
  },
  selectorHeaderReadable: {
    flexGrow: 1,
    minWidth: 168,
    width: "100%",
  },
  selectorInlineCopy: {
    alignItems: "flex-start",
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    gap: 1,
  },
  selectorInlineTitle: {
    ...typography.navLabel,
    lineHeight: 14,
    flexShrink: 1,
    minWidth: 0,
    textAlign: "left",
    width: "100%",
  },
  selectorInlineMeta: {
    ...typography.eyebrow,
    lineHeight: 11.5,
    flexShrink: 1,
    minWidth: 0,
    textAlign: "left",
    width: "100%",
  },
  selectorCopy: {
    alignItems: "flex-start",
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  selectorText: {
    ...typography.caption,
    lineHeight: 15,
    flexShrink: 1,
    minWidth: 0,
    textAlign: "left",
    width: "100%",
  },
  selectorMeta: {
    ...typography.eyebrow,
    lineHeight: 11.5,
    flexShrink: 1,
    minWidth: 0,
    textAlign: "left",
    width: "100%",
  },
  sheetBackground: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  sheetHandle: {
    width: 42,
  },
  sheet: {
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  sheetHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  sheetHeaderCopy: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  sheetTitle: {
    ...typography.cardTitle,
  },
  sheetSubtitle: {
    ...typography.small,
  },
  mapAction: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 50,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  mapActionIcon: {
    alignItems: "center",
    borderRadius: 12,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  mapActionCopy: {
    flex: 1,
    minWidth: 0,
  },
  mapActionTitle: {
    ...typography.small,
    lineHeight: 16,
  },
  mapActionSubtitle: {
    ...typography.small,
  },
  sheetSection: {
    gap: spacing.xs,
  },
  sheetLabel: {
    ...typography.navLabel,
    paddingHorizontal: 2,
  },
  scopeNote: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 7,
    marginBottom: 2,
    minHeight: 40,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  scopeNoteText: {
    ...typography.small,
    flex: 1,
    minWidth: 0,
  },
  optionStack: {
    gap: spacing.xs,
  },
  sheetOption: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 64,
    paddingHorizontal: spacing.sm,
    paddingVertical: 9,
  },
  optionCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  optionTitle: {
    ...typography.button,
    lineHeight: 17,
  },
  optionMeta: {
    ...typography.small,
  },
  optionStatus: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
    maxWidth: 96,
    minWidth: 0,
  },
  optionAction: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    flexShrink: 0,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
});
