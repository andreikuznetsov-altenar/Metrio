// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { NotificationCenter } from "../shell/NotificationCenter";
import {
  clearNotificationEventsForTests,
  seedNotificationEventsForTests,
} from "../platform/notificationEvents";
import { buildTaskAttentionEvent } from "./notificationEventFactory";

vi.mock("../platform/preferences", () => ({
  loadPreferences: async () => ({
    sync: { jiraStale: false, bambooStale: false },
  }),
}));

afterEach(() => {
  cleanup();
  clearNotificationEventsForTests();
});

describe("Notification drawer scroll geometry", () => {
  it("CSS contract (PASS36): the drawer body is the ONLY scroll owner; Notifications adds none", () => {
    const css = readFileSync(resolve(process.cwd(), "src/shell/notification-center.css"), "utf8");
    // no Notification-specific scroller / body override: nothing may declare overflow
    expect(css).not.toMatch(/overflow(-y|-x)?\s*:\s*(auto|scroll)/);
    expect(css).not.toMatch(/\.drawer--notifications\s+\.drawer__body/);
    expect(css).toMatch(/\.notification-center__filters\s*\{[^}]*position:\s*sticky/);
    expect(css).not.toMatch(/\.notification-center__card:last-child[\s\S]*margin-bottom/);
  });

  it("scroll viewport uses the visible-thumb class and remains the scroll container", () => {
    seedNotificationEventsForTests([
      buildTaskAttentionEvent({ id: "t1" }),
      buildTaskAttentionEvent({ id: "t2" }),
      buildTaskAttentionEvent({ id: "t3" }),
    ]);
    render(
      <NotificationCenter
        open
        onClose={vi.fn()}
        onOpenPerson={vi.fn()}
        onOpenSettings={vi.fn()}
      />,
    );
    const viewport = screen.getByTestId("notification-scroll-viewport");
    // PASS36: a plain content wrapper — the surrounding .drawer__body is the scroll owner.
    expect(viewport.className).toContain("notification-center__main");
    expect(viewport.className).not.toContain("metrio-scroll");
    expect(viewport.closest(".drawer__body")?.className).toContain("metrio-scroll--visible-thumb");

    const drawerBody = document.querySelector(
      ".drawer--notifications .drawer__body, .drawer--notification .drawer__body",
    ) as HTMLElement | null;
    expect(drawerBody).toBeTruthy();

    // Geometry contract: viewport bottom aligns with drawer body content bottom (no spacer).
    Object.defineProperty(drawerBody!, "clientHeight", { value: 600, configurable: true });
    Object.defineProperty(drawerBody!, "getBoundingClientRect", {
      value: () =>
        ({
          top: 100,
          bottom: 700,
          height: 600,
          left: 0,
          right: 400,
          width: 400,
          x: 0,
          y: 100,
          toJSON: () => ({}),
        }) as DOMRect,
      configurable: true,
    });
    Object.defineProperty(viewport, "getBoundingClientRect", {
      value: () =>
        ({
          top: 160,
          bottom: 700,
          height: 540,
          left: 0,
          right: 400,
          width: 400,
          x: 0,
          y: 160,
          toJSON: () => ({}),
        }) as DOMRect,
      configurable: true,
    });
    const bodyRect = drawerBody!.getBoundingClientRect();
    const viewRect = viewport.getBoundingClientRect();
    expect(Math.abs(viewRect.bottom - bodyRect.bottom)).toBeLessThanOrEqual(1);

    expect(screen.getAllByTestId("notification-card").length).toBeGreaterThan(0);
    expect(document.querySelector(".notification-center__filters")).toBeTruthy();
  });
});
