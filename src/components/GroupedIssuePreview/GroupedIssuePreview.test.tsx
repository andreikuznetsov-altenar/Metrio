import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GroupedIssuePreview } from "./GroupedIssuePreview";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

describe("GroupedIssuePreview", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders one issue inline", () => {
    render(
      <GroupedIssuePreview issueKeys={["UX-1"]} jiraBaseUrl="https://jira.example.com" />,
    );
    expect(screen.getByTestId("grouped-issue-preview")).toBeTruthy();
    expect(screen.getByText("UX-1")).toBeTruthy();
    expect(screen.queryByTestId("grouped-issue-count-link")).toBeNull();
  });

  it("renders count link and opens tabular modal for multiple issues", () => {
    render(
      <GroupedIssuePreview
        issueKeys={["UX-1", "UX-2", "UX-3"]}
        jiraBaseUrl="https://jira.example.com"
        modalTitle="Attention tasks"
      />,
    );
    expect(screen.getByTestId("grouped-issue-count-link")).toHaveTextContent("3 tasks");
    fireEvent.click(screen.getByTestId("grouped-issue-count-link"));
    expect(screen.getByTestId("task-list-modal")).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Issue" })).toBeTruthy();
  });

  it("opens task modal at app level when rendered inside a drawer host", () => {
    const host = document.createElement("div");
    host.className = "drawer-root";
    host.style.overflow = "hidden";
    document.body.appendChild(host);
    render(
      <GroupedIssuePreview
        issueKeys={["UX-1", "UX-2"]}
        jiraBaseUrl="https://jira.example.com"
        modalTitle="No activity"
      />,
      { container: host },
    );
    fireEvent.click(screen.getByTestId("grouped-issue-count-link"));
    const modalRoot = screen.getByTestId("metrio-modal-root");
    expect(modalRoot.parentElement).toBe(document.body);
    expect(screen.getByTestId("task-list-modal")).toBeTruthy();
    expect(host.querySelector(".metrio-modal-root")).toBeNull();
    host.remove();
  });
});
