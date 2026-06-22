"use client";

import clsx from "clsx";
import { LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ZookButton } from "@/components/zook-button";
import { getOrigins } from "@/lib/origins";

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
  const [mounted, setMounted] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  async function signOut() {
    setSigningOut(true);
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    queryClient.clear();
    window.location.assign(getOrigins().public);
  }

  return (
    <ZookButton
      type="button"
      tone="ghost"
      size={compact ? "sm" : "md"}
      fullWidth={!compact}
      disabled={!mounted || signingOut}
      state={signingOut ? "loading" : "idle"}
      data-testid="dashboard-sign-out"
      aria-label={compact ? (signingOut ? busyLabel : label) : undefined}
      onClick={() => void signOut()}
      leadingIcon={<LogOut size={compact ? 16 : 18} />}
      className={clsx(compact ? "min-h-10 w-10 px-0" : undefined, className)}
    >
      {compact ? (
        <span className="sr-only">{signingOut ? busyLabel : label}</span>
      ) : (
        signingOut ? busyLabel : label
      )}
    </ZookButton>
  );
}
