import type { ResolvedEmployee } from "../../services/bamboo/orgResolver";

export interface OrgNode {
  employeeId: string;
  supervisorId?: string;
  directReportIds: string[];
}

function isActiveStatus(status: string | undefined): boolean {
  const s = String(status || "active").toLowerCase();
  return s !== "inactive" && s !== "terminated" && s !== "inactive employee";
}

/** Build a reporting graph from Bamboo-resolved employees (active links only). */
export function buildOrgGraph(employees: ResolvedEmployee[]): Map<string, OrgNode> {
  const byId = new Map<string, ResolvedEmployee>();
  for (const person of employees) {
    if (!person.id) continue;
    if (!isActiveStatus(person.status)) continue;
    if (!byId.has(person.id)) {
      byId.set(person.id, person);
    }
  }

  const graph = new Map<string, OrgNode>();

  for (const person of byId.values()) {
    graph.set(person.id, {
      employeeId: person.id,
      supervisorId: person.supervisorId?.trim() || undefined,
      directReportIds: [],
    });
  }

  for (const person of byId.values()) {
    const supervisorId = person.supervisorId?.trim();
    if (!supervisorId) continue;
    if (supervisorId === person.id) continue;
    const supervisor = graph.get(supervisorId);
    if (!supervisor) continue;
    if (!supervisor.directReportIds.includes(person.id)) {
      supervisor.directReportIds.push(person.id);
    }
  }

  return graph;
}

export function collectOrgGraphDiagnostics(
  graph: Map<string, OrgNode>,
): string[] {
  const warnings: string[] = [];
  for (const node of graph.values()) {
    if (node.supervisorId === node.employeeId) {
      warnings.push(`Self-manager relationship: ${node.employeeId}`);
    }
  }

  for (const node of graph.values()) {
    const visited = new Set<string>();
    const stack: string[] = [node.employeeId];
    while (stack.length) {
      const id = stack.pop()!;
      if (visited.has(id)) {
        warnings.push(`Cycle detected involving ${id}`);
        break;
      }
      visited.add(id);
      const current = graph.get(id);
      if (!current) continue;
      for (const child of current.directReportIds) {
        stack.push(child);
      }
    }
  }

  return warnings;
}

export function employeeHasDirectReports(
  employeeId: string,
  graph: Map<string, OrgNode>,
): boolean {
  const node = graph.get(employeeId);
  return Boolean(node && node.directReportIds.length > 0);
}

export function collectDescendantIds(
  rootId: string,
  graph: Map<string, OrgNode>,
  options?: { includeRoot?: boolean },
): string[] {
  const includeRoot = options?.includeRoot ?? false;
  const visited = new Set<string>();
  const out: string[] = [];

  function walk(id: string) {
    if (visited.has(id)) return;
    visited.add(id);
    const node = graph.get(id);
    if (!node) return;
    if (includeRoot || id !== rootId) {
      out.push(id);
    }
    for (const childId of node.directReportIds) {
      walk(childId);
    }
  }

  const root = graph.get(rootId);
  if (!root) {
    return includeRoot ? [rootId] : [];
  }

  if (includeRoot) {
    out.push(rootId);
  }
  for (const childId of root.directReportIds) {
    walk(childId);
  }

  return out;
}

export function maxDepthBelow(
  rootId: string,
  graph: Map<string, OrgNode>,
): number {
  const root = graph.get(rootId);
  if (!root || root.directReportIds.length === 0) return 0;

  let max = 0;
  const visited = new Set<string>();

  function depth(id: string, level: number): number {
    if (visited.has(id)) return level;
    visited.add(id);
    const node = graph.get(id);
    if (!node || node.directReportIds.length === 0) {
      return level;
    }
    let localMax = level;
    for (const child of node.directReportIds) {
      localMax = Math.max(localMax, depth(child, level + 1));
    }
    return localMax;
  }

  for (const child of root.directReportIds) {
    max = Math.max(max, depth(child, 1));
  }
  return max;
}

export function rosterFromOrgResolution(input: {
  employee?: ResolvedEmployee;
  directReports: ResolvedEmployee[];
  fullTeam: ResolvedEmployee[];
}): ResolvedEmployee[] {
  const map = new Map<string, ResolvedEmployee>();
  const seed = [
    ...(input.employee ? [input.employee] : []),
    ...input.directReports,
    ...input.fullTeam,
  ];
  for (const person of seed) {
    if (!person.id) continue;
    if (!map.has(person.id)) {
      map.set(person.id, person);
    }
  }
  return [...map.values()];
}
