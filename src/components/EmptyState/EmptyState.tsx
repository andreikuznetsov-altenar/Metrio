import type { ReactNode } from "react";
import "./empty-state.css";

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  actions?: ReactNode;
  role?: "status" | "alert";
  className?: string;
  compact?: boolean;
  testId?: string;
}

/** Canonical centered empty state: icon → title (8px) → description. */
export function EmptyState({
  icon,
  title,
  description,
  actions,
  role = "status",
  className,
  compact = false,
  testId,
}: EmptyStateProps) {
  return (
    <div
      className={[
        "metrio-empty-state",
        compact ? "metrio-empty-state--compact" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      role={role}
      data-testid={testId}
    >
      {icon ? <div className="metrio-empty-state__icon">{icon}</div> : null}
      <div className="metrio-empty-state__text">
        <p className="metrio-empty-state__title">{title}</p>
        {description ? (
          <p className="metrio-empty-state__description">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="metrio-empty-state__actions">{actions}</div> : null}
    </div>
  );
}
