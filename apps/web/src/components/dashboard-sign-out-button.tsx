"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import clsx from "clsx";

export function DashboardSignOutButton({
  className,
  compact = false,
}: {
  className?: string | undefined;
  compact?: boolean | undefined;
}) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      disabled={signingOut}
      onClick={() => void signOut()}
      className={clsx(
        compact
          ? "zook-focus inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 bg-black/20 px-4 text-sm font-medium text-white/68 transition hover:bg-white/8 hover:text-white disabled:cursor-wait disabled:opacity-60"
          : "flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white/62 transition hover:bg-white/8 hover:text-white disabled:cursor-wait disabled:opacity-60",
        className,
      )}
    >
      <LogOut size={18} />
      {signingOut ? "Signing out..." : "Sign out"}
    </button>
  );
}
