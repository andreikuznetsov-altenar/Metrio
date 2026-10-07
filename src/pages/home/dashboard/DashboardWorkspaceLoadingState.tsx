import { WorkspaceContentLoadingState } from "../../../components/WorkspaceContentLoading/WorkspaceContentLoadingState";

export function DashboardWorkspaceLoadingState() {
  return (
    <div className="home-page" data-testid="home-loading">
      <WorkspaceContentLoadingState
        title="Loading your workspace…"
        body="Syncing performance data for your dashboard."
        testId="dashboard-workspace-loading"
      />
    </div>
  );
}
