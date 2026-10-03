import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { createElement } from "react";
import { TooltipProvider } from "../../components/Tooltip/Tooltip";
import { EmployeeWorkHistoryView } from "./EmployeeWorkHistoryView";

vi.mock("../../services/performance/performanceDataService", () => ({
  fetchPerformanceData: vi.fn(),
}));

vi.mock("../../app/PerformanceExportContext", () => ({
  usePerformanceExport: () => ({
    registerTeamView: vi.fn(),
    registerEmployeeView: vi.fn(),
    registerWorkHistoryPeriod: vi.fn(),
    exportCurrentView: vi.fn(async () => null),
    canExport: false,
    exporting: false,
  }),
}));

import { fetchPerformanceData } from "../../services/performance/performanceDataService";

const mockFetch = vi.mocked(fetchPerformanceData);

const historyProps = {
  personId: "person-sam",
  personName: "Sam",
  historyWeek: [],
  historyMonth: [
    {
      label: "2026-03",
      completedCount: 1,
      firstPassCount: 1,
      reviewReturns: 0,
      rows: [
        {
          key: "UX-1",
          title: "Task",
          project: "UX",
          completedOn: "1 Mar 2026",
          cycle: "2d",
          outcome: "First pass",
          firstPass: true,
        },
      ],
    },
  ],
  historyQuarter: [
    {
      label: "2026-Q1",
      completedCount: 1,
      firstPassCount: 1,
      reviewReturns: 0,
      rows: [
        {
          key: "UX-2",
          title: "Other",
          project: "UX",
          completedOn: "2 Mar 2026",
          cycle: "1d",
          outcome: "Rework",
          firstPass: false,
        },
      ],
    },
  ],
};

describe("EmployeeWorkHistoryView request counts", () => {
  it("does not fetch performance when mounted with local history props", () => {
    render(
      createElement(
        TooltipProvider,
        null,
        createElement(EmployeeWorkHistoryView, historyProps),
      ),
    );
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
