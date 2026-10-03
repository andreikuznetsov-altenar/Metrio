// @vitest-environment jsdom
import { act } from "react";
import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CommandPalette } from "../shell/CommandPalette";
import { NotificationCenter } from "../shell/NotificationCenter";
import {
  clearNotificationEventsForTests,
  seedNotificationEventsForTests,
} from "../platform/notificationEvents";

const handlers = {
  refresh: vi.fn(),
  openNotifications: vi.fn(),
  openSettings: vi.fn(),
  openPerson: vi.fn(),
  openProjectCockpit: vi.fn(),
  switchTheme: vi.fn(),
  navigate: vi.fn(),
};

vi.mock("../hooks/useCommandPaletteSearch", () => ({
  useCommandPaletteSearch: () => ({ results: [], remoteHint: null }),
}));

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

describe("UI pass 4D — search", () => {
  let root: Root;
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("renders top sheet without dimmed backdrop", () => {
    act(() => {
      root.render(
        createElement(CommandPalette, {
          open: true,
          onClose: vi.fn(),
          handlers,
          searchInput: {
            people: [],
            feedbackEnabled: true,
            jiraBaseUrl: "",
            performanceControlsDisabled: false,
          },
        }),
      );
    });

    const backdrop = document.querySelector(
      '[data-testid="command-palette-backdrop"]',
    ) as HTMLElement;
    expect(backdrop).toBeTruthy();
    expect(backdrop.className).toContain("command-palette-shell");
    const styles = getComputedStyle(backdrop);
    expect(styles.backgroundColor).toBe("rgba(0, 0, 0, 0)");

    const input = document.querySelector(".command-palette__input") as HTMLInputElement;
    expect(input).toBeTruthy();
    const icon = document.querySelector(".command-palette__search-icon");
    expect(icon?.nextElementSibling).toBeFalsy();
    expect(input.nextElementSibling?.className).toContain("command-palette__search-icon");
  });

  it("uses slide-in surface animation class when open", () => {
    act(() => {
      root.render(
        createElement(CommandPalette, {
          open: true,
          onClose: vi.fn(),
          handlers,
          searchInput: {
            people: [],
            feedbackEnabled: true,
            jiraBaseUrl: "",
            performanceControlsDisabled: false,
          },
        }),
      );
    });

    const shell = document.querySelector(".command-palette-shell.is-open");
    expect(shell).toBeTruthy();
    const palette = document.querySelector(".command-palette") as HTMLElement;
    expect(getComputedStyle(palette).transform).not.toBe("none");
  });
});

describe("UI pass 4D — notifications", () => {
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

  function renderCenter() {
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
    return container;
  }

  it("has overflow menu without primary All/Unread/Actions tabs", () => {
    seedNotificationEventsForTests([
      {
        id: "n1",
        type: "task_attention",
        createdAt: new Date().toISOString(),
        title: "Task",
        message: "UX-1",
        target: { kind: "jira", issueKey: "UX-1" },
      },
    ]);
    const panel = renderCenter();

    expect(panel.querySelector('button[aria-pressed]')).toBeTruthy();
    expect(container.textContent).not.toMatch(/\bUnread\b.*filter/i);
    expect(document.querySelector('[data-testid="notification-overflow"]')).toBeTruthy();
    expect(panel.textContent).toContain("Metrio");
    expect(panel.textContent).not.toMatch(/^Actions$/m);
  });

  it("renders unread cards with accent border and secondary CTA", () => {
    seedNotificationEventsForTests([
      {
        id: "n-unread",
        type: "task_attention",
        createdAt: new Date().toISOString(),
        title: "Task needs attention",
        message: "UX-5446",
        target: { kind: "jira", issueKey: "UX-5446" },
      },
    ]);
    const panel = renderCenter();

    const card = panel.querySelector(".notification-center__card.is-unread");
    expect(card).toBeTruthy();
    const cta = panel.querySelector(
      ".notification-center__cta",
    ) as HTMLButtonElement | null;
    expect(cta?.textContent).toContain("Open Jira");
    expect(cta?.className).toContain("btn--secondary");
  });
});
