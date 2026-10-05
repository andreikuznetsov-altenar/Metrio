import { Badge } from "../../components/Badge/Badge";
import { PersonAvatar } from "../../components/PersonAvatar/PersonAvatar";
import type { Person } from "../../domain/people/types";
import { personAvailabilityBadgeLabel } from "../../domain/availability/personAvailabilityCopy";
import {
  availabilityTagVariant,
  formatWorkloadLabel,
} from "../../domain/people/personDisplay";
import { workloadBadgeVariantFromLabel } from "../../domain/performance/performanceStatusBadges";

export interface PersonIdentityHeaderProps {
  personId: string;
  displayName: string;
  jobTitle: string;
  person?: Person | null;
  /** Fallback when person record is unavailable. */
  availabilityLabel?: string;
  workloadLabel?: string;
  contextNote?: string;
  className?: string;
}

export function PersonIdentityHeader({
  personId,
  displayName,
  jobTitle,
  person,
  availabilityLabel,
  workloadLabel,
  contextNote,
  className,
}: PersonIdentityHeaderProps) {
  const availabilityBadge =
    person != null
      ? personAvailabilityBadgeLabel(person.availability)
      : availabilityLabel ?? "—";
  const availabilityVariant =
    person != null
      ? availabilityTagVariant(person.availability.state)
      : "neutral";
  const workloadBadge =
    person != null
      ? formatWorkloadLabel(person.workload?.level, {
          workload: person.workload,
          availability: person.availability,
        })
      : workloadLabel ?? "—";
  const workloadVariant =
    person != null ? workloadBadgeVariantFromLabel(workloadBadge) : "neutral";

  return (
    <div
      className={[ "person-identity-header", className ].filter(Boolean).join(" ")}
    >
      <PersonAvatar
        person={person}
        personId={personId}
        displayName={displayName}
        size="lg"
      />
      <div className="person-identity-header__text">
        <div className="person-identity-header__name">{displayName}</div>
        <div className="person-identity-header__role">{jobTitle}</div>
        <div className="person-identity-header__badges">
          <Badge
            variant={availabilityVariant}
            data-testid="person-availability-badge"
          >
            {availabilityBadge}
          </Badge>
          <Badge variant={workloadVariant} data-testid="person-workload-badge">
            {workloadBadge}
          </Badge>
        </div>
        {contextNote ? (
          <p className="person-identity-header__context">{contextNote}</p>
        ) : null}
      </div>
    </div>
  );
}
