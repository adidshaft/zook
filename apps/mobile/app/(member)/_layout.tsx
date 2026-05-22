import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { View, Pressable, Text, StyleSheet, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useMyNotifications } from "@/lib/domains/notifications";
import { useTheme } from "@/lib/theme/index";

export default function MemberLayout() {
  const { palette } = useTheme();
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
          title: "Tracking",
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
          title: "Profile",
        }}
      />
    </Tabs>
  );
}

function FloatingTabBar({ state, descriptors, navigation, unread }: any) {
  const { palette, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const backdropHeight = 100 + insets.bottom;

  return (
    <>
      {/* Fading Opaque backdrop to hide scrolling content behind tab bar */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: backdropHeight,
          backgroundColor: "transparent",
        }}
      >
        {Array.from({ length: 15 }).map((_, i) => {
          const opacity = (i / 14) ** 1.8; // Exponential scaling for a buttery smooth fade out
          const top = (i / 15) * backdropHeight;
          const segmentHeight = backdropHeight / 15 + 2;
          return (
            <View
              key={i}
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: top,
                height: segmentHeight,
                backgroundColor: palette.bg.app,
                opacity: opacity,
              }}
            />
          );
        })}
      </View>

      <View
        style={[
          styles.tabBarContainer,
          {
            backgroundColor: palette.bg.elevated,
            borderColor: palette.border.subtle,
            bottom: insets.bottom > 0 ? insets.bottom + 8 : 16,
          },
        ]}
      >
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
            ? options.title
            : route.name;

        const isFocused = state.index === index;

        const onPress = () => {
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
                  {
                    backgroundColor: "#B9F455", // High-contrast raw lime green
                    borderColor: palette.bg.app, // Match the page background for outline effect
                  },
                ]}
              >
                <Ionicons name="qr-code" size={26} color="#000000" />
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
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unread}</Text>
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
    </>
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
    // Premium soft shadow to lift the capsule
    shadowColor: "#000000",
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
    borderWidth: 1.5,
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
    shadowColor: "#B9F455",
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
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
    backgroundColor: "#FF5A3D",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
    zIndex: 10,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    lineHeight: 11,
  },
});
