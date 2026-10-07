// @vitest-environment jsdom
import fs from "node:fs";
import path from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { JiraIssueText } from "../components/JiraIssueLink/JiraIssueText";

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

const CORE_TASK_SURFACES = [
  "src/components/Table/DashboardActionQueueTable.tsx",
  "src/components/TaskListModal/TaskListModal.tsx",
  "src/components/GroupedIssuePreview/GroupedIssuePreview.tsx",
  "src/pages/home/dashboard/EmployeeExecutiveDashboard.tsx",
  "src/pages/home/dashboard/ManagerExecutiveDashboard.tsx",
  "src/pages/home/dashboard/DashboardRecommendations.tsx",
  "src/pages/performance/AnalyticsIssueRow.tsx",
  "src/pages/performance/EmployeeMyWeekView.tsx",
  "src/pages/performance/PersonWorkRow.tsx",
  "src/pages/performance/TeamDeliveryRiskView.tsx",
  "src/pages/performance/GoalCard.tsx",
  "src/pages/project/DependencyDetailDrawer.tsx",
  "src/shell/NotificationCenter.tsx",
] as const;

describe("PASS14 product Jira issue link audit", () => {
  it("turns every issue key embedded in product copy into a Jira link", () => {
    render(
      <p>
        <JiraIssueText
          text="AGTC-105 blocks UX-5808"
          jiraBaseUrl="https://altenar.atlassian.net"
        />
      </p>,
    );
    expect(screen.getByRole("link", { name: "AGTC-105" })).toHaveAttribute(
      "href",
      "https://altenar.atlassian.net/browse/AGTC-105",
    );
    expect(screen.getByRole("link", { name: "UX-5808" })).toHaveAttribute(
      "href",
      "https://altenar.atlassian.net/browse/UX-5808",
    );
  });

  it.each(CORE_TASK_SURFACES)(
    "%s uses the canonical Jira issue link contract",
    (relativePath) => {
      const source = read(relativePath);
      expect(source).toMatch(/JiraIssueLink|JiraIssueText|GroupedIssuePreview/);
    },
  );

  it("does not regress known plain-text issue-key render patterns", () => {
    const sources = CORE_TASK_SURFACES.map(read).join("\n");
    expect(sources).not.toMatch(
      />\s*\{\s*(?:item|row|task|record|issue)\.issueKey\s*\}\s*</,
    );
    expect(read("src/pages/performance/GoalCard.tsx")).not.toContain(
      'issueKeysSample.slice(0, 2).join(", ")',
    );
  });
});
