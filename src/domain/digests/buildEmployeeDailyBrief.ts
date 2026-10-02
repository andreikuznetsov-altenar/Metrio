import type { JiraAssignmentState } from "../jira/jiraAssignmentTracking";
import { unreadJiraAssignments } from "../jira/jiraAssignmentTracking";
import type { EmployeePerformanceSnapshot } from "../performance";
import type { Person } from "../people/types";
import { buildDigestId } from "./digestIds";
import { finalizeDigest } from "./formatDigest";
import type { OperationalDigest } from "./digestTypes";
import { getLocalDateKey } from "../periods/dateRange";

export interface BuildEmployeeDailyBriefInput {
  selfPerson: Person;
  employeeSnapshot: EmployeePerformanceSnapshot | null;
  assignmentState: JiraAssignmentState;
  onboardingActionDue?: string;
  now?: Date;
}

export function buildEmployeeDailyBrief(
  input: BuildEmployeeDailyBriefInput,
): OperationalDigest {
  const now = input.now ?? new Date();
  const dateLabel = getLocalDateKey(now);
  const newAssignments = unreadJiraAssignments(input.assignmentState);
  const attention = input.employeeSnapshot?.myWeek.needsAttention ?? [];
  const sections = [];

  sections.push({
    id: "assignments",
    title: "New assignments",
    lines: newAssignments.length
      ? newAssignments.slice(0, 5).map((r) => `${r.issueKey} · ${r.title}`)
      : ["No new Jira assignments since you last checked."],
  });

  sections.push({
    id: "attention",
    title: "Work needing attention",
    lines: attention.length
      ? attention.slice(0, 6).map((a) => `${a.issueKey ?? "Task"} · ${a.reason}`)
      : ["No active work flagged for attention."],
  });

  const active = input.employeeSnapshot?.myWeek.inProgress.length ?? 0;
  const inReview = input.employeeSnapshot?.myWeek.inReview.length ?? 0;
  sections.push({
    id: "work",
    title: "Current work",
    lines: [
      `${active} in progress · ${inReview} in review`,
      `${input.employeeSnapshot?.myWeek.completedThisWeek.length ?? 0} completed this week`,
    ],
  });

  const timeOff = input.employeeSnapshot?.timeOff;
  sections.push({
    id: "time-off",
    title: "Upcoming time off",
    lines: timeOff
      ? [`${timeOff.headline} · ${timeOff.rangeLabel}`]
      : ["No upcoming leave on your calendar."],
  });

  const focus = input.employeeSnapshot?.attention ?? [];
  const bambooLines = focus
    .filter((f) => /bamboo|document|onboarding/i.test(f.reason))
    .slice(0, 4)
    .map((f) => f.reason);
  if (bambooLines.length) {
    sections.push({
      id: "bamboo",
      title: "Bamboo actions",
      lines: bambooLines,
    });
  }

  if (input.onboardingActionDue) {
    sections.push({
      id: "onboarding",
      title: "Onboarding",
      lines: [input.onboardingActionDue],
    });
  }

  const summaryLine =
    newAssignments.length > 0
      ? `${newAssignments.length} new assignment${newAssignments.length === 1 ? "" : "s"}`
      : attention.length > 0
        ? `${attention.length} item${attention.length === 1 ? "" : "s"} need attention`
        : "Your work is steady today";

  return finalizeDigest({
    kind: "daily",
    role: "employee",
    id: buildDigestId("daily", "employee", now),
    periodLabel: `Today · ${dateLabel}`,
    generatedAt: now.toISOString(),
    sinceLabel: "Since your previous daily brief",
    sections,
    summaryLine,
  });
}
