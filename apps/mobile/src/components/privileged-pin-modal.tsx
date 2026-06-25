import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { OtpInput, type OtpInputHandle } from "@/components/primitives";
import { setPrivilegedPinPrompt } from "@/lib/privileged-action";
import { useT } from "@/lib/i18n";
import { radii, spacing, typography, useTheme } from "@/lib/theme";

type PendingPrompt = {
  label: string;
  resolve: (accepted: boolean) => void;
};

export function PrivilegedPinProvider({ children }: { children: ReactNode }) {
  const { mode, palette } = useTheme();
  const t = useT();
  const inputRef = useRef<OtpInputHandle>(null);
  const [pending, setPending] = useState<PendingPrompt | null>(null);
  const [pin, setPin] = useState("");
  const isDark = mode === "dark";
  const canContinue = pin.length === 4;
  const modalSurface =
    Platform.OS === "ios"
      ? isDark
        ? palette.bg.elevated
        : palette.surface.raised
      : palette.bg.elevated;
  const modalOverlay =
    Platform.OS === "ios"
      ? isDark
        ? palette.surface.default
        : palette.surface.accentSoft
      : palette.bg.elevated;
  const modalShadowColor = isDark ? palette.bg.sunken : palette.text.primary;

  const requestPin = useCallback((label: string) => {
    return new Promise<boolean>((resolve) => {
      setPin("");
      setPending({ label, resolve });
    });
  }, []);

  const close = useCallback(
    (accepted: boolean) => {
      pending?.resolve(accepted);
      setPending(null);
      setPin("");
    },
    [pending],
  );

  useEffect(() => {
    setPrivilegedPinPrompt(requestPin);
    return () => setPrivilegedPinPrompt(null);
  }, [requestPin]);

  useEffect(() => {
    if (!pending) {
      return;
    }
    const timer = setTimeout(() => inputRef.current?.focus(), 150);
    return () => clearTimeout(timer);
  }, [pending]);

  return (
    <>
      {children}
      <Modal
        animationType="fade"
        transparent
        visible={Boolean(pending)}
        onRequestClose={() => close(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={[
            styles.backdrop,
            { backgroundColor: palette.bg.overlay },
          ]}
        >
          <View
            style={[
              styles.card,
              {
                borderColor: palette.border.subtle,
                backgroundColor: modalSurface,
                shadowColor: modalShadowColor,
                shadowOpacity: Platform.OS === "ios" ? (isDark ? 0.22 : 0.1) : 0,
              },
            ]}
          >
            {Platform.OS === "ios" ? (
              <BlurView
                pointerEvents="none"
                intensity={isDark ? 26 : 18}
                tint={isDark ? "dark" : "light"}
                style={StyleSheet.absoluteFill}
              />
            ) : null}
            <View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: modalOverlay },
              ]}
            />
            <View style={styles.header}>
              <View
                style={[
                  styles.iconBubble,
                  {
                    borderColor: palette.border.focus,
                    backgroundColor: palette.surface.accentSoft,
                  },
                ]}
              >
                <Ionicons name="shield-checkmark-outline" size={22} color={palette.accent.base} />
              </View>
              <View style={styles.copy}>
                <Text style={[styles.title, { color: palette.text.primary }]}>
                  {pending?.label ?? t("privilegedPin.confirmAction")}
                </Text>
                <Text style={[styles.body, { color: palette.text.secondary }]}>
                  {t("privilegedPin.body")}
                </Text>
              </View>
            </View>
            <OtpInput
              ref={inputRef}
              testID="privileged-pin"
              accessibilityLabel={t("privilegedPin.orgPin")}
              label={t("privilegedPin.orgPin")}
              length={4}
              value={pin}
              onChange={setPin}
              onComplete={(value) => close(/^\d{4}$/.test(value))}
            />
            <View style={styles.actions}>
              <Pressable
                onPress={() => close(false)}
                accessibilityRole="button"
                style={[
                  styles.button,
                  styles.secondaryButton,
                  {
                    borderColor: palette.border.default,
                    backgroundColor: isDark ? palette.surface.default : palette.surface.raised,
                  },
                ]}
              >
                <Text style={[styles.secondaryButtonText, { color: palette.text.primary }]}>{t("common.cancel")}</Text>
              </Pressable>
              <Pressable
                onPress={() => close(/^\d{4}$/.test(pin))}
                disabled={!canContinue}
                accessibilityRole="button"
                accessibilityState={{ disabled: !canContinue }}
                style={[
                  styles.button,
                  styles.primaryButton,
                  { backgroundColor: palette.accent.fill },
                  !canContinue ? styles.disabled : null,
                ]}
              >
                <Text style={[styles.primaryButtonText, { color: palette.text.onAccent }]}>
                  {t("privilegedPin.continue")}
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "center",
    padding: spacing.xl,
  },
  card: {
    gap: spacing.lg,
    borderRadius: radii.card,
    borderWidth: 1,
    padding: spacing.xl,
    overflow: "hidden",
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 5,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  iconBubble: {
    width: 46,
    height: 46,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: {
    flex: 1,
    gap: 5,
  },
  title: {
    ...typography.cardTitle,
  },
  body: {
    ...typography.body,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  button: {
    flex: 1,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.button,
  },
  secondaryButton: {
    borderWidth: 1,
  },
  primaryButton: {
  },
  disabled: {
    opacity: 0.45,
  },
  secondaryButtonText: {
    ...typography.bodyStrong,
  },
  primaryButtonText: {
    ...typography.bodyStrong,
  },
});
