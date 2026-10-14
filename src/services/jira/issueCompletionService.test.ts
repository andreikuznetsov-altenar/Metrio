import { describe, expect, it, vi } from "vitest";
import {
  IssueCompletionError,
  createFixtureIssueCompletionService,
  createJiraIssueCompletionService,
} from "./issueCompletionService";
import type { AuditIssue } from "../../domain/jira/types";

const issue = {
  issueKey: "UX-123",
  projectKey: "UX",
  issueTypeName: "Task",
  currentStatus: "In Review",
  events: [],
  rangeEvents: [],
} as unknown as AuditIssue;

function client(over: Record<string, unknown> = {}) {
  const calls: string[] = [];
  const c = {
    fetchIssueTransitions: vi.fn(async () => {
      calls.push("transitions");
      return {
        transitions: [
          { id: "31", name: "Close", to: { name: "Closed" } },
          { id: "32", name: "Cancel", to: { name: "Cancelled" } },
        ],
      };
    }),
    transitionIssue: vi.fn(async (_k: string, _id: string) => {
      calls.push("transition");
    }),
    fetchIssueByKey: vi.fn(async () => {
      calls.push("refetch");
      return { fields: { status: { name: "Closed" } } };
    }),
    fetchAllChangelog: vi.fn(async () => {
      calls.push("changelog");
      return [
        {
          created: "2026-10-14T10:00:00.000Z",
          author: { displayName: "Me" },
          items: [{ field: "status", fromString: "In Review", toString: "Closed" }],
        },
      ];
    }),
    ...over,
  };
  return { c, calls };
}

describe("Jira completion service", () => {
  it("offers only terminal-success transitions (Cancelled excluded) with human names", async () => {
    const { c } = client();
    const svc = createJiraIssueCompletionService(c);
    expect(await svc.fetchOptions(issue)).toEqual([{ transitionId: "31", targetStatus: "Closed" }]);
  });

  it("sends the exact transition id, then re-fetches the exact issue and changelog", async () => {
    const { c, calls } = client();
    const svc = createJiraIssueCompletionService(c);
    const verified = await svc.complete(issue, { transitionId: "31", targetStatus: "Closed" });
    expect(c.transitionIssue).toHaveBeenCalledWith("UX-123", "31");
    expect(c.fetchIssueByKey).toHaveBeenCalledWith("UX-123");
    expect(calls).toEqual(["transition", "refetch", "changelog"]);
    expect(verified.currentStatus).toBe("Closed");
    expect(verified.statusEvents.map((e) => e.toValue)).toEqual(["Closed"]);
  });

  it("a Jira rejection is surfaced and nothing is re-read or applied", async () => {
    const { c } = client({ transitionIssue: vi.fn(async () => Promise.reject(new Error("403"))) });
    const svc = createJiraIssueCompletionService(c);
    await expect(svc.complete(issue, { transitionId: "31", targetStatus: "Closed" })).rejects.toMatchObject({
      kind: "rejected",
    });
    expect(c.fetchIssueByKey).not.toHaveBeenCalled();
  });

  it("transition accepted but re-read fails → stale_refresh (caller must not apply anything)", async () => {
    const { c } = client({ fetchIssueByKey: vi.fn(async () => Promise.reject(new Error("net"))) });
    const svc = createJiraIssueCompletionService(c);
    const err = await svc.complete(issue, { transitionId: "31", targetStatus: "Closed" }).catch((e) => e);
    expect(err).toBeInstanceOf(IssueCompletionError);
    expect(err.kind).toBe("stale_refresh");
  });

  it("fixture service never touches a Jira client", async () => {
    const svc = createFixtureIssueCompletionService();
    const options = await svc.fetchOptions(issue);
    expect(options).toEqual([{ transitionId: "41", targetStatus: "Done" }]);
    const verified = await svc.complete(issue, options[0]!);
    expect(verified.currentStatus).toBe("Done");
  });
});
