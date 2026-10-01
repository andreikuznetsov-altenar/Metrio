import type { SurveyMetricsSummary } from '../../domain/survey/metrics';
import { MetricCard, Section, Tag } from './design-system';
import { surveyIndexTagVariant } from './feedbackUi';

export function FeedbackResultsView({ metrics }: { metrics: SurveyMetricsSummary }) {
  return (
    <Section title="Results" subtitle="Aggregate survey metrics only — individual responses stay private">
      <div className="ds-metric-grid ds-metric-grid--four">
        <MetricCard label="Responses" value={metrics.respondentCount} />
        <MetricCard
          label="Overall effectiveness"
          value={metrics.overallEffectivenessIndex}
          status={<Tag variant={surveyIndexTagVariant(metrics.overallStatus)}>{metrics.overallStatus}</Tag>}
        />
      </div>

      {metrics.scaleQuestions.length > 0 && (
        <div className="ds-feedback-results-list">
          {metrics.scaleQuestions.map((q) => (
            <div key={q.questionId} className="ds-feedback-result-row">
              <div className="ds-feedback-result-row__title">{q.title}</div>
              <div className="ds-feedback-result-row__metrics">
                <span>Average: {q.average} / {q.max}</span>
                <span>Normalized: {q.normalizedIndex} / 100</span>
                <Tag variant={surveyIndexTagVariant(q.status)}>{q.status}</Tag>
                <span className="ds-feedback-result-row__muted">{q.responseCount} responses</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {metrics.multipleQuestions.length > 0 && (
        <div className="ds-feedback-results-list">
          {metrics.multipleQuestions.map((q) => (
            <div key={q.questionId} className="ds-feedback-result-row">
              <div className="ds-feedback-result-row__title">{q.title}</div>
              <div className="ds-feedback-result-row__metrics">
                <span>Yes rate: {q.yesRatePercent}%</span>
                <Tag variant={surveyIndexTagVariant(q.status)}>{q.status}</Tag>
                <span className="ds-feedback-result-row__muted">{q.responseCount} responses</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {metrics.respondentCount === 0 && (
        <p className="ds-feedback-empty-inline">No responses yet. Send the survey and refresh responses.</p>
      )}
    </Section>
  );
}
