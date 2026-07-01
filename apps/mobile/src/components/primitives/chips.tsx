import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  Pressable,
  Linking,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from "@/components/expo-safe-bottom-sheet";
import { normalizeWebUrl } from "@/lib/api";
import { useBranchSelection } from "@/lib/branch-selection";
import { useAuth } from "@/lib/auth";
import { formatBranchName, formatGymHeaderIdentity } from "@/lib/formatting";
import { gymBrandColor, seededGymLogoDataUri } from "@/lib/gym-brand";
import { useI18n } from "@/lib/i18n";
import { spacing, radii, typography, useTheme } from "@/lib/theme";
import { useTonePalette, type PillTone } from "./tone-palette";
export type { PillTone } from "./tone-palette";

type IconName = keyof typeof Ionicons.glyphMap;

function pressWithLightHaptic(callback?: () => void) {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  try {
    callback?.();
  } catch (error) {
    console.error("Zook chip action failed", error);
  }
}

export function ZookChip({
  children,
  tone = "neutral",
  icon,
  onPress,
  accessibilityLabel,
  style,
  textStyle,
}: {
  children: ReactNode;
  tone?: PillTone;
  icon?: IconName;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}) {
  const { palette: themePalette } = useTheme();
  const palette = useTonePalette(tone);
  const resolvedAccessibilityLabel =
    accessibilityLabel ?? (typeof children === "string" ? children : undefined);
  const chip = (
    <View
      accessibilityLabel={!onPress ? resolvedAccessibilityLabel : undefined}
      accessible={!onPress && Boolean(resolvedAccessibilityLabel)}
      style={[
        styles.chip,
        {
          borderColor: palette.borderColor,
          backgroundColor: palette.backgroundColor,
        },
        style,
      ]}
    >
      {icon ? <Ionicons name={icon} size={13} color={palette.color} /> : null}
      <Text
        numberOfLines={1}
        ellipsizeMode="tail"
        style={[styles.chipText, { color: palette.color }, textStyle]}
      >
        {children}
      </Text>
    </View>
  );

  if (!onPress) return chip;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={resolvedAccessibilityLabel}
      android_ripple={{ color: themePalette.border.default, borderless: false }}
      onPress={() => pressWithLightHaptic(onPress)}
      style={({ pressed }) => [styles.chipPressable, pressed ? styles.pressed : null]}
    >
      {chip}
    </Pressable>
  );
}

export function Pill(props: Parameters<typeof ZookChip>[0]) {
  return <ZookChip {...props} />;
}

export function normalizePillTone(tone?: PillTone | "danger" | null): PillTone {
  return tone === "danger" ? "red" : (tone ?? "neutral");
}

export function toneForStatusLabel(status: string): PillTone {
  const normalized = status.toLowerCase().replace(/[_-]+/g, " ");
  if (
    normalized.includes("approved") ||
    normalized.includes("active") ||
    normalized.includes("assigned") ||
    normalized.includes("in stock")
  ) {
    return "lime";
  }
  if (
    normalized.includes("pending") ||
    normalized.includes("review") ||
    normalized.includes("desk") ||
    normalized.includes("expiring") ||
    normalized.includes("past due") ||
    normalized.includes("low")
  ) {
    return "amber";
  }
  if (
    normalized.includes("expired") ||
    normalized.includes("flagged") ||
    normalized.includes("failed") ||
    normalized.includes("suspended") ||
    normalized.includes("cancelled") ||
    normalized.includes("canceled")
  ) {
    return "red";
  }
  return "neutral";
}

type StatusChipProps = Omit<Parameters<typeof ZookChip>[0], "children"> & {
  status?: string;
  children?: ReactNode;
};

export function StatusChip({ status, children, tone, ...props }: StatusChipProps) {
  const label = status ?? children;
  const resolvedTone = tone ?? (typeof label === "string" ? toneForStatusLabel(label) : "neutral");
  return (
    <ZookChip {...props} tone={resolvedTone}>
      {label}
    </ZookChip>
  );
}

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

function GymBrandMark({
  brand,
  logoUrl,
  size = "compact",
}: {
  brand: ReturnType<typeof gymBrandColor>;
  logoUrl?: string | null;
  size?: "compact" | "regular" | "sheet" | "option";
}) {
  const [didFail, setDidFail] = useState(false);
  const normalizedLogoUrl = seededGymLogoDataUri(logoUrl) ?? normalizeWebUrl(logoUrl);
  const markStyle =
    size === "sheet"
      ? styles.branchSheetBrand
      : size === "option"
        ? styles.branchOptionMark
        : size === "regular"
          ? styles.branchBrandMark
          : styles.branchBrandDot;
  const imageStyle =
    size === "sheet"
      ? styles.branchSheetLogo
      : size === "option"
        ? styles.branchOptionLogo
        : size === "regular"
          ? styles.branchBrandLogo
          : styles.branchBrandDotLogo;
  const initialStyle =
    size === "sheet"
      ? styles.branchSheetInitial
      : size === "option"
        ? styles.branchOptionInitial
        : size === "regular"
          ? styles.branchBrandInitial
          : styles.branchBrandDotInitial;

  useEffect(() => {
    setDidFail(false);
  }, [normalizedLogoUrl]);

  if (normalizedLogoUrl && !didFail) {
    return (
      <View
        style={[
          markStyle,
          {
            backgroundColor: brand.soft,
          },
        ]}
      >
        <Image
          source={{ uri: normalizedLogoUrl }}
          style={imageStyle}
          contentFit="cover"
          transition={100}
          onError={() => setDidFail(true)}
        />
      </View>
    );
  }

  return (
    <View style={[markStyle, { backgroundColor: brand.soft }]}>
      <Text style={[initialStyle, { color: brand.solid }]}>{brand.initial}</Text>
    </View>
  );
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
  const showGymOptions = canSwitchGym;
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
            ? styles.branchSelectorInline
            : variant === "header"
              ? styles.branchSelectorHeader
              : styles.branchSelectorChip,
          {
            borderColor: palette.border.subtle,
            backgroundColor: variant === "inline" ? "transparent" : palette.surface.default,
          },
          pressed ? styles.pressed : null,
          style,
          variant === "inline"
            ? styles.branchSelectorInlineReadable
            : variant === "header"
              ? styles.branchSelectorHeaderReadable
              : styles.branchSelectorReadable,
        ]}
      >
        <GymBrandMark
          brand={brand}
          logoUrl={logoUrl}
          size={variant === "inline" || variant === "header" ? "compact" : "regular"}
        />
        {variant === "inline" ? (
          <View style={styles.branchSelectorInlineCopy}>
            <Text
              numberOfLines={compactTitle ? 1 : 2}
              ellipsizeMode="tail"
              adjustsFontSizeToFit={compactTitle}
              minimumFontScale={0.88}
              style={[styles.branchSelectorInlineTitle, { color: palette.text.primary }]}
            >
              {displayTitle}
            </Text>
            {identity.subtitle ? (
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                adjustsFontSizeToFit
                minimumFontScale={0.9}
                style={[styles.branchSelectorInlineMeta, { color: palette.text.secondary }]}
              >
                {identity.subtitle}
              </Text>
            ) : null}
          </View>
        ) : (
          <View style={styles.branchSelectorCopy}>
            <Text
              numberOfLines={compactTitle ? 1 : 2}
              ellipsizeMode="tail"
              adjustsFontSizeToFit={compactTitle}
              minimumFontScale={0.88}
              style={[styles.branchSelectorText, { color: palette.text.primary }]}
            >
              {displayTitle}
            </Text>
            {identity.subtitle ? (
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                adjustsFontSizeToFit
                minimumFontScale={0.9}
                style={[styles.branchSelectorMeta, { color: palette.text.secondary }]}
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
        backgroundStyle={styles.branchSheetBackground}
        handleIndicatorStyle={StyleSheet.flatten([
          styles.branchSheetHandle,
          { backgroundColor: palette.border.strong },
        ])}
        snapPoints={["CONTENT_HEIGHT"]}
      >
        <BottomSheetView style={styles.branchSheet}>
          <View style={styles.branchSheetHeader}>
            <GymBrandMark brand={brand} logoUrl={logoUrl} size="sheet" />
            <View style={styles.branchSheetHeaderCopy}>
              <Text
                style={[styles.branchSheetTitle, { color: palette.text.primary }]}
                numberOfLines={2}
                adjustsFontSizeToFit
                minimumFontScale={0.9}
              >
                {identity.title}
              </Text>
              <Text
                style={[styles.branchSheetSubtitle, { color: palette.text.secondary }]}
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
                styles.branchMapAction,
                {
                  backgroundColor: palette.bg.sunken,
                  borderColor: palette.border.subtle,
                },
                pressed ? styles.pressed : null,
              ]}
            >
              <View style={styles.branchMapActionIcon}>
                <Ionicons name="navigate-outline" size={16} color={palette.text.primary} />
              </View>
              <View style={styles.branchMapActionCopy}>
                <Text style={[styles.branchMapActionTitle, { color: palette.text.primary }]}>
                  {t("branch.openMap")}
                </Text>
                <Text
                  style={[styles.branchMapActionSubtitle, { color: palette.text.secondary }]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {identity.subtitle ?? selectedBranch.name}
                </Text>
              </View>
              <Ionicons name="open-outline" size={16} color={palette.text.secondary} />
            </Pressable>
          ) : null}
          {showGymOptions ? (
            <View style={styles.branchSheetSection}>
              <Text style={[styles.branchSheetLabel, { color: palette.text.tertiary }]}>
                {t("branch.manageGym")}
              </Text>
              <View style={styles.branchOptionStack}>
                {organizations.map((organization) => {
                  const selected = organization.orgId === activeOrgId;
                  const optionBrand = gymBrandColor(organization.name);
                  const optionLogoUrl = organization.logoUrl;
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
                        styles.branchSheetOption,
                        {
                          backgroundColor: selected
                            ? palette.surface.accentSoft
                            : palette.surface.default,
                          borderColor: selected ? palette.border.focus : palette.border.subtle,
                        },
                        pressed ? styles.pressed : null,
                      ]}
                    >
                      <GymBrandMark brand={optionBrand} logoUrl={optionLogoUrl} size="option" />
                      <View style={styles.branchOptionCopy}>
                        <Text
                          style={[styles.branchOptionTitle, { color: palette.text.primary }]}
                          numberOfLines={2}
                          ellipsizeMode="tail"
                        >
                          {organization.name}
                        </Text>
                        {location ? (
                          <Text
                            style={[styles.branchOptionMeta, { color: palette.text.secondary }]}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                          >
                            {location}
                          </Text>
                        ) : null}
                      </View>
                      <View
                        style={[
                          styles.branchOptionAction,
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
              styles.branchScopeNote,
              {
                backgroundColor: palette.bg.sunken,
                borderColor: palette.border.subtle,
              },
            ]}
          >
            <Ionicons name="card-outline" size={14} color={palette.text.secondary} />
            <Text
              style={[styles.branchScopeNoteText, { color: palette.text.secondary }]}
              numberOfLines={3}
            >
              {t("branch.gymSubscriptionScope")}
            </Text>
          </View>

          {canSwitchBranch ? (
            <View style={styles.branchSheetSection}>
              <Text style={[styles.branchSheetLabel, { color: palette.text.tertiary }]}>
                {t("branch.branches")}
              </Text>
              <View style={styles.branchOptionStack}>
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
                        styles.branchSheetOption,
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
                      <View style={styles.branchOptionCopy}>
                        <Text
                          style={[styles.branchOptionTitle, { color: palette.text.primary }]}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {label}
                        </Text>
                        {branchIdentity.subtitle ? (
                          <Text
                            style={[styles.branchOptionMeta, { color: palette.text.secondary }]}
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
                          styles.branchOptionStatus,
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
                          styles.branchOptionAction,
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
  chip: {
    alignSelf: "flex-start",
    flexShrink: 1,
    maxWidth: "100%",
    minWidth: 0,
    minHeight: 26,
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: 9,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  chipPressable: {
    minHeight: 44,
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  chipText: {
    ...typography.caption,
    flexShrink: 1,
    minWidth: 0,
  },
  branchSelectorChip: {
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
  branchSelectorReadable: {
    width: "100%",
  },
  branchSelectorInline: {
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
  branchSelectorInlineReadable: {
    flexGrow: 1,
    minWidth: 176,
    width: "100%",
  },
  branchSelectorHeader: {
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
  branchSelectorHeaderReadable: {
    flexGrow: 1,
    minWidth: 168,
    width: "100%",
  },
  branchBrandMark: {
    alignItems: "center",
    borderRadius: 9,
    height: 24,
    justifyContent: "center",
    overflow: "hidden",
    width: 24,
  },
  branchBrandLogo: {
    height: 24,
    width: 24,
  },
  branchBrandInitial: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    lineHeight: 13,
  },
  branchBrandDot: {
    alignItems: "center",
    borderRadius: 10,
    height: 20,
    justifyContent: "center",
    overflow: "hidden",
    width: 20,
  },
  branchBrandDotLogo: {
    height: 20,
    width: 20,
  },
  branchBrandDotInitial: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    lineHeight: 12,
  },
  branchSelectorInlineCopy: {
    alignItems: "flex-start",
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    gap: 1,
  },
  branchSelectorInlineTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    lineHeight: 14,
    flexShrink: 1,
    minWidth: 0,
    textAlign: "left",
    width: "100%",
  },
  branchSelectorInlineMeta: {
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    lineHeight: 11.5,
    flexShrink: 1,
    minWidth: 0,
    textAlign: "left",
    width: "100%",
  },
  branchSelectorCopy: {
    alignItems: "flex-start",
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  branchSelectorText: {
    fontFamily: "Inter_700Bold",
    fontSize: 12.5,
    lineHeight: 15,
    flexShrink: 1,
    minWidth: 0,
    textAlign: "left",
    width: "100%",
  },
  branchSelectorMeta: {
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    lineHeight: 11.5,
    flexShrink: 1,
    minWidth: 0,
    textAlign: "left",
    width: "100%",
  },
  branchSheetBackground: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  branchSheetHandle: {
    width: 42,
  },
  branchSheet: {
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  branchSheetHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  branchSheetBrand: {
    alignItems: "center",
    borderRadius: 18,
    height: 48,
    justifyContent: "center",
    overflow: "hidden",
    width: 48,
  },
  branchSheetLogo: {
    height: 48,
    width: 48,
  },
  branchSheetInitial: {
    fontFamily: "Inter_800ExtraBold",
    fontSize: 18,
    lineHeight: 22,
  },
  branchSheetHeaderCopy: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  branchSheetTitle: {
    ...typography.cardTitle,
  },
  branchSheetSubtitle: {
    ...typography.small,
  },
  branchMapAction: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 50,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  branchMapActionIcon: {
    alignItems: "center",
    borderRadius: 12,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  branchMapActionCopy: {
    flex: 1,
    minWidth: 0,
  },
  branchMapActionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    lineHeight: 16,
  },
  branchMapActionSubtitle: {
    ...typography.small,
  },
  branchSheetSection: {
    gap: spacing.xs,
  },
  branchSheetLabel: {
    ...typography.navLabel,
    paddingHorizontal: 2,
  },
  branchScopeNote: {
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
  branchScopeNoteText: {
    ...typography.small,
    flex: 1,
    minWidth: 0,
  },
  branchOptionStack: {
    gap: spacing.xs,
  },
  branchSheetOption: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 64,
    paddingHorizontal: spacing.sm,
    paddingVertical: 9,
  },
  branchOptionMark: {
    alignItems: "center",
    borderRadius: 14,
    height: 38,
    justifyContent: "center",
    overflow: "hidden",
    width: 38,
  },
  branchOptionLogo: {
    height: 38,
    width: 38,
  },
  branchOptionInitial: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    lineHeight: 17,
  },
  branchOptionCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  branchOptionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    lineHeight: 17,
  },
  branchOptionMeta: {
    ...typography.small,
  },
  branchOptionStatus: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
    maxWidth: 96,
    minWidth: 0,
  },
  branchOptionStatusText: {
    fontFamily: "Inter_700Bold",
    fontSize: 10.5,
    lineHeight: 13,
    minWidth: 0,
    flexShrink: 1,
  },
  branchOptionAction: {
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
