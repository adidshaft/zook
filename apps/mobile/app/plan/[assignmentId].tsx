import { Redirect, useLocalSearchParams, type Href } from "expo-router";

export default function PlanAliasScreen() {
  const params = useLocalSearchParams<{
    assignmentId?: string | string[];
    planId?: string | string[];
    notificationId?: string | string[];
    orgId?: string | string[];
    focus?: string | string[];
  }>();
  const assignmentId = Array.isArray(params.assignmentId)
    ? params.assignmentId[0]
    : params.assignmentId;
  const planId = Array.isArray(params.planId) ? params.planId[0] : params.planId;
  const notificationId = Array.isArray(params.notificationId)
    ? params.notificationId[0]
    : params.notificationId;
  const orgId = Array.isArray(params.orgId) ? params.orgId[0] : params.orgId;
  const focus = Array.isArray(params.focus) ? params.focus[0] : params.focus;

  const query = new URLSearchParams({
    ...(planId ? { planId } : {}),
    ...(notificationId ? { notificationId } : {}),
    ...(orgId ? { orgId } : {}),
    focus: focus ?? "plan",
  }).toString();
  const target = `/plans/${encodeURIComponent(assignmentId ?? planId ?? "")}${query ? `?${query}` : ""}`;

  return <Redirect href={target as Href} />;
}
