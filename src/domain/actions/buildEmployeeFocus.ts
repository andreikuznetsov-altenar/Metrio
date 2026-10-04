import type { PersonAnalyticsWorkspace } from "../analytics/personAnalyticsWorkspace";
import type { EmployeeMyWeekSnapshot } from "../performance";
import type { ActionItem } from "./actionTypes";
import { dedupeActions } from "./dedupeActions";
import { sortActionsByPriority } from "./actionPriority";

const MAX_FOCUS = 12;

export function buildEmployeeFocusActions(input: {
  workspace: PersonAnalyticsWorkspace;
  myWeek: EmployeeMyWeekSnapshot;
  selfPersonId: string;
}): ActionItem[] {
  const { workspace, myWeek, selfPersonId } = input;
  const items: ActionItem[] = [];

  for (const signal of workspace.attention.slice(0, 8)) {
    if (!signal.issueKey) continue;
    items.push({
      id: `focus-attention-${signal.issueKey}`,
      kind: "task_attention",
      severity: signal.variant === "danger" ? "critical" : "warning",
      title: signal.issueKey,
      description: signal.reason,
      issueKeys: [signal.issueKey],
      target: { kind: "jira", issueKey: signal.issueKey },
      source: "jira",
    });
  }

  for (const row of workspace.problematicWork.slice(0, 4)) {
    items.push({
      id: `focus-problem-${row.key}`,
      kind: "task_attention",
      severity: "critical",
      title: row.key,
      description: `${row.status} · ${row.stageAge}`,
      issueKeys: [row.key],
      target: { kind: "jira", issueKey: row.key },
      source: "jira",
    });
  }

  for (const row of myWeek.inReview.slice(0, 3)) {
    items.push({
      id: `focus-review-${row.key}`,
      kind: "review_bottleneck",
      severity: "info",
      title: row.key,
      description: `${row.status} · ${row.stageAge}`,
      issueKeys: [row.key],
      target: { kind: "jira", issueKey: row.key },
      source: "jira",
    });
  }

  const deduped = dedupeActions(items);
  const sorted = sortActionsByPriority(deduped);
  return sorted.slice(0, MAX_FOCUS).map((item) => ({
    ...item,
    personId: selfPersonId,
  }));
}
