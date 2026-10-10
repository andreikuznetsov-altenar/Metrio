import { useMemo } from 'react';
import { Repeat } from 'lucide-react';
import type { SurveyDataFile } from '../../domain/survey/types';
import { buildCycleCardModel } from '../../domain/feedbackV2/cycleCards';
import { Badge, Button } from './design-system';
import { FeedbackEmptyState } from './FeedbackEmptyState';

export function FeedbackCyclesLanding({
  data,
  canManage,
  onNewSurvey,
  onOpenCycle,
  onOpenRun,
  onStopRun,
  onRepeatCycle,
  onDeleteCycle,
}: {
  data: SurveyDataFile;
  canManage: boolean;
  onNewSurvey: () => void;
  onOpenCycle: (cycleId: string) => void;
  onOpenRun: (cycleId: string, runId: string) => void;
  onRepeatCycle: (cycleId: string) => void;
  onStopRun: (runId: string) => void;
  onDeleteCycle: (cycleId: string) => void;
}) {
  const cycles = data.cycles ?? [];
  const cards = useMemo(
    () =>
      cycles.map((cycle) => ({
        cycle,
        card: buildCycleCardModel(cycle, data.surveys),
      })),
    [cycles, data.surveys],
  );

  return (
    <div className="feedback-cycles" data-testid="feedback-cycles-v2">
      <section className="feedback-surface-card feedback-cycles-intro">
        <h2 className="feedback-cycles-intro__title">Feedback cycles</h2>
        <p className="feedback-cycles-intro__description">
          Run team surveys with your personal Google Apps Script bridge.
        </p>
        {canManage ? (
          <div className="feedback-cycles-intro__actions">
            <Button type="button" onClick={onNewSurvey} data-testid="feedback-new-survey">
              New survey
            </Button>
          </div>
        ) : null}
      </section>

      {cycles.length === 0 ? (
        <FeedbackEmptyState
          testId="feedback-cycles-empty"
          icon={Repeat}
          title="No feedback cycles yet"
          description="Create a survey to collect structured feedback from your team."
          primary={
            canManage
              ? { label: 'New survey', onClick: onNewSurvey, variant: 'primary' }
              : undefined
          }
        />
      ) : (
        <ul className="feedback-cycles__list">
          {cards.map(({ cycle, card }) => {
            const phase = card.currentRunPhase;
            const isActive = phase === 'active' || phase === 'draft';
            return (
              <li key={cycle.id} className="feedback-cycle-card" data-testid="feedback-cycle-card">
                <div className="feedback-cycle-card__head">
                  <h3 className="feedback-cycle-card__title">{card.title}</h3>
                  <Badge variant="neutral">{card.statusLabel}</Badge>
                </div>
                <dl className="feedback-cycle-card__metrics feedback-cycle-card__metrics--v2">
                  <div>
                    <dt>Recipients</dt>
                    <dd>{card.recipientPreview}</dd>
                  </div>
                  <div>
                    <dt>Questions</dt>
                    <dd>{card.questionCount}</dd>
                  </div>
                  <div>
                    <dt>Responses</dt>
                    <dd>{card.responsesLabel}</dd>
                  </div>
                  {card.averageScore ? (
                    <div>
                      <dt>Avg score</dt>
                      <dd>{card.averageScore}</dd>
                    </div>
                  ) : null}
                  {card.trendLabel ? (
                    <div>
                      <dt>Trend</dt>
                      <dd>{card.trendLabel}</dd>
                    </div>
                  ) : null}
                </dl>
                {canManage ? (
                  <div className="feedback-cycle-card__actions">
                    <Button
                      type="button"
                      variant="primary"
                      onClick={() => onOpenCycle(cycle.id)}
                    >
                      Open
                    </Button>
                    {card.currentRunId && isActive ? (
                      <>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => onOpenRun(cycle.id, card.currentRunId!)}
                        >
                          Open run
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => onStopRun(card.currentRunId!)}
                        >
                          Stop
                        </Button>
                      </>
                    ) : card.currentRunId ? (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => onOpenRun(cycle.id, card.currentRunId!)}
                      >
                        Open results
                      </Button>
                    ) : null}
                    <Button type="button" variant="secondary" onClick={() => onRepeatCycle(cycle.id)}>
                      Repeat
                    </Button>
                    <Button type="button" variant="danger" onClick={() => onDeleteCycle(cycle.id)}>
                      Delete
                    </Button>
                  </div>
                ) : null}
                {!canManage ? (
                  <div className="feedback-cycle-card__actions">
                    <Button
                      type="button"
                      variant="primary"
                      onClick={() => onOpenCycle(cycle.id)}
                    >
                      Open
                    </Button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
