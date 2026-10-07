import { describe, expect, it } from "vitest";
import {
  buildTeamWorkloadDonutSegments,
  selectDefaultTeamWorkloadDonutPersonId,
  teamWorkloadDonutColorForPerson,
  teamWorkloadDonutMetricLabel,
  workloadDonutSupportingMetric,
  workloadDonutWeight,
} from "./buildTeamWorkloadDonutSegments";
import type { WorkloadRow } from "../performance";
import type { Person } from "../people/types";
import { buildOrgGraph } from "../organization/orgGraph";
import { testWorkload } from "../testFixtures";

const base = (overrides: Partial<WorkloadRow>): WorkloadRow => ({
  personId: "p1",
  activeWork: 3,
  atRisk: 0,
  workload: "Normal",
  availability: "Available",
  ...overrides,
});

describe("buildTeamWorkloadDonutSegments", () => {
  it("prefers measured capacity percent over active work", () => {
    const row = base({
      activeWork: 2,
      capacityDataState: "measured",
      capacityLoadPercent: 72.5,
    });
    expect(workloadDonutWeight(row)).toBe(72.5);
    const segments = buildTeamWorkloadDonutSegments([row]);
    expect(segments[0].detailLabel).toBe("72.5% capacity");
  });

  it("labels insufficient history in supporting metric copy", () => {
    const row = base({ capacityDataState: "insufficient_history" });
    expect(workloadDonutSupportingMetric(row)).toBe("Not enough history");
  });

  it("falls back to active work when capacity is insufficient", () => {
    const row = base({ activeWork: 5, capacityDataState: "insufficient_history" });
    expect(workloadDonutWeight(row)).toBe(5);
    expect(teamWorkloadDonutMetricLabel([row])).toContain("active work");
  });

  it("picks default person by largest share with team-order tie-break", () => {
    const rows = [
      base({ personId: "a", activeWork: 2, capacityDataState: "insufficient_history" }),
      base({
        personId: "b",
        activeWork: 5,
        capacityDataState: "measured",
        capacityLoadPercent: 40,
      }),
      base({
        personId: "c",
        activeWork: 1,
        capacityDataState: "measured",
        capacityLoadPercent: 40,
      }),
    ];
    expect(selectDefaultTeamWorkloadDonutPersonId(rows)).toBe("b");
  });

  it("uses personal load for own-team brief when persons map is provided", () => {
    const lead: Person = {
      id: "lead",
      bamboo: {
        id: "lead",
        displayName: "Andrei",
        firstName: "Andrei",
        lastName: "Lead",
        workEmail: "andrei@co.com",
        jobTitle: "Lead",
        status: "Active",
      },
      jira: null,
      identity: { matchedBy: "unresolved", warnings: [] },
      availability: { state: "available", label: "Available", isHoliday: false },
      workload: testWorkload({
        level: "normal",
        activeCount: 1,
        capacityLoadPercent: 82,
        capacityDataState: "measured",
      }),
      performance: null,
      issues: [],
      ownedIssues: [],
    };
    const ic: Person = {
      ...lead,
      id: "ic",
      bamboo: { ...lead.bamboo, id: "ic", displayName: "IC", supervisorId: "lead" },
      workload: testWorkload({
        level: "overloaded",
        activeCount: 8,
        capacityLoadPercent: 120,
        capacityDataState: "measured",
      }),
    };
    const personsById = new Map<string, Person>([
      ["lead", lead],
      ["ic", ic],
    ]);
    const rows: WorkloadRow[] = [
      base({
        personId: "lead",
        personName: "Andrei",
        capacityDataState: "measured",
        capacityLoadPercent: 1196.6,
      }),
      base({
        personId: "ic",
        personName: "IC",
        capacityDataState: "measured",
        capacityLoadPercent: 95,
      }),
    ];
    const segments = buildTeamWorkloadDonutSegments(rows, {
      context: { mode: "own_team" },
      personsById,
    });
    const leadSegment = segments.find((s) => s.personId === "lead");
    expect(leadSegment?.loadKind).toBe("personal");
    expect(leadSegment?.weight).toBe(82);
    expect(leadSegment?.detailLabel).toContain("Personal load");
    expect(leadSegment?.detailLabel).not.toContain("1196");
  });

  it("uses team load for child lead at manager-units level", () => {
    const lead: Person = {
      id: "lead",
      bamboo: {
        id: "lead",
        displayName: "Lead",
        firstName: "Lead",
        lastName: "User",
        workEmail: "lead@co.com",
        jobTitle: "Lead",
        status: "Active",
      },
      jira: null,
      identity: { matchedBy: "unresolved", warnings: [] },
      availability: { state: "available", label: "Available", isHoliday: false },
      workload: testWorkload({
        level: "normal",
        activeCount: 1,
        capacityLoadPercent: 80,
        capacityDataState: "measured",
      }),
      performance: null,
      issues: [],
      ownedIssues: [],
    };
    const ic = {
      ...lead,
      id: "ic",
      bamboo: { ...lead.bamboo, id: "ic", supervisorId: "lead" },
      workload: testWorkload({
        level: "normal",
        activeCount: 2,
        capacityLoadPercent: 40,
        capacityDataState: "measured",
      }),
    };
    const graph = buildOrgGraph([lead.bamboo, ic.bamboo]);
    const personsById = new Map<string, Person>([
      ["lead", lead],
      ["ic", ic],
    ]);
    const segments = buildTeamWorkloadDonutSegments(
      [
        base({
          personId: "lead",
          personName: "Lead",
          capacityDataState: "measured",
          capacityLoadPercent: 80,
        }),
      ],
      {
        context: { mode: "manager_units", orgGraph: graph },
        personsById,
      },
    );
    expect(segments[0].loadKind).toBe("team");
    expect(segments[0].weight).toBe(60);
    expect(segments[0].detailLabel).toContain("Team load");
  });

  it("assigns distinct stable colors per person", () => {
    const used = new Set<number>();
    const c1 = teamWorkloadDonutColorForPerson("person-a", used);
    const c2 = teamWorkloadDonutColorForPerson("person-b", used);
    expect(c1).not.toBe(c2);
    expect(c1).toContain("--team-donut-color-");
  });
});
