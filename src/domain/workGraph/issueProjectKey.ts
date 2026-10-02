const ISSUE_KEY = /^([A-Z][A-Z0-9]+)-\d+$/;

export function projectKeyFromIssueKey(issueKey: string): string | null {
  const match = issueKey.trim().match(ISSUE_KEY);
  return match?.[1] ?? null;
}
