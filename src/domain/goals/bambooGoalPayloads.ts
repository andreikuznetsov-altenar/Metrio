import type {
  BambooCreateGoalInput,
  BambooUpdateGoalInput,
} from "./bambooGoalTypes";
import { ensureOwnerInSharedWith } from "./normalizeBambooGoal";

export class BambooGoalValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BambooGoalValidationError";
  }
}

export function buildCreateGoalBody(
  ownerEmployeeId: string,
  input: BambooCreateGoalInput,
): Record<string, unknown> {
  const title = String(input.title || "").trim();
  if (!title) {
    throw new BambooGoalValidationError("Title is required");
  }
  const dueDate = String(input.dueDate || "").trim();
  if (!dueDate) {
    throw new BambooGoalValidationError("Due date is required");
  }

  const sharedWithEmployeeIds = ensureOwnerInSharedWith(
    ownerEmployeeId,
    input.sharedWithEmployeeIds ?? [],
  );
  if (sharedWithEmployeeIds.length === 0) {
    throw new BambooGoalValidationError(
      "sharedWithEmployeeIds must include the goal owner",
    );
  }

  const milestones = (input.milestones ?? [])
    .map((m) => ({ title: String(m.title || "").trim() }))
    .filter((m) => m.title);

  const body: Record<string, unknown> = {
    title,
    dueDate,
    sharedWithEmployeeIds: sharedWithEmployeeIds.map((id) => Number(id) || id),
  };

  const description = String(input.description || "").trim();
  if (description) body.description = description;

  if (input.alignsWithOptionId) {
    body.alignsWithOptionId =
      Number(input.alignsWithOptionId) || input.alignsWithOptionId;
  }

  if (milestones.length > 0) {
    body.milestones = milestones;
    return body;
  }

  const percent =
    typeof input.percentComplete === "number" &&
    Number.isFinite(input.percentComplete)
      ? Math.max(0, Math.min(100, Math.round(input.percentComplete)))
      : 0;
  body.percentComplete = percent;
  if (percent === 100) {
    const completionDate = String(input.completionDate || "").trim();
    if (!completionDate) {
      throw new BambooGoalValidationError(
        "completionDate is required when percentComplete is 100",
      );
    }
    body.completionDate = completionDate;
  }

  return body;
}

export function buildUpdateGoalBody(
  ownerEmployeeId: string,
  input: BambooUpdateGoalInput,
): Record<string, unknown> {
  const title = String(input.title || "").trim();
  if (!title) {
    throw new BambooGoalValidationError("Title is required");
  }
  const dueDate = String(input.dueDate || "").trim();
  if (!dueDate) {
    throw new BambooGoalValidationError("Due date is required");
  }

  const sharedWithEmployeeIds = ensureOwnerInSharedWith(
    ownerEmployeeId,
    input.sharedWithEmployeeIds ?? [],
  );
  if (sharedWithEmployeeIds.length === 0) {
    throw new BambooGoalValidationError(
      "sharedWithEmployeeIds must include the goal owner",
    );
  }

  const body: Record<string, unknown> = {
    title,
    dueDate,
    sharedWithEmployeeIds: sharedWithEmployeeIds.map((id) => Number(id) || id),
  };

  if (input.description !== undefined) {
    body.description = String(input.description || "").trim();
  }
  if (input.alignsWithOptionId !== undefined) {
    body.alignsWithOptionId = input.alignsWithOptionId
      ? Number(input.alignsWithOptionId) || input.alignsWithOptionId
      : null;
  }

  // Only append NEW milestones when explicitly provided.
  if (input.milestones && input.milestones.length > 0) {
    body.milestones = input.milestones
      .map((m) => ({ title: String(m.title || "").trim() }))
      .filter((m) => m.title);
  }

  return body;
}

export function buildSimpleProgressBody(
  percentComplete: number,
  completionDate?: string | null,
): Record<string, unknown> {
  const percent = Math.max(0, Math.min(100, Math.round(percentComplete)));
  const body: Record<string, unknown> = { percentComplete: percent };
  if (percent === 100) {
    const date = String(completionDate || "").trim();
    if (!date) {
      throw new BambooGoalValidationError(
        "completionDate is required when percentComplete is 100",
      );
    }
    body.completionDate = date;
  }
  return body;
}
