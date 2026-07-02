import { resolvePlanName } from "@zook/ui";
import type { MyPlanRecord } from "@/lib/domains";

export function planTitle(assignment: MyPlanRecord | null | undefined, fallback: string) {
  return resolvePlanName(assignment?.plan) || fallback;
}

export function planKind(assignment?: MyPlanRecord | null) {
  return (assignment?.plan?.type ?? "WORKOUT").toLowerCase();
}
