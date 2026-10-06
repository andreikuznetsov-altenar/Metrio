import { Badge } from "../../components/Badge/Badge";
import { SectionTitle } from "../../components/SectionTitle/SectionTitle";
import type { TeamPerformanceSnapshot } from "../../domain/performance";
import type { DeliveryRiskRow } from "../../domain/performance";
import {
  buildManagerAvailabilityRows,
  buildTeamCapacityCounts,
  detectTeamLeaveOverlaps,
} from "../../domain/availability/teamAvailabilityContext";
import { PersonAvatar } from "../../components/PersonAvatar/PersonAvatar";

export interface TeamUpcomingAvailabilitySectionProps {
  snapshot: TeamPerformanceSnapshot;
  deliveryRisk: DeliveryRiskRow[];
  onOpenPerson: (personId: string) => void;
}

export function TeamUpcomingAvailabilitySection({
  snapshot,
  deliveryRisk,
  onOpenPerson,
}: TeamUpcomingAvailabilitySectionProps) {
  const rows = buildManagerAvailabilityRows(snapshot, deliveryRisk);
  const overlaps = detectTeamLeaveOverlaps(snapshot);
  const capacity = buildTeamCapacityCounts(snapshot, deliveryRisk);

  if (rows.length === 0 && overlaps.length === 0) {
    return null;
  }

  return (
    <section
      id="performance-section-upcoming-availability"
      aria-label="Upcoming availability"
      className="performance-section"
    >
      <SectionTitle title="Upcoming availability" />
      <p className="performance-capacity-context" data-testid="team-capacity-context">
        {capacity.peopleAvailable} available · {capacity.peopleAwaySoon} away soon ·{" "}
        {capacity.activeWork} active work · {capacity.reviewWork} in review
      </p>

      {overlaps.length > 0 ? (
        <div className="performance-leave-overlap" data-testid="team-leave-overlap">
          {overlaps.map((overlap) => (
            <p key={overlap.personIds.join("-")}>
              <Badge variant="neutral">Reduced availability</Badge>
              {overlap.personCount} team members away · {overlap.rangeLabel}
            </p>
          ))}
        </div>
      ) : null}

      {rows.length === 0 ? (
        <p className="performance-inline-empty">No leave in the next three weeks.</p>
      ) : (
        <ul className="performance-availability-list">
          {rows.map((row) => (
            <li key={row.personId}>
              <button
                type="button"
                className="performance-availability-row"
                data-severity={row.severity}
                onClick={() => onOpenPerson(row.personId)}
              >
                <PersonAvatar
                  personId={row.personId}
                  displayName={row.personName}
                  size="sm"
                />
                <div className="performance-availability-row__body">
                  <span className="performance-availability-row__name">{row.personName}</span>
                  <span className="performance-availability-row__meta">
                    {row.absenceType}{" "}
                    {row.daysUntil === 0
                      ? "today"
                      : row.daysUntil === 1
                        ? "tomorrow"
                        : `in ${row.daysUntil} days`}{" "}
                    · {row.rangeLabel}
                  </span>
                  <span className="performance-availability-row__work">
                    {row.activeCount} active
                    {row.inReviewCount > 0 ? ` · ${row.inReviewCount} in review` : ""}
                  </span>
                </div>
                {row.severity === "warning" ? (
                  <Badge variant="warning">Work context</Badge>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
