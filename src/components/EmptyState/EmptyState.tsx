import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "../Button/Button";
import type { ButtonVariant } from "../Button/Button";
import "./EmptyState.css";

export interface EmptyStateAction {
  label: string;
  onClick: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
}

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: ReactNode;
  primary?: EmptyStateAction;
  secondary?: EmptyStateAction;
  testId?: string;
  compact?: boolean;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  primary,
  secondary,
  testId,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={compact ? "empty-state empty-state--compact" : "empty-state"}
      data-testid={testId}
      role="status"
    >
      <div className="empty-state__card">
        {Icon ? <Icon className="empty-state__icon" size={24} strokeWidth={1.6} aria-hidden /> : null}
        <h3 className="empty-state__title">{title}</h3>
        {description ? <p className="empty-state__description">{description}</p> : null}
        {primary || secondary ? (
          <div className="button-group empty-state__actions">
            {primary ? (
              <Button
                type="button"
                variant={primary.variant ?? "primary"}
                disabled={primary.disabled}
                onClick={primary.onClick}
              >
                {primary.label}
              </Button>
            ) : null}
            {secondary ? (
              <Button
                type="button"
                variant={secondary.variant ?? "secondary"}
                disabled={secondary.disabled}
                onClick={secondary.onClick}
              >
                {secondary.label}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
