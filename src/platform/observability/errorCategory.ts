import type { ErrorCategory } from "./types";

export function categorizeError(error: unknown): ErrorCategory {
  const message =
    error instanceof Error
      ? `${error.name} ${error.message}`
      : typeof error === "string"
        ? error
        : JSON.stringify(error);
  const lower = message.toLowerCase();
  const code =
    typeof error === "object" &&
    error &&
    "code" in error &&
    typeof (error as { code?: string }).code === "string"
      ? (error as { code: string }).code.toLowerCase()
      : "";

  if (
    lower.includes("offline") ||
    lower.includes("network error") ||
    lower.includes("failed to fetch") ||
    code === "network_error"
  ) {
    return "network";
  }
  if (lower.includes("timeout") || lower.includes("timed out")) {
    return "timeout";
  }
  if (
    code.includes("unauthorized") ||
    lower.includes("401") ||
    lower.includes("invalid_grant") ||
    lower.includes("authentication")
  ) {
    return "unauthorized";
  }
  if (code.includes("forbidden") || lower.includes("403")) {
    return "forbidden";
  }
  if (lower.includes("rate limit") || lower.includes("429")) {
    return "rate_limit";
  }
  if (lower.includes("404") || code.includes("not_found")) {
    return "not_found";
  }
  if (
    lower.includes("parse") ||
    lower.includes("json") ||
    lower.includes("invalid_response")
  ) {
    return "invalid_response";
  }
  if (lower.includes("storage") || lower.includes("quota")) {
    return "storage";
  }
  if (lower.includes("not configured") || lower.includes("missing")) {
    return "configuration";
  }
  return "internal";
}
