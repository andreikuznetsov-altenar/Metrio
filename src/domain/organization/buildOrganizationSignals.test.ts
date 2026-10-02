import { describe, expect, it } from "vitest";
import { buildOrganizationSignals } from "./buildOrganizationSignals";
import type { TeamGroup } from "./teamGrouping";
import { testWorkload } from "../testFixtures";
import type { Person } from "../people/types";

function person(id: string, department: string, reviewIssues = 0): Person {
  const issues = Array.from({ length: reviewIssues }, (_, index) => ({
    issueKey: `UX-${index}`,
    issueSummary: "Task",
    issueCreated: "2026-01-01",
    assigneeName: "A",
    issueTypeName: "Task",
    contentType: "none",
    designImprovementType: "",
    epicKey: "",
    epicSummary: "",
    epicStatus: "",
    epicContentType: "",
    epicDesignImprovementType: "",
    events: [],
    rangeEvents: [],
    currentStatus: "In Review",
  }));
  return {
    id,
    bamboo: {
      id,
      displayName: id,
      firstName: id,
      lastName: "",
      workEmail: `${id}@co.com`,
      jobTitle: "Designer",
      department,
      status: "Active",
    },
    jira: null,
    identity: { matchedBy: "unresolved", warnings: [] },
    availability: { state: "available", label: "Available", isHoliday: false },
    workload: testWorkload({ activeCount: 5 }),
    performance: null,
    issues,
    ownedIssues: issues,
  };
}

describe("buildOrganizationSignals", () => {
  it("aggregates review bottleneck by team", () => {
    const teams: TeamGroup[] = [
      {
        teamId: "design",
        teamName: "Design",
        persons: [person("p1", "Design", 5)],
      },
    ];
    const signals = buildOrganizationSignals({
      teams,
      deliveryRisk: teams[0].persons.flatMap((p) =>
        p.ownedIssues.map((issue) => ({
          issueKey: issue.issueKey,
          summary: issue.issueSummary,
          personId: p.id,
          personName: p.bamboo.displayName,
          personRouteKey: p.id,
          status: issue.currentStatus || "In Review",
          health: "stale",
          stageLabel: "7d",
          reason: "No activity",
          severity: "warning",
          issue,
        })),
      ),
      feedback: {
        preparedNotSent: false,
        pendingResponseCount: 0,
        deliveryFailureCount: 0,
      },
    });
    expect(signals.some((s) => s.kind === "review_bottleneck")).toBe(true);
  });
});
