import { isConfluenceUrl, parseConfluencePageFromUrl } from "../../platform/atlassianUrls";
import type { WorkKnowledgeLink } from "./workGraphTypes";
import { pageFromSummary } from "./workGraphTypes";
import type { ConfluencePageSummary } from "../../services/confluence/confluenceClient";

export interface JiraRemoteLink {
  issueKey: string;
  url: string;
  title?: string;
}

export function linksFromRemoteLinks(
  remoteLinks: JiraRemoteLink[],
  siteBaseUrl: string,
): WorkKnowledgeLink[] {
  const links: WorkKnowledgeLink[] = [];
  for (const remote of remoteLinks) {
    if (!isConfluenceUrl(remote.url)) continue;
    const { pageId, spaceKey } = parseConfluencePageFromUrl(remote.url);
    const id = pageId ?? remote.url;
    const pageSummary: ConfluencePageSummary = {
      id,
      title: remote.title?.trim() || "Linked documentation",
      spaceKey,
      url: remote.url.startsWith("http")
        ? remote.url
        : `${siteBaseUrl.replace(/\/+$/, "")}${remote.url}`,
    };
    links.push({
      id: `explicit:${remote.issueKey}:${id}`,
      confidence: "explicit_link",
      source: "jira",
      issueKey: remote.issueKey,
      page: pageFromSummary(pageSummary),
      label: "Explicitly linked",
    });
  }
  return links;
}
