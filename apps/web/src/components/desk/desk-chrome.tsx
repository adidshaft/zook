"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { Permission } from "@zook/core";
import {
  ClipboardCheck,
  CreditCard,
  LayoutDashboard,
  QrCode,
  Search,
  ShoppingBag,
} from "lucide-react";
import { DashboardLocaleToggle } from "@/components/dashboard-locale-toggle";
import { DashboardSignOutButton } from "@/components/dashboard-sign-out-button";
import { ZookButtonLink } from "@/components/zook-button";
import { ThemeToggleButton } from "@/components/theme-preference-switcher";
import { useOperationalResource } from "@/lib/use-operational-resource";
import { deskTranslations } from "./copy";

type DeskChromeTab = {
  href: string;
  label: string;
  icon: ReactNode;
  permissions?: Permission[];
};

const tabs: DeskChromeTab[] = [
  {
    href: "/desk",
    label: "Approvals",
    icon: <ClipboardCheck size={18} />,
    permissions: ["ATTENDANCE_APPROVE"],
  },
  {
    href: "/desk/members",
    label: "Members",
    icon: <Search size={18} />,
    permissions: ["MEMBERS_VIEW", "MEMBERS_MANAGE"],
  },
  {
    href: "/desk/payments",
    label: "Payments",
    icon: <CreditCard size={18} />,
    permissions: ["PAYMENTS_RECORD_OFFLINE", "PAYMENTS_VIEW"],
  },
  {
    href: "/desk/orders",
    label: "Orders",
    icon: <ShoppingBag size={18} />,
    permissions: ["SHOP_FULFILL_ORDER"],
  },
  { href: "/desk/qr", label: "QR", icon: <QrCode size={18} />, permissions: ["ATTENDANCE_QR_DISPLAY"] },
];

function tabHref(href: string, branchId: string | null) {
  return branchId ? `${href}?branchId=${encodeURIComponent(branchId)}` : href;
}

function hasAnyPermission(
  permissions: Permission[],
  required: Permission[] | undefined,
  isManagementUser: boolean,
) {
  if (isManagementUser || !required?.length) return true;
  return required.some((permission) => permissions.includes(permission));
}

export function DeskChrome({
  children,
  orgId,
  orgName,
  locale,
  permissions,
  canOpenManagement,
}: {
  children: ReactNode;
  orgId: string;
  orgName: string;
  locale?: string | null;
  permissions: Permission[];
  canOpenManagement?: boolean;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const branchId = searchParams.get("branchId");
  const copy = deskTranslations[locale === "hi" ? "hi" : "en"];
  const pendingState = useOperationalResource<{ records: unknown[] }>({
    path: branchId
      ? `/api/orgs/${orgId}/attendance/live?branchId=${encodeURIComponent(branchId)}`
      : `/api/orgs/${orgId}/attendance/live`,
    refreshMs: 15_000,
  });
  const pendingCount = pendingState.data?.records.length ?? 0;
  const visibleTabs = tabs.filter((tab) =>
    hasAnyPermission(permissions, tab.permissions, Boolean(canOpenManagement)),
  );

  return (
    <div className="min-h-dvh pb-10 bg-[var(--bg)] text-[var(--text-primary)]">
      <header className="sticky top-0 z-40 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold uppercase tracking-[0.14em] text-[var(--text-primary)]">
              {orgName}
            </p>
            <div className="mt-1 flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
              <LayoutDashboard size={14} className="text-[var(--text-tertiary)]" />
              <span>Reception desk</span>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            {canOpenManagement ? (
              <ZookButtonLink tone="ghost" size="sm" href="/dashboard">
                {copy.backToManagement}
              </ZookButtonLink>
            ) : null}
            <ThemeToggleButton />
            <DashboardLocaleToggle locale={locale ?? undefined} labels={copy.common} />
            <DashboardSignOutButton
              compact
              label={copy.common.signOut}
              busyLabel={copy.common.signingOut}
            />
          </div>
        </div>
        <nav className="mx-auto mt-3 flex max-w-5xl gap-2 overflow-x-auto pb-1">
          {visibleTabs.map((tab) => {
            const active =
              tab.href === "/desk"
                ? pathname === tab.href
                : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
            return (
              <Link
                key={tab.href}
                href={tabHref(tab.href, branchId)}
                aria-current={active ? "page" : undefined}
                className={`zook-focus inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold transition border ${
                  active
                    ? "border-[var(--accent-fill)] bg-[var(--accent-fill)] text-[var(--text-on-accent)] shadow-[var(--shadow-glow-accent)]"
                    : "border-[var(--border-subtle)] bg-[var(--surface-raised)] text-[var(--text-secondary)] hover:bg-[var(--bg-sunken)]"
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.href === "/desk" && pendingCount > 0 ? (
                  <span
                    className={`grid min-h-5 min-w-5 place-items-center rounded-full px-1 text-[10px] font-bold ${
                      active ? "bg-black/10 dark:bg-white/20 text-[var(--text-on-accent)]" : "bg-[var(--surface-accent-soft)] text-[var(--accent-strong)] border border-[var(--border)]"
                    }`}
                  >
                    {pendingCount}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
}
