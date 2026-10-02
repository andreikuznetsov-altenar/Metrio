import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  resetCommandPaletteRemoteStatsForTests,
  searchRemoteCommandPalette,
  commandPaletteRemoteStats,
} from "./remoteCommandSearch";

describe("searchRemoteCommandPalette", () => {
  beforeEach(() => {
    resetCommandPaletteRemoteStatsForTests();
  });

  it("looks up issue by key when not cached", async () => {
    const jira = {
      fetchIssueByKey: vi.fn(async () => ({
        key: "UX-99",
        fields: { summary: "Remote issue", status: { name: "Open" } },
      })),
      searchIssues: vi.fn(async () => []),
    };
    const result = await searchRemoteCommandPalette({
      query: "UX-99",
      jira: jira as never,
      confluenceConfig: { baseUrl: "https://x.atlassian.net", email: "a@co.com" },
      knownIssueKeys: new Set(),
      localConfluenceCount: 0,
    });
    expect(commandPaletteRemoteStats.jiraIssueLookups).toBe(1);
    expect(result.results[0]?.title).toContain("UX-99");
  });

  it("marks jira failure without blocking the response", async () => {
    const jira = {
      fetchIssueByKey: vi.fn(async () => {
        throw new Error("jira down");
      }),
      searchIssues: vi.fn(async () => []),
    };
    const result = await searchRemoteCommandPalette({
      query: "UX-404",
      jira: jira as never,
      confluenceConfig: { baseUrl: "https://x.atlassian.net", email: "a@co.com" },
      knownIssueKeys: new Set(),
      localConfluenceCount: 0,
    });
    expect(result.jiraFailed).toBe(true);
    expect(result.results).toHaveLength(0);
  });
});
