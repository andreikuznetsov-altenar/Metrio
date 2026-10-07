import { projectKeyFromIssueKey } from "../workGraph/issueProjectKey";
import type { DependencyDirection, DependencyType } from "./dependencyTypes";

export interface ParsedIssueSnapshot {
  key: string;
  summary: string;
  status: string;
  issueTypeName: string;
  dueDate?: string;
  parentKey?: string;
}

export interface ParsedLinkEdge {
  sourceKey: string;
  targetKey: string;
  type: DependencyType;
  direction: DependencyDirection;
  jiraLinkTypeName: string;
}

function safeFields(issue: unknown): Record<string, unknown> | null {
  if (!issue || typeof issue !== "object") return null;
  const fields = (issue as { fields?: unknown }).fields;
  return fields && typeof fields === "object" ? (fields as Record<string, unknown>) : null;
}

export function snapshotFromRawIssue(issue: unknown): ParsedIssueSnapshot | null {
  if (!issue || typeof issue !== "object") return null;
  const key = (issue as { key?: string }).key;
  if (!key) return null;
  const fields = safeFields(issue);
  const summary = String(fields?.summary ?? "");
  const status =
    (fields?.status as { name?: string } | undefined)?.name?.toString() ?? "";
  const issueTypeName =
    (fields?.issuetype as { name?: string } | undefined)?.name?.toString() ?? "";
  const dueDate =
    typeof fields?.duedate === "string" ? fields.duedate : undefined;
  const parentKey = (fields?.parent as { key?: string } | undefined)?.key;
  return { key, summary, status, issueTypeName, dueDate, parentKey };
}

function normalizeLinkType(name: string): DependencyType {
  const n = name.trim().toLowerCase();
  if (n.includes("block")) {
    return "blocks";
  }
  if (n.includes("depend")) {
    return "explicit_dependency";
  }
  if (n.includes("duplicate") || n.includes("clone") || n.includes("relate")) {
    return "related";
  }
  return "related";
}

function isBlockingType(type: DependencyType): boolean {
  return type === "blocks" || type === "blocked_by" || type === "explicit_dependency";
}

export function isBlockingDependencyType(type: DependencyType): boolean {
  return isBlockingType(type);
}

/**
 * Parse issuelinks on one issue into directed edges (source → target semantics for delivery).
 */
export function parseIssueLinkEdges(
  issueKey: string,
  issue: unknown,
): ParsedLinkEdge[] {
  const fields = safeFields(issue);
  const links = fields?.issuelinks;
  if (!Array.isArray(links)) return [];

  const edges: ParsedLinkEdge[] = [];
  for (const link of links) {
    if (!link || typeof link !== "object") continue;
    const typeName = String((link as { type?: { name?: string } }).type?.name ?? "");
    const normalized = normalizeLinkType(typeName);
    const outward = (link as { outwardIssue?: { key?: string } }).outwardIssue?.key;
    const inward = (link as { inwardIssue?: { key?: string } }).inwardIssue?.key;

    if (outward && inward) {
      // Both ends present — determine orientation relative to current issue
      if (inward === issueKey) {
        edges.push({
          sourceKey: issueKey,
          targetKey: outward,
          type: normalized === "blocks" ? "blocked_by" : normalized,
          direction: "inward",
          jiraLinkTypeName: typeName,
        });
      } else if (outward === issueKey) {
        edges.push({
          sourceKey: issueKey,
          targetKey: inward,
          type: normalized,
          direction: "outward",
          jiraLinkTypeName: typeName,
        });
      }
      continue;
    }

    if (outward && outward !== issueKey) {
      edges.push({
        sourceKey: issueKey,
        targetKey: outward,
        type: normalized === "blocks" ? "blocked_by" : normalized,
        direction: "inward",
        jiraLinkTypeName: typeName,
      });
    }
    if (inward && inward !== issueKey) {
      edges.push({
        sourceKey: issueKey,
        targetKey: inward,
        type: normalized,
        direction: "outward",
        jiraLinkTypeName: typeName,
      });
    }
  }
  return edges;
}

export function parseParentChildEdge(snapshot: ParsedIssueSnapshot): ParsedLinkEdge | null {
  if (!snapshot.parentKey) return null;
  return {
    sourceKey: snapshot.key,
    targetKey: snapshot.parentKey,
    type: "parent_child",
    direction: "outward",
    jiraLinkTypeName: "Parent",
  };
}

export function projectForKey(issueKey: string): string {
  return projectKeyFromIssueKey(issueKey) ?? issueKey.split("-")[0] ?? "";
}
