// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";

describe("UI Repair Pass 7A", () => {
  it("DashboardQueuePanel uses Context column, not Status", async () => {
    const source = await readFile(
      resolve(import.meta.dirname, "../pages/home/dashboard/DashboardQueuePanel.tsx"),
      "utf8",
    );
    expect(source).toContain('label: "Context"');
    expect(source).not.toMatch(/label:\s*"Status"/);
  });

  it("manager dashboard removes empty new assignments and orphaned Open Performance", async () => {
    const source = await readFile(
      resolve(import.meta.dirname, "../pages/home/dashboard/ManagerExecutiveDashboard.tsx"),
      "utf8",
    );
    expect(source).not.toContain("No new assignments");
    expect(source).not.toContain("Open Performance");
    expect(source).toContain("DashboardMetricsPair");
    expect(source).toContain("DashboardLowerThreeCards");
    expect(source).toContain("DashboardRecommendations");
    expect(source).not.toMatch(/newAssignmentCount\s*>\s*0[\s\S]*No new assignments/);
  });

  it("employee dashboard hides empty new assignments row", async () => {
    const source = await readFile(
      resolve(import.meta.dirname, "../pages/home/dashboard/EmployeeExecutiveDashboard.tsx"),
      "utf8",
    );
    expect(source).not.toContain("No new assignments");
  });

  it("HomePage routes manager team brief into executive dashboard", async () => {
    const source = await readFile(
      resolve(import.meta.dirname, "../pages/home/HomePage.tsx"),
      "utf8",
    );
    expect(source).toContain("teamBrief={managerTeamBrief}");
    expect(source).toContain("managerTeamBrief");
  });

  it("dashboard action grid styles include reason stack and header row", () => {
    const css = readFileSync(
      resolve(import.meta.dirname, "../pages/performance/action-queue.css"),
      "utf8",
    );
    expect(css).toContain(".action-queue__dashboard-reasons");
    expect(css).toContain(".action-queue__dashboard-header");
  });

  it("secondary modules share executive-dashboard secondary layout", () => {
    const css = readFileSync(
      resolve(import.meta.dirname, "../pages/home/dashboard/executive-dashboard.css"),
      "utf8",
    );
    expect(css).toContain(".executive-dashboard__secondary--pair");
    expect(css).toContain(".executive-dashboard__secondary--single");
  });
});
