import type { DeliveryDependencyIndex, ProjectDependencyRow, ProjectDependencySection } from "./dependencyTypes";
import { buildDrawerChain } from "./buildDeliveryDependencyGraph";

export function buildProjectDependencySection(
  projectKey: string,
  index: DeliveryDependencyIndex | null | undefined,
): ProjectDependencySection {
  const key = projectKey.toUpperCase();
  const empty: ProjectDependencySection = {
    incoming: [],
    outgoing: [],
    blocked: [],
    summaryLine: "No explicit delivery dependencies in this project.",
  };
  if (!index) return empty;

  const incoming: ProjectDependencyRow[] = [];
  const outgoing: ProjectDependencyRow[] = [];
  const blocked: ProjectDependencyRow[] = [];

  for (const dep of index.dependencies) {
    const touches =
      dep.sourceProject === key || dep.targetProject === key;
    if (!touches) continue;

    if (dep.targetProject === key && dep.isActiveBlock) {
      incoming.push({
        dependency: dep,
        perspective: "incoming",
        chain: buildDrawerChain(index, dep.sourceIssueKey),
      });
    }
    if (dep.sourceProject === key && dep.type !== "related") {
      outgoing.push({ dependency: dep, perspective: "outgoing" });
    }
    if (dep.sourceProject === key && dep.isActiveBlock) {
      blocked.push({
        dependency: dep,
        perspective: "blocked",
        chain: buildDrawerChain(index, dep.sourceIssueKey),
      });
    }
  }

  const blockedCount = blocked.length;
  const cross = [...incoming, ...outgoing].filter((r) => r.dependency.crossProject).length;
  const summaryLine =
    blockedCount || cross
      ? `${blockedCount} blocked · ${cross} cross-project dependencies`
      : empty.summaryLine;

  return {
    incoming: incoming.slice(0, 12),
    outgoing: outgoing.slice(0, 12),
    blocked: blocked.slice(0, 12),
    summaryLine,
  };
}
