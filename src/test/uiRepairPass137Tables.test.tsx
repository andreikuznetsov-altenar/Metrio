import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (rel: string) =>
  fs.readFileSync(path.resolve(process.cwd(), rel), "utf8");

describe("UI Repair Pass 13.7A table and tabular modal geometry", () => {
  it("task list modal uses shared TabularModal shell", () => {
    const source = read("src/components/TaskListModal/TaskListModal.tsx");
    expect(source).toContain("TabularModal");
    expect(source).not.toMatch(/from "\.\.\/Modal\/Modal"/);
  });

  it("tabular modal defines centered desktop size and table edge insets", () => {
    const css = read("src/components/Modal/tabular-modal.css");
    expect(css).toContain(".metrio-modal--tabular");
    expect(css).toContain("--performance-table-edge-inset");
    expect(css).toContain("metrio-tabular-modal");
  });

  it("action columns share end inset token", () => {
    const css = read("src/styles/ui-interaction-system.css");
    expect(css).toContain("--performance-table-action-inset-end");
    expect(css).toMatch(/\.performance-table__action[\s\S]*padding-right/);
  });

  it("dashboard action queue header and rows share column grid", () => {
    const css = read("src/pages/performance/action-queue.css");
    const headerMatch = css.match(
      /\.action-queue__dashboard-header\s*\{[\s\S]*?grid-template-columns:\s*([\s\S]*?);/,
    );
    const rowMatch = css.match(
      /\.action-queue__dashboard-row\s*\{[\s\S]*?grid-template-columns:\s*([\s\S]*?);/,
    );
    expect(headerMatch?.[1]?.replace(/\s+/g, " ").trim()).toBe(
      rowMatch?.[1]?.replace(/\s+/g, " ").trim(),
    );
  });

  it("rows without a person keep avatar column structure", () => {
    const source = read("src/pages/performance/DashboardActionQueueRows.tsx");
    expect(source).toContain("action-queue__dashboard-person-slot");
  });

  it("delivery risk table relies on colgroup not nth-child width hacks", () => {
    const css = read("src/pages/performance/performance-dashboard.css");
    expect(css).toContain(".performance-table--delivery-risk col.col-action");
    expect(css).not.toMatch(
      /\.performance-table--delivery-risk th:nth-child\(7\)/,
    );
  });
});
