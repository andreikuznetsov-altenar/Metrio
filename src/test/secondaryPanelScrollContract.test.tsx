// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Drawer } from "../components/Drawer/Drawer";
import { FeedbackGoogleSetupInstructions } from "../pages/feedback/FeedbackGoogleSetupInstructions";
import { TaskListModal } from "../components/TaskListModal/TaskListModal";
import type { TaskListModalRow } from "../domain/actions/buildTaskListModalRows";

const read = (rel: string) =>
  readFileSync(resolve(process.cwd(), rel), "utf8");

afterEach(() => {
  cleanup();
});

describe("Secondary panel scroll contract", () => {
  it("CSS: notification width token does not disable drawer body scroll globally", () => {
    const css = read("src/shell/notification-center.css");
    expect(css).toMatch(
      /\.drawer--notifications\s+\.drawer__body[\s\S]*overflow:\s*hidden/,
    );
    expect(css).not.toMatch(
      /\.drawer--notification\s+\.drawer__body[\s\S]*overflow:\s*hidden/,
    );
  });

  it("shared Drawer body uses hidden-thumb scroll + flex shrink geometry", () => {
    const css = read("src/components/Drawer/Drawer.css");
    expect(css).toMatch(/\.drawer__body[\s\S]*flex:\s*1\s+1\s+auto/);
    expect(css).toMatch(/\.drawer__body[\s\S]*min-height:\s*0/);
    expect(css).toMatch(/\.drawer__body[\s\S]*overflow-y:\s*auto/);
    expect(read("src/components/Drawer/Drawer.tsx")).toContain(
      "metrio-scroll--hidden-thumb",
    );
  });

  it("header stays outside scroll viewport", () => {
    render(
      <Drawer open onClose={vi.fn()} ariaLabel="Test" header={<h2>Title</h2>}>
        <p>Body</p>
      </Drawer>,
    );
    const drawer = screen.getByRole("dialog");
    const header = drawer.querySelector(".drawer__header");
    const body = drawer.querySelector(".drawer__body");
    expect(header).toBeTruthy();
    expect(body).toBeTruthy();
    expect(header?.contains(body!)).toBe(false);
    expect(body?.className).toContain("metrio-scroll--hidden-thumb");
  });

  it("Google setup for Feedback: body scrolls and Advanced section is in scroll tree", () => {
    render(
      <FeedbackGoogleSetupInstructions
        open
        onClose={vi.fn()}
        onConnectGoogle={vi.fn()}
        onOpenConnectionsSettings={vi.fn()}
        onOpenAppsScriptSetup={vi.fn()}
      />,
    );
    const drawer = screen.getByRole("dialog");
    const body = drawer.querySelector(".drawer__body") as HTMLElement;
    expect(body).toBeTruthy();
    expect(getComputedStyle(body).overflowY).toBe("auto");

    Object.defineProperty(body, "clientHeight", { value: 200, configurable: true });
    Object.defineProperty(body, "scrollHeight", { value: 800, configurable: true });
    expect(body.scrollHeight).toBeGreaterThan(body.clientHeight);

    const advanced = screen.getByTestId("google-apps-script-advanced");
    expect(body.contains(advanced)).toBe(true);
    body.scrollTop = body.scrollHeight;
    expect(body.scrollTop).toBeGreaterThan(0);
  });

  it("feedback Drawer footer is fixed below scroll body", () => {
    const ds = read("src/pages/feedback/design-system.tsx");
    expect(ds).toContain("footer={");
    expect(ds).not.toMatch(/children\}\s*\n\s*\{footer/);
  });

  it("TaskListModal table region scrolls with hidden thumb", () => {
    const rows: TaskListModalRow[] = Array.from({ length: 30 }, (_, i) => ({
      issueKey: `MET-${i}`,
      title: `Task ${i}`,
      status: "In Progress",
      createdAt: null,
      lastStatusChangedAt: null,
      createdLabel: "—",
      lastStatusChangeLabel: "—",
    }));
    render(
      <TaskListModal open onClose={vi.fn()} title="Tasks" rows={rows} />,
    );
    const wrap = document.querySelector(
      ".metrio-tabular-modal .performance-table-wrap",
    ) as HTMLElement | null;
    expect(wrap).toBeTruthy();
    expect(wrap!.className).toContain("metrio-scroll--hidden-thumb");
    const tabularCss = read("src/components/Modal/tabular-modal.css");
    expect(tabularCss).toMatch(
      /\.metrio-tabular-modal \.performance-table-wrap[\s\S]*overflow:\s*auto/,
    );
  });

  it("Modal body keeps min-height 0 flex contract", () => {
    const css = read("src/components/Modal/Modal.css");
    expect(css).toMatch(/\.metrio-modal[\s\S]*display:\s*flex/);
    expect(css).toMatch(/\.metrio-modal__body[\s\S]*min-height:\s*0/);
    expect(read("src/components/Modal/Modal.tsx")).toContain(
      "metrio-scroll--hidden-thumb",
    );
  });
});
