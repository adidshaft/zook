import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, type Href } from "expo-router";

import { IconBubble } from "@/components/primitives";
import { getTonePalette, type PillTone } from "@/components/primitives/tone-palette";
import type { MemberHomeData } from "@/lib/domains/shared/types";
import { useT } from "@/lib/i18n";
import { getStoredValue, setStoredValue } from "@/lib/storage";
import { spacing, typography, useTheme } from "@/lib/theme";

const DAY_MS = 86_400_000;

function recent(timestamp?: string | null, windowMs = DAY_MS) {
  if (!timestamp) return false;
  const parsed = Number(timestamp);
  return Number.isFinite(parsed) && Date.now() - parsed < windowMs;
}

export function Banners({ home }: { home?: MemberHomeData }) {
  const t = useT();
  const [dismissed, setDismissed] = useState<Record<string, string>>({});
  const orgId = home?.activeOrganization?.id ?? "none";

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
  const daysLeft = home?.activeMembership?.daysLeft;
  const membershipExpiring = typeof daysLeft === "number" && daysLeft <= 7;
  const homeAccessCardOwnsRenewal = Boolean(home?.activeMembership);

  // Most actionable / time-sensitive first. The Shop tab and the header
  // notification bell already cover shop + unread-update prompts, so those
  // banners are intentionally gone. Cap the stack so Home never turns into a
  // wall of banners.
  const banners = [
    membershipExpiring && !homeAccessCardOwnsRenewal ? (
      <Banner
        key="renew"
        icon="warning-outline"
        title={
          (daysLeft ?? 0) <= 0
            ? t("member.home.membershipEndsToday")
            : t("member.home.daysLeft", { count: daysLeft ?? 0 })
        }
        body={t("member.home.renewNowBody")}
        actionHref="/membership/buy"
        actionLabel={t("member.home.renew")}
        tone={(daysLeft ?? 0) <= 0 ? "red" : "amber"}
      />
    ) : null,
    showProfile ? (
      <Banner
        key="profile"
        icon="person-circle-outline"
        title={t("member.home.completeProfile")}
        body={t("member.home.completeProfileBody")}
        actionHref="/profile?focus=details"
        actionLabel={t("member.home.update")}
      />
    ) : null,
    showReferral ? (
      <Banner
        key="referral"
        icon="gift-outline"
        title={t("member.home.inviteFriend")}
        body={t("member.home.inviteFriendBody")}
        actionHref="/profile?focus=referral"
        actionLabel={t("member.home.referral")}
        onDismiss={() => dismiss("referral")}
      />
    ) : null,
  ].filter(Boolean);

  const visibleBanners = banners.slice(0, 1);
  if (!visibleBanners.length) return null;

  return <View style={styles.stack}>{visibleBanners}</View>;
}

function Banner({
  actionHref,
  actionLabel,
  body,
  icon,
  onDismiss,
  tone = "neutral",
  title,
}: {
  actionHref: string;
  actionLabel: string;
  body: string;
  icon: keyof typeof Ionicons.glyphMap;
  onDismiss?: () => void;
  tone?: PillTone;
  title: string;
}) {
  const { palette, mode } = useTheme();
  const router = useRouter();
  const tonePalette = getTonePalette(tone, mode, palette);
  const t = useT();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={actionLabel}
      onPress={() => router.push(actionHref as Href)}
      style={({ pressed }) => [
        styles.banner,
        {
          backgroundColor: tone === "neutral" ? palette.surface.default : tonePalette.backgroundColor,
          borderColor: tone === "neutral" ? palette.border.subtle : tonePalette.borderColor,
        },
        pressed ? styles.actionPressed : null,
      ]}
    >
      <IconBubble icon={icon} tone={tone} size={24} />
      <View style={styles.copy}>
        <Text numberOfLines={1} style={[styles.title, { color: palette.text.primary }]}>
          {title}
        </Text>
        <Text numberOfLines={1} style={[styles.body, { color: palette.text.secondary }]}>
          {body}
        </Text>
      </View>
      <View
        style={[
          styles.action,
          {
            borderColor: palette.border.subtle,
            backgroundColor: palette.surface.raised,
          },
        ]}
      >
        <Text numberOfLines={1} style={[styles.actionText, { color: palette.text.primary }]}>
          {actionLabel}
        </Text>
        <Ionicons name="chevron-forward" size={16} color={palette.text.secondary} />
      </View>
      {onDismiss ? (
        <Pressable
          onPress={(event) => {
            event.stopPropagation();
            onDismiss();
          }}
          accessibilityRole="button"
          accessibilityLabel={t("member.home.dismissBanner", { title })}
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
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.xs },
  banner: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  copy: { flex: 1, gap: 2 },
  title: {
    ...typography.caption,
    fontFamily: "Inter_700Bold",
  },
  body: { ...typography.small },
  action: {
    flexDirection: "row",
    gap: 2,
    minHeight: 32,
    minWidth: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 7,
  },
  actionText: {
    ...typography.caption,
    maxWidth: 72,
  },
  actionPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  dismiss: {
    minHeight: 32,
    minWidth: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  dismissPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
});
