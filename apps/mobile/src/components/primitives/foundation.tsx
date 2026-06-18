import { Link, useLocalSearchParams, usePathname, useRouter } from "expo-router";
import type { Href } from "expo-router";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useContext, useEffect, type ReactNode } from "react";
import {
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  View,
  type ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle as useRealAnimatedStyle,
  useSharedValue as useRealSharedValue,
  withSpring as withRealSpring,
} from "@/lib/reanimated-lite";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Role } from "@zook/core";
import { useI18n, type TranslationKey } from "@/lib/i18n";
import { useRoleContext } from "@/lib/role-context";
import { useMyNotifications, useOrgAttendancePending } from "@/lib/domains";
import { elevation, layout, materials, radii, shadows, spacing, typography, useTheme } from "@/lib/theme";
import type { Palette } from "@/lib/theme";
import { darkPalette } from "@zook/tokens";
import { BottomNavVisibilityContext } from "@/components/primitives/bottom-nav-context";
import {
  PrimaryButton as SharedPrimaryButton,
  SecondaryButton as SharedSecondaryButton,
  ZookButton as SharedZookButton,
} from "./buttons";
export {
  InfoRow,
  MetricTile,
  StatusRing,
} from "./metric-primitives";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";
type CardVariant = "default" | "compact" | "selected" | "success" | "warning" | "danger";
export type SemanticSurface =
  | "screen"
  | "card"
  | "taskCard"
  | "dangerCard"
  | "warningCard"
  | "successCard"
  | "moneyFlowCard"
  | "handoffCard";
type CardGlowTone = "lime" | "amber" | "red" | "success";
type CardSurface = "content" | "interactive" | "floating";
type BrandMarkSize = "sm" | "md" | "lg";
type IconName = keyof typeof Ionicons.glyphMap;
type ThemeMode = "light" | "dark";
export type { PillTone } from "./tone-palette";
export { getTonePalette, useTonePalette } from "./tone-palette";
export { IconBubble } from "./icon-bubble";
export { ProfileShortcut } from "./profile-shortcut";
export {
  BranchSelectorChip,
  Pill,
  StatusChip,
  ZookChip,
} from "./chips";

// Metro resolves static image requires at build time.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const zookMarkSource = require("../../../assets/icons/app-icon-512.png");
const fallbackColors = {
  bg: "#000000",
  text: "#FFFFFF",
  muted: "#D4DDD0",
  subtle: "#99A595",
  lime: darkPalette.accent.base,
  limeBorder: "rgba(185,244,85,0.26)",
  amber: "#F2C94C",
  red: "#FF5A3D",
  blue: "#7DD3FC",
  violet: "#B9A9FF",
  border: "rgba(255,255,255,0.18)",
  borderStrong: "rgba(255,255,255,0.28)",
  divider: "rgba(255,255,255,0.11)",
  panel: "rgba(255,255,255,0.06)",
  panelStrong: "rgba(255,255,255,0.10)",
  glassFill: "rgba(255,255,255,0.06)",
  glassStroke: "rgba(255,255,255,0.18)",
  accentPanel: "rgba(185,244,85,0.12)",
};

const brandMarkSizes: Record<BrandMarkSize, number> = {
  sm: 32,
  md: 44,
  lg: 56,
};

const glassGlowStyles: Record<CardGlowTone, ViewStyle> = {
  lime: shadows.glowLimeSoft,
  success: shadows.glowLimeSoft,
  amber: shadows.glowAmberSoft,
  red: shadows.glowRedSoft,
};

function platformSurfaceShadow(
  mode: ThemeMode,
  elevated = false,
  shadowColor?: string,
): ViewStyle | null {
  if (!elevated) {
    return null;
  }

  return elevation(2, shadowColor ?? fallbackColors.bg, {
    shadowOpacity: mode === "dark" ? 0.22 : 0.09,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  });
}

function glassSurfaceColors(
  mode: ThemeMode,
  palette: Palette,
  variant: CardVariant,
  surface: CardSurface,
): { backgroundColor: string; borderColor: string; blurIntensity: number; blurTint: "dark" | "light" } {
  const isDark = mode === "dark";
  const cardMaterial = materials.cardSurface(mode);
  const blurIntensity = variant === "compact" ? (isDark ? 18 : 12) : isDark ? 24 : 16;
  const blurTint = isDark ? "dark" : "light";

  if (variant === "selected") {
    return {
      backgroundColor: palette.surface.accentSoft,
      borderColor: palette.border.focus,
      blurIntensity: isDark ? 20 : 14,
      blurTint,
    };
  }

  if (variant === "success") {
    return {
      backgroundColor: palette.surface.successSoft,
      borderColor: palette.feedback.success,
      blurIntensity: isDark ? 20 : 14,
      blurTint,
    };
  }

  if (variant === "warning") {
    return {
      backgroundColor: palette.surface.warningSoft,
      borderColor: palette.feedback.warning,
      blurIntensity: isDark ? 20 : 14,
      blurTint,
    };
  }

  if (variant === "danger") {
    return {
      backgroundColor: palette.surface.dangerSoft,
      borderColor: palette.feedback.danger,
      blurIntensity: isDark ? 20 : 14,
      blurTint,
    };
  }

  return {
    backgroundColor: surface === "content" ? cardMaterial.backgroundColor : palette.surface.raised,
    borderColor: surface === "content" ? cardMaterial.borderColor : palette.border.default,
    blurIntensity,
    blurTint,
  };
}

function variantForSemanticSurface(surface?: SemanticSurface): CardVariant | undefined {
  if (surface === "successCard") return "success";
  if (surface === "warningCard" || surface === "moneyFlowCard" || surface === "handoffCard") {
    return "warning";
  }
  if (surface === "dangerCard") return "danger";
  if (surface === "taskCard") return "selected";
  return undefined;
}

export type HapticWeight = "light" | "medium" | "heavy" | "selection" | "success" | "warning" | "error" | "none";

type PressHandler = () => void | Promise<void>;

export function pressWithHaptics(callback?: PressHandler, weight: HapticWeight = "light") {
  if (weight !== "none") {
    if (weight === "selection") void Haptics.selectionAsync();
    else if (weight === "success") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else if (weight === "warning") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    else if (weight === "error") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    else if (weight === "heavy") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    else if (weight === "medium") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    else void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
  const result = callback?.();
  if (result && typeof (result as Promise<void>).catch === "function") {
    void (result as Promise<void>).catch((error) => {
      console.error("Zook press action failed", error);
    });
  }
}

export function ZookScreen({
  children,
  bottomInset = false,
  style,
  ambient = true,
  testID,
}: {
  children: ReactNode;
  bottomInset?: boolean;
  style?: StyleProp<ViewStyle>;
  ambient?: boolean;
  testID?: string;
}) {
  const insets = useSafeAreaInsets();
  const { palette } = useTheme();
  return (
    <View
      testID={testID}
      style={[
        styles.screen,
        {
          paddingTop: insets.top,
          paddingBottom: bottomInset ? insets.bottom : 0,
          backgroundColor: palette.bg.app,
        },
        style,
      ]}
    >
      {ambient ? (
        <>
          <View
            pointerEvents="none"
            style={[
              styles.ambientGlow,
              Platform.OS === "android" ? styles.androidAmbientGlow : null,
              {
                backgroundColor: palette.surface.accentSoft,
              },
            ]}
          />
          <View
            pointerEvents="none"
            style={[
              styles.ambientWash,
              Platform.OS === "android" ? styles.androidAmbientWash : null,
              {
                backgroundColor: palette.surface.default,
              },
            ]}
          />
        </>
      ) : null}
      {children}
    </View>
  );
}

export function BrandMark({
  size = "md",
  framed = true,
  style,
}: {
  size?: BrandMarkSize;
  framed?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const dimension = brandMarkSizes[size];

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel="Zook"
      style={[
        styles.brandMark,
        framed ? styles.brandMarkFramed : null,
        { width: dimension, height: dimension },
        style,
      ]}
    >
      <Image source={zookMarkSource} style={styles.brandMarkImage} contentFit="contain" />
    </View>
  );
}

export function Card({
  children,
  style,
  contentStyle,
  glow = false,
  glowTone,
  variant = "default",
  padding,
  radius,
  pressable = false,
  surface,
  semanticSurface,
  disabled = false,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  accessibilityValue,
  testID,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  glow?: boolean;
  glowTone?: CardGlowTone;
  variant?: CardVariant;
  semanticSurface?: SemanticSurface;
  padding?: number;
  radius?: number;
  pressable?: boolean;
  surface?: CardSurface;
  disabled?: boolean;
  onPress?: PressHandler;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityValue?: {
    min?: number;
    max?: number;
    now?: number;
    text?: string;
  };
  testID?: string;
}) {
  const { mode, palette } = useTheme();
  const resolvedVariant = variantForSemanticSurface(semanticSurface) ?? variant;
  const resolvedGlowTone = glowTone ?? (glow ? "lime" : undefined);
  const resolvedRadius = radius ?? (resolvedVariant === "compact" ? radii.smallCard : radii.mainCard);
  const resolvedSurface = surface ?? (pressable || onPress ? "interactive" : "content");
  const surfaceColors = glassSurfaceColors(mode, palette, resolvedVariant, resolvedSurface);
  const cardMaterial = materials.cardSurface(mode);
  const shouldElevate =
    mode === "light" ||
    resolvedSurface === "floating" ||
    resolvedSurface === "interactive" ||
    Boolean(resolvedGlowTone);

  // Android draws `elevation` shadows behind the view; when the same view
  // has `overflow: hidden`, the shadow gets clipped *inside* the card and
  // shows up as a phantom dark rectangle behind the content. Split the
  // shadow onto an outer wrapper (no clipping) and keep border + bg + clip
  // on an inner card so the shadow renders cleanly on both platforms.
  const outerStyle: StyleProp<ViewStyle> = [
    { borderRadius: resolvedRadius },
    platformSurfaceShadow(
      mode,
      shouldElevate,
      palette.bg.sunken,
    ),
    resolvedGlowTone ? glassGlowStyles[resolvedGlowTone] : null,
    disabled ? styles.disabled : null,
    style,
  ];
  const innerStyle: StyleProp<ViewStyle> = [
    styles.glassCard,
    {
      backgroundColor: surfaceColors.backgroundColor,
      borderColor: surfaceColors.borderColor,
      borderRadius: resolvedRadius,
    },
    resolvedGlowTone ? styles.glassCardGlowBorder : null,
  ];
  const inner = (
    <View style={innerStyle}>
      {resolvedVariant === "default" || resolvedVariant === "compact" ? (
        <View
          pointerEvents="none"
          style={[
            styles.cardInnerTopHighlight,
            { backgroundColor: cardMaterial.innerTopHighlight },
          ]}
        />
      ) : null}
      {Platform.OS === "ios" && resolvedSurface !== "content" ? (
        <BlurView
          pointerEvents="none"
          intensity={surfaceColors.blurIntensity}
          tint={surfaceColors.blurTint}
          // iOS composes BlurView above sibling flex children unless we
          // explicitly pin it behind — without this, primary buttons inside
          // a tinted card lose contrast under the blur overlay.
          style={[StyleSheet.absoluteFillObject, styles.glassCardBlurLayer]}
        />
      ) : null}
      <View
        style={[
          styles.glassContent,
          Platform.OS === "ios" ? styles.glassContentLayer : null,
          padding !== undefined ? { padding } : null,
          contentStyle,
        ]}
      >
        {children}
      </View>
    </View>
  );

  if (pressable || onPress) {
    return (
      <Pressable
        testID={testID}
        disabled={disabled}
        onPress={() => pressWithHaptics(onPress)}
        android_ripple={{ color: palette.surface.accentSoft, borderless: false }}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessibilityValue={accessibilityValue}
        accessibilityState={{ disabled }}
        style={({ pressed }) => [outerStyle, pressed && !disabled ? styles.pressed : null]}
      >
        {inner}
      </Pressable>
    );
  }

  return (
    <View testID={testID} style={outerStyle}>
      {inner}
    </View>
  );
}

export const ZookButton = SharedZookButton;
export const PrimaryButton = SharedPrimaryButton;
export const SecondaryButton = SharedSecondaryButton;

type DockTab = {
  href: Href;
  label: string;
  accessibilityLabel?: string;
  icon: IconName;
  activeIcon: IconName;
  matchPath: string;
  activeView?: string;
  raised?: boolean;
  hideLabel?: boolean;
};

const navTranslationKeys: Record<string, TranslationKey> = {
  Home: "nav.home",
  Plan: "nav.plans",
  Plans: "nav.plans",
  "Check in": "nav.checkIn",
  "Check-in": "nav.checkIn",
  Scan: "nav.scan",
  Track: "nav.tracking",
  Tracking: "nav.tracking",
  More: "nav.more",
  Shop: "nav.shop",
  Inbox: "nav.inbox",
  AI: "nav.assistant",
  Trainer: "nav.trainer",
  Clients: "nav.clients",
  Drafts: "nav.drafts",
  "Front desk": "nav.desk",
  Members: "nav.members",
  Payments: "nav.payments",
  Orders: "nav.orders",
  Owner: "nav.owner",
  Needs: "nav.needs",
  Approvals: "nav.approvals",
  Revenue: "nav.revenue",
  Stock: "nav.stock",
  Today: "nav.command",
  You: "nav.profile",
};

function translatedNavLabel(label: string, t: ReturnType<typeof useI18n>["t"]) {
  const key = navTranslationKeys[label];
  return key ? t(key) : label;
}

const memberTabs: DockTab[] = [
  { href: "/", label: "Home", icon: "home-outline", activeIcon: "home", matchPath: "/" },
  {
    href: "/tracking" as Href,
    label: "Track",
    icon: "barbell-outline",
    activeIcon: "barbell",
    matchPath: "/tracking",
  },
  {
    href: "/scan",
    label: "Scan",
    accessibilityLabel: "Scan QR",
    icon: "qr-code-outline",
    activeIcon: "qr-code",
    matchPath: "/scan",
    raised: true,
    hideLabel: true,
  },
  {
    href: "/shop" as Href,
    label: "Shop",
    icon: "bag-outline",
    activeIcon: "bag",
    matchPath: "/shop",
  },
  {
    href: "/profile" as Href,
    label: "You",
    icon: "person-outline",
    activeIcon: "person",
    matchPath: "/profile",
  },
];

/** compat Trainer routes own their tab bar in app/trainer/_layout.tsx. */
const trainerTabs: DockTab[] = [
  {
    href: "/trainer",
    label: "Home",
    icon: "home-outline",
    activeIcon: "home",
    matchPath: "/trainer",
  },
  {
    href: "/trainer/clients" as Href,
    label: "Clients",
    icon: "people-outline",
    activeIcon: "people",
    matchPath: "/trainer",
    activeView: "clients",
  },
  {
    href: "/trainer/plans" as Href,
    label: "Plans",
    icon: "reader-outline",
    activeIcon: "reader",
    matchPath: "/trainer",
    activeView: "plans",
  },
  {
    href: "/notifications",
    label: "Inbox",
    icon: "chatbubble-outline",
    activeIcon: "chatbubble",
    matchPath: "/notifications",
  },
  {
    href: "/profile" as Href,
    label: "You",
    icon: "person-outline",
    activeIcon: "person",
    matchPath: "/profile",
  },
];

/** compat Reception owns local tabs in app/reception/_layout.tsx. */
const receptionTabs: DockTab[] = [
  {
    href: "/reception",
    label: "Front desk",
    icon: "desktop-outline",
    activeIcon: "desktop",
    matchPath: "/reception",
  },
  {
    href: "/reception/members" as Href,
    label: "Members",
    icon: "people-outline",
    activeIcon: "people",
    matchPath: "/reception",
    activeView: "members",
  },
  {
    href: "/reception/payments" as Href,
    label: "Payments",
    icon: "card-outline",
    activeIcon: "card",
    matchPath: "/reception",
    activeView: "payments",
  },
  {
    href: "/reception/orders" as Href,
    label: "Orders",
    icon: "cube-outline",
    activeIcon: "cube",
    matchPath: "/reception",
    activeView: "orders",
  },
  {
    href: "/profile" as Href,
    label: "You",
    icon: "person-outline",
    activeIcon: "person",
    matchPath: "/profile",
  },
];

/** compat Owner routes now render their own Expo Router tab layout. Plan #11 removes this. */
const ownerTabs: DockTab[] = [
  {
    href: "/owner",
    label: "Command",
    icon: "pulse-outline",
    activeIcon: "pulse",
    matchPath: "/owner",
  },
  {
    href: "/owner/approvals" as Href,
    label: "Approvals",
    icon: "checkmark-done-outline",
    activeIcon: "checkmark-done",
    matchPath: "/owner",
    activeView: "approvals",
  },
  {
    href: "/owner/revenue" as Href,
    label: "Revenue",
    icon: "trending-up-outline",
    activeIcon: "trending-up",
    matchPath: "/owner",
    activeView: "revenue",
  },
  {
    href: "/owner/stock" as Href,
    label: "Stock",
    icon: "cube-outline",
    activeIcon: "cube",
    matchPath: "/owner",
    activeView: "stock",
  },
  {
    href: "/owner/more" as Href,
    label: "More",
    icon: "ellipsis-horizontal-outline",
    activeIcon: "ellipsis-horizontal",
    matchPath: "/owner/more",
  },
];

/** compat Admin shares Owner's Expo Router tab layout. Plan #11 removes this. */
const adminTabs: DockTab[] = [
  {
    href: "/owner",
    label: "Home",
    icon: "pulse-outline",
    activeIcon: "pulse",
    matchPath: "/owner",
  },
  {
    href: "/scan",
    label: "Check in",
    icon: "scan-outline",
    activeIcon: "scan",
    matchPath: "/scan",
  },
  {
    href: "/owner/approvals" as Href,
    label: "Approvals",
    icon: "checkmark-done-outline",
    activeIcon: "checkmark-done",
    matchPath: "/owner",
    activeView: "approvals",
  },
  {
    href: "/owner/stock" as Href,
    label: "Stock",
    icon: "cube-outline",
    activeIcon: "cube",
    matchPath: "/owner",
    activeView: "stock",
  },
  {
    href: "/owner/more" as Href,
    label: "More",
    icon: "ellipsis-horizontal-outline",
    activeIcon: "ellipsis-horizontal",
    matchPath: "/owner/more",
  },
];

function getTabsForRole(role?: Role): DockTab[] {
  if (role === "TRAINER") return trainerTabs;
  if (role === "RECEPTIONIST") return receptionTabs;
  if (role === "ADMIN") return adminTabs;
  if (role === "OWNER") return ownerTabs;
  return memberTabs;
}

function DockTabItem({
  tab,
  t,
  active,
  badgeCount,
  isMemberNav,
  slotStyle,
}: {
  tab: DockTab;
  t: (key: any) => string;
  active: boolean;
  badgeCount: number;
  isMemberNav: boolean;
  slotStyle: StyleProp<ViewStyle>;
}) {
  const router = useRouter();
  const { palette } = useTheme();
  const raised = isMemberNav && tab.raised;
  const showLabel = !(raised && tab.hideLabel);
  const translatedLabel = translatedNavLabel(tab.label, t);
  const tabTestId = `bottom-nav-${tab.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const scale = useRealSharedValue(1);

  const animatedStyle = useRealAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const navColor = raised
    ? palette.text.onAccent
    : active
      ? palette.accent.base
      : palette.text.tertiary;
  const activeBg = palette.surface.accentSoft;
  const activeBorder = palette.border.focus;

  const memberPressProps = isMemberNav
    ? {
        onPress: () => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.replace(tab.href as never);
        },
      }
    : {};

  const item = (
    <AnimatedPressable
      {...memberPressProps}
      onPressIn={() => {
        if (!isMemberNav) {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        scale.value = withRealSpring(0.9, { mass: 0.5, damping: 12 });
      }}
      onPressOut={() => {
        scale.value = withRealSpring(1, { mass: 0.5, damping: 12 });
      }}
      accessibilityRole="tab"
      accessibilityLabel={
        tab.accessibilityLabel ? translatedNavLabel(tab.accessibilityLabel, t) : translatedLabel
      }
      accessibilityState={{ selected: active }}
      testID={tabTestId}
      style={[
        styles.bottomNavItem,
        isMemberNav ? styles.memberBottomNavItem : null,
        raised ? styles.memberBottomNavItemRaised : null,
        active ? styles.bottomNavItemActive : null,
        active && isMemberNav ? styles.memberBottomNavItemActive : null,
        active && raised ? styles.memberBottomNavItemRaisedActive : null,
        active && !raised ? { backgroundColor: activeBg, borderColor: activeBorder } : null,
        raised
          ? {
              backgroundColor: palette.accent.fill,
              borderColor: palette.bg.app,
              shadowColor: palette.accent.base,
            }
          : null,
        animatedStyle,
      ]}
    >
      <View style={[styles.navIconShell, raised ? styles.navIconShellRaised : null]}>
        <Ionicons
          name={active ? tab.activeIcon : tab.icon}
          size={raised ? 31 : 21}
          color={navColor}
        />
        {badgeCount > 0 ? (
          <View
            style={[
              styles.navBadge,
              { backgroundColor: palette.feedback.danger, borderColor: palette.bg.app },
            ]}
          >
            <Text style={[styles.navBadgeText, { color: palette.text.onDanger }]}>
              {badgeCount > 9 ? "9+" : badgeCount}
            </Text>
          </View>
        ) : null}
      </View>
      {showLabel ? (
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.72}
          style={[
            styles.bottomNavText,
            isMemberNav ? styles.memberBottomNavText : null,
            raised ? styles.memberBottomNavTextRaised : null,
            active ? styles.bottomNavTextActive : null,
            active && raised ? styles.memberBottomNavTextRaisedActive : null,
            { color: navColor },
          ]}
        >
          {translatedLabel}
        </Text>
      ) : null}
    </AnimatedPressable>
  );

  if (isMemberNav) {
    return <View style={[styles.memberBottomNavSlot, slotStyle]}>{item}</View>;
  }

  return (
    <View style={[styles.bottomNavSlot, slotStyle]}>
      <Link href={tab.href} asChild>
        {item}
      </Link>
    </View>
  );
}

export function BottomNav({
  tabs,
  selectedPath,
  role,
  activeView,
  activeTab,
}: {
  tabs?: DockTab[];
  selectedPath?: string;
  role?: Role;
  activeView?: string;
  activeTab?: string;
}) {
  const { visible, setVisible } = useContext(BottomNavVisibilityContext);
  const { t } = useI18n();
  const pathname = usePathname();
  const params = useLocalSearchParams<{ view?: string }>();
  const roleContext = useRoleContext();
  const resolvedRole = role ?? roleContext?.role;
  const notificationsQuery = useMyNotifications();
  const pendingAttendanceQuery = useOrgAttendancePending(undefined, {
    enabled: resolvedRole === "RECEPTIONIST",
  });
  const unreadCount =
    notificationsQuery.data?.notifications?.filter((notification) => !notification.readAt)
      ?.length ?? 0;
  const receptionPendingCount =
    pendingAttendanceQuery.data?.records.filter((attempt) => attempt.status === "PENDING_APPROVAL")
      .length ?? 0;
  const resolvedTabs = tabs ?? getTabsForRole(resolvedRole);
  const isMemberNav = !tabs && (!resolvedRole || resolvedRole === "MEMBER");
  const activePath = selectedPath ?? pathname;
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, 12);
  const { palette, mode } = useTheme();

  useEffect(() => {
    const showSubscription = Keyboard.addListener("keyboardDidShow", () => setVisible(false));
    const hideSubscription = Keyboard.addListener("keyboardDidHide", () => setVisible(true));

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [setVisible]);

  if (pathname.startsWith("/reception")) {
    return null;
  }

  if (pathname.startsWith("/owner")) {
    return null;
  }

  if (pathname.startsWith("/trainer")) {
    return null;
  }

  if (!visible) {
    return null;
  }

  const slotWidth = `${100 / Math.max(resolvedTabs.length, 1)}%` as const;
  const navItems = resolvedTabs.map((tab) => {
    const currentView =
      activeTab ?? activeView ?? (Array.isArray(params.view) ? params.view[0] : params.view);
    const clientDetailMatches =
      tab.label === "Clients" &&
      (activePath.startsWith("/trainer/client") || activePath.startsWith("/trainer/clients"));
    const roleRootPath =
      tab.matchPath === "/trainer" || tab.matchPath === "/reception" || tab.matchPath === "/owner";
    const viewMatches =
      clientDetailMatches || (tab.activeView ? currentView === tab.activeView : !currentView);
    const pathMatches =
      activePath === tab.matchPath ||
      (tab.matchPath !== "/" && !roleRootPath && activePath.startsWith(tab.matchPath)) ||
      clientDetailMatches;
    const active = pathMatches && viewMatches;
    const badgeCount =
      unreadCount > 0 && tab.label === "Inbox"
        ? unreadCount
        : receptionPendingCount > 0 && resolvedRole === "RECEPTIONIST" && tab.label === "Front desk"
          ? receptionPendingCount
          : 0;

    return (
      <DockTabItem
        key={`${String(tab.href)}-${tab.label}`}
        tab={tab}
        t={t}
        active={active}
        badgeCount={badgeCount}
        isMemberNav={isMemberNav}
        slotStyle={{ flexBasis: slotWidth, width: slotWidth }}
      />
    );
  });

  const safeAreaMaskHeight = Math.max(insets.bottom, 12);

  if (isMemberNav) {
    return (
      <>
        <View
          pointerEvents="none"
          style={[
            styles.bottomNavSafeAreaMask,
            { height: safeAreaMaskHeight, backgroundColor: palette.bg.app },
          ]}
        />
        <View style={[styles.memberBottomNavShell, { bottom }]}>
          <BlurView
            intensity={mode === "dark" ? 24 : 18}
            tint={mode === "dark" ? "dark" : "light"}
            style={[
              styles.memberBottomNavBlur,
              {
                borderColor: palette.border.subtle,
                backgroundColor: mode === "dark" ? palette.bg.elevated : palette.surface.raised,
              },
              platformSurfaceShadow(mode, true, palette.bg.sunken),
            ]}
          />
          <View
            pointerEvents="none"
            style={[
              styles.memberBottomNavLowerShield,
              {
                backgroundColor:
                  mode === "dark" ? palette.bg.app : palette.surface.raised,
                opacity: mode === "dark" ? 0.38 : 0.42,
              },
            ]}
          />
          <View style={styles.memberBottomNavItems}>{navItems}</View>
        </View>
      </>
    );
  }

  return (
    <>
      <View
        pointerEvents="none"
        style={[
          styles.bottomNavSafeAreaMask,
          { height: safeAreaMaskHeight, backgroundColor: palette.bg.app },
        ]}
      />
      <BlurView
        intensity={mode === "dark" ? 24 : 18}
        tint={mode === "dark" ? "dark" : "light"}
        style={StyleSheet.flatten([
          styles.bottomNav,
          {
            bottom,
            borderColor: palette.border.subtle,
            backgroundColor: mode === "dark" ? palette.bg.elevated : palette.surface.raised,
          },
          platformSurfaceShadow(mode, true, palette.bg.sunken),
        ])}
      >
        {navItems}
      </BlurView>
    </>
  );
}

export { DatePickerField } from "@/components/primitives/date-picker-field";
export { OtpInput } from "@/components/primitives/otp-input";
export type { OtpInputHandle } from "@/components/primitives/otp-input";

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: fallbackColors.bg,
  },
  ambientGlow: {
    position: "absolute",
    top: -120,
    right: -72,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(185,244,85,0.075)",
    opacity: 0.82,
  },
  ambientWash: {
    position: "absolute",
    top: 148,
    left: -120,
    width: 260,
    height: 260,
    borderRadius: 130,
    opacity: 0.42,
  },
  androidAmbientGlow: {
    top: -88,
    right: -108,
    width: 220,
    height: 220,
    borderRadius: 110,
    opacity: 0.5,
  },
  androidAmbientWash: {
    top: 184,
    left: -148,
    width: 220,
    height: 220,
    borderRadius: 110,
    opacity: 0.26,
  },
  brandMark: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  brandMarkFramed: {
    borderRadius: radii.icon,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "#0F1411",
  },
  brandMarkImage: {
    width: "100%",
    height: "100%",
  },
  glassCard: {
    borderWidth: 1,
    borderCurve: "continuous",
    overflow: "hidden",
    backgroundColor: fallbackColors.panel,
  },
  cardInnerTopHighlight: {
    height: StyleSheet.hairlineWidth,
    left: 16,
    position: "absolute",
    right: 16,
    top: 0,
    zIndex: 1,
  },
  glassCardGlowBorder: {
    borderColor: fallbackColors.limeBorder,
  },
  glassCardBlurLayer: {
    zIndex: 0,
  },
  glassContentLayer: {
    position: "relative",
    zIndex: 1,
  },
  glassContent: {
    backgroundColor: "transparent",
    padding: 18,
    gap: spacing.md,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.5,
  },
  bottomNav: {
    position: "absolute",
    zIndex: 50,
    left: layout.screenPadding,
    right: layout.screenPadding,
    height: layout.bottomNavHeight,
    borderRadius: radii.bottomNav,
    borderWidth: 1,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 0,
    paddingVertical: 6,
    gap: 0,
  },
  bottomNavSafeAreaMask: {
    position: "absolute",
    zIndex: 49,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: fallbackColors.bg,
  },
  memberBottomNavShell: {
    position: "absolute",
    zIndex: 50,
    left: layout.bottomNavHorizontalMargin,
    right: layout.bottomNavHorizontalMargin,
    height: 92,
    overflow: "visible",
    borderRadius: radii.bottomNav,
  },
  memberBottomNavBlur: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 72,
    borderRadius: radii.bottomNav,
    borderWidth: 1,
    overflow: "hidden",
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  memberBottomNavLowerShield: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 34,
    borderBottomLeftRadius: radii.bottomNav,
    borderBottomRightRadius: radii.bottomNav,
    backgroundColor: "rgba(0,0,0,0.46)",
  },
  memberBottomNavItems: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 72,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 0,
    paddingVertical: 8,
    gap: 0,
    overflow: "visible",
  },
  bottomNavItem: {
    minWidth: 0,
    width: "100%",
    maxWidth: 62,
    height: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  bottomNavSlot: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  memberBottomNavItem: {
    width: "100%",
    maxWidth: 68,
    minWidth: 0,
    height: 56,
    borderRadius: 20,
  },
  memberBottomNavSlot: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  memberBottomNavItemRaised: {
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: 78,
    width: 78,
    maxWidth: 78,
    height: 78,
    aspectRatio: 1,
    marginTop: -28,
    borderRadius: 999,
    borderWidth: 3,
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
    zIndex: 3,
  },
  bottomNavItemActive: {
    borderWidth: 1,
    borderRadius: 999,
  },
  memberBottomNavItemActive: {
    borderWidth: 1,
  },
  memberBottomNavItemRaisedActive: {
    borderWidth: 3,
  },
  bottomNavText: {
    maxWidth: "100%",
    textAlign: "center",
    color: fallbackColors.subtle,
    ...typography.navLabel,
  },
  navIconShell: {
    width: 28,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  navIconShellRaised: {
    width: 42,
    height: 42,
    borderRadius: 999,
  },
  memberBottomNavText: {
    fontSize: 12,
    lineHeight: 15,
  },
  memberBottomNavTextRaised: {
    color: fallbackColors.bg,
  },
  bottomNavTextActive: {
    fontFamily: "Inter_700Bold",
    color: fallbackColors.lime,
  },
  memberBottomNavTextRaisedActive: {
    color: fallbackColors.bg,
  },
  navBadge: {
    position: "absolute",
    top: -8,
    right: -10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: fallbackColors.red,
    borderWidth: 1,
    borderColor: fallbackColors.bg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  navBadgeText: {
    color: fallbackColors.text,
    fontSize: 9,
    lineHeight: 11,
    fontFamily: "Inter_800ExtraBold",
    fontVariant: ["tabular-nums"],
  },
});
