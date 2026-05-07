import { Alert, Platform, ToastAndroid } from "react-native";
import * as Haptics from "expo-haptics";

export type ToastTone = "neutral" | "amber" | "danger" | "success";
export type HapticTone = "success" | "error" | "warning" | "light";
export type ToastPayload = {
  id: number;
  title: string;
  message?: string;
  tone: ToastTone;
};

const toastListeners = new Set<(payload: ToastPayload) => void>();
let toastId = 0;

export function subscribeToast(listener: (payload: ToastPayload) => void) {
  toastListeners.add(listener);
  return () => {
    toastListeners.delete(listener);
  };
}

export function runHaptic(tone: HapticTone) {
  if (Platform.OS === "web") {
    return;
  }
  if (tone === "success") {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    return;
  }
  if (tone === "error") {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    return;
  }
  if (tone === "warning") {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    return;
  }
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

export function messageFromError(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
}

export function showToast({
  title,
  message,
  tone = "neutral",
  haptic,
}: {
  title?: string;
  message?: string;
  tone?: ToastTone;
  haptic?: HapticTone;
}) {
  if (haptic) {
    runHaptic(haptic);
  }
  const heading = title ?? (tone === "danger" ? "Action failed" : "Zook");
  const body = message ?? (title ? undefined : tone === "amber" ? "Try a different action." : undefined);
  const payload = { id: ++toastId, title: heading, ...(body ? { message: body } : {}), tone };
  if (toastListeners.size) {
    for (const listener of toastListeners) {
      listener(payload);
    }
    return;
  }
  const text = body ? `${heading}: ${body}` : heading;
  if (Platform.OS === "android") {
    ToastAndroid.show(text, ToastAndroid.SHORT);
    return;
  }
  Alert.alert(heading, body);
}
