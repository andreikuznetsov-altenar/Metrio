import { describe, expect, it } from "vitest";
import { collectLinkedIssueKeys } from "../dependencies/buildDeliveryDependencyGraph";
import { buildJql } from "./jql";
import { DEFAULT_WORKFLOW_MAPPINGS } from "../workflows/defaultWorkflowMappings";

function rawIssue(
  key: string,
  projectKey: string,
  parentKey?: string,
  linkTarget?: string,
) {
  const fields: Record<string, unknown> = {
    project: { key: projectKey },
    issuetype: { name: "Task" },
    summary: `Issue ${key}`,
  };
  if (parentKey) {
    fields.parent = { key: parentKey };
  }
  if (linkTarget) {
    fields.issuelinks = [
      {
        type: { name: "Blocks", inward: "is blocked by", outward: "blocks" },
        outwardIssue: { key: linkTarget },
      },
    ];
  }
  return { key, fields };
}

describe("Jira cross-project hierarchy loading (Pass 13.6)", () => {
  it("buildJql scopes assignee history and optional project list", () => {
    const jql = buildJql({
      dateFrom: "2026-01-01",
      dateTo: "2026-01-31",
      targetReviewDays: 3,
      users: ["user@example.com"],
      projects: ["UX", "WS", "AGTC", "AIVA", "AGP", "ADF", "PRD"],
    });
    expect(jql).toContain('project in ("UX", "WS", "AGTC", "AIVA", "AGP", "ADF", "PRD")');
    expect(jql).toContain("assignee WAS IN");
  });

  it("lists configured workflow project keys from default mappings", () => {
    const projects = [...new Set(DEFAULT_WORKFLOW_MAPPINGS.map((m) => m.projectKey))].sort();
    for (const key of ["UX", "WS", "AGTC", "PRD", "ARCH"]) {
      expect(projects).toContain(key);
    }
  });

  it("collectLinkedIssueKeys includes parent and link targets across projects", () => {
    const initiative = rawIssue("INIT-1", "PRD");
    const child = rawIssue("UX-100", "UX", "INIT-1", "WS-50");
    const keys = collectLinkedIssueKeys([child]);
    expect(keys).toContain("INIT-1");
    expect(keys).toContain("WS-50");
    expect(keys).not.toContain("UX-100");

    const merged = [child, initiative];
    const known = new Set(merged.map((i) => i.key));
    const toFetch = collectLinkedIssueKeys(merged).filter((k) => !known.has(k));
    expect(toFetch).toContain("WS-50");
    expect(toFetch).not.toContain("INIT-1");
  });
});
