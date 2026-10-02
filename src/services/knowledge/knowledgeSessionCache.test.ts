import { describe, expect, it } from "vitest";
import {
  bumpKnowledgeDatasetGeneration,
  getCachedConfluenceSearch,
  knowledgeSearchCacheKey,
  setCachedConfluenceSearch,
} from "./knowledgeSessionCache";

describe("knowledgeSessionCache", () => {
  it("reuses cached search results", () => {
    const key = knowledgeSearchCacheKey({
      spaceKey: "UX",
      query: "type=page",
    });
    setCachedConfluenceSearch(key, [
      { id: "1", title: "Handbook", url: "https://x/wiki/1" },
    ]);
    expect(getCachedConfluenceSearch(key)?.[0].title).toBe("Handbook");
  });

  it("invalidates on dataset bump", () => {
    const key = knowledgeSearchCacheKey({ query: "q" });
    setCachedConfluenceSearch(key, [{ id: "1", title: "A", url: "u" }]);
    bumpKnowledgeDatasetGeneration();
    const newKey = knowledgeSearchCacheKey({ query: "q" });
    expect(getCachedConfluenceSearch(newKey)).toBeUndefined();
  });
});
