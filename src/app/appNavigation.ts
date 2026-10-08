import type { AppRoute } from "../domain/types";
import type { TeamPerformanceView } from "../domain/performance";

export interface AppNavigationBridge {
  /** Opens Performance even when header nav would still be gated. */
  openPerformanceRoute: () => void;
  openRoute: (route: AppRoute) => void;
}

let bridge: AppNavigationBridge | null = null;
let applyTeamPerformanceView: ((view: TeamPerformanceView) => void) | null = null;

export function registerAppNavigation(next: AppNavigationBridge | null): void {
  bridge = next;
}

export function registerTeamPerformanceViewHandler(
  handler: ((view: TeamPerformanceView) => void) | null,
): void {
  applyTeamPerformanceView = handler;
}

export function getAppNavigationBridge(): AppNavigationBridge | null {
  return bridge;
}

export function applyTeamPerformanceViewIfMounted(
  view: TeamPerformanceView,
): boolean {
  if (!applyTeamPerformanceView) {
    return false;
  }
  applyTeamPerformanceView(view);
  return true;
}
