import { Redirect, Stack, useLocalSearchParams } from "expo-router";

export default function GymUsernameAliasScreen() {
  const params = useLocalSearchParams<{ username?: string | string[]; ref?: string | string[] }>();
  const username = Array.isArray(params.username) ? params.username[0] : params.username;
  const referralCode = Array.isArray(params.ref) ? params.ref[0] : params.ref;

  if (!username) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false, animation: "none" }} />
        <Redirect href="/gyms" />
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false, animation: "none" }} />
      <Redirect
        href={{
          pathname: "/gyms/[username]",
          params: {
            username,
            ...(referralCode ? { ref: referralCode } : {}),
          },
        }}
      />
    </>
  );
}
