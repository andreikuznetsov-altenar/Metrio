/** Shared Attention / summary tables: one issue inline, many as a count link. */
export function shouldShowInlineTaskIssue(issueCount: number): boolean {
  return issueCount === 1;
}

export function shouldShowTaskCountLink(issueCount: number): boolean {
  return issueCount > 1;
}
