// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PerformanceToolbar } from "./PerformanceToolbar";
import { createPerformanceDateRange } from "../domain/performance/performanceDateRange";

describe("PerformanceToolbar export busy state", () => {
  it("shows spinner, keeps Export PDF label, and uses muted disabled styling", () => {
    const { container } = render(
      <PerformanceToolbar
        dateRange={createPerformanceDateRange("30d")}
        reviewTarget="team"
        audience="team"
        onDateRangeChange={vi.fn()}
        onReviewTargetChange={vi.fn()}
        onRefresh={vi.fn()}
        onExportPdf={vi.fn()}
        exportBusy
      />,
    );

    const button = screen.getByRole("button", { name: /export pdf/i });
    expect(button).toHaveTextContent("Export PDF");
    expect(button).toBeDisabled();
    expect(button.getAttribute("aria-busy")).toBe("true");
    expect(button.className).toContain("performance-toolbar__export-btn--busy");
    expect(button.className).not.toContain("btn--primary");
    expect(container.querySelector(".performance-toolbar__export-spinner")).toBeTruthy();
    expect(container.querySelector(".performance-toolbar__export-icon")).toBeNull();
  });
});
