import type { ConfluencePageSummary } from "../../services/confluence/confluenceClient";
import type { LinkConfidence } from "../workGraph/workGraphTypes";
import { confidenceLabel } from "../workGraph/workGraphTypes";

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

export function cqlForProjectInSpace(spaceKey: string, projectKey: string): string {
  const space = spaceKey.replace(/"/g, '\\"');
  const project = projectKey.replace(/"/g, '\\"');
  return `type=page AND space = "${space}" AND (title ~ "${project}" OR text ~ "${project}")`;
}

export function knowledgeRelationLabel(
  confidence: LinkConfidence,
  relatedIssueKey?: string,
): string {
  if (confidence === "explicit_link") return confidenceLabel(confidence);
  if (relatedIssueKey && confidence === "exact_issue_key") {
    return `Related to ${relatedIssueKey}`;
  }
  if (confidence === "contextual_search") return "Suggested documentation";
  return confidenceLabel(confidence);
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
