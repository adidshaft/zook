"use client";

import { SectionHeader } from "../../dashboard-primitives";
import { GlassCard, Pill } from "../../glass-card";
import { ProductCreateForm } from "./product-create-form";
import { ProductList } from "./product-list";
import { ShopStatusCard } from "./status-card";
import type { ShopSectionProps } from "./types";

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
  const scopeLabel = branchScope.selectedBranch
    ? `${selectedBranchName} has its own stock`
    : "All products are listed. Choose a branch to update branch stock.";

  return (
    <div className="grid gap-4">
      <GlassCard>
        <SectionHeader
          eyebrow="Inventory"
          title="Low-stock watch"
          description="Inventory is sorted by stock so the team can spot refill needs."
          badge={
            <Pill tone={summary.lowStockProducts > 0 ? "amber" : "neutral"}>
              {summary.lowStockProducts} low
            </Pill>
          }
        />
        <ProductCreateForm
          orgId={orgId}
          productForm={productForm}
          setProductForm={setProductForm}
          scopeLabel={scopeLabel}
          formError={formError}
          formBusy={formBusy}
          createProduct={createProduct}
        />
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

      <ShopStatusCard
        summary={summary}
        branchScope={branchScope}
        selectedBranchName={selectedBranchName}
        queuedOrderCount={queuedOrders.length}
        readyOrderCount={readyOrders.length}
      />
    </div>
  );
}
