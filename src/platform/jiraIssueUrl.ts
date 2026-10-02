export function buildJiraIssueBrowseUrl(jiraBaseUrl: string, issueKey: string): string {
  const base = jiraBaseUrl.trim().replace(/\/+$/, "");
  const key = issueKey.trim();
  if (!base || !key) {
    return "";
  }
  return `${base}/browse/${encodeURIComponent(key)}`;
}
