export interface DashboardContextInput {
  newJiraAssignmentCount: number;
  activeJiraTaskCount: number;
  vacationLine?: string | null;
}

/** Full sentences for the Dashboard context line under the greeting. */
export function buildDashboardContextSummary(input: DashboardContextInput): string {
  const parts: string[] = [];

  if (input.newJiraAssignmentCount > 0) {
    const n = input.newJiraAssignmentCount;
    parts.push(
      `${n} new Jira assignment${n === 1 ? "" : "s"} ${n === 1 ? "is" : "are"} waiting for you.`,
    );
  }

  if (input.activeJiraTaskCount > 0) {
    const n = input.activeJiraTaskCount;
    parts.push(
      `${n} active Jira task${n === 1 ? "" : "s"} ${n === 1 ? "is" : "are"} currently assigned to you.`,
    );
  } else if (parts.length === 0) {
    parts.push("No active Jira tasks are currently assigned to you.");
  }

  if (input.vacationLine) {
    parts.push(input.vacationLine);
  }

  return parts.join(" ");
}

export function parseActiveJiraCount(activeSummaryValue: string): number {
  const parsed = Number.parseInt(activeSummaryValue.trim(), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}
