"use client";

import Link from "next/link";
import { useState } from "react";
import { SectionHeader } from "../../dashboard-primitives";
import { GlassCard, Pill } from "../../glass-card";
import type { ShopOrderRow } from "@/components/dashboard/types";
import { formatInr } from "@/lib/format";
import { ProductCreateForm } from "./product-create-form";
import { ProductList } from "./product-list";
import { ShopStatusCard } from "./status-card";
import type { ShopSectionProps } from "./types";
import { useT } from "@/lib/use-t";

type ShopProductsSectionProps = Omit<ShopSectionProps, "view" | "shopOrders" | "shopOrdersState">;

export function ShopProductsSection({
  orgId,
  summary,
  branchScope,
  selectedBranchName,
  inventory,
  queuedOrders,
  readyOrders,
  productsState,
  productForm,
  setProductForm,
  productEditForm,
  setProductEditForm,
  editingProductId,
  setEditingProductId,
  stockAdjustment,
  setStockAdjustment,
  formError,
  formBusy,
  createProduct,
  startProductEdit,
  updateProduct,
  adjustStock,
  deleteProduct,
}: ShopProductsSectionProps) {
  const t = useT("webUx.shop");
  const scopeLabel = branchScope.selectedBranch
    ? t("branchHasOwnStock", { branch: selectedBranchName })
    : t("allProductsListedBranchStock");
  const [showCreateForm, setShowCreateForm] = useState(inventory.length === 0);

  return (
    <div className="grid gap-4">
      <ShopAttentionQueue queuedOrders={queuedOrders} readyOrders={readyOrders} />

      <ShopStatusCard
        summary={summary}
        branchScope={branchScope}
        selectedBranchName={selectedBranchName}
        inventoryCount={inventory.length}
      />

      <GlassCard>
        <SectionHeader
          eyebrow={t("inventory")}
          title={t("products")}
          badge={
            summary.lowStockProducts > 0 ? (
              <Pill tone="amber">{t("lowStockCount", { count: summary.lowStockProducts })}</Pill>
            ) : null
          }
          action={
            <button
              type="button"
              onClick={() => setShowCreateForm((v) => !v)}
              className="zook-focus inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] transition hover:border-[var(--border-strong)]"
            >
              {showCreateForm ? t("cancel") : t("addProductCta")}
            </button>
          }
        />
        {showCreateForm ? (
          <div className="mt-4">
            <ProductCreateForm
              orgId={orgId}
              productForm={productForm}
              setProductForm={setProductForm}
              scopeLabel={scopeLabel}
              formError={formError}
              formBusy={formBusy}
              createProduct={createProduct}
            />
          </div>
        ) : null}
        <ProductList
          orgId={orgId}
          inventory={inventory}
          productsState={productsState}
          selectedBranchName={selectedBranchName}
          productEditForm={productEditForm}
          setProductEditForm={setProductEditForm}
          editingProductId={editingProductId}
          setEditingProductId={setEditingProductId}
          stockAdjustment={stockAdjustment}
          setStockAdjustment={setStockAdjustment}
          formBusy={formBusy}
          startProductEdit={startProductEdit}
          updateProduct={updateProduct}
          adjustStock={adjustStock}
          deleteProduct={deleteProduct}
        />
      </GlassCard>
    </div>
  );
}

function ShopAttentionQueue({
  queuedOrders,
  readyOrders,
}: {
  queuedOrders: ShopOrderRow[];
  readyOrders: ShopOrderRow[];
}) {
  const t = useT("webUx.shop");
  const attentionOrders = [...readyOrders, ...queuedOrders].slice(0, 3);
  const totalAttention = queuedOrders.length + readyOrders.length;

  if (totalAttention === 0) {
    return null;
  }

  return (
    <GlassCard variant="warning" className="p-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--feedback-warning)]">
            {t("counterWork")}
          </span>
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            {t("openShopOrders")}
          </h2>
          <Pill tone="amber">{t("openCount", { count: totalAttention })}</Pill>
          <p className="min-w-[14rem] flex-1 text-xs text-[var(--text-secondary)]">
            {t("finishOrdersBeforeStock")}
          </p>
        </div>
        <Link
          href="/dashboard/shop/orders"
          className="zook-focus inline-flex h-9 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-raised)] px-3 text-xs font-semibold text-[var(--text-primary)] transition hover:border-[var(--border-strong)] hover:bg-[var(--bg-sunken)]"
        >
          {t("viewAllOrders")}
        </Link>
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-3">
        {attentionOrders.map((order) => {
          const needsPickup = order.status === "READY_FOR_PICKUP";
          const href = needsPickup
            ? `/desk/orders?orderId=${encodeURIComponent(order.id)}`
            : `/desk/payments/new?orderId=${encodeURIComponent(order.id)}`;

          return (
            <Link
              key={order.id}
              href={href}
              className="zook-focus flex min-w-0 items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-raised)]"
            >
              <div className="min-w-0">
                <span className="block truncate text-sm font-semibold text-[var(--text-primary)]">
                  {order.id.slice(-8).toUpperCase()}
                </span>
                <p className="mt-0.5 truncate text-xs text-[var(--text-secondary)]">
                  {order.user?.name ?? t("member")} · {t("itemCount", { count: order.items.length })} · {formatInr(order.totalPaise)}
                </p>
              </div>
              <Pill tone={needsPickup ? "amber" : "blue"} className="shrink-0">
                {needsPickup ? t("pickup") : t("payment")}
              </Pill>
            </Link>
          );
        })}
      </div>
    </GlassCard>
  );
}
