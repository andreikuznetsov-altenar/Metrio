import { describe, expect, it } from "vitest";
import { buildArchivedReportFilename } from "./reportHistoryFilename";
import {
  formatReportHistoryDate,
  formatReportHistoryTime,
} from "./reportHistoryPresentation";

describe("report history presentation", () => {
  it("builds deterministic archived filenames", () => {
    const date = new Date(2026, 9, 7, 15, 2, 0);
    expect(buildArchivedReportFilename(date)).toBe("Metrio_Report_2026-10-07_15-02.pdf");
  });

  it("formats date and time for table display", () => {
    const createdAt = "2026-10-07T15:02:00.000Z";
    expect(formatReportHistoryDate(createdAt, "en-GB")).toContain("2026");
    expect(formatReportHistoryTime(createdAt, "en-GB")).toMatch(/\d{2}:\d{2}/);
  });
});
