import Constants from "expo-constants";
import { Platform } from "react-native";
import { translate } from "./i18n";

/**
 * Native Google / Apple sign-in, loaded lazily so the bundle still runs in
 * Expo Go (where these native modules aren't present). Each helper returns the
 * provider id-token to hand to the backend (`/auth/google|apple/callback`), or
 * throws a friendly Error the caller surfaces as a toast.
 */

export class SocialAuthUnavailableError extends Error {
  constructor(provider: string) {
    super(translate("auth.socialUnavailable", { provider }));
    this.name = "SocialAuthUnavailableError";
  }
}

function googleWebClientId(): string | undefined {
  const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;
  return (
    (extra.googleWebClientId as string | undefined) ??
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ??
    undefined
  );
}

export async function signInWithGoogleNative(): Promise<string> {
  let mod: typeof import("@react-native-google-signin/google-signin");
  try {
    mod = await import("@react-native-google-signin/google-signin");
  } catch {
    throw new SocialAuthUnavailableError("Google");
  }
  const { GoogleSignin } = mod;
  const webClientId = googleWebClientId();
  GoogleSignin.configure(webClientId ? { webClientId } : {});
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const result = (await GoogleSignin.signIn()) as {
    idToken?: string | null;
    data?: { idToken?: string | null } | null;
  };
  // v13+ nests under `.data`; older returns top-level `.idToken`.
  const idToken = result.data?.idToken ?? result.idToken ?? null;
  if (!idToken) {
    throw new Error(translate("auth.socialNoToken", { provider: "Google" }));
  }
  return idToken;
}

export async function signInWithAppleNative(): Promise<{ identityToken: string; fullName?: string }> {
  if (Platform.OS !== "ios") {
    throw new SocialAuthUnavailableError("Apple");
  }
  let mod: typeof import("expo-apple-authentication");
  try {
    mod = await import("expo-apple-authentication");
  } catch {
    throw new SocialAuthUnavailableError("Apple");
  }
  const available = await mod.isAvailableAsync();
  if (!available) {
    throw new SocialAuthUnavailableError("Apple");
  }
  const credential = await mod.signInAsync({
    requestedScopes: [
      mod.AppleAuthenticationScope.FULL_NAME,
      mod.AppleAuthenticationScope.EMAIL,
    ],
  });
  if (!credential.identityToken) {
    throw new Error(translate("auth.socialNoToken", { provider: "Apple" }));
  }
  const name = [credential.fullName?.givenName, credential.fullName?.familyName]
    .filter(Boolean)
    .join(" ")
    .trim();
  return { identityToken: credential.identityToken, ...(name ? { fullName: name } : {}) };
}

export function appleSignInSupported(): boolean {
  return Platform.OS === "ios";
}
