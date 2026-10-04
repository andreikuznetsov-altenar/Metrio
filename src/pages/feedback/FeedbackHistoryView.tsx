import type { Survey } from '../../domain/survey/types';
import { computeDeliveryCounts } from '../../domain/survey/deliveryMetrics';
import { surveyStatusLabel } from '../../domain/survey/status';
import { Badge, Section } from './design-system';
import { FeedbackHistoryEmptyPanel } from './FeedbackDisconnectedPanels';

export function FeedbackHistoryView({
  surveys,
  activeSurveyId,
  onSelectSurvey,
}: {
  surveys: Survey[];
  activeSurveyId: string | null;
  onSelectSurvey: (id: string) => void;
}) {
  if (surveys.length === 0) {
    return <FeedbackHistoryEmptyPanel />;
  }

  return (
    <Section title="History" variant="plain">
      <div className="ds-feedback-history feedback-surface-card">
        {surveys.map((survey) => {
          const counts = computeDeliveryCounts(survey.recipients);
          const active = survey.id === activeSurveyId;
          return (
            <button
              key={survey.id}
              type="button"
              className={`ds-feedback-history__row ${active ? 'is-active' : ''}`}
              onClick={() => onSelectSurvey(survey.id)}
            >
              <div className="ds-feedback-history__primary">
                <span className="ds-feedback-history__title">{survey.title}</span>
                <span className="ds-feedback-history__range">
                  {survey.dateFrom} – {survey.dateTo}
                </span>
              </div>
              <div className="ds-feedback-history__meta">
                <span>{counts.recipients} sent</span>
                <span>{counts.responded} responses</span>
                <span>{counts.responseRatePercent}% rate</span>
                {active && <Badge variant="accent">Active</Badge>}
                <Badge variant={survey.status === 'active' ? 'info' : 'neutral'}>
                  {surveyStatusLabel(survey.status)}
                </Badge>
              </div>
            </button>
          );
        })}
      </div>
    </Section>
  );
}
