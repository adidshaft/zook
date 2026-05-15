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
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ZookButton } from "@/components/primitives";
import { useAuth } from "@/lib/auth";
import { setStoredValue } from "@/lib/storage";
import { colors } from "@/lib/theme";

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
  { label: "I run a gym", body: "Open the gym setup flow on the web.", action: "owner", icon: "business-outline" },
  { label: "I'm a trainer", body: "Remember trainer interest for coach tools.", action: "trainer", icon: "barbell-outline" },
  {
    label: "I work the front desk",
    body: "Remember desk interest for reception tools.",
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
  const [activeIndex, setActiveIndex] = useState(0);
  const cardWidth = Math.max(280, Math.min(520, width - 48));

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((current) => {
        const next = Math.min(current + 1, valueProps.length - 1);
        scrollRef.current?.scrollTo({ x: next * cardWidth, animated: true });
        return next;
      });
    }, 2600);

    return () => clearInterval(timer);
  }, [cardWidth]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 22, paddingBottom: insets.bottom + 22 }]}>
      <View style={styles.header}>
        <Text style={styles.brand}>Zook</Text>
        <Text style={styles.kicker}>Built for gym days</Text>
      </View>

      <View style={styles.valueStage}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          snapToInterval={cardWidth}
          onMomentumScrollEnd={(event) => {
            setActiveIndex(Math.round(event.nativeEvent.contentOffset.x / cardWidth));
          }}
          scrollEventThrottle={16}
        >
          {valueProps.map((copy, index) => (
            <View key={copy} style={[styles.valueCard, { width: cardWidth }]}>
              <Text style={styles.valueNumber}>0{index + 1}</Text>
              <Text style={styles.valueCopy}>{copy}</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {valueProps.map((copy, index) => (
            <View
              key={copy}
              style={[styles.dot, activeIndex === index ? styles.dotActive : null]}
            />
          ))}
        </View>
        <ZookButton onPress={() => router.push("/onboarding/permissions" as never)}>
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
    <View style={[styles.screen, { paddingTop: insets.top + 22, paddingBottom: insets.bottom + 22 }]}>
      <View style={styles.header}>
        <Text style={styles.brand}>Zook works best with:</Text>
        <Text style={styles.kicker}>You can change any permission later.</Text>
      </View>

      <View style={styles.permissionList}>
        {permissionRows.map((row) => (
          <View key={row.title} style={styles.permissionRow}>
            <View style={styles.permissionIcon}>
              <Ionicons name={row.icon} size={22} color={colors.lime} />
            </View>
            <View style={styles.permissionCopy}>
              <Text style={styles.permissionTitle}>{row.title}</Text>
              <Text style={styles.permissionBody}>{row.body}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.footer}>
        <ZookButton onPress={continueToLogin} disabled={busy}>
          {busy ? "Opening prompts" : "Continue"}
        </ZookButton>
        <ZookButton
          tone="secondary"
          onPress={async () => {
            await setStoredValue(ONBOARDING_STORAGE_KEY, INTRO_COMPLETE);
            router.replace("/login" as never);
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
  await Linking.openSettings();
}

export function RoleQuestionStep() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const [busyAction, setBusyAction] = useState<string | null>(null);

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
        await Linking.openURL("https://zookfit.in/start-gym?return=zook://");
      } else if (action !== "member") {
        await setStoredValue("zook_onboarding_role_interest", action);
      }
      await setStoredValue(ONBOARDING_STORAGE_KEY, COMPLETED);
      router.replace(action === "member" ? ("/find-gyms" as never) : ("/" as never));
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 22, paddingBottom: insets.bottom + 22 }]}>
      <View style={styles.header}>
        <Text style={styles.brand}>What brings you to Zook?</Text>
        <Text style={styles.kicker}>Pick the closest fit so we can start you in the right place.</Text>
      </View>

      <View style={styles.roleList}>
        {roleOptions.map((option) => (
          <Pressable
            key={option.action}
            onPress={() => void chooseRole(option.action)}
            disabled={Boolean(busyAction)}
            style={({ pressed }) => [
              styles.roleOption,
              pressed && !busyAction ? styles.roleOptionPressed : null,
            ]}
            accessibilityRole="button"
            accessibilityLabel={option.label}
          >
            <View style={styles.roleIcon}>
              <Ionicons name={option.icon} size={22} color={colors.lime} />
            </View>
            <View style={styles.roleOptionCopy}>
              <Text style={styles.roleLabel}>{option.label}</Text>
              <Text style={styles.roleBody}>{option.body}</Text>
            </View>
            {busyAction === option.action ? (
              <ActivityIndicator color={colors.lime} />
            ) : (
              <Ionicons name="chevron-forward" size={20} color={colors.muted} />
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
    backgroundColor: colors.bg,
    paddingHorizontal: 24,
  },
  header: {
    gap: 8,
  },
  brand: {
    color: colors.text,
    fontFamily: "Inter_800ExtraBold",
    fontSize: 32,
    lineHeight: 38,
  },
  kicker: {
    color: colors.muted,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    lineHeight: 22,
  },
  valueStage: {
    overflow: "hidden",
  },
  valueCard: {
    minHeight: 300,
    justifyContent: "space-between",
    padding: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
  },
  valueNumber: {
    color: colors.lime,
    fontFamily: "Inter_800ExtraBold",
    fontSize: 13,
  },
  valueCopy: {
    color: colors.text,
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
    backgroundColor: colors.borderStrong,
  },
  dotActive: {
    width: 22,
    backgroundColor: colors.lime,
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
    borderColor: colors.border,
    backgroundColor: colors.panel,
  },
  permissionIcon: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 23,
    backgroundColor: colors.accentPanel,
  },
  permissionCopy: {
    flex: 1,
    gap: 3,
  },
  permissionTitle: {
    color: colors.text,
    fontFamily: "Inter_700Bold",
    fontSize: 16,
  },
  permissionBody: {
    color: colors.muted,
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
    color: colors.bg,
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
    borderColor: colors.border,
    backgroundColor: colors.panel,
  },
  roleOptionPressed: {
    borderColor: colors.limeBorder,
    backgroundColor: colors.accentPanel,
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
    backgroundColor: colors.accentPanel,
  },
  roleLabel: {
    color: colors.text,
    fontFamily: "Inter_700Bold",
    fontSize: 16,
  },
  roleBody: {
    color: colors.muted,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 18,
  },
});
