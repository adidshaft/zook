import * as LocalAuthentication from "expo-local-authentication";
import { Alert } from "react-native";
import { translate } from "./i18n";

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
    Alert.alert(label, translate("privilegedAction.pinLoading"), [
      { text: translate("common.ok"), onPress: () => resolve(false) },
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
    cancelLabel: translate("common.cancel"),
    disableDeviceFallback: false,
  }).catch(() => ({ success: false }));

  return result.success;
}
