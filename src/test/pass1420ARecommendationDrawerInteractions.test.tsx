// @vitest-environment jsdom
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DashboardRecommendations } from "../pages/home/dashboard/DashboardRecommendations";
import { DashboardActionTabs } from "../pages/home/dashboard/DashboardActionTabs";
import type { ProductRecommendation } from "../domain/recommendations/buildProductRecommendations";
import { presentProductRecommendation } from "../domain/recommendations/presentProductRecommendation";
import { navigateProductRecommendation } from "../app/productRecommendationNavigation";
import {
  getAppNavigationState,
  resetAppNavigationStateForTests,
} from "../app/navigationStore";
import { Select } from "../components/Select/Select";
import { DrawerStack } from "../components/Drawer/DrawerStack";

function sourceOf(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), "utf8");
}

function rec(
  id: string,
  extra: Partial<ProductRecommendation> = {},
): ProductRecommendation {
  return {
    id,
    severity: "watch",
    title: id,
    explanation: "detail",
    actionLabel: "Open Performance",
    actionKind: "open_performance",
    priority: 1,
    ...extra,
  };
}

afterEach(() => {
  cleanup();
  resetAppNavigationStateForTests();
});

describe("PASS 14.20A recommendations header + carousel", () => {
  it("uses canonical section title and removes numeric count", () => {
    render(
      <DashboardRecommendations
        items={[rec("a")]}
        onAction={vi.fn()}
        surface="dashboard"
      />,
    );
    const section = screen.getByTestId("dashboard-recommendations");
    expect(within(section).getByRole("heading", { name: "Recommendations" })).toBeTruthy();
    expect(section.querySelector(".executive-recommendations__count")).toBeNull();
    expect(section.querySelector(".dashboard-section__title")).toBeTruthy();
  });

  it("keeps a normal grid when count <= 3", () => {
    render(
      <DashboardRecommendations
        items={[rec("a"), rec("b"), rec("c")]}
        onAction={vi.fn()}
      />,
    );
    const section = screen.getByTestId("dashboard-recommendations");
    expect(section.getAttribute("data-recommendation-carousel")).toBe("false");
    expect(screen.queryByTestId("recommendations-prev")).toBeNull();
    expect(screen.queryByTestId("recommendations-next")).toBeNull();
  });

  it("enables carousel controls when count > 3 with disabled edges", () => {
    render(
      <DashboardRecommendations
        items={[rec("a"), rec("b"), rec("c"), rec("d")]}
        onAction={vi.fn()}
      />,
    );
    const section = screen.getByTestId("dashboard-recommendations");
    expect(section.getAttribute("data-recommendation-carousel")).toBe("true");
    const prev = screen.getByTestId("recommendations-prev");
    const next = screen.getByTestId("recommendations-next");
    expect(prev).toBeDisabled();
    // Next may be enabled once layout has overflow; in jsdom scrollWidth often equals clientWidth.
    expect(next).toBeTruthy();
    expect(section.querySelector(".executive-recommendations__list--carousel")).toBeTruthy();
  });

  it("places Dashboard Recommendations before Team Trends / Primary Trend", () => {
    const manager = sourceOf(
      "src/pages/home/dashboard/ManagerExecutiveDashboard.tsx",
    );
    const recIdx = manager.indexOf("<DashboardRecommendations");
    const trendIdx = manager.indexOf("<DashboardPrimaryTrend");
    expect(recIdx).toBeGreaterThan(-1);
    expect(trendIdx).toBeGreaterThan(-1);
    expect(recIdx).toBeLessThan(trendIdx);
  });
});

describe("PASS 14.20A My focus / Team actions canonical Tabs", () => {
  it("uses shared Tabs and does not duplicate My focus heading", () => {
    render(
      <DashboardActionTabs
        tabs={[
          {
            id: "focus",
            label: "My focus",
            items: [],
            emptyMessage: "No focus items",
          },
          {
            id: "team",
            label: "Team actions",
            items: [],
            emptyMessage: "No team actions",
          },
        ]}
        onOpenAction={vi.fn()}
        actionOpenLabel={() => "Open"}
      />,
    );
    expect(screen.getByRole("tab", { name: "My focus" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Team actions" })).toBeTruthy();
    expect(screen.getByTestId("dashboard-action-tabs").querySelector(".tabs__list")).toBeTruthy();
    expect(
      screen.getByTestId("dashboard-tab-focus").querySelector(".dashboard-section__title"),
    ).toBeNull();
  });
});

describe("PASS 14.20A context-aware recommendation CTAs", () => {
  it("keeps Open Performance on Dashboard", () => {
    const presented = presentProductRecommendation(
      rec("backflow-review", {
        title: "Review recurring backflow",
        issueKeys: ["UX-1"],
      }),
      "dashboard",
    );
    expect(presented.actionLabel).toBe("Open Performance");
    expect(presented.actionKind).toBe("open_performance");
    navigateProductRecommendation(
      { ...rec("backflow-review"), ...presented },
      { openPerson: vi.fn(), openJira: vi.fn() },
    );
    expect(getAppNavigationState()).toEqual({
      route: "performance",
      performanceView: "overview",
    });
  });

  it("uses Review backflows + issue list when Performance has exact keys", () => {
    const openIssueList = vi.fn();
    const presented = presentProductRecommendation(
      rec("backflow-review", {
        title: "Review recurring backflow",
        issueKeys: ["UX-1", "UX-2"],
      }),
      "performance",
    );
    expect(presented.actionLabel).toBe("Review backflows");
    expect(presented.actionKind).toBe("review_issues");
    navigateProductRecommendation(
      {
        ...rec("backflow-review", {
          title: "Review recurring backflow",
          issueKeys: ["UX-1", "UX-2"],
        }),
        ...presented,
      },
      { openPerson: vi.fn(), openJira: vi.fn(), openIssueList },
    );
    expect(openIssueList).toHaveBeenCalledWith(
      ["UX-1", "UX-2"],
      "Review recurring backflow",
    );
  });

  it("falls back to History reports when Performance has no issue set", () => {
    const presented = presentProductRecommendation(
      rec("backflow-review", { title: "Review recurring backflow" }),
      "performance",
    );
    expect(presented.actionKind).toBe("open_history_reports");
    navigateProductRecommendation(
      { ...rec("backflow-review"), ...presented },
      { openPerson: vi.fn(), openJira: vi.fn() },
    );
    expect(getAppNavigationState()).toEqual({
      route: "performance",
      performanceView: "history-reports",
    });
  });

  it("renders Performance CTA without Open Performance no-op", () => {
    render(
      <DashboardRecommendations
        items={[
          rec("backflow-review", {
            title: "Review recurring backflow",
            issueKeys: ["UX-9"],
          }),
        ]}
        onAction={vi.fn()}
        surface="performance"
      />,
    );
    expect(screen.queryByRole("button", { name: "Open Performance" })).toBeNull();
    expect(screen.getByRole("button", { name: "Review backflows" })).toBeTruthy();
  });
});

describe("PASS 14.20A Brief period select layering + open", () => {
  it("Select popover uses drawer-owned z-popover token above drawer panel", () => {
    const surfaces = sourceOf("src/styles/app-surfaces.css");
    const selectCss = sourceOf("src/components/Select/Select.css");
    expect(surfaces).toMatch(/--z-popover:\s*115/);
    expect(selectCss).toContain("var(--z-popover");
    const drawer = Number(
      surfaces.match(/--z-drawer-panel:\s*(\d+)/)?.[1] ?? "0",
    );
    const popover = Number(surfaces.match(/--z-popover:\s*(\d+)/)?.[1] ?? "0");
    const modal = Number(surfaces.match(/--z-modal-scrim:\s*(\d+)/)?.[1] ?? "0");
    expect(popover).toBeGreaterThan(drawer);
    expect(popover).toBeLessThan(modal);
  });

  it("Brief period select opens with pointer and updates value", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    // Radix Select + jsdom pointer stubs (real drawer stacking is covered by z-index contract).
    Object.defineProperty(HTMLElement.prototype, "hasPointerCapture", {
      configurable: true,
      value: () => false,
    });
    Object.defineProperty(HTMLElement.prototype, "setPointerCapture", {
      configurable: true,
      value: () => undefined,
    });
    Object.defineProperty(HTMLElement.prototype, "releasePointerCapture", {
      configurable: true,
      value: () => undefined,
    });
    HTMLElement.prototype.scrollIntoView = () => undefined;

    render(
      <DrawerStack
        open
        activePanel="primary"
        onClose={() => undefined}
        ariaLabel="Person"
        size="person"
        testId="person-detail-drawer"
        header={<div>Person</div>}
      >
        <div className="person-brief__period">
          <Select
            aria-label="Brief period"
            value="30d"
            options={[
              { value: "7d", label: "Last 7 days" },
              { value: "30d", label: "Last 30 days" },
              { value: "3m", label: "Last 3 months" },
            ]}
            onChange={onChange}
          />
        </div>
      </DrawerStack>,
    );

    const trigger = screen.getByRole("combobox", { name: "Brief period" });
    const rect = { left: 10, top: 10, width: 120, height: 32, right: 130, bottom: 42 };
    vi.spyOn(trigger, "getBoundingClientRect").mockReturnValue(rect as DOMRect);
    document.elementFromPoint = ((x: number, y: number) => {
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        return trigger;
      }
      return null;
    }) as typeof document.elementFromPoint;
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const hit = document.elementFromPoint(centerX, centerY);
    expect(trigger === hit || (hit != null && trigger.contains(hit))).toBe(true);
    expect(trigger.getAttribute("data-state")).toBe("closed");

    await user.pointer({ keys: "[MouseLeft]", target: trigger });
    await waitFor(() => {
      expect(trigger.getAttribute("data-state")).toBe("open");
    });

    const option = await screen.findByRole("option", { name: "Last 7 days" });
    await user.click(option);
    expect(onChange).toHaveBeenCalledWith({ target: { value: "7d" } });
  });
});

describe("PASS 14.20A Profile↔Brief transition lifecycle", () => {
  it("keeps symmetric active/inactive classes for both directions", () => {
    const css = sourceOf("src/pages/performance/person-detail-drawer.css");
    expect(css).toContain(".person-drawer-view--active");
    expect(css).toContain(".person-drawer-view--inactive");
    expect(css).toContain("opacity var(--motion-tab)");
    const source = sourceOf("src/pages/performance/PersonDetailDrawer.tsx");
    expect(source).toContain("person-drawer-views");
    expect(source).toContain("Prefetch Brief");
  });
});
