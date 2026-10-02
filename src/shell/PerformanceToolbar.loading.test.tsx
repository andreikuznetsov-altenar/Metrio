import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PerformanceToolbar } from "./PerformanceToolbar";
import { createPerformanceDateRange } from "../domain/performance/performanceDateRange";

describe("PerformanceToolbar loading state", () => {
  it("disables filter controls when controlsDisabled is true", () => {
    render(
      <PerformanceToolbar
        dateRange={createPerformanceDateRange("30d")}
        reviewTarget="team"
        audience="team"
        controlsDisabled
        onDateRangeChange={vi.fn()}
        onReviewTargetChange={vi.fn()}
        onRefresh={vi.fn()}
        onExportPdf={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: /^From date,/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /^To date,/ })).toBeDisabled();
    expect(screen.getByLabelText("Date range preset")).toBeDisabled();
    expect(screen.getByLabelText("Review target")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Refresh" })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: /export pdf/i }),
    ).toBeDisabled();
  });
});
