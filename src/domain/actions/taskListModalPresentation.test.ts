import { describe, expect, it } from "vitest";
import {
  formatIssueCountLabel,
  formatPersonTaskListModalTitle,
} from "./taskListModalPresentation";

describe("taskListModalPresentation", () => {
  it("formats person modal title", () => {
    expect(formatPersonTaskListModalTitle("Daria Chernova", 10)).toBe(
      "Daria Chernova. 10 tasks.",
    );
    expect(formatPersonTaskListModalTitle("Daria Chernova", 1)).toBe(
      "Daria Chernova. 1 task.",
    );
  });

  it("formats issue count label", () => {
    expect(formatIssueCountLabel(1)).toBe("1 issue");
    expect(formatIssueCountLabel(13)).toBe("13 issues");
  });
});
