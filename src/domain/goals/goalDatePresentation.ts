import { format, parseISO } from "date-fns";
import type { BambooGoal } from "./bambooGoalTypes";

function formatGoalDate(iso: string | null | undefined): string | null {
  if (!iso?.trim()) return null;
  const slice = iso.trim().slice(0, 10);
  try {
    const d = parseISO(slice);
    if (Number.isNaN(d.getTime())) return null;
    return format(d, "d MMM yyyy");
  } catch {
    return null;
  }
}

export function formatGoalSetDateLabel(goal: BambooGoal): string | null {
  const formatted = formatGoalDate(goal.setDate);
  if (!formatted) return null;
  if (goal.startDateIsExplicit) {
    return `Started ${formatted}`;
  }
  return `Set ${formatted}`;
}

export function formatGoalDueDateLabel(
  goal: BambooGoal,
  now = new Date(),
): string | null {
  const formatted = formatGoalDate(goal.dueDate);
  if (!formatted) return null;
  const due = goal.dueDate?.slice(0, 10);
  const today = format(now, "yyyy-MM-dd");
  if (due && due < today && goal.percentComplete < 100 && goal.status === "in_progress") {
    return `Due ${formatted} · Overdue`;
  }
  return `Due ${formatted}`;
}

/** Compact metadata line for goal cards. */
export function formatGoalCardDateLine(goal: BambooGoal, now = new Date()): string {
  const setLabel = formatGoalSetDateLabel(goal);
  const dueLabel = formatGoalDueDateLabel(goal, now);
  if (setLabel && dueLabel) {
    return `${setLabel} · ${dueLabel}`;
  }
  if (dueLabel) return dueLabel;
  if (setLabel) return setLabel;
  if (goal.dueDate) return "Set date unavailable";
  return "Dates unavailable";
}
