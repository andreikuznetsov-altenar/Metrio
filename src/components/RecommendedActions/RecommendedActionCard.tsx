import { Button } from "../Button/Button";
import "./RecommendedActionCard.css";

export interface RecommendedActionCardProps {
  id: string;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}

/**
 * One actionable recommendation: title + muted description on the left, one secondary CTA on the
 * right. The CTA is the only interactive element (the row itself is not a click target).
 */
export function RecommendedActionCard({ id, title, description, actionLabel, onAction }: RecommendedActionCardProps) {
  return (
    <li className="recommended-action" data-testid={`recommended-action-${id}`}>
      <div className="recommended-action__text">
        <p className="recommended-action__title">{title}</p>
        <p className="recommended-action__description">{description}</p>
      </div>
      <Button
        type="button"
        variant="secondary"
        className="recommended-action__cta"
        aria-label={`${actionLabel}: ${title}`}
        data-testid={`recommended-action-cta-${id}`}
        onClick={onAction}
      >
        {actionLabel}
      </Button>
    </li>
  );
}
