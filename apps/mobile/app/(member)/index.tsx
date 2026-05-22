import { Stack } from "expo-router";
import { RefreshControl, ScrollView, StyleSheet } from "react-native";

import { MobileHeader, QueryErrorState, Skeleton, ZookScreen } from "@/components/primitives";
import { RoleSwitcherChip } from "@/components/role-switcher";
import { Banners } from "@/features/member/home/banners";
import { renderHomeCard } from "@/features/member/home/render";
import { deriveHomeState } from "@/features/member/home/state";
import { useAuth } from "@/lib/auth";
import { useMemberHome } from "@/lib/domains/member";
import { layout, spacing } from "@/lib/theme";
import { useTheme } from "@/lib/theme/index";

export default function HomeScreen() {
  const { session } = useAuth();
  const { palette } = useTheme();
  const homeQuery = useMemberHome();
  const home = homeQuery.data;
  const state = deriveHomeState(home);
  const firstName = session?.user.name?.trim().split(/\s+/)[0] || "Member";

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

          {homeQuery.isLoading ? <HomeLoading /> : null}
          {homeQuery.isError ? (
            <QueryErrorState error={homeQuery.error} onRetry={() => void homeQuery.refetch()} />
          ) : null}
          {!homeQuery.isLoading && !homeQuery.isError ? (
            <>
              <Banners home={home} />
              {renderHomeCard(state)}
            </>
          ) : null}
        </ScrollView>
      </ZookScreen>
    </>
  );
}

function HomeLoading() {
  return (
    <>
      <Skeleton width="100%" height={72} borderRadius={18} />
      <Skeleton width="100%" height={210} borderRadius={24} />
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    alignSelf: "center",
    gap: spacing.md,
    maxWidth: layout.contentWidth,
    paddingBottom: layout.bottomNavContentPadding,
    paddingTop: 14,
    width: "100%",
  },
});
