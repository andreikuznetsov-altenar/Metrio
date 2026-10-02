import type { DirectorPerformanceView } from "../domain/performance";

const KEY = "metrio.performance.directorView.v1";

const VIEWS: DirectorPerformanceView[] = [
  "overview",
  "teams",
  "signals",
  "delivery",
];

export function readPersistedDirectorPerformanceView(): DirectorPerformanceView {
  if (typeof sessionStorage === "undefined") return "overview";
  const raw = sessionStorage.getItem(KEY);
  return VIEWS.includes(raw as DirectorPerformanceView)
    ? (raw as DirectorPerformanceView)
    : "overview";
}

export function writePersistedDirectorPerformanceView(
  view: DirectorPerformanceView,
): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(KEY, view);
}
