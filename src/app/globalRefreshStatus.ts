import type { PerformanceLoadStatus } from "./PerformanceDataContext";
import type { PerformanceUiState } from "./performanceUiState";

export const GLOBAL_REFRESH_STATUS_COPY =
  "Couldn't refresh data. Showing the last successful result.";

export interface GlobalRefreshStatusInput {
  refreshFailedWithUsableCache: boolean;
  hasUsableData: boolean;
  status: PerformanceLoadStatus;
  uiState: PerformanceUiState;
}

/**
 * Cached-data refresh failure is a single global overlay.
 * First-run / no-data errors stay on the blocking page surface.
 */
export function shouldShowGlobalRefreshStatusPanel(
  input: GlobalRefreshStatusInput,
): boolean {
  if (!input.hasUsableData) {
    return false;
  }
  if (input.uiState === "error" && !input.hasUsableData) {
    return false;
  }
  if (input.status === "error" && !input.hasUsableData) {
    return false;
  }
  return input.refreshFailedWithUsableCache;
}
