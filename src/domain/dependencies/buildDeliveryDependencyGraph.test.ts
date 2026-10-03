import { describe, expect, it } from "vitest";
import { buildDeliveryDependencyGraph } from "./buildDeliveryDependencyGraph";
import { buildDependencyChains } from "./dependencyTraversal";
import type { TeamSnapshot } from "../people/types";
import type { AuditIssue } from "../jira/types";

function issue(key: string, status = "In Progress"): AuditIssue {
  return {
    issueKey: key,
    issueSummary: key,
    issueCreated: "2026-01-01",
    assigneeName: "A",
    issueTypeName: "Task",
    contentType: "none",
    designImprovementType: "none",
    epicKey: "none",
    epicSummary: "none",
    epicStatus: "none",
    epicContentType: "none",
    epicDesignImprovementType: "none",
    events: [],
    rangeEvents: [],
    currentStatus: status,
  };
}

function snapshot(persons: TeamSnapshot["persons"]): TeamSnapshot {
  return {
    persons,
    mode: "team",
    summary: {
      available: persons.length,
      onVacation: 0,
      vacationSoon: 0,
      highWorkload: 0,
      problematic: 0,
    },
  };
}

function rawIssue(
  key: string,
  links: unknown[],
  status = "In Progress",
) {
  return {
    key,
    fields: {
      summary: `Summary ${key}`,
      status: { name: status },
      issuelinks: links,
      project: { key: key.split("-")[0] },
    },
  };
}

describe("buildDeliveryDependencyGraph", () => {
  const person = {
    id: "p1",
    bamboo: {
      id: "b1",
      displayName: "Dev",
      workEmail: "dev@co.com",
    },
    jira: null,
    identity: { matchedBy: "email", warnings: [] },
    availability: { state: "available" },
    workload: null,
    performance: null,
    issues: [issue("UX-1")],
    ownedIssues: [issue("UX-1")],
  } as unknown as TeamSnapshot["persons"][number];

  it("creates active blocked_by across projects", () => {
    const issues = [
      rawIssue("UX-1", [
        {
          type: { name: "Blocks", inward: "is blocked by", outward: "blocks" },
          inwardIssue: { key: "UX-1" },
          outwardIssue: { key: "API-2", fields: { status: { name: "In Progress" } } },
        },
      ]),
      rawIssue("API-2", [], "In Progress"),
    ];
    const index = buildDeliveryDependencyGraph(issues, snapshot([person]));
    expect(index.summary.blockedActiveCount).toBe(1);
    expect(index.activeBlockersByIssue["UX-1"]?.[0].targetIssueKey).toBe("API-2");
    expect(index.activeBlockersByIssue["UX-1"]?.[0].crossProject).toBe(true);
  });

  it("ignores relates links for blocking", () => {
    const issues = [
      rawIssue("UX-1", [
        {
          type: { name: "Relates" },
          inwardIssue: { key: "UX-1" },
          outwardIssue: { key: "UX-9" },
        },
      ]),
    ];
    const index = buildDeliveryDependencyGraph(issues, snapshot([person]));
    expect(index.summary.blockedActiveCount).toBe(0);
  });

  it("clears active block when blocker completed", () => {
    const issues = [
      rawIssue("UX-1", [
        {
          type: { name: "Blocks" },
          inwardIssue: { key: "UX-1" },
          outwardIssue: { key: "API-2" },
        },
      ]),
      rawIssue("API-2", [], "Done"),
    ];
    const index = buildDeliveryDependencyGraph(issues, snapshot([person]));
    expect(index.summary.blockedActiveCount).toBe(0);
  });

  it("detects fan-out", () => {
    const issues = [
      rawIssue("UX-1", [
        {
          type: { name: "Blocks" },
          inwardIssue: { key: "UX-1" },
          outwardIssue: { key: "API-9" },
        },
      ]),
      rawIssue("UX-2", [
        {
          type: { name: "Blocks" },
          inwardIssue: { key: "UX-2" },
          outwardIssue: { key: "API-9" },
        },
      ]),
      rawIssue("API-9", [], "In Progress"),
    ];
    const p2 = { ...person, id: "p2", ownedIssues: [issue("UX-2")], issues: [issue("UX-2")] };
    const index = buildDeliveryDependencyGraph(issues, snapshot([person, p2]));
    expect(index.fanOut[0]?.blockedActiveCount).toBe(2);
  });

  it("handles cycles without looping", () => {
    const issues = [
      rawIssue("A-1", [
        {
          type: { name: "Blocks" },
          inwardIssue: { key: "A-1" },
          outwardIssue: { key: "B-1" },
        },
      ]),
      rawIssue("B-1", [
        {
          type: { name: "Blocks" },
          inwardIssue: { key: "B-1" },
          outwardIssue: { key: "A-1" },
        },
      ]),
    ];
    const index = buildDeliveryDependencyGraph(issues, snapshot([person]));
    const chain = buildDependencyChains(index, "A-1", 3, 40);
    expect(chain.length).toBeLessThanOrEqual(4);
  });
});
