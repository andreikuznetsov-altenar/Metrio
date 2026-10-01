export interface ApiErrorPayload {
  code: string;
  message: string;
  status?: number;
  url?: string;
}

export class ApiError extends Error {
  code: string;
  status?: number;
  url?: string;

  constructor(payload: ApiErrorPayload) {
    super(payload.message);
    this.name = 'ApiError';
    this.code = payload.code;
    this.status = payload.status;
    this.url = payload.url;
  }
}

export function parseInvokeError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (typeof error === 'string') {
    try {
      const parsed = JSON.parse(error) as ApiErrorPayload;
      if (parsed.message) return new ApiError(parsed);
    } catch {
      return new ApiError({ code: 'unknown', message: error });
    }
  }
  if (error && typeof error === 'object' && 'message' in error) {
    const e = error as { message?: string; code?: string; status?: number; url?: string };
    return new ApiError({
      code: e.code || 'unknown',
      message: e.message || String(error),
      status: e.status,
      url: e.url,
    });
  }
  return new ApiError({ code: 'unknown', message: String(error) });
}
