import type { ReactNode } from "react";
import { Badge } from "../Badge/Badge";
import type { BadgeVariant } from "../Badge/Badge";
import { Button } from "../Button/Button";
import "./DashboardCompactRow.css";

export interface DashboardCompactRowProps {
  subject: ReactNode;
  secondary?: ReactNode;
  badge?: { label: string; variant?: BadgeVariant };
  actionLabel: string;
  onAction: () => void;
  subjectAction?: () => void;
  avatar?: ReactNode;
  className?: string;
}

export function DashboardCompactRow({
  subject,
  secondary,
  badge,
  actionLabel,
  onAction,
  subjectAction,
  avatar,
  className,
}: DashboardCompactRowProps) {
  const subjectClass = subjectAction
    ? "dashboard-compact-row__subject dashboard-compact-row__subject--link"
    : "dashboard-compact-row__subject";

  return (
    <div className={["dashboard-compact-row", className].filter(Boolean).join(" ")}>
      {avatar ? <div className="dashboard-compact-row__avatar">{avatar}</div> : null}
      <div className="dashboard-compact-row__body">
        {subjectAction ? (
          <button type="button" className={subjectClass} onClick={subjectAction}>
            {subject}
          </button>
        ) : (
          <div className={subjectClass}>{subject}</div>
        )}
        {secondary ? <p className="dashboard-compact-row__secondary">{secondary}</p> : null}
      </div>
      {badge ? (
        <Badge variant={badge.variant ?? "neutral"} className="dashboard-compact-row__badge">
          {badge.label}
        </Badge>
      ) : (
        <span className="dashboard-compact-row__badge-spacer" aria-hidden />
      )}
      <Button
        type="button"
        variant="secondary"
        className="dashboard-compact-row__action"
        onClick={onAction}
      >
        {actionLabel}
      </Button>
    </div>
  );
}
