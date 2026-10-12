import { PersonAvatar, type PersonAvatarSize } from "../PersonAvatar/PersonAvatar";
import type { Person } from "../../domain/people/types";
import "./PersonIdentity.css";

export interface PersonIdentityProps {
  person?: Person | null;
  personId?: string;
  bambooEmployeeId?: string;
  displayName: string;
  role?: string | null;
  secondary?: string | null;
  avatarSize?: PersonAvatarSize;
  className?: string;
}

export function PersonIdentity({
  person,
  personId,
  bambooEmployeeId,
  displayName,
  role,
  secondary,
  avatarSize = "sm",
  className,
}: PersonIdentityProps) {
  return (
    <span className={["person-identity", className].filter(Boolean).join(" ")}>
      <PersonAvatar
        person={person}
        personId={personId}
        bambooEmployeeId={bambooEmployeeId}
        displayName={displayName}
        size={avatarSize}
      />
      <span className="person-identity__text">
        <span className="person-identity__name">{displayName}</span>
        {role ? <span className="person-identity__role">{role}</span> : null}
        {secondary ? (
          <span className="person-identity__secondary">{secondary}</span>
        ) : null}
      </span>
    </span>
  );
}
