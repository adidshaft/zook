import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import type { ReactNode } from "react";
import type { SharedValue } from "react-native-reanimated";

import { normalizeWebUrl } from "@/lib/api";
import Reanimated, { interpolate, useAnimatedStyle } from "@/lib/reanimated-lite";
import { useReduceMotion } from "@/lib/motion";
import { materials, spacing, typography, useTheme } from "@/lib/theme";
import { gymBrandColor, seededGymLogoDataUri } from "@/lib/gym-brand";
import { useT } from "@/lib/i18n";
import { ProfileShortcut } from "./profile-shortcut";

type HeaderContext = {
  orgName: string;
  logoUrl?: string | null;
  onPress: () => void;
  roleTag?: string;
};

export function ScreenHeader({
  eyebrow,
  title,
  subtitle,
  titleAccessory,
  titleScale = "large",
  hideExpandedTitle = false,
  context,
  contextSlot,
  leading,
  trailing,
  chip,
  meta,
  scrollY,
  titleNumberOfLines = 1,
  centered = false,
  showProfileShortcut = false,
  showBack = false,
  onBack,
  style,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  titleAccessory?: ReactNode;
  titleScale?: "large" | "compact";
  hideExpandedTitle?: boolean;
  context?: HeaderContext;
  contextSlot?: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
  chip?: ReactNode;
  meta?: ReactNode;
  scrollY?: SharedValue<number>;
  titleNumberOfLines?: number;
  centered?: boolean;
  showProfileShortcut?: boolean;
  showBack?: boolean;
  onBack?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { mode, palette } = useTheme();
  const router = useRouter();
  const t = useT();
  const reduceMotion = useReduceMotion();
  const glass = materials.glassBar(mode);
  const tonal = materials.tonalBar(mode);
  let resolvedLeading = leading;
  const wantsBack = !resolvedLeading && (showBack || (!centered && router.canGoBack()));
  if (wantsBack) {
    resolvedLeading = (
      <Pressable
        onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace("/")))}
        accessibilityRole="button"
        accessibilityLabel={t("common.back")}
        hitSlop={12}
        style={({ pressed }) => [
          styles.backButton,
          {
            backgroundColor: palette.bg.elevated,
            borderColor: palette.border.default,
            opacity: pressed ? 0.8 : 1,
          },
        ]}
      >
        <Ionicons name="chevron-back" size={21} color={palette.text.primary} />
      </Pressable>
    );
  } else if (!resolvedLeading && !centered && showProfileShortcut) {
    resolvedLeading = (
      <ProfileShortcut accessibilityLabel={`${t("member.home.open")} ${t("settings.profileTitle")}`} />
    );
  }

  const titleStyle = useAnimatedStyle(() => {
    const y = scrollY?.value ?? 0;
    const progress = reduceMotion ? (y > 32 ? 1 : 0) : interpolate(Math.max(y, 0), [0, 64], [0, 1], "clamp");
    return {
      opacity: 1 - progress,
      transform: [{ translateY: reduceMotion ? 0 : -8 * progress }],
    };
  }, [reduceMotion, scrollY]);

  const compactStyle = useAnimatedStyle(() => {
    const y = scrollY?.value ?? 0;
    const progress = reduceMotion ? (y > 32 ? 1 : 0) : interpolate(Math.max(y, 0), [12, 64], [0, 1], "clamp");
    return {
      opacity: progress,
      transform: [{ translateY: reduceMotion ? 0 : -4 + 4 * progress }],
    };
  }, [reduceMotion, scrollY]);

  return (
    <View style={[styles.root, style]}>
      <Reanimated.View
        pointerEvents="none"
        style={[
          styles.compactBar,
          {
            borderBottomColor: Platform.OS === "ios" ? glass.hairline : tonal.topHairline,
            backgroundColor: Platform.OS === "ios" ? "transparent" : tonal.backgroundColor,
          },
          compactStyle,
        ]}
      >
        {Platform.OS === "ios" ? (
          <>
            <BlurView
              pointerEvents="none"
              intensity={glass.blurIntensity}
              tint={glass.blurTint}
              style={StyleSheet.absoluteFillObject}
            />
            <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { backgroundColor: glass.overlayColor }]} />
          </>
        ) : null}
        <Text numberOfLines={1} style={[styles.compactTitle, { color: palette.text.primary }]}>
          {title}
        </Text>
      </Reanimated.View>

      {resolvedLeading || contextSlot || context || trailing ? (
        <View style={[styles.utilityRow, centered ? styles.utilityRowCentered : null]}>
          {resolvedLeading ? <View style={styles.leadingSlot}>{resolvedLeading}</View> : null}
          {contextSlot || context ? (
            <View style={styles.utilityLeading}>
              {contextSlot ? contextSlot : context ? <ContextPill context={context} /> : null}
            </View>
          ) : null}
          {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
        </View>
      ) : null}
      {hideExpandedTitle ? null : (
        <Reanimated.View style={[styles.titleBlock, centered ? styles.titleBlockCentered : null, titleStyle]}>
          {chip}
          {eyebrow ? (
            <Text style={[styles.eyebrow, centered ? styles.centerText : null, { color: palette.text.tertiary }]}>
              {eyebrow}
            </Text>
          ) : null}
          <View style={styles.titleRow}>
            <Text
              numberOfLines={titleNumberOfLines}
              style={[
                styles.title,
                titleScale === "compact" ? styles.titleCompact : null,
                titleAccessory ? styles.titleWithAccessory : null,
                centered ? styles.centerText : null,
                { color: palette.text.primary },
              ]}
            >
              {title}
            </Text>
            {titleAccessory ? <View style={styles.titleAccessory}>{titleAccessory}</View> : null}
          </View>
          {subtitle ? (
            <Text
              numberOfLines={1}
              style={[styles.subtitle, centered ? styles.centerText : null, { color: palette.text.secondary }]}
            >
              {subtitle}
            </Text>
          ) : null}
          {meta ? <View style={styles.meta}>{meta}</View> : null}
        </Reanimated.View>
      )}
    </View>
  );
}

function ContextPill({ context }: { context: HeaderContext }) {
  const { palette } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Switch workspace. Current workspace: ${context.orgName}`}
      onPress={context.onPress}
      hitSlop={6}
      style={({ pressed }) => [
        styles.contextPill,
        {
          backgroundColor: palette.surface.default,
          borderColor: palette.border.subtle,
          opacity: pressed ? 0.82 : 1,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
      ]}
    >
      <GymLogoAvatar orgName={context.orgName} logoUrl={context.logoUrl} />
      <View style={styles.contextCopy}>
        <Text
          numberOfLines={1}
          ellipsizeMode="tail"
          style={[styles.contextText, { color: palette.text.primary }]}
        >
          {context.orgName}
        </Text>
        {context.roleTag ? (
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={[styles.roleTag, { color: palette.text.secondary }]}
          >
            {context.roleTag}
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-down" size={14} color={palette.text.tertiary} />
    </Pressable>
  );
}

function GymLogoAvatar({ orgName, logoUrl }: { orgName: string; logoUrl?: string | null }) {
  const [didFail, setDidFail] = useState(false);
  const normalizedLogoUrl = seededGymLogoDataUri(logoUrl) ?? normalizeWebUrl(logoUrl);
  const brand = gymBrandColor(orgName);

  useEffect(() => {
    setDidFail(false);
  }, [normalizedLogoUrl]);

  if (normalizedLogoUrl && !didFail) {
    return (
      <Image
        source={{ uri: normalizedLogoUrl }}
        style={styles.avatarImage}
        contentFit="cover"
        cachePolicy="memory-disk"
        recyclingKey={normalizedLogoUrl}
        transition={120}
        onError={() => setDidFail(true)}
      />
    );
  }

  return (
    <View style={[styles.avatar, { backgroundColor: brand.soft }]}>
      <Text style={[styles.avatarText, { color: brand.solid }]}>{brand.initial}</Text>
    </View>
  );
}

export function HeaderMeta({
  icon,
  children,
  tone = "neutral",
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  children: ReactNode;
  tone?: "neutral" | "accent";
}) {
  const { palette } = useTheme();
  if (tone === "accent") {
    return (
      <View
        style={[
          styles.accentMeta,
          { backgroundColor: palette.surface.accentSoft, borderColor: palette.accent.soft },
        ]}
      >
        {icon ? <Ionicons name={icon} size={14} color={palette.accent.base} /> : null}
        <Text style={[styles.accentMetaText, { color: palette.accent.base }]}>{children}</Text>
      </View>
    );
  }
  return (
    <View style={styles.inlineMeta}>
      {icon ? <Ionicons name={icon} size={15} color={palette.text.secondary} /> : null}
      <Text style={[styles.inlineMetaText, { color: palette.text.secondary }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.sm,
    paddingHorizontal: Platform.OS === "android" ? spacing.sm : spacing.md,
    paddingTop: spacing.xs,
    width: "100%",
  },
  utilityRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: Platform.OS === "android" ? spacing.xs : spacing.sm,
    minHeight: 0,
  },
  utilityRowCentered: {
    justifyContent: "center",
  },
  leadingSlot: {
    alignItems: "center",
    flexDirection: "row",
    marginRight: spacing.xs,
  },
  utilityLeading: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    minWidth: 0,
  },
  trailing: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: spacing.xs,
    marginLeft: "auto",
    minHeight: 36,
  },
  contextPill: {
    alignItems: "center",
    borderCurve: "continuous",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    flexShrink: 1,
    gap: spacing.xs,
    maxWidth: "100%",
    minHeight: 42,
    minWidth: 0,
    paddingLeft: 7,
    paddingRight: 9,
    paddingVertical: 4,
  },
  avatar: {
    alignItems: "center",
    borderRadius: 999,
    height: 20,
    justifyContent: "center",
    width: 20,
  },
  avatarImage: {
    borderRadius: 999,
    height: 20,
    width: 20,
  },
  avatarText: {
    ...typography.eyebrow,
    lineHeight: 12,
  },
  contextCopy: {
    alignItems: "flex-start",
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  contextText: {
    ...typography.small,
    lineHeight: 15,
    flexShrink: 1,
    fontFamily: "Inter_700Bold",
    minWidth: 0,
    textAlign: "left",
    width: "100%",
  },
  roleTag: {
    ...typography.eyebrow,
    lineHeight: 11.5,
    flexShrink: 1,
    minWidth: 0,
    textAlign: "left",
    width: "100%",
  },
  titleBlock: {
    alignSelf: "stretch",
    gap: spacing.xs,
    width: "100%",
  },
  titleBlockCentered: {
    alignItems: "center",
  },
  titleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
    minWidth: 0,
    width: "100%",
  },
  title: {
    // Tab-root screens intentionally use the larger landing-page title scale;
    // pushed screens route through ScreenHeader's compact headerTitle token.
    ...typography.screenTitle,
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  titleCompact: {
    ...typography.headerTitle,
  },
  centerText: {
    textAlign: "center",
  },
  eyebrow: {
    ...typography.eyebrow,
  },
  titleWithAccessory: {
    paddingRight: spacing.sm,
  },
  titleAccessory: {
    alignItems: "flex-end",
    flexShrink: 1,
    marginLeft: "auto",
    maxWidth: "54%",
    minWidth: 0,
  },
  subtitle: {
    ...typography.small,
  },
  backButton: {
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  meta: {
    alignItems: "center",
    flexDirection: "row",
    minHeight: 24,
  },
  inlineMeta: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
  },
  inlineMetaText: {
    ...typography.small,
    fontFamily: "Inter_600SemiBold",
  },
  accentMeta: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  accentMetaText: {
    ...typography.caption,
  },
  compactBar: {
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderCurve: "continuous",
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    left: spacing.md,
    overflow: "hidden",
    position: "absolute",
    right: spacing.md,
    top: spacing.xs,
    zIndex: 2,
  },
  compactTitle: {
    ...typography.headerTitle,
    maxWidth: "70%",
  },
});
