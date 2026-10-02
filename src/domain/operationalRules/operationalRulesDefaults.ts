import type { OperationalRules } from "./operationalRulesTypes";

export const OPERATIONAL_RULES_SCHEMA_VERSION = 1;

export const DEFAULT_OPERATIONAL_RULES: OperationalRules = {
  schemaVersion: OPERATIONAL_RULES_SCHEMA_VERSION,
  taskAttention: {
    reviewAttentionDays: 3,
    longReviewHighlightDays: 7,
    noActivityDays: 7,
    inProgressGraceDays: 2,
    stageAgeAttentionDays: 3,
  },
  vacation: {
    soonWithinDays: 7,
    reminderMilestones: [7, 3, 1, 0],
  },
  actions: {
    showWorkload: true,
    showUpcomingLeave: true,
    showFeedback: true,
    showKnowledge: true,
  },
};

export const REVIEW_ATTENTION_DAYS_MIN = 1;
export const REVIEW_ATTENTION_DAYS_MAX = 30;
export const LONG_REVIEW_DAYS_MIN = 2;
export const LONG_REVIEW_DAYS_MAX = 45;
export const NO_ACTIVITY_DAYS_MIN = 1;
export const NO_ACTIVITY_DAYS_MAX = 30;
export const VACATION_SOON_DAYS_MIN = 1;
export const VACATION_SOON_DAYS_MAX = 21;
