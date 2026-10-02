import { describe, expect, it } from "vitest";
import { searchLocalCommandPalette } from "./localCommandSearch";
import type { Person } from "../people/types";

function person(id: string, name: string, title?: string): Person {
  return {
    id,
    bamboo: {
      id,
      displayName: name,
      jobTitle: title ?? "",
      department: "Design",
      workEmail: `${id}@co.com`,
      location: "",
      supervisorId: null,
      photoUrl: "",
    },
    issues: [],
    ownedIssues: [
      {
        issueKey: "UX-6124",
        issueSummary: "Sportsbook navigation",
        issueCreated: "",
        assigneeName: name,
        issueTypeName: "Story",
        contentType: "",
        designImprovementType: "",
        epicKey: "",
        epicSummary: "",
        epicStatus: "",
        epicContentType: "",
        epicDesignImprovementType: "",
        events: [],
        rangeEvents: [],
        currentStatus: "In Review",
      },
    ],
    workload: undefined,
    availability: { state: "available", label: "" },
  } as Person;
}

describe("searchLocalCommandPalette", () => {
  it("prioritizes exact issue key matches", () => {
    const results = searchLocalCommandPalette({
      query: "UX-6124",
      people: [person("p1", "Alex")],
      projects: [],
      knowledgePages: [],
      recents: [],
      feedbackEnabled: true,
      jiraBaseUrl: "https://jira.example.com",
    });
    expect(results[0]?.type).toBe("jira_issue");
    expect(results[0]?.title).toContain("UX-6124");
    expect(results[0]?.score).toBeGreaterThanOrEqual(1000);
  });

  it("only searches people passed into local search input", () => {
    const withPerson = searchLocalCommandPalette({
      query: "Daria",
      people: [person("p2", "Daria Chernova", "Product Designer")],
      projects: [],
      knowledgePages: [],
      recents: [],
      feedbackEnabled: false,
      jiraBaseUrl: "",
    });
    const withoutPerson = searchLocalCommandPalette({
      query: "Daria",
      people: [],
      projects: [],
      knowledgePages: [],
      recents: [],
      feedbackEnabled: false,
      jiraBaseUrl: "",
    });
    expect(withPerson.some((result) => result.type === "person")).toBe(true);
    expect(withoutPerson.some((result) => result.type === "person")).toBe(false);
  });

  it("finds people by display name only", () => {
    const results = searchLocalCommandPalette({
      query: "Daria",
      people: [person("p2", "Daria Chernova", "Product Designer")],
      projects: [],
      knowledgePages: [],
      recents: [],
      feedbackEnabled: false,
      jiraBaseUrl: "",
    });
    expect(results.some((result) => result.type === "person")).toBe(true);
  });
});
