import { Button } from "../../../components/Button/Button";
import type { DashboardSyncStatus } from "../../../domain/home/dashboardSyncStatus";
import { formatRelativeSync } from "../../../platform/observability/connectionDiagnostics";

export interface DashboardExecutiveHeaderProps {
  greeting: string;
  activeJiraCount: number;
  newAssignmentCount: number;
  lastUpdatedAt: string | null;
  dashboardSyncStatus: DashboardSyncStatus | null;
  refreshing: boolean;
  onRefresh: () => void;
  scopeLabel?: string;
}

export function DashboardExecutiveHeader({
  greeting,
  activeJiraCount,
  newAssignmentCount,
  lastUpdatedAt,
  dashboardSyncStatus,
  refreshing,
  onRefresh,
  scopeLabel,
}: DashboardExecutiveHeaderProps) {
  return (
    <header className="executive-header" data-testid="dashboard-executive-header">
      <div className="executive-header__main">
        <p className="executive-header__scope">{scopeLabel ?? "Employee"} scope</p>
        <h1 className="executive-header__title">{greeting}</h1>
        <div className="executive-header__meta">
          <span className="executive-header__chip">
            {activeJiraCount} active Jira work
          </span>
          <span className="executive-header__chip">
            {newAssignmentCount} new assignment{newAssignmentCount === 1 ? "" : "s"}
          </span>
          {lastUpdatedAt ? (
            <span className="executive-header__chip">
              Updated {formatRelativeSync(lastUpdatedAt)}
            </span>
          ) : null}
        </div>
        {dashboardSyncStatus ? (
          <p className="executive-header__sync" data-testid="dashboard-sync-status">
            {dashboardSyncStatus.line}
            {dashboardSyncStatus.showRetry ? (
              <>
                {" "}
                <button
                  type="button"
                  className="executive-header__sync-action"
                  onClick={() => onRefresh()}
                >
                  Retry
                </button>
              </>
            ) : null}
            {dashboardSyncStatus.showDiagnostics ? (
              <>
                {" "}
                <button
                  type="button"
                  className="executive-header__sync-action"
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent("metrio-open-diagnostics"));
                  }}
                >
                  Diagnostics
                </button>
              </>
            ) : null}
          </p>
        ) : null}
      </div>
      <div className="executive-header__actions">
        <Button
          type="button"
          variant="secondary"
          className="executive-header__refresh-btn"
          data-testid="dashboard-refresh-button"
          disabled={refreshing}
          loading={refreshing}
          onClick={() => onRefresh()}
        >
          {refreshing ? "Refreshing..." : "Refresh"}
        </Button>
      </div>
    </header>
  );
}
