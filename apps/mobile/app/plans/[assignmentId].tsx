import { Redirect, useLocalSearchParams } from "expo-router";

export default function PlanAssignmentRedirect() {
  const { assignmentId } = useLocalSearchParams<{ assignmentId?: string }>();

  if (!assignmentId) {
    return <Redirect href="/plan" />;
  }

  return <Redirect href={`/plan/${assignmentId}` as never} />;
}
