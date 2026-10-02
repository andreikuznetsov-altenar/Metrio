import { describe, expect, it } from "vitest";
import {
  buildConfluenceSpaceUrl,
  buildJiraProjectBrowseUrl,
  parseConfluencePageFromUrl,
} from "./atlassianUrls";

describe("atlassianUrls", () => {
  it("builds project and space URLs", () => {
    expect(
      buildJiraProjectBrowseUrl("https://altenar.atlassian.net/", "UX"),
    ).toBe("https://altenar.atlassian.net/browse/UX");
    expect(
      buildConfluenceSpaceUrl("https://altenar.atlassian.net", "UX"),
    ).toContain("/wiki/spaces/UX");
  });

  it("parses page id from Confluence URL", () => {
    const parsed = parseConfluencePageFromUrl(
      "https://altenar.atlassian.net/wiki/pages/viewpage.action?pageId=99",
    );
    expect(parsed.pageId).toBe("99");
  });
});
