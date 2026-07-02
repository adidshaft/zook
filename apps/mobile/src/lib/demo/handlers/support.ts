function nowIso() {
  return new Date().toISOString();
}

export function supportDemoResponse(pathname: string, method: string) {
  if (pathname === "/support/feedback") return { submitted: true };

  if (pathname === "/files/upload" && method === "POST") {
    return {
      file: {
        id: `file-${Date.now()}`,
        url: "https://offline.zook.local/files/demo-upload",
        mimeType: "image/jpeg",
        sizeBytes: 0,
        uploadedAt: nowIso(),
      },
    };
  }

  return undefined;
}
