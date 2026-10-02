import type { SurveyMetricsSummary } from '../../domain/survey/metrics';
import { Badge, MetricCard, Section } from './design-system';
import { FEEDBACK_HELP } from './feedbackHelp';
import { surveyIndexBadgeVariant } from './feedbackUi';

export function FeedbackResultsView({
  metrics,
  sentCount,
}: {
  metrics: SurveyMetricsSummary;
  sentCount: number;
}) {
  const responseRate =
    sentCount > 0 ? Math.round((metrics.respondentCount / sentCount) * 10000) / 100 : 0;

  return (
    <Section title="Results" variant="plain">
      <div className="ds-metric-grid ds-metric-grid--four">
        <MetricCard label="Sent" value={sentCount} />
        <MetricCard label="Responses" value={metrics.respondentCount} />
        <MetricCard
          label="Response rate"
          value={`${responseRate}%`}
          hint={FEEDBACK_HELP.responseRate}
        />
        <MetricCard
          label="Survey index"
          value={metrics.overallStatus}
          hint={FEEDBACK_HELP.surveyIndex}
          status={
            <Badge variant={surveyIndexBadgeVariant(metrics.overallStatus)}>
              {metrics.overallStatus}
            </Badge>
          }
        />
      </div>

      {metrics.scaleQuestions.length > 0 && (
        <div className="ds-feedback-results-list">
          {metrics.scaleQuestions.map((q) => (
            <div key={q.questionId} className="ds-feedback-result-row">
              <div className="ds-feedback-result-row__title">{q.title}</div>
              <div className="ds-feedback-result-row__metrics">
                <span>Average: {q.average} / {q.max}</span>
                <Badge variant={surveyIndexBadgeVariant(q.status)}>{q.status}</Badge>
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
                <Badge variant={surveyIndexBadgeVariant(q.status)}>{q.status}</Badge>
                <span className="ds-feedback-result-row__muted">{q.responseCount} responses</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}
