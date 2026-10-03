import { describe, expect, it } from "vitest";
import { formatWorkHistoryRowMeta } from "./workHistoryDisplay";
import type { WorkHistoryRow } from "../performance";

function row(partial: Partial<WorkHistoryRow>): WorkHistoryRow {
  return {
    key: "UX-1",
    title: "Task",
    project: "UX",
    completedOn: "—",
    cycle: "—",
    outcome: "First pass",
    ...partial,
  };
}

describe("formatWorkHistoryRowMeta", () => {
  it("formats date and cycle with labels", () => {
    expect(
      formatWorkHistoryRowMeta(
        row({
          completedOn: "17 Sep 2026",
          cycleMs: 21 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000,
        }),
      ),
    ).toContain("17 Sep 2026");
    expect(
      formatWorkHistoryRowMeta(
        row({
          completedOn: "17 Sep 2026",
          cycleMs: 21 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000,
        }),
      ),
    ).toMatch(/Cycle \d+(\.\d+)?d/);
  });

  it("omits placeholder dashes", () => {
    expect(formatWorkHistoryRowMeta(row({ completedOn: "—", cycle: "—" }))).toBe(
      "",
    );
  });

  it("does not prefix orphan separators", () => {
    const meta = formatWorkHistoryRowMeta(
      row({
        completedOn: "17 Sep 2026",
        cycleMs: 21 * 24 * 60 * 60 * 1000,
      }),
    );
    expect(meta.startsWith("·")).toBe(false);
    expect(meta).toContain("17 Sep 2026");
    expect(meta).toMatch(/Cycle/);
  });
});
