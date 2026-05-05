export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: unknown;
}

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;
  requestId?: string;

  constructor(status: number, payload: ApiErrorPayload, requestId?: string) {
    super(payload.message);
    this.name = "ApiError";
    this.status = status;
    this.code = payload.code;
    this.details = payload.details;
    if (requestId) {
      this.requestId = requestId;
    }
  }
}

export type ApiEnvelope<T> =
  | { ok: true; data: T; meta?: { requestId?: string } }
  | { ok: false; error: ApiErrorPayload; meta?: { requestId?: string } };

export async function parseApiResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    const text = await response.text().catch(() => "");
    const preview = text.trim().replace(/\s+/g, " ").slice(0, 80);
    throw new ApiError(response.status, {
      code: "NON_JSON_RESPONSE",
      message:
        "The API returned a non-JSON response. Check that the client is pointed at the backend /api base URL.",
      details: { contentType, preview },
    });
  }
  const payload = (await response.json()) as ApiEnvelope<T>;
  if (!payload.ok) {
    throw new ApiError(response.status, payload.error, payload.meta?.requestId);
  }
  return payload.data;
}
