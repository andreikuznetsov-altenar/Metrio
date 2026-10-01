import type { Survey } from '../../domain/survey/types';
import { computeDeliveryCounts } from '../../domain/survey/deliveryMetrics';
import { surveyStatusLabel } from '../../domain/survey/status';
import { Section, Status } from './design-system';

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
    return (
      <Section title="History">
        <p className="ds-feedback-empty-inline">No feedback surveys yet.</p>
        <p className="ds-feedback-connect__hint">Prepare your first survey to get started.</p>
      </Section>
    );
  }

  return (
    <Section title="History" subtitle="Select a survey to view delivery and results">
      <div className="ds-feedback-history">
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
                <span>{survey.dateFrom} – {survey.dateTo}</span>
                <span className="ds-feedback-history__title">{survey.title}</span>
              </div>
              <div className="ds-feedback-history__meta">
                <span>{counts.recipients} recipients</span>
                <span>{counts.responded} responses</span>
                <span>{counts.responseRatePercent}% rate</span>
                <Status tone={survey.status === 'active' ? 'blue' : 'grey'}>
                  {surveyStatusLabel(survey.status)}
                </Status>
              </div>
            </button>
          );
        })}
      </div>
    </Section>
  );
}
