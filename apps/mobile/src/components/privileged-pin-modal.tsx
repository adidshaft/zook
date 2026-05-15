import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
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
import { colors, radii, spacing, typography } from "@/lib/theme";

type PendingPrompt = {
  label: string;
  resolve: (accepted: boolean) => void;
};

const PrivilegedPinContext = createContext<((label: string) => Promise<boolean>) | null>(null);

export function PrivilegedPinProvider({ children }: { children: ReactNode }) {
  const inputRef = useRef<OtpInputHandle>(null);
  const [pending, setPending] = useState<PendingPrompt | null>(null);
  const [pin, setPin] = useState("");

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

  const value = useMemo(() => requestPin, [requestPin]);

  return (
    <PrivilegedPinContext.Provider value={value}>
      {children}
      <Modal
        animationType="fade"
        transparent
        visible={Boolean(pending)}
        onRequestClose={() => close(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.backdrop}
        >
          <View style={styles.card}>
            <Text style={styles.title}>{pending?.label ?? "Confirm action"}</Text>
            <Text style={styles.body}>Enter the 4-digit org PIN to continue.</Text>
            <OtpInput
              ref={inputRef}
              accessibilityLabel="Org PIN"
              label="Org PIN"
              length={4}
              value={pin}
              onChange={setPin}
              onComplete={(value) => close(/^\d{4}$/.test(value))}
            />
            <View style={styles.actions}>
              <Pressable
                onPress={() => close(false)}
                accessibilityRole="button"
                style={[styles.button, styles.secondaryButton]}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => close(/^\d{4}$/.test(pin))}
                disabled={pin.length !== 4}
                accessibilityRole="button"
                accessibilityState={{ disabled: pin.length !== 4 }}
                style={[styles.button, styles.primaryButton, pin.length !== 4 ? styles.disabled : null]}
              >
                <Text style={styles.primaryButtonText}>Continue</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </PrivilegedPinContext.Provider>
  );
}

export function usePrivilegedPinPrompt() {
  const requestPin = useContext(PrivilegedPinContext);
  if (!requestPin) {
    throw new Error("usePrivilegedPinPrompt must be used inside PrivilegedPinProvider");
  }
  return requestPin;
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "center",
    padding: spacing.xl,
    backgroundColor: "rgba(0,0,0,0.66)",
  },
  card: {
    gap: spacing.md,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
    padding: spacing.xl,
  },
  title: {
    color: colors.text,
    ...typography.cardTitle,
  },
  body: {
    color: colors.muted,
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
    borderColor: colors.border,
    backgroundColor: colors.panel,
  },
  primaryButton: {
    backgroundColor: colors.lime,
  },
  disabled: {
    opacity: 0.45,
  },
  secondaryButtonText: {
    color: colors.text,
    ...typography.bodyStrong,
  },
  primaryButtonText: {
    color: colors.bg,
    ...typography.bodyStrong,
  },
});
