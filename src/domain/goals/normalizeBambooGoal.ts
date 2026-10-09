import type {
  BambooGoal,
  BambooGoalAction,
  BambooGoalAlignmentOption,
  BambooGoalMilestone,
  BambooGoalShareOption,
  BambooGoalStatus,
} from "./bambooGoalTypes";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function asStringIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => asString(item))
    .filter((id): id is string => Boolean(id));
}

function normalizeStatus(raw: unknown): BambooGoalStatus {
  const s = String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  if (s === "in_progress" || s === "inprogress") return "in_progress";
  if (s === "completed" || s === "complete") return "completed";
  if (s === "closed" || s === "close") return "closed";
  return "unknown";
}

function normalizeMilestone(raw: unknown): BambooGoalMilestone | null {
  const row = asRecord(raw);
  if (!row) return null;
  const id = asString(row.id);
  const title = asString(row.title) ?? asString(row.name);
  if (!id || !title) return null;
  const completed =
    typeof row.completed === "boolean"
      ? row.completed
      : Boolean(asString(row.completedDateTime) || asString(row.completionDate));
  return {
    id,
    title,
    currentValue: asNumber(row.currentValue) ?? null,
    goalValue: asNumber(row.goalValue) ?? asNumber(row.targetValue) ?? null,
    completed,
    completionDate:
      asString(row.completionDate) ??
      asString(row.completedDateTime) ??
      null,
    percentComplete: asNumber(row.percentComplete) ?? null,
  };
}

function derivePercentFromMilestones(
  milestones: BambooGoalMilestone[],
  fallback: number,
): number {
  if (milestones.length === 0) return fallback;
  const completed = milestones.filter((m) => m.completed).length;
  return Math.round((completed / milestones.length) * 100);
}

export function normalizeBambooGoal(
  raw: unknown,
  employeeId: string,
): BambooGoal | null {
  const row = asRecord(raw);
  if (!row) return null;
  const id = asString(row.id);
  const title = asString(row.title);
  if (!id || !title) return null;

  const milestones = Array.isArray(row.milestones)
    ? row.milestones
        .map(normalizeMilestone)
        .filter((m): m is BambooGoalMilestone => Boolean(m))
    : [];

  const explicitPercent = asNumber(row.percentComplete);
  const percentComplete =
    milestones.length > 0
      ? (explicitPercent ?? derivePercentFromMilestones(milestones, 0))
      : (explicitPercent ?? 0);

  const actions: BambooGoalAction[] | undefined = Array.isArray(row.actions)
    ? (row.actions.filter((a) => asRecord(a)) as BambooGoalAction[])
    : undefined;

  return {
    id,
    employeeId: asString(row.employeeId) ?? employeeId,
    title,
    description: asString(row.description),
    dueDate: asString(row.dueDate) ?? null,
    percentComplete: Math.max(0, Math.min(100, percentComplete)),
    completionDate: asString(row.completionDate) ?? null,
    status: normalizeStatus(row.status),
    sharedWithEmployeeIds: asStringIds(row.sharedWithEmployeeIds),
    alignsWithOptionId: asString(row.alignsWithOptionId) ?? null,
    milestones,
    actions,
    rawStatus: asString(row.status),
    hasMilestones: milestones.length > 0,
  };
}

export function normalizeBambooGoalList(
  raw: unknown,
  employeeId: string,
): BambooGoal[] {
  const root = asRecord(raw);
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray(root?.goals)
      ? root!.goals
      : [];
  return list
    .map((item) => normalizeBambooGoal(item, employeeId))
    .filter((g): g is BambooGoal => Boolean(g));
}

export function normalizeShareOptions(raw: unknown): BambooGoalShareOption[] {
  const root = asRecord(raw);
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray(root?.options)
      ? root!.options
      : Array.isArray(root?.shareOptions)
        ? root!.shareOptions
        : Array.isArray(root?.employees)
          ? root!.employees
          : [];
  const out: BambooGoalShareOption[] = [];
  for (const item of list) {
    const row = asRecord(item);
    if (!row) continue;
    const employeeId =
      asString(row.employeeId) ??
      asString(row.id) ??
      asString(row.employee_id);
    if (!employeeId) continue;
    out.push({
      ...row,
      employeeId,
      displayName:
        asString(row.displayName) ??
        asString(row.name) ??
        ([asString(row.firstName), asString(row.lastName)]
          .filter(Boolean)
          .join(" ") ||
          undefined),
    });
  }
  return out;
}

export function normalizeAlignmentOptions(
  raw: unknown,
): BambooGoalAlignmentOption[] {
  const root = asRecord(raw);
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray(root?.alignsWithOptions)
      ? root!.alignsWithOptions
      : Array.isArray(root?.options)
        ? root!.options
        : Array.isArray(root?.alignmentOptions)
          ? root!.alignmentOptions
          : [];
  const out: BambooGoalAlignmentOption[] = [];
  for (const item of list) {
    const row = asRecord(item);
    if (!row) continue;
    const id = asString(row.id) ?? asString(row.optionId);
    if (!id) continue;
    out.push({
      ...row,
      id,
      title: asString(row.title) ?? asString(row.name),
    });
  }
  return out;
}

export function parseCanCreateGoals(raw: unknown): boolean {
  const root = asRecord(raw);
  if (!root) return false;
  if (typeof root.canCreateGoals === "boolean") return root.canCreateGoals;
  if (typeof root.canCreate === "boolean") return root.canCreate;
  return false;
}

export function milestoneSummary(goal: BambooGoal): string | null {
  if (!goal.hasMilestones) return null;
  const done = goal.milestones.filter((m) => m.completed).length;
  return `${done} of ${goal.milestones.length} milestones`;
}

export function ensureOwnerInSharedWith(
  ownerEmployeeId: string,
  sharedWithEmployeeIds: string[],
): string[] {
  const owner = String(ownerEmployeeId).trim();
  const ids = sharedWithEmployeeIds
    .map((id) => String(id).trim())
    .filter(Boolean);
  if (!owner) return [...new Set(ids)];
  if (!ids.includes(owner)) return [owner, ...ids];
  return [...new Set(ids)];
}
