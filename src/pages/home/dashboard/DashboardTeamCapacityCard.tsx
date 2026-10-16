import { Badge } from "../../../components/Badge/Badge";
import { Button } from "../../../components/Button/Button";
import { PersonAvatar } from "../../../components/PersonAvatar/PersonAvatar";
import type { ManagerAvailabilityRow } from "../../../domain/availability/teamAvailabilityContext";
import type { TeamPerformanceSnapshot, WorkloadRow } from "../../../domain/performance";
import { workloadBadgeVariantFromLabel } from "../../../domain/performance/performanceStatusBadges";

/** Current workload label (same source as the People table); historical capacity is not used. */
function capacityLabel(row: WorkloadRow): string {
  return row.workload;
}

function countOverloadedCapacity(snapshot: TeamPerformanceSnapshot | null): number {
  if (!snapshot) return 0;
  return snapshot.workload.filter((row) => capacityLabel(row) === "Overloaded").length;
}

export function DashboardTeamCapacityCard({
  teamSnapshot,
  awayNextWeek,
  availabilityPreview,
  onOpenTeamOverview,
}: {
  teamSnapshot: TeamPerformanceSnapshot | null;
  awayNextWeek: number;
  availabilityPreview: ManagerAvailabilityRow[];
  onOpenTeamOverview: () => void;
}) {
  const overloaded = countOverloadedCapacity(teamSnapshot);
  const available =
    teamSnapshot?.summary.find((m) => /available/i.test(m.label))?.value ??
    String(teamSnapshot?.directReportIds.length ?? "—");

  return (
    <section
      className="executive-panel"
      aria-label="Team availability and workload"
      data-testid="dashboard-team-capacity"
    >
      <h2 className="executive-panel__title">Availability &amp; workload</h2>
      <div className="executive-team-capacity__summary">
        <Badge variant="success">Available {available}</Badge>
        <Badge variant="neutral">Leave {awayNextWeek}</Badge>
        <Badge variant={overloaded > 0 ? "warning" : "neutral"}>
          Overloaded {overloaded}
        </Badge>
      </div>
      {availabilityPreview.length > 0 ? (
        <div className="executive-team-capacity__rows">
          {availabilityPreview.map((row) => {
            const workload = teamSnapshot?.workload.find(
              (w) => w.personId === row.personId,
            );
            const label = workload ? capacityLabel(workload) : null;
            return (
              <div key={row.personId} className="executive-team-capacity__row">
                <PersonAvatar personId={row.personId} displayName={row.personName} size="sm" />
                <span>{row.personName}</span>
                {label ? (
                  <Badge variant={workloadBadgeVariantFromLabel(label)}>
                    {label}
                  </Badge>
                ) : null}
                <span className="executive-queue-table__context">{row.rangeLabel}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="executive-secondary-line" role="status">
          No upcoming leave in the next week.
        </p>
      )}
      <div className="home-card__actions">
        <Button type="button" variant="secondary" onClick={onOpenTeamOverview}>
          View team overview
        </Button>
      </div>
    </section>
  );
}
