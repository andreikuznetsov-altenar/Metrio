import type { ActionItem, ActionSeverity } from "./actionTypes";
import { sortActionsByPriority } from "./actionPriority";
import {
  mergeReasonTags,
  presentationContextLinesForItem,
  presentationReasonTagsForItem,
  presentationSubjectForItem,
} from "./actionPresentation";
export interface DashboardQueueRow {
  id: string;
  /** Primary source action for navigation and CTA labels. */
  item: ActionItem;
  /** Stable order from source action list (pre-merge). */
  priorityIndex: number;
  subject: string;
  reasonTags: string[];
  contextLines: string[];
  severity: ActionSeverity;
}

const SEVERITY_RANK: Record<ActionSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

/** Aggregated task-driven queue rows (e.g. "12 tasks in Review for 7+ days"). */
export function isGroupedTeamActionItem(item: ActionItem): boolean {
  return item.kind === "review_bottleneck" && (item.count ?? 0) > 1;
}

export function dashboardQueueRowTier(item: ActionItem): 0 | 1 | 2 {
  if (isGroupedTeamActionItem(item)) return 0;
  if (item.personId) return 2;
  return 1;
}

export function compareDashboardQueueRows(a: DashboardQueueRow, b: DashboardQueueRow): number {
  const tierDiff = dashboardQueueRowTier(a.item) - dashboardQueueRowTier(b.item);
  if (tierDiff !== 0) return tierDiff;
  return a.priorityIndex - b.priorityIndex;
}

/** Keeps grouped task rows before person rows after optional column sorting. */
export function stabilizeDashboardQueueRowOrder(rows: DashboardQueueRow[]): DashboardQueueRow[] {
  const grouped: DashboardQueueRow[] = [];
  const task: DashboardQueueRow[] = [];
  const person: DashboardQueueRow[] = [];
  for (const row of rows) {
    const tier = dashboardQueueRowTier(row.item);
    if (tier === 0) grouped.push(row);
    else if (tier === 2) person.push(row);
    else task.push(row);
  }
  const byPriority = (list: DashboardQueueRow[]) =>
    [...list].sort((a, b) => a.priorityIndex - b.priorityIndex);
  return [...byPriority(grouped), ...byPriority(task), ...byPriority(person)];
}

function maxSeverity(items: ActionItem[]): ActionSeverity {
  return items.reduce<ActionSeverity>(
    (best, item) =>
      SEVERITY_RANK[item.severity] < SEVERITY_RANK[best] ? item.severity : best,
    "info",
  );
}

function pickPrimaryItem(items: ActionItem[]): ActionItem {
  const sorted = sortActionsByPriority(items);
  return sorted[0] ?? items[0]!;
}

function mergeContextLines(items: ActionItem[]): string[] {
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const item of items) {
    for (const line of presentationContextLinesForItem(item)) {
      const key = line.trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      lines.push(line);
    }
  }
  return lines;
}

function mergeJiraIssueRows(
  issueKey: string,
  items: ActionItem[],
  priorityIndex: number,
): DashboardQueueRow {
  const primary = pickPrimaryItem(items);
  const reasonTags = mergeReasonTags(
    items.flatMap((item) => presentationReasonTagsForItem(item)),
  );
  const contextLines = mergeContextLines(items);
  return {
    id: `dashboard-jira:${issueKey}`,
    item: { ...primary, issueKeys: [issueKey], title: issueKey },
    priorityIndex,
    subject: issueKey,
    reasonTags,
    contextLines,
    severity: maxSeverity(items),
  };
}

function singleItemRow(item: ActionItem, priorityIndex: number): DashboardQueueRow {
  return {
    id: `dashboard:${item.id}`,
    item,
    priorityIndex,
    subject: presentationSubjectForItem(item),
    reasonTags: presentationReasonTagsForItem(item),
    contextLines: presentationContextLinesForItem(item),
    severity: item.severity,
  };
}

/** Dashboard queue presentation: one row per Jira issue, merged reasons/context. */
export function buildDashboardQueueRows(actions: ActionItem[]): DashboardQueueRow[] {
  const jiraGroups = new Map<string, { items: ActionItem[]; priorityIndex: number }>();
  const standalone: { item: ActionItem; priorityIndex: number }[] = [];

  actions.forEach((item, index) => {
    if (item.target.kind === "jira") {
      const issueKey = item.target.issueKey;
      const group = jiraGroups.get(issueKey);
      if (group) {
        group.items.push(item);
        group.priorityIndex = Math.min(group.priorityIndex, index);
      } else {
        jiraGroups.set(issueKey, { items: [item], priorityIndex: index });
      }
      return;
    }
    standalone.push({ item, priorityIndex: index });
  });

  const rows: DashboardQueueRow[] = [];
  for (const [issueKey, group] of jiraGroups) {
    rows.push(mergeJiraIssueRows(issueKey, group.items, group.priorityIndex));
  }
  for (const entry of standalone) {
    rows.push(singleItemRow(entry.item, entry.priorityIndex));
  }

  return rows.sort(compareDashboardQueueRows);
}

export function reasonTagSortRank(tags: string[]): number {
  const order = [
    "Blocked",
    "Problematic",
    "No activity",
    "Long Review",
    "Overloaded",
    "Upcoming leave",
    "Leave delivery risk",
    "Feedback pending",
    "Delivery dependency",
    "Knowledge gap",
    "Knowledge",
    "Needs attention",
  ];
  let best = order.length;
  for (const tag of tags) {
    const idx = order.indexOf(tag);
    if (idx >= 0 && idx < best) best = idx;
  }
  return best;
}
