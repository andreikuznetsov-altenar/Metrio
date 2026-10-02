import { describe, expect, it } from "vitest";
import { looksLikeIssueKey, normalizeIssueKeyQuery } from "./issueKeyPattern";

describe("issueKeyPattern", () => {
  it("detects Jira issue keys", () => {
    expect(looksLikeIssueKey("UX-6124")).toBe(true);
    expect(looksLikeIssueKey("ux-1")).toBe(true);
    expect(normalizeIssueKeyQuery("ux-6124")).toBe("UX-6124");
    expect(looksLikeIssueKey("hello")).toBe(false);
  });
});
