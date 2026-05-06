import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  LocalStorageProvider,
  buildStorageKey,
  validateStorageFile,
  verifyLocalStorageSignature
} from "../providers";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("storage provider", () => {
  it("rejects unsupported mime types", () => {
    expect(() =>
      validateStorageFile({
        category: "product_image",
        contentType: "text/plain",
        sizeBytes: 1024,
        originalName: "notes.txt",
        visibility: "public"
      })
    ).toThrow(/Unsupported MIME type/);
  });

  it("rejects oversized files", () => {
    expect(() =>
      validateStorageFile({
        category: "profile_photo",
        contentType: "image/png",
        sizeBytes: 10 * 1024 * 1024,
        originalName: "avatar.png",
        visibility: "private"
      })
    ).toThrow(/File exceeds/);
  });

  it("rejects filenames whose extension disagrees with the MIME type", () => {
    expect(() =>
      validateStorageFile({
        category: "org_logo",
        contentType: "image/png",
        sizeBytes: 1024,
        originalName: "logo.svg",
        visibility: "public"
      })
    ).toThrow(/does not match MIME type/);
  });

  it("keeps JSON export files typed as JSON", () => {
    expect(
      validateStorageFile({
        category: "privacy_export",
        contentType: "application/json",
        sizeBytes: 128,
        originalName: "export.json",
        visibility: "private"
      })
    ).toMatchObject({ extension: "json", contentType: "application/json" });
  });

  it("builds upload keys without trusting the original file basename", () => {
    const key = buildStorageKey({
      category: "product_image",
      orgId: "Org 123",
      fileId: "file_abc",
      originalName: "../unsafe name.png",
      now: new Date("2026-04-24T00:00:00.000Z")
    });

    expect(key).toBe("org-123/product_image/file-abc-1776988800000.png");
    expect(key).not.toContain("unsafe");
  });

  it("validates public organization gallery assets", () => {
    expect(
      validateStorageFile({
        category: "org_gallery",
        contentType: "image/webp",
        sizeBytes: 2048,
        originalName: "floor.webp",
        visibility: "public"
      })
    ).toMatchObject({ extension: "webp", visibility: "public" });
  });

  it("stores local files on disk and produces verifiable signed urls", async () => {
    const rootDir = await mkdtemp(path.join(tmpdir(), "zook-storage-"));
    tempDirs.push(rootDir);

    const provider = new LocalStorageProvider({
      rootDir,
      signingSecret: "test-storage-secret"
    });
    const key = buildStorageKey({
      category: "profile_photo",
      orgId: "org_test",
      ownerUserId: "user_test",
      originalName: "avatar.png",
      now: new Date("2026-04-24T00:00:00.000Z")
    });

    await provider.uploadFile({
      key,
      category: "profile_photo",
      contentType: "image/png",
      sizeBytes: 4,
      originalName: "avatar.png",
      visibility: "private",
      body: Buffer.from([1, 2, 3, 4])
    });

    const file = await provider.readObject({ key });
    const signedUrl = await provider.getSignedUrl({ key, expiresInSeconds: 60 });
    const url = new URL(`https://zook.local${signedUrl}`);

    expect(file.contentType).toBe("image/png");
    expect(Array.from(file.body)).toEqual([1, 2, 3, 4]);
    expect(
      verifyLocalStorageSignature({
        key,
        expiresAt: Number(url.searchParams.get("expires")),
        signature: url.searchParams.get("signature") ?? "",
        secret: "test-storage-secret"
      })
    ).toBe(true);
  });
});
