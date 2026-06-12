import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { memo, useContext, useEffect, useRef } from "react";
import { Animated as RNAnimated, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomNavVisibilityContext } from "@/components/primitives/bottom-nav-context";
import { typography, useTheme } from "@/lib/theme";

type RoleTabBarProps = {
  state: any;
  descriptors: Record<string, any>;
  navigation: any;
  badges?: Record<string, number | undefined>;
  centerAction?: { routeName: string };
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
  const { visible } = useContext(BottomNavVisibilityContext);
  const backdropHeight = 100 + insets.bottom;
  const focusedRouteName = state.routes[state.index]?.name;
  const visibleRoutes = state.routes.filter((route: any) => {
    const options = descriptors[route.key]?.options;
    const itemStyle = options?.tabBarItemStyle;
    return options?.href !== null && itemStyle?.display !== "none";
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
        style={[
          styles.tabBarContainer,
          Platform.OS === "android" ? styles.androidTabBarContainer : null,
          {
            backgroundColor: Platform.OS === "ios" ? "transparent" : palette.bg.elevated,
            borderColor: palette.border.subtle,
            bottom: Platform.OS === "ios" ? (insets.bottom > 0 ? insets.bottom + 8 : 16) : 0,
            shadowColor: mode === "dark" ? palette.bg.sunken : palette.text.primary,
            shadowOpacity: Platform.OS === "ios" ? (mode === "dark" ? 0.18 : 0.08) : 0,
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
              { backgroundColor: mode === "dark" ? palette.surface.default : palette.surface.raised },
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
          const isFocused = focusedRouteName === route.name;
          const color = isFocused ? palette.accent.base : palette.text.tertiary;
          const badge = badges?.[route.name];

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
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={isFocused ? { selected: true } : {}}
                  accessibilityLabel={typeof label === "string" ? label : route.name}
                  onPress={onPress}
                  onLongPress={onLongPress}
                  style={[
                    styles.centerActionButton,
                    Platform.OS === "android" ? styles.androidCenterActionButton : null,
                    {
                      backgroundColor: palette.accent.base,
                      borderColor: palette.bg.app,
                      shadowColor: palette.accent.base,
                      shadowOpacity: Platform.OS === "ios" ? (mode === "dark" ? 0.24 : 0.12) : 0,
                    },
                  ]}
                >
                  {options.tabBarIcon?.({
                    color: palette.text.onAccent,
                    focused: true,
                    size: 26,
                  }) ?? <Ionicons name="qr-code" size={26} color={palette.text.onAccent} />}
                </Pressable>
                <Text style={[styles.centerActionLabel, { color }]}>{label as string}</Text>
              </View>
            );
          }

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={typeof label === "string" ? label : route.name}
              onPress={onPress}
              onLongPress={onLongPress}
              style={styles.tabItem}
            >
              <View
                style={[
                  styles.tabItemWrapper,
                  isFocused ? { backgroundColor: palette.surface.accentSoft } : null,
                ]}
              >
                {badge && badge > 0 ? (
                  <View style={[styles.badge, { backgroundColor: palette.feedback.danger }]}>
                    <Text style={[styles.badgeText, { color: palette.text.onDanger }]}>
                      {badge}
                    </Text>
                  </View>
                ) : null}
                {icon}
                <Text style={[styles.tabLabel, { color }]}>{label as string}</Text>
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
    ...typography.navLabel,
    marginTop: 2,
  },
  centerActionContainer: {
    flex: 1.1,
    alignItems: "center",
    justifyContent: "center",
    height: 64,
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
  },
  androidCenterActionButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginTop: 0,
    borderWidth: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
  },
  centerActionLabel: {
    ...typography.navLabel,
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
