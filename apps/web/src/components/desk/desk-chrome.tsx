import type { ReactNode } from "react";
import Link from "next/link";
import type { Permission } from "@zook/core";
import {
  ClipboardCheck,
  CreditCard,
  CalendarDays,
  QrCode,
  Search,
  ShoppingBag,
} from "lucide-react";
import { UserMenu } from "@/components/dashboard/shell/user-menu";
import { ZookButtonLink } from "@/components/zook-button";
import { deskTranslations } from "./copy";
import { DeskPendingBadge } from "./desk-pending-badge";

type DeskChromeTab = {
  href: string;
  labelKey: {
    [Key in keyof typeof deskTranslations.en]: (typeof deskTranslations.en)[Key] extends string
      ? Key
      : never;
  }[keyof typeof deskTranslations.en];
  icon: ReactNode;
  permissions?: Permission[];
};

const tabs: DeskChromeTab[] = [
  {
    href: "/desk",
    labelKey: "tabApprovals",
    icon: <ClipboardCheck size={18} />,
    permissions: ["ATTENDANCE_APPROVE"],
  },
  {
    href: "/desk/members",
    labelKey: "tabMembers",
    icon: <Search size={18} />,
    permissions: ["MEMBERS_VIEW", "MEMBERS_MANAGE"],
  },
  {
    href: "/desk/payments",
    labelKey: "tabPayments",
    icon: <CreditCard size={18} />,
    permissions: ["PAYMENTS_RECORD_OFFLINE", "PAYMENTS_VIEW"],
  },
  {
    href: "/desk/classes",
    labelKey: "tabClasses",
    icon: <CalendarDays size={18} />,
    permissions: ["ATTENDANCE_APPROVE"],
  },
  {
    href: "/desk/orders",
    labelKey: "tabOrders",
    icon: <ShoppingBag size={18} />,
    permissions: ["SHOP_FULFILL_ORDER"],
  },
  { href: "/desk/qr", labelKey: "tabQr", icon: <QrCode size={18} />, permissions: ["ATTENDANCE_QR_DISPLAY"] },
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
  branchId,
  activeTab,
  locale,
  permissions,
  canOpenManagement,
  user,
  roleLabel = "Reception",
  showSwitchOrganization = false,
}: {
  children: ReactNode;
  orgId: string;
  orgName: string;
  branchId: string | null;
  activeTab: "queue" | "member" | "classes" | "payment" | "pickup";
  locale?: string | null;
  permissions: Permission[];
  canOpenManagement?: boolean;
  user?: { name: string; email: string; preferredLocale?: string | null };
  roleLabel?: string | undefined;
  showSwitchOrganization?: boolean;
}) {
  const copy = deskTranslations[locale === "hi" ? "hi" : "en"];
  const visibleTabs = tabs.filter((tab) =>
    hasAnyPermission(permissions, tab.permissions, Boolean(canOpenManagement)),
  );

  return (
    <div className="min-h-dvh pb-10 bg-[var(--bg)] text-[var(--text-primary)]">
      <header className="sticky top-0 z-40 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
              {orgName}
            </p>
            <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">{copy.receptionDesk}</p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            {canOpenManagement ? (
              <ZookButtonLink tone="ghost" size="sm" href="/dashboard">
                {copy.backToManagement}
              </ZookButtonLink>
            ) : null}
            <UserMenu
              user={user ?? { name: orgName, email: "", preferredLocale: locale ?? null }}
              roleLabel={roleLabel}
              copy={copy}
              showSwitchOrganization={showSwitchOrganization}
            />
          </div>
        </div>
        <nav className="mx-auto mt-3 flex max-w-5xl gap-2 overflow-x-auto pb-1">
          {visibleTabs.map((tab) => {
            const active =
              (tab.href === "/desk" && activeTab === "queue") ||
              (tab.href === "/desk/members" && activeTab === "member") ||
              (tab.href === "/desk/classes" && activeTab === "classes") ||
              (tab.href === "/desk/payments" && activeTab === "payment") ||
              (tab.href === "/desk/orders" && activeTab === "pickup");
            return (
              <Link
                key={tab.href}
                href={tabHref(tab.href, branchId)}
                aria-current={active ? "page" : undefined}
                className={`zook-focus inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold transition border ${
                  active
                    ? "border-[var(--accent-fill)] bg-[var(--accent-fill)] text-[var(--text-on-accent)]"
                    : "border-[var(--border-subtle)] bg-[var(--surface-raised)] text-[var(--text-secondary)] hover:bg-[var(--bg-sunken)]"
                }`}
              >
                {tab.icon}
                <span>{copy[tab.labelKey]}</span>
                {tab.href === "/desk" ? (
                  <DeskPendingBadge orgId={orgId} branchId={branchId} active={active} />
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
