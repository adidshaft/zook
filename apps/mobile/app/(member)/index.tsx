import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  Card,
  IconBubble,
  MobileHeader,
  QueryErrorState,
  ZookButton,
  ZookScreen,
} from "@/components/primitives";
import { RoleSwitcherChip } from "@/components/role-switcher";
import { HomeSkeleton } from "@/components/skeletons";
import { Banners } from "@/features/member/home/banners";
import { renderHomeCard } from "@/features/member/home/render";
import { deriveHomeState } from "@/features/member/home/state";
import { useAuth } from "@/lib/auth";
import { useMemberHome } from "@/lib/domains/member";
import { type ActiveCheckIn, useManualCheckout } from "@/lib/use-geofence-checkout";
import { layout, spacing } from "@/lib/theme";
import { useTheme } from "@/lib/theme/index";

function formatDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function secondsSince(value: string) {
  const startedAt = new Date(value).getTime();
  if (Number.isNaN(startedAt)) {
    return 0;
  }
  return Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
}

function ActiveCheckInCard({
  activeCheckIn,
  busy,
  onStop,
}: {
  activeCheckIn: ActiveCheckIn;
  busy: boolean;
  onStop: () => void;
}) {
  const { palette } = useTheme();
  const [elapsedSeconds, setElapsedSeconds] = useState(() =>
    secondsSince(activeCheckIn.checkedInAt),
  );

  useEffect(() => {
    setElapsedSeconds(secondsSince(activeCheckIn.checkedInAt));
    const timer = setInterval(() => {
      setElapsedSeconds(secondsSince(activeCheckIn.checkedInAt));
    }, 1000);
    return () => clearInterval(timer);
  }, [activeCheckIn.checkedInAt]);

  return (
    <Card glow contentStyle={styles.activeSessionCard}>
      <View style={styles.activeSessionHeader}>
        <IconBubble icon="time-outline" tone="lime" size={42} />
        <View style={styles.activeSessionCopy}>
          <Text style={[styles.activeSessionLabel, { color: palette.text.secondary }]}>
            Active check-in
          </Text>
          <Text style={[styles.activeSessionBranch, { color: palette.text.primary }]}>
            {activeCheckIn.branchName ?? "Current branch"}
          </Text>
        </View>
      </View>
      <Text style={[styles.activeSessionTimer, { color: palette.accent.base }]}>
        {formatDuration(elapsedSeconds)}
      </Text>
      <Text style={[styles.activeSessionHint, { color: palette.text.secondary }]}>
        Re-scan the branch QR to check out, or stop it here.
      </Text>
      <ZookButton onPress={onStop} disabled={busy} icon="stop-circle-outline" variant="secondary">
        {busy ? "Stopping..." : "Stop session"}
      </ZookButton>
    </Card>
  );
}

export default function HomeScreen() {
  const { session } = useAuth();
  const { palette } = useTheme();
  const homeQuery = useMemberHome();
  const home = homeQuery.data;
  const state = deriveHomeState(home);
  const firstName = session?.user.name?.trim().split(/\s+/)[0] || "Member";
  const { activeCheckIn, checkoutBusy, stopActiveCheckIn } = useManualCheckout();

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ZookScreen testID="member-home-screen">
        <ScrollView
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={homeQuery.isRefetching}
              onRefresh={() => void homeQuery.refetch()}
              tintColor={palette.accent.base}
              colors={[palette.accent.base]}
            />
          }
        >
          <MobileHeader
            eyebrow={home?.activeOrganization?.name ?? "Member"}
            title={`Hello, ${firstName}`}
            subtitle="Today in your gym"
            chip={<RoleSwitcherChip />}
            showProfileShortcut={false}
          />

          {homeQuery.isLoading ? <HomeSkeleton /> : null}
          {homeQuery.isError ? (
            <QueryErrorState error={homeQuery.error} onRetry={() => void homeQuery.refetch()} />
          ) : null}
          {!homeQuery.isLoading && !homeQuery.isError ? (
            <>
              {activeCheckIn ? (
                <ActiveCheckInCard
                  activeCheckIn={activeCheckIn}
                  busy={checkoutBusy}
                  onStop={() => void stopActiveCheckIn("manual")}
                />
              ) : null}
              {renderHomeCard(state)}
              <Banners home={home} />
            </>
          ) : null}
        </ScrollView>
      </ZookScreen>
    </>
  );
}

function HomeLoading() {
  const { palette } = useTheme();

  return (
    <Card variant="compact" contentStyle={styles.loadingCard}>
      <IconBubble icon="flash-outline" tone="lime" size={42} />
      <View style={styles.loadingCopy}>
        <Text style={[styles.loadingTitle, { color: palette.text.primary }]}>Loading today</Text>
        <Text style={[styles.loadingBody, { color: palette.text.secondary }]}>
          Getting your membership and plan status.
        </Text>
      </View>
      <ActivityIndicator color={palette.accent.base} />
    </Card>
  );
}

const styles = StyleSheet.create({
  content: {
    alignSelf: "center",
    gap: spacing.md,
    maxWidth: layout.contentWidth,
    paddingBottom: layout.bottomNavContentPadding,
    paddingTop: 20,
    width: "100%",
  },
  loadingCard: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 86,
  },
  loadingCopy: { flex: 1, gap: 3 },
  loadingTitle: { fontFamily: "Inter_700Bold", fontSize: 16 },
  loadingBody: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 18 },
  activeSessionCard: {
    gap: spacing.md,
    padding: 16,
  },
  activeSessionHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  activeSessionCopy: {
    flex: 1,
    gap: 3,
  },
  activeSessionLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    textTransform: "uppercase",
  },
  activeSessionBranch: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
  },
  activeSessionTimer: {
    fontFamily: "Inter_800ExtraBold",
    fontSize: 44,
    letterSpacing: 0,
    lineHeight: 50,
  },
  activeSessionHint: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 18,
  },
});
