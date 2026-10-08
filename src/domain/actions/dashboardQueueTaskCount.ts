import type { ActionItem } from "./actionTypes";
import { shouldShowTaskCountLink } from "./taskIssueDisplayPolicy";

/** Context lines like "30 tasks" or "8 active tasks". */
export function isTaskCountContextLine(line: string): boolean {
  return /^\d+\s+(?:active\s+)?tasks$/i.test(line.trim());
}

export function uniqueIssueKeysForAction(item: ActionItem): string[] {
  return [...new Set((item.issueKeys ?? []).filter(Boolean))];
}

/**
 * Whether a queue row's task-count context should open TaskListModal.
 * Requires a backed issue collection (issueKeys) with count > 1.
 */
export function shouldLinkQueueTaskCount(
  item: ActionItem,
  contextLines: string[],
): boolean {
  const keys = uniqueIssueKeysForAction(item);
  if (!shouldShowTaskCountLink(keys.length)) return false;
  return contextLines.some(isTaskCountContextLine);
}

/** Context lines that remain after the interactive task-count label. */
export function queueTaskCountExtraContext(contextLines: string[]): string[] {
  return contextLines.filter((line) => !isTaskCountContextLine(line));
}
