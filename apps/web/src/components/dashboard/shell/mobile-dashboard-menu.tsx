"use client";

import Link from "next/link";
import {
  Bell,
  Bot,
  ClipboardList,
  Dumbbell,
  FileText,
  Globe2,
  History,
  Menu,
  QrCode,
  Receipt,
  ReceiptText,
  Settings,
  Shield,
  Store,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useRef } from "react";
import { DashboardSignOutButton } from "../../dashboard-sign-out-button";
import { translatedGroupLabel, translatedNavLabel } from "./copy";
import { isActiveNav } from "./nav";
import type { DashboardCopy } from "./types";

export type MobileNavGroup = {
  key: keyof DashboardCopy["navGroups"];
  items: Array<{ key: string; label: string; href: string; shortLabel?: string | undefined }>;
};

const mobileNavIcons: Record<string, LucideIcon> = {
  today: Dumbbell,
  attendance: QrCode,
  payments: ReceiptText,
  refunds: Receipt,
  shop: Store,
  shopOrders: Store,
  reports: FileText,
  billing: ReceiptText,
  members: Users,
  plans: ClipboardList,
  coupons: ClipboardList,
  offers: ClipboardList,
  referrals: ClipboardList,
  team: Shield,
  messages: Bell,
  templates: Bell,
  history: History,
  branches: Globe2,
  gymProfile: Globe2,
  activity: History,
  ai: Bot,
  settings: Settings,
};

export function MobileDashboardMenu({
  visibleNavGroups,
  sectionKey,
  copy,
}: {
  visibleNavGroups: MobileNavGroup[];
  sectionKey: string;
  copy: DashboardCopy;
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  return (
    <details
      ref={detailsRef}
      className="group relative z-[100] lg:hidden"
      onKeyDown={(event) => {
        if (event.key === "Escape" && detailsRef.current?.open) {
          detailsRef.current.open = false;
        }
      }}
    >
      <summary className="zook-focus flex min-h-12 cursor-pointer list-none items-center justify-between rounded-[24px] border border-[var(--border)] bg-[var(--surface-raised)] px-4 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--bg-sunken)] [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center gap-2">
          <Menu size={18} />
          {copy.common.openMenu}
        </span>
        <span className="text-xs text-[var(--text-tertiary)] group-open:hidden">{copy.nav.today}</span>
        <span className="hidden text-xs text-[var(--text-tertiary)] group-open:inline">{copy.common.closeMenu}</span>
      </summary>
      <div className="absolute inset-x-0 top-full z-[120] mt-2 rounded-[28px] border border-[var(--border)] bg-[var(--surface-raised)]/95 p-3 shadow-[var(--shadow-lg)] backdrop-blur">
        <nav className="grid gap-4">
          {visibleNavGroups.map((group) => (
            <div key={group.key} className="grid gap-1">
              <p className="px-3 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)] opacity-60">
                {translatedGroupLabel(copy, group.key)}
              </p>
              {group.items.map((item) => {
                const { href } = item;
                const Icon = mobileNavIcons[item.key] ?? Globe2;
                const active = isActiveNav(href, sectionKey);
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={`zook-focus flex items-center gap-3 rounded-2xl px-3 py-3 text-sm transition ${
                      active ? "bg-[var(--accent-fill)] text-[var(--text-on-accent)]" : "text-[var(--text-secondary)] hover:bg-[var(--bg-sunken)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    <Icon size={18} />
                    {translatedNavLabel(copy, item)}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="mt-4 border-t border-[var(--border-subtle)] pt-3">
          <DashboardSignOutButton
            label={copy.common.signOut}
            busyLabel={copy.common.signingOut}
          />
        </div>
      </div>
    </details>
  );
}
