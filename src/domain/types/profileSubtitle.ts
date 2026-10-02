import type { CurrentUser } from "../types";
import { roleLabel } from "../types";

export function profileSubtitle(currentUser: CurrentUser): string {
  const title = currentUser.jobTitle?.trim();
  if (title) return title;
  return roleLabel(currentUser.person.role);
}
