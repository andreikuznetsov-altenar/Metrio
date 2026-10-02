import { cqlForIssueKey, cqlForProjectInSpace } from "../../domain/knowledge/knowledgeMatching";
import { linksFromRemoteLinks, type JiraRemoteLink } from "../../domain/workGraph/explicitLinks";
import { projectKeyFromIssueKey } from "../../domain/workGraph/issueProjectKey";
import type { WorkKnowledgeLink } from "../../domain/workGraph/workGraphTypes";
import { pageFromSummary } from "../../domain/workGraph/workGraphTypes";
import type { ConfluenceClientConfig } from "../confluence/confluenceClient";
import { searchConfluencePages } from "../confluence/confluenceClient";
import {
  getCachedConfluenceSearch,
  knowledgeSearchCacheKey,
  setCachedConfluenceSearch,
} from "./knowledgeSessionCache";

const DEFAULT_CONCURRENCY = 4;

export async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const current = index++;
      results[current] = await fn(items[current]);
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () =>
    worker(),
  );
  await Promise.all(workers);
  return results;
}

async function searchScoped(
  config: ConfluenceClientConfig,
  cql: string,
  cacheParts: {
    spaceKey?: string;
    issueKey?: string;
    projectKey?: string;
    query: string;
  },
  limit = 5,
): Promise<WorkKnowledgeLink[]> {
  const cacheKey = knowledgeSearchCacheKey({ ...cacheParts, query: cql });
  const cached = getCachedConfluenceSearch(cacheKey);
  const pages =
    cached ??
    (await searchConfluencePages(config, cql, limit).catch(() => []));
  if (!cached) {
    setCachedConfluenceSearch(cacheKey, pages);
  }
  const confidence =
    cacheParts.issueKey
      ? "exact_issue_key"
      : cacheParts.projectKey
        ? "exact_project_key"
        : "contextual_search";
  return pages.map((page) => ({
    id: `search:${cacheParts.issueKey ?? cacheParts.projectKey}:${page.id}`,
    confidence,
    source: "confluence",
    issueKey: cacheParts.issueKey,
    projectKey: cacheParts.projectKey,
    page: pageFromSummary(page),
  }));
}

export async function resolveIssueKnowledgeBatch(input: {
  config: ConfluenceClientConfig;
  siteBaseUrl: string;
  issueKeys: string[];
  remoteLinks: JiraRemoteLink[];
  projectSpaceByKey: Record<string, string>;
  concurrency?: number;
}): Promise<Map<string, WorkKnowledgeLink[]>> {
  const byIssue = new Map<string, WorkKnowledgeLink[]>();
  const explicit = linksFromRemoteLinks(input.remoteLinks, input.siteBaseUrl);
  for (const link of explicit) {
    if (!link.issueKey) continue;
    const list = byIssue.get(link.issueKey) ?? [];
    list.push(link);
    byIssue.set(link.issueKey, list);
  }

  const keysNeedingSearch = input.issueKeys.filter((key) => {
    const existing = byIssue.get(key) ?? [];
    return existing.length < 3;
  });

  const concurrency = input.concurrency ?? DEFAULT_CONCURRENCY;
  await mapWithConcurrency(keysNeedingSearch, concurrency, async (issueKey) => {
    const projectKey = projectKeyFromIssueKey(issueKey);
    const spaceKey = projectKey ? input.projectSpaceByKey[projectKey] ?? projectKey : undefined;
    const cql = spaceKey
      ? `space = "${spaceKey}" AND (${cqlForIssueKey(issueKey).replace(/^type=page AND /, "")})`
      : cqlForIssueKey(issueKey);
    const found = await searchScoped(
      input.config,
      cql,
      { spaceKey, issueKey, query: issueKey },
      3,
    );
    const merged = [...(byIssue.get(issueKey) ?? []), ...found];
    byIssue.set(issueKey, dedupeLinks(merged).slice(0, 5));
  });

  return byIssue;
}

export async function resolveProjectKnowledge(input: {
  config: ConfluenceClientConfig;
  projectKey: string;
  spaceKey: string;
  department?: string;
  limit?: number;
}): Promise<WorkKnowledgeLink[]> {
  const cql = cqlForProjectInSpace(input.spaceKey, input.projectKey);
  const links = await searchScoped(
    input.config,
    cql,
    {
      spaceKey: input.spaceKey,
      projectKey: input.projectKey,
      query: input.projectKey,
    },
    input.limit ?? 5,
  );
  return links.map((link) => ({
    ...link,
    confidence: "explicit_project_space",
    projectKey: input.projectKey,
  }));
}

function dedupeLinks(links: WorkKnowledgeLink[]): WorkKnowledgeLink[] {
  const seen = new Set<string>();
  const rank: Record<WorkKnowledgeLink["confidence"], number> = {
    explicit_link: 0,
    exact_issue_key: 1,
    explicit_project_space: 2,
    exact_project_key: 3,
    contextual_search: 4,
  };
  const sorted = [...links].sort(
    (a, b) => rank[a.confidence] - rank[b.confidence],
  );
  const out: WorkKnowledgeLink[] = [];
  for (const link of sorted) {
    if (seen.has(link.page.id)) continue;
    seen.add(link.page.id);
    out.push(link);
  }
  return out;
}
