import { createHash } from "node:crypto";
import { fileTypeFromBuffer } from "file-type";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  LocalStorageProvider,
  buildStorageKey,
  storageFileCategories,
  verifyLocalStorageSignature,
  type StorageFileCategory,
} from "@zook/core/providers";
import { Prisma, prisma } from "@zook/db";
import { getRequestContext, requireAuth } from "../access";
import { writeAuditLog } from "../audit";
import {
  assertCanAccessFileAsset,
  assertCanServeLocalPublicFileAsset,
  assertFileUploadPermission,
  buildFileAssetUrl,
  resolveFileVisibility,
} from "../files";
import {
  forbiddenError,
  notFoundError,
  payloadTooLargeError,
  validationError,
} from "../errors";
import { assertRateLimit } from "../rate-limit";
import { ok } from "../response";
import {
  findFileAssetOrThrow,
  getStorageProviderOrThrow,
  pathMatches,
  redirectTo,
  resolveFileUrl,
} from "./core";

const uploadCategorySchema = z.enum(storageFileCategories);

async function detectUploadContentType(fileBytes: Uint8Array, declaredContentType: string) {
  const declared = declaredContentType.trim().toLowerCase();
  const detected = await fileTypeFromBuffer(fileBytes);
  if (detected?.mime) {
    const detectedMime = detected.mime.toLowerCase();
    if (declared !== "application/octet-stream" && declared !== detectedMime) {
      throw validationError("Uploaded file content does not match its declared type.");
    }
    return detectedMime;
  }

  const prefix = Buffer.from(fileBytes.slice(0, 512)).toString("utf8").trimStart();
  if (declared === "image/svg+xml" && /^<(\?xml\b[^>]*>\s*)?<svg[\s>]/i.test(prefix)) {
    return declared;
  }
  if (declared === "application/json" && /^[{[]/.test(prefix)) {
    JSON.parse(Buffer.from(fileBytes).toString("utf8"));
    return declared;
  }
  throw validationError("Uploaded file content does not match an allowed file type.");
}

async function parseFileUploadRequest(request: NextRequest) {
  const formData = await request.formData();
  const category = uploadCategorySchema.parse(formData.get("category"));
  const rawOrgId = formData.get("orgId")?.toString().trim();
  const rawVisibility = formData.get("visibility")?.toString().trim() ?? undefined;
  const file = formData.get("file");

  if (!(file instanceof File)) {
    throw validationError("Upload requires a file field.");
  }

  const visibility = resolveFileVisibility(category, rawVisibility);
  const storageProvider = getStorageProviderOrThrow();
  const fileBytes = new Uint8Array(await file.arrayBuffer());
  const declaredContentType = file.type || "application/octet-stream";
  const contentType = await detectUploadContentType(fileBytes, declaredContentType);
  let validated;
  try {
    validated = storageProvider.validateFile({
      category,
      contentType,
      sizeBytes: file.size,
      originalName: file.name,
      visibility,
    });
  } catch (error) {
    if (error instanceof Error && /^File exceeds\b/.test(error.message)) {
      throw payloadTooLargeError(error.message, {
        category,
        maxSizeBytes: storageProvider.validateFile({
          category,
          contentType,
          sizeBytes: 1,
          originalName: file.name,
          visibility,
        }).maxSizeBytes,
      });
    }
    throw validationError(error instanceof Error ? error.message : "Invalid upload.");
  }

  return {
    fileBytes,
    category,
    visibility,
    orgId: rawOrgId || undefined,
    validated,
  };
}

function assertFileStorageProviderMatches(
  asset: { storageProvider?: string | null },
  activeProvider: string,
) {
  const storedProvider = asset.storageProvider ?? "local";
  if (storedProvider !== activeProvider) {
    throw validationError(
      `File was stored with ${storedProvider}, but the active storage provider is ${activeProvider}.`,
    );
  }
}

export async function handleFiles(request: NextRequest, path: string[]) {
  if (request.method === "GET" && pathMatches(path, ["files", "local"])) {
    const storageProvider = getStorageProviderOrThrow();
    if (!(storageProvider instanceof LocalStorageProvider)) {
      throw notFoundError("File preview is not available right now.");
    }
    const key = request.nextUrl.searchParams.get("key") ?? "";
    const expiresAt = Number(request.nextUrl.searchParams.get("expires"));
    const signature = request.nextUrl.searchParams.get("signature") ?? "";
    if (!verifyLocalStorageSignature({ key, expiresAt, signature })) {
      throw forbiddenError("Invalid or expired file signature.");
    }
    const file = await storageProvider.readObject({ key });
    return new NextResponse(new Uint8Array(file.body), {
      headers: {
        "content-type": file.contentType,
        "content-length": String(file.sizeBytes),
        "cache-control": "private, max-age=0, no-store",
      },
    });
  }
  if (request.method === "GET" && pathMatches(path, ["files", "local", "public"])) {
    const storageProvider = getStorageProviderOrThrow();
    if (!(storageProvider instanceof LocalStorageProvider)) {
      throw notFoundError("File preview is not available right now.");
    }
    const key = request.nextUrl.searchParams.get("key") ?? "";
    if (!key) {
      throw validationError("Missing file key.");
    }
    const asset = await prisma.fileAsset.findFirst({
      where: { storageKey: key, deletedAt: null },
    });
    if (!asset) {
      throw notFoundError("File not found");
    }
    assertCanServeLocalPublicFileAsset(asset);
    assertFileStorageProviderMatches(asset, storageProvider.getDiagnostics().provider);
    const file = await storageProvider.readObject({ key });
    return new NextResponse(new Uint8Array(file.body), {
      headers: {
        "content-type": file.contentType,
        "content-length": String(file.sizeBytes),
        "cache-control": "public, max-age=3600, immutable",
      },
    });
  }
  if (request.method === "POST" && pathMatches(path, ["files", "upload"])) {
    if (/^(0|false|no|off)$/i.test(process.env.FILE_UPLOADS_ENABLED ?? "")) {
      throw validationError("File uploads are not available right now.");
    }
    const storageProvider = getStorageProviderOrThrow();
    const upload = await parseFileUploadRequest(request);
    const ctx = await getRequestContext(request, upload.orgId ? { orgId: upload.orgId } : {});
    const userId = requireAuth(ctx);
    await assertRateLimit(
      "fileUploadByActor",
      `${upload.orgId ?? "global"}:${userId}`,
      "Too many file uploads requested.",
    );
    assertFileUploadPermission({
      category: upload.category,
      ctx,
      actorUserId: userId,
      ...(upload.orgId ? { orgId: upload.orgId } : {}),
    });

    const fileBytes = upload.fileBytes;
    const checksum = createHash("sha256").update(fileBytes).digest("hex");
    const storageKey = buildStorageKey({
      category: upload.category,
      ...(upload.orgId ? { orgId: upload.orgId } : {}),
      ownerUserId: userId,
      ...(upload.validated.originalName ? { originalName: upload.validated.originalName } : {}),
    });

    let uploaded = false;
    try {
      await storageProvider.uploadFile({
        key: storageKey,
        contentType: upload.validated.contentType,
        sizeBytes: upload.validated.sizeBytes,
        category: upload.category,
        ...(upload.validated.originalName ? { originalName: upload.validated.originalName } : {}),
        visibility: upload.visibility,
        body: fileBytes,
        cacheControl:
          upload.visibility === "public"
            ? "public, max-age=31536000, immutable"
            : "private, max-age=0, no-store",
      });
      uploaded = true;

      const created = await prisma.fileAsset.create({
        data: {
          orgId: upload.orgId ?? null,
          ownerUserId: userId,
          originalName: upload.validated.originalName ?? null,
          storageKey,
          url: "pending",
          mimeType: upload.validated.contentType,
          sizeBytes: upload.validated.sizeBytes,
          purpose: upload.category,
          category: upload.category,
          visibility: upload.visibility,
          storageProvider: storageProvider.getDiagnostics().provider,
          checksum,
          metadata: {
            normalizedBaseName: upload.validated.normalizedBaseName,
            extension: upload.validated.extension,
          } as Prisma.InputJsonValue,
        },
      });
      const asset = await prisma.fileAsset.update({
        where: { id: created.id },
        data: { url: buildFileAssetUrl(created.id) },
      });
      await writeAuditLog({
        request,
        ...(upload.orgId ? { orgId: upload.orgId } : {}),
        actorUserId: userId,
        action: "file.uploaded",
        entityType: "file_asset",
        entityId: asset.id,
        metadata: {
          category: upload.category,
          visibility: upload.visibility,
          sizeBytes: upload.validated.sizeBytes,
        },
      });
      return ok({
        file: asset,
        deliveryUrl: asset.url,
        signedUrl: await resolveFileUrl(asset, true),
      });
    } catch (error) {
      if (uploaded) {
        await storageProvider.deleteFile({ key: storageKey }).catch(() => undefined);
      }
      throw error;
    }
  }
  if (request.method === "GET" && pathMatches(path, ["files", /.+/, "signed-url"])) {
    const asset = await findFileAssetOrThrow(path[1]!);
    const ctx = await getRequestContext(request, asset.orgId ? { orgId: asset.orgId } : {});
    assertCanAccessFileAsset(asset, ctx);
    await writeAuditLog({
      request,
      ...(asset.orgId ? { orgId: asset.orgId } : {}),
      ...(ctx.userId ? { actorUserId: ctx.userId } : {}),
      action: "file.signed_url_issued",
      entityType: "file_asset",
      entityId: asset.id,
      metadata: { category: asset.category, visibility: asset.visibility },
    });
    return ok({
      file: asset,
      url: await resolveFileUrl(asset, true),
    });
  }
  if (request.method === "GET" && pathMatches(path, ["files", /.+/, "content"])) {
    const asset = await findFileAssetOrThrow(path[1]!);
    const ctx = await getRequestContext(request, asset.orgId ? { orgId: asset.orgId } : {});
    assertCanAccessFileAsset(asset, ctx);
    await writeAuditLog({
      request,
      ...(asset.orgId ? { orgId: asset.orgId } : {}),
      ...(ctx.userId ? { actorUserId: ctx.userId } : {}),
      action: "file.read",
      entityType: "file_asset",
      entityId: asset.id,
      metadata: { category: asset.category, visibility: asset.visibility },
    });
    return redirectTo(await resolveFileUrl(asset));
  }
  if (request.method === "DELETE" && pathMatches(path, ["files", /.+/])) {
    const storageProvider = getStorageProviderOrThrow();
    const asset = await findFileAssetOrThrow(path[1]!);
    const ctx = await getRequestContext(request, asset.orgId ? { orgId: asset.orgId } : {});
    const userId = requireAuth(ctx);
    const category = (asset.category ?? "profile_photo") as StorageFileCategory;
    const orgDeletePermissions: Partial<Record<StorageFileCategory, string[]>> = {
      payment_proof: ["PAYMENTS_VIEW", "PAYMENTS_RECORD_OFFLINE"],
      product_image: ["SHOP_MANAGE_PRODUCTS"],
      plan_image: ["PLANS_CREATE"],
      ai_generated_image: ["AI_GENERATE_IMAGE", "PLANS_CREATE"],
      trainer_upi_qr: ["PT_RECORD", "TRAINERS_MANAGE"],
      org_logo: ["ORG_MANAGE_PROFILE"],
      org_cover: ["ORG_MANAGE_PROFILE"],
      org_gallery: ["ORG_MANAGE_PROFILE"],
    };

    const canDeleteOwn = asset.ownerUserId === userId;
    const canDeleteOrg =
      Boolean(asset.orgId) &&
      ctx.orgId === asset.orgId &&
      (orgDeletePermissions[category] ?? []).some((permission) =>
        ctx.permissions.includes(permission as never),
      );

    if (!canDeleteOwn && !canDeleteOrg) {
      throw forbiddenError("You do not have permission to delete this file.");
    }

    assertFileStorageProviderMatches(asset, storageProvider.getDiagnostics().provider);
    await storageProvider.deleteFile({ key: asset.storageKey });
    const deleted = await prisma.fileAsset.update({
      where: { id: asset.id },
      data: { deletedAt: new Date() },
    });
    await writeAuditLog({
      request,
      ...(asset.orgId ? { orgId: asset.orgId } : {}),
      actorUserId: userId,
      action: "file.deleted",
      entityType: "file_asset",
      entityId: asset.id,
      metadata: { category },
    });
    return ok({ file: deleted, deleted: true });
  }
  return undefined;
}
