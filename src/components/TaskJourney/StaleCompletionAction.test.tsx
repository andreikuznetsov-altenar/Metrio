import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AuditIssue } from "../../domain/jira/types";
import {
  IssueCompletionError,
  type IssueCompletionService,
} from "../../services/jira/issueCompletionService";
import { StaleCompletionAction } from "./StaleCompletionAction";

const NOW = new Date("2026-10-14T12:00:00.000Z");
const DAY = 86_400_000;

function staleIssue(status = "In Review", daysInStage = 45): AuditIssue {
  return {
    issueKey: "UX-123",
    issueSummary: "Stale",
    issueCreated: "2026-01-01T00:00:00.000Z",
    assigneeName: "A",
    projectKey: "UX",
    issueTypeName: "Task",
    contentType: "none",
    designImprovementType: "",
    epicKey: "",
    epicSummary: "",
    epicStatus: "",
    epicContentType: "",
    epicDesignImprovementType: "",
    events: [
      {
        eventType: "Status",
        changedAt: new Date(NOW.getTime() - daysInStage * DAY).toISOString(),
        changedBy: "U",
        fromValue: "In Progress",
        toValue: status,
        timeSincePreviousStatusMs: null,
        isBackflow: false,
        isHandoff: false,
        isReturnToTeam: false,
        excludeFromBackflow: false,
      },
    ],
    rangeEvents: [],
    currentStatus: status,
  };
}

function service(over: Partial<IssueCompletionService> = {}): IssueCompletionService {
  return {
    fetchOptions: vi.fn(async () => [{ transitionId: "31", targetStatus: "Closed" }]),
    complete: vi.fn(async (issue) => ({
      issueKey: issue.issueKey,
      currentStatus: "Closed",
      statusEvents: [],
    })),
    ...over,
  };
}

afterEach(cleanup);

const renderAction = (issue: AuditIssue, svc: IssueCompletionService, onVerified = vi.fn()) =>
  render(<StaleCompletionAction issue={issue} service={svc} onVerified={onVerified} now={() => NOW} />);

describe("StaleCompletionAction", () => {
  it("is hidden when the issue is not stale Review/Hold (no disabled placeholder)", async () => {
    const svc = service();
    renderAction(staleIssue("In Review", 12), svc);
    renderAction(staleIssue("In Progress", 60), svc);
    expect(screen.queryByTestId("task-mark-complete")).toBeNull();
    expect(svc.fetchOptions).not.toHaveBeenCalled();
  });

  it("is hidden when Jira offers no executable terminal-success transition", async () => {
    const svc = service({ fetchOptions: vi.fn(async () => []) });
    renderAction(staleIssue(), svc);
    await waitFor(() => expect(svc.fetchOptions).toHaveBeenCalled());
    expect(screen.queryByTestId("task-mark-complete")).toBeNull();
  });

  it("is hidden when fetching transitions fails", async () => {
    const svc = service({ fetchOptions: vi.fn(async () => Promise.reject(new Error("403"))) });
    renderAction(staleIssue(), svc);
    await waitFor(() => expect(svc.fetchOptions).toHaveBeenCalled());
    expect(screen.queryByTestId("task-mark-complete")).toBeNull();
  });

  it("renders a secondary outlined button with a real Plus icon on the right and no chevron", async () => {
    renderAction(staleIssue("On Hold", 45), service());
    const button = await screen.findByTestId("task-mark-complete");
    expect(button.className).toContain("btn--secondary");
    expect(button.className).not.toContain("btn--danger");
    expect(button.className).not.toContain("btn--primary");
    expect(button.textContent).toBe("Mark complete");
    const icon = button.querySelector("svg");
    expect(icon?.getAttribute("class")).toContain("lucide-plus");
    expect(button.lastElementChild).toBe(icon);
    expect(button.querySelector('[class*="chevron"]')).toBeNull();
  });

  it("opens an upward menu with one item per valid target", async () => {
    const user = userEvent.setup();
    const svc = service({
      fetchOptions: vi.fn(async () => [
        { transitionId: "31", targetStatus: "Done" },
        { transitionId: "32", targetStatus: "Approved" },
      ]),
    });
    renderAction(staleIssue(), svc);
    await user.click(await screen.findByTestId("task-mark-complete"));
    const menu = await screen.findByTestId("task-completion-menu");
    expect(menu.getAttribute("data-side")).toBe("top");
    expect(screen.getAllByTestId("task-completion-option").map((n) => n.textContent)).toEqual([
      "Complete as Done",
      "Complete as Approved",
    ]);
    expect(menu.textContent).not.toMatch(/\b3[12]\b/); // no raw transition ids
  });

  it("a single valid transition still opens the menu with one item", async () => {
    const user = userEvent.setup();
    renderAction(staleIssue(), service());
    await user.click(await screen.findByTestId("task-mark-complete"));
    expect(await screen.findAllByTestId("task-completion-option")).toHaveLength(1);
  });

  it("requires confirmation naming the key and chosen status, then sends the exact transition", async () => {
    const user = userEvent.setup();
    const svc = service();
    const onVerified = vi.fn();
    renderAction(staleIssue(), svc, onVerified);
    await user.click(await screen.findByTestId("task-mark-complete"));
    await user.click(await screen.findByTestId("task-completion-option"));
    expect(svc.complete).not.toHaveBeenCalled();
    const dialog = await screen.findByTestId("task-completion-confirm");
    expect(dialog.textContent).toContain("UX-123 will be moved to Closed in Jira.");
    expect(screen.getByRole("dialog").textContent).toContain("Mark task complete?");
    await user.click(screen.getByTestId("task-completion-confirm-button"));
    await waitFor(() => expect(onVerified).toHaveBeenCalledTimes(1));
    expect(svc.complete).toHaveBeenCalledTimes(1);
    expect((svc.complete as ReturnType<typeof vi.fn>).mock.calls[0]![1]).toEqual({
      transitionId: "31",
      targetStatus: "Closed",
    });
    expect(onVerified.mock.calls[0]![0].currentStatus).toBe("Closed");
  });

  it("Cancel makes no Jira call", async () => {
    const user = userEvent.setup();
    const svc = service();
    renderAction(staleIssue(), svc);
    await user.click(await screen.findByTestId("task-mark-complete"));
    await user.click(await screen.findByTestId("task-completion-option"));
    await user.click(await screen.findByRole("button", { name: "Cancel" }));
    expect(svc.complete).not.toHaveBeenCalled();
  });

  it("prevents duplicate submissions while the transition is in flight", async () => {
    const user = userEvent.setup();
    let resolve!: (v: { issueKey: string; currentStatus: string; statusEvents: [] }) => void;
    const svc = service({
      complete: vi.fn(
        () =>
          new Promise((r) => {
            resolve = r;
          }),
      ),
    });
    renderAction(staleIssue(), svc);
    await user.click(await screen.findByTestId("task-mark-complete"));
    await user.click(await screen.findByTestId("task-completion-option"));
    const confirm = await screen.findByTestId("task-completion-confirm-button");
    await user.click(confirm);
    expect((confirm as HTMLButtonElement).disabled).toBe(true);
    await user.click(confirm);
    expect(svc.complete).toHaveBeenCalledTimes(1);
    resolve({ issueKey: "UX-123", currentStatus: "Closed", statusEvents: [] });
  });

  it("on Jira failure: nothing is applied, calm error shown, dialog stays for retry", async () => {
    const user = userEvent.setup();
    const onVerified = vi.fn();
    const svc = service({
      complete: vi.fn(async () => {
        throw new IssueCompletionError("rejected", "403");
      }),
    });
    renderAction(staleIssue(), svc, onVerified);
    await user.click(await screen.findByTestId("task-mark-complete"));
    await user.click(await screen.findByTestId("task-completion-option"));
    await user.click(await screen.findByTestId("task-completion-confirm-button"));
    const err = await screen.findByTestId("task-completion-error");
    expect(err.textContent).toContain("Couldn’t update Jira status. Try again or open the task in Jira.");
    expect(onVerified).not.toHaveBeenCalled();
  });

  it("if Jira succeeded but the re-read failed: nothing is applied locally", async () => {
    const user = userEvent.setup();
    const onVerified = vi.fn();
    const svc = service({
      complete: vi.fn(async () => {
        throw new IssueCompletionError("stale_refresh", "read failed");
      }),
    });
    renderAction(staleIssue(), svc, onVerified);
    await user.click(await screen.findByTestId("task-mark-complete"));
    await user.click(await screen.findByTestId("task-completion-option"));
    await user.click(await screen.findByTestId("task-completion-confirm-button"));
    await waitFor(() => expect(screen.queryByTestId("task-completion-confirm")).toBeNull());
    expect(onVerified).not.toHaveBeenCalled();
  });
});
