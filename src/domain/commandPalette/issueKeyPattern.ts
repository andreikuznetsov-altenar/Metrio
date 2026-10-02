const ISSUE_KEY_RE = /^[A-Z][A-Z0-9]+-\d+$/i;

export function normalizeIssueKeyQuery(query: string): string {
  return query.trim().toUpperCase();
}

export function looksLikeIssueKey(query: string): boolean {
  const normalized = normalizeIssueKeyQuery(query);
  if (!normalized) return false;
  return ISSUE_KEY_RE.test(normalized);
}
