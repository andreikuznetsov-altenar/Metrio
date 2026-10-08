// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

const invoke = vi.fn();

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => invoke(...args),
}));

vi.mock("../../platform/observability/observabilityStore", () => ({
  incrementApiRequest: vi.fn(),
}));

import { JiraClient } from "./jiraClient";
import { ApiError } from "../../platform/apiTypes";

describe("JiraClient.fetchAllChangelogsBatch enrichment isolation", () => {
  beforeEach(() => {
    invoke.mockReset();
  });

  it("keeps successful changelogs when one issue has a transient failure", async () => {
    invoke.mockResolvedValueOnce([
      { issue_key: "UX-1", values: [{ id: "a" }], error: null },
      {
        issue_key: "UX-2",
        values: [],
        error: {
          code: "network_error",
          message: "error sending request for url (https://example/changelog)",
        },
      },
      { issue_key: "UX-3", values: [{ id: "c" }], error: null },
    ]);

    const client = new JiraClient({
      baseUrl: "https://example.atlassian.net",
      email: "user@example.com",
    });
    const result = await client.fetchAllChangelogsBatch(["UX-1", "UX-2", "UX-3"]);

    expect(result.changelogs.get("UX-1")).toEqual([{ id: "a" }]);
    expect(result.changelogs.get("UX-2")).toEqual([]);
    expect(result.changelogs.get("UX-3")).toEqual([{ id: "c" }]);
    expect(result.partialFailures).toHaveLength(1);
    expect(result.partialFailures[0]?.issueKey).toBe("UX-2");
    expect(result.partialFailures[0]?.code).toBe("network_error");
  });

  it("escalates when every issue in a chunk fails authentication", async () => {
    invoke.mockResolvedValueOnce([
      {
        issue_key: "UX-1",
        values: [],
        error: { code: "jira_auth_invalid", message: "Unauthorized", status: 401 },
      },
      {
        issue_key: "UX-2",
        values: [],
        error: { code: "jira_auth_invalid", message: "Unauthorized", status: 401 },
      },
    ]);

    const client = new JiraClient({
      baseUrl: "https://example.atlassian.net",
      email: "user@example.com",
    });
    await expect(client.fetchAllChangelogsBatch(["UX-1", "UX-2"])).rejects.toBeInstanceOf(
      ApiError,
    );
  });

  it("treats a single-issue 403 as optional enrichment, not a core abort", async () => {
    invoke.mockResolvedValueOnce([
      { issue_key: "UX-1", values: [{ id: "ok" }], error: null },
      {
        issue_key: "UX-2",
        values: [],
        error: { code: "jira_access_denied", message: "Forbidden", status: 403 },
      },
    ]);

    const client = new JiraClient({
      baseUrl: "https://example.atlassian.net",
      email: "user@example.com",
    });
    const result = await client.fetchAllChangelogsBatch(["UX-1", "UX-2"]);
    expect(result.changelogs.get("UX-1")).toEqual([{ id: "ok" }]);
    expect(result.changelogs.get("UX-2")).toEqual([]);
    expect(result.partialFailures).toHaveLength(1);
  });
});
