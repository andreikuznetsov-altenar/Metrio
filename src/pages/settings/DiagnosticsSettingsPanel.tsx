import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "../../components/Badge/Badge";
import { Button } from "../../components/Button/Button";
import { Switch } from "../../components/Switch/Switch";
import { formatBuildLabel, getBuildInfo } from "../../config/build";
import { useFeedbackSurveyStore } from "../../app/feedbackSurveyStore";
import { usePerformanceData } from "../../app/PerformanceDataContext";
import { useToast } from "../../components/Toast/ToastContext";
import {
  runConnectionDiagnostics,
  type ConnectionCheckRow,
} from "../../platform/observability/connectionDiagnostics";
import {
  badgeVariantForConnectionState,
  formatConnectionHealthLabel,
} from "../../platform/observability/diagnosticsHealthPresentation";
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
import { runWorkflowCapacityAuditFromPerformanceFetch } from "../../domain/workflows/workflowCapacityAudit";

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
  const [workflowAuditText, setWorkflowAuditText] = useState<string | null>(null);
  const [workflowAuditing, setWorkflowAuditing] = useState(false);

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

  const runWorkflowAudit = async () => {
    setWorkflowAuditing(true);
    setWorkflowAuditText(null);
    try {
      const { fetchPerformanceData } = await import(
        "../../services/performance/performanceDataService"
      );
      const { loadPreferences } = await import("../../platform/preferences");
      const result = await runWorkflowCapacityAuditFromPerformanceFetch(
        fetchPerformanceData,
        loadPreferences,
      );
      setWorkflowAuditText(result.textReport);
      success("Workflow capacity audit completed (read-only)");
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Workflow audit failed");
    } finally {
      setWorkflowAuditing(false);
    }
  };

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

      <section className="diagnostics-section" aria-labelledby="diagnostics-health-title">
        <h4 id="diagnostics-health-title" className="diagnostics-section__title">
          System health
        </h4>
        {checks ? (
          <div className="diagnostics-health-grid" data-testid="diagnostics-checks">
            {checks.map((row) => (
              <article key={row.id} className="diagnostics-health-row">
                <div className="diagnostics-health-row__head">
                  <span className="diagnostics-health-row__label">{row.label}</span>
                  <Badge variant={badgeVariantForConnectionState(row.state)}>
                    {row.displayLabel ?? formatConnectionHealthLabel(row.state)}
                  </Badge>
                </div>
                {row.detail ? (
                  <p className="diagnostics-health-row__detail">{row.detail}</p>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <p className="settings-field__hint" aria-busy="true">
            Running connection checks…
          </p>
        )}
      </section>

      <section className="diagnostics-section" aria-labelledby="diagnostics-desktop-title">
        <h4 id="diagnostics-desktop-title" className="diagnostics-section__title">
          Desktop
        </h4>
        <div className="diagnostics-tray-grid">
          <div className="diagnostics-tray-row">
            <span className="diagnostics-tray-row__label">Menu bar mode</span>
            <Badge variant={prefs.general.keepRunningInTray ? "success" : "neutral"}>
              {prefs.general.keepRunningInTray ? "On" : "Off"}
            </Badge>
          </div>
          <div className="diagnostics-tray-row">
            <span className="diagnostics-tray-row__label">Launch at login</span>
            <Badge variant={prefs.general.launchAtLogin ? "success" : "neutral"}>
              {prefs.general.launchAtLogin ? "On" : "Off"}
            </Badge>
          </div>
          <div className="diagnostics-tray-row diagnostics-tray-row--toggle">
            <span className="diagnostics-tray-row__label">Debug logging</span>
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
        </div>
      </section>

      <section className="diagnostics-section" aria-labelledby="diagnostics-workflow-audit-title">
        <h4 id="diagnostics-workflow-audit-title" className="diagnostics-section__title">
          Workflow capacity audit
        </h4>
        <p className="settings-field__hint">
          Read-only comparison of legacy workload scoring vs Pass 8 capacity load using the same
          Jira fetch path as Performance. Does not modify Jira.
        </p>
        <div className="settings-button-group">
          <Button
            type="button"
            variant="secondary"
            disabled={workflowAuditing}
            onClick={() => void runWorkflowAudit()}
            data-testid="diagnostics-workflow-capacity-audit"
          >
            {workflowAuditing ? "Running audit…" : "Run workflow capacity audit"}
          </Button>
        </div>
        {workflowAuditText ? (
          <textarea
            className="diagnostics-audit-output"
            readOnly
            rows={16}
            value={workflowAuditText}
            data-testid="diagnostics-workflow-audit-output"
            aria-label="Workflow capacity audit output"
          />
        ) : null}
      </section>

      <div className="settings-button-group diagnostics-actions">
        <Button
          type="button"
          variant="secondary"
          disabled={checking}
          onClick={() => void runChecks()}
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
