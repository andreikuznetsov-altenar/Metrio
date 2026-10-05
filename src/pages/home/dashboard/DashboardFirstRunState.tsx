import { Button } from "../../../components/Button/Button";

export function DashboardFirstRunState({
  onOpenPerformance,
}: {
  onOpenPerformance: () => void;
}) {
  return (
    <div className="home-page" data-testid="dashboard-first-run">
      <section className="home-empty-state home-empty-state--centered" role="status">
        <h2 className="home-empty-state__title">No performance data yet</h2>
        <p className="home-empty-state__body">
          Open Performance to run your first Jira sync. After a successful snapshot, this
          dashboard will show KPIs, trends, and focus items for your role.
        </p>
        <div className="home-empty-state__actions">
          <Button type="button" variant="primary" onClick={onOpenPerformance}>
            Open Performance
          </Button>
        </div>
      </section>
    </div>
  );
}
