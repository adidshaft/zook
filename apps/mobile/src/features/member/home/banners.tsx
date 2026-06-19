import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Card, IconBubble, ZookButton } from "@/components/primitives";
import { useMyShopOrders } from "@/lib/domains/shop";
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
  const shopOrdersQuery = useMyShopOrders();

  useEffect(() => {
    let mounted = true;
    void getStoredValue(`zook_home_referral_dismissed_${orgId}`).then((referral) => {
      if (mounted) setDismissed({ referral: referral ?? "" });
    });
    return () => {
      mounted = false;
    };
  }, [orgId]);

  function dismiss(kind: "referral") {
    const value = String(Date.now());
    setDismissed((current) => ({ ...current, [kind]: value }));
    void setStoredValue(`zook_home_${kind}_dismissed_${orgId}`, value);
  }

  const showProfile = Boolean(home?.activeMembership && !home.assignedTrainer);
  const showReferral = Boolean(home?.activeOrganization && !recent(dismissed.referral, 7 * DAY_MS));
  const readyOrder = shopOrdersQuery.data?.orders.find(
    (order) => order.pickupCode && !order.fulfilledAt && !/CANCEL|FULFILLED/i.test(order.status),
  );
  const daysLeft = home?.activeMembership?.daysLeft;
  const membershipExpiring = typeof daysLeft === "number" && daysLeft >= 0 && daysLeft <= 7;

  // Most actionable / time-sensitive first. The Shop tab and the header
  // notification bell already cover shop + unread-update prompts, so those
  // banners are intentionally gone. Cap the stack so Home never turns into a
  // wall of banners.
  const banners = [
    readyOrder ? (
      <Banner
        key="pickup"
        icon="bag-check-outline"
        title="Pickup available"
        body={`Show pickup code ${readyOrder.pickupCode} at the desk.`}
        actionHref={`/shop/pickup/${readyOrder.id}`}
        actionLabel="Open"
      />
    ) : null,
    membershipExpiring ? (
      <Banner
        key="renew"
        icon="warning-outline"
        title={daysLeft === 0 ? "Membership ends today" : `${daysLeft} days left`}
        body="Renew now to keep check-ins and plan access moving."
        actionHref="/membership?focus=buy"
        actionLabel="Renew"
      />
    ) : null,
    showProfile ? (
      <Banner
        key="profile"
        icon="person-circle-outline"
        title="Complete your profile"
        body="Add your details so staff and trainers can help faster."
        actionHref="/profile?focus=details"
        actionLabel="Update"
      />
    ) : null,
    showReferral ? (
      <Banner
        key="referral"
        icon="gift-outline"
        title="Invite a friend"
        body="Share Zook with someone who should train with you."
        actionHref="/profile?focus=referral"
        actionLabel="Referral"
        onDismiss={() => dismiss("referral")}
      />
    ) : null,
  ].filter(Boolean);

  const visibleBanners = banners.slice(0, 2);
  if (!visibleBanners.length) return null;

  return <View style={styles.stack}>{visibleBanners}</View>;
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
