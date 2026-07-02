import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import Reanimated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "@/lib/reanimated-lite";
import { useEffect, type ReactNode } from "react";

import { radii, spacing, typography, useTheme } from "@/lib/theme";
import { IconBubble } from "./icon-bubble";
import { Ionicons } from "@expo/vector-icons";

export function ErrorState({
  title = "Something needs attention",
  body,
  action,
  compact = false,
  onPress,
  accessibilityLabel,
}: {
  title?: string;
  body: string;
  action?: ReactNode;
  compact?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  const { palette } = useTheme();
  const stateStyle = [
    styles.emptyState,
    styles.errorState,
    compact ? styles.errorStateCompact : null,
    {
      borderColor: palette.feedback.danger,
      backgroundColor: compact ? palette.surface.default : palette.surface.dangerSoft,
    },
  ];
  const content = (
    <>
      <IconBubble icon="alert-circle-outline" tone="red" size={compact ? 20 : 40} />
      <View style={compact ? styles.compactCopy : null}>
        <Text
          numberOfLines={compact ? 1 : undefined}
          style={[styles.stateTitle, compact ? styles.stateTitleCompact : null, { color: palette.text.primary }]}
        >
          {title}
        </Text>
        <Text
          numberOfLines={compact ? 2 : undefined}
          adjustsFontSizeToFit={compact}
          minimumFontScale={0.9}
          style={[styles.stateBody, compact ? styles.stateBodyCompact : null, { color: palette.text.secondary }]}
        >
          {body}
        </Text>
      </View>
      {action ? <View style={compact ? styles.stateActionCompact : styles.stateAction}>{action}</View> : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? title}
        onPress={onPress}
        style={({ pressed }) => [stateStyle, pressed ? styles.errorStatePressed : null]}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View style={stateStyle}>
      {content}
    </View>
  );
}

export function QueryErrorState({
  error,
  onRetry,
  title = "Could not load this section",
  retryLabel = "Retry",
}: {
  error?: unknown;
  onRetry?: () => void;
  title?: string;
  retryLabel?: string;
}) {
  const { palette } = useTheme();
  const message =
    error instanceof Error && error.message.trim()
      ? error.message
      : "Pull to refresh or try again in a moment.";
  const compactRetry = onRetry ? (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.retryIconButton,
        { borderColor: palette.border.default, backgroundColor: palette.surface.default },
      ]}
    >
      <Ionicons name="refresh-outline" size={14} color={palette.text.primary} />
    </View>
  ) : undefined;
  return (
    <ErrorState
      compact
      title={title}
      body={message}
      action={compactRetry}
      onPress={onRetry}
      accessibilityLabel={retryLabel}
    />
  );
}

export function Skeleton({
  style,
  width,
  height,
  borderRadius = 8,
}: {
  style?: StyleProp<ViewStyle>;
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
}) {
  const progress = useSharedValue(0);
  const { palette, mode } = useTheme();

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [progress]);

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.45, 0.8]),
  }));

  return (
    <View
      style={[
        {
          width: width as ViewStyle["width"],
          height: height as ViewStyle["height"],
          borderRadius,
          backgroundColor: palette.surface.default,
          overflow: "hidden",
        },
        style,
      ]}
    >
      <Reanimated.View
        style={[
          styles.skeletonShimmer,
          { backgroundColor: mode === "dark" ? "rgba(255,255,255,0.16)" : "rgba(17,21,15,0.06)" },
          shimmerStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  stateTitle: {
    ...typography.headerTitle,
    textAlign: "center",
  },
  stateTitleCompact: {
    ...typography.navLabel,
    letterSpacing: 0,
    lineHeight: 15,
    textAlign: "left",
  },
  stateBody: {
    ...typography.body,
    marginTop: 4,
    textAlign: "center",
  },
  stateBodyCompact: {
    ...typography.navLabel,
    letterSpacing: 0,
    lineHeight: 15,
    marginTop: 1,
    textAlign: "left",
  },
  stateAction: {
    marginTop: spacing.md,
  },
  stateActionCompact: {
    flexShrink: 0,
  },
  compactCopy: {
    flex: 1,
    minWidth: 0,
  },
  emptyState: {
    padding: spacing.xxxl,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: radii.card,
    gap: spacing.sm,
  },
  errorState: {},
  errorStateCompact: {
    alignItems: "center",
    borderStyle: "solid",
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 6,
    justifyContent: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  errorStatePressed: {
    opacity: 0.84,
    transform: [{ scale: 0.99 }],
  },
  retryIconButton: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  skeletonShimmer: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
});
