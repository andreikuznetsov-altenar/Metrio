import { useCallback, useMemo, useState } from "react";
import { Button } from "../../components/Button/Button";
import { useFeedbackSurveyStore } from "../../app/feedbackSurveyStore";
import { usePerformanceData } from "../../app/PerformanceDataContext";
import { useToast } from "../../components/Toast/ToastContext";
import { formatBuildLabel, getBuildInfo } from "../../config/build";
import {
  runConnectionDiagnostics,
  type ConnectionCheckRow,
} from "../../platform/observability/connectionDiagnostics";
import {
  getApiRequestCounts,
  getRefreshMetrics,
  getStartupTimings,
} from "../../platform/observability/observabilityStore";
import {
  buildSupportBundleFiles,
  exportSupportBundleZip,
} from "../../platform/observability/supportBundle";
import { buildDiagnosticsSummaryText } from "../../platform/observability/diagnosticsSummary";
import type { AppPreferences } from "../../platform/preferences";
import { openLogsFolder } from "../../platform/logger";

export function DiagnosticsSettingsPanel({
  prefs,
}: {
  prefs: AppPreferences;
}) {
  const { success, error: toastError } = useToast();
  const surveyData = useFeedbackSurveyStore((s) => s.data);
  const { data: performanceData } = usePerformanceData();
  const [checks, setChecks] = useState<ConnectionCheckRow[] | null>(null);
  const [checking, setChecking] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const buildInfo = getBuildInfo();
  const refreshMetrics = getRefreshMetrics();
  const apiCounts = getApiRequestCounts();
  const startup = getStartupTimings();

  const runChecks = useCallback(async () => {
    setChecking(true);
    try {
      setChecks(await runConnectionDiagnostics(prefs));
      success("Connection checks completed");
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Connection checks failed");
    } finally {
      setChecking(false);
    }
  }, [prefs, success, toastError]);

  const summaryText = useMemo(
    () =>
      buildDiagnosticsSummaryText({
        prefs,
        checks: checks ?? [],
        buildLabel: formatBuildLabel(buildInfo),
        refreshMetrics,
        apiCounts,
        startup,
      }),
    [prefs, checks, buildInfo, refreshMetrics, apiCounts, startup],
  );

  const exportBundle = async () => {
    const confirmed = window.confirm(
      "The bundle contains technical diagnostics and sanitized logs. Credentials and document contents are excluded.",
    );
    if (!confirmed) return;
    setExporting(true);
    try {
      const { bundleId, files } = await buildSupportBundleFiles({
        prefs,
        teamDetection: prefs.teamDetection,
        teamSnapshot: performanceData?.teamSnapshot ?? null,
        surveyData,
      });
      const path = await exportSupportBundleZip(files, bundleId);
      success(`Support bundle ${bundleId} saved`);
      void path;
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="settings-card__body" data-testid="diagnostics-support-settings">
      <p className="settings-card__description">
        Technical tools for support. No surveillance telemetry is sent automatically.
      </p>
      <p className="settings-field__hint">{formatBuildLabel(buildInfo)}</p>

      <div className="settings-button-group diagnostics-actions">
        <Button
          type="button"
          variant="secondary"
          disabled={checking}
          onClick={() => void runChecks()}
          data-testid="diagnostics-run-checks"
        >
          Run connection checks
        </Button>
        <Button type="button" variant="secondary" onClick={() => void openLogsFolder()}>
          Open logs folder
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={exporting}
          onClick={() => void exportBundle()}
          data-testid="diagnostics-export-bundle"
        >
          Export support bundle
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(summaryText);
              success("Diagnostic summary copied");
            } catch {
              toastError("Could not copy summary");
            }
          }}
        >
          Copy diagnostic summary
        </Button>
      </div>

      <div className="diagnostics-advanced-wrap">
        <Button
          type="button"
          variant="secondary"
          className="diagnostics-advanced-toggle"
          onClick={() => setAdvancedOpen((v) => !v)}
        >
          {advancedOpen ? "Hide advanced details" : "Show advanced details"}
        </Button>
      </div>

      <div
        className={`metrio-collapsible${advancedOpen ? " is-open" : ""}`}
        aria-hidden={!advancedOpen}
      >
        <div className="metrio-collapsible__inner">
          <pre
            className="diagnostics-advanced metrio-collapsible__content"
            data-testid="diagnostics-advanced"
          >
            {summaryText}
          </pre>
        </div>
      </div>
    </div>
  );
}
