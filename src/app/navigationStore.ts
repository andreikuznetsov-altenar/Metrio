import type { TeamPerformanceView } from "../domain/performance";
import type { AppRoute } from "../domain/types";
import {
  readPersistedTeamPerformanceView,
  writePersistedTeamPerformanceView,
} from "./performanceViewPersistence";

export interface AppNavigationState {
  route: AppRoute;
  performanceView: TeamPerformanceView;
}

type Listener = () => void;

let state: AppNavigationState | null = null;
const listeners = new Set<Listener>();

function current(): AppNavigationState {
  if (!state) {
    state = {
      route: "home",
      performanceView: readPersistedTeamPerformanceView(),
    };
  }
  return state;
}

function emit(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function getAppNavigationState(): AppNavigationState {
  return current();
}

export function subscribeAppNavigation(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Single navigation owner. Route and Performance view update together.
 * sessionStorage is persistence only and is written after the state commit.
 */
export function appNavigate(
  next: Partial<Pick<AppNavigationState, "route" | "performanceView">>,
): void {
  const prev = current();
  const route = next.route ?? prev.route;
  const performanceView = next.performanceView ?? prev.performanceView;
  if (route === prev.route && performanceView === prev.performanceView) {
    return;
  }
  state = { route, performanceView };
  if (next.performanceView !== undefined) {
    const view = performanceView;
    queueMicrotask(() => writePersistedTeamPerformanceView(view));
  }
  emit();
}

export function resetAppNavigationStateForTests(
  next?: Partial<AppNavigationState>,
): void {
  state = {
    route: next?.route ?? "home",
    performanceView: next?.performanceView ?? "overview",
  };
  emit();
}
