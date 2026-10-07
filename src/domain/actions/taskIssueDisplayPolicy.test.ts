import { describe, expect, it } from "vitest";
import {
  shouldShowInlineTaskIssue,
  shouldShowTaskCountLink,
} from "./taskIssueDisplayPolicy";

describe("taskIssueDisplayPolicy", () => {
  it("shows a single issue inline and count link for multiple", () => {
    expect(shouldShowInlineTaskIssue(1)).toBe(true);
    expect(shouldShowTaskCountLink(1)).toBe(false);
    expect(shouldShowInlineTaskIssue(2)).toBe(false);
    expect(shouldShowTaskCountLink(2)).toBe(true);
  });
});
