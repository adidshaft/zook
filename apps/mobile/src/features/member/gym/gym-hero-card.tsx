import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import type { ImageSourcePropType } from "react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Card, Pill } from "@/components/primitives";
import { formatInitials } from "@/lib/formatting";
import { fixedSurfaces, typography, useTheme } from "@/lib/theme";

type GymHeroBrand = {
  initial: string;
  soft: string;
  solid: string;
};

type GymHeroCardProps = {
  activeMembershipLabel?: string | null;
  approvedJoinRequestLabel?: string | null;
  backLabel: string;
  coverImageSource: ImageSourcePropType | { uri: string } | null;
  effectiveReferral?: string | null;
  gymBrand: GymHeroBrand;
  gymName: string;
  identityTitle: string;
  joinModePill?: string | null;
  joinModeTone: React.ComponentProps<typeof Pill>["tone"];
  leadPlanPriceLabel?: string | null;
  localityLabel?: string | null;
  logoImageUrl?: string | null;
  openingHoursSummary?: string | null;
  pendingJoinRequestLabel?: string | null;
  referralAppliedLabel: string;
  shareLabel: string;
  showLogoImage: boolean;
  tagline: string;
  viewerHasActiveMembership: boolean;
  onBack: () => void;
  onLogoError: () => void;
  onShare: () => void;
};

export function GymHeroCard({
  activeMembershipLabel,
  approvedJoinRequestLabel,
  backLabel,
  coverImageSource,
  effectiveReferral,
  gymBrand,
  gymName,
  identityTitle,
  joinModePill,
  joinModeTone,
  leadPlanPriceLabel,
  localityLabel,
  logoImageUrl,
  openingHoursSummary,
  pendingJoinRequestLabel,
  referralAppliedLabel,
  shareLabel,
  showLogoImage,
  tagline,
  viewerHasActiveMembership,
  onBack,
  onLogoError,
  onShare,
}: GymHeroCardProps) {
  const { palette } = useTheme();

  return (
    <Card contentStyle={styles.heroCard}>
      <View style={styles.coverShell}>
        <View
          style={[
            styles.coverPlaceholder,
            !coverImageSource ? styles.coverPlaceholderFallback : null,
            {
              backgroundColor: coverImageSource ? palette.surface.raised : gymBrand.soft,
              borderColor: palette.border.default,
            },
          ]}
        >
          {coverImageSource ? (
            <Image
              source={coverImageSource}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              cachePolicy="memory-disk"
              recyclingKey={typeof coverImageSource === "object" && "uri" in coverImageSource ? coverImageSource.uri : undefined}
              transition={150}
            />
          ) : (
            <Text style={[styles.coverFallbackInitial, { color: gymBrand.solid }]}>
              {formatInitials(gymName, gymBrand.initial)}
            </Text>
          )}
          <View style={styles.coverTint} />
          <View style={styles.coverActionRow}>
            <Pressable
              onPress={onBack}
              accessibilityRole="button"
              accessibilityLabel={backLabel}
              style={({ pressed }) => [
                styles.coverIconButton,
                pressed ? styles.iconButtonPressed : null,
              ]}
            >
              <Ionicons name="chevron-back" size={22} color={fixedSurfaces.onImagePrimary} />
            </Pressable>
            <Pressable
              onPress={onShare}
              accessibilityRole="button"
              accessibilityLabel={shareLabel}
              style={({ pressed }) => [
                styles.coverIconButton,
                pressed ? styles.iconButtonPressed : null,
              ]}
            >
              <Ionicons name="share-outline" size={21} color={fixedSurfaces.onImagePrimary} />
            </Pressable>
          </View>
          <View style={styles.coverTextStack}>
            <View style={styles.coverIdentityRow}>
              <View
                style={[
                  styles.gymLogoOverlay,
                  {
                    backgroundColor: palette.accent.base,
                    borderColor: "rgba(255,255,255,0.72)",
                  },
                ]}
              >
                {showLogoImage && logoImageUrl ? (
                  <Image
                    source={{ uri: logoImageUrl }}
                    style={styles.gymLogoImage}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    recyclingKey={logoImageUrl}
                    transition={150}
                    onError={onLogoError}
                  />
                ) : (
                  <Text style={[styles.gymLogoFallbackText, { color: palette.text.onAccent }]}>
                    {formatInitials(gymName, gymBrand.initial)}
                  </Text>
                )}
              </View>
              <View style={styles.coverIdentityCopy}>
                <Text numberOfLines={3} style={[styles.coverTitle, styles.coverTextOnImage]}>
                  {identityTitle}
                </Text>
                {localityLabel ? (
                  <Text
                    numberOfLines={1}
                    style={[styles.coverSubtitle, styles.coverTextOnImage]}
                  >
                    {localityLabel}
                  </Text>
                ) : null}
              </View>
            </View>
            <Text numberOfLines={2} style={[styles.coverEyebrow, styles.coverTextOnImage]}>
              {tagline}
            </Text>
            <View style={styles.coverMetaRow}>
              {!viewerHasActiveMembership && joinModePill ? (
                <Pill tone={joinModeTone}>{joinModePill}</Pill>
              ) : null}
              {!viewerHasActiveMembership && leadPlanPriceLabel ? (
                <Pill>{leadPlanPriceLabel}</Pill>
              ) : null}
            </View>
          </View>
          {openingHoursSummary ? (
            <Text style={[styles.coverBody, styles.coverTextOnImage]} numberOfLines={1}>
              {openingHoursSummary}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.viewerStateStack}>
        {effectiveReferral && !viewerHasActiveMembership ? (
          <Pill tone="blue">{`${referralAppliedLabel}: ${effectiveReferral}`}</Pill>
        ) : null}
        {activeMembershipLabel ? <Pill tone="blue">{activeMembershipLabel}</Pill> : null}
        {pendingJoinRequestLabel ? <Pill tone="amber">{pendingJoinRequestLabel}</Pill> : null}
        {approvedJoinRequestLabel ? <Pill tone="lime">{approvedJoinRequestLabel}</Pill> : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    gap: 10,
  },
  coverShell: {
    position: "relative",
  },
  coverPlaceholder: {
    minHeight: 220,
    borderRadius: 22,
    padding: 16,
    paddingTop: 62,
    borderWidth: 1,
    overflow: "hidden",
    gap: 10,
    justifyContent: "flex-end",
  },
  coverPlaceholderFallback: {
    minHeight: 156,
  },
  coverFallbackInitial: {
    position: "absolute",
    right: 20,
    top: 18,
    ...typography.timer,
    fontWeight: "900",
    letterSpacing: 0,
    opacity: 0.56,
  },
  coverTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.42)",
  },
  coverActionRow: {
    position: "absolute",
    left: 14,
    right: 14,
    top: 14,
    zIndex: 2,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  coverIconButton: {
    width: 42,
    height: 42,
    borderRadius: 15,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.28)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.34)",
  },
  iconButtonPressed: {
    opacity: 0.84,
    transform: [{ scale: 0.985 }],
  },
  gymLogoOverlay: {
    width: 54,
    height: 54,
    borderRadius: 19,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  gymLogoImage: {
    width: "100%",
    height: "100%",
  },
  gymLogoFallbackText: {
    ...typography.headerTitle,
  },
  coverIdentityRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    maxWidth: "100%",
  },
  coverIdentityCopy: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  coverTitle: {
    ...typography.screenTitle,
    letterSpacing: 0,
  },
  coverSubtitle: {
    ...typography.body,
  },
  coverEyebrow: {
    ...typography.eyebrow,
  },
  coverTextStack: {
    alignSelf: "stretch",
    backgroundColor: "transparent",
    borderRadius: 0,
    gap: 8,
    maxWidth: "100%",
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  coverMetaRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  coverBody: {
    ...typography.body,
  },
  coverTextOnImage: {
    color: fixedSurfaces.onImagePrimary,
    textShadowColor: "rgba(0,0,0,0.55)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  viewerStateStack: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
});
