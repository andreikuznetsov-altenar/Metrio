import { describe, expect, it } from "vitest";
import type { Person } from "../people/types";
import { buildOrgGraph } from "../organization/orgGraph";
import {
  computeOrganizationalTeamWorkload,
  personalCapacityLoadPercent,
  resolveWorkloadUnitForViewer,
  workloadUnitDonutWeight,
} from "./hierarchicalWorkload";
import { testWorkload } from "../testFixtures";

function person(
  id: string,
  supervisorId: string | undefined,
  capacityLoadPercent: number | null,
): Person {
  const workload =
    capacityLoadPercent == null
      ? testWorkload({ level: "normal", activeCount: 1, capacityDataState: "insufficient_history" })
      : testWorkload({
          level: capacityLoadPercent > 90 ? "overloaded" : "normal",
          activeCount: 1,
          capacityLoadPercent,
          capacityDataState: "measured",
        });
  return {
    id,
    bamboo: {
      id,
      displayName: id,
      firstName: id,
      lastName: "Test",
      workEmail: `${id}@co.com`,
      jobTitle: "Designer",
      supervisorId,
      status: "Active",
    },
    jira: null,
    identity: { matchedBy: "unresolved", warnings: [] },
    availability: { state: "available", label: "Available", isHoliday: false },
    workload,
    performance: null,
    issues: [],
    ownedIssues: [],
  };
}

describe("hierarchicalWorkload", () => {
  const personal = (persons: Record<string, Person>) => (id: string) =>
    personalCapacityLoadPercent(persons[id]);

  it("CASE A: leaf manager team average includes lead personal values without summing", () => {
    const lead = person("lead", undefined, 80);
    const b = person("b", "lead", 60);
    const c = person("c", "lead", 40);
    const d = person("d", "lead", 20);
    const persons = { lead, b, c, d };
    const graph = buildOrgGraph([lead.bamboo, b.bamboo, c.bamboo, d.bamboo]);
    const team = computeOrganizationalTeamWorkload("lead", graph, personal(persons));
    expect(team).toBe(50);
    const leadUnit = resolveWorkloadUnitForViewer(lead, { mode: "own_team" }, personal(persons));
    expect(leadUnit.kind).toBe("personal");
    expect(leadUnit.loadPercent).toBe(80);
    expect(workloadUnitDonutWeight(leadUnit)).toBeLessThan(200);
  });

  it("CASE B: manager with only child managers uses one unit per child team", () => {
    const director = person("dir", undefined, 30);
    const leadA = person("leadA", "dir", 70);
    const leadB = person("leadB", "dir", 50);
    const a1 = person("a1", "leadA", 100);
    const b1 = person("b1", "leadB", 20);
    const persons = { director, leadA, leadB, a1, b1 };
    const graph = buildOrgGraph([
      director.bamboo,
      leadA.bamboo,
      leadB.bamboo,
      a1.bamboo,
      b1.bamboo,
    ]);
    const teamA = computeOrganizationalTeamWorkload("leadA", graph, personal(persons));
    const teamB = computeOrganizationalTeamWorkload("leadB", graph, personal(persons));
    expect(teamA).toBe(85);
    expect(teamB).toBe(35);
    const leadAUnit = resolveWorkloadUnitForViewer(
      leadA,
      { mode: "manager_units", orgGraph: graph },
      personal(persons),
    );
    expect(leadAUnit.kind).toBe("team");
    expect(leadAUnit.loadPercent).toBe(85);
  });

  it("CASE C: mixed ICs and child teams produce four parent-level units", () => {
    const manager = person("mgr", undefined, 55);
    const icA = person("icA", "mgr", 40);
    const icB = person("icB", "mgr", 60);
    const leadC = person("leadC", "mgr", 90);
    const c1 = person("c1", "leadC", 30);
    const c2 = person("c2", "leadC", 50);
    const leadD = person("leadD", "mgr", 70);
    const d1 = person("d1", "leadD", 10);
    const persons = { manager, icA, icB, leadC, c1, c2, leadD, d1 };
    const graph = buildOrgGraph(Object.values(persons).map((p) => p.bamboo));
    const icUnit = resolveWorkloadUnitForViewer(icA, { mode: "manager_units", orgGraph: graph }, personal(persons));
    const teamC = resolveWorkloadUnitForViewer(leadC, { mode: "manager_units", orgGraph: graph }, personal(persons));
    expect(icUnit.kind).toBe("personal");
    expect(teamC.kind).toBe("team");
    expect(teamC.loadPercent).toBe(56.666666666666664);
  });

  it("CASE D: bottom-up recursion across director → head → leads", () => {
    const director = person("dir", undefined, 20);
    const head = person("head", "dir", 40);
    const leadA = person("leadA", "head", 80);
    const leadB = person("leadB", "head", 60);
    const a1 = person("a1", "leadA", 100);
    const b1 = person("b1", "leadB", 20);
    const persons = { dir: director, head, leadA, leadB, a1, b1 };
    const graph = buildOrgGraph(Object.values(persons).map((p) => p.bamboo));
    const teamA = computeOrganizationalTeamWorkload("leadA", graph, personal(persons));
    const teamB = computeOrganizationalTeamWorkload("leadB", graph, personal(persons));
    const headTeam = computeOrganizationalTeamWorkload("head", graph, personal(persons));
    expect(teamA).toBe(90);
    expect(teamB).toBe(40);
    expect(headTeam).toBeCloseTo(56.666666666666664, 5);
  });

  it("CASE E: unequal team sizes are one unit each at parent level", () => {
    const parent = person("parent", undefined, 10);
    const leadSmall = person("leadSmall", "parent", 50);
    const s1 = person("s1", "leadSmall", 50);
    const leadBig = person("leadBig", "parent", 50);
    const bigs = Array.from({ length: 9 }, (_, i) =>
      person(`big${i}`, "leadBig", 50),
    );
    const persons: Record<string, Person> = {
      parent,
      leadSmall,
      s1,
      leadBig,
      ...Object.fromEntries(bigs.map((p) => [p.id, p])),
    };
    const graph = buildOrgGraph(Object.values(persons).map((p) => p.bamboo));
    const smallTeam = computeOrganizationalTeamWorkload("leadSmall", graph, personal(persons));
    const bigTeam = computeOrganizationalTeamWorkload("leadBig", graph, personal(persons));
    expect(smallTeam).toBe(50);
    expect(bigTeam).toBe(50);
    expect(smallTeam).toBe(bigTeam);
  });

  it("CASE F: own-team view keeps lead personal workload for donut unit", () => {
    const andrei = person("andrei", undefined, 45);
    const daria = person("daria", "andrei", 70);
    const persons = { andrei, daria };
    const unit = resolveWorkloadUnitForViewer(andrei, { mode: "own_team" }, personal(persons));
    expect(unit.kind).toBe("personal");
    expect(unit.loadPercent).toBe(45);
    expect(workloadUnitDonutWeight(unit)).toBe(45);
  });

  it("CASE G: missing history yields stable non-finite weight fallback", () => {
    const p = person("p1", undefined, null);
    const unit = resolveWorkloadUnitForViewer(p, { mode: "own_team" }, personal({ p1: p }));
    expect(unit.loadPercent).toBeNull();
    expect(workloadUnitDonutWeight(unit)).toBe(1);
  });
});
