"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { dashboardMessages, isHindi } from "@/components/dashboard/shell/copy";
import { UserMenu } from "@/components/dashboard/shell/user-menu";

export function CoachChrome({
  children,
  user,
  roleLabel,
  locale,
  showSwitchOrganization = false,
}: {
  children: ReactNode;
  user?: { name: string; email: string; preferredLocale?: string | null };
  roleLabel?: string | undefined;
  locale?: string | null;
  showSwitchOrganization?: boolean;
}) {
  const pathname = usePathname();
  const onCoachHome = pathname === "/coach";
  const onClientWorkspace = pathname.startsWith("/coach/clients/");
  const copy = dashboardMessages[isHindi(locale) ? "hi" : "en"];

  return (
    <div className="min-h-dvh px-5 py-5">
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
                    ? "border-white/20 bg-white/8 text-white"
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
          <UserMenu
            user={user ?? { name: "Zook coach", email: "", preferredLocale: locale ?? null }}
            roleLabel={roleLabel}
            copy={copy}
            showSwitchOrganization={showSwitchOrganization}
          />
        </header>
        <main className="grid gap-5">{children}</main>
      </div>
    </div>
  );
}
