import type { SurveyDeliveryCounts } from '../../domain/survey/deliveryMetrics';
import type { SurveyRecipient } from '../../domain/survey/types';
import { Badge, Button, Section } from './design-system';
import {
  recipientStatusBadgeVariant,
  recipientStatusDisplay,
} from './feedbackUi';

export function FeedbackDeliveryView({
  recipients,
  counts,
  reminderCount,
  failedCount,
  selectedSendCount,
  sendDisabled,
  onReviewRecipients,
  onSendReminder,
  onSendSurveys,
}: {
  recipients: SurveyRecipient[];
  counts: SurveyDeliveryCounts;
  reminderCount: number;
  failedCount: number;
  selectedSendCount: number;
  sendDisabled?: boolean;
  onReviewRecipients: () => void;
  onSendReminder: () => void;
  onSendSurveys: () => void;
}) {
  const sentCount = recipients.filter((r) => r.status === 'sent').length;

  return (
    <Section title="Delivery" subtitle="Send surveys and track delivery" variant="plain">
      <div className="ds-feedback-delivery-stats">
        <div className="ds-feedback-stat">
          <span className="ds-feedback-stat__label">Recipients</span>
          <span className="ds-feedback-stat__value">{counts.recipients}</span>
        </div>
        <div className="ds-feedback-stat">
          <span className="ds-feedback-stat__label">Ready</span>
          <span className="ds-feedback-stat__value">{counts.ready}</span>
        </div>
        <div className="ds-feedback-stat">
          <span className="ds-feedback-stat__label">Missing email</span>
          <span className="ds-feedback-stat__value">{counts.missingEmail}</span>
        </div>
        <div className="ds-feedback-stat">
          <span className="ds-feedback-stat__label">Sent</span>
          <span className="ds-feedback-stat__value">{sentCount}</span>
        </div>
        <div className="ds-feedback-stat">
          <span className="ds-feedback-stat__label">Responded</span>
          <span className="ds-feedback-stat__value">{counts.responded}</span>
        </div>
      </div>

      <div className="ds-feedback-section-footer">
        <Button variant="secondary" size="small" onClick={onReviewRecipients}>
          Review recipients
        </Button>
        <Button variant="secondary" size="small" disabled={reminderCount === 0} onClick={onSendReminder}>
          Send reminders ({reminderCount})
        </Button>
        <Button size="small" disabled={sendDisabled} onClick={onSendSurveys}>
          Send surveys ({selectedSendCount})
        </Button>
        {failedCount > 0 && (
          <Button variant="secondary" size="small" disabled={sendDisabled} onClick={onSendSurveys}>
            Retry failed ({failedCount})
          </Button>
        )}
      </div>

      <div className="ds-feedback-recipients-table-wrap">
        <table className="ds-feedback-recipients-table ds-feedback-delivery-table">
          <thead>
            <tr>
              <th>Recipient</th>
              <th>Tasks</th>
              <th>Email</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {recipients.map((r) => (
              <tr key={r.id}>
                <td className="ds-feedback-delivery-table__name">{r.reporterName}</td>
                <td>{r.issueKeys.length}</td>
                <td className="ds-feedback-delivery-table__email" title={r.reporterEmail}>
                  {r.reporterEmail || '—'}
                </td>
                <td className="ds-feedback-delivery-table__status">
                  <Badge variant={recipientStatusBadgeVariant(r.status)}>
                    {recipientStatusDisplay(r.status)}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}
