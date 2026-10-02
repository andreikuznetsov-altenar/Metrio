import { describe, expect, it } from "vitest";
import { linksFromRemoteLinks } from "./explicitLinks";

describe("linksFromRemoteLinks", () => {
  it("creates explicit_link for Confluence URLs", () => {
    const links = linksFromRemoteLinks(
      [
        {
          issueKey: "UX-1",
          url: "https://altenar.atlassian.net/wiki/spaces/UX/pages/123/Guide",
          title: "UX Portal Guidelines",
        },
      ],
      "https://altenar.atlassian.net",
    );
    expect(links).toHaveLength(1);
    expect(links[0].confidence).toBe("explicit_link");
    expect(links[0].issueKey).toBe("UX-1");
  });

  it("ignores non-Confluence remote links", () => {
    const links = linksFromRemoteLinks(
      [{ issueKey: "UX-1", url: "https://example.com/doc" }],
      "https://altenar.atlassian.net",
    );
    expect(links).toHaveLength(0);
  });
});
