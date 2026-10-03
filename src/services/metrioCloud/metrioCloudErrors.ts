export type MetrioCloudErrorCode =
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "validation"
  | "unavailable"
  | "offline";

export class MetrioCloudError extends Error {
  constructor(
    public readonly code: MetrioCloudErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export function parseApiError(
  status: number,
  body: unknown,
): MetrioCloudError {
  const code =
    typeof body === "object" &&
    body &&
    "error" in body &&
    typeof (body as { error: { code?: string } }).error?.code === "string"
      ? (body as { error: { code: string; message?: string } }).error.code
      : "unavailable";
  const message =
    typeof body === "object" &&
    body &&
    "error" in body &&
    typeof (body as { error: { message?: string } }).error?.message === "string"
      ? (body as { error: { message: string } }).error.message
      : `HTTP ${status}`;
  const known: MetrioCloudErrorCode[] = [
    "unauthorized",
    "forbidden",
    "not_found",
    "conflict",
    "validation",
    "unavailable",
  ];
  const mapped = known.includes(code as MetrioCloudErrorCode)
    ? (code as MetrioCloudErrorCode)
    : status === 409
      ? "conflict"
      : "unavailable";
  return new MetrioCloudError(mapped, message);
}
