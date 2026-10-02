import type { PerformanceLoadStatus } from "./PerformanceDataContext";

export type PerformanceUiState =
  | "idle"
  | "initial-loading"
  | "ready"
  | "refreshing"
  | "error"
  | "stale";

export function derivePerformanceUiState(input: {
  status: PerformanceLoadStatus;
  viewModels: unknown | null;
  stale: boolean;
}): PerformanceUiState {
  const { status, viewModels, stale } = input;
  if (status === "idle") return "idle";
  if (!viewModels && status === "error") return "error";
  if (!viewModels && status === "loading") {
    return "initial-loading";
  }
  if (status === "refreshing" || (status === "loading" && viewModels)) {
    return "refreshing";
  }
  if (viewModels && stale && status === "partial") return "stale";
  if (
    viewModels &&
    (status === "ready" || status === "partial" || status === "error")
  ) {
    return stale ? "stale" : "ready";
  }
  return "ready";
}

export function isPerformanceInitialLoading(state: PerformanceUiState): boolean {
  return state === "initial-loading";
}
