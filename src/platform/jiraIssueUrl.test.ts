import { describe, expect, it } from "vitest";
import { buildJiraIssueBrowseUrl } from "./jiraIssueUrl";

describe("buildJiraIssueBrowseUrl", () => {
  it("builds browse URL without double slashes", () => {
    expect(
      buildJiraIssueBrowseUrl("https://example.atlassian.net/", "UX-5421"),
    ).toBe("https://example.atlassian.net/browse/UX-5421");
  });
});
