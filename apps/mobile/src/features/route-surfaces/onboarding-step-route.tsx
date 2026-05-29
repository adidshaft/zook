import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  PermissionsAndroid,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useCameraPermissions } from "expo-camera";
import * as Location from "expo-location";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ZookButton } from "@/components/primitives";
import { useAuth } from "@/lib/auth";
import { setStoredValue } from "@/lib/storage";
import { getMobileWebBaseUrl } from "@/lib/api";
import { legacyColors, useTheme } from "@/lib/theme";
import { showToast } from "@/lib/toast";

const ONBOARDING_STORAGE_KEY = "zook_onboarding_completed";
const INTRO_COMPLETE = "intro";
const COMPLETED = "true";

const valueProps = [
  "Find a gym near you. Pune, Mumbai, Bengaluru, Delhi, and 50+ cities.",
  "Scan in seconds. Track every workout. See your progress.",
  "Plans, payments, and pickup — all in one app.",
];

const permissionRows = [
  {
    icon: "camera-outline",
    title: "Camera",
    body: "to check in",
  },
  {
    icon: "location-outline",
    title: "Location",
    body: "to find nearby gyms",
  },
] as const;

const roleOptions = [
  { label: "Join a gym", body: "Find nearby gyms and start as a member.", action: "member", icon: "walk-outline" },
  { label: "I run a gym", body: "Set up your gym on the web dashboard.", action: "owner", icon: "business-outline" },
  { label: "I'm a trainer", body: "Your gym adds you — sign in once they send an invite.", action: "trainer", icon: "barbell-outline" },
  {
    label: "I work the front desk",
    body: "Your gym adds you — sign in once they send an invite.",
    action: "front_desk",
    icon: "desktop-outline",
  },
] as const;

export default function OnboardingStep() {
  const { step } = useLocalSearchParams<{ step?: string }>();

  if (step === "permissions") {
    return <PermissionsStep />;
  }

  if (step === "role-question") {
    return <RoleQuestionStep />;
  }

  return <ValuePropsStep />;
}

export function ValuePropsStep() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [userScrolled, setUserScrolled] = useState(false);
  const cardWidth = Math.max(280, Math.min(520, width - 48));
  const { palette } = useTheme();

  useEffect(() => {
    if (userScrolled) {
      return undefined;
    }
    timerRef.current = setInterval(() => {
      setActiveIndex((current) => {
        const next = Math.min(current + 1, valueProps.length - 1);
        if (next === current) {
          return current;
        }
        scrollRef.current?.scrollTo({ x: next * cardWidth, animated: true });
        return next;
      });
    }, 2600);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [cardWidth, userScrolled]);

  function stopAutoScroll() {
    setUserScrolled(true);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  return (
    <View
      testID="onboarding-value-props-screen"
      style={[styles.screen, { backgroundColor: palette.bg.app, paddingTop: insets.top + 22, paddingBottom: insets.bottom + 22 }]}
    >
      <View style={styles.header}>
        <Text style={[styles.brand, { color: palette.text.primary }]}>Zook</Text>
        <Text style={[styles.kicker, { color: palette.text.secondary }]}>Built for gym days</Text>
      </View>

      <View style={styles.valueStage}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          snapToInterval={cardWidth}
          onScrollBeginDrag={stopAutoScroll}
          onMomentumScrollEnd={(event) => {
            setActiveIndex(Math.round(event.nativeEvent.contentOffset.x / cardWidth));
          }}
          scrollEventThrottle={16}
        >
          {valueProps.map((copy, index) => (
            <View key={copy} style={[styles.valueCard, { backgroundColor: palette.bg.elevated, borderColor: palette.border.subtle, borderRadius: 24, width: cardWidth }]}>
              <Text style={[styles.valueNumber, { color: palette.accent.base }]}>0{index + 1}</Text>
              <Text style={[styles.valueCopy, { color: palette.text.primary }]}>{copy}</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {valueProps.map((copy, index) => (
            <View
              key={copy}
              style={[
                styles.dot,
                { backgroundColor: palette.border.strong },
                activeIndex === index ? { backgroundColor: palette.accent.base, width: 22 } : null,
              ]}
            />
          ))}
        </View>
        <ZookButton
          testID="onboarding-value-continue"
          onPress={() => router.push("/onboarding/permissions" as never)}
        >
          Continue
        </ZookButton>
      </View>
    </View>
  );
}

export function PermissionsStep() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [, requestCameraPermission] = useCameraPermissions();
  const [busy, setBusy] = useState(false);
  const { palette } = useTheme();

  async function continueToLogin() {
    setBusy(true);
    try {
      await requestCameraPermission();
      await requestLocationPermission();
      await setStoredValue(ONBOARDING_STORAGE_KEY, INTRO_COMPLETE);
      router.replace("/login" as never);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View
      testID="onboarding-permissions-screen"
      style={[styles.screen, { backgroundColor: palette.bg.app, paddingTop: insets.top + 22, paddingBottom: insets.bottom + 22 }]}
    >
      <View style={styles.header}>
        <Text style={[styles.brand, { color: palette.text.primary }]}>Zook works best with:</Text>
        <Text style={[styles.kicker, { color: palette.text.secondary }]}>You can change any permission later.</Text>
      </View>

      <View style={styles.permissionList}>
        {permissionRows.map((row) => (
          <View key={row.title} style={[styles.permissionRow, { backgroundColor: palette.bg.elevated, borderColor: palette.border.subtle, borderRadius: 20 }]}>
            <View style={[styles.permissionIcon, { backgroundColor: palette.surface.accentSoft }]}>
              <Ionicons name={row.icon} size={22} color={palette.accent.base} />
            </View>
            <View style={styles.permissionCopy}>
              <Text style={[styles.permissionTitle, { color: palette.text.primary }]}>{row.title}</Text>
              <Text style={[styles.permissionBody, { color: palette.text.secondary }]}>{row.body}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.footer}>
        <ZookButton
          testID="onboarding-allow-permissions"
          onPress={continueToLogin}
          disabled={busy}
        >
          {busy ? "Opening prompts" : "Continue"}
        </ZookButton>
        <ZookButton
          testID="onboarding-skip-permissions"
          tone="secondary"
          onPress={async () => {
            try {
              await setStoredValue(ONBOARDING_STORAGE_KEY, INTRO_COMPLETE);
              router.replace("/login" as never);
            } catch {
              showToast({
                title: "Couldn't save preference",
                message: "Try again.",
                tone: "amber",
                haptic: "warning",
              });
            }
          }}
          disabled={busy}
        >
          Not now
        </ZookButton>
      </View>
    </View>
  );
}

async function requestLocationPermission() {
  if (Platform.OS === "android") {
    await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
    return;
  }
  await Location.requestForegroundPermissionsAsync();
}

export function RoleQuestionStep() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const { palette } = useTheme();

  useEffect(() => {
    if ((session?.organizations.length ?? 0) > 0) {
      void setStoredValue(ONBOARDING_STORAGE_KEY, COMPLETED).then(() => {
        router.replace("/" as never);
      });
    }
  }, [router, session?.organizations.length]);

  async function chooseRole(action: (typeof roleOptions)[number]["action"]) {
    setBusyAction(action);
    try {
      if (action === "owner") {
        await Linking.openURL(`${getMobileWebBaseUrl()}/start-gym?return=zook://`);
      } else if (action !== "member") {
        await setStoredValue("zook_onboarding_role_interest", action);
      }
      await setStoredValue(ONBOARDING_STORAGE_KEY, COMPLETED);
      router.replace(action === "member" ? ("/gyms" as never) : ("/" as never));
    } catch {
      showToast({
        title: "Couldn't save preference",
        message: "Try again.",
        tone: "amber",
        haptic: "warning",
      });
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <View
      testID="onboarding-role-question-screen"
      style={[styles.screen, { backgroundColor: palette.bg.app, paddingTop: insets.top + 22, paddingBottom: insets.bottom + 22 }]}
    >
      <View style={styles.header}>
        <Text style={[styles.brand, { color: palette.text.primary }]}>What brings you to Zook?</Text>
        <Text style={[styles.kicker, { color: palette.text.secondary }]}>Pick the closest fit so we can start you in the right place.</Text>
      </View>

      <View style={styles.roleList}>
        {roleOptions.map((option) => (
          <Pressable
            testID={`onboarding-role-${option.action}`}
            key={option.action}
            onPress={() => void chooseRole(option.action)}
            disabled={Boolean(busyAction)}
            style={({ pressed }) => [
              styles.roleOption,
              { backgroundColor: palette.bg.elevated, borderColor: palette.border.subtle, borderRadius: 20 },
              pressed && !busyAction ? { borderColor: palette.accent.base, backgroundColor: palette.surface.accentSoft } : null,
            ]}
            accessibilityRole="button"
            accessibilityLabel={option.label}
          >
            <View style={[styles.roleIcon, { backgroundColor: palette.surface.accentSoft }]}>
              <Ionicons name={option.icon} size={22} color={palette.accent.base} />
            </View>
            <View style={styles.roleOptionCopy}>
              <Text style={[styles.roleLabel, { color: palette.text.primary }]}>{option.label}</Text>
              <Text style={[styles.roleBody, { color: palette.text.secondary }]}>{option.body}</Text>
            </View>
            {busyAction === option.action ? (
              <ActivityIndicator color={palette.accent.base} />
            ) : (
              <Ionicons name="chevron-forward" size={20} color={palette.text.tertiary} />
            )}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 24,
  },
  header: {
    gap: 8,
  },
  brand: {
    color: legacyColors.text,
    fontFamily: "Inter_800ExtraBold",
    fontSize: 32,
    lineHeight: 38,
  },
  kicker: {
    color: legacyColors.muted,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    lineHeight: 22,
  },
  valueStage: {
    overflow: "hidden",
    alignSelf: "stretch",
  },
  valueCard: {
    minHeight: 300,
    justifyContent: "space-between",
    padding: 22,
    borderWidth: 1,
    borderColor: legacyColors.border,
    backgroundColor: legacyColors.panel,
  },
  valueNumber: {
    color: legacyColors.lime,
    fontFamily: "Inter_800ExtraBold",
    fontSize: 13,
  },
  valueCopy: {
    color: legacyColors.text,
    fontFamily: "Inter_800ExtraBold",
    fontSize: 28,
    lineHeight: 34,
  },
  footer: {
    gap: 20,
  },
  dots: {
    flexDirection: "row",
    alignSelf: "center",
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: legacyColors.borderStrong,
  },
  dotActive: {
    width: 22,
    backgroundColor: legacyColors.lime,
  },
  permissionList: {
    gap: 12,
  },
  permissionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: legacyColors.border,
    backgroundColor: legacyColors.panel,
  },
  permissionIcon: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 23,
    backgroundColor: legacyColors.accentPanel,
  },
  permissionCopy: {
    flex: 1,
    gap: 3,
  },
  permissionTitle: {
    color: legacyColors.text,
    fontFamily: "Inter_700Bold",
    fontSize: 16,
  },
  permissionBody: {
    color: legacyColors.muted,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 20,
  },
  busyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  busyText: {
    color: legacyColors.bg,
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
  roleList: {
    gap: 12,
  },
  roleOption: {
    minHeight: 84,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: legacyColors.border,
    backgroundColor: legacyColors.panel,
  },
  roleOptionPressed: {
    borderColor: legacyColors.limeBorder,
    backgroundColor: legacyColors.accentPanel,
  },
  roleOptionCopy: {
    flex: 1,
    gap: 4,
  },
  roleIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: legacyColors.accentPanel,
  },
  roleLabel: {
    color: legacyColors.text,
    fontFamily: "Inter_700Bold",
    fontSize: 16,
  },
  roleBody: {
    color: legacyColors.muted,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 18,
  },
});
