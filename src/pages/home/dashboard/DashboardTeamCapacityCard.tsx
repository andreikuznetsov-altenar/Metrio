import { Badge } from "../../../components/Badge/Badge";
import { Button } from "../../../components/Button/Button";
import { PersonAvatar } from "../../../components/PersonAvatar/PersonAvatar";
import type { ManagerAvailabilityRow } from "../../../domain/availability/teamAvailabilityContext";
import type { TeamPerformanceSnapshot } from "../../../domain/performance";
import { workloadBadgeVariantFromLabel } from "../../../domain/performance/performanceStatusBadges";

function countOverloaded(snapshot: TeamPerformanceSnapshot | null): number {
  if (!snapshot) return 0;
  return snapshot.workload.filter((row) => /high|overload/i.test(row.workload))
    .length;
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
  const overloaded = countOverloaded(teamSnapshot);
  const available =
    teamSnapshot?.summary.find((m) => /available/i.test(m.label))?.value ??
    String(teamSnapshot?.directReportIds.length ?? "—");

  return (
    <section
      className="executive-panel"
      aria-label="Team capacity"
      data-testid="dashboard-team-capacity"
    >
      <h2 className="executive-panel__title">Team capacity</h2>
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
            return (
              <div key={row.personId} className="executive-team-capacity__row">
                <PersonAvatar personId={row.personId} displayName={row.personName} size="sm" />
                <span>{row.personName}</span>
                {workload ? (
                  <Badge variant={workloadBadgeVariantFromLabel(workload.workload)}>
                    {workload.workload}
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
