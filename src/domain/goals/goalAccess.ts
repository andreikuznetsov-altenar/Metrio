import type { CurrentUser } from "../types";
import { isManagerRole } from "../performance";
import type { Goal } from "./goalTypes";

export function directReportIds(currentUser: CurrentUser): string[] {
  return currentUser.team?.directReportIds ?? [];
}

export function canViewGoal(
  currentUser: CurrentUser,
  goal: Goal,
): boolean {
  if (goal.ownerPersonId === currentUser.person.id) {
    return true;
  }
  if (!isManagerRole(currentUser.person.role)) {
    return false;
  }
  if (goal.scope === "team") {
    return Boolean(currentUser.team);
  }
  return directReportIds(currentUser).includes(goal.ownerPersonId);
}

export function canEditGoalStructure(
  currentUser: CurrentUser,
  goal: Goal,
): boolean {
  if (goal.ownerPersonId === currentUser.person.id) {
    return isManagerRole(currentUser.person.role);
  }
  if (!isManagerRole(currentUser.person.role)) {
    return false;
  }
  if (goal.scope === "team") {
    return Boolean(currentUser.team);
  }
  return directReportIds(currentUser).includes(goal.ownerPersonId);
}

export function canCreateGoalForOwner(
  currentUser: CurrentUser,
  ownerPersonId: string,
  scope: Goal["scope"],
): boolean {
  if (scope === "team") {
    return isManagerRole(currentUser.person.role) && Boolean(currentUser.team);
  }
  if (ownerPersonId === currentUser.person.id) {
    return true;
  }
  if (!isManagerRole(currentUser.person.role)) {
    return false;
  }
  return directReportIds(currentUser).includes(ownerPersonId);
}

export function canUpdateManualProgress(
  currentUser: CurrentUser,
  goal: Goal,
): boolean {
  if (!goal.employeeMayEditManualProgress) {
    return canEditGoalStructure(currentUser, goal);
  }
  if (goal.ownerPersonId === currentUser.person.id) {
    return goal.status === "active" || goal.status === "paused";
  }
  return canEditGoalStructure(currentUser, goal);
}

export function listVisibleGoals(
  goals: Goal[],
  currentUser: CurrentUser,
): Goal[] {
  return goals.filter((goal) => canViewGoal(currentUser, goal));
}
