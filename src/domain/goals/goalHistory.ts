import type { Goal, GoalHistoryEntry } from "./goalTypes";

import { appNow } from "../../platform/appClock";
export function appendGoalHistory(
  history: GoalHistoryEntry[],
  entry: Omit<GoalHistoryEntry, "id">,
): GoalHistoryEntry[] {
  const id = `gh_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  return [...history, { ...entry, id }].slice(-500);
}

export function recordGoalFieldChange(
  history: GoalHistoryEntry[],
  goalId: string,
  field: string,
  previousValue: string | undefined,
  nextValue: string | undefined,
  actorPersonId?: string,
): GoalHistoryEntry[] {
  if (previousValue === nextValue) return history;
  return appendGoalHistory(history, {
    goalId,
    at: appNow().toISOString(),
    actorPersonId,
    field,
    previousValue,
    nextValue,
  });
}

export function historyForGoal(
  history: GoalHistoryEntry[],
  goalId: string,
): GoalHistoryEntry[] {
  return history.filter((h) => h.goalId === goalId);
}

export function applyGoalPatch(
  goal: Goal,
  patch: Partial<Goal>,
  actorPersonId?: string,
  history: GoalHistoryEntry[] = [],
): { goal: Goal; history: GoalHistoryEntry[] } {
  let nextHistory = history;
  const track = (field: string, prev?: string, next?: string) => {
    nextHistory = recordGoalFieldChange(
      nextHistory,
      goal.id,
      field,
      prev,
      next,
      actorPersonId,
    );
  };

  const updated: Goal = { ...goal, ...patch, updatedAt: appNow().toISOString() };

  if (patch.status && patch.status !== goal.status) {
    track("status", goal.status, patch.status);
  }
  if (patch.reviewDate !== undefined && patch.reviewDate !== goal.reviewDate) {
    track("reviewDate", goal.reviewDate, patch.reviewDate);
  }
  if (patch.manualProgress) {
    track(
      "manualProgress",
      JSON.stringify(goal.manualProgress),
      JSON.stringify(patch.manualProgress),
    );
  }

  return { goal: updated, history: nextHistory };
}
