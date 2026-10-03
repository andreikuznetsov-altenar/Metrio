import { useEffect, useMemo, useState } from "react";
import { Button } from "../../components/Button/Button";
import { Input } from "../../components/Input/Input";
import { Switch } from "../../components/Switch/Switch";
import { usePerformanceData } from "../../app/PerformanceDataContext";
import {
  countNoActivityMatches,
  countReviewAttentionMatches,
} from "../../domain/operationalRules/countAttentionMatches";
import { DEFAULT_OPERATIONAL_RULES } from "../../domain/operationalRules/operationalRulesDefaults";
import type {
  OperationalRules,
  VacationReminderMilestone,
} from "../../domain/operationalRules/operationalRulesTypes";
import {
  applyOperationalRulesPatch,
  type AppPreferences,
} from "../../platform/preferences";

const MILESTONE_OPTIONS: { value: VacationReminderMilestone; label: string }[] =
  [
    { value: 7, label: "7 days before" },
    { value: 3, label: "3 days before" },
    { value: 1, label: "1 day before" },
    { value: 0, label: "Start day" },
  ];

export interface OperationalRulesSettingsPanelProps {
  prefs: AppPreferences;
  onPersist: (next: AppPreferences) => Promise<void>;
}

export function OperationalRulesSettingsPanel({
  prefs,
  onPersist,
}: OperationalRulesSettingsPanelProps) {
  const { data } = usePerformanceData();
  const [draft, setDraft] = useState<OperationalRules>(prefs.operationalRules);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    setDraft(prefs.operationalRules);
  }, [prefs.operationalRules]);

  const reviewPreview = useMemo(
    () =>
      countReviewAttentionMatches(
        data?.teamSnapshot,
        data?.reportParams,
        draft,
      ),
    [data, draft],
  );

  const activityPreview = useMemo(
    () =>
      countNoActivityMatches(data?.teamSnapshot, data?.reportParams, draft),
    [data, draft],
  );

  const patchTask = (patch: Partial<OperationalRules["taskAttention"]>) => {
    setDraft((prev) => ({
      ...prev,
      taskAttention: { ...prev.taskAttention, ...patch },
    }));
  };

  const toggleMilestone = (milestone: VacationReminderMilestone) => {
    setDraft((prev) => {
      const set = new Set(prev.vacation.reminderMilestones);
      if (set.has(milestone)) set.delete(milestone);
      else set.add(milestone);
      const ordered = MILESTONE_OPTIONS.map((o) => o.value).filter((m) =>
        set.has(m),
      );
      return {
        ...prev,
        vacation: { ...prev.vacation, reminderMilestones: ordered },
      };
    });
  };

  const save = () => {
    void onPersist(applyOperationalRulesPatch(prefs, draft));
  };

  const reset = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    setDraft(DEFAULT_OPERATIONAL_RULES);
    void onPersist(applyOperationalRulesPatch(prefs, DEFAULT_OPERATIONAL_RULES));
    setConfirmReset(false);
  };

  return (
    <div className="settings-panel" data-testid="operational-rules-settings">
      <p className="settings-intro">
        Attention rules control when Metrio highlights operational risk. They do
        not change performance KPI definitions.
      </p>

      <section className="settings-card">
        <h3 className="settings-card__title">Attention thresholds</h3>
        <p className="settings-card__description">
          Tune when tasks appear in attention signals and Team Actions.
        </p>
        <div className="settings-field-grid settings-field-grid--3">
          <div className="settings-field">
            <label className="settings-field__label" htmlFor="review-attention-days">
              Review attention
            </label>
            <Input
              id="review-attention-days"
              type="number"
              min={1}
              max={30}
              value={String(draft.taskAttention.reviewAttentionDays)}
              onChange={(e) =>
                patchTask({ reviewAttentionDays: Number(e.target.value) })
              }
            />
            <p className="settings-field__hint">
              Matches {reviewPreview} tasks in review now
            </p>
          </div>
          <div className="settings-field">
            <label className="settings-field__label" htmlFor="no-activity-days">
              No activity
            </label>
            <Input
              id="no-activity-days"
              type="number"
              min={1}
              max={30}
              value={String(draft.taskAttention.noActivityDays)}
              onChange={(e) => patchTask({ noActivityDays: Number(e.target.value) })}
            />
            <p className="settings-field__hint">
              Matches {activityPreview} tasks without activity
            </p>
          </div>
          <div className="settings-field">
            <label className="settings-field__label" htmlFor="long-review-days">
              Long review highlight
            </label>
            <Input
              id="long-review-days"
              type="number"
              min={2}
              max={45}
              value={String(draft.taskAttention.longReviewHighlightDays)}
              onChange={(e) =>
                patchTask({ longReviewHighlightDays: Number(e.target.value) })
              }
            />
            <p className="settings-field__hint">Home delivery summary threshold</p>
          </div>
        </div>
        <div className="settings-field settings-field--narrow">
          <label className="settings-field__label" htmlFor="vacation-soon-days">
            Vacation soon window (days)
          </label>
          <Input
            id="vacation-soon-days"
            type="number"
            min={1}
            max={21}
            value={String(draft.vacation.soonWithinDays)}
            onChange={(e) =>
              setDraft((prev) => ({
                ...prev,
                vacation: {
                  ...prev.vacation,
                  soonWithinDays: Number(e.target.value),
                },
              }))
            }
          />
        </div>
      </section>

      <div className="settings-card-duo">
        <section className="settings-card">
          <h3 className="settings-card__title">Vacation reminder milestones</h3>
          <p className="settings-card__description">
            Choose when Metrio should remind you before your upcoming time off.
          </p>
          <ul className="settings-milestone-list">
            {MILESTONE_OPTIONS.map((opt) => (
              <li key={opt.value} className="settings-toggle-row">
                <span className="settings-toggle-row__label">{opt.label}</span>
                <Switch
                  aria-label={opt.label}
                  checked={draft.vacation.reminderMilestones.includes(opt.value)}
                  onCheckedChange={() => toggleMilestone(opt.value)}
                />
              </li>
            ))}
          </ul>
        </section>

        <section className="settings-card">
          <h3 className="settings-card__title">Team Actions visibility</h3>
          <p className="settings-card__description">
            Choose which informational signals may appear in Team Actions.
          </p>
          <div className="settings-toggle-stack">
            {(
              [
                ["showWorkload", "Workload"],
                ["showUpcomingLeave", "Upcoming leave"],
                ["showFeedback", "Feedback"],
                ["showKnowledge", "Knowledge"],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="settings-toggle-row">
                <span className="settings-toggle-row__label">{label}</span>
                <Switch
                  aria-label={label}
                  checked={draft.actions[key]}
                  onCheckedChange={(checked) =>
                    setDraft((prev) => ({
                      ...prev,
                      actions: { ...prev.actions, [key]: checked },
                    }))
                  }
                />
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="settings-button-group">
        <Button type="button" variant="primary" onClick={save}>
          Save attention rules
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={reset}
          data-testid="operational-rules-reset"
        >
          {confirmReset ? "Confirm reset to defaults" : "Reset to defaults"}
        </Button>
      </div>
    </div>
  );
}
