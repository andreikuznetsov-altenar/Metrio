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
        not change performance KPI definitions (Completed, First pass, Backflows,
        Avg cycle, Efficiency).
      </p>

      <div className="settings-group">
        <span className="settings-row__label">Review attention (days)</span>
        <Input
          type="number"
          min={1}
          max={30}
          value={String(draft.taskAttention.reviewAttentionDays)}
          onChange={(e) =>
            patchTask({ reviewAttentionDays: Number(e.target.value) })
          }
        />
        <p className="settings-row__hint">
          Highlights tasks in Review longer than this. Currently matches:{" "}
          {reviewPreview} tasks
        </p>
      </div>

      <div className="settings-group">
        <span className="settings-row__label">Long review highlight (days)</span>
        <Input
          type="number"
          min={2}
          max={45}
          value={String(draft.taskAttention.longReviewHighlightDays)}
          onChange={(e) =>
            patchTask({ longReviewHighlightDays: Number(e.target.value) })
          }
        />
        <p className="settings-row__hint">
          Used for Home delivery summary and Team Actions stale review.
        </p>
      </div>

      <div className="settings-group">
        <span className="settings-row__label">No activity (days)</span>
        <Input
          type="number"
          min={1}
          max={30}
          value={String(draft.taskAttention.noActivityDays)}
          onChange={(e) => patchTask({ noActivityDays: Number(e.target.value) })}
        />
        <p className="settings-row__hint">
          Highlights active work with no detected Jira activity for this many days.
          Currently matches: {activityPreview} tasks
        </p>
      </div>

      <div className="settings-group">
        <span className="settings-row__label">Vacation soon window (days)</span>
        <Input
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

      <div className="settings-group">
        <span className="settings-row__label">Vacation reminder milestones</span>
        <ul className="settings-milestone-list">
          {MILESTONE_OPTIONS.map((opt) => (
            <li key={opt.value}>
              <Switch
                aria-label={opt.label}
                checked={draft.vacation.reminderMilestones.includes(opt.value)}
                onCheckedChange={() => toggleMilestone(opt.value)}
              />
              <span>{opt.label}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="settings-group">
        <span className="settings-row__label">Team Actions visibility</span>
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

      <div className="settings-actions-row">
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
