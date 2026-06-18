import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Platform, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import type { ReactNode } from "react";
import type { SharedValue } from "react-native-reanimated";

import Reanimated, { interpolate, useAnimatedStyle } from "@/lib/reanimated-lite";
import { useReduceMotion } from "@/lib/motion";
import { materials, spacing, typography, useTheme } from "@/lib/theme";

type HeaderContext = {
  orgName: string;
  onPress: () => void;
  roleTag?: string;
};

export function ScreenHeader({
  title,
  subtitle,
  titleAccessory,
  context,
  contextSlot,
  trailing,
  meta,
  scrollY,
  style,
}: {
  title: string;
  subtitle?: string;
  titleAccessory?: ReactNode;
  context?: HeaderContext;
  contextSlot?: ReactNode;
  trailing?: ReactNode;
  meta?: ReactNode;
  scrollY?: SharedValue<number>;
  style?: StyleProp<ViewStyle>;
}) {
  const { mode, palette } = useTheme();
  const reduceMotion = useReduceMotion();
  const glass = materials.glassBar(mode);
  const tonal = materials.tonalBar(mode);

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

      {contextSlot || context || trailing ? (
        <View style={styles.utilityRow}>
          {contextSlot || context ? (
            <View style={styles.utilityLeading}>
              {contextSlot ? contextSlot : context ? <ContextPill context={context} /> : null}
            </View>
          ) : null}
          {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
        </View>
      ) : null}
      <Reanimated.View style={[styles.titleBlock, titleStyle]}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: palette.text.primary }]}>{title}</Text>
          {titleAccessory ? <View style={styles.titleAccessory}>{titleAccessory}</View> : null}
        </View>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: palette.text.secondary }]}>{subtitle}</Text>
        ) : null}
        {meta ? <View style={styles.meta}>{meta}</View> : null}
      </Reanimated.View>
    </View>
  );
}

function ContextPill({ context }: { context: HeaderContext }) {
  const { palette } = useTheme();
  const initial = context.orgName.trim().charAt(0).toUpperCase() || "Z";
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
      <View style={[styles.avatar, { backgroundColor: palette.surface.accentSoft }]}>
        <Text style={[styles.avatarText, { color: palette.accent.base }]}>{initial}</Text>
      </View>
      <Text numberOfLines={1} style={[styles.contextText, { color: palette.text.primary }]}>
        {context.orgName}
      </Text>
      {context.roleTag ? (
        <Text numberOfLines={1} style={[styles.roleTag, { color: palette.text.secondary }]}>
          {context.roleTag}
        </Text>
      ) : null}
      <Ionicons name="chevron-down" size={14} color={palette.text.tertiary} />
    </Pressable>
  );
}

export function HeaderMeta({
  icon,
  children,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  children: ReactNode;
}) {
  const { palette } = useTheme();
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
    alignItems: "flex-start",
    flexDirection: "row",
    gap: Platform.OS === "android" ? spacing.xs : spacing.sm,
    minHeight: 0,
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
    flexDirection: "row",
    gap: spacing.xs,
    marginLeft: "auto",
    minHeight: 36,
  },
  contextPill: {
    alignItems: "center",
    borderCurve: "continuous",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    maxWidth: "100%",
    minHeight: 36,
    minWidth: 0,
    paddingLeft: 6,
    paddingRight: spacing.sm,
  },
  avatar: {
    alignItems: "center",
    borderRadius: 999,
    height: 20,
    justifyContent: "center",
    width: 20,
  },
  avatarText: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    lineHeight: 12,
  },
  contextText: {
    ...typography.caption,
    flexShrink: 1,
    minWidth: 0,
  },
  roleTag: {
    ...typography.caption,
    maxWidth: Platform.OS === "android" ? 56 : 76,
  },
  titleBlock: {
    gap: spacing.xs,
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
    // pushed screens route through AppHeader's compact headerTitle token.
    ...typography.screenTitle,
    flexShrink: 1,
    minWidth: 0,
  },
  titleAccessory: {
    flexShrink: 1,
    marginLeft: "auto",
    minWidth: 0,
  },
  subtitle: {
    ...typography.small,
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
