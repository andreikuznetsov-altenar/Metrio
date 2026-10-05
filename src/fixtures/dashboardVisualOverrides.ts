/** Visual-test query flags for Dashboard Pass 9 acceptance. */
export function readDashboardVisualQueryFlag(param: string): boolean {
  if (import.meta.env.VITE_VISUAL_FIXTURE !== "1") return false;
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get(param) === "1";
}

export function shouldHideTeamBriefForVisual(): boolean {
  return readDashboardVisualQueryFlag("visualHomeSecondarySingle");
}
