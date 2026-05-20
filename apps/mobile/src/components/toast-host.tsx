import { useEffect, useRef, useState } from "react";
import { Keyboard, StyleSheet, Text, View } from "react-native";
import Reanimated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "@/lib/reanimated-lite";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { legacyColors, radii, shadows, spacing, typography } from "@/lib/theme";
import { subscribeToast, type ToastPayload, type ToastTone } from "@/lib/toast";

const toneStyles: Record<ToastTone, { borderColor: string; backgroundColor: string }> = {
  neutral: {
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(17,22,20,0.96)",
  },
  amber: {
    borderColor: "rgba(242,201,76,0.42)",
    backgroundColor: "rgba(42,34,14,0.97)",
  },
  danger: {
    borderColor: "rgba(255,90,61,0.44)",
    backgroundColor: "rgba(42,18,14,0.97)",
  },
  success: {
    borderColor: "rgba(185,244,85,0.42)",
    backgroundColor: "rgba(18,34,20,0.97)",
  },
};

export function ToastHost() {
  const insets = useSafeAreaInsets();
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
      translateY.value = 16;
      opacity.value = withTiming(1, { duration: 180 });
      translateY.value = withTiming(0, { duration: 180 });
      timeoutRef.current = setTimeout(() => {
        opacity.value = withTiming(0, { duration: 220 });
        translateY.value = withTiming(12, { duration: 220 });
        timeoutRef.current = setTimeout(() => setToast(null), 240);
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

  return (
    <View
      pointerEvents="none"
      style={[
        styles.host,
        {
          paddingBottom: Math.max(insets.bottom + 88, keyboardHeight + spacing.lg),
        },
      ]}
    >
      <Reanimated.View
        accessibilityRole="alert"
        style={[
          styles.toast,
          toneStyles[toast.tone],
          toastStyle,
        ]}
      >
        <Text style={styles.title}>{toast.title}</Text>
        {toast.message ? <Text style={styles.message}>{toast.message}</Text> : null}
      </Reanimated.View>
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
    color: legacyColors.text,
    ...typography.bodyStrong,
  },
  message: {
    marginTop: spacing.xs,
    color: legacyColors.muted,
    ...typography.caption,
  },
});
