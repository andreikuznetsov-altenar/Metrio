import type { ReactNode } from "react";
import { Badge } from "../../components/Badge/Badge";
import { PersonAvatar } from "../../components/PersonAvatar/PersonAvatar";
import type { Person } from "../../domain/people/types";
import { personAvailabilityBadgeLabel } from "../../domain/availability/personAvailabilityCopy";
import {
  availabilityTagVariant,
  formatWorkloadLabel,
  workloadTagVariant,
} from "../../domain/people/personDisplay";

export interface PersonIdentityHeaderProps {
  personId: string;
  displayName: string;
  jobTitle: string;
  person?: Person | null;
  /** Fallback when person record is unavailable. */
  availabilityLabel?: string;
  workloadLabel?: string;
  action?: ReactNode;
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
  action,
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
      ? formatWorkloadLabel(person.workload?.level)
      : workloadLabel ?? "—";
  const workloadVariant =
    person != null ? workloadTagVariant(person.workload?.level) : "neutral";

  return (
    <div
      className={[ "person-identity-header", className ].filter(Boolean).join(" ")}
    >
      <PersonAvatar employeeId={personId} displayName={displayName} size="md" />
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
      {action ? <div className="person-identity-header__action">{action}</div> : null}
    </div>
  );
}
