import { resolveWorkflowProfile } from "../workflows/resolveWorkflowProfile";
import { resolveWorkflowStage } from "../workflows/resolveWorkflowStage";
import { getActiveIssues } from "../radar/taskSignals";
import type { Person, TeamSnapshot } from "../people/types";
import type {
  DeliveryDependencyIndex,
  DependencyChainLink,
  DependencyFanOut,
  WorkDependency,
} from "./dependencyTypes";
import {
  isBlockingDependencyType,
  parseIssueLinkEdges,
  parseParentChildEdge,
  projectForKey,
  snapshotFromRawIssue,
  type ParsedIssueSnapshot,
} from "./parseJiraIssueLinks";
import { buildDependencyChains } from "./dependencyTraversal";

export const MAX_CHAIN_DEPTH = 3;
export const MAX_CHAIN_NODES = 40;

export function emptyDependencyIndex(now = new Date()): DeliveryDependencyIndex {
  return {
    builtAt: now.toISOString(),
    dependencies: [],
    activeBlockersByIssue: {},
    fanOut: [],
    summary: {
      blockedActiveCount: 0,
      crossProjectCount: 0,
      overdueDependencyCount: 0,
    },
  };
}

export function isBlockerResolvedStatus(issue: ParsedIssueSnapshot): boolean {
  const workflowIssue = {
    issueKey: issue.key,
    projectKey: projectForKey(issue.key),
    issueTypeName: issue.issueTypeName,
    currentStatus: issue.status,
    events: [],
  };
  return resolveWorkflowStage(
    resolveWorkflowProfile(workflowIssue),
    issue.status,
  ).isTerminal;
}

function ownerForIssue(
  snapshot: TeamSnapshot,
  issueKey: string,
): Person | undefined {
  for (const person of snapshot.persons) {
    if (
      person.ownedIssues?.some((i) => i.issueKey === issueKey) ||
      person.issues?.some((i) => i.issueKey === issueKey)
    ) {
      return person;
    }
  }
  return undefined;
}

function isIssueActiveInTeam(snapshot: TeamSnapshot, issueKey: string): boolean {
  for (const person of snapshot.persons) {
    for (const issue of getActiveIssues(person)) {
      if (issue.issueKey === issueKey) return true;
    }
  }
  return false;
}

function edgeId(source: string, target: string, type: string): string {
  return `${source}→${target}:${type}`;
}

function buildWorkDependency(
  edge: {
    sourceKey: string;
    targetKey: string;
    type: import("./dependencyTypes").DependencyType;
    direction: import("./dependencyTypes").DependencyDirection;
    jiraLinkTypeName: string;
  },
  byKey: Map<string, ParsedIssueSnapshot>,
  snapshot: TeamSnapshot,
): WorkDependency | null {
  const source = byKey.get(edge.sourceKey);
  const target = byKey.get(edge.targetKey);
  if (!source || !target) return null;

  const sourceOwner = ownerForIssue(snapshot, source.key);
  const targetOwner = ownerForIssue(snapshot, target.key);
  const crossProject = projectForKey(source.key) !== projectForKey(target.key);
  const crossTeam =
    Boolean(sourceOwner && targetOwner) &&
    sourceOwner!.id !== targetOwner!.id;

  const isBlockingEdge =
    isBlockingDependencyType(edge.type) &&
    (edge.type === "blocked_by" || edge.type === "explicit_dependency" || edge.type === "blocks");

  const sourceActive = isIssueActiveInTeam(snapshot, source.key);
  const blockerResolved = isBlockerResolvedStatus(target);
  const isActiveBlock =
    isBlockingEdge &&
    edge.type === "blocked_by" &&
    sourceActive &&
    !blockerResolved;

  return {
    id: edgeId(source.key, target.key, edge.type),
    sourceIssueKey: source.key,
    targetIssueKey: target.key,
    type: edge.type,
    direction: edge.direction,
    sourceProject: projectForKey(source.key),
    targetProject: projectForKey(target.key),
    sourcePersonId: sourceOwner?.id,
    sourcePersonName: sourceOwner?.bamboo.displayName,
    targetPersonId: targetOwner?.id,
    targetPersonName: targetOwner?.bamboo.displayName,
    sourceStatus: source.status,
    targetStatus: target.status,
    sourceSummary: source.summary,
    targetSummary: target.summary,
    sourceDueDate: source.dueDate,
    targetDueDate: target.dueDate,
    jiraLinkTypeName: edge.jiraLinkTypeName,
    isActiveBlock,
    crossProject,
    crossTeam,
  };
}

export function collectLinkedIssueKeys(issues: unknown[]): string[] {
  const keys = new Set<string>();
  for (const issue of issues) {
    const snap = snapshotFromRawIssue(issue);
    if (!snap) continue;
    for (const edge of parseIssueLinkEdges(snap.key, issue)) {
      keys.add(edge.targetKey);
    }
    if (snap.parentKey) keys.add(snap.parentKey);
  }
  return [...keys];
}

export function buildDeliveryDependencyGraph(
  issues: unknown[],
  snapshot: TeamSnapshot,
  now = new Date(),
): DeliveryDependencyIndex {
  const byKey = new Map<string, ParsedIssueSnapshot>();
  for (const issue of issues) {
    const snap = snapshotFromRawIssue(issue);
    if (snap) byKey.set(snap.key, snap);
  }

  const rawEdges: Array<{
    sourceKey: string;
    targetKey: string;
    type: WorkDependency["type"];
    direction: WorkDependency["direction"];
    jiraLinkTypeName: string;
  }> = [];

  for (const issue of issues) {
    const snap = snapshotFromRawIssue(issue);
    if (!snap) continue;
    rawEdges.push(...parseIssueLinkEdges(snap.key, issue));
    const parentEdge = parseParentChildEdge(snap);
    if (parentEdge) rawEdges.push(parentEdge);
  }

  const normalizedEdges = rawEdges.flatMap((edge) => {
    if (edge.type === "blocks" && edge.direction === "outward") {
      return [
        {
          sourceKey: edge.targetKey,
          targetKey: edge.sourceKey,
          type: "blocked_by" as const,
          direction: "inward" as const,
          jiraLinkTypeName: edge.jiraLinkTypeName,
        },
      ];
    }
    return [edge];
  });

  const dependencies: WorkDependency[] = [];
  const seen = new Set<string>();
  for (const edge of normalizedEdges) {
    const dep = buildWorkDependency(edge, byKey, snapshot);
    if (!dep || seen.has(dep.id)) continue;
    seen.add(dep.id);
    dependencies.push(dep);
  }

  const activeBlockersByIssue: Record<string, WorkDependency[]> = {};
  for (const dep of dependencies) {
    if (!dep.isActiveBlock) continue;
    const list = activeBlockersByIssue[dep.sourceIssueKey] ?? [];
    list.push(dep);
    activeBlockersByIssue[dep.sourceIssueKey] = list;
  }

  const fanOutMap = new Map<string, Set<string>>();
  for (const dep of dependencies) {
    if (!dep.isActiveBlock) continue;
    const set = fanOutMap.get(dep.targetIssueKey) ?? new Set();
    set.add(dep.sourceIssueKey);
    fanOutMap.set(dep.targetIssueKey, set);
  }

  const fanOut: DependencyFanOut[] = [...fanOutMap.entries()]
    .map(([blockerKey, blocked]) => {
      const blocker = byKey.get(blockerKey);
      return {
        blockerIssueKey: blockerKey,
        blockerSummary: blocker?.summary ?? blockerKey,
        blockerProject: projectForKey(blockerKey),
        blockedActiveCount: blocked.size,
        blockedIssueKeys: [...blocked],
      };
    })
    .filter((f) => f.blockedActiveCount >= 2)
    .sort((a, b) => b.blockedActiveCount - a.blockedActiveCount);

  let crossProjectCount = 0;
  let overdueDependencyCount = 0;
  const today = now.toISOString().slice(0, 10);
  for (const dep of dependencies) {
    if (dep.isActiveBlock && dep.crossProject) crossProjectCount += 1;
    if (
      dep.isActiveBlock &&
      dep.targetDueDate &&
      dep.targetDueDate < today
    ) {
      overdueDependencyCount += 1;
    }
  }

  const blockedActiveCount = Object.keys(activeBlockersByIssue).length;

  return {
    builtAt: now.toISOString(),
    dependencies,
    activeBlockersByIssue,
    fanOut,
    summary: {
      blockedActiveCount,
      crossProjectCount,
      overdueDependencyCount,
    },
  };
}

export function buildDrawerChain(
  index: DeliveryDependencyIndex,
  blockedIssueKey: string,
): DependencyChainLink[] {
  return buildDependencyChains(
    index,
    blockedIssueKey,
    MAX_CHAIN_DEPTH,
    MAX_CHAIN_NODES,
  );
}
