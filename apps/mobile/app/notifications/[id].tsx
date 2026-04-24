import { Redirect, useLocalSearchParams } from "expo-router";

export default function NotificationAliasScreen() {
  const params = useLocalSearchParams<{ id?: string | string[]; orgId?: string | string[] }>();
  const notificationId = Array.isArray(params.id) ? params.id[0] : params.id;
  const orgId = Array.isArray(params.orgId) ? params.orgId[0] : params.orgId;

  return (
    <Redirect
      href={{
        pathname: "/notifications",
        params: {
          ...(notificationId ? { notificationId } : {}),
          ...(orgId ? { orgId } : {}),
        },
      }}
    />
  );
}
