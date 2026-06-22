"use client";

import Link from "next/link";
import { ShopOrdersSection } from "./orders-section";
import { ShopProductsSection } from "./products-section";
import type { ShopSectionProps } from "./types";

export function ShopSection(props: ShopSectionProps) {
  const { view = "products", orgId, shopOrders, readyOrders, shopOrdersState } = props;
  const showOrders = view === "orders";
  const showProducts = view === "products";

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2">
        {[
          { href: "/dashboard/shop", label: "Products", active: showProducts },
          { href: "/dashboard/shop/orders", label: "Orders", active: showOrders },
        ].map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`zook-focus rounded-full border px-4 py-2 text-sm font-semibold transition ${
              tab.active
                ? "border-white/20 bg-white/8 text-white"
                : "border-white/10 text-white/60 hover:bg-white/8 hover:text-white"
            }`}
          >
            {tab.label}
          </Link>
        ))}
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
