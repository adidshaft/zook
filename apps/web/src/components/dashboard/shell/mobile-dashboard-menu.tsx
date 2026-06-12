"use client";

import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import {
  ExternalLink,
  Globe2,
  Menu,
} from "lucide-react";
import { useEffect, useRef } from "react";
import { DashboardSignOutButton } from "../../dashboard-sign-out-button";
import { translatedGroupLabel, translatedNavLabel } from "./copy";
import { isActiveNav, NAV_ICONS } from "./nav";
import { prefetchDashboardHref } from "./prefetch";
import type { DashboardCopy } from "./types";

export type MobileNavGroup = {
  key: keyof DashboardCopy["navGroups"];
  items: Array<{ key: string; label: string; href: string; shortLabel?: string | undefined }>;
};


export function MobileDashboardMenu({
  visibleNavGroups,
  sectionKey,
  copy,
  activeOrgId,
  activeBranchId,
}: {
  visibleNavGroups: MobileNavGroup[];
  sectionKey: string;
  copy: DashboardCopy;
  activeOrgId?: string | undefined;
  activeBranchId?: string | undefined;
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const queryClient = useQueryClient();
  const activeItem = visibleNavGroups
    .flatMap((group) => group.items)
    .find((item) => isActiveNav(item.href, sectionKey));

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        detailsRef.current &&
        detailsRef.current.open &&
        !detailsRef.current.contains(event.target as Node)
      ) {
        detailsRef.current.open = false;
      }
    }
    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  function prefetchSection(href: string) {
    prefetchDashboardHref({ queryClient, href, orgId: activeOrgId, branchId: activeBranchId });
  }

  return (
    <details
      ref={detailsRef}
      className="group relative z-[var(--z-dropdown)] lg:hidden"
      onKeyDown={(event) => {
        if (event.key === "Escape" && detailsRef.current?.open) {
          detailsRef.current.open = false;
          detailsRef.current.querySelector("summary")?.focus();
        }
      }}
    >
      <summary className="zook-focus flex min-h-12 cursor-pointer list-none items-center justify-between rounded-[24px] border border-[var(--border)] bg-[var(--surface-raised)] px-4 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--bg-sunken)] [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center gap-2">
          <Menu size={18} />
          {copy.common.openMenu}
        </span>
        <span className="text-xs text-[var(--text-tertiary)] group-open:hidden">
          {activeItem ? translatedNavLabel(copy, activeItem) : copy.nav.today}
        </span>
        <span className="hidden text-xs text-[var(--text-tertiary)] group-open:inline">{copy.common.closeMenu}</span>
      </summary>

      {/* Backdrop Overlay */}
      <div
        className="fixed inset-0 z-[var(--z-overlay)] hidden bg-black/40 backdrop-blur-xs transition-opacity group-open:block"
        onClick={() => {
          if (detailsRef.current) {
            detailsRef.current.open = false;
          }
        }}
      />

      <div className="absolute inset-x-0 top-full z-[var(--z-modal)] mt-2 rounded-[28px] border border-[var(--border)] bg-[var(--surface-raised)]/95 p-3 shadow-[var(--shadow-lg)] backdrop-blur">
        <nav className="grid gap-4">
          {visibleNavGroups.map((group) => (
            <div key={group.key} className="grid gap-1">
              <p className="px-3 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)] opacity-60">
                {translatedGroupLabel(copy, group.key)}
              </p>
              {group.items.map((item) => {
                const { href } = item;
                const Icon = NAV_ICONS[item.key] ?? Globe2;
                const active = isActiveNav(href, sectionKey);
                return (
                  <Link
                    key={href}
                    href={href}
                    prefetch
                    onFocus={() => prefetchSection(href)}
                    onTouchStart={() => prefetchSection(href)}
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
          <Link
            href="/pricing"
            target="_blank"
            rel="noreferrer"
            className="zook-focus mb-3 flex items-center gap-3 rounded-2xl px-3 py-3 text-sm text-[var(--text-secondary)] transition hover:bg-[var(--bg-sunken)] hover:text-[var(--text-primary)]"
          >
            <ExternalLink size={18} />
            Pricing
          </Link>
          <DashboardSignOutButton
            label={copy.common.signOut}
            busyLabel={copy.common.signingOut}
          />
        </div>
      </div>
    </details>
  );
}
