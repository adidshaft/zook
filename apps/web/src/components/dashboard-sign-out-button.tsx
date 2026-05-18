"use client";

import { LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ZookButton } from "@/components/zook-button";

export function DashboardSignOutButton({
  className,
  compact = false,
  label = "Sign out",
  busyLabel = "Signing out...",
}: {
  className?: string | undefined;
  compact?: boolean | undefined;
  label?: string | undefined;
  busyLabel?: string | undefined;
}) {
  const queryClient = useQueryClient();
  const [ready, setReady] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  async function signOut() {
    setSigningOut(true);
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    queryClient.clear();
    window.location.assign("/login");
  }

  return (
    <ZookButton
      type="button"
      tone="ghost"
      size={compact ? "sm" : "md"}
      fullWidth={!compact}
      disabled={!ready || signingOut}
      state={signingOut ? "loading" : "idle"}
      data-testid="dashboard-sign-out"
      onClick={() => void signOut()}
      leadingIcon={<LogOut size={18} />}
      {...(className ? { className } : {})}
    >
      {signingOut ? busyLabel : label}
    </ZookButton>
  );
}
