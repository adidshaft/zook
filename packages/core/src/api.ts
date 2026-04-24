export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: unknown;
}

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, payload: ApiErrorPayload) {
    super(payload.message);
    this.name = "ApiError";
    this.status = status;
    this.code = payload.code;
    this.details = payload.details;
  }
}

export type ApiEnvelope<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiErrorPayload };

export async function parseApiResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as ApiEnvelope<T>;
  if (!payload.ok) {
    throw new ApiError(response.status, payload.error);
  }
  return payload.data;
}
