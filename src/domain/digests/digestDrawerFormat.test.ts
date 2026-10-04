import { describe, expect, it } from "vitest";
import {
  digestSectionCards,
  formatDigestDrawerSubtitle,
  formatDigestDrawerTitle,
} from "./digestDrawerFormat";
import type { OperationalDigest } from "./digestTypes";

function weeklyDigest(periodLabel: string): OperationalDigest {
  return {
    kind: "weekly",
    role: "manager",
    id: "weekly:test",
    periodLabel,
    summaryLine: "1 completed",
    generatedAt: "2026-10-01T08:00:00.000Z",
    sinceLabel: "Calendar week",
    plainText: "",
    sections: [
      {
        id: "week",
        title: "This week",
        lines: ["Completed: 1", "First pass: 100%"],
      },
      {
        id: "delivery",
        title: "Delivery changes",
        lines: ["No significant delivery changes since your previous brief."],
      },
    ],
  };
}

describe("digestDrawerFormat", () => {
  it("formats weekly ISO week title as human date range", () => {
    const title = formatDigestDrawerTitle(weeklyDigest("Week of 2026-09-28"));
    expect(title).toBe("28 Sep – 4 Oct 2026");
    expect(formatDigestDrawerSubtitle(weeklyDigest("Week of 2026-09-28"))).toMatch(
      /Calendar week/,
    );
  });

  it("renders week metrics and empty section copy without bullets", () => {
    const cards = digestSectionCards(weeklyDigest("Week of 2026-09-28"));
    const week = cards.find((card) => card.id === "week");
    expect(week?.metrics).toEqual([
      { label: "Completed", value: "1" },
      { label: "First pass", value: "100%" },
    ]);
    const delivery = cards.find((card) => card.id === "delivery");
    expect(delivery?.body).toContain("No significant delivery changes");
    expect(delivery?.lines).toBeUndefined();
  });
});
