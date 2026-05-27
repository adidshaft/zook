import { Redirect, Stack, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { ZookScreen } from "@/components/primitives";
import { mobileApiFetch } from "@/lib/api";
import { typography, useTheme } from "@/lib/theme";

export default function ReferralAliasScreen() {
  const { palette } = useTheme();
  const params = useLocalSearchParams<{ code?: string | string[] }>();
  const code = (Array.isArray(params.code) ? params.code[0] : params.code)?.toUpperCase();
  const referralQuery = useQuery({
    queryKey: ["referral", "alias", code],
    queryFn: () =>
      mobileApiFetch<{
        referral?: { code: string } | null;
        org?: { username?: string | null } | null;
      }>(`/r/${encodeURIComponent(code ?? "")}`),
    enabled: Boolean(code),
    retry: 1,
    staleTime: 5 * 60_000,
  });

  if (referralQuery.data?.org?.username) {
    return (
      <Redirect
        href={{
          pathname: "/g/[username]",
          params: { username: referralQuery.data.org.username, ref: code },
        }}
      />
    );
  }

  if (!code || referralQuery.isError) {
    return (
      <Redirect
        href={{
          pathname: "/gyms",
          params: {
            ...(code ? { ref: code, focus: "referral" } : {}),
          },
        }}
      />
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ZookScreen>
        <View style={styles.center}>
          <ActivityIndicator color={palette.accent.fill} />
          <Text style={[styles.text, { color: palette.text.secondary }]}>Opening referral...</Text>
        </View>
      </ZookScreen>
    </>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  text: {
    ...typography.body,
  },
});
