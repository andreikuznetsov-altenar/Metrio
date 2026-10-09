// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { ActionItem } from "../../domain/actions/actionTypes";
import type { DashboardQueueRow } from "../../domain/actions/buildDashboardQueueRows";
import { DashboardActionQueueTable } from "./DashboardActionQueueTable";
import "../../pages/performance/performance-dashboard.css";
import "../../styles/tokens.css";
import "../../styles/ui-interaction-system.css";

afterEach(() => cleanup());

const item: ActionItem = {
  id: "a1",
  severity: "warning",
  title: "UX-100",
  kind: "task_attention",
  target: { kind: "jira", issueKey: "UX-100" },
  source: "jira",
  issueKeys: ["UX-100"],
};

const rows: DashboardQueueRow[] = [
  {
    id: "r1",
    subject: "UX-100",
    reasonTags: ["Blocked"],
    contextLines: ["1 task"],
    item,
  },
];

function renderQueue(sortable: boolean, sortColumnId: string | null = null) {
  return render(
    <DashboardActionQueueTable
      workColumnLabel="Work"
      rows={rows}
      onOpen={() => undefined}
      openLabel={() => "Open"}
      sortColumnId={sortColumnId}
      sortDirection={sortColumnId ? "asc" : null}
      onToggleSort={() => undefined}
      sortable={sortable}
    />,
  );
}

function headerMetrics(table: HTMLElement) {
  return within(table)
    .getAllByRole("columnheader")
    .slice(0, 3)
    .map((th) => {
      const style = getComputedStyle(th);
      const inner = th.querySelector(".performance-table__header-inner");
      const innerStyle = inner ? getComputedStyle(inner) : null;
      return {
        padding: style.padding,
        background: style.backgroundColor,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        color: style.color,
        innerDisplay: innerStyle?.display,
        innerGap: innerStyle?.gap,
        innerFontWeight: innerStyle?.fontWeight,
      };
    });
}

describe("TableHeaderCell canonical header contract", () => {
  it("both tables use the shared header-inner primitive", () => {
    const { unmount } = renderQueue(true);
    const focus = screen.getByTestId("dashboard-action-queue");
    expect(focus.querySelectorAll("[data-table-header-cell]")).toHaveLength(4);
    expect(focus.querySelectorAll(".performance-table__header-inner")).toHaveLength(4);
    unmount();

    renderQueue(false);
    const team = screen.getByTestId("dashboard-action-queue");
    expect(team.querySelectorAll("[data-table-header-cell]")).toHaveLength(4);
    expect(team.querySelectorAll(".performance-table__header-inner")).toHaveLength(4);
  });

  it("Team Actions has no sortable controls", () => {
    renderQueue(false);
    const table = screen.getByTestId("dashboard-action-queue");
    expect(table.querySelector(".performance-table__sort-btn")).toBeNull();
    expect(table.querySelector(".performance-table__sort-icon")).toBeNull();
    expect(table.querySelector("[aria-sort]")).toBeNull();
    expect(
      [...table.querySelectorAll("[data-sortable]")].map((el) =>
        el.getAttribute("data-sortable"),
      ),
    ).toEqual(["false", "false", "false", "false"]);
    for (const th of within(table).getAllByRole("columnheader").slice(0, 3)) {
      const inner = th.querySelector(".performance-table__header-inner");
      expect(inner?.tagName).toBe("SPAN");
      expect(getComputedStyle(inner!).cursor).not.toBe("pointer");
    }
  });

  it("My Focus remains sortable with active sort state", () => {
    renderQueue(true, "work");
    const table = screen.getByTestId("dashboard-action-queue");
    expect(table.querySelectorAll(".performance-table__sort-btn")).toHaveLength(3);
    expect(table.querySelectorAll(".performance-table__sort-icon")).toHaveLength(3);
    const work = within(table).getByRole("columnheader", { name: /work/i });
    expect(work).toHaveAttribute("aria-sort", "ascending");
    expect(work.querySelector(".performance-table__sort-btn")).toHaveClass("is-active");
    expect(work.querySelector(".performance-table__sort-icon")).toHaveClass("is-active");
    expect(work.querySelector(".performance-table__sort-icon")?.textContent).toBe("↑");
  });

  it("header row geometry matches between sortable and static modes", () => {
    const { unmount } = renderQueue(true);
    const focusMetrics = headerMetrics(screen.getByTestId("dashboard-action-queue"));
    unmount();

    renderQueue(false);
    const teamMetrics = headerMetrics(screen.getByTestId("dashboard-action-queue"));

    expect(teamMetrics).toEqual(focusMetrics);
    for (const metric of focusMetrics) {
      expect(metric.innerDisplay).toBe("inline-flex");
      expect(["8px", "var(--space-2)"].includes(metric.innerGap ?? "")).toBe(true);
    }
  });

  it("Work/Reason/Context typography matches in My Focus (sortable, including active Work)", () => {
    renderQueue(true, "work");
    const table = screen.getByTestId("dashboard-action-queue");
    const [work, reason, context] = within(table).getAllByRole("columnheader").slice(0, 3);
    const workLabel = work.querySelector(".performance-table__work-lead-label")!;
    // Header Work must match columnheader tertiary chrome, not body primary lead.
    expect(getComputedStyle(workLabel).color).toBe(getComputedStyle(work).color);
    expect(getComputedStyle(workLabel).color).toBe(getComputedStyle(reason).color);
    expect(getComputedStyle(workLabel).color).toBe(getComputedStyle(context).color);
    expect(getComputedStyle(workLabel).fontWeight).toBe("600");
    expect(getComputedStyle(work).fontWeight).toBe("600");
    expect(work.querySelector(".performance-table__sort-btn")).toHaveClass("is-active");
    expect(work.querySelector(".performance-table__sort-icon")).toHaveClass("is-active");
  });

  it("Work/Reason/Context typography matches in Team Actions (static)", () => {
    renderQueue(false);
    const table = screen.getByTestId("dashboard-action-queue");
    const [work, reason, context] = within(table).getAllByRole("columnheader").slice(0, 3);
    const workLabel = work.querySelector(".performance-table__work-lead-label")!;
    expect(getComputedStyle(workLabel).fontWeight).toBe("600");
    expect(getComputedStyle(workLabel).color).toBe(getComputedStyle(reason).color);
    expect(getComputedStyle(workLabel).color).toBe(getComputedStyle(context).color);
    expect(table.querySelector(".performance-table__sort-btn")).toBeNull();
  });

  it.each([1280, 1440, 1728] as const)(
    "Work header stays tertiary (not body primary) at width %s",
    (width) => {
      Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
      renderQueue(true, "work");
      const table = screen.getByTestId("dashboard-action-queue");
      const work = within(table).getAllByRole("columnheader")[0]!;
      const workLabel = work.querySelector(".performance-table__work-lead-label")!;
      const color = getComputedStyle(workLabel).color;
      // Must resolve tertiary token, not body primary lead color.
      expect(color).toBe(getComputedStyle(work).color);
      expect(getComputedStyle(workLabel).fontWeight).toBe("600");
    },
  );
});
