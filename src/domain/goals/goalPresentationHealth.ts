import type { BadgeVariant } from "../../components/Badge/Badge";
import type { BambooGoal } from "./bambooGoalTypes";

export type GoalPresentationHealth =
  | "on_track"
  | "watch"
  | "at_risk"
  | "completed"
  | "closed"
  | "unknown";

export interface GoalPresentationStatus {
  health: GoalPresentationHealth;
  label: string;
  badgeVariant: BadgeVariant;
  /** Schedule health only — null for terminal / unknown schedule */
  scheduleHealth: GoalPresentationHealth | null;
}

function parseDateOnly(value: string | null | undefined): Date | null {
  if (!value?.trim()) return null;
  const iso = value.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const d = new Date(`${iso}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function calendarDaysBetween(a: Date, b: Date): number {
  const ms = b.getTime() - a.getTime();
  return ms / (24 * 60 * 60 * 1000);
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

/**
 * Linear schedule model for active goals — presentation only, not written to Bamboo.
 */
export function computeGoalScheduleHealth(
  goal: BambooGoal,
  now: Date,
): GoalPresentationHealth | null {
  if (goal.status === "completed" || goal.percentComplete >= 100) {
    return "completed";
  }
  if (goal.status === "closed") {
    return "closed";
  }
  if (goal.status !== "in_progress") {
    return null;
  }

  const start = parseDateOnly(goal.setDate);
  const due = parseDateOnly(goal.dueDate);
  const actual = goal.percentComplete;

  if (!due) {
    return null;
  }

  const nowMs = now.getTime();
  const dueMs = due.getTime();

  if (nowMs > dueMs && actual < 100) {
    return "at_risk";
  }

  if (!start) {
    return null;
  }

  const startMs = start.getTime();
  if (startMs > nowMs) {
    return "on_track";
  }

  const totalMs = dueMs - startMs;
  if (totalMs <= 0) {
    if (actual < 100 && nowMs > dueMs) return "at_risk";
    return actual >= 100 ? "on_track" : "watch";
  }

  const elapsedRatio = clamp01((nowMs - startMs) / totalMs);
  const expectedProgress = elapsedRatio * 100;
  const progressDelta = actual - expectedProgress;
  const daysToDue = calendarDaysBetween(now, due);

  if (progressDelta <= -25) {
    return "at_risk";
  }

  if (
    daysToDue <= 7 &&
    daysToDue >= 0 &&
    actual < 75
  ) {
    return "at_risk";
  }

  if (progressDelta <= -10 && progressDelta > -25) {
    return "watch";
  }

  if (daysToDue <= 14 && daysToDue >= 0 && progressDelta < 0) {
    return "watch";
  }

  return "on_track";
}

const HEALTH_LABEL: Record<GoalPresentationHealth, string> = {
  on_track: "On track",
  watch: "Watch",
  at_risk: "At risk",
  completed: "Completed",
  closed: "Closed",
  unknown: "Unknown",
};

const HEALTH_VARIANT: Record<GoalPresentationHealth, BadgeVariant> = {
  on_track: "success",
  watch: "warning",
  at_risk: "danger",
  completed: "success",
  closed: "neutral",
  unknown: "neutral",
};

export function resolveGoalPresentationStatus(
  goal: BambooGoal,
  now = new Date(),
): GoalPresentationStatus {
  if (goal.status === "completed" || goal.percentComplete >= 100) {
    return {
      health: "completed",
      label: HEALTH_LABEL.completed,
      badgeVariant: HEALTH_VARIANT.completed,
      scheduleHealth: null,
    };
  }
  if (goal.status === "closed") {
    return {
      health: "closed",
      label: HEALTH_LABEL.closed,
      badgeVariant: HEALTH_VARIANT.closed,
      scheduleHealth: null,
    };
  }

  const schedule = computeGoalScheduleHealth(goal, now);
  if (!schedule || schedule === "completed" || schedule === "closed") {
    const lifecycle =
      goal.status === "in_progress"
        ? { health: "unknown" as const, label: "In progress" }
        : { health: "unknown" as const, label: goal.rawStatus || "Unknown" };
    return {
      health: lifecycle.health,
      label: lifecycle.label,
      badgeVariant: "neutral",
      scheduleHealth: null,
    };
  }

  return {
    health: schedule,
    label: HEALTH_LABEL[schedule],
    badgeVariant: HEALTH_VARIANT[schedule],
    scheduleHealth: schedule,
  };
}
