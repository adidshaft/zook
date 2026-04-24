import type { DiagnosticProvider, ProviderInstanceDiagnostics } from "../types";

export interface StorageProvider extends DiagnosticProvider {
  uploadFile(input: { key: string; contentType: string; sizeBytes: number; body?: unknown }): Promise<{ key: string; url: string }>;
  getSignedUrl(input: { key: string; expiresInSeconds?: number }): Promise<string>;
  deleteFile(input: { key: string }): Promise<void>;
}

export class LocalStorageProvider implements StorageProvider {
  private files = new Map<string, { url: string; contentType: string; sizeBytes: number }>();

  getDiagnostics(): ProviderInstanceDiagnostics {
    return {
      provider: "local",
      mode: "local",
      configured: true,
      metadata: {
        fileCount: this.files.size,
        pathPrefix: "/uploads"
      }
    };
  }

  async uploadFile(input: { key: string; contentType: string; sizeBytes: number }): Promise<{ key: string; url: string }> {
    const url = `/uploads/${input.key}`;
    this.files.set(input.key, { url, contentType: input.contentType, sizeBytes: input.sizeBytes });
    return { key: input.key, url };
  }

  async getSignedUrl(input: { key: string }): Promise<string> {
    return this.files.get(input.key)?.url ?? `/uploads/${input.key}`;
  }

  async deleteFile(input: { key: string }): Promise<void> {
    this.files.delete(input.key);
  }
}
