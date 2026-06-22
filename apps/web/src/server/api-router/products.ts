import { assertOrgServicePermission } from "@zook/core/services";
import { Prisma, prisma } from "@zook/db";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { getRequestContext, requireAuth } from "../access";
import { writeAuditLog } from "../audit";
import { conflictError, forbiddenError, notFoundError } from "../errors";
import { ok, readJson } from "../response";
import {
  assertBranchAccessForContext,
  assertLimitAvailable,
  clean,
  getOrgSaasEntitlements,
  getOrganizationScopedFileAsset,
  pathMatches,
  queryBranchId,
  resolveOrgBranch,
  sanitizeRichText,
} from "./core";

const productInputSchema = z.object({
  branchId: z.string().optional().nullable(),
  name: z.string().min(2).max(120),
  description: z.string().max(500).optional(),
  category: z
    .enum(["WATER", "PROTEIN_SHAKE", "SHAKER", "TOWEL", "SUPPLEMENT", "OTHER"])
    .default("OTHER"),
  pricePaise: z.number().int().nonnegative(),
  stock: z.number().int().nonnegative(),
  lowStockThreshold: z.number().int().nonnegative().default(8),
  imageAssetId: z.string().optional(),
  imageAssetIds: z.array(z.string()).max(6).optional(),
  imageUrl: z.string().url().optional(),
  imageUrls: z.array(z.string().url()).max(6).optional(),
  active: z.boolean().default(true),
});

const inventoryAdjustmentSchema = z.object({
  productId: z.string(),
  delta: z
    .number()
    .int()
    .refine((value) => value !== 0, "Inventory delta must be non-zero"),
  reason: z.string().trim().min(2).max(200),
});

function uniqueStringList(values: Array<string | null | undefined>, limit: number) {
  const result: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const trimmed = value?.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    result.push(trimmed);
    if (result.length >= limit) break;
  }
  return result;
}

async function resolveProductImageUrls(
  orgId: string,
  input: {
    imageAssetId?: string | undefined;
    imageAssetIds?: string[] | undefined;
    imageUrl?: string | undefined;
    imageUrls?: string[] | undefined;
  },
) {
  const assetIds = uniqueStringList(
    input.imageAssetIds?.length ? input.imageAssetIds : [input.imageAssetId],
    6,
  );
  const assets = await Promise.all(
    assetIds.map((assetId) => getOrganizationScopedFileAsset(assetId, orgId, ["product_image"])),
  );
  return uniqueStringList(
    [
      ...assets.map((asset) => asset?.url),
      ...(input.imageUrls?.length ? input.imageUrls : [input.imageUrl]),
    ],
    6,
  );
}

function hasProductImageInput(input: {
  imageAssetId?: string | undefined;
  imageAssetIds?: string[] | undefined;
  imageUrl?: string | undefined;
  imageUrls?: string[] | undefined;
}) {
  return (
    input.imageAssetId !== undefined ||
    input.imageAssetIds !== undefined ||
    input.imageUrl !== undefined ||
    input.imageUrls !== undefined
  );
}

export async function handleProducts(request: NextRequest, path: string[]) {
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "products"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    requireAuth(ctx);
    if (ctx.orgId !== orgId || !ctx.roles.length) {
      throw forbiddenError("No organization access");
    }
    const branchId = await assertBranchAccessForContext(ctx, orgId, queryBranchId(request));
    return ok({
      products: await prisma.product.findMany({
        where: {
          orgId,
          ...(branchId ? { branchId } : {}),
        },
        orderBy: [{ active: "desc" }, { stock: "asc" }],
      }),
    });
  }
  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "products"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = assertOrgServicePermission(ctx, orgId, "SHOP_MANAGE_PRODUCTS");
    const body = productInputSchema.parse(await readJson(request));
    const branch = await resolveOrgBranch(orgId, body.branchId);
    const [{ tier, entitlements }, productCount] = await Promise.all([
      getOrgSaasEntitlements(orgId),
      prisma.product.count({ where: { orgId } }),
    ]);
    assertLimitAvailable({
      limit: entitlements.productLimit,
      used: productCount,
      label: "Product",
      tier,
    });
    const imageUrls = await resolveProductImageUrls(orgId, body);
    const product = await prisma.product.create({
      data: clean({
        orgId,
        branchId: branch.id,
        name: body.name,
        description: body.description,
        pricePaise: body.pricePaise,
        stock: body.stock,
        category: body.category,
        lowStockThreshold: body.lowStockThreshold,
        imageUrl: imageUrls[0],
        imageUrls: imageUrls.length ? (imageUrls as Prisma.InputJsonValue) : undefined,
        active: body.active,
      }),
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "product.created",
      entityType: "product",
      entityId: product.id,
    });
    return ok({ product });
  }
  if (request.method === "PATCH" && pathMatches(path, ["orgs", /.+/, "products", /.+/])) {
    const orgId = path[1]!;
    const productId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = assertOrgServicePermission(ctx, orgId, "SHOP_MANAGE_PRODUCTS");
    const body = productInputSchema.partial().parse(await readJson(request));
    const existingProduct = await prisma.product.findFirst({ where: { id: productId, orgId } });
    const branch =
      body.branchId !== undefined ? await resolveOrgBranch(orgId, body.branchId) : null;
    if (!existingProduct) {
      throw notFoundError("Product not found");
    }
    const imageUrls = hasProductImageInput(body)
      ? await resolveProductImageUrls(orgId, body)
      : null;
    const product = await prisma.product.update({
      where: { id: existingProduct.id },
      data: clean({
        branchId: branch?.id,
        name: body.name,
        description: sanitizeRichText(body.description),
        category: body.category,
        pricePaise: body.pricePaise,
        stock: body.stock,
        lowStockThreshold: body.lowStockThreshold,
        imageUrl: imageUrls ? (imageUrls[0] ?? null) : undefined,
        imageUrls: imageUrls
          ? ((imageUrls.length ? imageUrls : Prisma.JsonNull) as Prisma.InputJsonValue)
          : undefined,
        active: body.active,
      }),
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "product.updated",
      entityType: "product",
      entityId: product.id,
    });
    return ok({ product });
  }
  if (request.method === "DELETE" && pathMatches(path, ["orgs", /.+/, "products", /.+/])) {
    const orgId = path[1]!;
    const productId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = assertOrgServicePermission(ctx, orgId, "SHOP_MANAGE_PRODUCTS");
    const existingProduct = await prisma.product.findFirst({ where: { id: productId, orgId } });
    if (!existingProduct) {
      throw notFoundError("Product not found");
    }
    const [orderItemCount, movementCount] = await Promise.all([
      prisma.shopOrderItem.count({ where: { orgId, productId: existingProduct.id } }),
      prisma.inventoryMovement.count({ where: { orgId, productId: existingProduct.id } }),
    ]);
    if (orderItemCount > 0 || movementCount > 0) {
      throw conflictError(
        "This product has order or inventory history. Archive it instead of deleting.",
      );
    }
    await prisma.product.delete({ where: { id: existingProduct.id } });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "product.deleted",
      entityType: "product",
      entityId: existingProduct.id,
      metadata: { name: existingProduct.name },
    });
    return ok({ deleted: true });
  }
  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "inventory", "adjust"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = assertOrgServicePermission(ctx, orgId, "SHOP_MANAGE_PRODUCTS");
    const body = inventoryAdjustmentSchema.parse(await readJson(request));
    const existingProduct = await prisma.product.findFirst({
      where: { id: body.productId, orgId },
    });
    if (!existingProduct) {
      throw notFoundError("Product not found");
    }
    if (existingProduct.stock + body.delta < 0) {
      throw conflictError("Inventory adjustment would result in negative stock.");
    }
    const [product, movement] = await prisma.$transaction([
      prisma.product.update({
        where: { id: existingProduct.id },
        data: { stock: { increment: body.delta } },
      }),
      prisma.inventoryMovement.create({
        data: {
          orgId,
          branchId: existingProduct.branchId,
          productId: existingProduct.id,
          delta: body.delta,
          reason: body.reason,
          createdById: userId,
        },
      }),
    ]);
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "inventory.adjusted",
      entityType: "inventory_movement",
      entityId: movement.id,
      metadata: { productId: existingProduct.id, delta: body.delta, reason: body.reason },
    });
    return ok({ product, movement });
  }
  return undefined;
}
