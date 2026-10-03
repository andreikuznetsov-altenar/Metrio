import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "../../components/Button/Button";
import { Switch } from "../../components/Switch/Switch";
import { formatBuildLabel, getBuildInfo } from "../../config/build";
import { useFeedbackSurveyStore } from "../../app/feedbackSurveyStore";
import { usePerformanceData } from "../../app/PerformanceDataContext";
import { useToast } from "../../components/Toast/ToastContext";
import {
  formatRelativeSync,
  runConnectionDiagnostics,
  type ConnectionCheckRow,
} from "../../platform/observability/connectionDiagnostics";
import {
  getApiRequestCounts,
  getRefreshMetrics,
  getStartupTimings,
  resetRecreatableCaches,
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
  onPersist,
  embedded = false,
}: {
  prefs: AppPreferences;
  onPersist: (next: AppPreferences) => Promise<void>;
  embedded?: boolean;
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
    } finally {
      setChecking(false);
    }
  }, [prefs]);

  useEffect(() => {
    void runChecks();
  }, [runChecks]);

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
    <div
      className={embedded ? "settings-card__body" : "settings-panel"}
      data-testid="diagnostics-settings"
    >
      {!embedded ? <h2 className="settings-panel__title">Diagnostics</h2> : null}
      <p className={embedded ? "settings-card__description" : "settings-intro"}>
        Technical health for support. No surveillance telemetry is sent automatically.
      </p>

      {!embedded ? (
        <p className="settings-panel__lead">{formatBuildLabel(buildInfo)}</p>
      ) : null}

      <ul className="diagnostics-status-list">
        <li>
          <strong>Jira</strong> ·{" "}
          {prefs.credentials.jiraConfigured ? "Configured" : "Not configured"} · refreshed{" "}
          {formatRelativeSync(prefs.sync.lastJiraSync)}
          {prefs.sync.jiraStale ? " · stale" : ""}
        </li>
        <li>
          <strong>BambooHR</strong> ·{" "}
          {prefs.credentials.bambooConfigured ? "Configured" : "Not configured"} · refreshed{" "}
          {formatRelativeSync(prefs.sync.lastBambooSync)}
          {prefs.sync.bambooStale ? " · stale" : ""}
        </li>
        <li>
          <strong>Tray</strong> ·{" "}
          {prefs.general.keepRunningInTray ? "Background mode on" : "Background mode off"} · Launch
          at login {prefs.general.launchAtLogin ? "on" : "off"}
        </li>
      </ul>

      <div className="settings-button-group">
        <Button type="button" variant="secondary" disabled={checking} onClick={() => void runChecks()}>
          Run connection checks
        </Button>
        <Button type="button" variant="secondary" onClick={() => void openLogsFolder()}>
          Open logs folder
        </Button>
      </div>

      {checks ? (
        <ul className="diagnostics-check-list" data-testid="diagnostics-checks">
          {checks.map((row) => (
            <li key={row.id}>
              <span className="diagnostics-check-list__label">{row.label}</span>
              <span className="diagnostics-check-list__state">{row.state}</span>
              <span className="diagnostics-check-list__detail">{row.detail}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="settings-toggle-row settings-toggle-row--stacked">
        <div className="settings-toggle-row__text">
          <span className="settings-toggle-row__label">Debug logging</span>
          <span className="settings-toggle-row__description">
            Verbose local logs (still redacted). Off by default.
          </span>
        </div>
        <Switch
          aria-label="Debug logging"
          checked={prefs.diagnostics.debugLoggingEnabled}
          onCheckedChange={(checked) => {
            void onPersist({
              ...prefs,
              diagnostics: { ...prefs.diagnostics, debugLoggingEnabled: checked },
            });
          }}
        />
      </div>

      <div className="settings-button-group">
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
          onClick={() => {
            resetRecreatableCaches();
            success("Temporary caches cleared");
          }}
        >
          Clear temporary caches
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

      <Button
        type="button"
        variant="secondary"
        onClick={() => setAdvancedOpen((v) => !v)}
      >
        {advancedOpen ? "Hide advanced details" : "Show advanced details"}
      </Button>

      {advancedOpen ? (
        <pre className="diagnostics-advanced" data-testid="diagnostics-advanced">
          {summaryText}
        </pre>
      ) : null}
    </div>
  );
}
