import { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radii, shadows, spacing, typography } from "@/lib/theme";
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
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-16)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return subscribeToast((payload) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      setToast(payload);
      opacity.setValue(0);
      translateY.setValue(-16);
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
      timeoutRef.current = setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0,
            duration: 220,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: -12,
            duration: 220,
            useNativeDriver: true,
          }),
        ]).start(({ finished }) => {
          if (finished) {
            setToast(null);
          }
        });
      }, 3200);
    });
  }, [opacity, translateY]);

  useEffect(() => {
    return () => {
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
          paddingTop: insets.top + spacing.sm,
        },
      ]}
    >
      <Animated.View
        accessibilityRole="alert"
        style={[
          styles.toast,
          toneStyles[toast.tone],
          {
            opacity,
            transform: [{ translateY }],
          },
        ]}
      >
        <Text style={styles.title}>{toast.title}</Text>
        {toast.message ? <Text style={styles.message}>{toast.message}</Text> : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    zIndex: 1000,
    top: 0,
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
    color: colors.text,
    ...typography.bodyStrong,
  },
  message: {
    marginTop: spacing.xs,
    color: colors.muted,
    ...typography.caption,
  },
});
