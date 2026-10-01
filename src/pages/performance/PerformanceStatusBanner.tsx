import { usePerformanceData } from "../../app/PerformanceDataContext";

export function PerformanceStatusBanner() {
  const { status, loadingMessage, errorMessage, stale, viewModels, data } =
    usePerformanceData();

  if (status === "loading" && !viewModels) {
    return (
      <div className="performance-empty performance-status-banner" role="status">
        {loadingMessage || "Fetching team data…"}
      </div>
    );
  }

  if (status === "error" && !viewModels) {
    return (
      <div
        className="performance-empty performance-status-banner performance-status-banner--error"
        role="alert"
      >
        {errorMessage || "Couldn't refresh performance data."}
      </div>
    );
  }

  const messages: string[] = [];
  if (stale && errorMessage) {
    messages.push(errorMessage);
  }
  if (viewModels?.statusMessage) {
    messages.push(viewModels.statusMessage);
  }
  const unresolved = data?.identityResolution.filter((row) => !row.matched) ?? [];
  if (unresolved.length > 0 && !messages.some((m) => m.includes("Jira"))) {
    messages.push("Some employee identities could not be matched to Jira.");
  }

  if (messages.length === 0) {
    return null;
  }

  return (
    <div
      className="performance-empty performance-status-banner performance-status-banner--partial"
      role="status"
    >
      {messages.join(" ")}
    </div>
  );
}
