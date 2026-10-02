import { useMemo, useState } from 'react';
import { useFeedbackSurveyStore } from '../../app/feedbackSurveyStore';
import { useFeedbackAppStore } from '../../app/FeedbackTeamProvider';
import { useCurrentUser } from '../../app/CurrentUserContext';
import { createCycleId } from '../../domain/feedbackCycles/feedbackCycleEngine';
import { canManageFeedbackCycles } from '../../domain/feedbackCycles/feedbackRecipients';
import { confidentialityLabel } from '../../domain/feedbackCycles/feedbackPrivacy';
import { responseProgress, runsForCycle } from '../../domain/feedbackCycles/runComparison';
import type { FeedbackCycle } from '../../domain/feedbackCycles/feedbackCycleTypes';
import { BUILTIN_FEEDBACK_TEMPLATES } from '../../domain/feedbackCycles/feedbackTemplates';
import { useOptionalCompanyConfig } from '../../app/CompanyConfigContext';
import { saveSurveyData } from '../../services/survey/surveyPersistence';
import { Button } from './design-system';
import { FeedbackTemplateLibrary } from './FeedbackTemplateLibrary';

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
      <p className="feedback-cycles__lead">
        Reusable feedback programs. Delivery still uses Google Forms and your existing send flow.
      </p>
      {canManage ? (
        <div className="feedback-cycles__actions">
          <Button type="button" variant="secondary" onClick={() => void addPulseCycle()}>
            New pulse cycle
          </Button>
          <Button type="button" variant="ghost" onClick={() => setShowTemplates((v) => !v)}>
            Template library
          </Button>
        </div>
      ) : null}

      {showTemplates ? <FeedbackTemplateLibrary templates={templates} /> : null}

      <ul className="feedback-cycles__list">
        {cycleRows.map(({ cycle, current, progress, runs }) => (
          <li key={cycle.id} className="feedback-cycle-card" data-testid="feedback-cycle-card">
            <h3>{cycle.name}</h3>
            <p className="feedback-cycle-card__meta">
              {cycle.type} · {cycle.status}
              {cycle.cadence ? ` · ${cycle.cadence.unit}` : ''}
            </p>
            <p className="feedback-cycle-card__meta">
              {confidentialityLabel(cycle.confidentiality, prefs.google)}
            </p>
            {current ? (
              <p>
                {progress.responded} / {progress.total} responses · {runs.length} run
                {runs.length === 1 ? '' : 's'}
              </p>
            ) : (
              <p>No runs yet — scheduler creates draft runs on refresh.</p>
            )}
            {canManage && current ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => setActiveSurvey(current.id)}
              >
                Open current run
              </Button>
            ) : null}
            {canManage ? (
              <div className="feedback-cycles__row-actions">
                {cycle.status === 'active' ? (
                  <Button type="button" variant="ghost" onClick={() => void setCycleStatus(cycle.id, 'paused')}>
                    Pause
                  </Button>
                ) : null}
                {cycle.status === 'paused' ? (
                  <Button type="button" variant="ghost" onClick={() => void setCycleStatus(cycle.id, 'active')}>
                    Resume
                  </Button>
                ) : null}
                <Button type="button" variant="ghost" onClick={() => void setCycleStatus(cycle.id, 'archived')}>
                  Archive
                </Button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>

      {cycles.length === 0 ? (
        <p role="status">No cycles yet. Legacy surveys remain under History as one-off runs.</p>
      ) : null}
    </div>
  );
}
