import type { Permission, RequestContext } from "@zook/core";
import type { StorageFileCategory, StorageFileVisibility } from "@zook/core/providers";
import { forbiddenError, validationError } from "./errors";

type FileAssetLike = {
  id: string;
  orgId: string | null;
  ownerUserId: string | null;
  category: string | null;
  visibility: string | null;
  deletedAt: Date | null;
};

const privateReadPermissionsByCategory: Partial<Record<StorageFileCategory, Permission[]>> = {
  payment_proof: ["PAYMENTS_VIEW", "PAYMENTS_RECORD_OFFLINE"],
  product_image: ["SHOP_MANAGE_PRODUCTS"],
  plan_image: ["PLANS_CREATE"],
  ai_generated_image: ["PLANS_CREATE", "AI_GENERATE_IMAGE"],
  trainer_upi_qr: ["PT_RECORD", "TRAINERS_MANAGE"],
  profile_photo: ["MEMBERS_VIEW", "ATTENDANCE_APPROVE"],
  body_progress_photo: ["MEMBERS_VIEW"],
  org_logo: ["ORG_MANAGE_PROFILE"],
  org_cover: ["ORG_MANAGE_PROFILE"]
};

const uploadPermissionsByCategory: Partial<Record<StorageFileCategory, Permission>> = {
  org_logo: "ORG_MANAGE_PROFILE",
  org_cover: "ORG_MANAGE_PROFILE",
  product_image: "SHOP_MANAGE_PRODUCTS",
  plan_image: "PLANS_CREATE",
  ai_generated_image: "AI_GENERATE_IMAGE",
  trainer_upi_qr: "PT_RECORD"
};

const allowedVisibilityByCategory: Record<StorageFileCategory, StorageFileVisibility[]> = {
  profile_photo: ["private", "org"],
  payment_proof: ["private"],
  product_image: ["org", "public"],
  plan_image: ["org", "public"],
  trainer_upi_qr: ["private", "org"],
  org_logo: ["public"],
  org_cover: ["public"],
  ai_generated_image: ["org", "public"],
  body_progress_photo: ["private"]
};

const defaultVisibilityByCategory: Record<StorageFileCategory, StorageFileVisibility> = {
  profile_photo: "private",
  payment_proof: "private",
  product_image: "public",
  plan_image: "org",
  trainer_upi_qr: "org",
  org_logo: "public",
  org_cover: "public",
  ai_generated_image: "org",
  body_progress_photo: "private"
};

export function buildFileAssetUrl(fileId: string) {
  return `/api/files/${fileId}/content`;
}

export function resolveFileVisibility(category: StorageFileCategory, requested?: string | null): StorageFileVisibility {
  const visibility = (requested as StorageFileVisibility | undefined) ?? defaultVisibilityByCategory[category];
  if (!allowedVisibilityByCategory[category].includes(visibility)) {
    throw validationError(`Files in category ${category} cannot use visibility ${visibility}.`);
  }
  return visibility;
}

export function assertFileUploadPermission(input: {
  category: StorageFileCategory;
  ctx: RequestContext;
  actorUserId: string;
  orgId?: string;
}) {
  const requiredPermission = uploadPermissionsByCategory[input.category];

  if (!input.orgId) {
    if (!["profile_photo", "body_progress_photo"].includes(input.category)) {
      throw forbiddenError("This file category must be uploaded within an organization context.");
    }
    return;
  }

  if (input.ctx.orgId !== input.orgId) {
    throw forbiddenError("No organization access for this upload.");
  }

  if (!requiredPermission) {
    return;
  }
  if (!input.ctx.permissions.includes(requiredPermission)) {
    throw forbiddenError("You do not have permission to upload this file type.");
  }
}

export function assertCanAccessFileAsset(asset: FileAssetLike, ctx: RequestContext) {
  if (asset.deletedAt) {
    throw forbiddenError("File is no longer available.");
  }

  const visibility = (asset.visibility ?? "private") as StorageFileVisibility;
  const category = (asset.category ?? "profile_photo") as StorageFileCategory;

  if (visibility === "public") {
    return;
  }
  if (!ctx.userId) {
    throw forbiddenError("Authentication required to access this file.");
  }
  if (asset.ownerUserId && asset.ownerUserId === ctx.userId) {
    return;
  }
  if (!asset.orgId || ctx.orgId !== asset.orgId) {
    throw forbiddenError("You cannot access files outside your organization.");
  }
  if (visibility === "org") {
    return;
  }
  const permissions = privateReadPermissionsByCategory[category] ?? [];
  if (!permissions.some((permission) => ctx.permissions.includes(permission))) {
    throw forbiddenError("You do not have permission to access this private file.");
  }
}

export function assertFileAssetBelongsToOrg(input: {
  asset: FileAssetLike;
  orgId: string;
  allowedCategories: StorageFileCategory[];
}) {
  if (input.asset.deletedAt) {
    throw validationError("File has already been deleted.");
  }
  if (input.asset.orgId !== input.orgId) {
    throw forbiddenError("File belongs to another organization.");
  }
  if (!input.asset.category || !input.allowedCategories.includes(input.asset.category as StorageFileCategory)) {
    throw validationError("File category is not valid for this operation.");
  }
}

export function assertFileAssetOwnedByUser(input: {
  asset: FileAssetLike;
  userId: string;
  allowedCategories: StorageFileCategory[];
  orgId?: string;
}) {
  if (input.asset.deletedAt) {
    throw validationError("File has already been deleted.");
  }
  if (input.asset.ownerUserId !== input.userId) {
    throw forbiddenError("File does not belong to this user.");
  }
  if (input.orgId && input.asset.orgId && input.asset.orgId !== input.orgId) {
    throw forbiddenError("File belongs to another organization.");
  }
  if (!input.asset.category || !input.allowedCategories.includes(input.asset.category as StorageFileCategory)) {
    throw validationError("File category is not valid for this operation.");
  }
}
