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
                <button
                  type="button"
                  className="feedback-cycle-card__open"
                  onClick={() => onOpenCycle(cycle.id)}
                >
                  <div className="feedback-cycle-card__head">
                    <h3 className="feedback-cycle-card__title">{card.title}</h3>
                    <Badge variant="neutral">{card.statusLabel}</Badge>
                  </div>
                  <div className="feedback-cycle-card__metrics feedback-cycle-card__metrics--v2">
                    <span>Recipients: <strong>{card.recipientPreview}</strong></span>
                    <span>Questions: <strong>{card.questionCount}</strong></span>
                    <span>Responses: <strong>{card.responsesLabel}</strong></span>
                    {card.averageScore ? (
                      <span>Avg score: <strong>{card.averageScore}</strong></span>
                    ) : null}
                    {card.trendLabel ? (
                      <span className="feedback-cycle-card__trend">{card.trendLabel}</span>
                    ) : null}
                  </div>
                </button>
                {canManage ? (
                  <div className="feedback-cycle-card__actions">
                    {card.currentRunId && isActive ? (
                      <>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => onOpenRun(cycle.id, card.currentRunId!)}
                        >
                          Open
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
                    <Button type="button" variant="secondary" onClick={() => onDeleteCycle(cycle.id)}>
                      Delete
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
