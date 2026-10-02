import { useCallback, useEffect, useMemo, useState } from "react";
import { useCurrentUser } from "../app/CurrentUserContext";
import { applyGoalPatch } from "../domain/goals/goalHistory";
import { listVisibleGoals, canCreateGoalForOwner } from "../domain/goals/goalAccess";
import { createGoalId, normalizeGoal } from "../domain/goals/normalizeGoal";
import type { Goal, GoalScope } from "../domain/goals/goalTypes";
import {
  loadGoalsData,
  saveGoalsData,
} from "../services/goals/goalsPersistence";

const GOALS_CHANGED = "metrio-goals-changed";

export function useGoals() {
  const { currentUser } = useCurrentUser();
  const [file, setFile] = useState<Awaited<ReturnType<typeof loadGoalsData>> | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await loadGoalsData();
      setFile(data);
      setError(null);
    } catch {
      setError("Goals could not be loaded.");
    }
  }, []);

  useEffect(() => {
    void refresh();
    const onChange = () => void refresh();
    window.addEventListener(GOALS_CHANGED, onChange);
    return () => window.removeEventListener(GOALS_CHANGED, onChange);
  }, [refresh]);

  const visibleGoals = useMemo(
    () => listVisibleGoals(file?.goals ?? [], currentUser),
    [file, currentUser],
  );

  const persist = useCallback(async (next: typeof file) => {
    if (!next) return;
    await saveGoalsData(next);
    setFile(next);
    window.dispatchEvent(new CustomEvent(GOALS_CHANGED));
  }, []);

  const upsertGoal = useCallback(
    async (goal: Goal) => {
      if (!file) return;
      const goals = [...file.goals];
      const index = goals.findIndex((g) => g.id === goal.id);
      if (index >= 0) goals[index] = goal;
      else goals.push(goal);
      await persist({ ...file, goals });
    },
    [file, persist],
  );

  const createGoal = useCallback(
    async (input: {
      title: string;
      description?: string;
      ownerPersonId: string;
      scope: GoalScope;
      reviewDate?: string;
    }) => {
      if (!file) return null;
      if (
        !canCreateGoalForOwner(
          currentUser,
          input.ownerPersonId,
          input.scope,
        )
      ) {
        return null;
      }
      const now = new Date().toISOString();
      const goal = normalizeGoal({
        id: createGoalId(),
        title: input.title,
        description: input.description,
        ownerPersonId: input.ownerPersonId,
        createdByPersonId: currentUser.person.id,
        scope: input.scope,
        status: "active",
        reviewDate: input.reviewDate,
        progressMode: "linked_work",
        manualProgress: { kind: "steps", step: "not_started" },
        linkedJiraIssueKeys: [],
        linkedJiraProjectKeys: [],
        linkedConfluencePageIds: [],
        employeeMayEditManualProgress: true,
        createdAt: now,
        updatedAt: now,
      });
      if (!goal) return null;
      await upsertGoal(goal);
      return goal;
    },
    [file, currentUser, upsertGoal],
  );

  const patchGoal = useCallback(
    async (goalId: string, patch: Partial<Goal>) => {
      if (!file) return;
      const existing = file.goals.find((g) => g.id === goalId);
      if (!existing) return;
      const { goal, history } = applyGoalPatch(
        existing,
        patch,
        currentUser.person.id,
        file.history,
      );
      await persist({
        ...file,
        goals: file.goals.map((g) => (g.id === goalId ? goal : g)),
        history,
      });
    },
    [file, currentUser.person.id, persist],
  );

  return {
    goals: visibleGoals,
    allGoals: file?.goals ?? [],
    history: file?.history ?? [],
    loading: file == null && !error,
    error,
    refresh,
    createGoal,
    patchGoal,
    upsertGoal,
  };
}
