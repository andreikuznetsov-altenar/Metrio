import type { CommandResult } from "../../domain/commandPalette/commandResultTypes";
import {
  looksLikeIssueKey,
  normalizeIssueKeyQuery,
} from "../../domain/commandPalette/issueKeyPattern";
import { searchConfluencePages } from "../confluence/confluenceClient";
import type { ConfluenceClientConfig } from "../confluence/confluenceClient";
import type { JiraClient } from "../jira/jiraClient";

export const REMOTE_SEARCH_MIN_LENGTH = 2;

export const commandPaletteRemoteStats = {
  jiraIssueLookups: 0,
  jiraSearches: 0,
  confluenceSearches: 0,
};

function parseJiraIssue(raw: unknown): {
  key: string;
  summary: string;
  status?: string;
} | null {
  const issue = raw as {
    key?: string;
    fields?: { summary?: string; status?: { name?: string } };
  };
  if (!issue?.key) return null;
  return {
    key: issue.key,
    summary: issue.fields?.summary?.trim() || issue.key,
    status: issue.fields?.status?.name,
  };
}

function escapeJqlText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export interface RemoteCommandSearchInput {
  query: string;
  jira: JiraClient;
  confluenceConfig: ConfluenceClientConfig;
  knownIssueKeys: Set<string>;
  localConfluenceCount: number;
}

export interface RemoteCommandSearchResult {
  results: CommandResult[];
  jiraFailed: boolean;
  confluenceFailed: boolean;
}

export async function searchRemoteCommandPalette(
  input: RemoteCommandSearchInput,
): Promise<RemoteCommandSearchResult> {
  const query = input.query.trim();
  const results: CommandResult[] = [];
  let jiraFailed = false;
  let confluenceFailed = false;

  if (!query) {
    return { results, jiraFailed, confluenceFailed };
  }

  const issueKey = looksLikeIssueKey(query)
    ? normalizeIssueKeyQuery(query)
    : null;

  if (issueKey && !input.knownIssueKeys.has(issueKey)) {
    try {
      commandPaletteRemoteStats.jiraIssueLookups += 1;
      const raw = await input.jira.fetchIssueByKey(issueKey);
      const parsed = parseJiraIssue(raw);
      if (parsed) {
        results.push({
          id: `jira-remote-${parsed.key}`,
          type: "jira_issue",
          title: `${parsed.key} · ${parsed.summary}`,
          subtitle: "Open issue",
          meta: parsed.status,
          section: "jira",
          score: 995,
          target: { kind: "jira", issueKey: parsed.key },
        });
      }
    } catch {
      jiraFailed = true;
    }
  }

  if (query.length >= REMOTE_SEARCH_MIN_LENGTH && !issueKey) {
    try {
      commandPaletteRemoteStats.jiraSearches += 1;
      const escaped = escapeJqlText(query);
      const jql = `summary ~ "${escaped}*" OR text ~ "${escaped}*" ORDER BY updated DESC`;
      const issues = await input.jira.searchIssues(jql, 6);
      for (const raw of issues) {
        const parsed = parseJiraIssue(raw);
        if (!parsed || input.knownIssueKeys.has(parsed.key)) continue;
        results.push({
          id: `jira-remote-${parsed.key}`,
          type: "jira_issue",
          title: `${parsed.key} · ${parsed.summary}`,
          subtitle: "Jira search",
          meta: parsed.status,
          section: "jira",
          score: 320,
          target: { kind: "jira", issueKey: parsed.key },
        });
      }
    } catch {
      jiraFailed = true;
    }
  }

  if (
    query.length >= REMOTE_SEARCH_MIN_LENGTH &&
    input.localConfluenceCount < 4
  ) {
    try {
      commandPaletteRemoteStats.confluenceSearches += 1;
      const cql = `type = page AND text ~ "${escapeJqlText(query)}*"`;
      const pages = await searchConfluencePages(
        input.confluenceConfig,
        cql,
        5,
      );
      for (const page of pages) {
        results.push({
          id: `confluence-remote-${page.id}`,
          type: "confluence_page",
          title: page.title,
          subtitle: page.spaceName ?? page.spaceKey ?? "Confluence",
          meta: page.spaceName,
          section: "confluence",
          score: 280,
          target: { kind: "confluence", url: page.url, pageId: page.id },
        });
      }
    } catch {
      confluenceFailed = true;
    }
  }

  return { results, jiraFailed, confluenceFailed };
}

export function resetCommandPaletteRemoteStatsForTests(): void {
  commandPaletteRemoteStats.jiraIssueLookups = 0;
  commandPaletteRemoteStats.jiraSearches = 0;
  commandPaletteRemoteStats.confluenceSearches = 0;
}
