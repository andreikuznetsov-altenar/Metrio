export function formatPersonTaskListModalTitle(
  personName: string,
  taskCount: number,
): string {
  const noun = taskCount === 1 ? "task" : "tasks";
  return `${personName}. ${taskCount} ${noun}.`;
}

export function formatTrendTaskListModalTitle(
  contextLabel: string,
  taskCount: number,
): string {
  const noun = taskCount === 1 ? "task" : "tasks";
  return `${contextLabel}. ${taskCount} ${noun}.`;
}

export function formatIssueCountLabel(count: number): string {
  const noun = count === 1 ? "issue" : "issues";
  return `${count} ${noun}`;
}

export function formatTaskCountLabel(count: number): string {
  const noun = count === 1 ? "task" : "tasks";
  return `${count} ${noun}`;
}
