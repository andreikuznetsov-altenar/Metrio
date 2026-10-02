export function buildJiraProjectBrowseUrl(jiraBaseUrl: string, projectKey: string): string {
  const base = jiraBaseUrl.trim().replace(/\/+$/, "");
  const key = projectKey.trim();
  if (!base || !key) return "";
  return `${base}/browse/${encodeURIComponent(key)}`;
}

export function buildConfluenceSpaceUrl(siteBaseUrl: string, spaceKey: string): string {
  const base = siteBaseUrl.trim().replace(/\/+$/, "");
  const key = spaceKey.trim();
  if (!base || !key) return "";
  return `${base}/wiki/spaces/${encodeURIComponent(key)}`;
}

export function buildConfluencePageUrl(siteBaseUrl: string, pageId: string): string {
  const base = siteBaseUrl.trim().replace(/\/+$/, "");
  const id = pageId.trim();
  if (!base || !id) return "";
  return `${base}/wiki/pages/viewpage.action?pageId=${encodeURIComponent(id)}`;
}

export function parseConfluencePageFromUrl(url: string): { pageId?: string; spaceKey?: string } {
  try {
    const parsed = new URL(url);
    const pageId = parsed.searchParams.get("pageId");
    const spaceMatch = parsed.pathname.match(/\/spaces\/([^/]+)/);
    return {
      pageId: pageId ?? undefined,
      spaceKey: spaceMatch?.[1],
    };
  } catch {
    return {};
  }
}

export function isConfluenceUrl(url: string): boolean {
  return /\/wiki\//i.test(url) || /atlassian\.net\/wiki/i.test(url);
}
