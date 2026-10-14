// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NotificationCenter } from "../shell/NotificationCenter";
import { clearNotificationEventsForTests, seedNotificationEventsForTests } from "../platform/notificationEvents";
import { buildTaskAttentionEvent } from "./notificationEventFactory";

vi.mock("../platform/preferences", () => ({
  loadPreferences: async () => ({ sync: { jiraStale: false, bambooStale: false } }),
}));

const read = (rel: string) => readFileSync(resolve(process.cwd(), rel), "utf8");

afterEach(() => {
  cleanup();
  clearNotificationEventsForTests();
});

describe("PASS36 notification Delete", () => {
  it("uses the canonical danger Button variant (no legacy ghost text styling)", () => {
    seedNotificationEventsForTests([buildTaskAttentionEvent({ id: "t1" })]);
    render(<NotificationCenter open onClose={vi.fn()} onOpenPerson={vi.fn()} onOpenSettings={vi.fn()} />);
    const del = screen.getByTestId("notification-delete");
    expect(del.className).toContain("btn--danger");
    expect(del.className).not.toContain("btn--ghost");
    // the same shared variant as other confirmed destructive actions
    expect(read("src/pages/performance/BambooGoalDetailDrawer.tsx")).toContain('variant="danger"');
    // semantic token only — never a one-off red in the notification stylesheet
    expect(read("src/shell/notification-center.css")).not.toMatch(/notification-center__dismiss[^{]*\{[^}]*(#[0-9a-f]{3,8}|color:)/i);
  });

  it("danger styling resolves through the design token, with hover and focus handled by Button", () => {
    const css = read("src/components/Button/Button.css");
    expect(css).toMatch(/\.btn--danger\s*\{[^}]*var\(--color-danger/);
    expect(css).toMatch(/\.btn--danger:hover/);
  });
});

describe("PASS36 one shared drawer scroll owner", () => {
  it("Drawer body owns the scroll with a permanently reserved lane; padding stays on the owner", () => {
    const css = read("src/components/Drawer/Drawer.css");
    expect(css).toMatch(/\.drawer__body\s*\{[^}]*overflow-y:\s*scroll/);
    expect(css).toMatch(/\.drawer__body\s*\{[^}]*padding:\s*var\(--drawer-body-padding\)/);
    expect(css).not.toMatch(/scrollbar-gutter/);
  });

  it("no drawer-specific scroll wrappers remain (notifications, person)", () => {
    expect(read("src/shell/notification-center.css")).not.toMatch(/overflow(-y|-x)?\s*:\s*(auto|scroll)/);
    expect(read("src/shell/NotificationCenter.tsx")).not.toMatch(/metrio-scroll/);
    const person = read("src/pages/performance/person-detail-drawer.css");
    expect(person).not.toMatch(/overflow-y:\s*(auto|scroll)/);
  });

  it("no padding-right compensation or conditional width for the scrollbar", () => {
    for (const file of ["src/components/Drawer/Drawer.css", "src/shell/notification-center.css", "src/pages/performance/person-detail-drawer.css"]) {
      expect(read(file)).not.toMatch(/padding-right:\s*calc\([^)]*scrollbar/i);
    }
  });
});

describe("PASS36 availability module", () => {
  const drawer = read("src/pages/performance/PersonDetailDrawer.tsx");
  const css = read("src/pages/performance/person-detail-drawer.css");

  it("each leave period renders inside a canonical Card (date + type), not as loose text", () => {
    expect(drawer).toContain('data-testid="person-availability"');
    expect(drawer).toMatch(/<Card[\s\S]{0,120}person-detail-drawer__availability-card/);
    expect(drawer).toContain("person-detail-drawer__availability-date");
    expect(drawer).toContain("person-detail-drawer__availability-type");
    expect(drawer).not.toContain("person-detail-drawer__time-off");
  });

  it("multiple periods stack with an 8px gap", () => {
    expect(css).toMatch(/\.person-detail-drawer__availability-list\s*\{[^}]*flex-direction:\s*column[^}]*gap:\s*8px/);
  });

  it("section is omitted (no empty card) when there is no time off", () => {
    expect(drawer).toMatch(/workspace\.timeOff\s*\?\s*\(/);
  });
});
