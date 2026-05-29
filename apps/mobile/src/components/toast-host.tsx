import { useEffect, useRef, useState } from "react";
import { Keyboard, Pressable, StyleSheet, Text, View } from "react-native";
import Reanimated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "@/lib/reanimated-lite";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { radii, shadows, spacing, typography, useTheme } from "@/lib/theme";
import { subscribeToast, type ToastPayload, type ToastTone } from "@/lib/toast";

export function ToastHost() {
  const insets = useSafeAreaInsets();
  const { palette } = useTheme();
  const [toast, setToast] = useState<ToastPayload | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(16);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  useEffect(() => {
    return subscribeToast((payload) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      setToast(payload);
      opacity.value = 0;
      translateY.value = 24;
      opacity.value = withTiming(1, { duration: 150 });
      translateY.value = withSpring(0, { damping: 14, stiffness: 140 });
      timeoutRef.current = setTimeout(() => {
        opacity.value = withTiming(0, { duration: 200 });
        translateY.value = withTiming(16, { duration: 200 });
        timeoutRef.current = setTimeout(() => setToast(null), 220);
      }, 3200);
    });
  }, [opacity, translateY]);

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener("keyboardDidHide", () => setKeyboardHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  if (!toast) {
    return null;
  }
  const toneStyle = {
    neutral: {
      borderColor: palette.border.default,
      backgroundColor: palette.bg.elevated,
    },
    amber: {
      borderColor: palette.feedback.warning,
      backgroundColor: palette.surface.warningSoft,
    },
    danger: {
      borderColor: palette.feedback.danger,
      backgroundColor: palette.surface.dangerSoft,
    },
    success: {
      borderColor: palette.feedback.success,
      backgroundColor: palette.surface.successSoft,
    },
  } satisfies Record<ToastTone, { borderColor: string; backgroundColor: string }>;

  const dismissToast = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    opacity.value = withTiming(0, { duration: 120 });
    translateY.value = withTiming(20, { duration: 120 });
    timeoutRef.current = setTimeout(() => setToast(null), 140);
  };

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.host,
        {
          paddingBottom: Math.max(insets.bottom + 88, keyboardHeight + spacing.lg),
        },
      ]}
    >
      <Pressable
        onPress={dismissToast}
        style={{ width: "100%", maxWidth: 520 }}
        accessibilityRole="button"
        accessibilityLabel="Dismiss notification"
      >
        <Reanimated.View
          accessibilityRole="alert"
          style={[
            styles.toast,
            toneStyle[toast.tone],
            toastStyle,
          ]}
        >
          <Text style={[styles.title, { color: palette.text.primary }]}>{toast.title}</Text>
          {toast.message ? (
            <Text style={[styles.message, { color: palette.text.secondary }]}>{toast.message}</Text>
          ) : null}
        </Reanimated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    zIndex: 1000,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: spacing.lg,
  },
  toast: {
    width: "100%",
    maxWidth: 520,
    borderWidth: 1,
    borderRadius: radii.card,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    ...shadows.card,
  },
  title: {
    ...typography.bodyStrong,
  },
  message: {
    marginTop: spacing.xs,
    ...typography.caption,
  },
});
