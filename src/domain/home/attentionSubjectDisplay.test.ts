import { describe, expect, it } from "vitest";
import { shouldAppendAttentionSubjectTitle } from "./attentionSubjectDisplay";

describe("shouldAppendAttentionSubjectTitle", () => {
  it("skips duplicate single-key subject lines", () => {
    expect(shouldAppendAttentionSubjectTitle("UX-5726", ["UX-5726"])).toBe(false);
    expect(shouldAppendAttentionSubjectTitle("— UX-5726", ["UX-5726"])).toBe(false);
  });

  it("keeps distinct context for multi-key rows", () => {
    expect(shouldAppendAttentionSubjectTitle("Escalation batch", ["UX-1", "UX-2"])).toBe(
      true,
    );
  });
});
