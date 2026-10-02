import { describe, expect, it } from "vitest";
import {
  isActiveWorkStatus,
  isTerminalNonCompletionStatus,
} from "./issueTerminalStatus";
import { isCompletionStatus } from "./issueCompletion";

describe("issueTerminalStatus", () => {
  it("recognizes cancelled variants", () => {
    expect(isTerminalNonCompletionStatus("Cancelled")).toBe(true);
    expect(isTerminalNonCompletionStatus("M. Cancelled")).toBe(true);
    expect(isTerminalNonCompletionStatus("canceled")).toBe(true);
  });

  it("does not treat completion statuses as terminal non-completion", () => {
    expect(isTerminalNonCompletionStatus("Done")).toBe(false);
    expect(isTerminalNonCompletionStatus("Approved")).toBe(false);
  });

  it("excludes cancelled from active work but keeps in-progress active", () => {
    expect(isActiveWorkStatus("Cancelled", false)).toBe(false);
    expect(isActiveWorkStatus("M. Cancelled", false)).toBe(false);
    expect(isActiveWorkStatus("In Progress", false)).toBe(true);
    expect(isActiveWorkStatus("Done", isCompletionStatus("Done"))).toBe(false);
  });
});
