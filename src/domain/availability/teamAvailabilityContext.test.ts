import { describe, expect, it } from "vitest";
import type { TeamPerformanceSnapshot } from "../performance";
import {
  buildManagerAvailabilityRows,
  detectTeamLeaveOverlaps,
} from "./teamAvailabilityContext";

const baseSnapshot = (): TeamPerformanceSnapshot => ({
  directReportIds: ["a", "b"],
  summary: [],
  attention: [],
  attentionTotalCount: 0,
  trends: [],
  workload: [
    {
      personId: "a",
      personName: "Daria",
      activeWork: 6,
      atRisk: 0,
      workload: "Balanced",
      availability: "Vacation soon",
    },
    {
      personId: "b",
      personName: "Konstantin",
      activeWork: 4,
      atRisk: 0,
      workload: "Light",
      availability: "Available",
    },
  ],
  timeOff: [
    {
      personId: "a",
      personName: "Daria",
      rangeLabel: "12–16 Oct",
      note: "Vacation",
      startDate: "2026-10-12",
      endDate: "2026-10-16",
    },
    {
      personId: "b",
      personName: "Konstantin",
      rangeLabel: "21–25 Oct",
      note: "Vacation",
      startDate: "2026-10-21",
      endDate: "2026-10-25",
    },
    {
      personId: "c",
      personName: "Elena",
      rangeLabel: "21–25 Oct",
      note: "Vacation",
      startDate: "2026-10-21",
      endDate: "2026-10-25",
    },
  ],
  personDetails: {},
});

describe("teamAvailabilityContext", () => {
  const now = new Date("2026-10-09T12:00:00.000Z");

  it("builds manager rows with review-aware severity", () => {
    const rows = buildManagerAvailabilityRows(
      baseSnapshot(),
      [
        {
          issueKey: "UX-1",
          issueTitle: "x",
          ownerId: "a",
          age: "3 days",
          status: "In Review",
          riskReason: "stale",
        },
        {
          issueKey: "UX-2",
          issueTitle: "y",
          ownerId: "a",
          age: "2 days",
          status: "In Review",
          riskReason: "stale",
        },
      ],
      now,
    );
    expect(rows[0].personName).toBe("Daria");
    expect(rows[0].inReviewCount).toBe(2);
    expect(rows[0].severity).toBe("warning");
  });

  it("detects overlapping leave windows", () => {
    const overlaps = detectTeamLeaveOverlaps(baseSnapshot(), 2, now);
    expect(overlaps).toHaveLength(1);
    expect(overlaps[0].personCount).toBe(2);
    expect(overlaps[0].personIds).toEqual(["b", "c"]);
  });
});
