import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl as getS3SignedUrl } from "@aws-sdk/s3-request-presigner";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getAppEnv } from "../runtime-env";
import type { DiagnosticProvider, ProviderInstanceDiagnostics } from "../types";

export const storageFileCategories = [
  "profile_photo",
  "payment_proof",
  "product_image",
  "plan_image",
  "trainer_upi_qr",
  "org_logo",
  "org_cover",
  "org_gallery",
  "ai_generated_image",
  "body_progress_photo",
  "privacy_export",
  "invoice_pdf",
] as const;

export type StorageFileCategory = (typeof storageFileCategories)[number];

export const storageFileVisibilities = ["private", "org", "public"] as const;
export type StorageFileVisibility = (typeof storageFileVisibilities)[number];

export interface StorageFileValidationInput {
  category: StorageFileCategory;
  contentType: string;
  sizeBytes: number;
  originalName?: string;
  visibility?: StorageFileVisibility;
}

export interface StorageFileValidationResult extends StorageFileValidationInput {
  extension: string;
  normalizedBaseName: string;
  visibility: StorageFileVisibility;
  maxSizeBytes: number;
}

export interface StorageUploadInput extends StorageFileValidationInput {
  key: string;
  body: Uint8Array | ArrayBuffer | Buffer;
  cacheControl?: string;
}

export interface StorageUploadResult {
  key: string;
  url: string;
}

export interface StoredFileObject {
  body: Buffer;
  contentType: string;
  sizeBytes: number;
}

export interface StorageProvider extends DiagnosticProvider {
  uploadFile(input: StorageUploadInput): Promise<StorageUploadResult>;
  getSignedUrl(input: { key: string; expiresInSeconds?: number }): Promise<string>;
  deleteFile(input: { key: string }): Promise<void>;
  getPublicUrl(input: { key: string }): Promise<string>;
  validateFile(input: StorageFileValidationInput): StorageFileValidationResult;
}

const megabyte = 1024 * 1024;

function defaultMaxUploadBytes(category: StorageFileCategory) {
  if (category === "profile_photo") {
    return 5 * megabyte;
  }
  if (category === "privacy_export") {
    return 100 * megabyte;
  }
  const envLimit = Number(process.env.MAX_FILE_SIZE_BYTES ?? 10 * megabyte);
  return Number.isFinite(envLimit) && envLimit > 0 ? Math.floor(envLimit) : 10 * megabyte;
}

const fileRules: Record<
  StorageFileCategory,
  {
    maxSizeBytes: number;
    contentTypes: string[];
    defaultVisibility: StorageFileVisibility;
    allowedVisibilities: StorageFileVisibility[];
    defaultExtension: string;
  }
> = {
  profile_photo: {
    maxSizeBytes: 5 * megabyte,
    contentTypes: ["image/jpeg", "image/png", "image/webp"],
    defaultVisibility: "private",
    allowedVisibilities: ["private", "org"],
    defaultExtension: "jpg",
  },
  payment_proof: {
    maxSizeBytes: 10 * megabyte,
    contentTypes: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
    defaultVisibility: "private",
    allowedVisibilities: ["private"],
    defaultExtension: "pdf",
  },
  product_image: {
    maxSizeBytes: 6 * megabyte,
    contentTypes: ["image/jpeg", "image/png", "image/webp"],
    defaultVisibility: "public",
    allowedVisibilities: ["org", "public"],
    defaultExtension: "jpg",
  },
  plan_image: {
    maxSizeBytes: 6 * megabyte,
    contentTypes: ["image/jpeg", "image/png", "image/webp"],
    defaultVisibility: "org",
    allowedVisibilities: ["org", "public"],
    defaultExtension: "jpg",
  },
  trainer_upi_qr: {
    maxSizeBytes: 4 * megabyte,
    contentTypes: ["image/jpeg", "image/png", "image/webp"],
    defaultVisibility: "org",
    allowedVisibilities: ["private", "org"],
    defaultExtension: "png",
  },
  org_logo: {
    maxSizeBytes: 4 * megabyte,
    contentTypes: ["image/jpeg", "image/png", "image/webp", "image/svg+xml"],
    defaultVisibility: "public",
    allowedVisibilities: ["public"],
    defaultExtension: "png",
  },
  org_cover: {
    maxSizeBytes: 8 * megabyte,
    contentTypes: ["image/jpeg", "image/png", "image/webp"],
    defaultVisibility: "public",
    allowedVisibilities: ["public"],
    defaultExtension: "jpg",
  },
  org_gallery: {
    maxSizeBytes: 8 * megabyte,
    contentTypes: ["image/jpeg", "image/png", "image/webp"],
    defaultVisibility: "public",
    allowedVisibilities: ["public"],
    defaultExtension: "jpg",
  },
  ai_generated_image: {
    maxSizeBytes: 6 * megabyte,
    contentTypes: ["image/jpeg", "image/png", "image/webp", "image/svg+xml"],
    defaultVisibility: "org",
    allowedVisibilities: ["org", "public"],
    defaultExtension: "png",
  },
  body_progress_photo: {
    maxSizeBytes: 8 * megabyte,
    contentTypes: ["image/jpeg", "image/png", "image/webp"],
    defaultVisibility: "private",
    allowedVisibilities: ["private"],
    defaultExtension: "jpg",
  },
  privacy_export: {
    maxSizeBytes: 100 * megabyte,
    contentTypes: ["application/json"],
    defaultVisibility: "private",
    allowedVisibilities: ["private"],
    defaultExtension: "json",
  },
  invoice_pdf: {
    maxSizeBytes: 10 * megabyte,
    contentTypes: ["application/pdf"],
    defaultVisibility: "private",
    allowedVisibilities: ["private", "org"],
    defaultExtension: "pdf",
  },
};

const contentTypeByExtension: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  svg: "image/svg+xml",
  pdf: "application/pdf",
  json: "application/json",
};

const extensionByContentType: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "application/pdf": "pdf",
  "application/json": "json",
};

function normalizeOriginalName(originalName?: string) {
  const source = (originalName ?? "upload").trim();
  if (!source) {
    return "upload";
  }
  if (/[\0/\\]/.test(source) || source.split(/[\\/]/).some((segment) => segment === "..")) {
    throw new Error("Unsafe file name.");
  }
  if (source.includes("..")) {
    throw new Error("Unsafe file name.");
  }
  const safe = source
    .replace(/\.+/g, ".")
    .replace(/[^a-zA-Z0-9._ -]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 120);

  if (!safe || safe === "." || safe === "..") {
    throw new Error("Unsafe file name.");
  }

  return safe;
}

function splitNameParts(fileName: string) {
  const safeFileName = normalizeOriginalName(fileName);
  const extensionMatch = /\.([a-zA-Z0-9]+)$/.exec(safeFileName);
  const extension = extensionMatch?.[1]?.toLowerCase() ?? "";
  const normalizedBaseName = safeFileName.replace(/\.[^.]+$/, "").slice(0, 80) || "upload";
  return { normalizedBaseName, extension };
}

function resolveExtension(
  originalName: string | undefined,
  contentType: string,
  defaultExtension: string,
) {
  const fromName = originalName ? splitNameParts(originalName).extension : "";
  const fromType = extensionByContentType[contentType];
  if (
    fromName &&
    contentTypeByExtension[fromName] &&
    contentTypeByExtension[fromName] !== contentType
  ) {
    throw new Error(`File extension .${fromName} does not match MIME type ${contentType}.`);
  }
  return fromType || fromName || defaultExtension;
}

function normalizeVisibility(category: StorageFileCategory, requested?: StorageFileVisibility) {
  const rule = fileRules[category];
  const visibility = requested ?? rule.defaultVisibility;
  if (!rule.allowedVisibilities.includes(visibility)) {
    throw new Error(`Files in category ${category} cannot use visibility ${visibility}.`);
  }
  return visibility;
}

function toBuffer(body: Uint8Array | ArrayBuffer | Buffer) {
  if (Buffer.isBuffer(body)) {
    return body;
  }
  if (body instanceof Uint8Array) {
    return Buffer.from(body);
  }
  return Buffer.from(body);
}

function resolveContentTypeFromKey(key: string) {
  const extension = key.split(".").pop()?.toLowerCase() ?? "";
  return contentTypeByExtension[extension] ?? "application/octet-stream";
}

function encodeKeyPath(key: string) {
  return key
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function sanitizeSegment(value: string | undefined, fallback: string) {
  const source = (value ?? fallback).trim().toLowerCase();
  return (
    source
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || fallback
  );
}

function resolveLocalStorageSecret(secret?: string) {
  const resolved = secret ?? process.env.STORAGE_URL_SIGNING_SECRET ?? process.env.SESSION_SECRET;
  if (resolved) {
    return resolved;
  }
  if (getAppEnv() === "local") {
    return "zook-local-storage-secret";
  }
  throw new Error("STORAGE_URL_SIGNING_SECRET is required in non-local environments.");
}

function resolveLocalStorageRootDir(rootDir = process.env.STORAGE_LOCAL_DIR ?? ".local/uploads") {
  return path.resolve(process.cwd(), rootDir);
}

function assertWithinRoot(rootDir: string, filePath: string) {
  const normalizedRoot = `${path.resolve(rootDir)}${path.sep}`;
  const normalizedPath = path.resolve(filePath);
  if (!normalizedPath.startsWith(normalizedRoot)) {
    throw new Error("Storage key resolved outside the configured local directory.");
  }
}

export function validateStorageFile(
  input: StorageFileValidationInput,
): StorageFileValidationResult {
  const rule = fileRules[input.category];
  const contentType = input.contentType.trim().toLowerCase();

  if (!rule) {
    throw new Error(`Unsupported storage category ${input.category}.`);
  }
  if (!rule.contentTypes.includes(contentType)) {
    throw new Error(`Unsupported MIME type ${contentType} for ${input.category}.`);
  }
  if (!Number.isFinite(input.sizeBytes) || input.sizeBytes <= 0) {
    throw new Error("Upload size must be greater than zero.");
  }
  const maxSizeBytes = defaultMaxUploadBytes(input.category);
  if (input.sizeBytes > maxSizeBytes) {
    throw new Error(
      `File exceeds the ${Math.floor(maxSizeBytes / megabyte)} MB limit for ${input.category}.`,
    );
  }

  const originalName = normalizeOriginalName(input.originalName);
  const { normalizedBaseName } = splitNameParts(originalName);

  return {
    ...input,
    contentType,
    originalName,
    normalizedBaseName,
    extension: resolveExtension(originalName, contentType, rule.defaultExtension),
    visibility: normalizeVisibility(input.category, input.visibility),
    maxSizeBytes,
  };
}

export function buildStorageKey(input: {
  category: StorageFileCategory;
  orgId?: string | null;
  ownerUserId?: string | null;
  fileId?: string;
  originalName?: string;
  now?: Date;
}) {
  const rule = fileRules[input.category];
  const originalName = normalizeOriginalName(input.originalName ?? "upload");
  const { extension: rawExtension } = splitNameParts(originalName);
  const timestamp = input.now ?? new Date();
  const fileId = sanitizeSegment(input.fileId ?? randomBytes(12).toString("hex"), "file");
  const extension = rawExtension || rule.defaultExtension;

  return [
    input.orgId ? sanitizeSegment(input.orgId, "shared") : "global",
    input.category,
    `${fileId}-${timestamp.getTime()}.${extension}`,
  ].join("/");
}

export function createLocalStorageSignature(input: {
  key: string;
  expiresAt: number;
  secret?: string;
}) {
  return createHmac("sha256", resolveLocalStorageSecret(input.secret))
    .update(`${input.key}:${input.expiresAt}`)
    .digest("hex");
}

export function verifyLocalStorageSignature(input: {
  key: string;
  expiresAt: number;
  signature: string;
  secret?: string;
}) {
  if (!input.signature) {
    return false;
  }
  if (Number.isNaN(input.expiresAt) || input.expiresAt <= Date.now()) {
    return false;
  }
  const expected = createLocalStorageSignature({
    key: input.key,
    expiresAt: input.expiresAt,
    ...(input.secret ? { secret: input.secret } : {}),
  });
  const expectedBytes = Buffer.from(expected);
  const signatureBytes = Buffer.from(input.signature);
  return expectedBytes.length === signatureBytes.length && timingSafeEqual(expectedBytes, signatureBytes);
}

export function buildLocalStorageSignedUrl(input: {
  key: string;
  expiresInSeconds?: number;
  secret?: string;
}) {
  const expiresInSeconds = Math.min(input.expiresInSeconds ?? 5 * 60, 5 * 60);
  const expiresAt = Date.now() + expiresInSeconds * 1000;
  const signature = createLocalStorageSignature({
    key: input.key,
    expiresAt,
    ...(input.secret ? { secret: input.secret } : {}),
  });
  return `/api/files/local?key=${encodeURIComponent(input.key)}&expires=${expiresAt}&signature=${signature}`;
}

export function buildLocalStoragePublicUrl(key: string) {
  return `/api/files/local/public?key=${encodeURIComponent(key)}`;
}

export class LocalStorageProvider implements StorageProvider {
  private readonly rootDir: string;
  private readonly signingSecret: string;

  constructor(options: { rootDir?: string; signingSecret?: string } = {}) {
    this.rootDir = resolveLocalStorageRootDir(options.rootDir);
    this.signingSecret = resolveLocalStorageSecret(options.signingSecret);
  }

  getDiagnostics(): ProviderInstanceDiagnostics {
    return {
      provider: "local",
      mode: "local",
      configured: true,
      metadata: {
        pathPrefix: this.rootDir,
      },
    };
  }

  validateFile(input: StorageFileValidationInput) {
    return validateStorageFile(input);
  }

  async uploadFile(input: StorageUploadInput): Promise<StorageUploadResult> {
    const validated = this.validateFile(input);
    const bytes = toBuffer(input.body);
    const destination = path.resolve(this.rootDir, input.key);

    assertWithinRoot(this.rootDir, destination);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, bytes);

    return {
      key: input.key,
      url:
        validated.visibility === "public"
          ? buildLocalStoragePublicUrl(input.key)
          : buildLocalStorageSignedUrl({ key: input.key, secret: this.signingSecret }),
    };
  }

  async getSignedUrl(input: { key: string; expiresInSeconds?: number }): Promise<string> {
    return buildLocalStorageSignedUrl({
      key: input.key,
      ...(input.expiresInSeconds !== undefined ? { expiresInSeconds: input.expiresInSeconds } : {}),
      secret: this.signingSecret,
    });
  }

  async getPublicUrl(input: { key: string }): Promise<string> {
    return buildLocalStoragePublicUrl(input.key);
  }

  async deleteFile(input: { key: string }): Promise<void> {
    const destination = path.resolve(this.rootDir, input.key);
    assertWithinRoot(this.rootDir, destination);
    await rm(destination, { force: true });
  }

  async readObject(input: { key: string }): Promise<StoredFileObject> {
    const destination = path.resolve(this.rootDir, input.key);
    assertWithinRoot(this.rootDir, destination);
    const body = await readFile(destination);
    return {
      body,
      contentType: resolveContentTypeFromKey(input.key),
      sizeBytes: body.byteLength,
    };
  }
}

export class S3CompatibleStorageProvider implements StorageProvider {
  private readonly client: S3Client;

  constructor(
    private readonly options: {
      provider: "s3" | "r2";
      bucket: string;
      region: string;
      endpoint?: string;
      accessKeyId: string;
      secretAccessKey: string;
      publicBaseUrl?: string;
      forcePathStyle?: boolean;
    },
  ) {
    this.client = new S3Client({
      region: options.region,
      ...(options.endpoint ? { endpoint: options.endpoint } : {}),
      credentials: {
        accessKeyId: options.accessKeyId,
        secretAccessKey: options.secretAccessKey,
      },
      forcePathStyle: options.forcePathStyle ?? Boolean(options.endpoint),
    });
  }

  getDiagnostics(): ProviderInstanceDiagnostics {
    return {
      provider: this.options.provider,
      mode: "live",
      configured: Boolean(this.options.bucket && this.options.region),
      metadata: {
        bucket: this.options.bucket,
        region: this.options.region,
        hasEndpoint: Boolean(this.options.endpoint),
        hasPublicBaseUrl: Boolean(this.options.publicBaseUrl),
      },
    };
  }

  validateFile(input: StorageFileValidationInput) {
    return validateStorageFile(input);
  }

  async uploadFile(input: StorageUploadInput): Promise<StorageUploadResult> {
    const validated = this.validateFile(input);
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.options.bucket,
        Key: input.key,
        Body: toBuffer(input.body),
        ContentType: validated.contentType,
        ...(input.cacheControl ? { CacheControl: input.cacheControl } : {}),
      }),
    );

    return {
      key: input.key,
      url:
        validated.visibility === "public"
          ? await this.getPublicUrl({ key: input.key })
          : await this.getSignedUrl({ key: input.key }),
    };
  }

  async getSignedUrl(input: { key: string; expiresInSeconds?: number }): Promise<string> {
    return getS3SignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: this.options.bucket,
        Key: input.key,
      }),
      { expiresIn: input.expiresInSeconds ?? 10 * 60 },
    );
  }

  async getPublicUrl(input: { key: string }): Promise<string> {
    const encodedKey = encodeKeyPath(input.key);
    if (this.options.publicBaseUrl) {
      return `${this.options.publicBaseUrl.replace(/\/$/, "")}/${encodedKey}`;
    }
    if (this.options.endpoint) {
      return `${this.options.endpoint.replace(/\/$/, "")}/${this.options.bucket}/${encodedKey}`;
    }
    return `https://${this.options.bucket}.s3.${this.options.region}.amazonaws.com/${encodedKey}`;
  }

  async deleteFile(input: { key: string }): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.options.bucket,
        Key: input.key,
      }),
    );
  }
}

export class SupabaseStorageProvider implements StorageProvider {
  private readonly client: SupabaseClient;

  constructor(
    private readonly options: {
      url: string;
      serviceRoleKey: string;
      bucket: string;
      publicBaseUrl?: string;
    },
  ) {
    this.client = createClient(options.url, options.serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  getDiagnostics(): ProviderInstanceDiagnostics {
    return {
      provider: "supabase",
      mode: "live",
      configured: Boolean(this.options.url && this.options.serviceRoleKey && this.options.bucket),
      metadata: {
        bucket: this.options.bucket,
        hasPublicBaseUrl: Boolean(this.options.publicBaseUrl),
      },
    };
  }

  validateFile(input: StorageFileValidationInput) {
    return validateStorageFile(input);
  }

  async uploadFile(input: StorageUploadInput): Promise<StorageUploadResult> {
    const validated = this.validateFile(input);
    const { error } = await this.client.storage.from(this.options.bucket).upload(
      input.key,
      toBuffer(input.body),
      {
        contentType: validated.contentType,
        ...(input.cacheControl ? { cacheControl: input.cacheControl } : {}),
        upsert: false,
      },
    );
    if (error) {
      throw new Error(`Supabase upload failed: ${error.message}`);
    }
    return {
      key: input.key,
      url:
        validated.visibility === "public"
          ? await this.getPublicUrl({ key: input.key })
          : await this.getSignedUrl({ key: input.key }),
    };
  }

  async getSignedUrl(input: { key: string; expiresInSeconds?: number }): Promise<string> {
    const { data, error } = await this.client.storage
      .from(this.options.bucket)
      .createSignedUrl(input.key, input.expiresInSeconds ?? 10 * 60);
    if (error || !data?.signedUrl) {
      throw new Error(`Supabase signed URL failed: ${error?.message ?? "missing signed URL"}`);
    }
    return data.signedUrl;
  }

  async getPublicUrl(input: { key: string }): Promise<string> {
    const encodedKey = encodeKeyPath(input.key);
    if (this.options.publicBaseUrl) {
      return `${this.options.publicBaseUrl.replace(/\/$/, "")}/${encodedKey}`;
    }
    const { data } = this.client.storage.from(this.options.bucket).getPublicUrl(input.key);
    return data.publicUrl;
  }

  async deleteFile(input: { key: string }): Promise<void> {
    const { error } = await this.client.storage.from(this.options.bucket).remove([input.key]);
    if (error) {
      throw new Error(`Supabase delete failed: ${error.message}`);
    }
  }
}
