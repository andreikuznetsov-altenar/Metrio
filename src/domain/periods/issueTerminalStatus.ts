/** Statuses that end work without counting as KPI completion (cancelled, etc.). */
const TERMINAL_NON_COMPLETION_PATTERNS = [
  /\bcancel+ed\b/i,
  /\bm\.\s*cancel+ed\b/i,
];

export function normalizeIssueStatus(status: string): string {
  return (status || "").trim().replace(/\s+/g, " ");
}

export function isTerminalNonCompletionStatus(status: string): boolean {
  const normalized = normalizeIssueStatus(status);
  if (!normalized) return false;
  return TERMINAL_NON_COMPLETION_PATTERNS.some((pattern) =>
    pattern.test(normalized),
  );
}

export function isActiveWorkStatus(
  status: string,
  isCompleted: boolean,
): boolean {
  if (!normalizeIssueStatus(status)) return false;
  if (isCompleted) return false;
  if (isTerminalNonCompletionStatus(status)) return false;
  return true;
}
