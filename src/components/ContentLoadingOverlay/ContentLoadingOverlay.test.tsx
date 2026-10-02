import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ContentLoadingOverlay } from "./ContentLoadingOverlay";

describe("ContentLoadingOverlay", () => {
  afterEach(() => {
    cleanup();
  });
  it("renders label when visible", () => {
    render(<ContentLoadingOverlay visible label="Loading performance data..." />);
    expect(screen.getByTestId("performance-content-overlay")).toBeInTheDocument();
    expect(screen.getByText("Loading performance data...")).toBeInTheDocument();
  });

  it("renders nothing when not visible", () => {
    render(<ContentLoadingOverlay visible={false} />);
    expect(screen.queryByTestId("performance-content-overlay")).toBeNull();
  });
});
