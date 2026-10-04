import { useMemo, useState } from 'react';
import { Repeat } from 'lucide-react';
import { useFeedbackSurveyStore } from '../../app/feedbackSurveyStore';
import { useFeedbackAppStore } from '../../app/FeedbackTeamProvider';
import { useCurrentUser } from '../../app/CurrentUserContext';
import { createCycleId } from '../../domain/feedbackCycles/feedbackCycleEngine';
import { canManageFeedbackCycles } from '../../domain/feedbackCycles/feedbackRecipients';
import { confidentialityLabel } from '../../domain/feedbackCycles/feedbackPrivacy';
import { responseProgress, runsForCycle } from '../../domain/feedbackCycles/runComparison';
import type { FeedbackCycle } from '../../domain/feedbackCycles/feedbackCycleTypes';
import { BUILTIN_FEEDBACK_TEMPLATES } from '../../domain/feedbackCycles/feedbackTemplates';
import {
  feedbackCadenceUnitLabel,
  feedbackCycleStatusLabel,
  feedbackCycleTypeLabel,
} from '../../domain/feedbackCycles/feedbackCycleLabels';
import { useOptionalCompanyConfig } from '../../app/CompanyConfigContext';
import { saveSurveyData } from '../../services/survey/surveyPersistence';
import { Badge, Button } from './design-system';
import { FeedbackEmptyState } from './FeedbackEmptyState';
import { FeedbackTemplateLibrary } from './FeedbackTemplateLibrary';

function cycleStatusVariant(
  status: FeedbackCycle['status'],
): 'success' | 'warning' | 'neutral' {
  switch (status) {
    case 'active':
      return 'success';
    case 'paused':
      return 'warning';
    default:
      return 'neutral';
  }
}

export function FeedbackCyclesView() {
  const { data, setActiveSurvey, init } = useFeedbackSurveyStore();
  const { prefs } = useFeedbackAppStore();
  const { currentUser } = useCurrentUser();
  const companyConfig = useOptionalCompanyConfig();
  const [showTemplates, setShowTemplates] = useState(false);

  const cycles = data.cycles ?? [];
  const templates =
    data.templates ??
    companyConfig?.effective.feedbackTemplates ??
    BUILTIN_FEEDBACK_TEMPLATES;
  const canManage = canManageFeedbackCycles(currentUser);

  const cycleRows = useMemo(() => {
    return cycles.map((cycle) => {
      const runs = runsForCycle(data.surveys, cycle.id);
      const current = runs.find((r) => r.id === cycle.currentRunId) ?? runs[runs.length - 1];
      const progress = current ? responseProgress(current) : { responded: 0, total: 0 };
      return { cycle, runs, current, progress };
    });
  }, [cycles, data.surveys]);

  const addPulseCycle = async () => {
    if (!canManage) return;
    const now = new Date().toISOString();
    const cycle: FeedbackCycle = {
      id: createCycleId(),
      name: 'Team pulse',
      type: 'pulse',
      status: 'active',
      cadence: { unit: 'monthly', timezone: 'local' },
      audienceRule: { kind: 'team_direct_scope' },
      surveyTemplateId: 'tpl_team_pulse',
      confidentiality: 'identified',
      createdAt: now,
      updatedAt: now,
    };
    await saveSurveyData({
      ...data,
      cycles: [...cycles, cycle],
    });
    await init();
  };

  const setCycleStatus = async (cycleId: string, status: FeedbackCycle['status']) => {
    const next = cycles.map((c) =>
      c.id === cycleId ? { ...c, status, updatedAt: new Date().toISOString() } : c,
    );
    await saveSurveyData({ ...data, cycles: next });
    await init();
  };

  return (
    <div className="feedback-cycles" data-testid="feedback-cycles">
      <section className="feedback-surface-card feedback-cycles-intro">
        <h2 className="feedback-cycles-intro__title">Feedback cycles</h2>
        <p className="feedback-cycles-intro__description">
          Create reusable pulse, onboarding or project feedback programs.
        </p>
        {canManage && cycles.length > 0 ? (
          <div className="feedback-cycles-intro__actions">
            <Button type="button" variant="secondary" onClick={() => void addPulseCycle()}>
              New pulse cycle
            </Button>
            <Button type="button" variant="secondary" onClick={() => setShowTemplates((v) => !v)}>
              Template library
            </Button>
          </div>
        ) : null}
      </section>

      {showTemplates ? <FeedbackTemplateLibrary templates={templates} /> : null}

      {cycles.length === 0 ? (
        <FeedbackEmptyState
          testId="feedback-cycles-empty"
          icon={Repeat}
          title="No feedback cycles yet"
          description="Create a recurring pulse or start from a template."
          primary={
            canManage
              ? {
                  label: 'New pulse cycle',
                  onClick: () => void addPulseCycle(),
                  variant: 'secondary',
                }
              : undefined
          }
          secondary={
            canManage
              ? {
                  label: 'Template library',
                  onClick: () => setShowTemplates(true),
                  variant: 'secondary',
                }
              : undefined
          }
        />
      ) : (
        <ul className="feedback-cycles__list">
          {cycleRows.map(({ cycle, current, progress, runs }) => (
            <li key={cycle.id} className="feedback-cycle-card" data-testid="feedback-cycle-card">
              <div className="feedback-cycle-card__head">
                <h3 className="feedback-cycle-card__title">{cycle.name}</h3>
                <div className="feedback-cycle-card__badges">
                  <Badge variant="neutral">{feedbackCycleTypeLabel(cycle.type)}</Badge>
                  <Badge variant={cycleStatusVariant(cycle.status)}>
                    {feedbackCycleStatusLabel(cycle.status)}
                  </Badge>
                </div>
              </div>
              <div className="feedback-cycle-card__metrics">
                <span>
                  Cadence:{' '}
                  <strong>{feedbackCadenceUnitLabel(cycle.cadence?.unit)}</strong>
                </span>
                <span>
                  Responses:{' '}
                  <strong>
                    {progress.responded} / {progress.total}
                  </strong>
                </span>
                <span>
                  Runs: <strong>{runs.length}</strong>
                </span>
              </div>
              <p className="feedback-cycle-card__meta">
                {confidentialityLabel(cycle.confidentiality, prefs.google)}
              </p>
              {current ? null : (
                <p className="feedback-cycle-card__hint">
                  No runs yet — scheduler creates draft runs on refresh.
                </p>
              )}
              {canManage ? (
                <div className="feedback-cycle-card__actions">
                  {current ? (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setActiveSurvey(current.id)}
                    >
                      Open current run
                    </Button>
                  ) : null}
                  {cycle.status === 'active' ? (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => void setCycleStatus(cycle.id, 'paused')}
                    >
                      Pause
                    </Button>
                  ) : null}
                  {cycle.status === 'paused' ? (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => void setCycleStatus(cycle.id, 'active')}
                    >
                      Resume
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => void setCycleStatus(cycle.id, 'archived')}
                  >
                    Archive
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
