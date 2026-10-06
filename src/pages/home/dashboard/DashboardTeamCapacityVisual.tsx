import { Badge } from "../../../components/Badge/Badge";
import type { WorkloadRow } from "../../../domain/performance";
import { capacityDistribution } from "../../../domain/home/executiveDashboardModel";
import { workloadBadgeVariantFromLabel } from "../../../domain/performance/performanceStatusBadges";

export function DashboardTeamCapacityVisual({
  workload,
}: {
  workload: WorkloadRow[];
}) {
  if (!workload.length) return null;
  const buckets = capacityDistribution(workload);
  const max = Math.max(1, ...buckets.map((b) => b.count));

  return (
    <section
      className="executive-panel executive-dashboard__span-6 executive-panel--metric"
      aria-label="Team capacity distribution"
      data-testid="dashboard-team-capacity-visual"
    >
      <h2 className="executive-panel__title">Capacity distribution</h2>
      <div className="executive-capacity-visual metrio-bar-chart">
        {buckets.map((bucket) => (
          <div key={bucket.label} className="metrio-bar-row">
            <span className="metrio-bar-row__label">
              <Badge variant={workloadBadgeVariantFromLabel(bucket.label)}>
                {bucket.label}
              </Badge>
            </span>
            <div className="metrio-bar-row__track" aria-hidden>
              <span
                className="metrio-bar-row__fill"
                style={{ width: `${Math.round((bucket.count / max) * 100)}%` }}
              />
            </div>
            <span className="metrio-bar-row__value">{bucket.count}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
