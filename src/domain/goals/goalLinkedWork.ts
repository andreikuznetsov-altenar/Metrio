import type { Person } from "../people/types";
import { resolveWorkflowProfile } from "../workflows/resolveWorkflowProfile";
import { resolveWorkflowStage } from "../workflows/resolveWorkflowStage";
import type { Goal } from "./goalTypes";

export interface LinkedWorkContext {
  linkedIssueCount: number;
  completedCount: number;
  inReviewCount: number;
  activeCount: number;
  issueKeysSample: string[];
  linkedWorkCompletionLabel?: string;
}

function issueMatchesGoal(issueKey: string, goal: Goal): boolean {
  const upper = issueKey.toUpperCase();
  if (goal.linkedJiraIssueKeys.some((k) => k.toUpperCase() === upper)) {
    return true;
  }
  const project = upper.split("-")[0];
  return goal.linkedJiraProjectKeys.some(
    (pk) => pk.toUpperCase() === project,
  );
}

export function buildLinkedWorkContext(
  goal: Goal,
  person: Person | null,
): LinkedWorkContext {
  const issues =
    person?.issues.filter((issue) =>
      issueMatchesGoal(issue.issueKey, goal),
    ) ?? [];

  let completedCount = 0;
  let inReviewCount = 0;
  let activeCount = 0;
  for (const issue of issues) {
    const stage = resolveWorkflowStage(
      resolveWorkflowProfile(issue),
      issue.currentStatus ?? "",
    );
    if (stage.isCompletion) {
      completedCount += 1;
    } else if (stage.countsAsReview) {
      inReviewCount += 1;
    } else if (stage.countsAsActiveWork) {
      activeCount += 1;
    }
  }

  const linkedIssueCount = issues.length;
  const issueKeysSample = issues.slice(0, 6).map((i) => i.issueKey);

  let linkedWorkCompletionLabel: string | undefined;
  if (
    goal.progressMode === "linked_issue_count" &&
    goal.linkedJiraIssueKeys.length > 0
  ) {
    const total = goal.linkedJiraIssueKeys.length;
    const completedLinked = goal.linkedJiraIssueKeys.filter((key) =>
      issues.some(
        (i) =>
          i.issueKey.toUpperCase() === key.toUpperCase() &&
          resolveWorkflowStage(
            resolveWorkflowProfile(i),
            i.currentStatus ?? "",
          ).isCompletion,
      ),
    ).length;
    linkedWorkCompletionLabel = `Linked work completion: ${completedLinked}/${total}`;
  }

  return {
    linkedIssueCount,
    completedCount,
    inReviewCount,
    activeCount,
    issueKeysSample,
    linkedWorkCompletionLabel,
  };
}

export function isJiraIssueKeyAccessible(
  issueKey: string,
  persons: Person[],
): boolean {
  const upper = issueKey.toUpperCase();
  return persons.some((person) =>
    person.issues.some((issue) => issue.issueKey.toUpperCase() === upper),
  );
}

export function isJiraProjectKeyAccessible(
  projectKey: string,
  persons: Person[],
): boolean {
  const upper = projectKey.toUpperCase();
  return persons.some((person) =>
    person.issues.some((issue) =>
      issue.issueKey.toUpperCase().startsWith(`${upper}-`),
    ),
  );
}
