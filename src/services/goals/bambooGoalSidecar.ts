import type { BambooGoalSidecarRecord, GoalsDataFile } from "../../domain/goals/goalTypes";
import { bambooGoalSidecarKey } from "../../domain/goals/bambooGoalTypes";
import { loadGoalsData, saveGoalsData } from "./goalsPersistence";

export function findBambooGoalSidecar(
  file: GoalsDataFile | null | undefined,
  employeeId: string,
  goalId: string,
): BambooGoalSidecarRecord | null {
  const key = bambooGoalSidecarKey(employeeId, goalId);
  return (
    (file?.bambooSidecars ?? []).find(
      (s) => bambooGoalSidecarKey(s.bambooEmployeeId, s.bambooGoalId) === key,
    ) ?? null
  );
}

export async function upsertBambooGoalSidecar(
  patch: Omit<BambooGoalSidecarRecord, "updatedAt"> & { updatedAt?: string },
): Promise<BambooGoalSidecarRecord> {
  const file = await loadGoalsData();
  const next: BambooGoalSidecarRecord = {
    bambooEmployeeId: String(patch.bambooEmployeeId).trim(),
    bambooGoalId: String(patch.bambooGoalId).trim(),
    linkedJiraIssueKeys: [...(patch.linkedJiraIssueKeys ?? [])],
    linkedJiraProjectKeys: [...(patch.linkedJiraProjectKeys ?? [])],
    linkedConfluencePageIds: [...(patch.linkedConfluencePageIds ?? [])],
    updatedAt: patch.updatedAt ?? new Date().toISOString(),
  };
  const key = bambooGoalSidecarKey(next.bambooEmployeeId, next.bambooGoalId);
  const others = (file.bambooSidecars ?? []).filter(
    (s) => bambooGoalSidecarKey(s.bambooEmployeeId, s.bambooGoalId) !== key,
  );
  await saveGoalsData({ ...file, bambooSidecars: [...others, next] });
  return next;
}

/** Remove Metrio sidecar after a successful Bamboo goal delete. */
export async function removeBambooGoalSidecar(
  employeeId: string,
  goalId: string,
): Promise<void> {
  const file = await loadGoalsData();
  const key = bambooGoalSidecarKey(employeeId, goalId);
  const next = (file.bambooSidecars ?? []).filter(
    (s) => bambooGoalSidecarKey(s.bambooEmployeeId, s.bambooGoalId) !== key,
  );
  if (next.length === (file.bambooSidecars ?? []).length) return;
  await saveGoalsData({ ...file, bambooSidecars: next });
}

/**
 * Merge Bamboo SoT fields over any stale local HR copy while preserving sidecar links.
 */
export function mergeBambooWithSidecarLinks<T extends { id: string }>(
  bambooGoal: T,
  sidecar: BambooGoalSidecarRecord | null,
): T & {
  linkedJiraIssueKeys: string[];
  linkedJiraProjectKeys: string[];
  linkedConfluencePageIds: string[];
} {
  return {
    ...bambooGoal,
    linkedJiraIssueKeys: sidecar?.linkedJiraIssueKeys ?? [],
    linkedJiraProjectKeys: sidecar?.linkedJiraProjectKeys ?? [],
    linkedConfluencePageIds: sidecar?.linkedConfluencePageIds ?? [],
  };
}
