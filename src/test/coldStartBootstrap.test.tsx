import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (rel: string) =>
  fs.readFileSync(path.resolve(process.cwd(), rel), "utf8");

describe("Pass 13.8F-0 cold start bootstrap UI", () => {
  it("Home initial_loading uses centered workspace loading state", () => {
    const home = read("src/pages/home/HomePage.tsx");
    expect(home).toContain("DashboardWorkspaceLoadingState");
    expect(home).not.toContain("home-skeleton");
  });

  it("team performance initial load avoids overview skeleton", () => {
    const team = read("src/pages/performance/TeamPerformanceOverview.tsx");
    const start = team.indexOf('if (uiState === "initial-loading")');
    const end = team.indexOf("if (visualForceSkeleton)");
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const initialLoadingBlock = team.slice(start, end);
    expect(initialLoadingBlock).toContain("WorkspaceContentLoadingState");
    expect(initialLoadingBlock).not.toContain("PerformanceOverviewSkeleton");
  });

  it("workspace shell uses shared centered loading component", () => {
    const shell = read("src/app/AuthenticatedWorkspaceShell.tsx");
    expect(shell).toContain("WorkspaceContentLoadingState");
    expect(shell).not.toContain('className="type-heading"');
  });

  it("maps dashboard health states to distinct surfaces", () => {
    const home = read("src/pages/home/HomePage.tsx");
    expect(home).toContain("DashboardFirstRunState");
    expect(home).toContain("DashboardWorkspaceLoadingState");
    expect(home).toContain("DashboardBlockingErrorState");
  });
});
