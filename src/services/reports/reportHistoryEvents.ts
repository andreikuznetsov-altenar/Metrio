export const REPORT_HISTORY_CHANGED_EVENT = "metrio-report-history-changed";

export function notifyReportHistoryChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(REPORT_HISTORY_CHANGED_EVENT));
}
