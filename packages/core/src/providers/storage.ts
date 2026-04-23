export interface StorageProvider {
  uploadFile(input: { key: string; contentType: string; sizeBytes: number; body?: unknown }): Promise<{ key: string; url: string }>;
  getSignedUrl(input: { key: string; expiresInSeconds?: number }): Promise<string>;
  deleteFile(input: { key: string }): Promise<void>;
}

export class LocalStorageProvider implements StorageProvider {
  private files = new Map<string, { url: string; contentType: string; sizeBytes: number }>();

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
