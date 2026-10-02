import type { Person } from "../../domain/people/types";
import {
  isJiraIssueKeyAccessible,
  isJiraProjectKeyAccessible,
} from "../../domain/goals/goalLinkedWork";
export async function searchIssuesQuick(
  query: string,
  persons: Person[],
): Promise<string[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const upper = trimmed.toUpperCase();
  if (/^[A-Z]+-\d+$/.test(upper)) {
    return isJiraIssueKeyAccessible(upper, persons) ? [upper] : [];
  }

  if (/^[A-Z]+$/.test(upper) && isJiraProjectKeyAccessible(upper, persons)) {
    return persons
      .flatMap((p) => p.issues)
      .filter((i) => i.issueKey.startsWith(`${upper}-`))
      .map((i) => i.issueKey)
      .slice(0, 8);
  }

  return persons
    .flatMap((p) => p.issues)
    .filter(
      (i) =>
        i.issueKey.toUpperCase().includes(upper) ||
        i.issueSummary.toLowerCase().includes(trimmed.toLowerCase()),
    )
    .map((i) => i.issueKey)
    .slice(0, 8);
}
