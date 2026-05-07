import { webApiFetch } from "@/lib/api-client";
import {
  type MembershipPlanRow,
  type MembershipPlanType,
  type ProductCategory,
  type ProductRow,
} from "../../../dashboard-operational-model";
import {
  type DashboardOperationalState,
  type PlanForm,
  type ProductForm,
} from "../controller-state";
import { type DashboardOperationalResources } from "../controller-resources";

export function payloadForPlanForm(form: PlanForm) {
  return {
    name: form.name,
    description: form.description || undefined,
    type: form.type,
    pricePaise: Math.round(Number(form.priceRupees || 0) * 100),
    durationDays: form.durationDays ? Number(form.durationDays) : undefined,
    visitLimit: form.visitLimit ? Number(form.visitLimit) : undefined,
    validityDays: form.durationDays ? Number(form.durationDays) : undefined,
    publicVisible: form.publicVisible,
    active: form.active,
  };
}

function validatePlanName(value: string) {
  const trimmed = value.trim();
  if (trimmed.length > 60) {
    return "Plan name must be 60 characters or fewer.";
  }
  if (/\d{8,}/.test(trimmed)) {
    return "Plan name cannot include raw numeric IDs.";
  }
  return "";
}

export function payloadForProductForm(form: ProductForm) {
  return {
    name: form.name,
    description: form.description || undefined,
    category: form.category,
    pricePaise: Math.round(Number(form.priceRupees || 0) * 100),
    stock: Number(form.stock || 0),
    lowStockThreshold: Number(form.lowStockThreshold || 0),
    active: form.active,
  };
}

export function createPlansProductsActions({
  orgId,
  state,
  resources,
}: {
  orgId: string;
  state: DashboardOperationalState;
  resources: DashboardOperationalResources;
}) {
  async function createMembershipPlan() {
    try {
      const planNameError = validatePlanName(state.planForm.name);
      if (planNameError) {
        state.setFormError(planNameError);
        return;
      }
      state.setFormBusy("plan");
      state.setFormError("");
      state.setFormStatus("");
      await webApiFetch(`/api/orgs/${orgId}/membership-plans`, {
        method: "POST",
        body: payloadForPlanForm(state.planForm),
        feedback: { success: "Membership plan created." },
      });
      state.setPlanForm(state.emptyPlanForm);
      resources.membershipPlansState.reload();
      state.setFormStatus("Membership plan created.");
    } catch (cause) {
      state.setFormError(
        cause instanceof Error ? cause.message : "Unable to create membership plan.",
      );
    } finally {
      state.setFormBusy(null);
    }
  }

  function startPlanEdit(plan: MembershipPlanRow) {
    state.setEditingPlanId(plan.id);
    state.setPlanEditForm({
      name: plan.name,
      type: plan.type as MembershipPlanType,
      priceRupees: (plan.pricePaise / 100).toString(),
      durationDays: plan.durationDays?.toString() ?? "",
      visitLimit: plan.visitLimit?.toString() ?? "",
      description: plan.description ?? "",
      publicVisible: plan.publicVisible,
      active: plan.active,
    });
    state.setFormError("");
    state.setFormStatus("");
  }

  async function updateMembershipPlan(
    planId: string,
    patch?: Partial<ReturnType<typeof payloadForPlanForm>>,
  ) {
    try {
      if (!patch) {
        const planNameError = validatePlanName(state.planEditForm.name);
        if (planNameError) {
          state.setFormError(planNameError);
          return;
        }
      }
      state.setFormBusy(`plan:${planId}`);
      state.setFormError("");
      state.setFormStatus("");
      await webApiFetch(`/api/orgs/${orgId}/membership-plans/${planId}`, {
        method: "PATCH",
        body: patch ?? payloadForPlanForm(state.planEditForm),
        feedback: {
          success:
            patch?.active === false
              ? "Membership plan archived."
              : patch?.active === true
                ? "Membership plan restored."
                : "Membership plan updated.",
        },
      });
      state.setEditingPlanId(null);
      resources.membershipPlansState.reload();
      state.setFormStatus("Membership plan updated.");
    } catch (cause) {
      state.setFormError(
        cause instanceof Error ? cause.message : "Unable to update membership plan.",
      );
    } finally {
      state.setFormBusy(null);
    }
  }

  async function deleteMembershipPlan(planId: string) {
    if (
      !window.confirm(
        "Delete this unused membership plan? Plans with subscriptions should be archived instead.",
      )
    ) {
      return;
    }
    try {
      state.setFormBusy(`plan:${planId}:delete`);
      state.setFormError("");
      state.setFormStatus("");
      await webApiFetch(`/api/orgs/${orgId}/membership-plans/${planId}`, {
        method: "DELETE",
        feedback: { success: "Membership plan deleted." },
      });
      resources.membershipPlansState.reload();
      state.setFormStatus("Membership plan deleted.");
    } catch (cause) {
      state.setFormError(
        cause instanceof Error ? cause.message : "Unable to delete membership plan.",
      );
    } finally {
      state.setFormBusy(null);
    }
  }

  async function createProduct() {
    try {
      state.setFormBusy("product");
      state.setFormError("");
      state.setFormStatus("");
      await webApiFetch(`/api/orgs/${orgId}/products`, {
        method: "POST",
        body: payloadForProductForm(state.productForm),
        feedback: { success: "Shop product created." },
      });
      state.setProductForm(state.emptyProductForm);
      resources.productsState.reload();
      state.setFormStatus("Shop product created.");
    } catch (cause) {
      state.setFormError(cause instanceof Error ? cause.message : "Unable to create product.");
    } finally {
      state.setFormBusy(null);
    }
  }

  function startProductEdit(product: ProductRow) {
    state.setEditingProductId(product.id);
    state.setProductEditForm({
      name: product.name,
      category: product.category as ProductCategory,
      priceRupees: (product.pricePaise / 100).toString(),
      stock: product.stock.toString(),
      lowStockThreshold: product.lowStockThreshold.toString(),
      description: product.description ?? "",
      active: product.active,
    });
    state.setStockAdjustment({ productId: product.id, delta: "", reason: "Manual stock count" });
    state.setFormError("");
    state.setFormStatus("");
  }

  async function updateProduct(
    productId: string,
    patch?: Partial<ReturnType<typeof payloadForProductForm>>,
  ) {
    try {
      state.setFormBusy(`product:${productId}`);
      state.setFormError("");
      state.setFormStatus("");
      await webApiFetch(`/api/orgs/${orgId}/products/${productId}`, {
        method: "PATCH",
        body: patch ?? payloadForProductForm(state.productEditForm),
        feedback: {
          success:
            patch?.active === false
              ? "Shop product archived."
              : patch?.active === true
                ? "Shop product restored."
                : "Shop product updated.",
        },
      });
      state.setEditingProductId(null);
      resources.productsState.reload();
      state.setFormStatus("Shop product updated.");
    } catch (cause) {
      state.setFormError(cause instanceof Error ? cause.message : "Unable to update product.");
    } finally {
      state.setFormBusy(null);
    }
  }

  async function adjustStock(productId: string) {
    try {
      state.setFormBusy(`stock:${productId}`);
      state.setFormError("");
      state.setFormStatus("");
      await webApiFetch(`/api/orgs/${orgId}/inventory/adjust`, {
        method: "POST",
        body: {
          productId,
          delta: Number(state.stockAdjustment.delta),
          reason: state.stockAdjustment.reason || "Manual stock adjustment",
        },
        feedback: { success: "Stock adjusted." },
      });
      state.setStockAdjustment({ productId, delta: "", reason: "Manual stock count" });
      resources.productsState.reload();
      state.setFormStatus("Stock adjusted.");
    } catch (cause) {
      state.setFormError(cause instanceof Error ? cause.message : "Unable to adjust stock.");
    } finally {
      state.setFormBusy(null);
    }
  }

  async function deleteProduct(productId: string) {
    if (
      !window.confirm(
        "Delete this unused product? Products with order history should be archived instead.",
      )
    ) {
      return;
    }
    try {
      state.setFormBusy(`product:${productId}:delete`);
      state.setFormError("");
      state.setFormStatus("");
      await webApiFetch(`/api/orgs/${orgId}/products/${productId}`, {
        method: "DELETE",
        feedback: { success: "Shop product deleted." },
      });
      resources.productsState.reload();
      state.setFormStatus("Shop product deleted.");
    } catch (cause) {
      state.setFormError(cause instanceof Error ? cause.message : "Unable to delete product.");
    } finally {
      state.setFormBusy(null);
    }
  }

  return {
    createMembershipPlan,
    createProduct,
    startPlanEdit,
    updateMembershipPlan,
    deleteMembershipPlan,
    startProductEdit,
    updateProduct,
    adjustStock,
    deleteProduct,
  };
}
