import { Link } from "expo-router";
import type { Href } from "expo-router";
import type { ReactNode } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { spacing, useTheme } from "@/lib/theme";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function HomeHeader({
  city,
  contextSlot,
  firstName,
  gymHref,
  orgName,
  unreadCount,
}: {
  city?: string | null;
  contextSlot?: ReactNode;
  firstName: string;
  gymHref: Href;
  orgName: string;
  unreadCount: number;
}) {
  const { mode, palette } = useTheme();
  const isDark = mode === "dark";
  const chromeSurface = palette.surface.raised;
  const pressedSurface = isDark ? palette.surface.default : palette.bg.sunken;
  const chromeShadow =
    Platform.OS === "ios"
      ? {
          shadowColor: palette.bg.sunken,
          shadowOpacity: isDark ? 0.18 : 0.07,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 8 },
        }
      : { elevation: 0 };

  return (
    <>
      <View style={styles.premiumHeader}>
        <View style={styles.premiumGreetingBlock}>
          <Text style={[styles.premiumGreeting, { color: palette.text.secondary }]}>
            {getGreeting()},
          </Text>
          <Text
            numberOfLines={1}
            style={[styles.premiumName, { color: palette.text.primary }]}
          >
            {firstName}
          </Text>
          {contextSlot ? <View style={styles.contextSlot}>{contextSlot}</View> : null}
        </View>
        <Link href="/notifications" asChild>
          <Pressable
            style={({ pressed }) => [
              styles.premiumBell,
              chromeShadow,
              {
                borderColor: palette.border.subtle,
                backgroundColor: pressed ? pressedSurface : chromeSurface,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Open notifications"
          >
            <Ionicons name="notifications-outline" size={27} color={palette.text.primary} />
            {unreadCount > 0 ? (
              <View
                style={[
                  styles.unreadBadge,
                  {
                    backgroundColor: palette.feedback.danger,
                    borderColor: isDark ? palette.bg.app : palette.surface.raised,
                  },
                ]}
              >
                <Text style={[styles.unreadBadgeText, { color: palette.text.onDanger }]}>
                  {unreadCount > 9 ? "9+" : unreadCount}
                </Text>
              </View>
            ) : null}
          </Pressable>
        </Link>
      </View>

      <Link href={gymHref} asChild>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Open gym details"
          style={({ pressed }) => [
            styles.premiumGymSelector,
            chromeShadow,
            {
              borderColor: palette.border.subtle,
              backgroundColor: pressed ? pressedSurface : chromeSurface,
            },
          ]}
        >
          <Ionicons name="business-outline" size={24} color={palette.text.primary} />
          <Text numberOfLines={1} style={[styles.premiumGymText, { color: palette.text.primary }]}>
            {orgName}
            {city ? ` · ${city}` : ""}
          </Text>
          <Ionicons name="chevron-down" size={19} color={palette.text.tertiary} />
        </Pressable>
      </Link>
    </>
  );
}

const styles = StyleSheet.create({
  premiumHeader: {
    minHeight: 94,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingTop: 14,
  },
  premiumGreetingBlock: {
    flex: 1,
    gap: 4,
  },
  contextSlot: {
    alignSelf: "flex-start",
  },
  premiumGreeting: {
    fontSize: 16,
    lineHeight: 22,
  },
  premiumName: {
    fontSize: 34,
    lineHeight: 40,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0,
  },
  premiumBell: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  premiumGymSelector: {
    minHeight: 62,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: 18,
  },
  premiumGymText: {
    flex: 1,
    fontSize: 17,
    lineHeight: 22,
    fontFamily: "Inter_600SemiBold",
  },
  unreadBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  unreadBadgeText: {
    fontSize: 9,
    fontWeight: "900",
    lineHeight: 12,
  },
});
