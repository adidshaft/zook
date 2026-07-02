"use client";

import Link from "next/link";
import { PackageCheck, ShoppingBag } from "lucide-react";
import { ShopOrdersSection } from "./orders-section";
import { ShopProductsSection } from "./products-section";
import type { ShopSectionProps } from "./types";
import { useT } from "@/lib/use-t";

export function ShopSection(props: ShopSectionProps) {
  const { view = "products", orgId, queuedOrders, readyOrders, shopOrders, shopOrdersState } = props;
  const t = useT("webUx.shop");
  const showOrders = view === "orders";
  const showProducts = view === "products";
  const openOrderCount = queuedOrders.length + readyOrders.length;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2 rounded-[22px] border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-2">
        <div className="flex min-w-0 flex-wrap gap-2">
          {[
            { href: "/dashboard/shop", label: t("products"), active: showProducts, icon: ShoppingBag },
            {
              href: "/dashboard/shop/orders",
              label: t("orders"),
              active: showOrders,
              icon: PackageCheck,
              count: openOrderCount,
            },
          ].map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={tab.active ? "page" : undefined}
              className={`zook-focus inline-flex min-h-9 items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                tab.active
                  ? "border-[var(--border-focus)] bg-[var(--surface-accent-soft)] text-[var(--text-primary)]"
                  : "border-[var(--border-subtle)] bg-[var(--bg-sunken)] text-[var(--text-secondary)] hover:border-[var(--border)] hover:bg-[var(--surface)] hover:text-[var(--text-primary)]"
              }`}
            >
              <tab.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {tab.label}
              {tab.count ? (
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[var(--accent-fill)] px-1 text-[10px] font-black tabular-nums text-[var(--text-on-accent)]">
                  {tab.count}
                </span>
              ) : null}
            </Link>
          ))}
        </div>
      </div>
      {showOrders ? (
        <ShopOrdersSection
          orgId={orgId}
          shopOrders={shopOrders}
          readyOrders={readyOrders}
          shopOrdersState={shopOrdersState}
        />
      ) : null}

      {showProducts ? <ShopProductsSection {...props} /> : null}
    </div>
  );
}
