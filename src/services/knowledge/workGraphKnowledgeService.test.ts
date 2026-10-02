import { describe, expect, it, vi, beforeEach } from "vitest";
import { resolveIssueKnowledgeBatch } from "./workGraphKnowledgeService";
import { bumpKnowledgeDatasetGeneration } from "./knowledgeSessionCache";

vi.mock("../confluence/confluenceClient", () => ({
  searchConfluencePages: vi.fn(async () => [
    {
      id: "p1",
      title: "UX-1 guide",
      url: "https://x/wiki/p1",
      spaceKey: "UX",
    },
  ]),
}));

import { searchConfluencePages } from "../confluence/confluenceClient";

describe("resolveIssueKnowledgeBatch", () => {
  beforeEach(() => {
    bumpKnowledgeDatasetGeneration();
    vi.mocked(searchConfluencePages).mockClear();
  });

  it("prefers explicit remote links without search", async () => {
    const map = await resolveIssueKnowledgeBatch({
      config: { baseUrl: "https://x.atlassian.net", email: "a@b.com" },
      siteBaseUrl: "https://x.atlassian.net",
      issueKeys: ["UX-1"],
      remoteLinks: [
        {
          issueKey: "UX-1",
          url: "https://x.atlassian.net/wiki/pages/viewpage.action?pageId=9",
          title: "Linked",
        },
      ],
      projectSpaceByKey: { UX: "UX" },
    });
    expect(map.get("UX-1")?.[0].confidence).toBe("explicit_link");
    expect(searchConfluencePages).not.toHaveBeenCalled();
  });

  it("batches search per issue when no explicit link", async () => {
    await resolveIssueKnowledgeBatch({
      config: { baseUrl: "https://x.atlassian.net", email: "a@b.com" },
      siteBaseUrl: "https://x.atlassian.net",
      issueKeys: ["UX-1", "UX-2"],
      remoteLinks: [],
      projectSpaceByKey: { UX: "UX" },
      concurrency: 2,
    });
    expect(searchConfluencePages).toHaveBeenCalledTimes(2);
  });
});
