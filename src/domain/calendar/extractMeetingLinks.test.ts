import { describe, expect, it } from "vitest";
import {
  extractConfluenceUrlsFromText,
  extractJiraKeysFromText,
} from "./extractMeetingLinks";

describe("extractMeetingLinks", () => {
  it("extracts exact Jira keys", () => {
    expect(extractJiraKeysFromText("Review PROJ-42 and UX-1")).toEqual([
      "PROJ-42",
      "UX-1",
    ]);
  });

  it("extracts explicit Confluence URLs only", () => {
    const text =
      "Notes https://acme.atlassian.net/wiki/spaces/DEV/pages/123/Spec";
    expect(extractConfluenceUrlsFromText(text)).toHaveLength(1);
  });
});
