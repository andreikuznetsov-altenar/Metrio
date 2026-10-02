import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { PerformanceContentShell } from "./PerformanceContentShell";

vi.mock("../../app/PerformanceDataContext", () => ({
  usePerformanceData: vi.fn(),
}));

import { usePerformanceData } from "../../app/PerformanceDataContext";

const mockUsePerformanceData = vi.mocked(usePerformanceData);

describe("PerformanceContentShell", () => {
  beforeEach(() => {
    mockUsePerformanceData.mockReset();
  });

  afterEach(() => {
    cleanup();
  });
  it("renders overlay when contentOverlayVisible is true", () => {
    mockUsePerformanceData.mockReturnValue({
      contentOverlayVisible: true,
      contentLoadingActive: true,
    } as ReturnType<typeof usePerformanceData>);

    render(
      <PerformanceContentShell>
        <div data-testid="child">content</div>
      </PerformanceContentShell>,
    );

    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(screen.getByTestId("performance-content-overlay")).toBeInTheDocument();
    expect(screen.getByTestId("performance-content-area")).toHaveAttribute(
      "aria-busy",
      "true",
    );
  });

  it("keeps child content when overlay is hidden", () => {
    mockUsePerformanceData.mockReturnValue({
      contentOverlayVisible: false,
      contentLoadingActive: false,
    } as ReturnType<typeof usePerformanceData>);

    render(
      <PerformanceContentShell>
        <div data-testid="child">content</div>
      </PerformanceContentShell>,
    );

    expect(screen.getByTestId("child")).toHaveTextContent("content");
    expect(screen.queryByTestId("performance-content-overlay")).toBeNull();
  });
});
