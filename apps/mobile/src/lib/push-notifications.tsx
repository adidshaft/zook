import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import Constants from "expo-constants";
import type * as NotificationsModule from "expo-notifications";
import type { ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Linking, Platform } from "react-native";
import { getExpoProjectId, getMobilePushEnvironment } from "./api";
import { getApiErrorMessage, useAuth } from "./auth";
import { isOfflineDemoMode } from "./demo-mode";
import { notificationsApi, pushApi } from "./domain-api";
import { mergeNotificationPreferences } from "./notification-preferences";
import { mapNotificationPayloadToHref } from "./notification-routing";
import { useMyNotificationPreferences } from "./domains";
import { deleteStoredValue, getStoredValue, setStoredValue } from "./storage";

const INSTALLATION_ID_STORAGE_KEY = "zook_mobile_installation_id";
const REGISTERED_PUSH_TOKEN_STORAGE_KEY = "zook_registered_push_token";
const notificationLightColor = "#B9F455";
const isExpoGoEnvironment = Constants.executionEnvironment === "storeClient";
const NativeNotifications = (() => {
  if (isExpoGoEnvironment) {
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- Expo Go crashes if this native module is imported eagerly.
    return require("expo-notifications") as typeof NotificationsModule;
  } catch {
    return null;
  }
})();

if (NativeNotifications) {
  NativeNotifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

function getNativeNotifications() {
  if (!NativeNotifications) {
    throw new Error("Push alerts need a signed phone build. In-app alerts still work here.");
  }
  return NativeNotifications;
}

type PushPermissionState = "unknown" | "undetermined" | "granted" | "denied" | "unsupported";
type PushSyncStatus =
  | "idle"
  | "disabled"
  | "checking"
  | "registering"
  | "registered"
  | "unregistering"
  | "denied"
  | "unsupported"
  | "error";

interface PushNotificationsContextValue {
  permissionState: PushPermissionState;
  syncStatus: PushSyncStatus;
  pushToken?: string;
  error?: string;
  isExpoGo: boolean;
  projectIdConfigured: boolean;
  requestEnablePush: () => Promise<boolean>;
  disablePush: () => Promise<void>;
  refreshRegistration: () => Promise<void>;
  openSystemSettings: () => Promise<void>;
}

const PushNotificationsContext = createContext<PushNotificationsContextValue | undefined>(
  undefined,
);

const offlineDemoPushValue: PushNotificationsContextValue = {
  permissionState: "unsupported",
  syncStatus: "disabled",
  isExpoGo: false,
  projectIdConfigured: false,
  requestEnablePush: async () => false,
  disablePush: async () => {},
  refreshRegistration: async () => {},
  openSystemSettings: async () => {},
};

const expoGoPushValue: PushNotificationsContextValue = {
  permissionState: "unsupported",
  syncStatus: "unsupported",
  isExpoGo: true,
  projectIdConfigured: Boolean(getExpoProjectId()),
  requestEnablePush: async () => false,
  disablePush: async () => {},
  refreshRegistration: async () => {},
  openSystemSettings: async () => {},
};

function normalizePermissionState(
  status: NotificationsModule.NotificationPermissionsStatus,
): PushPermissionState {
  if (status.granted) {
    return "granted";
  }
  if (status.canAskAgain) {
    return "undetermined";
  }
  return "denied";
}

function platformForRegistration() {
  if (Platform.OS === "ios" || Platform.OS === "android" || Platform.OS === "web") {
    return Platform.OS;
  }
  return "unknown";
}

function trimErrorMessage(error: unknown) {
  const message = getApiErrorMessage(error);
  if (/physical device|real device/i.test(message)) {
    return "Push alerts need a signed phone build. In-app alerts still work here.";
  }
  if (/project.?id/i.test(message)) {
    return "Push alerts are not available in this build yet.";
  }
  return message;
}

async function getOrCreateInstallationId() {
  const existingId = await getStoredValue(INSTALLATION_ID_STORAGE_KEY);
  if (existingId) {
    return existingId;
  }

  const generatedId = `mobile_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  await setStoredValue(INSTALLATION_ID_STORAGE_KEY, generatedId);
  return generatedId;
}

export function PushNotificationsProvider({ children }: { children: ReactNode }) {
  if (isOfflineDemoMode()) {
    return (
      <PushNotificationsContext.Provider value={offlineDemoPushValue}>
        {children}
      </PushNotificationsContext.Provider>
    );
  }

  if (isExpoGoEnvironment) {
    return (
      <PushNotificationsContext.Provider value={expoGoPushValue}>
        {children}
      </PushNotificationsContext.Provider>
    );
  }

  const notifications = getNativeNotifications();
  const { activeOrgId, registerLogoutCleanup, status, token } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const preferencesQuery = useMyNotificationPreferences();
  const effectivePreferences = useMemo(
    () => mergeNotificationPreferences(preferencesQuery.data?.preferences, activeOrgId),
    [activeOrgId, preferencesQuery.data?.preferences],
  );
  const pushEnabledRef = useRef(effectivePreferences.pushEnabled);
  const authTokenRef = useRef<string | undefined>(token);
  const activeOrgIdRef = useRef<string | undefined>(activeOrgId);
  const handledResponseIdsRef = useRef(new Set<string>());
  const registeredSignatureRef = useRef<string | undefined>(undefined);
  const [permissionState, setPermissionState] = useState<PushPermissionState>("unknown");
  const [syncStatus, setSyncStatus] = useState<PushSyncStatus>("idle");
  const [pushToken, setPushToken] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [pendingHref, setPendingHref] = useState<string | undefined>();
  const isExpoGo = Constants.executionEnvironment === "storeClient";
  const projectIdConfigured = Boolean(getExpoProjectId());

  useEffect(() => {
    pushEnabledRef.current = effectivePreferences.pushEnabled;
  }, [effectivePreferences.pushEnabled]);

  useEffect(() => {
    authTokenRef.current = token;
  }, [token]);

  useEffect(() => {
    activeOrgIdRef.current = activeOrgId;
  }, [activeOrgId]);

  const updatePushPreference = useCallback(
    async (enabled: boolean) => {
      if (!authTokenRef.current) {
        return;
      }
      await notificationsApi.updatePreferences({
        token: authTokenRef.current,
        ...(activeOrgIdRef.current ? { orgId: activeOrgIdRef.current } : {}),
        preferences: {
          ...(activeOrgIdRef.current ? { orgId: activeOrgIdRef.current } : {}),
          pushEnabled: enabled,
        },
      });
      await queryClient.invalidateQueries({ queryKey: ["me", "notification-preferences"] });
    },
    [queryClient],
  );

  const unregisterCurrentDevice = useCallback(async () => {
    const currentAuthToken = authTokenRef.current;
    const currentPushToken =
      pushToken ?? (await getStoredValue(REGISTERED_PUSH_TOKEN_STORAGE_KEY)) ?? undefined;
    if (!currentAuthToken || !currentPushToken) {
      await deleteStoredValue(REGISTERED_PUSH_TOKEN_STORAGE_KEY);
      registeredSignatureRef.current = undefined;
      setPushToken(undefined);
      return;
    }

    try {
      setSyncStatus("unregistering");
      await pushApi.unregisterDevice({
        token: currentAuthToken,
        tokenValue: currentPushToken,
      });
    } catch (cause) {
      const message = getApiErrorMessage(cause);
      if (!/not found/i.test(message)) {
        throw cause;
      }
    } finally {
      await deleteStoredValue(REGISTERED_PUSH_TOKEN_STORAGE_KEY);
      registeredSignatureRef.current = undefined;
      setPushToken(undefined);
      await queryClient.invalidateQueries({ queryKey: ["me", "push-devices"] });
    }
  }, [pushToken, queryClient]);

  const ensureAndroidChannels = useCallback(async () => {
    if (Platform.OS !== "android") {
      return;
    }
    await Promise.all([
      notifications.setNotificationChannelAsync("payments", {
        name: "Payments",
        importance: notifications.AndroidImportance.HIGH,
        sound: "default",
        vibrationPattern: [0, 250, 250, 250],
        lightColor: notificationLightColor,
      }),
      notifications.setNotificationChannelAsync("ops", {
        name: "Operations",
        importance: notifications.AndroidImportance.HIGH,
        sound: "default",
        vibrationPattern: [0, 250, 250, 250],
        lightColor: notificationLightColor,
      }),
      notifications.setNotificationChannelAsync("reminders", {
        name: "Reminders",
        importance: notifications.AndroidImportance.DEFAULT,
        sound: "default",
      }),
      notifications.setNotificationChannelAsync("marketing", {
        name: "Marketing",
        importance: notifications.AndroidImportance.LOW,
      }),
      notifications.setNotificationChannelAsync("default", {
        name: "Default",
        importance: notifications.AndroidImportance.DEFAULT,
        sound: "default",
      }),
    ]);
  }, [notifications]);

  const registerExpoPushToken = useCallback(
    async (tokenValue: string) => {
      const currentAuthToken = authTokenRef.current;
      if (!currentAuthToken) {
        return false;
      }

      const installationId = await getOrCreateInstallationId();
      const signature = `${activeOrgIdRef.current ?? "global"}:${tokenValue}`;
      if (registeredSignatureRef.current === signature) {
        setPushToken(tokenValue);
        setSyncStatus("registered");
        return true;
      }

      setSyncStatus("registering");
      await pushApi.registerDevice({
        token: currentAuthToken,
        ...(activeOrgIdRef.current ? { orgId: activeOrgIdRef.current } : {}),
        body: {
          ...(activeOrgIdRef.current ? { orgId: activeOrgIdRef.current } : {}),
          token: tokenValue,
          platform: platformForRegistration(),
          deviceId: installationId,
          deviceName: Constants.deviceName ?? `${Platform.OS.toUpperCase()} device`,
          appVersion:
            (Constants.expoConfig?.extra?.appVersion as string | undefined) ??
            Constants.expoConfig?.version ??
            "0.1.0",
          environment: getMobilePushEnvironment(),
        },
      });

      await setStoredValue(REGISTERED_PUSH_TOKEN_STORAGE_KEY, tokenValue);
      registeredSignatureRef.current = signature;
      setPushToken(tokenValue);
      setError(undefined);
      setSyncStatus("registered");
      await queryClient.invalidateQueries({ queryKey: ["me", "push-devices"] });
      return true;
    },
    [queryClient],
  );

  const ensureRegistered = useCallback(
    async ({ promptForPermission }: { promptForPermission: boolean }) => {
      if (Platform.OS === "web") {
        setPermissionState("unsupported");
        setSyncStatus("unsupported");
        setError("Push alerts are only available in the phone app.");
        return false;
      }

      const projectId = getExpoProjectId();
      if (!projectId) {
        setSyncStatus("error");
        setError("Push alerts are not available in this build yet.");
        return false;
      }

      setSyncStatus("checking");

      let permissionStatus = await notifications.getPermissionsAsync();
      setPermissionState(normalizePermissionState(permissionStatus));

      if (!permissionStatus.granted && promptForPermission) {
        permissionStatus = await notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
          },
        });
        setPermissionState(normalizePermissionState(permissionStatus));
      }

      if (!permissionStatus.granted) {
        setSyncStatus(permissionStatus.canAskAgain ? "disabled" : "denied");
        setError(
          permissionStatus.canAskAgain
            ? "Push permission has not been granted yet."
            : "Push permission is denied for this device. Enable it from system settings to receive banners.",
        );
        return false;
      }

      try {
        await ensureAndroidChannels();
        const nextToken = await notifications.getExpoPushTokenAsync({
          projectId,
          ...(Platform.OS === "ios"
            ? { development: getMobilePushEnvironment() === "development" }
            : {}),
        });
        return await registerExpoPushToken(nextToken.data);
      } catch (cause) {
        setSyncStatus("error");
        setError(trimErrorMessage(cause));
        return false;
      }
    },
    [ensureAndroidChannels, registerExpoPushToken],
  );

  useEffect(() => {
    void ensureAndroidChannels();
  }, [ensureAndroidChannels]);

  const requestEnablePush = useCallback(async () => {
    const registered = await ensureRegistered({ promptForPermission: true });
    await updatePushPreference(registered);
    return registered;
  }, [ensureRegistered, updatePushPreference]);

  const disablePush = useCallback(async () => {
    try {
      await unregisterCurrentDevice();
    } finally {
      await updatePushPreference(false);
      setSyncStatus("disabled");
      setError(undefined);
    }
  }, [unregisterCurrentDevice, updatePushPreference]);

  const refreshRegistration = useCallback(async () => {
    if (!pushEnabledRef.current) {
      setSyncStatus("disabled");
      return;
    }
    await ensureRegistered({ promptForPermission: false });
  }, [ensureRegistered]);

  const handleNotificationResponse = useCallback(
    async (response: NotificationsModule.NotificationResponse | null) => {
      if (!response) {
        return;
      }

      const identifier = response.notification.request.identifier;
      if (handledResponseIdsRef.current.has(identifier)) {
        return;
      }

      handledResponseIdsRef.current.add(identifier);
      const href = mapNotificationPayloadToHref(response.notification.request.content.data);
      if (status === "authenticated") {
        router.push(href as never);
      } else {
        setPendingHref(href);
      }

      try {
        await notifications.clearLastNotificationResponseAsync();
      } catch {
        // Clearing cached responses is best effort only.
      }
    },
    [notifications, router, status],
  );

  useEffect(() => {
    let cancelled = false;

    async function syncPermissionState() {
      if (status !== "authenticated" || Platform.OS === "web") {
        return;
      }

      try {
        const permissionStatus = await notifications.getPermissionsAsync();
        if (!cancelled) {
          setPermissionState(normalizePermissionState(permissionStatus));
          if (!pushEnabledRef.current) {
            setSyncStatus("disabled");
          }
        }
      } catch (cause) {
        if (!cancelled) {
          setError(trimErrorMessage(cause));
        }
      }
    }

    void syncPermissionState();

    return () => {
      cancelled = true;
    };
  }, [notifications, status]);

  useEffect(() => {
    if (status !== "authenticated" || !effectivePreferences.pushEnabled) {
      if (status === "authenticated") {
        setSyncStatus("disabled");
      }
      return;
    }

    void ensureRegistered({ promptForPermission: false });
  }, [effectivePreferences.pushEnabled, ensureRegistered, status, activeOrgId]);

  useEffect(() => {
    const subscription = notifications.addPushTokenListener((nextToken) => {
      if (!pushEnabledRef.current) {
        return;
      }
      void registerExpoPushToken(nextToken.data);
    });

    return () => {
      subscription.remove();
    };
  }, [notifications, registerExpoPushToken]);

  useEffect(() => {
    if (Platform.OS === "web") {
      return;
    }

    const responseSubscription = notifications.addNotificationResponseReceivedListener(
      (response) => {
        void handleNotificationResponse(response);
      },
    );

    void notifications.getLastNotificationResponseAsync().then((response) => {
      void handleNotificationResponse(response);
    });

    return () => {
      responseSubscription.remove();
    };
  }, [handleNotificationResponse, notifications]);

  useEffect(() => {
    if (status === "authenticated" && pendingHref) {
      router.push(pendingHref as never);
      setPendingHref(undefined);
    }
  }, [pendingHref, router, status]);

  useEffect(() => {
    return registerLogoutCleanup(() => unregisterCurrentDevice());
  }, [registerLogoutCleanup, unregisterCurrentDevice]);

  const value = useMemo<PushNotificationsContextValue>(
    () => ({
      permissionState,
      syncStatus,
      pushToken,
      error,
      isExpoGo,
      projectIdConfigured,
      requestEnablePush,
      disablePush,
      refreshRegistration,
      openSystemSettings: () => Linking.openSettings(),
    }),
    [
      disablePush,
      error,
      isExpoGo,
      permissionState,
      projectIdConfigured,
      pushToken,
      refreshRegistration,
      requestEnablePush,
      syncStatus,
    ],
  );

  return (
    <PushNotificationsContext.Provider value={value}>{children}</PushNotificationsContext.Provider>
  );
}

export function usePushNotifications() {
  const context = useContext(PushNotificationsContext);
  if (!context) {
    throw new Error("usePushNotifications must be used inside PushNotificationsProvider");
  }
  return context;
}
