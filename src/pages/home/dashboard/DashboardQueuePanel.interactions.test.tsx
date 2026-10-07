// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../platform/openExternal", () => ({
  openExternalUrl: vi.fn(async () => undefined),
}));
import type { ActionItem } from "../../../domain/actions/actionTypes";
import { DashboardActionTabs } from "./DashboardActionTabs";
import { DashboardQueuePanel } from "./DashboardQueuePanel";

afterEach(() => cleanup());

function jiraItem(
  id: string,
  issueKey: string,
  reason: string,
  extra: Partial<ActionItem> = {},
): ActionItem {
  return {
    id,
    kind: "task_attention",
    severity: "warning",
    title: issueKey,
    description: reason,
    issueKeys: [issueKey],
    target: { kind: "jira", issueKey },
    source: "jira",
    ...extra,
  };
}

const unsortedFocus: ActionItem[] = [
  jiraItem("c", "UX-300", "No activity"),
  jiraItem("a", "UX-100", "Blocked"),
  jiraItem("b", "UX-200", "Long Review"),
];

function rowKeys(table: HTMLElement): string[] {
  return within(table)
    .getAllByTestId("dashboard-action-row")
    .map((row) => row.querySelector('[data-testid="jira-issue-link"]')?.textContent ?? "");
}

describe("My Focus column sorting", () => {
  it("reorders DOM rows ascending then descending on Work", async () => {
    const user = userEvent.setup();
    render(
      <DashboardQueuePanel
        title="My focus"
        workColumnLabel="Work"
        items={unsortedFocus}
        emptyMessage="empty"
        onOpen={() => undefined}
        openLabel={() => "Open Jira"}
        testId="dashboard-tab-focus"
        jiraBaseUrl="https://jira.example.com"
      />,
    );
    const table = screen.getByTestId("dashboard-action-queue");
    expect(rowKeys(table)).toEqual(["UX-300", "UX-100", "UX-200"]);

    await user.click(within(table).getByRole("button", { name: /work/i }));
    expect(rowKeys(table)).toEqual(["UX-100", "UX-200", "UX-300"]);
    expect(within(table).getByRole("columnheader", { name: /work/i })).toHaveAttribute(
      "aria-sort",
      "ascending",
    );

    await user.click(within(table).getByRole("button", { name: /work/i }));
    expect(rowKeys(table)).toEqual(["UX-300", "UX-200", "UX-100"]);
    expect(within(table).getByRole("columnheader", { name: /work/i })).toHaveAttribute(
      "aria-sort",
      "descending",
    );
  });

  it("reorders DOM rows by reason tag rank", async () => {
    const user = userEvent.setup();
    render(
      <DashboardQueuePanel
        title="My focus"
        workColumnLabel="Work"
        items={unsortedFocus}
        emptyMessage="empty"
        onOpen={() => undefined}
        openLabel={() => "Open Jira"}
        testId="dashboard-tab-focus"
      />,
    );
    const table = screen.getByTestId("dashboard-action-queue");
    await user.click(within(table).getByRole("button", { name: /reason/i }));
    expect(rowKeys(table)).toEqual(["UX-100", "UX-300", "UX-200"]);
  });

  it("does not start header sorting when a Jira link is clicked", async () => {
    const user = userEvent.setup();
    render(
      <DashboardQueuePanel
        title="My focus"
        workColumnLabel="Work"
        items={unsortedFocus}
        emptyMessage="empty"
        onOpen={() => undefined}
        openLabel={() => "Open Jira"}
        testId="dashboard-tab-focus"
        jiraBaseUrl="https://jira.example.com"
      />,
    );
    const table = screen.getByTestId("dashboard-action-queue");
    const before = rowKeys(table);
    await user.click(within(table).getByRole("link", { name: "UX-300" }));
    expect(rowKeys(table)).toEqual(before);
    expect(within(table).queryByRole("columnheader", { name: /work/i })).not.toHaveAttribute(
      "aria-sort",
      "ascending",
    );
  });
});

describe("Team Actions sort UI", () => {
  it("renders Team Actions headers as plain text without sort controls", async () => {
    const user = userEvent.setup();
    render(
      <DashboardActionTabs
        tabs={[
          {
            id: "focus",
            label: "My focus",
            items: unsortedFocus,
            emptyMessage: "empty",
          },
          {
            id: "team",
            label: "Team actions",
            items: unsortedFocus,
            emptyMessage: "empty",
          },
        ]}
        onOpenAction={() => undefined}
        actionOpenLabel={() => "View person"}
      />,
    );
    await user.click(screen.getByRole("tab", { name: /team actions/i }));
    const panel = screen.getByTestId("dashboard-tab-team");
    const table = within(panel).getByTestId("dashboard-action-queue");
    expect(within(table).queryAllByRole("button")).toHaveLength(3);
    expect(table.querySelector(".performance-table__sort-btn")).toBeNull();
    expect(table.querySelector(".performance-table__sort-icon")).toBeNull();
    expect(table.querySelector("[aria-sort]")).toBeNull();
    expect(within(table).getByText("Work")).toBeTruthy();
    expect(within(table).getByText("Reason")).toBeTruthy();
  });
});
