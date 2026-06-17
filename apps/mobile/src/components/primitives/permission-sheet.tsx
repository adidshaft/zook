import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { Camera } from "expo-camera";
import Constants from "expo-constants";
import * as Location from "expo-location";
import type * as NotificationsModule from "expo-notifications";

import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from "@/components/expo-safe-bottom-sheet";
import { getStoredValue, setStoredValue } from "@/lib/storage";
import { spacing, typography, useTheme } from "@/lib/theme";
import { ZookButton } from "./foundation";
import { IconBubble } from "./icon-bubble";

export type PermissionKind = "camera" | "location" | "notifications";

type PermissionStatus = {
  granted: boolean;
  canAskAgain?: boolean;
};

type PermissionCopy = {
  icon: "camera-outline" | "location-outline" | "notifications-outline";
  title: string;
  body: string;
};

const permissionCopy: Record<PermissionKind, PermissionCopy> = {
  camera: {
    icon: "camera-outline",
    title: "Allow camera access",
    body: "Zook uses the camera only when you scan a gym QR code.",
  },
  location: {
    icon: "location-outline",
    title: "Allow location access",
    body: "Zook checks your branch location only during an active check-in.",
  },
  notifications: {
    icon: "notifications-outline",
    title: "Allow notifications",
    body: "Get renewal reminders and approval updates.",
  },
};

const ASKED_PREFIX = "zook_permission_rationale_asked";
const NativeNotifications = (() => {
  if (Constants.executionEnvironment === "storeClient") {
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- Expo Go crashes if this native module is imported eagerly.
    return require("expo-notifications") as typeof NotificationsModule;
  } catch {
    return null;
  }
})();

export function useRequestPermissionWithRationale(kind: PermissionKind) {
  const sheetRef = useRef<BottomSheetModal>(null);
  const resolverRef = useRef<((granted: boolean) => void) | null>(null);
  const [status, setStatus] = useState<PermissionStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const snapPoints = useMemo(() => ["38%"], []);
  const { palette } = useTheme();
  const copy = permissionCopy[kind];
  const askedKey = `${ASKED_PREFIX}_${kind}`;

  const refreshStatus = useCallback(async () => {
    const next = await getPermissionStatus(kind);
    setStatus(next);
    return next;
  }, [kind]);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  const performRequest = useCallback(async () => {
    setBusy(true);
    try {
      const next = await requestPermission(kind);
      setStatus(next);
      return next.granted;
    } finally {
      setBusy(false);
    }
  }, [kind]);

  const requestPermissionWithRationale = useCallback(async () => {
    const current = await refreshStatus();
    if (current.granted) {
      return true;
    }
    if (current.canAskAgain === false) {
      return false;
    }

    const alreadyAsked = await getStoredValue(askedKey);
    if (alreadyAsked) {
      return performRequest();
    }

    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setTimeout(() => sheetRef.current?.present(), 0);
    });
  }, [askedKey, performRequest, refreshStatus]);

  const closeSheet = useCallback((granted: boolean) => {
    const resolve = resolverRef.current;
    resolverRef.current = null;
    sheetRef.current?.dismiss();
    resolve?.(granted);
  }, []);

  const allow = useCallback(async () => {
    await setStoredValue(askedKey, "1");
    const granted = await performRequest();
    closeSheet(granted);
  }, [askedKey, closeSheet, performRequest]);

  const dismiss = useCallback(async () => {
    await setStoredValue(askedKey, "1");
    closeSheet(false);
  }, [askedKey, closeSheet]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} pressBehavior="close" />
    ),
    [],
  );

  const rationaleSheet: ReactNode = (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={snapPoints}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={StyleSheet.flatten([
        styles.sheetBackground,
        { backgroundColor: palette.bg.elevated, borderColor: palette.border.subtle },
      ])}
      handleIndicatorStyle={StyleSheet.flatten([
        styles.sheetHandle,
        { backgroundColor: palette.border.strong },
      ])}
      onDismiss={() => {
        if (resolverRef.current) {
          void dismiss();
        }
      }}
    >
      <BottomSheetView style={styles.sheet}>
        <View style={styles.header}>
          <IconBubble icon={copy.icon} tone="blue" size={42} />
          <View style={styles.copy}>
            <Text style={[styles.title, { color: palette.text.primary }]}>{copy.title}</Text>
            <Text style={[styles.body, { color: palette.text.secondary }]}>{copy.body}</Text>
          </View>
        </View>
        <View style={styles.actions}>
          <ZookButton onPress={() => void allow()} disabled={busy} busy={busy} icon={copy.icon} style={styles.action}>
            Allow
          </ZookButton>
          <ZookButton onPress={() => void dismiss()} disabled={busy} variant="secondary" style={styles.action}>
            Not now
          </ZookButton>
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );

  return {
    busy,
    permissionSheet: rationaleSheet,
    refreshStatus,
    requestPermission: requestPermissionWithRationale,
    status,
  };
}

async function getPermissionStatus(kind: PermissionKind): Promise<PermissionStatus> {
  if (kind === "camera") {
    return Camera.getCameraPermissionsAsync();
  }
  if (kind === "location") {
    return Location.getForegroundPermissionsAsync();
  }
  if (Platform.OS === "web" || !NativeNotifications) {
    return { granted: false, canAskAgain: false };
  }
  return NativeNotifications.getPermissionsAsync();
}

async function requestPermission(kind: PermissionKind): Promise<PermissionStatus> {
  if (kind === "camera") {
    return Camera.requestCameraPermissionsAsync();
  }
  if (kind === "location") {
    return Location.requestForegroundPermissionsAsync();
  }
  if (Platform.OS === "web" || !NativeNotifications) {
    return { granted: false, canAskAgain: false };
  }
  return NativeNotifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
    },
  });
}

const styles = StyleSheet.create({
  sheetBackground: {
    borderTopWidth: 1,
  },
  sheetHandle: {
    width: 44,
  },
  sheet: {
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "flex-start",
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
  action: {
    flex: 1,
  },
});
