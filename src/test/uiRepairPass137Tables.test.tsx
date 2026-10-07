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

  it("dashboard action queue uses canonical performance table", () => {
    const source = read("src/components/Table/DashboardActionQueueTable.tsx");
    expect(source).toContain("performance-table--action-queue");
    expect(source).toContain("TableWorkLead");
    expect(source).toContain("PerformanceTableColgroup");
    const panel = read("src/pages/home/dashboard/DashboardQueuePanel.tsx");
    expect(panel).toContain("stabilizeDashboardQueueRowOrder");
    expect(panel).toContain("DashboardActionQueueTable");
  });

  it("delivery risk table relies on colgroup not nth-child width hacks", () => {
    const source = read("src/pages/performance/TeamDeliveryRiskView.tsx");
    expect(source).toContain('className="col-action"');
    const css = read("src/pages/performance/performance-dashboard.css");
    expect(css).not.toMatch(
      /\.performance-table--delivery-risk th:nth-child\(7\)/,
    );
  });
});
