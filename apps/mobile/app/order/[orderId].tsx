import { Redirect, useLocalSearchParams } from "expo-router";

export default function OrderAliasScreen() {
  const params = useLocalSearchParams<{
    orderId?: string | string[];
    notificationId?: string | string[];
    orgId?: string | string[];
    focus?: string | string[];
  }>();
  const orderId = Array.isArray(params.orderId) ? params.orderId[0] : params.orderId;
  const notificationId = Array.isArray(params.notificationId)
    ? params.notificationId[0]
    : params.notificationId;
  const orgId = Array.isArray(params.orgId) ? params.orgId[0] : params.orgId;
  const focus = Array.isArray(params.focus) ? params.focus[0] : params.focus;

  return (
    <Redirect
      href={{
        pathname: "/shop",
        params: {
          ...(orderId ? { orderId } : {}),
          ...(notificationId ? { notificationId } : {}),
          ...(orgId ? { orgId } : {}),
          focus: focus ?? "shop-order",
        },
      }}
    />
  );
}
