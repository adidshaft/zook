"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { DashboardSignOutButton } from "@/components/dashboard-sign-out-button";

export function CoachChrome({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-dvh px-5 py-5">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 left-1/4 h-[420px] w-[420px] rounded-full bg-lime-300/[0.05] blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 h-[380px] w-[380px] rounded-full bg-sky-300/[0.04] blur-[120px]" />
      </div>
      <div className="mx-auto grid max-w-5xl gap-5">
        <header className="flex items-center justify-between gap-3">
          <Link href="/" className="text-sm font-semibold text-white/70">
            Zook
          </Link>
          <DashboardSignOutButton compact />
        </header>
        <main className="grid gap-5">{children}</main>
      </div>
    </div>
  );
}
