// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../styles/app-surfaces.css";
import "../components/AppShell/AppShell.css";
import { DashboardAttentionNow } from "../pages/home/dashboard/DashboardAttentionNow";
import type { ExecutiveAttentionItem } from "../domain/home/executiveDashboardModel";
import {
  ensureAppModalLayer,
  ensureAppShellWithOverlayLayers,
} from "../components/Drawer/drawerTestUtils";
import { GroupedIssuePreview } from "../components/GroupedIssuePreview/GroupedIssuePreview";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

const ATTENTION_ITEM: ExecutiveAttentionItem = {
  id: "attention-1",
  title: "Reviews stalling",
  detail: "Multiple Jira issues",
  severity: "critical",
  issueKeys: ["UX-100", "UX-101", "UX-102"],
};

function modalLayerPointerEvents(): string {
  const layer = document.getElementById("app-modal-layer");
  expect(layer).toBeTruthy();
  return getComputedStyle(layer!).pointerEvents;
}

async function openAttentionTaskList(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByTestId("grouped-issue-count-link"));
  await screen.findByTestId("task-list-modal");
  await waitFor(() => {
    expect(document.querySelector(".metrio-modal-root--open")).toBeTruthy();
  });
  expect(modalLayerPointerEvents()).toBe("auto");
}

describe("PASS 15.5G Attention Now task list lifecycle", () => {
  beforeEach(() => {
    ensureAppShellWithOverlayLayers();
    ensureAppModalLayer();
  });

  afterEach(() => {
    cleanup();
    document.querySelector(".app-shell")?.remove();
    document.querySelector("[data-testid='native-titlebar']")?.remove();
    document.getElementById("app-modal-layer")?.remove();
    document.querySelectorAll(".metrio-modal-root").forEach((node) => node.remove());
  });

  it("releases modal-layer hit testing immediately on close (invisible scrim regression)", async () => {
    const user = userEvent.setup();
    const onDashboardControl = vi.fn();

    render(
      <div>
        <button type="button" data-testid="dashboard-control" onClick={onDashboardControl}>
          Dashboard control
        </button>
        <DashboardAttentionNow
          items={[ATTENTION_ITEM]}
          jiraBaseUrl="https://jira.example.com"
          onView={vi.fn()}
        />
      </div>,
    );

    for (let cycle = 0; cycle < 3; cycle += 1) {
      await openAttentionTaskList(user);
      await user.click(screen.getByRole("button", { name: "Close" }));
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(modalLayerPointerEvents()).toBe("none");

      await user.click(screen.getByTestId("dashboard-control"));
      expect(onDashboardControl).toHaveBeenCalledTimes(cycle + 1);

      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });
    }
  });

  it("closes via Escape and backdrop without leaving scroll/pointer lock on modal layer", async () => {
    const user = userEvent.setup();

    render(
      <GroupedIssuePreview
        issueKeys={["UX-1", "UX-2"]}
        jiraBaseUrl="https://jira.example.com"
        modalTitle="Attention tasks"
      />,
    );

    await openAttentionTaskList(user);

    await user.keyboard("{Escape}");
    expect(modalLayerPointerEvents()).toBe("none");
    expect(document.documentElement.style.overflow).not.toBe("hidden");
    expect(document.body.style.overflow).not.toBe("hidden");

    await openAttentionTaskList(user);
    await user.click(screen.getByLabelText("Close dialog"));
    expect(modalLayerPointerEvents()).toBe("none");
  });
});
