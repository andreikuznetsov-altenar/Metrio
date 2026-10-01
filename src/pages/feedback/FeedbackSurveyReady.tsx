import type { Survey } from '../../domain/survey/types';
import type { SurveyDeliveryCounts } from '../../domain/survey/deliveryMetrics';
import { Button, Icon, Section, Status } from './design-system';
import { openExternalUrl } from '../../platform/openExternal';

export function FeedbackSurveyReady({
  survey,
  counts,
  selectedSendCount,
  formDetailsOpen,
  onToggleFormDetails,
  onReviewRecipients,
  onSendTest,
  onSendSurvey,
  onRegenerate,
}: {
  survey: Survey;
  counts: SurveyDeliveryCounts;
  selectedSendCount: number;
  formDetailsOpen: boolean;
  onToggleFormDetails: () => void;
  onReviewRecipients: () => void;
  onSendTest: () => void;
  onSendSurvey: () => void;
  onRegenerate: () => void;
}) {
  const published = !!survey.responderUri;

  return (
    <Section title="Survey ready">
      <div className="ds-feedback-ready__status">
        <Status tone="green">Ready</Status>
        <Status tone="blue">{counts.recipients} recipients</Status>
        <Status tone="green">{counts.ready} ready</Status>
        {counts.missingEmail > 0 && (
          <Status tone="orange">{counts.missingEmail} missing email</Status>
        )}
      </div>
      <div className="ds-feedback-ready__actions">
        <Button variant="secondary" size="small" onClick={onReviewRecipients}>Review recipients</Button>
        <Button variant="secondary" size="small" disabled={!survey.responderUri} onClick={onSendTest}>
          Send test to me
        </Button>
        <Button disabled={!survey.responderUri || selectedSendCount === 0} onClick={onSendSurvey}>
          Send survey
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
          <Status tone={published ? 'green' : 'orange'}>{published ? 'Published' : 'Pending'}</Status>
          {formDetailsOpen ? <Icon name="up" size={16} /> : <Icon name="down" size={16} />}
        </button>
        {formDetailsOpen && (
          <div className="ds-feedback-disclosure__panel">
            {survey.googleFormId && (
              <p className="ds-feedback-disclosure__meta">Form ID: {survey.googleFormId}</p>
            )}
            <p className="ds-feedback-disclosure__meta">
              Responder access follows your Google settings.
            </p>
            <div className="ds-feedback-disclosure__actions">
              {survey.responderUri && (
                <Button variant="secondary" size="small" onClick={() => openExternalUrl(survey.responderUri!)}>
                  <Icon name="arrow-right" size={16} />
                  Open Google Form
                </Button>
              )}
              <Button variant="secondary" size="small" onClick={onRegenerate}>Regenerate form</Button>
            </div>
          </div>
        )}
      </div>
    </Section>
  );
}
