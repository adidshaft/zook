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
  const payload = (await response.json()) as ApiEnvelope<T>;
  if (!payload.ok) {
    throw new ApiError(response.status, payload.error, payload.meta?.requestId);
  }
  return payload.data;
}
