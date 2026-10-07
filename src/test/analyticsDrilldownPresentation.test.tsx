import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TooltipProvider } from "../components/Tooltip/Tooltip";
import type { AnalyticsEvidenceIssue } from "../domain/analytics/analyticsEvidenceTypes";
import { displayPersonName } from "../pages/performance/analyticsDrawerPresentation";
import { AnalyticsIssueRow } from "../pages/performance/AnalyticsIssueRow";

describe("displayPersonName", () => {
  it("strips email from assignee display strings", () => {
    expect(displayPersonName("Konstantin Zhuikov <konstantin.zhuikov@altenar.com>")).toBe(
      "Konstantin Zhuikov",
    );
  });
});

describe("AnalyticsIssueRow presentation", () => {
  it("does not render raw email in the row", () => {
    const issue: AnalyticsEvidenceIssue = {
      issueKey: "UX-5826",
      title: "Account closure frontend view",
      personId: "person-1",
      personName: "Konstantin Zhuikov <konstantin.zhuikov@altenar.com>",
      completedAt: "2026-09-29T10:00:00.000Z",
      cycleDurationMs: 3600000 * 1.6,
      outcome: "first_pass",
    };

    render(
      <TooltipProvider>
        <AnalyticsIssueRow issue={issue} onOpenPerson={() => {}} />
      </TooltipProvider>,
    );

    expect(screen.getByText("Konstantin Zhuikov")).toBeInTheDocument();
    expect(screen.queryByText(/@altenar.com/i)).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Open UX-5826 in Jira" }),
    ).toBeInTheDocument();
  });
});
