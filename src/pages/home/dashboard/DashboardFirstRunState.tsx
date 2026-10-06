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
        <div className="home-empty-state__actions">
          <Button type="button" variant="primary" onClick={onOpenPerformance}>
            Open Performance
          </Button>
        </div>
      </section>
    </div>
  );
}
