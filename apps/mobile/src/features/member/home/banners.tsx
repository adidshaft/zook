import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Card, IconBubble, ZookButton } from "@/components/primitives";
import type { MemberHomeData } from "@/lib/domains/shared/types";
import { getStoredValue, setStoredValue } from "@/lib/storage";
import { spacing, typography, useTheme } from "@/lib/theme";

const DAY_MS = 86_400_000;

function recent(timestamp?: string | null, windowMs = DAY_MS) {
  if (!timestamp) return false;
  const parsed = Number(timestamp);
  return Number.isFinite(parsed) && Date.now() - parsed < windowMs;
}

export function Banners({ home }: { home?: MemberHomeData }) {
  const [dismissed, setDismissed] = useState<Record<string, string>>({});
  const orgId = home?.activeOrganization?.id ?? "none";

  useEffect(() => {
    let mounted = true;
    void Promise.all([
      getStoredValue(`zook_home_referral_dismissed_${orgId}`),
      getStoredValue(`zook_home_notifications_dismissed_${orgId}`),
    ]).then(([referral, notifications]) => {
      if (mounted) setDismissed({ referral: referral ?? "", notifications: notifications ?? "" });
    });
    return () => {
      mounted = false;
    };
  }, [orgId]);

  function dismiss(kind: "referral" | "notifications") {
    const value = String(Date.now());
    setDismissed((current) => ({ ...current, [kind]: value }));
    void setStoredValue(`zook_home_${kind}_dismissed_${orgId}`, value);
  }

  const showProfile = Boolean(home?.activeMembership && !home.assignedTrainer);
  const showReferral = Boolean(home?.activeOrganization && !recent(dismissed.referral, 7 * DAY_MS));
  const showNotifications = Boolean((home?.unreadNotifications ?? 0) > 0 && !recent(dismissed.notifications));

  return (
    <View style={styles.stack}>
      {showNotifications ? (
        <Banner
          icon="notifications-outline"
          title={`${home?.unreadNotifications ?? 0} unread updates`}
          body="Payments, plans, and gym messages are waiting."
          actionHref="/notifications"
          actionLabel="Open"
          onDismiss={() => dismiss("notifications")}
        />
      ) : null}
      {showProfile ? (
        <Banner
          icon="person-circle-outline"
          title="Complete your profile"
          body="Add your details so staff and trainers can help faster."
          actionHref="/profile"
          actionLabel="Update"
        />
      ) : null}
      {showReferral ? (
        <Banner
          icon="gift-outline"
          title="Invite a friend"
          body="Share Zook with someone who should train with you."
          actionHref="/profile"
          actionLabel="Referral"
          onDismiss={() => dismiss("referral")}
        />
      ) : null}
    </View>
  );
}

function Banner({
  actionHref,
  actionLabel,
  body,
  icon,
  onDismiss,
  title,
}: {
  actionHref: string;
  actionLabel: string;
  body: string;
  icon: keyof typeof Ionicons.glyphMap;
  onDismiss?: () => void;
  title: string;
}) {
  const { palette } = useTheme();
  return (
    <Card variant="compact" contentStyle={styles.banner}>
      <IconBubble icon={icon} tone="neutral" size={34} />
      <View style={styles.copy}>
        <Text numberOfLines={1} style={[styles.title, { color: palette.text.primary }]}>
          {title}
        </Text>
        <Text numberOfLines={2} style={[styles.body, { color: palette.text.secondary }]}>
          {body}
        </Text>
      </View>
      <ZookButton href={actionHref as never} variant="secondary" size="sm">
        {actionLabel}
      </ZookButton>
      {onDismiss ? (
        <Pressable
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel={`Dismiss ${title}`}
          style={({ pressed }) => [
            styles.dismiss,
            {
              borderColor: palette.border.subtle,
              backgroundColor: palette.surface.raised,
            },
            pressed ? styles.dismissPressed : null,
          ]}
        >
          <Ionicons name="close" size={16} color={palette.text.tertiary} />
        </Pressable>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.sm },
  banner: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  copy: { flex: 1, gap: 2 },
  title: { ...typography.cardTitle },
  body: { ...typography.small },
  dismiss: {
    minHeight: 40,
    minWidth: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  dismissPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
});
