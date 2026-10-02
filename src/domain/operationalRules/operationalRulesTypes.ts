/** Personal attention rules (local prefs). Org policy may extend later. */
export type VacationReminderMilestone = 7 | 3 | 1 | 0;

export interface OperationalRules {
  schemaVersion: number;
  taskAttention: {
    /** Radar / delivery risk: flag Review stage age */
    reviewAttentionDays: number;
    /** Team actions + home “long review” highlights */
    longReviewHighlightDays: number;
    /** No Jira activity on active work */
    noActivityDays: number;
    /** Extra days on In Progress before attention (added to reviewAttentionDays) */
    inProgressGraceDays: number;
    /** Stage-age warning when not caught by review/in-progress rules */
    stageAgeAttentionDays: number;
  };
  vacation: {
    /** Days before leave when `vacation_soon` applies */
    soonWithinDays: number;
    /** Days-before-leave notification milestones */
    reminderMilestones: VacationReminderMilestone[];
  };
  actions: {
    showWorkload: boolean;
    showUpcomingLeave: boolean;
    showFeedback: boolean;
    showKnowledge: boolean;
  };
}
