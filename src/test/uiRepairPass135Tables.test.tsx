import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("UI Repair Pass 13.5 table geometry", () => {
  it("task list modal uses dedicated column contract", () => {
    const source = fs.readFileSync(
      path.resolve(process.cwd(), "src/components/TaskListModal/TaskListModal.tsx"),
      "utf8",
    );
    expect(source).toContain('columns={["issueKey", "title", "date", "date", "status"]}');
  });

  it("attention table does not force overflow min-width", () => {
    const css = fs.readFileSync(
      path.resolve(process.cwd(), "src/pages/performance/performance-dashboard.css"),
      "utf8",
    );
    expect(css).not.toMatch(/performance-table--attention[\s\S]*min-width:\s*960px/);
    const tableCss = fs.readFileSync(
      path.resolve(process.cwd(), "src/styles/ui-interaction-system.css"),
      "utf8",
    );
    expect(tableCss).toContain("col.col-title");
  });

  it("attention now caps visible rows without internal scroll viewport", () => {
    const source = fs.readFileSync(
      path.resolve(process.cwd(), "src/pages/home/dashboard/DashboardAttentionNow.tsx"),
      "utf8",
    );
    expect(source).toContain("ATTENTION_NOW_MAX_ROWS = 5");
    expect(source).toContain("items.slice(0, ATTENTION_NOW_MAX_ROWS)");

    const css = fs.readFileSync(
      path.resolve(process.cwd(), "src/pages/home/dashboard/executive-dashboard-pass10.css"),
      "utf8",
    );
    expect(css).not.toContain("max-height: 220px");
  });
});
