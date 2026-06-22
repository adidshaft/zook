import { useEffect, useRef, useState } from "react";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { Keyboard, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Reanimated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "@/lib/reanimated-lite";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { elevation, spacing, typography, useTheme } from "@/lib/theme";
import { subscribeToast, type ToastPayload, type ToastTone } from "@/lib/toast";

export function ToastHost() {
  const insets = useSafeAreaInsets();
  const { palette, mode } = useTheme();
  const isAndroid = Platform.OS === "android";
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
      backgroundColor: mode === "dark" ? palette.surface.raised : palette.bg.elevated,
      shadowColor: mode === "dark" ? palette.bg.sunken : palette.text.primary,
    },
    amber: {
      borderColor: palette.feedback.warning,
      backgroundColor:
        mode === "dark"
          ? isAndroid
            ? "#2B2412"
            : palette.surface.warningSoft
          : isAndroid
            ? "#FFF4DD"
            : palette.surface.warningSoft,
      shadowColor: palette.feedback.warning,
    },
    danger: {
      borderColor: palette.feedback.danger,
      backgroundColor:
        mode === "dark"
          ? isAndroid
            ? "#2D1715"
            : palette.surface.dangerSoft
          : isAndroid
            ? "#FDE8E6"
            : palette.surface.dangerSoft,
      shadowColor: palette.feedback.danger,
    },
    success: {
      borderColor: palette.feedback.success,
      backgroundColor:
        mode === "dark"
          ? isAndroid
            ? "#15271F"
            : palette.surface.successSoft
          : isAndroid
            ? "#E8F6EE"
            : palette.surface.successSoft,
      shadowColor: palette.feedback.success,
    },
  } satisfies Record<ToastTone, { borderColor: string; backgroundColor: string; shadowColor: string }>;
  const toneIcon = {
    neutral: "notifications-outline",
    amber: "alert-circle-outline",
    danger: "close-circle-outline",
    success: "checkmark-circle-outline",
  } satisfies Record<ToastTone, keyof typeof Ionicons.glyphMap>;
  const toneColor = {
    neutral: palette.accent.base,
    amber: palette.feedback.warning,
    danger: palette.feedback.danger,
    success: palette.feedback.success,
  } satisfies Record<ToastTone, string>;

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
        style={({ pressed }) => [
          styles.toastButton,
          pressed ? styles.toastPressed : null,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Dismiss notification"
      >
        <Reanimated.View
          accessibilityRole="alert"
          style={[
            styles.toast,
            toneStyle[toast.tone],
            elevation(6, toneStyle[toast.tone].shadowColor, {
              shadowOpacity: mode === "dark" ? 0.28 : 0.12,
              shadowRadius: 18,
              shadowOffset: { width: 0, height: 12 },
            }),
            toastStyle,
          ]}
        >
          {Platform.OS === "ios" ? (
            <BlurView
              pointerEvents="none"
              intensity={mode === "dark" ? 24 : 18}
              tint={mode === "dark" ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : null}
          <View style={styles.toastContent}>
            <View
              style={[
                styles.iconShell,
                {
                  borderColor: toneColor[toast.tone],
                  backgroundColor: toneStyle[toast.tone].backgroundColor,
                },
              ]}
            >
              <Ionicons name={toneIcon[toast.tone]} size={18} color={toneColor[toast.tone]} />
            </View>
            <View style={styles.copy}>
              <Text style={[styles.title, { color: palette.text.primary }]}>{toast.title}</Text>
              {toast.message ? (
                <Text style={[styles.message, { color: palette.text.secondary }]}>
                  {toast.message}
                </Text>
              ) : null}
            </View>
          </View>
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
  toastButton: {
    width: "100%",
    maxWidth: 520,
  },
  toastPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.992 }],
  },
  toast: {
    width: "100%",
    maxWidth: 520,
    borderWidth: 1,
    borderRadius: 24,
    overflow: "hidden",
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 0,
  },
  toastContent: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  iconShell: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    ...typography.bodyStrong,
  },
  message: {
    marginTop: spacing.xs,
    ...typography.caption,
  },
});
