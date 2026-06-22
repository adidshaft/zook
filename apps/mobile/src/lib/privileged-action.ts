import * as LocalAuthentication from "expo-local-authentication";
import { Alert } from "react-native";

type PrivilegedPinPrompt = (label: string) => Promise<boolean>;

let privilegedPinPrompt: PrivilegedPinPrompt | null = null;

export function setPrivilegedPinPrompt(prompt: PrivilegedPinPrompt | null) {
  privilegedPinPrompt = prompt;
}

async function promptForOrgPin(label: string): Promise<boolean> {
  if (privilegedPinPrompt) {
    return privilegedPinPrompt(label);
  }
  return new Promise((resolve) => {
    Alert.alert(label, "PIN entry is still loading. Try again after the app finishes opening.", [
      { text: "OK", onPress: () => resolve(false) },
    ]);
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
