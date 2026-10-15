import type { BambooGoal } from "../goals/bambooGoalTypes";
import type { Goal } from "../goals/goalTypes";

export interface BambooGoalsForHygiene {
  goals: BambooGoal[];
  /** Only "ready" / "empty" are authoritative; anything else means the list is unknown. */
  state: string;
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Newest goal CREATION date, or null when it cannot be determined reliably.
 *
 * - Bamboo goals count only through their CREATED date. A goal whose date came from an explicit
 *   Bamboo `startDate` has no known creation date, so the whole answer becomes unknown (we cannot
 *   prove nothing was added recently). Updates and progress changes are never used.
 * - Metrio-owned goals use their own `createdAt`.
 * - No goals at all → null (there is no creation date to measure from).
 */
export function lastGoalCreatedAt(input: {
  bamboo: BambooGoalsForHygiene | null;
  localGoals: Goal[];
  ownerPersonId: string;
}): Date | null {
  if (input.bamboo && input.bamboo.state !== "ready" && input.bamboo.state !== "empty") return null;
  const dates: Date[] = [];
  for (const goal of input.bamboo?.goals ?? []) {
    if (goal.startDateIsExplicit !== false) return null;
    const d = parseDate(goal.setDate);
    if (!d) return null;
    dates.push(d);
  }
  for (const goal of input.localGoals) {
    if (goal.ownerPersonId !== input.ownerPersonId || goal.scope !== "person") continue;
    const d = parseDate(goal.createdAt);
    if (!d) return null;
    dates.push(d);
  }
  if (dates.length === 0) return null;
  return new Date(Math.max(...dates.map((d) => d.getTime())));
}
