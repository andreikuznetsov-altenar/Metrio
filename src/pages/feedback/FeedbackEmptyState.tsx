import type { LucideIcon } from 'lucide-react';
import { Button } from './design-system';

export interface FeedbackEmptyStateAction {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
}

export interface FeedbackEmptyStateProps {
  testId?: string;
  icon: LucideIcon;
  title: string;
  description: string;
  primary?: FeedbackEmptyStateAction;
  secondary?: FeedbackEmptyStateAction;
}

export function FeedbackEmptyState({
  testId,
  icon: Icon,
  title,
  description,
  primary,
  secondary,
}: FeedbackEmptyStateProps) {
  return (
    <div className="feedback-empty-state" data-testid={testId}>
      <div className="feedback-empty-state__card">
        <Icon className="feedback-empty-state__icon" size={28} strokeWidth={1.5} aria-hidden />
        <div className="feedback-empty-state__text">
          <h3 className="feedback-empty-state__title">{title}</h3>
          <p className="feedback-empty-state__description">{description}</p>
        </div>
        {primary || secondary ? (
          <div className="feedback-empty-state__actions">
            {primary ? (
              <Button
                type="button"
                variant={primary.variant ?? 'primary'}
                disabled={primary.disabled}
                onClick={primary.onClick}
              >
                {primary.label}
              </Button>
            ) : null}
            {secondary ? (
              <Button
                type="button"
                variant={secondary.variant ?? 'secondary'}
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
