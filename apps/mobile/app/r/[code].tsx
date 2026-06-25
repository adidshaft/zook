import { Redirect, Stack, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { ZookScreen } from "@/components/primitives";
import { mobileApiFetch } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { typography, useTheme } from "@/lib/theme";

export default function ReferralAliasScreen() {
  const { palette } = useTheme();
  const t = useT();
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
      <>
        <Stack.Screen options={{ headerShown: false, animation: "none" }} />
        <Redirect
          href={{
            pathname: "/gyms/[username]",
            params: { username: referralQuery.data.org.username, ref: code },
          }}
        />
      </>
    );
  }

  if (!code || referralQuery.isError) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false, animation: "none" }} />
        <Redirect
          href={{
            pathname: "/gyms",
            params: {
              ...(code ? { ref: code, focus: "referral" } : {}),
            },
          }}
        />
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false, animation: "none" }} />
      <ZookScreen>
        <View style={styles.center}>
          <ActivityIndicator color={palette.accent.fill} />
          <Text style={[styles.text, { color: palette.text.secondary }]}>{t("referral.opening")}</Text>
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
