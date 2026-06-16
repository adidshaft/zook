"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DashboardSignOutButton } from "@/components/dashboard-sign-out-button";

export function CoachChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const onCoachHome = pathname === "/coach";
  const onClientWorkspace = pathname.startsWith("/coach/clients/");

  return (
    <div className="relative min-h-dvh px-5 py-5">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 left-1/4 h-[420px] w-[420px] rounded-full bg-lime-300/[0.05] blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 h-[380px] w-[380px] rounded-full bg-sky-300/[0.04] blur-[120px]" />
      </div>
      <div className="mx-auto grid max-w-5xl gap-5">
        <header className="flex flex-col gap-3 rounded-[28px] border border-white/10 bg-white/[0.03] p-4 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/coach" className="text-sm font-semibold text-white/70 transition hover:text-white">
              Zook coach
            </Link>
            <nav aria-label="Coach navigation" className="flex flex-wrap items-center gap-2">
              <Link
                href="/coach"
                aria-current={onCoachHome ? "page" : undefined}
                className={[
                  "inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold transition",
                  onCoachHome
                    ? "border-lime-300/40 bg-lime-300/15 text-lime-100"
                    : "border-white/10 bg-white/[0.03] text-white/70 hover:border-white/20 hover:text-white",
                ].join(" ")}
              >
                Overview
              </Link>
              {onClientWorkspace ? (
                <span
                  aria-current="page"
                  className="inline-flex min-h-11 items-center rounded-full border border-sky-300/35 bg-sky-300/10 px-4 text-sm font-semibold text-sky-100"
                >
                  Client workspace
                </span>
              ) : null}
            </nav>
          </div>
          <DashboardSignOutButton compact />
        </header>
        <main className="grid gap-5">{children}</main>
      </div>
    </div>
  );
}
