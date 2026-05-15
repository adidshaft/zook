import { Link } from "expo-router";
import type { Href } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "@/lib/theme";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function HomeHeader({
  city,
  firstName,
  gymHref,
  orgName,
  unreadCount,
}: {
  city?: string | null;
  firstName: string;
  gymHref: Href;
  orgName: string;
  unreadCount: number;
}) {
  return (
    <>
      <View style={styles.premiumHeader}>
        <View style={styles.premiumGreetingBlock}>
          <Text style={styles.premiumGreeting}>{getGreeting()},</Text>
          <Text numberOfLines={1} style={styles.premiumName}>
            {firstName}
          </Text>
        </View>
        <Link href="/notifications" asChild>
          <Pressable
            style={styles.premiumBell}
            accessibilityRole="button"
            accessibilityLabel="Open notifications"
          >
            <Ionicons name="notifications-outline" size={27} color={colors.text} />
            {unreadCount > 0 ? (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
              </View>
            ) : null}
          </Pressable>
        </Link>
      </View>

      <Link href={gymHref} asChild>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Open gym details"
          style={styles.premiumGymSelector}
        >
          <Ionicons name="business-outline" size={24} color={colors.text} />
          <Text numberOfLines={1} style={styles.premiumGymText}>
            {orgName}
            {city ? ` · ${city}` : ""}
          </Text>
          <Ionicons name="chevron-down" size={19} color={colors.muted} />
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
  premiumGreeting: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 22,
  },
  premiumName: {
    color: colors.text,
    fontSize: 34,
    lineHeight: 40,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0,
  },
  premiumBell: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.035)",
  },
  premiumGymSelector: {
    minHeight: 62,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.035)",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: 18,
  },
  premiumGymText: {
    flex: 1,
    color: colors.text,
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
    backgroundColor: colors.red,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  unreadBadgeText: {
    color: colors.text,
    fontSize: 9,
    fontWeight: "900",
    lineHeight: 12,
  },
});
