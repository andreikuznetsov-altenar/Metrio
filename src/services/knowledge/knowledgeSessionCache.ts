import type { ConfluencePageSummary } from "../confluence/confluenceClient";

interface CacheEntry<T> {
  value: T;
  storedAt: number;
}

const TTL_MS = 30 * 60 * 1000;
const searchCache = new Map<string, CacheEntry<ConfluencePageSummary[]>>();
let datasetGeneration = 0;

export function bumpKnowledgeDatasetGeneration(): void {
  datasetGeneration += 1;
  searchCache.clear();
}

export function currentKnowledgeDatasetGeneration(): number {
  return datasetGeneration;
}

export function knowledgeSearchCacheKey(parts: {
  spaceKey?: string;
  issueKey?: string;
  projectKey?: string;
  query: string;
}): string {
  return [
    `g${datasetGeneration}`,
    parts.spaceKey ?? "-",
    parts.issueKey ?? "-",
    parts.projectKey ?? "-",
    parts.query,
  ].join("|");
}

export function getCachedConfluenceSearch(
  key: string,
): ConfluencePageSummary[] | undefined {
  const entry = searchCache.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.storedAt > TTL_MS) {
    searchCache.delete(key);
    return undefined;
  }
  return entry.value;
}

export function setCachedConfluenceSearch(
  key: string,
  pages: ConfluencePageSummary[],
): void {
  searchCache.set(key, { value: pages, storedAt: Date.now() });
}

export function clearKnowledgeSessionCache(): void {
  searchCache.clear();
}
