import { Button } from "../../components/Button/Button";
import { usePerformanceData } from "../../app/PerformanceDataContext";

export function PerformanceStatusBanner() {
  const {
    status,
    loadingMessage,
    errorMessage,
    viewModels,
    data,
    refresh,
    uiState,
    longLoadingMessage,
  } = usePerformanceData();

  if (uiState === "initial-loading") {
    return null;
  }

  if (uiState === "error" && !viewModels) {
    return (
      <div
        className="performance-empty performance-status-banner performance-status-banner--error"
        role="alert"
      >
        <p>{errorMessage || "Couldn't load performance data."}</p>
        <Button type="button" variant="secondary" onClick={() => void refresh()}>
          Retry
        </Button>
      </div>
    );
  }

  if (status === "loading" && !viewModels && loadingMessage) {
    return (
      <div className="performance-empty performance-status-banner" role="status">
        {longLoadingMessage || loadingMessage}
      </div>
    );
  }

  const messages: string[] = [];
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
      <p>{messages.join(" ")}</p>
    </div>
  );
}
