import type { CurrentUser } from "./types";
import { isManagerRole } from "./performance";

export function canOpenPersonDetail(
  currentUser: CurrentUser,
  personId: string,
): boolean {
  if (currentUser.person.id === personId) {
    return true;
  }

  if (!isManagerRole(currentUser.person.role) || !currentUser.team) {
    return false;
  }

  return currentUser.team.directReportIds.includes(personId);
}

/** Manager 1:1 brief — direct reports only (not self). */
export function canOpenPersonBrief(
  currentUser: CurrentUser,
  personId: string,
): boolean {
  if (currentUser.person.id === personId) {
    return false;
  }
  if (!isManagerRole(currentUser.person.role) || !currentUser.team) {
    return false;
  }
  return currentUser.team.directReportIds.includes(personId);
}
