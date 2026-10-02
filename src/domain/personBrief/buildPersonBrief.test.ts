import { describe, expect, it } from "vitest";
import { buildPersonBrief } from "./buildPersonBrief";
import type { PersonAnalyticsWorkspace } from "../analytics/personAnalyticsWorkspace";
import type { Person } from "../people/types";

function workspaceStub(): PersonAnalyticsWorkspace {
  return {
    personId: "p1",
    personName: "Alex Morgan",
    role: "Designer",
    availability: "Available",
    workload: "Normal",
    contextLine: "Last 30 days",
    performanceKpis: [
      { label: "Completed", value: "5", contextLabel: "vs 7", contextCaption: "vs previous 30 days" },
      { label: "First pass", value: "80%" },
      { label: "Backflows", value: "1" },
    ],
    cycleTime: [{ label: "P → R", value: "2.1 days" }],
    activeWorkCount: 3,
    trends: [],
    attention: [
      {
        label: "In review",
        variant: "warning",
        reason: "In Review > 7 days",
        issueKey: "UX-1",
      },
    ],
    workRows: [
      {
        key: "UX-1",
        title: "Navigation",
        status: "In Review",
        stageAge: "9 days",
        healthVariant: "warning",
      },
    ],
    problematicWork: [],
    historyMonth: [
      {
        label: "This month",
        rows: [
          {
            key: "UX-9",
            title: "Done task",
            completedOn: "2 Oct",
            outcome: "First pass",
            project: "UX",
            cycle: "3d",
          },
        ],
        summary: "",
      },
    ],
    historyWeek: [],
    historyQuarter: [],
  };
}

function personStub(): Person {
  return {
    id: "p1",
    bamboo: {
      id: "p1",
      displayName: "Alex Morgan",
      jobTitle: "Designer",
      department: "Design",
      workEmail: "alex@co.com",
      location: "",
      supervisorId: null,
      photoUrl: "",
      hireDate: "2026-09-10",
    },
    issues: [],
    availability: { state: "available", label: "Available" },
  } as Person;
}

describe("buildPersonBrief", () => {
  it("builds factual sections without evaluative language", () => {
    const brief = buildPersonBrief({
      person: personStub(),
      workspace: workspaceStub(),
      periodPreset: "30d",
    });
    expect(brief.personName).toBe("Alex Morgan");
    expect(brief.newStarter?.headline).toContain("Day");
    expect(brief.completedWork[0]?.issueKey).toBe("UX-9");
    expect(brief.prompts.length).toBeGreaterThan(0);
    expect(JSON.stringify(brief)).not.toMatch(/underperform|declined badly/i);
  });
});
