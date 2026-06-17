import { ActivityIndicator, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import Reanimated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "@/lib/reanimated-lite";
import { useEffect, type ReactNode } from "react";

import { useI18n } from "@/lib/i18n";
import { radii, spacing, typography, useTheme } from "@/lib/theme";
import { ZookButton } from "./buttons";
import { IconBubble } from "./icon-bubble";

export function LoadingState({ title, body }: { title?: string; body?: string }) {
  const { t } = useI18n();
  const { palette } = useTheme();
  return (
    <View style={styles.loadingState}>
      <ActivityIndicator size="large" color={palette.accent.base} />
      <Text style={[styles.stateTitle, { color: palette.text.primary }]}>
        {title ?? t("empty.loading")}
      </Text>
      <Text style={[styles.stateBody, { color: palette.text.secondary }]}>
        {body ?? t("empty.loadingBody")}
      </Text>
    </View>
  );
}

export function ErrorState({
  title = "Something needs attention",
  body,
  action,
}: {
  title?: string;
  body: string;
  action?: ReactNode;
}) {
  const { palette } = useTheme();
  return (
    <View
      style={[
        styles.emptyState,
        styles.errorState,
        { borderColor: palette.feedback.danger, backgroundColor: palette.surface.dangerSoft },
      ]}
    >
      <IconBubble icon="alert-circle-outline" tone="red" />
      <Text style={[styles.stateTitle, { color: palette.text.primary }]}>{title}</Text>
      <Text style={[styles.stateBody, { color: palette.text.secondary }]}>{body}</Text>
      {action ? <View style={styles.stateAction}>{action}</View> : null}
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
  const message =
    error instanceof Error && error.message.trim()
      ? error.message
      : "Pull to refresh or try again in a moment.";
  return (
    <ErrorState
      title={title}
      body={message}
      action={
        onRetry ? (
          <ZookButton variant="secondary" icon="refresh-outline" onPress={onRetry}>
            {retryLabel}
          </ZookButton>
        ) : undefined
      }
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

export function LoadingSkeleton(props: Parameters<typeof Skeleton>[0]) {
  return <Skeleton {...props} />;
}

const styles = StyleSheet.create({
  loadingState: {
    padding: spacing.xxxl,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  stateTitle: {
    ...typography.headerTitle,
    textAlign: "center",
  },
  stateBody: {
    ...typography.body,
    marginTop: 4,
    textAlign: "center",
  },
  stateAction: {
    marginTop: spacing.md,
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
  skeletonShimmer: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
});
