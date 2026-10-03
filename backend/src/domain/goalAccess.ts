import type { AccessUser } from "../db/store.ts";
import type { GoalRecord } from "../routes/goalsTypes.ts";

export function canViewGoal(actor: AccessUser, goal: GoalRecord): boolean {
  if (goal.ownerPersonId === actor.bambooEmployeeId) return true;
  if (actor.role === "employee") return false;
  if (goal.scope === "team") {
    return actor.role === "lead" || actor.role === "director";
  }
  return actor.directReportIds.includes(goal.ownerPersonId);
}

export function canEditGoal(actor: AccessUser, goal: GoalRecord): boolean {
  if (goal.ownerPersonId === actor.bambooEmployeeId) {
    return true;
  }
  if (actor.role === "employee") return false;
  if (goal.scope === "team") {
    return actor.role === "lead" || actor.role === "director";
  }
  return actor.directReportIds.includes(goal.ownerPersonId);
}
