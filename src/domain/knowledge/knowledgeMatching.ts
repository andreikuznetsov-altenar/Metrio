import type { ConfluencePageSummary } from "../../services/confluence/confluenceClient";

export type KnowledgeConfidence = "related" | "suggested";

export interface KnowledgeContextItem {
  page: ConfluencePageSummary;
  confidence: KnowledgeConfidence;
  relatedIssueKey?: string;
}

const ISSUE_KEY = /\b[A-Z][A-Z0-9]+-\d+\b/;

export function cqlForIssueKey(issueKey: string): string {
  const safe = issueKey.replace(/"/g, '\\"');
  return `type=page AND text ~ "\\"${safe}\\""`;
}

export function matchPagesToIssue(
  issueKey: string,
  pages: ConfluencePageSummary[],
): KnowledgeContextItem[] {
  const keyUpper = issueKey.toUpperCase();
  return pages
    .filter((page) => {
      const titleHit = page.title.toUpperCase().includes(keyUpper);
      const bodyHint = page.excerpt?.toUpperCase().includes(keyUpper);
      return titleHit || bodyHint || page.title.match(ISSUE_KEY)?.[0] === keyUpper;
    })
    .map((page) => ({
      page,
      confidence: page.title.toUpperCase().includes(keyUpper) ? "related" : "related",
      relatedIssueKey: issueKey,
    }));
}

export function dedupeKnowledgeItems(items: KnowledgeContextItem[]): KnowledgeContextItem[] {
  const seen = new Set<string>();
  const out: KnowledgeContextItem[] = [];
  for (const item of items) {
    if (seen.has(item.page.id)) continue;
    seen.add(item.page.id);
    out.push(item);
  }
  return out;
}
