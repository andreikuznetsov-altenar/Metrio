import { useMemo, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { SegmentedControl } from '../../components/SegmentedControl/SegmentedControl';
import type { Survey, SurveyDataFile } from '../../domain/survey/types';
import type { FeedbackCycle } from '../../domain/feedbackCycles/feedbackCycleTypes';
import { runsForCycle, responseProgress } from '../../domain/feedbackCycles/runComparison';
import { buildQuestionTrends } from '../../domain/feedbackV2/trends';
import { deriveRunPhase, runStatusLabel } from '../../domain/feedbackV2/runStatus';
import { buildSurveyMetricsSummary } from '../../domain/survey/metrics';
import { openExternalUrl } from '../../platform/openExternal';
import { Badge, Button, MetricCard, Section } from './design-system';
import { FeedbackResultsView } from './FeedbackResultsView';
import { FeedbackEmptyState } from './FeedbackEmptyState';

type CycleTab = 'overview' | 'trends' | 'runs';

export function FeedbackCycleDetailView({
  cycle,
  data,
  canManage,
  onOpenRun,
  onStopRun,
  onRepeatCycle,
}: {
  cycle: FeedbackCycle;
  data: SurveyDataFile;
  canManage: boolean;
  onOpenRun: (runId: string) => void;
  onStopRun: (runId: string) => void;
  onRepeatCycle: (cycleId: string) => void;
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
        <div className="feedback-cycle-overview">
          <Section title="Overview" variant="plain">
            <div className="ds-metric-grid ds-metric-grid--three">
              <MetricCard
                label="Recipients"
                value={latest.recipients.filter((r) => r.selected).length}
              />
              <MetricCard
                label="Questions"
                value={latest.questions.filter((q) => q.active).length}
              />
              <MetricCard
                label="Responses"
                value={`${latestMetrics.respondentCount} / ${latest.recipients.filter((r) => r.selected).length}`}
              />
            </div>
          </Section>

          <Section title="Latest run" variant="plain">
            <div className="feedback-latest-run">
              <div className="feedback-latest-run__grid">
                <div>
                  <span>Status</span>
                  <strong>{runStatusLabel(deriveRunPhase(latest))}</strong>
                </div>
                <div>
                  <span>Created</span>
                  <strong>{new Date(latest.createdAt).toLocaleString()}</strong>
                </div>
                <div>
                  <span>Sent</span>
                  <strong>{sentCount}</strong>
                </div>
                <div>
                  <span>Responses</span>
                  <strong>{latestMetrics.respondentCount}</strong>
                </div>
                <div>
                  <span>Google Form state</span>
                  <strong>{latest.responderUri ? 'Ready' : 'Not ready'}</strong>
                </div>
              </div>
              <div className="feedback-latest-run__actions">
                {latest.responderUri ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="small"
                    onClick={() => void openExternalUrl(latest.responderUri!)}
                  >
                    Open Form
                  </Button>
                ) : null}
                {canManage && deriveRunPhase(latest) === 'active' ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="small"
                    onClick={() => onStopRun(latest.id)}
                  >
                    Stop
                  </Button>
                ) : null}
                {canManage ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="small"
                    onClick={() => onRepeatCycle(cycle.id)}
                  >
                    Repeat
                  </Button>
                ) : null}
              </div>
            </div>
          </Section>

          <FeedbackResultsView metrics={latestMetrics} sentCount={sentCount} title={null} />
        </div>
      ) : null}

      {tab === 'overview' && !latest ? (
        <FeedbackEmptyState
          icon={BarChart3}
          title="No runs yet"
          description="Repeat this cycle to create the first run."
          primary={
            canManage
              ? { label: 'Repeat', onClick: () => onRepeatCycle(cycle.id), variant: 'primary' }
              : undefined
          }
        />
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
                  <div className="feedback-run-list__content">
                    <div className="feedback-run-list__title">
                      {new Date(run.createdAt).toLocaleString()}
                      <Badge variant="neutral">{runStatusLabel(deriveRunPhase(run))}</Badge>
                    </div>
                    <div className="feedback-run-list__meta">
                      <span>Recipients: {progress.total}</span>
                      <span>Responses: {progress.responded}</span>
                      <span>Form state: {run.responderUri ? 'Ready' : 'Not ready'}</span>
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
