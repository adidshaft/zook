import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { memo, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Animated as RNAnimated, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomNavVisibilityContext } from "@/components/primitives/bottom-nav-context";
import { useReduceMotion } from "@/lib/motion";
import { materials, typography, useTheme } from "@/lib/theme";

const AnimatedPressable = RNAnimated.createAnimatedComponent(Pressable);

type RoleTabBarProps = {
  state: any;
  descriptors: Record<string, any>;
  navigation: any;
  badges?: Record<string, number | undefined>;
  centerAction?: { routeName: string };
};

const parentTabRouteByChildRoute: Record<string, string> = {
  billing: "more",
  diet: "plan",
  stock: "more",
};

const TabBarBackdrop = memo(function TabBarBackdrop({
  height,
  color,
  mode,
}: {
  height: number;
  color: string;
  mode: "light" | "dark";
}) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height,
        backgroundColor: color,
        opacity: Platform.OS === "ios" ? (mode === "dark" ? 0.22 : 0.12) : 1,
      }}
    />
  );
});

export function RoleTabBar({
  state,
  descriptors,
  navigation,
  badges,
  centerAction,
}: RoleTabBarProps) {
  const { mode, palette } = useTheme();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const { visible } = useContext(BottomNavVisibilityContext);
  const backdropHeight = 100 + insets.bottom;
  const focusedOptions = descriptors[state.routes[state.index]?.key ?? ""]?.options;
  const focusedTabBarStyle = focusedOptions?.tabBarStyle;
  const focusedRouteName = state.routes[state.index]?.name;
  const [barWidth, setBarWidth] = useState(0);
  const visibleRoutes = state.routes.filter((route: any) => {
    const options = descriptors[route.key]?.options;
    const itemStyle = options?.tabBarItemStyle;
    return options?.href !== null && itemStyle?.display !== "none";
  });
  const parentRouteName =
    (focusedRouteName ? parentTabRouteByChildRoute[focusedRouteName] : undefined) ?? undefined;
  const activeRouteName = parentRouteName ?? focusedRouteName;
  const activeVisibleIndex = Math.max(
    0,
    visibleRoutes.findIndex((route: any) => route.name === activeRouteName),
  );
  const hideForFocusedRoute =
    focusedTabBarStyle?.display === "none" ||
    (!parentRouteName &&
      (focusedOptions?.href === null || focusedOptions?.tabBarItemStyle?.display === "none"));
  const glass = materials.glassBar(mode);
  const tonal = materials.tonalBar(mode);
  const focusedIsCenter = centerAction?.routeName === activeRouteName;

  const translateY = useRef(new RNAnimated.Value(0)).current;
  const opacity = useRef(new RNAnimated.Value(1)).current;
  const indicatorX = useRef(new RNAnimated.Value(0)).current;
  const centerScale = useRef(new RNAnimated.Value(1)).current;
  const itemWidth = visibleRoutes.length > 0 && barWidth > 0 ? barWidth / visibleRoutes.length : 0;
  const tabRailHeight = Platform.OS === "android" ? 56 : 60;
  const indicatorHorizontalInset = Platform.OS === "android" ? 14 : 16;
  const indicatorWidth =
    itemWidth > 0 ? Math.min(Math.max(itemWidth - indicatorHorizontalInset, 58), 72) : 0;
  const indicatorHeight = 44;
  const indicatorTop = Math.max(0, Math.round((tabRailHeight - indicatorHeight) / 2));
  const indicatorBorderColor =
    mode === "dark" ? "rgba(185,244,85,0.22)" : "rgba(31,62,36,0.12)";
  const indicatorBackgroundColor =
    mode === "dark" ? "rgba(185,244,85,0.18)" : "rgba(31,62,36,0.12)";

  useEffect(() => {
    RNAnimated.parallel([
      RNAnimated.timing(translateY, {
        toValue: visible ? 0 : 120,
        duration: 250,
        useNativeDriver: true,
      }),
      RNAnimated.timing(opacity, {
        toValue: visible ? 1 : 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY, visible]);

  useEffect(() => {
    if (!itemWidth || focusedIsCenter) return;
    const target = activeVisibleIndex * itemWidth + (itemWidth - indicatorWidth) / 2;
    if (reduceMotion) {
      indicatorX.setValue(target);
      return;
    }
    RNAnimated.spring(indicatorX, {
      toValue: target,
      damping: 18,
      stiffness: 220,
      mass: 1,
      useNativeDriver: true,
    }).start();
  }, [activeVisibleIndex, focusedIsCenter, indicatorWidth, indicatorX, itemWidth, reduceMotion]);

  const materialStyle = useMemo(
    () =>
      Platform.OS === "ios"
        ? {
            backgroundColor: "transparent",
            borderColor: glass.hairline,
          }
        : {
            backgroundColor: tonal.backgroundColor,
            borderColor: tonal.topHairline,
            elevation: tonal.elevation,
          },
    [glass.hairline, tonal.backgroundColor, tonal.elevation, tonal.topHairline],
  );

  if (hideForFocusedRoute) {
    return null;
  }

  return (
    <RNAnimated.View
      pointerEvents={visible ? "auto" : "none"}
      style={[
        styles.root,
        { height: backdropHeight },
        { transform: [{ translateY }], opacity },
      ]}
    >
      <TabBarBackdrop height={backdropHeight} color={palette.bg.app} mode={mode} />
      <View
        onLayout={(event) => setBarWidth(event.nativeEvent.layout.width)}
        style={[
          styles.tabBarContainer,
          Platform.OS === "android" ? styles.androidTabBarContainer : null,
          // Android: keep the bar edge-to-edge but pad the content above the
          // system gesture/nav bar so labels (esp. the centered "Scan", which
          // sits right behind the gesture pill) aren't clipped. insets.bottom
          // can report 0 with gesture nav, so enforce a minimum.
          Platform.OS === "android"
            ? (() => {
                const pad = Math.max(insets.bottom, 24);
                return { height: 64 + pad, paddingBottom: pad };
              })()
            : null,
          materialStyle,
          {
            bottom: Platform.OS === "ios" ? (insets.bottom > 0 ? insets.bottom + 8 : 16) : 0,
            shadowColor: mode === "dark" ? palette.bg.sunken : palette.text.primary,
            shadowOpacity: Platform.OS === "ios" ? (mode === "dark" ? 0.18 : 0.08) : 0,
          },
        ]}
      >
        {Platform.OS === "ios" ? (
          <BlurView
            pointerEvents="none"
            intensity={glass.blurIntensity}
            tint={glass.blurTint}
            style={[
              StyleSheet.absoluteFillObject,
              styles.tabBarMaterial,
            ]}
          />
        ) : null}
        {Platform.OS === "ios" ? (
          <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, styles.tabBarOverlay, { backgroundColor: glass.overlayColor }]} />
        ) : null}
        <View
          pointerEvents="none"
          style={[
            styles.topHairline,
            { backgroundColor: Platform.OS === "ios" ? glass.hairline : tonal.topHairline },
          ]}
        />
        {!focusedIsCenter && itemWidth > 0 ? (
          <RNAnimated.View
            pointerEvents="none"
            style={[
              styles.activeIndicator,
              {
                backgroundColor: indicatorBackgroundColor,
                borderColor: indicatorBorderColor,
                borderRadius: indicatorHeight / 2,
                height: indicatorHeight,
                top: indicatorTop,
                width: indicatorWidth,
                shadowOpacity: Platform.OS === "ios" ? (mode === "dark" ? 0.16 : 0.05) : 0,
                transform: [{ translateX: indicatorX }],
              },
            ]}
          />
        ) : null}
        {visibleRoutes.map((route: any) => {
          const { options } = descriptors[route.key];
          const label =
            options.tabBarLabel !== undefined
              ? options.tabBarLabel
              : options.title !== undefined
                ? options.title
                : route.name;
          const isFocused = activeRouteName === route.name;
          const color = isFocused ? palette.accent.base : palette.text.tertiary;
          const badge = badges?.[route.name];
          const stringLabel = typeof label === "string" ? label : route.name;
          const tabAccessibilityLabel = badge && badge > 0
            ? `${stringLabel}, ${badge} unread ${badge === 1 ? "item" : "items"}`
            : stringLabel;

          const onPress = () => {
            void Haptics.impactAsync(
              centerAction?.routeName === route.name
                ? Haptics.ImpactFeedbackStyle.Medium
                : Haptics.ImpactFeedbackStyle.Light,
            );
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            navigation.emit({
              type: "tabLongPress",
              target: route.key,
            });
          };

          const icon = options.tabBarIcon?.({
            color,
            focused: isFocused,
            size: centerAction?.routeName === route.name ? 26 : 22,
          }) ?? <Ionicons name="ellipse-outline" size={22} color={color} />;

          if (centerAction?.routeName === route.name) {
            return (
              <View key={route.key} style={styles.centerActionContainer}>
                <AnimatedPressable
                  accessibilityRole="button"
                  accessibilityState={isFocused ? { selected: true } : {}}
                  accessibilityLabel={
                    centerAction?.routeName === route.name ? `${stringLabel}. Scan or check in` : tabAccessibilityLabel
                  }
                  accessibilityHint="Opens the primary scan action."
                  onPress={() => {
                    onPress();
                  }}
                  onPressIn={() => {
                    RNAnimated.spring(centerScale, {
                      toValue: reduceMotion ? 1 : 0.94,
                      damping: 18,
                      stiffness: 220,
                      useNativeDriver: true,
                    }).start();
                  }}
                  onPressOut={() => {
                    RNAnimated.spring(centerScale, {
                      toValue: 1,
                      damping: 18,
                      stiffness: 220,
                      useNativeDriver: true,
                    }).start();
                  }}
                  onLongPress={onLongPress}
                  android_ripple={{ color: palette.surface.accentSoft, borderless: true }}
                  style={[
                    styles.centerActionButton,
                    Platform.OS === "android" ? styles.androidCenterActionButton : null,
                    {
                      backgroundColor: palette.accent.base,
                      borderColor: palette.bg.app,
                      shadowColor: palette.accent.base,
                      shadowOpacity: Platform.OS === "ios" ? (mode === "dark" ? 0.32 : 0.18) : 0,
                    },
                    { transform: [{ scale: centerScale }] },
                  ]}
                >
                  <View pointerEvents="none" style={styles.centerActionHighlight} />
                  {options.tabBarIcon?.({
                    color: palette.text.onAccent,
                    focused: true,
                    size: 26,
                  }) ?? <Ionicons name="qr-code" size={26} color={palette.text.onAccent} />}
                </AnimatedPressable>
                <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.92} style={[styles.centerActionLabel, Platform.OS === "android" ? styles.androidCenterActionLabel : null, { color }]}>{stringLabel}</Text>
              </View>
            );
          }

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={tabAccessibilityLabel}
              onPress={onPress}
              onLongPress={onLongPress}
              android_ripple={{ color: palette.surface.accentSoft, borderless: true }}
              style={styles.tabItem}
            >
              <View style={styles.tabItemWrapper}>
                {badge && badge > 0 ? (
                  <View style={[styles.badge, { backgroundColor: palette.feedback.danger }]}>
                    <Text
                      accessibilityElementsHidden
                      importantForAccessibility="no"
                      style={[styles.badgeText, { color: palette.text.onDanger }]}
                    >
                      {badge}
                    </Text>
                  </View>
                ) : null}
                {icon}
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.92}
                  style={[styles.tabLabel, isFocused ? styles.tabLabelActive : null, { color }]}
                >
                  {stringLabel}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </RNAnimated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
  },
  tabBarContainer: {
    position: "absolute",
    left: 12,
    right: 12,
    borderCurve: "continuous",
    borderRadius: 36,
    height: 76,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    borderWidth: 1.5,
  },
  androidTabBarContainer: {
    left: 0,
    right: 0,
    bottom: 0,
    height: 64,
    borderRadius: 0,
    borderWidth: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 4,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
  },
  tabBarMaterial: {
    borderCurve: "continuous",
    borderRadius: 36,
    overflow: "hidden",
  },
  tabBarOverlay: {
    borderCurve: "continuous",
    borderRadius: 36,
    overflow: "hidden",
  },
  topHairline: {
    height: StyleSheet.hairlineWidth,
    left: 18,
    position: "absolute",
    right: 18,
    top: 0,
    zIndex: 2,
  },
  activeIndicator: {
    borderCurve: "continuous",
    borderRadius: 22,
    borderWidth: 1,
    height: 44,
    left: 0,
    position: "absolute",
    top: 16,
    zIndex: 1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: Platform.OS === "android" ? 56 : 60,
    zIndex: 3,
  },
  tabItemWrapper: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 2,
    width: "100%",
    position: "relative",
  },
  tabLabel: {
    ...typography.navLabel,
    letterSpacing: 0,
    marginTop: 2,
    maxWidth: "100%",
    textAlign: "center",
  },
  tabLabelActive: {
    fontFamily: "Inter_700Bold",
  },
  centerActionContainer: {
    flex: 1.1,
    alignItems: "center",
    justifyContent: "center",
    height: 64,
    zIndex: 4,
  },
  centerActionButton: {
    width: 62,
    height: 62,
    borderRadius: 31,
    justifyContent: "center",
    alignItems: "center",
    marginTop: -36,
    borderWidth: 4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    overflow: "hidden",
  },
  centerActionHighlight: {
    backgroundColor: "rgba(255,255,255,0.22)",
    height: StyleSheet.hairlineWidth,
    left: 14,
    position: "absolute",
    right: 14,
    top: 7,
  },
  androidCenterActionButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    // Raise the button above the bar (like iOS) so the "Scan" label below it
    // sits on the same baseline as the other tab labels instead of dropping
    // into the system gesture bar.
    marginTop: -34,
    borderWidth: 0,
    elevation: 6,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
  },
  centerActionLabel: {
    ...typography.navLabel,
    letterSpacing: 0,
    marginTop: 2,
    maxWidth: "100%",
    textAlign: "center",
  },
  // The raised center button only shifts itself (Yoga sizes the line with
  // positive margins), so anchor the Android label to the row baseline
  // instead of letting it follow the button into the gesture bar.
  androidCenterActionLabel: {
    position: "absolute",
    bottom: 10,
    left: 0,
    right: 0,
    marginTop: 0,
  },
  badge: {
    position: "absolute",
    right: 4,
    top: 0,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
    zIndex: 10,
  },
  badgeText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    lineHeight: 11,
  },
});
