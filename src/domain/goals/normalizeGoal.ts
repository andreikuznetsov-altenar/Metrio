import type {
  BambooGoalSidecarRecord,
  Goal,
  GoalManualProgress,
  GoalProgressMode,
  GoalScope,
  GoalStatus,
  GoalsDataFile,
} from "./goalTypes";
import { GOALS_DATA_SCHEMA_VERSION } from "./goalTypes";

const STATUSES: GoalStatus[] = [
  "draft",
  "active",
  "completed",
  "paused",
  "cancelled",
];
const SCOPES: GoalScope[] = ["person", "team"];
const MODES: GoalProgressMode[] = [
  "manual",
  "linked_work",
  "linked_issue_count",
];

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function normalizeManualProgress(raw: unknown): GoalManualProgress | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const kind = (raw as { kind?: string }).kind;
  if (kind === "percent") {
    const value = Number((raw as { value?: number }).value);
    if (Number.isNaN(value)) return undefined;
    return { kind: "percent", value: clampPercent(value) };
  }
  if (kind === "steps") {
    const step = (raw as { step?: string }).step;
    if (step === "not_started" || step === "in_progress" || step === "completed") {
      return { kind: "steps", step };
    }
  }
  return undefined;
}

export function normalizeGoal(raw: Partial<Goal>): Goal | null {
  const id = String(raw.id ?? "").trim();
  const title = String(raw.title ?? "").trim();
  const ownerPersonId = String(raw.ownerPersonId ?? "").trim();
  if (!id || !title || !ownerPersonId) return null;

  const status = STATUSES.includes(raw.status as GoalStatus)
    ? (raw.status as GoalStatus)
    : "draft";
  const scope = SCOPES.includes(raw.scope as GoalScope)
    ? (raw.scope as GoalScope)
    : "person";
  const progressMode = MODES.includes(raw.progressMode as GoalProgressMode)
    ? (raw.progressMode as GoalProgressMode)
    : "linked_work";

  const now = new Date().toISOString();
  return {
    id,
    title,
    description: raw.description ? String(raw.description) : undefined,
    ownerPersonId,
    createdByPersonId: raw.createdByPersonId
      ? String(raw.createdByPersonId)
      : undefined,
    scope,
    status,
    startDate: raw.startDate ? String(raw.startDate) : undefined,
    targetDate: raw.targetDate ? String(raw.targetDate) : undefined,
    reviewDate: raw.reviewDate ? String(raw.reviewDate) : undefined,
    progressMode,
    manualProgress: normalizeManualProgress(raw.manualProgress),
    linkedJiraIssueKeys: Array.isArray(raw.linkedJiraIssueKeys)
      ? raw.linkedJiraIssueKeys.map(String)
      : [],
    linkedJiraProjectKeys: Array.isArray(raw.linkedJiraProjectKeys)
      ? raw.linkedJiraProjectKeys.map(String)
      : [],
    linkedConfluencePageIds: Array.isArray(raw.linkedConfluencePageIds)
      ? raw.linkedConfluencePageIds.map(String)
      : [],
    employeeMayEditManualProgress: raw.employeeMayEditManualProgress ?? true,
    createdAt: raw.createdAt ? String(raw.createdAt) : now,
    updatedAt: raw.updatedAt ? String(raw.updatedAt) : now,
  };
}

function normalizeSidecar(raw: unknown): BambooGoalSidecarRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Partial<BambooGoalSidecarRecord>;
  const bambooEmployeeId = String(row.bambooEmployeeId ?? "").trim();
  const bambooGoalId = String(row.bambooGoalId ?? "").trim();
  if (!bambooEmployeeId || !bambooGoalId) return null;
  return {
    bambooEmployeeId,
    bambooGoalId,
    linkedJiraIssueKeys: Array.isArray(row.linkedJiraIssueKeys)
      ? row.linkedJiraIssueKeys.map(String)
      : [],
    linkedJiraProjectKeys: Array.isArray(row.linkedJiraProjectKeys)
      ? row.linkedJiraProjectKeys.map(String)
      : [],
    linkedConfluencePageIds: Array.isArray(row.linkedConfluencePageIds)
      ? row.linkedConfluencePageIds.map(String)
      : [],
    updatedAt: row.updatedAt ? String(row.updatedAt) : new Date().toISOString(),
  };
}

export function normalizeGoalsFile(raw: Partial<GoalsDataFile>): GoalsDataFile {
  const goals = (raw.goals ?? [])
    .map((g) => normalizeGoal(g as Partial<Goal>))
    .filter((g): g is Goal => g != null);
  const history = Array.isArray(raw.history) ? raw.history : [];
  const bambooSidecars = Array.isArray(raw.bambooSidecars)
    ? raw.bambooSidecars
        .map(normalizeSidecar)
        .filter((s): s is BambooGoalSidecarRecord => s != null)
    : [];
  return {
    schemaVersion: raw.schemaVersion ?? GOALS_DATA_SCHEMA_VERSION,
    goals,
    history,
    bambooSidecars,
  };
}

export function countLegacyMetrioOnlyGoals(goals: Goal[]): number {
  return goals.filter((g) => {
    const bambooId = (g as Goal & { bambooGoalId?: string }).bambooGoalId;
    return !bambooId;
  }).length;
}

export function createGoalId(): string {
  return `goal_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
