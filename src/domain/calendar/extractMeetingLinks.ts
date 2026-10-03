const JIRA_KEY = /\b([A-Z][A-Z0-9]+-\d+)\b/g;
const CONFLUENCE_URL =
  /https:\/\/[a-z0-9.-]+\.atlassian\.net\/wiki\/[^\s)>"']+/gi;

export function extractJiraKeysFromText(text: string): string[] {
  const keys = new Set<string>();
  for (const match of text.matchAll(JIRA_KEY)) {
    keys.add(match[1]);
  }
  return [...keys];
}

export function extractConfluenceUrlsFromText(text: string): string[] {
  const urls = text.match(CONFLUENCE_URL) ?? [];
  return [...new Set(urls.map((u) => u.replace(/[.,;]+$/, "")))];
}
