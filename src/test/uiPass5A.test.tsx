// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { act } from "react";
import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationCenter } from "../shell/NotificationCenter";
import { notificationActionLabel } from "../platform/notificationActionLabel";
import {
  clearNotificationEventsForTests,
  seedNotificationEventsForTests,
} from "../platform/notificationEvents";

vi.mock("../platform/notificationNavigation", () => ({
  openNotificationTarget: vi.fn(async () => undefined),
}));

vi.mock("../platform/inboxReadSync", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../platform/inboxReadSync")>();
  return {
    ...actual,
    markActionInboxItemRead: vi.fn(async () => undefined),
    markAllActionInboxItemsRead: vi.fn(async () => undefined),
    clearActionInboxHistory: vi.fn(async () => undefined),
  };
});

describe("UI pass 5A — dashboard actions layout", () => {
  it("uses four-zone dashboard grid without legacy five-column template", () => {
    const css = readFileSync(
      resolve(import.meta.dirname, "../pages/performance/action-queue.css"),
      "utf8",
    );
    expect(css).toContain("minmax(0, 1.15fr)");
    expect(css).toContain("minmax(7rem, max-content)");
    expect(css).toContain(".action-queue__dashboard-cell--action");
    expect(css).not.toContain("minmax(88px, 120px)");
    expect(css).toContain(".action-queue__dashboard-cta");
    expect(css).toMatch(/\.action-queue__dashboard-cta[\s\S]*width:\s*auto/);
  });
});

describe("UI pass 5A — notification semantics", () => {
  it("prefers Open Jira for task events even when person target is present", () => {
    expect(
      notificationActionLabel(
        {
          id: "1",
          type: "task_attention",
          title: "Task needs attention",
          message: "AGTC-105",
          createdAt: new Date().toISOString(),
          issueKey: "AGTC-105",
          target: { kind: "person", personId: "p1" },
        },
        { kind: "person", personId: "p1" },
      ),
    ).toBe("Open Jira");
  });

  it("uses View person for aggregate workload events", () => {
    expect(
      notificationActionLabel({
        id: "2",
        type: "workload_change",
        title: "Problematic task",
        message: "3 problematic tasks",
        createdAt: new Date().toISOString(),
        target: { kind: "person", personId: "p2" },
      }),
    ).toBe("View person");
  });
});

describe("UI pass 5A — notification header", () => {
  let root: Root;
  let container: HTMLDivElement;

  beforeEach(() => {
    clearNotificationEventsForTests();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    clearNotificationEventsForTests();
  });

  it("keeps overflow and close on the same header row", () => {
    seedNotificationEventsForTests([
      {
        id: "n1",
        type: "task_attention",
        createdAt: new Date().toISOString(),
        title: "Task",
        message: "UX-1",
        issueKey: "UX-1",
        target: { kind: "jira", issueKey: "UX-1" },
      },
    ]);
    act(() => {
      root.render(
        createElement(NotificationCenter, {
          open: true,
          onClose: vi.fn(),
          onOpenPerson: vi.fn(),
          onOpenSettings: vi.fn(),
        }),
      );
    });

    const toolbar = document.querySelector(".drawer__header-toolbar");
    expect(toolbar).toBeTruthy();
    expect(toolbar?.querySelector('[data-testid="notification-overflow"]')).toBeTruthy();
    expect(toolbar?.querySelector('button[aria-label="Close drawer"]')).toBeTruthy();
    expect(document.querySelector(".notification-center__header-actions")).toBeTruthy();
  });

  it("keeps source filter labels on one line", () => {
    seedNotificationEventsForTests([
      {
        id: "n1",
        type: "daily_brief_ready",
        createdAt: new Date().toISOString(),
        title: "Brief",
        message: "Ready",
        target: { kind: "digest", digestKind: "daily" },
      },
    ]);
    act(() => {
      root.render(
        createElement(NotificationCenter, {
          open: true,
          onClose: vi.fn(),
          onOpenPerson: vi.fn(),
          onOpenSettings: vi.fn(),
        }),
      );
    });

    const css = readFileSync(
      resolve(import.meta.dirname, "../shell/notification-center.css"),
      "utf8",
    );
    expect(css).toMatch(/white-space:\s*nowrap/);
    expect(document.body.textContent).toContain("All sources");
    expect(document.body.textContent).toContain("BambooHR");
  });
});
