"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
  const router = useRouter();
  const queryClient = useQueryClient();
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    queryClient.clear();
    router.push("/login");
    router.refresh();
  }

  return (
    <ZookButton
      type="button"
      tone="ghost"
      size={compact ? "sm" : "md"}
      fullWidth={!compact}
      disabled={signingOut}
      state={signingOut ? "loading" : "idle"}
      onClick={() => void signOut()}
      leadingIcon={<LogOut size={18} />}
      {...(className ? { className } : {})}
    >
      {signingOut ? busyLabel : label}
    </ZookButton>
  );
}
