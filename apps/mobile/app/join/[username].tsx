import { Redirect, useLocalSearchParams } from "expo-router";

export default function JoinGymAliasScreen() {
  const params = useLocalSearchParams<{ username?: string | string[]; ref?: string | string[] }>();
  const username = Array.isArray(params.username) ? params.username[0] : params.username;
  const referralCode = Array.isArray(params.ref) ? params.ref[0] : params.ref;

  if (!username) {
    return <Redirect href="/find-gyms" />;
  }

  return (
    <Redirect
      href={{
        pathname: "/gym/[username]",
        params: {
          username,
          ...(referralCode ? { ref: referralCode } : {}),
        },
      }}
    />
  );
}
