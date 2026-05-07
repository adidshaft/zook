import * as LocalAuthentication from "expo-local-authentication";
import { Alert, Platform } from "react-native";

function promptForOrgPin(label: string): Promise<boolean> {
  return new Promise((resolve) => {
    // CODEX: replace with server-side org PIN
    if (Platform.OS !== "ios") {
      Alert.alert(label, "Org PIN fallback is not available on this device yet.", [
        { text: "OK", onPress: () => resolve(false) },
      ]);
      return;
    }

    Alert.prompt(
      label,
      "Enter the 4-digit org PIN to continue.",
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => resolve(false),
        },
        {
          text: "Continue",
          onPress: (value?: string) => resolve(/^\d{4}$/.test(String(value ?? "").trim())),
        },
      ],
      "secure-text",
      "",
      "number-pad",
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

export async function requirePrivilegedAuth(label: string): Promise<boolean> {
  const [hasHardware, enrolled] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
  ]).catch(() => [false, false]);

  if (!hasHardware || !enrolled) {
    return promptForOrgPin(label);
  }

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: label,
    cancelLabel: "Cancel",
    disableDeviceFallback: false,
  }).catch(() => ({ success: false }));

  return result.success;
}
