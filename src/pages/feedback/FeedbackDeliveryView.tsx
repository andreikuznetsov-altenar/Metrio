import type { SurveyDeliveryCounts } from '../../domain/survey/deliveryMetrics';
import { Button, Section, Status } from './design-system';

export function FeedbackDeliveryView({
  counts,
  reminderCount,
  onReviewRecipients,
  onRefreshResponses,
  onSendReminder,
}: {
  counts: SurveyDeliveryCounts;
  reminderCount: number;
  onReviewRecipients: () => void;
  onRefreshResponses: () => void;
  onSendReminder: () => void;
}) {
  return (
    <Section title="Delivery" subtitle="Track survey delivery and responses">
      <div className="ds-feedback-delivery-stats">
        <div className="ds-feedback-stat">
          <span className="ds-feedback-stat__label">Selected</span>
          <span className="ds-feedback-stat__value">{counts.selected}</span>
        </div>
        <div className="ds-feedback-stat">
          <span className="ds-feedback-stat__label">Delivered</span>
          <span className="ds-feedback-stat__value">{counts.delivered}</span>
        </div>
        <div className="ds-feedback-stat">
          <span className="ds-feedback-stat__label">Responded</span>
          <span className="ds-feedback-stat__value">{counts.responded}</span>
        </div>
        <div className="ds-feedback-stat">
          <span className="ds-feedback-stat__label">Waiting</span>
          <span className="ds-feedback-stat__value">{counts.waiting}</span>
        </div>
        <div className="ds-feedback-stat">
          <span className="ds-feedback-stat__label">Failed</span>
          <span className="ds-feedback-stat__value">{counts.failed}</span>
        </div>
        <div className="ds-feedback-stat">
          <span className="ds-feedback-stat__label">Response rate</span>
          <Status tone="blue">{counts.responseRatePercent}%</Status>
        </div>
      </div>
      <div className="ds-feedback-section-footer">
        <Button variant="secondary" size="small" onClick={onReviewRecipients}>Review recipients</Button>
        <Button variant="secondary" size="small" onClick={onRefreshResponses}>Refresh responses</Button>
        <Button variant="secondary" size="small" disabled={reminderCount === 0} onClick={onSendReminder}>
          Send reminder to {reminderCount}
        </Button>
      </div>
    </Section>
  );
}
