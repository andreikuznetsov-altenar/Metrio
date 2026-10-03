import { describe, expect, it } from "vitest";
import { NEW_STARTER_DAYS, isNewStarter } from "./newStarter";
import {
  filterOnboardingResources,
  matchOnboardingResources,
} from "./matchOnboardingResources";
import { NEW_STARTER_PREVIEW_LIMIT } from "./resourceTypes";

const JIRA = "https://jira.example.com";

describe("matchOnboardingResources", () => {
  const today = new Date("2026-03-15T12:00:00Z");

  it("includes company defaults for any department", () => {
    const result = matchOnboardingResources(
      { department: "Unknown", projects: [], confluenceLinks: [] },
      JIRA,
    );
    expect(result.all.some((r) => r.id === "bamboo-hr-portal")).toBe(true);
    expect(result.preview.length).toBeLessThanOrEqual(NEW_STARTER_PREVIEW_LIMIT);
  });

  it("matches department resources for Design", () => {
    const result = matchOnboardingResources(
      { department: "Design", jobTitle: "Product Designer", projects: [], confluenceLinks: [] },
      JIRA,
    );
    expect(result.all.some((r) => r.id === "design-jira")).toBe(true);
  });

  it("does not grant access from jobTitle alone without department", () => {
    const result = matchOnboardingResources(
      { jobTitle: "Product Designer", projects: [], confluenceLinks: [] },
      JIRA,
    );
    expect(result.all.some((r) => r.id === "design-jira")).toBe(false);
  });

  it("includes jira project resources for relevant projects", () => {
    const result = matchOnboardingResources(
      {
        department: "Design",
        projects: [{ key: "UX", name: "UX", jiraUrl: "https://jira/UX" }],
        confluenceLinks: [],
      },
      JIRA,
    );
    expect(result.all.some((r) => r.id === "jira-project-UX")).toBe(true);
  });

  it("excludes low-confidence confluence search", () => {
    const result = matchOnboardingResources(
      {
        projects: [],
        confluenceLinks: [
          {
            id: "1",
            title: "Random",
            url: "https://c/x",
            confidence: "contextual_search",
          },
        ],
      },
      JIRA,
    );
    expect(result.all.some((r) => r.id === "confluence-1")).toBe(false);
  });

  it("includes explicit confluence links", () => {
    const result = matchOnboardingResources(
      {
        projects: [],
        confluenceLinks: [
          {
            id: "99",
            title: "Start here",
            url: "https://c/start",
            confidence: "explicit_link",
          },
        ],
      },
      JIRA,
    );
    expect(result.all.some((r) => r.id === "confluence-99")).toBe(true);
  });

  it("does not ship guessed location wiki URLs from curated catalog", () => {
    const result = matchOnboardingResources(
      { location: "Malta - St Julian's", projects: [], confluenceLinks: [] },
      JIRA,
    );
    expect(result.all.some((r) => r.id === "location-malta")).toBe(false);
  });

  it("dedupes by id keeping higher priority", () => {
    const result = matchOnboardingResources(
      { department: "Design", projects: [], confluenceLinks: [] },
      JIRA,
    );
    const ids = result.all.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("new starter window boundaries", () => {
    const hire = "2026-01-16";
    expect(isNewStarter(hire, today)).toBe(true);
    const day60 = "2026-01-14";
    expect(isNewStarter(day60, today)).toBe(false);
    expect(NEW_STARTER_DAYS).toBe(60);
  });

  it("filters locally by title", () => {
    const result = matchOnboardingResources({ projects: [], confluenceLinks: [] }, JIRA);
    const filtered = filterOnboardingResources(result.all, "bamboo");
    expect(filtered.every((r) => r.title.toLowerCase().includes("bamboo"))).toBe(
      true,
    );
  });
});
