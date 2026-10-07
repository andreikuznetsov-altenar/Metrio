// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { JiraIssueLink } from "../components/JiraIssueLink/JiraIssueLink";
import { TaskListModal } from "../components/TaskListModal/TaskListModal";
import type { TaskListModalRow } from "../domain/actions/buildTaskListModalRows";
import { GroupedIssuePreview } from "../components/GroupedIssuePreview/GroupedIssuePreview";

vi.mock("../platform/openExternal", () => ({
  openExternalUrl: vi.fn(),
}));

const JIRA_BASE = "https://jira.example.com";

describe("Jira issue link contract", () => {
  it("renders browse href for issue keys", () => {
    render(<JiraIssueLink issueKey="UX-5726" jiraBaseUrl={JIRA_BASE} />);
    const link = screen.getByRole("link", { name: "UX-5726" });
    expect(link.getAttribute("href")).toBe(
      "https://jira.example.com/browse/UX-5726",
    );
    expect(link.getAttribute("data-issue-key")).toBe("UX-5726");
  });

  it("supports keyboard activation on the link", async () => {
    render(<JiraIssueLink issueKey="AGTC-105" jiraBaseUrl={JIRA_BASE} />);
    const link = screen.getByRole("link", { name: "AGTC-105" });
    link.focus();
    expect(document.activeElement).toBe(link);
    await userEvent.keyboard("{Enter}");
  });

  it("TaskListModal issue column uses JiraIssueLink when not using onOpenIssue", () => {
    const rows: TaskListModalRow[] = [
      {
        issueKey: "AGTC-108",
        title: "Example",
        createdLabel: "—",
        lastStatusChangeLabel: "—",
        status: "Open",
        jiraUrl: `${JIRA_BASE}/browse/AGTC-108`,
      },
    ];
    render(
      <TaskListModal open onClose={() => undefined} title="Tasks" rows={rows} />,
    );
    const modal = screen.getByTestId("task-list-modal");
    expect(modal.querySelector('[data-testid="jira-issue-link"]')).toBeTruthy();
    expect(screen.getByRole("link", { name: "AGTC-108" }).getAttribute("href")).toContain(
      "/browse/AGTC-108",
    );
  });

  it("GroupedIssuePreview inline key is a Jira link", () => {
    render(
      <GroupedIssuePreview issueKeys={["UX-1"]} jiraBaseUrl={JIRA_BASE} />,
    );
    expect(screen.getByTestId("grouped-issue-preview").querySelector('[data-testid="jira-issue-link"]')).toBeTruthy();
  });
});
