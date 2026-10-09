import { useMemo, useState } from 'react';
import { SegmentedControl } from '../../components/SegmentedControl/SegmentedControl';
import type { Survey, SurveyDataFile } from '../../domain/survey/types';
import type { FeedbackCycle } from '../../domain/feedbackCycles/feedbackCycleTypes';
import { runsForCycle, responseProgress } from '../../domain/feedbackCycles/runComparison';
import { buildQuestionTrends } from '../../domain/feedbackV2/trends';
import { deriveRunPhase, runStatusLabel } from '../../domain/feedbackV2/runStatus';
import { buildSurveyMetricsSummary } from '../../domain/survey/metrics';
import { Button, Section } from './design-system';
import { FeedbackResultsView } from './FeedbackResultsView';

type CycleTab = 'overview' | 'trends' | 'runs';

export function FeedbackCycleDetailView({
  cycle,
  data,
  onBack,
  onOpenRun,
}: {
  cycle: FeedbackCycle;
  data: SurveyDataFile;
  onBack: () => void;
  onOpenRun: (runId: string) => void;
}) {
  const [tab, setTab] = useState<CycleTab>('overview');
  const runs = useMemo(() => runsForCycle(data.surveys, cycle.id), [data.surveys, cycle.id]);
  const latest = runs[runs.length - 1] ?? null;
  const trends = useMemo(() => buildQuestionTrends(cycle.id, data.surveys), [cycle.id, data.surveys]);
  const latestMetrics = latest
    ? buildSurveyMetricsSummary(latest.questions, latest.responses)
    : null;
  const sentCount = latest
    ? latest.recipients.filter((r) => r.selected && (r.status === 'sent' || r.status === 'responded')).length
    : 0;

  return (
    <div className="feedback-cycle-detail" data-testid="feedback-cycle-detail">
      <div className="feedback-cycle-detail__head">
        <Button type="button" variant="secondary" size="small" onClick={onBack}>Back</Button>
        <h2 className="feedback-cycle-detail__title">{latest?.title || cycle.name}</h2>
      </div>

      <SegmentedControl
        value={tab}
        onChange={setTab}
        options={[
          { value: 'overview', label: 'Overview' },
          { value: 'trends', label: 'Trends' },
          { value: 'runs', label: 'Runs' },
        ]}
        ariaLabel="Cycle sections"
      />

      {tab === 'overview' && latest && latestMetrics ? (
        <FeedbackResultsView metrics={latestMetrics} sentCount={sentCount} />
      ) : null}

      {tab === 'overview' && !latest ? (
        <Section title="Overview" variant="plain">
          <p>No runs yet for this cycle.</p>
        </Section>
      ) : null}

      {tab === 'trends' ? (
        <Section title="Trends" variant="plain">
          {trends.length < 2 ? (
            <p className="ds-feedback-empty-inline">Trends appear after two comparable runs.</p>
          ) : (
            <ul className="feedback-trend-list">
              {trends.map((point) => (
                <li key={`${point.questionId}-${point.runId}`}>
                  <strong>{point.title}</strong> · {point.runLabel}:{' '}
                  {point.average != null ? point.average.toFixed(1) : '—'}
                </li>
              ))}
            </ul>
          )}
        </Section>
      ) : null}

      {tab === 'runs' ? (
        <Section title="Runs" variant="plain">
          <ul className="feedback-run-list">
            {runs.map((run: Survey) => {
              const progress = responseProgress(run);
              return (
                <li key={run.id} className="feedback-run-list__item">
                  <div>
                    <div>{new Date(run.createdAt).toLocaleString()}</div>
                    <div className="feedback-run-list__meta">
                      {runStatusLabel(deriveRunPhase(run))} · {progress.responded}/{progress.total} responses
                    </div>
                  </div>
                  <Button type="button" variant="secondary" size="small" onClick={() => onOpenRun(run.id)}>
                    Open
                  </Button>
                </li>
              );
            })}
          </ul>
        </Section>
      ) : null}
    </div>
  );
}
