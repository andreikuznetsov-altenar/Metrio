import { parseInvokeError } from "../../platform/apiTypes";

export type BambooPhotoErrorKind =
  | "native_invoke"
  | "http_forbidden"
  | "http_not_found"
  | "http_other"
  | "unknown";

export interface BambooPhotoInvokeError {
  kind: BambooPhotoErrorKind;
  message: string;
  httpStatus?: number;
}

/** Classify Bamboo photo invoke failures — never treat native/contract errors as HTTP 403. */
export function classifyBambooPhotoInvokeError(error: unknown): BambooPhotoInvokeError {
  const api = parseInvokeError(error);
  const status = api.status;
  if (status === 403) {
    return { kind: "http_forbidden", message: api.message, httpStatus: 403 };
  }
  if (status === 404) {
    return { kind: "http_not_found", message: api.message, httpStatus: 404 };
  }
  if (status != null && status > 0) {
    return { kind: "http_other", message: api.message, httpStatus: status };
  }
  if (
    api.code === "unknown" ||
    /invalid args|missing required|serde|invoke/i.test(api.message)
  ) {
    return { kind: "native_invoke", message: api.message };
  }
  return { kind: "unknown", message: api.message };
}

export function avatarCacheStatusFromPhotoError(
  classified: BambooPhotoInvokeError,
): "missing" | "forbidden" | "failed" {
  if (classified.kind === "http_not_found") return "missing";
  if (classified.kind === "http_forbidden") return "forbidden";
  return "failed";
}
