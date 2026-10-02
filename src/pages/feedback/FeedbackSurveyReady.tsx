import type { Survey } from '../../domain/survey/types';
import type { SurveyDeliveryCounts } from '../../domain/survey/deliveryMetrics';
import { Badge, Button, Section } from './design-system';
import { ChevronDown, ChevronUp, Copy, ExternalLink } from 'lucide-react';
import { openExternalUrl } from '../../platform/openExternal';

export function FeedbackSurveyReady({
  survey,
  counts,
  formDetailsOpen,
  onToggleFormDetails,
  onReviewRecipients,
  onSendTest,
  onRegenerate,
}: {
  survey: Survey;
  counts: SurveyDeliveryCounts;
  formDetailsOpen: boolean;
  onToggleFormDetails: () => void;
  onReviewRecipients: () => void;
  onSendTest: () => void;
  onRegenerate: () => void;
}) {
  const published = !!survey.responderUri;
  const preview = survey.recipients.slice(0, 2);
  const remaining = Math.max(0, survey.recipients.length - preview.length);
  const jiraTasks = survey.recipients.reduce((sum, r) => sum + r.issueKeys.length, 0);
  const projects = new Set(survey.recipients.flatMap((r) => r.projects)).size;

  const copyResponderLink = async () => {
    if (!survey.responderUri) return;
    try {
      await navigator.clipboard.writeText(survey.responderUri);
    } catch {
      /* clipboard unavailable in test env */
    }
  };

  return (
    <Section title="Survey ready" variant="plain">
      <div className="ds-feedback-ready__status">
        <Badge variant="success">Survey ready</Badge>
        <span className="ds-feedback-ready__stat">{counts.recipients} recipients</span>
        <span className="ds-feedback-ready__stat">{jiraTasks} Jira tasks</span>
        {projects > 0 && <span className="ds-feedback-ready__stat">{projects} projects</span>}
        {counts.missingEmail > 0 && (
          <Badge variant="warning">{counts.missingEmail} missing email</Badge>
        )}
      </div>

      {preview.length > 0 && (
        <ul className="ds-feedback-recipient-preview">
          {preview.map((r) => (
            <li key={r.id}>
              <span className="ds-feedback-recipient-preview__name">{r.reporterName}</span>
              <span className="ds-feedback-recipient-preview__meta">{r.issueKeys.length} tasks</span>
            </li>
          ))}
          {remaining > 0 && (
            <li className="ds-feedback-recipient-preview__more">+{remaining} more</li>
          )}
        </ul>
      )}

      <div className="ds-feedback-ready__actions">
        <Button variant="secondary" size="small" onClick={onReviewRecipients}>
          Review recipients
        </Button>
        <Button variant="secondary" size="small" disabled={!survey.responderUri} onClick={onSendTest}>
          Send test email
        </Button>
      </div>

      <div className="ds-feedback-disclosure">
        <button
          type="button"
          className="ds-feedback-disclosure__trigger"
          aria-expanded={formDetailsOpen}
          onClick={onToggleFormDetails}
        >
          <span>Google Form</span>
          <Badge variant={published ? 'success' : 'warning'}>{published ? 'Published' : 'Pending'}</Badge>
          {formDetailsOpen ? <ChevronUp size={16} aria-hidden /> : <ChevronDown size={16} aria-hidden />}
        </button>
        {formDetailsOpen && (
          <div className="ds-feedback-disclosure__panel">
            <p className="ds-feedback-disclosure__meta">
              Responder access follows your Google settings.
            </p>
            <div className="ds-feedback-disclosure__actions">
              {survey.responderUri && (
                <>
                  <Button variant="secondary" size="small" onClick={() => openExternalUrl(survey.responderUri!)}>
                    <ExternalLink size={14} aria-hidden className="feedback-btn-icon" />
                    Open Form
                  </Button>
                  <Button variant="secondary" size="small" onClick={() => void copyResponderLink()}>
                    <Copy size={14} aria-hidden className="feedback-btn-icon" />
                    Copy responder link
                  </Button>
                </>
              )}
              <Button variant="secondary" size="small" onClick={onRegenerate}>
                Regenerate Google Form
              </Button>
            </div>
            <p className="ds-feedback-disclosure__hint">
              Regenerating creates a new Form for this survey.
            </p>
          </div>
        )}
      </div>
    </Section>
  );
}
