"use client";

import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Globe2, Menu, X } from "lucide-react";
import { useState } from "react";
import { DashboardSignOutButton } from "../../dashboard-sign-out-button";
import { useModalFocusTrap } from "@/components/ui/use-modal-focus-trap";
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
  const [open, setOpen] = useState(false);
  const dialogRef = useModalFocusTrap<HTMLDivElement>({ open, onClose: () => setOpen(false) });
  const queryClient = useQueryClient();
  const activeItem = visibleNavGroups
    .flatMap((group) => group.items)
    .find((item) => isActiveNav(item.href, sectionKey));

  function prefetchSection(href: string) {
    prefetchDashboardHref({ queryClient, href, orgId: activeOrgId, branchId: activeBranchId });
  }

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="zook-focus flex min-h-12 w-full items-center justify-between rounded-[24px] border border-[var(--border)] bg-[var(--surface-raised)] px-4 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--bg-sunken)] lg:hidden"
      >
        <span className="inline-flex items-center gap-2">
          <Menu size={18} />
          {copy.common.openMenu}
        </span>
        <span className="text-xs text-[var(--text-tertiary)]">
          {activeItem ? translatedNavLabel(copy, activeItem) : copy.nav.today}
        </span>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[var(--z-modal)] bg-black/40 backdrop-blur-xs lg:hidden"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setOpen(false);
            }
          }}
        >
          <div className="mx-auto flex min-h-full w-full max-w-xl items-start px-3 pt-4 sm:px-5">
            <div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="dashboard-mobile-menu-title"
              tabIndex={-1}
              className="w-full rounded-[28px] border border-[var(--border)] bg-[var(--surface-raised)]/95 p-3 shadow-[var(--shadow-lg)] backdrop-blur"
            >
              <div className="flex items-center justify-between gap-3 px-1 pb-3">
                <div>
                  <p
                    id="dashboard-mobile-menu-title"
                    className="text-sm font-semibold text-[var(--text-primary)]"
                  >
                    {copy.common.openMenu}
                  </p>
                  <p className="text-xs text-[var(--text-tertiary)]">{copy.common.closeMenu}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="zook-focus inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text-secondary)] transition hover:bg-[var(--bg-sunken)] hover:text-[var(--text-primary)]"
                  aria-label={copy.common.closeMenu}
                >
                  <X size={18} />
                </button>
              </div>

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
                          onClick={() => setOpen(false)}
                          aria-current={active ? "page" : undefined}
                          className={`zook-focus flex items-center gap-3 rounded-2xl px-3 py-3 text-sm transition ${
                            active
                              ? "bg-[var(--accent-fill)] text-[var(--text-on-accent)]"
                              : "text-[var(--text-secondary)] hover:bg-[var(--bg-sunken)] hover:text-[var(--text-primary)]"
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
                  onClick={() => setOpen(false)}
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
          </div>
        </div>
      ) : null}
    </>
  );
}
