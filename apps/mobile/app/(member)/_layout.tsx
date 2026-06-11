import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { memo, useContext, useEffect, useRef } from "react";
import { Animated as RNAnimated, View, Pressable, Text, StyleSheet, Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomNavVisibilityContext } from "@/components/primitives/bottom-nav-context";
import { useMyNotifications } from "@/lib/domains/notifications";
import { useTheme } from "@/lib/theme/index";

export default function MemberLayout() {
  const notificationsQuery = useMyNotifications();
  const unread =
    notificationsQuery.data?.notifications?.filter((notification) => !notification.readAt).length ??
    0;

  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} unread={unread} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
        }}
      />
      <Tabs.Screen
        name="plan"
        options={{
          title: "Plan",
        }}
      />
      <Tabs.Screen
        name="diet"
        options={{
          title: "Diet",
          href: null,
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: "Scan",
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: "Shop",
        }}
      />
      <Tabs.Screen
        name="you"
        options={{
          title: "You",
        }}
      />
    </Tabs>
  );
}

// Static guard behind the floating tab bar so content remains readable near
// gesture areas without hiding the scroll view under an opaque custom fade.
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

function FloatingTabBar({ state, descriptors, navigation, unread }: any) {
  const { mode, palette } = useTheme();
  const insets = useSafeAreaInsets();
  const { visible } = useContext(BottomNavVisibilityContext);
  const backdropHeight = 100 + insets.bottom;
  const focusedRouteName = state.routes[state.index]?.name;
  const visibleRoutes = state.routes.filter((route: any) => {
    const options = descriptors[route.key]?.options;
    return route.name !== "diet" && options?.href !== null;
  });

  const translateY = useRef(new RNAnimated.Value(0)).current;
  const opacity = useRef(new RNAnimated.Value(1)).current;

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

  const animatedStyle = {
    transform: [{ translateY }],
    opacity,
  };

  return (
    <RNAnimated.View
      pointerEvents={visible ? "auto" : "none"}
      style={[
        {
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: backdropHeight,
          zIndex: 100,
        },
        animatedStyle,
      ]}
    >
      {/* Fading Opaque backdrop to hide scrolling content behind tab bar */}
      <TabBarBackdrop height={backdropHeight} color={palette.bg.app} mode={mode} />

      <View
        style={[
          styles.tabBarContainer,
          Platform.OS === "android" ? styles.androidTabBarContainer : null,
          {
            backgroundColor: Platform.OS === "ios" ? "transparent" : palette.bg.elevated,
            borderColor: palette.border.subtle,
            bottom: Platform.OS === "ios" ? (insets.bottom > 0 ? insets.bottom + 8 : 16) : 0,
            shadowColor: mode === "dark" ? palette.bg.sunken : palette.text.primary,
            shadowOpacity: Platform.OS === "ios" ? (mode === "dark" ? 0.18 : 0.08) : 0,
            elevation: Platform.OS === "android" ? 0 : 0,
          },
        ]}
      >
        {Platform.OS === "ios" ? (
          <BlurView
            pointerEvents="none"
            intensity={mode === "dark" ? 26 : 20}
            tint={mode === "dark" ? "dark" : "light"}
            style={[
              StyleSheet.absoluteFillObject,
              styles.tabBarMaterial,
              {
                backgroundColor: mode === "dark" ? palette.surface.default : palette.surface.raised,
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

          const isFocused = focusedRouteName === route.name || (focusedRouteName === "diet" && route.name === "plan");

          const onPress = () => {
            if (route.name === "scan") {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            } else {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }

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

          // Render Special Center Button for Scan
          if (route.name === "scan") {
            return (
              <View key={route.key} style={styles.scanButtonContainer}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={isFocused ? { selected: true } : {}}
                  onPress={onPress}
                  onLongPress={onLongPress}
                  style={[
                    styles.scanButton,
                    Platform.OS === "android" ? styles.androidScanButton : null,
                    {
                      backgroundColor: palette.accent.base,
                      borderColor: palette.bg.app,
                      shadowColor: palette.accent.base,
                      shadowOpacity: Platform.OS === "ios" ? (mode === "dark" ? 0.24 : 0.12) : 0,
                      elevation: Platform.OS === "android" ? 0 : 0,
                    },
                  ]}
                >
                  <Ionicons name="qr-code" size={26} color={palette.text.onAccent} />
                </Pressable>
                <Text
                  style={[
                    styles.scanLabel,
                    {
                      color: isFocused ? palette.accent.base : palette.text.tertiary,
                    },
                  ]}
                >
                  {label as string}
                </Text>
              </View>
            );
          }

          // Get matching icon based on route name
          let iconName: keyof typeof Ionicons.glyphMap = "home-outline";
          if (route.name === "index") {
            iconName = isFocused ? "home" : "home-outline";
          } else if (route.name === "plan") {
            iconName = isFocused ? "barbell" : "barbell-outline";
          } else if (route.name === "shop") {
            iconName = isFocused ? "bag" : "bag-outline";
          } else if (route.name === "you") {
            iconName = isFocused ? "person" : "person-outline";
          }

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              onPress={onPress}
              onLongPress={onLongPress}
              style={styles.tabItem}
            >
              <View
                style={[
                  styles.tabItemWrapper,
                  isFocused && {
                    backgroundColor: palette.surface.accentSoft,
                  },
                ]}
              >
                {route.name === "you" && unread > 0 ? (
                  <View style={[styles.badge, { backgroundColor: palette.feedback.danger }]}>
                    <Text style={[styles.badgeText, { color: palette.text.onDanger }]}>
                      {unread}
                    </Text>
                  </View>
                ) : null}
                <Ionicons
                  name={iconName}
                  size={22}
                  color={isFocused ? palette.accent.base : palette.text.tertiary}
                />
                <Text
                  style={[
                    styles.tabLabel,
                    {
                      color: isFocused ? palette.accent.base : palette.text.tertiary,
                    },
                  ]}
                >
                  {label as string}
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
  tabBarContainer: {
    position: "absolute",
    left: 12,
    right: 12,
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
    borderRadius: 36,
    overflow: "hidden",
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: 64,
  },
  tabItemWrapper: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 8,
    width: "90%",
    position: "relative",
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 2,
    fontFamily: "Inter_600SemiBold",
  },
  scanButtonContainer: {
    flex: 1.1,
    alignItems: "center",
    justifyContent: "center",
    height: 64,
  },
  scanButton: {
    width: 62,
    height: 62,
    borderRadius: 31,
    justifyContent: "center",
    alignItems: "center",
    marginTop: -36,
    borderWidth: 4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  androidScanButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginTop: 0,
    borderWidth: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
  },
  scanLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    marginTop: 2,
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
