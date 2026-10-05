import { Button } from "../../../components/Button/Button";
import type { DashboardSyncStatus } from "../../../domain/home/dashboardSyncStatus";

export function DashboardSyncBanner({
  syncStatus,
  onRetry,
  onDiagnostics,
}: {
  syncStatus: DashboardSyncStatus;
  onRetry: () => void;
  onDiagnostics?: () => void;
}) {
  return (
    <div
      className="executive-dashboard__span-12 executive-sync-banner"
      role="status"
      data-testid="dashboard-sync-banner"
    >
      <p className="executive-sync-banner__line">{syncStatus.line}</p>
      <div className="executive-sync-banner__actions">
        {syncStatus.showRetry ? (
          <Button type="button" variant="secondary" onClick={onRetry}>
            Retry
          </Button>
        ) : null}
        {syncStatus.showDiagnostics && onDiagnostics ? (
          <Button type="button" variant="secondary" onClick={onDiagnostics}>
            Diagnostics
          </Button>
        ) : null}
      </div>
    </div>
  );
}
