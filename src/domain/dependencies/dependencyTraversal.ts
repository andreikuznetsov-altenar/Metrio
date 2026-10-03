import type {
  DeliveryDependencyIndex,
  DependencyChainLink,
} from "./dependencyTypes";
import { projectForKey } from "./parseJiraIssueLinks";

export function buildDependencyChains(
  index: DeliveryDependencyIndex,
  startIssueKey: string,
  maxDepth: number,
  maxNodes: number,
): DependencyChainLink[] {
  const chain: DependencyChainLink[] = [];
  const visited = new Set<string>();
  let current = startIssueKey;
  let depth = 0;

  while (depth < maxDepth && chain.length < maxNodes) {
    if (visited.has(current)) break;
    visited.add(current);

    const blockers = index.activeBlockersByIssue[current];
    const blocker = blockers?.[0];
    if (!blocker) {
      const dep = index.dependencies.find((d) => d.sourceIssueKey === current);
      chain.push({
        issueKey: current,
        summary: dep?.sourceSummary ?? current,
        status: dep?.sourceStatus ?? "",
        projectKey: projectForKey(current),
      });
      break;
    }

    chain.push({
      issueKey: current,
      summary: blocker.sourceSummary,
      status: blocker.sourceStatus,
      projectKey: blocker.sourceProject,
      blockedByKey: blocker.targetIssueKey,
    });

    current = blocker.targetIssueKey;
    depth += 1;
  }

  if (chain.length < maxNodes && !visited.has(current)) {
    const lastDep = index.dependencies.find(
      (d) => d.targetIssueKey === current || d.sourceIssueKey === current,
    );
    chain.push({
      issueKey: current,
      summary: lastDep?.targetSummary ?? lastDep?.sourceSummary ?? current,
      status: lastDep?.targetStatus ?? lastDep?.sourceStatus ?? "",
      projectKey: projectForKey(current),
    });
  }

  return chain;
}
