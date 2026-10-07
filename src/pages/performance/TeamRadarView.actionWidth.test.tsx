import fs from "node:fs";
import path from "node:path";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { TeamRadarRow } from "../../domain/performance";
import { TeamRadarView } from "./TeamRadarView";

vi.mock("../../platform/preferences", () => ({
  loadPreferences: vi.fn().mockResolvedValue({
    jira: { baseUrl: "https://jira.example.com" },
  }),
}));

vi.mock("../../app/PerformanceDataContext", () => ({
  usePerformanceData: () => ({
    data: { teamSnapshot: { persons: [] } },
  }),
}));

const rows: TeamRadarRow[] = [
  {
    personId: "p1",
    personName: "Alex",
    severity: "High",
    severityVariant: "warning",
    reason: "Stalled",
    reasonDetail: "Stalled",
    primaryIssueKey: "UX-1",
    relatedIssueKeys: ["UX-1"],
    primaryAction: "review_workload",
    tasksAffected: 2,
    action: "Review workload",
  },
  {
    personId: "p2",
    personName: "Beth",
    severity: "Watch",
    severityVariant: "neutral",
    reason: "Monitoring",
    reasonDetail: "Monitoring",
    primaryAction: "view_person",
    tasksAffected: 1,
    action: "View person",
  },
];

afterEach(() => {
  cleanup();
});

describe("TeamRadarView action button geometry", () => {
  it("uses one shared Radar action width token for every action button", () => {
    const css = fs.readFileSync(
      path.resolve(process.cwd(), "src/pages/performance/performance-dashboard.css"),
      "utf8",
    );
    const tokens = fs.readFileSync(
      path.resolve(process.cwd(), "src/styles/tokens.css"),
      "utf8",
    );
    expect(tokens).toMatch(/--radar-action-button-width:\s*10\.5rem/);
    expect(css).toMatch(
      /\.performance-table__radar-action[\s\S]*width:\s*var\(--radar-action-button-width\)/,
    );
    expect(css).toMatch(
      /\.performance-table\.performance-table--radar col\.col-action[\s\S]*var\(--radar-action-button-width\)/,
    );

    render(<TeamRadarView rows={rows} onOpenPerson={() => {}} />);
    const review = screen.getByRole("button", { name: "Review workload" });
    const view = screen.getByRole("button", { name: "View person" });
    expect(review.className).toContain("performance-table__radar-action");
    expect(view.className).toContain("performance-table__radar-action");
    expect(review.className).toBe(view.className);
  });
});
