import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WorkspaceContentLoadingState } from "./WorkspaceContentLoadingState";

describe("WorkspaceContentLoadingState", () => {
  it("renders centered loading without skeleton markup", () => {
    render(
      <WorkspaceContentLoadingState
        title="Loading your workspace…"
        testId="workspace-content-loading"
      />,
    );
    expect(screen.getByTestId("workspace-content-loading")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("Loading your workspace…")).toBeInTheDocument();
    expect(document.querySelector(".home-skeleton")).toBeNull();
    expect(document.querySelector(".performance-skeleton-dashboard")).toBeNull();
  });
});
