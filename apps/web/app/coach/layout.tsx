import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { CoachChrome } from "@/components/coach/coach-chrome";
import {
  destinationToHref,
  hasCoachAccess,
  hasOwnerDashboardAccess,
  resolvePostLoginDestination,
} from "@/lib/auth-destinations";
import { getOrigins } from "@/lib/origins";
import { requireDashboardSession } from "@/lib/server-auth";

export default async function CoachLayout({ children }: { children: ReactNode }) {
  const session = await requireDashboardSession({
    expectedHost: "dashboard",
    redirectPath: "/coach",
  });
  const origins = getOrigins();
  if (session.user.isPlatformAdmin || hasOwnerDashboardAccess(session)) {
    redirect("/dashboard");
  }
  if (!hasCoachAccess(session)) {
    redirect(destinationToHref(resolvePostLoginDestination(session), "dashboard", origins));
  }

  return <CoachChrome>{children}</CoachChrome>;
}
