import {
  DEFAULT_OPERATIONAL_RULES,
  LONG_REVIEW_DAYS_MAX,
  LONG_REVIEW_DAYS_MIN,
  NO_ACTIVITY_DAYS_MAX,
  NO_ACTIVITY_DAYS_MIN,
  REVIEW_ATTENTION_DAYS_MAX,
  REVIEW_ATTENTION_DAYS_MIN,
  VACATION_SOON_DAYS_MAX,
  VACATION_SOON_DAYS_MIN,
} from "./operationalRulesDefaults";
import type {
  OperationalRules,
  VacationReminderMilestone,
} from "./operationalRulesTypes";

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  const rounded = Math.round(n);
  if (rounded < min) return min;
  if (rounded > max) return max;
  return rounded;
}

const VALID_MILESTONES: VacationReminderMilestone[] = [7, 3, 1, 0];

function normalizeMilestones(raw: unknown): VacationReminderMilestone[] {
  if (!Array.isArray(raw)) return [...DEFAULT_OPERATIONAL_RULES.vacation.reminderMilestones];
  const set = new Set<VacationReminderMilestone>();
  for (const item of raw) {
    const n = Number(item);
    if (VALID_MILESTONES.includes(n as VacationReminderMilestone)) {
      set.add(n as VacationReminderMilestone);
    }
  }
  if (!set.size) return [...DEFAULT_OPERATIONAL_RULES.vacation.reminderMilestones];
  return VALID_MILESTONES.filter((m) => set.has(m));
}

export function normalizeOperationalRules(
  raw: Partial<OperationalRules> | null | undefined,
): OperationalRules {
  const base = DEFAULT_OPERATIONAL_RULES;
  const task = raw?.taskAttention ?? base.taskAttention;
  const vacation = raw?.vacation ?? base.vacation;
  const actions = raw?.actions ?? base.actions;
  return {
    schemaVersion: base.schemaVersion,
    taskAttention: {
      reviewAttentionDays: clampInt(
        task.reviewAttentionDays,
        REVIEW_ATTENTION_DAYS_MIN,
        REVIEW_ATTENTION_DAYS_MAX,
        base.taskAttention.reviewAttentionDays,
      ),
      longReviewHighlightDays: clampInt(
        task.longReviewHighlightDays,
        LONG_REVIEW_DAYS_MIN,
        LONG_REVIEW_DAYS_MAX,
        base.taskAttention.longReviewHighlightDays,
      ),
      noActivityDays: clampInt(
        task.noActivityDays,
        NO_ACTIVITY_DAYS_MIN,
        NO_ACTIVITY_DAYS_MAX,
        base.taskAttention.noActivityDays,
      ),
      inProgressGraceDays: clampInt(
        task.inProgressGraceDays,
        0,
        14,
        base.taskAttention.inProgressGraceDays,
      ),
      stageAgeAttentionDays: clampInt(
        task.stageAgeAttentionDays,
        REVIEW_ATTENTION_DAYS_MIN,
        REVIEW_ATTENTION_DAYS_MAX,
        base.taskAttention.stageAgeAttentionDays,
      ),
    },
    vacation: {
      soonWithinDays: clampInt(
        vacation.soonWithinDays,
        VACATION_SOON_DAYS_MIN,
        VACATION_SOON_DAYS_MAX,
        base.vacation.soonWithinDays,
      ),
      reminderMilestones: normalizeMilestones(vacation.reminderMilestones),
    },
    actions: {
      showWorkload: actions.showWorkload ?? base.actions.showWorkload,
      showUpcomingLeave: actions.showUpcomingLeave ?? base.actions.showUpcomingLeave,
      showFeedback: actions.showFeedback ?? base.actions.showFeedback,
      showKnowledge: actions.showKnowledge ?? base.actions.showKnowledge,
    },
  };
}

export function taskHealthThresholdsFromRules(rules: OperationalRules) {
  return {
    noActivityDays: rules.taskAttention.noActivityDays,
    atRiskRatio: 0.75,
  };
}

export function formatOperationalRuleHint(
  ruleLabel: string,
  configuredDays: number,
): string {
  return `Rule: attention after ${configuredDays} day${configuredDays === 1 ? "" : "s"} (${ruleLabel})`;
}
