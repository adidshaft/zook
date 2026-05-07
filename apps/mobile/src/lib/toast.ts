import { Alert, Platform, ToastAndroid } from "react-native";

type ToastTone = "neutral" | "amber" | "danger" | "success";

export function showToast({ title, message, tone }: { title: string; message?: string; tone?: ToastTone }) {
  const text = message ? `${title}: ${message}` : title;
  if (Platform.OS === "android") {
    ToastAndroid.show(text, ToastAndroid.SHORT);
    return;
  }
  Alert.alert(title, message ?? (tone === "amber" ? "Try a different action." : undefined));
}
