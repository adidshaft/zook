import type { Dispatch, SetStateAction } from "react";
import type {
  BranchScopeSnapshot,
  OrganizationSummary,
  ProductCategory,
  ProductRow,
  ShopOrderRow,
} from "../../dashboard-operational-model";

export type ProductFormState = {
  name: string;
  category: ProductCategory;
  priceRupees: string;
  stock: string;
  lowStockThreshold: string;
  description: string;
  imageAssetId: string;
  imageAssetIds: string[];
  imagePreviewUrl: string;
  imagePreviewUrls: string[];
  active: boolean;
};

export type StockAdjustmentState = {
  productId: string;
  delta: string;
  reason: string;
};

export type ProductPatch = Partial<{
  name: string;
  description?: string;
  category: ProductCategory;
  pricePaise: number;
  stock: number;
  lowStockThreshold: number;
  imageAssetId: string;
  imageAssetIds: string[];
  imageUrls: string[];
  active: boolean;
}>;

export type ResourceState = {
  error?: string | null;
  loading: boolean;
};

export type ShopSectionProps = {
  view?: "products" | "orders";
  orgId: string;
  summary: OrganizationSummary;
  branchScope: BranchScopeSnapshot;
  selectedBranchName: string;
  inventory: ProductRow[];
  shopOrders: ShopOrderRow[];
  queuedOrders: ShopOrderRow[];
  readyOrders: ShopOrderRow[];
  productsState: ResourceState;
  shopOrdersState: ResourceState;
  productForm: ProductFormState;
  setProductForm: Dispatch<SetStateAction<ProductFormState>>;
  productEditForm: ProductFormState;
  setProductEditForm: Dispatch<SetStateAction<ProductFormState>>;
  editingProductId: string | null;
  setEditingProductId: Dispatch<SetStateAction<string | null>>;
  stockAdjustment: StockAdjustmentState;
  setStockAdjustment: Dispatch<SetStateAction<StockAdjustmentState>>;
  formError: string;
  formStatus: string;
  formBusy: string | null;
  createProduct: () => Promise<void>;
  startProductEdit: (product: ProductRow) => void;
  updateProduct: (productId: string, patch?: ProductPatch) => Promise<void>;
  adjustStock: (productId: string) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
};
